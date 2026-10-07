import { Document, Page } from '@react-pdf/renderer';
import { formatNum, formatReportDateTime } from '../formatReport';
import { SuccessBar } from '../kit/Charts';
import { CompactHeader, ReportHeader } from '../kit/Header';
import { ReportFooter } from '../kit/Footer';
import { KitTable, paginateRows } from '../kit/Table';
import { PAGE, PDF_SUBJECT_ORDER, kitStyles, theme } from '../kit/theme';

const ROWS_FIRST_PAGE = 24;
const ROWS_NEXT_PAGE = 36;
const CHOICES = ['A', 'B', 'C', 'D'];

function sectionOrder(section) {
  const index = PDF_SUBJECT_ORDER.indexOf(section.subjectCode);
  return index === -1 ? PDF_SUBJECT_ORDER.length : index;
}

/** Most chosen wrong option, if it pulled a meaningful share of the class. */
function strongestDistractor(row) {
  let best = null;
  for (const choice of CHOICES) {
    if (choice === row.correctChoice) continue;
    const value = Number(row.choices?.[choice]);
    if (Number.isFinite(value) && (best == null || value > best.value)) best = { choice, value };
  }
  return best && best.value >= 20 ? best.choice : null;
}

/** @param {{ model: import('../../reportSchemas').QuestionFrequencyPdfModel }} props */
export function QuestionFrequencyPdf({ model }) {
  const { header, sections } = model;
  const generatedAt = formatReportDateTime(new Date());
  const width = PAGE.portrait.content;
  const ordered = [...sections].sort((a, b) => sectionOrder(a) - sectionOrder(b));

  const choiceColumns = CHOICES.map((choice, index) => ({
    key: `choice_${choice}`,
    label: choice,
    w: 2,
    group: 'ŞIK DAĞILIMI (%)',
    sep: index === 0,
    tone: (row) => {
      if (row.correctChoice === choice) return { bg: theme.goodSoft, color: theme.good, bold: true };
      if (strongestDistractor(row) === choice) return { bg: theme.badSoft, color: theme.bad, bold: true };
      return null;
    },
    render: (row) => (row.choices?.[choice] == null ? '—' : formatNum(row.choices[choice], 0)),
  }));

  const columns = [
    { key: 'a', label: 'A', w: 1.5, group: 'KİTAPÇIK', render: (row) => formatNum(row.bookletA, 0) },
    { key: 'b', label: 'B', w: 1.5, group: 'KİTAPÇIK', render: (row) => formatNum(row.bookletB, 0) },
    {
      key: 'answer',
      label: 'CEVAP',
      w: 1.8,
      sep: true,
      tone: () => ({ bold: true, color: theme.good }),
      render: (row) => row.correctChoice ?? '—',
    },
    { key: 'topic', label: 'KONU', w: 9, align: 'left', sep: true, render: (row) => row.topic },
    {
      key: 'success',
      label: 'BAŞARI',
      w: 4.2,
      sep: true,
      render: (row) => <SuccessBar value={row.successPct ?? 0} />,
    },
    { key: 'blank', label: 'BOŞ %', w: 1.8, render: (row) => formatNum(row.blankPct, 0) },
    ...choiceColumns,
  ];

  return (
    <Document title={`Soru Frekans Analizi — ${header.sessionTitle ?? ''}`} author={header.schoolName}>
      {ordered.flatMap((section) => {
        const rows = section.rows;
        const avgSuccess = rows.length
          ? rows.reduce((sum, row) => sum + (row.successPct ?? 0), 0) / rows.length
          : null;
        const sortedBySuccess = [...rows].sort((a, b) => (a.successPct ?? 0) - (b.successPct ?? 0));
        const hardest = sortedBySuccess[0];
        const easiest = sortedBySuccess[sortedBySuccess.length - 1];
        const pages = paginateRows(rows, ROWS_FIRST_PAGE, ROWS_NEXT_PAGE);
        const title = `${section.subjectLabel} · Soru Analizi`;
        const subtitle = [header.sessionTitle, header.scopeLabel].filter(Boolean).join('  ·  ');
        const pointer = (row) => (row ? `A-${formatNum(row.bookletA, 0)} · %${formatNum(row.successPct, 0)}` : '—');

        return pages.map((chunk, pageIndex) => (
          <Page key={`${section.subjectCode}-${pageIndex}`} size="A4" style={kitStyles.pagePortrait}>
            {pageIndex === 0 ? (
              <ReportHeader
                schoolName={header.schoolName}
                title={title}
                subtitle={subtitle}
                meta={[
                  { label: 'Soru', value: String(rows.length) },
                  { label: 'Ort. başarı', value: avgSuccess == null ? '—' : `%${formatNum(avgSuccess, 0)}` },
                  { label: 'En zor', value: pointer(hardest) },
                  { label: 'En kolay', value: pointer(easiest) },
                ]}
              />
            ) : (
              <CompactHeader title={title} subtitle={subtitle} />
            )}
            <KitTable columns={columns} rows={chunk} width={width} rowHeight={17} fontSize={7.5} />
            <ReportFooter
              schoolName={header.schoolName}
              label="Soru frekans analizi"
              generatedAt={generatedAt}
              inset={PAGE.portrait.marginX}
            />
          </Page>
        ));
      })}
    </Document>
  );
}
