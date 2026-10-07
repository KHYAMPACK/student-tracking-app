import { subjectByCode } from './lgsExam';

/**
 * Fixed-width optical-reader export (one line per student). Offsets are 0-based.
 * The sheet lists LGS sections in real exam order: Türkçe+İnkılap, Din, İngilizce,
 * Matematik+Fen, with unused 10-character gaps between the blocks.
 * Column 24 is a one-character flag whose meaning is unknown, so it is ignored.
 */
export const OPTIK_LAYOUT_LGS_90 = {
  id: 'lgs-90',
  booklet: 25,
  nameStart: 26,
  nameEnd: 45,
  grade: 45,
  section: 46,
  answerBlocks: [
    { start: 47, subjects: ['turkce', 'inkilap'] },
    { start: 87, subjects: ['din'] },
    { start: 107, subjects: ['ingilizce'] },
    { start: 127, subjects: ['matematik', 'fen'] },
  ],
};

function layoutEnd(layout) {
  return Math.max(
    ...layout.answerBlocks.map(
      (block) =>
        block.start + block.subjects.reduce((sum, code) => sum + (subjectByCode(code)?.questions ?? 0), 0)
    )
  );
}

/** Optical exports are Windows-1254 (Turkish ANSI); accept UTF-8 too. */
export function decodeOptikBytes(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder('windows-1254').decode(bytes);
  }
  return text.replace(/^﻿/, '');
}

/** "*" = çift işaretleme; yayınevi bunu boş değil YANLIŞ sayar, bu yüzden korunur. */
export const DOUBLE_MARK = '*';

function normalizeMark(value) {
  const mark = String(value ?? '').toUpperCase();
  if (mark === DOUBLE_MARK) return DOUBLE_MARK;
  return /^[A-E]$/.test(mark) ? mark : null;
}

export function parseOptikTxt(text, layout = OPTIK_LAYOUT_LGS_90) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map((line, index) => ({ line, rowNumber: index + 1 }))
    .filter((item) => item.line.trim() !== '');

  if (!lines.length) {
    throw new Error('Optik dosyası boş.');
  }

  const end = layoutEnd(layout);
  const lastBlockStart = Math.max(...layout.answerBlocks.map((block) => block.start));
  const warnings = [];
  const entries = [];

  for (const { line: rawLine, rowNumber } of lines) {
    if (rawLine.length < lastBlockStart) {
      warnings.push(
        `Satır ${rowNumber}: ${rawLine.length} karakter, beklenen en az ${lastBlockStart}; atlandı.`
      );
      continue;
    }

    const line = rawLine.padEnd(end, ' ');
    const answers = {};
    for (const block of layout.answerBlocks) {
      let offset = block.start;
      for (const code of block.subjects) {
        const count = subjectByCode(code)?.questions ?? 0;
        answers[code] = line.slice(offset, offset + count).split('');
        offset += count;
      }
    }

    const booklet = line[layout.booklet]?.toUpperCase();
    entries.push({
      rowNumber,
      student_name: line.slice(layout.nameStart, layout.nameEnd).replace(/\s+/g, ' ').trim(),
      student_number: '',
      marked_booklet: booklet === 'A' || booklet === 'B' ? booklet : null,
      grade_mark: line[layout.grade]?.trim() ?? '',
      section_mark: line[layout.section]?.trim().toUpperCase() ?? '',
      answers,
    });
  }

  if (!entries.length) {
    throw new Error(
      `Dosya beklenen optik düzenine uymuyor (satır uzunluğu en az ${lastBlockStart} karakter olmalı).`
    );
  }

  return { entries, warnings };
}

function rawMarkFor(entry, question, booklet) {
  const position =
    booklet === 'B' ? question.booklet_b_no ?? question.booklet_a_no : question.booklet_a_no;
  return entry.answers[question.subject_code]?.[(position ?? 0) - 1];
}

function choiceFor(entry, question, booklet) {
  return normalizeMark(rawMarkFor(entry, question, booklet));
}

function countCorrect(entry, questions, booklet) {
  let correct = 0;
  for (const question of questions) {
    if (choiceFor(entry, question, booklet) === question.correct_choice) correct += 1;
  }
  return correct;
}

/**
 * Turns one parsed line into answers keyed by question index (A-booklet order).
 * B-booklet students are mapped back through the key's booklet_b_no positions.
 */
export function buildOptikEntryChoices(entry, questions) {
  const notes = [];
  const hitsA = countCorrect(entry, questions, 'A');
  const hitsB = countCorrect(entry, questions, 'B');

  // A wrong booklet silently produces wrong results, so these need a human look.
  let needsReview = false;
  let booklet = entry.marked_booklet;
  if (!booklet) {
    booklet = hitsB > hitsA ? 'B' : 'A';
    needsReview = true;
    notes.push(`Kitapçık işaretlenmemiş; cevaplara göre ${booklet} alındı.`);
  } else {
    const markedHits = booklet === 'A' ? hitsA : hitsB;
    const otherHits = booklet === 'A' ? hitsB : hitsA;
    if (otherHits >= markedHits + 8 && otherHits > markedHits * 1.5) {
      needsReview = true;
      notes.push(
        `İşaretlenen kitapçık ${booklet}, ancak cevaplar ${booklet === 'A' ? 'B' : 'A'} kitapçığıyla daha uyumlu; kontrol edin.`
      );
    }
  }

  const choices = {};
  let doubleMarks = 0;
  for (const question of questions) {
    const choice = choiceFor(entry, question, booklet);
    if (choice === DOUBLE_MARK) doubleMarks += 1;
    choices[question.question_index] = choice;
  }
  if (doubleMarks) {
    notes.push(`${doubleMarks} çift işaretli soru yanlış sayıldı.`);
  }

  return { booklet, choices, notes, needsReview };
}
