import { Document, Page } from '@react-pdf/renderer';
import { formatNum, formatReportDateTime } from '../formatReport';
import { CompactHeader, ReportHeader } from '../kit/Header';
import { ReportFooter } from '../kit/Footer';
import { KitTable, paginateRows } from '../kit/Table';
import { PAGE, kitStyles } from '../kit/theme';
import {
  puanColumn,
  rankColumn,
  subjectDynColumns,
  summaryTone,
  totalDynColumns,
} from '../kit/columns';

const FIRST_PAGE_ROWS = 22;
const NEXT_PAGE_ROWS = 27;

/** @param {{ model: import('../../reportSchemas').ExamResultsPdfModel }} props */
export function ExamResultsPdf({ model }) {
  const { header, rows, averages, participantCount, topScore } = model;
  const generatedAt = formatReportDateTime(new Date());
  const showGrade = new Set(rows.map((row) => row.grade).filter((grade) => grade != null)).size > 1;

  const columns = [
    { key: 'rank', label: 'SIRA', w: 2.6, render: (row) => (row.__avg ? '' : row.rank) },
    { key: 'class', label: 'ŞUBE', w: 3.4, render: (row) => row.classLabel },
    {
      key: 'name',
      label: 'ADI SOYADI',
      w: 14,
      align: 'left',
      tone: () => ({ bold: true }),
      render: (row) => row.studentName,
    },
    ...subjectDynColumns(),
    ...totalDynColumns(),
    puanColumn(),
    { ...rankColumn('r_school', 'KURUM', (row) => row.ranks?.school, { sep: true }), group: 'SIRALAMA' },
    { ...rankColumn('r_class', 'ŞUBE', (row) => row.ranks?.class), group: 'SIRALAMA' },
    ...(showGrade
      ? [{ ...rankColumn('r_grade', 'SINIF', (row) => row.ranks?.grade), group: 'SIRALAMA' }]
      : []),
  ];

  const averageRow = {
    id: 'avg',
    __avg: true,
    classLabel: '',
    studentName: 'ORTALAMA',
    subjects: averages.subjects,
    totalCorrect: averages.totalCorrect,
    totalWrong: averages.totalWrong,
    totalBlank: averages.totalBlank,
    totalNet: averages.totalNet,
    lgsScore: averages.lgsScore,
    ranks: {},
  };

  const pages = paginateRows(rows, FIRST_PAGE_ROWS, NEXT_PAGE_ROWS);
  const title = 'Deneme Sonuç Listesi';
  const subtitle = [header.sessionTitle, header.sessionDate, header.scopeLabel].filter(Boolean).join('  ·  ');
  const width = PAGE.landscape.content;

  return (
    <Document title={`${title} — ${header.sessionTitle ?? ''}`} author={header.schoolName}>
      {pages.map((chunk, pageIndex) => (
        <Page key={`p-${pageIndex}`} size="A4" orientation="landscape" style={kitStyles.pageLandscape}>
          {pageIndex === 0 ? (
            <ReportHeader
              schoolName={header.schoolName}
              title={title}
              subtitle={subtitle}
              meta={[
                { label: 'Katılımcı', value: String(participantCount) },
                { label: 'Ort. net', value: formatNum(averages.totalNet, 2) },
                { label: 'Ort. puan', value: formatNum(averages.lgsScore, 2) },
                {
                  label: topScore?.name ? `En yüksek puan · ${topScore.name}` : 'En yüksek puan',
                  value: formatNum(topScore?.score, 2),
                },
              ]}
            />
          ) : (
            <CompactHeader title={title} subtitle={subtitle} />
          )}
          <KitTable
            columns={columns}
            rows={pageIndex === 0 ? [averageRow, ...chunk] : chunk}
            width={width}
            rowHeight={17}
            rowTone={summaryTone}
          />
          <ReportFooter schoolName={header.schoolName} label={title} generatedAt={generatedAt} />
        </Page>
      ))}
    </Document>
  );
}
