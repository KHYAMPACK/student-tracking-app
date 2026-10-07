import { buildOptikEntryChoices } from './examOptikTxtImport';

const FOLD_MAP = { Ç: 'C', Ğ: 'G', İ: 'I', I: 'I', Ö: 'O', Ş: 'S', Ü: 'U' };

/** Upper-case, Turkish letters folded to ASCII; "*" (unreadable letter) is kept. */
export function foldName(value) {
  return String(value ?? '')
    .toLocaleUpperCase('tr')
    .replace(/[ÇĞİIÖŞÜ]/g, (letter) => FOLD_MAP[letter])
    .replace(/[^A-Z*\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wildcardRegex(pattern, { anchorEnd }) {
  const source = pattern.replace(/\*/g, '.').replace(/[^A-Z.]/g, '');
  return new RegExp(`^${source}${anchorEnd ? '$' : ''}`);
}

function tokenMatches(ocrToken, studentToken, isLast) {
  if (ocrToken.includes('*')) {
    return wildcardRegex(ocrToken, { anchorEnd: !(isLast && ocrToken.length >= 3) }).test(studentToken);
  }
  if (ocrToken === studentToken) return true;
  // Names longer than the field are cut off, so the last token may be a prefix.
  return isLast && ocrToken.length >= 3 && studentToken.startsWith(ocrToken);
}

function tokensInOrder(ocrTokens, studentTokens) {
  let index = 0;
  for (const studentToken of studentTokens) {
    if (index < ocrTokens.length && tokenMatches(ocrTokens[index], studentToken, index === ocrTokens.length - 1)) {
      index += 1;
    }
  }
  return index === ocrTokens.length;
}

function findCandidates(entryFolded, pool, { exactOnly }) {
  const compact = entryFolded.replace(/\s+/g, '');
  if (!compact) return { candidates: [], tier: null };

  const exact = pool.filter((student) => student.compact === compact);
  if (exact.length) return { candidates: exact, tier: 'exact' };
  if (exactOnly) return { candidates: [], tier: null };

  if (compact.length >= 5) {
    const prefix = wildcardRegex(compact, { anchorEnd: false });
    const byPrefix = pool.filter((student) => prefix.test(student.compact));
    if (byPrefix.length) return { candidates: byPrefix, tier: 'fuzzy' };
  }

  const ocrTokens = entryFolded.split(' ').filter(Boolean);
  if (ocrTokens.length >= 2) {
    const byTokens = pool.filter((student) => tokensInOrder(ocrTokens, student.tokens));
    if (byTokens.length) return { candidates: byTokens, tier: 'fuzzy' };
  }

  return { candidates: [], tier: null };
}

/**
 * Does the uploader still have to decide something for this row?
 * Exact matches pass silently. Unmatched rows, guessed (fuzzy) matches and rows with a
 * booklet doubt need an explicit answer: pick/confirm a student or mark "dışarıdan katılıyor".
 * Decisions live only in the current import — nothing is remembered for the next exam.
 */
export function rowNeedsDecision(row) {
  if (row.external) return false;
  if (!row.student_id) return true;
  if (row.confirmed) return false;
  return row.matchStatus === 'fuzzy' || Boolean(row.needsReview);
}

/**
 * Matches optical-sheet entries to students by (often partial) name.
 * Rows come back in the shape the existing import review dialog and saveOptikImport expect.
 * Students not found are left unmatched and are skipped on import.
 */
export function matchOptikTxtEntries(entries, students, { questions, grades = [], classes = [] }) {
  const classNameById = new Map(classes.map((row) => [row.id, String(row.name ?? '').toUpperCase()]));
  const gradeSet = new Set(grades);

  let pool = (students ?? []).filter((student) => student.grade == null || !gradeSet.size || gradeSet.has(student.grade));
  if (!pool.length) pool = students ?? [];

  const prepared = pool.map((student) => {
    const folded = foldName(student.full_name);
    return {
      student,
      compact: folded.replace(/\s+/g, ''),
      tokens: folded.split(' ').filter(Boolean),
      section: classNameById.get(student.class_id) ?? '',
    };
  });

  const rows = entries.map((entry) => {
    const { booklet, choices, notes, needsReview } = buildOptikEntryChoices(entry, questions);
    return {
      rowNumber: entry.rowNumber,
      student_name: entry.student_name,
      student_number: '',
      booklet,
      section_mark: entry.section_mark,
      choices,
      notes,
      needsReview,
      confirmed: false,
      external: false,
      folded: foldName(entry.student_name),
      student_id: null,
      matchedStudent: null,
      matchStatus: 'unmatched',
      candidates: [],
    };
  });

  const used = new Set();

  function resolveRow(row, { exactOnly }) {
    if (row.student_id || row.matchStatus !== 'unmatched') return;
    const { candidates, tier } = findCandidates(row.folded, prepared, { exactOnly });
    if (!candidates.length) return;

    let chosen = candidates.length === 1 ? candidates[0] : null;
    if (!chosen && row.section_mark) {
      const inSection = candidates.filter((item) => item.section === row.section_mark);
      if (inSection.length === 1) {
        chosen = inSection[0];
        row.notes.push('Aynı addaki öğrencilerden, işaretlenen şubeye göre seçildi.');
      }
    }

    if (!chosen) {
      row.matchStatus = 'ambiguous';
      row.candidates = candidates.map((item) => item.student);
      row.notes.push(`Birden fazla olası öğrenci: ${candidates.map((item) => item.student.full_name).join(', ')}.`);
      return;
    }

    if (used.has(chosen.student.id)) {
      row.matchStatus = 'duplicate';
      row.candidates = [chosen.student];
      row.notes.push(`${chosen.student.full_name} dosyadaki başka bir satırla zaten eşleşti.`);
      return;
    }

    used.add(chosen.student.id);
    row.student_id = chosen.student.id;
    row.matchedStudent = chosen.student;
    row.matchStatus = tier;
    if (tier === 'fuzzy') row.notes.push(`Dosyadaki ad: “${row.student_name}”.`);
  }

  // Exact names first so a loose match can never take a student an exact row needs.
  rows.forEach((row) => resolveRow(row, { exactOnly: true }));
  rows.forEach((row) => resolveRow(row, { exactOnly: false }));

  for (const row of rows) {
    if (row.matchStatus === 'unmatched') {
      row.notes.push('Sistemde eşleşen öğrenci bulunamadı. Öğrenciyi seçin veya «Dışarıdan katılıyor» deyin.');
    }
  }

  return rows.map(({ folded, ...row }) => ({
    ...row,
    studentName: row.matchedStudent?.full_name ?? row.student_name,
  }));
}
