import { formatNum } from '../formatReport';
import { PDF_SUBJECT_LABELS, PDF_SUBJECT_ORDER, PDF_SUBJECT_SHORT, theme } from './theme';

function subjectOf(row, code) {
  return row.subjects?.find((subject) => subject.code === code) ?? null;
}

/** Counts are whole numbers for one student and one decimal for averages. */
function count(value, row) {
  if (value == null) return '—';
  return row.__avg || row.__decimal ? formatNum(value, 1) : formatNum(value, 0);
}

/** D / Y / N for every subject, in the publisher's order, one banner per subject. */
export function subjectDynColumns() {
  return PDF_SUBJECT_ORDER.flatMap((code) => {
    const group = PDF_SUBJECT_LABELS[code];
    return [
      {
        key: `${code}_d`,
        label: 'D',
        w: 2.4,
        group,
        sep: true,
        render: (row) => count(subjectOf(row, code)?.correct, row),
      },
      {
        key: `${code}_y`,
        label: 'Y',
        w: 2.4,
        group,
        render: (row) => count(subjectOf(row, code)?.wrong, row),
      },
      {
        key: `${code}_n`,
        label: 'N',
        w: 3.4,
        group,
        tone: () => ({ bold: true }),
        render: (row) => formatNum(subjectOf(row, code)?.net, 2),
      },
    ];
  });
}

/** One net column per subject (used for averages where D/Y decimals are just noise). */
export function subjectNetColumns({ group = 'DERS NETLERİ', w = 3.6 } = {}) {
  return PDF_SUBJECT_ORDER.map((code, index) => ({
    key: `${code}_net`,
    label: PDF_SUBJECT_SHORT[code],
    w,
    group,
    sep: index === 0,
    render: (row) => formatNum(subjectOf(row, code)?.net, 2),
  }));
}

export function totalDynColumns({ group = 'TOPLAM' } = {}) {
  return [
    {
      key: 'total_d',
      label: 'D',
      w: 2.7,
      group,
      sep: true,
      render: (row) => count(row.totalCorrect, row),
    },
    {
      key: 'total_y',
      label: 'Y',
      w: 2.7,
      group,
      render: (row) => count(row.totalWrong, row),
    },
    {
      key: 'total_n',
      label: 'N',
      w: 3.8,
      group,
      tone: () => ({ bold: true }),
      render: (row) => formatNum(row.totalNet, 2),
    },
  ];
}

export function puanColumn({ label = 'PUAN', w = 5.2 } = {}) {
  return {
    key: 'puan',
    label,
    w,
    sep: true,
    tone: () => ({ bold: true, color: theme.accent, bg: theme.tint }),
    render: (row) => formatNum(row.lgsScore, 2),
  };
}

export function rankColumn(key, label, pick, { w = 3.4, sep = false } = {}) {
  return {
    key,
    label,
    w,
    sep,
    render: (row) => {
      if (row.__avg) return '';
      const value = pick(row);
      return value == null ? '—' : String(value);
    },
  };
}

/** Summary-row look shared by all list tables. */
export function summaryTone(row) {
  return row.__avg ? { bg: theme.tint, bold: true, color: theme.ink } : null;
}
