import * as XLSX from 'xlsx';
import { LGS_SUBJECTS } from './lgsExam';
import { globalQuestionIndex } from './examAnalysis';

const CHOICE_PATTERN = /^[A-E]$/;

function norm(value) {
  return String(value ?? '')
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function subjectCodeFromHeader(text) {
  const value = norm(text);
  if (!value) return null;
  if (value.startsWith('turkce')) return 'turkce';
  if (value.includes('inkilap')) return 'inkilap';
  if (value.includes('din kulturu')) return 'din';
  if (value.includes('ingilizce') || value.includes('yabanci dil')) return 'ingilizce';
  if (value.includes('matematik')) return 'matematik';
  if (value.includes('fen')) return 'fen';
  return null;
}

function kazanimCode(text) {
  const first = String(text ?? '').trim().split(/\s+/)[0] ?? '';
  return /\d/.test(first) && first.includes('.') && first.length <= 30 ? first : '';
}

function numberOrNull(value) {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function blockColumns(row) {
  const cols = {};
  row.forEach((cell, index) => {
    const header = norm(cell);
    if (!header) return;
    if ((header === 'a' || header.startsWith('a kitapcigi')) && cols.key == null) cols.key = index;
    else if (header === 'b' && cols.b == null) cols.b = index;
    else if (header === 'kazanim konu') cols.konu = index;
    else if (header === 'kazanim kodu') cols.code = index;
    else if (header === 'kazanim') cols.kazanim = index;
  });
  return cols.key == null ? null : cols;
}

function parseQuestionBlocks(rows) {
  const blocks = [];
  let current = null;
  for (const row of rows) {
    const first = row[0];
    const isNumber = first !== '' && first != null && Number.isFinite(Number(first));
    if (!isNumber && typeof first === 'string' && first.trim()) {
      const code = subjectCodeFromHeader(first);
      const cols = code ? blockColumns(row) : null;
      current = cols ? { subjectCode: code, cols, rows: [] } : null;
      if (current) blocks.push(current);
      continue;
    }
    if (current && isNumber) current.rows.push(row);
  }
  return blocks;
}

function parseMeta(rows) {
  const meta = { examName: '', wrongEffect: null, grade: null, ceilingScore: null };
  const head = rows.slice(0, 6);
  head.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const label = norm(cell);
      if (!label) return;
      const next = () => row.slice(colIndex + 1).find((value) => value !== '' && value != null);
      if (label === 'sinav adi') {
        meta.examName =
          String(head[rowIndex + 1]?.[colIndex] ?? '').trim() || String(next() ?? '').trim();
      } else if (label === 'yanlis etkisi') meta.wrongEffect = numberOrNull(next());
      else if (label === 'sinif') meta.grade = numberOrNull(next());
      else if (label === 'tavan puan') meta.ceilingScore = numberOrNull(next());
    });
  });
  return meta;
}

function parseCatalog(rows) {
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(norm);
    return headers.includes('unite') && headers.includes('konu') && headers.includes('kazanim');
  });
  if (headerIndex < 0) return new Map();
  const headers = rows[headerIndex].map(norm);
  const unitIdx = headers.indexOf('unite');
  const konuIdx = headers.indexOf('konu');
  const kazanimIdx = headers.indexOf('kazanim');
  const catalog = new Map();
  for (const row of rows.slice(headerIndex + 1)) {
    const code = kazanimCode(row[kazanimIdx]);
    if (!code) continue;
    catalog.set(code, {
      unit: String(row[unitIdx] ?? '').trim(),
      konu: String(row[konuIdx] ?? '').trim(),
    });
  }
  return catalog;
}

function sheetRows(workbook, name) {
  return XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '', raw: true });
}

/** Publisher answer-key workbook (A/B booklet key + kazanım) → questions in system order. */
export function parseAnswerKeyXlsx(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const warnings = [];

  const catalog = new Map();
  let best = null;
  for (const name of workbook.SheetNames) {
    const rows = sheetRows(workbook, name);
    for (const [code, value] of parseCatalog(rows)) catalog.set(code, value);

    const blocks = parseQuestionBlocks(rows);
    const questionCount = blocks.reduce((sum, block) => sum + block.rows.length, 0);
    if (!questionCount) continue;
    const hasKonu = blocks.some((block) => block.cols.konu != null);
    const score = questionCount * 10 + (hasKonu ? 5 : 0);
    if (!best || score > best.score) best = { name, rows, blocks, score };
  }

  if (!best) {
    throw new Error(
      'Excel dosyasında cevap anahtarı bulunamadı. Her ders için "A" (veya "A KİTAPÇIĞI") ve "B" sütunları olan bir sayfa gerekli.'
    );
  }

  const meta = { ...parseMeta(best.rows), sheetName: best.name };
  if (meta.wrongEffect != null && meta.wrongEffect !== 3) {
    warnings.push(
      `Dosyada yanlış etkisi ${meta.wrongEffect} yazıyor; sistem netleri 3 yanlış = 1 doğru olarak hesaplar.`
    );
  }

  const questions = [];
  const subjectsSeen = new Set();
  for (const block of best.blocks) {
    const subject = LGS_SUBJECTS.find((item) => item.code === block.subjectCode);
    if (!subject || subjectsSeen.has(subject.code)) continue;
    subjectsSeen.add(subject.code);

    if (block.rows.length !== subject.questions) {
      warnings.push(
        `${subject.label}: ${subject.questions} soru beklenirdi, dosyada ${block.rows.length} var.`
      );
    }

    block.rows.forEach((row, position) => {
      const localNumber = numberOrNull(row[0]) ?? position + 1;
      const choice = String(row[block.cols.key] ?? '').trim().toUpperCase();
      if (!CHOICE_PATTERN.test(choice)) {
        warnings.push(`${subject.label} ${localNumber}. soru: geçerli cevap şıkkı yok.`);
      }

      let bookletB = numberOrNull(row[block.cols.b]);
      if (bookletB == null || bookletB < 1 || bookletB > subject.questions) {
        warnings.push(`${subject.label} ${localNumber}. soru: B kitapçığı sırası okunamadı.`);
        bookletB = localNumber;
      }

      const kazanimText = block.cols.kazanim != null ? row[block.cols.kazanim] : '';
      const code =
        (block.cols.code != null ? String(row[block.cols.code] ?? '').trim() : '') ||
        kazanimCode(kazanimText);
      const fromCatalog = catalog.get(code.endsWith('.') ? code : `${code}.`) ?? catalog.get(code);
      const labels = [
        block.cols.konu != null ? String(row[block.cols.konu] ?? '').trim() : '',
        fromCatalog?.konu ?? '',
        fromCatalog?.unit ?? '',
      ].filter((label, index, all) => label && all.indexOf(label) === index);

      questions.push({
        question_index: globalQuestionIndex(subject.code, localNumber),
        subject_code: subject.code,
        booklet_a_no: localNumber,
        booklet_b_no: bookletB,
        correct_choice: CHOICE_PATTERN.test(choice) ? choice : '',
        topic_label: labels[0] ?? '',
        topic_alternates: labels.slice(1),
      });
    });
  }

  for (const subject of LGS_SUBJECTS) {
    if (!subjectsSeen.has(subject.code)) {
      warnings.push(`${subject.label} dersi dosyada bulunamadı.`);
    }
  }

  questions.sort((left, right) => left.question_index - right.question_index);

  const withoutTopic = questions.filter((question) => !question.topic_label).length;
  if (withoutTopic) {
    warnings.push(`${withoutTopic} sorunun konu bilgisi dosyada yok.`);
  }

  return { questions, warnings, meta };
}
