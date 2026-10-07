import { Document, Page, View } from '@react-pdf/renderer';
import { LGS_SUBJECTS } from '../../../lgsExam';
import { formatNum, formatReportDateTime } from '../formatReport';
import { BarListCard, LineChartCard } from '../kit/Charts';
import { CompactHeader, ReportHeader } from '../kit/Header';
import { ReportFooter } from '../kit/Footer';
import { KitTable, paginateRows } from '../kit/Table';
import { PAGE, PDF_SUBJECT_ORDER, PDF_SUBJECT_SHORT, kitStyles } from '../kit/theme';
import {
  puanColumn,
  rankColumn,
  subjectDynColumns,
  summaryTone,
  totalDynColumns,
} from '../kit/columns';

const FIRST_PAGE_ROWS = 9;
const NEXT_PAGE_ROWS = 24;

function subjectOf(subjects, code) {
  return subjects?.find((subject) => subject.code === code) ?? null;
}

/** @param {{ model: import('../../reportSchemas').StudentAllExamsPdfModel }} props */
export function StudentAllExamsPdf({ model }) {
  const { header, exams, averages } = model;
  const generatedAt = formatReportDateTime(new Date());
  const title = header.studentName || 'Öğrenci Gelişim Raporu';
  const subtitle = [
    'Deneme gelişim raporu',
    header.classLabel ? `Şube ${header.classLabel}` : null,
    header.studentNumber ? `No ${header.studentNumber}` : null,
    header.reportDate,
  ]
    .filter(Boolean)
    .join('  ·  ');
  const width = PAGE.landscape.content;

  const columns = [
    { key: 'order', label: 'NO', w: 1.8, render: (row) => (row.__avg ? '' : row.order) },
    {
      key: 'title',
      label: 'SINAV ADI',
      w: 17,
      align: 'left',
      tone: () => ({ bold: true }),
      render: (row) => row.title,
    },
    { key: 'date', label: 'TARİH', w: 4.6, render: (row) => row.heldOn ?? '' },
    ...subjectDynColumns(),
    ...totalDynColumns(),
    puanColumn(),
    { ...rankColumn('r_school', 'KURUM', (row) => row.ranks?.school, { sep: true }), group: 'SIRALAMA' },
    { ...rankColumn('r_class', 'ŞUBE', (row) => row.ranks?.class), group: 'SIRALAMA' },
  ];

  const averageRow = {
    ...averages,
    id: 'avg',
    __avg: true,
    title: 'ORTALAMA',
    heldOn: '',
    ranks: {},
  };

  const pages = paginateRows(exams, FIRST_PAGE_ROWS, NEXT_PAGE_ROWS);
  const lastPageIndex = pages.length - 1;

  const scores = exams.map((exam) => exam.lgsScore).filter((value) => value != null);
  const best = scores.length ? Math.max(...scores) : null;
  const latest = exams.length ? exams[exams.length - 1] : null;

  const subjectBars = PDF_SUBJECT_ORDER.map((code) => {
    const def = LGS_SUBJECTS.find((item) => item.code === code);
    const net = subjectOf(averages.subjects, code)?.net ?? 0;
    return {
      label: PDF_SUBJECT_SHORT[code],
      value: def?.questions ? (net / def.questions) * 100 : 0,
      display: `${formatNum(net, 1)} / ${def?.questions ?? ''}`,
    };
  });

  const trendPoints = exams.map((exam) => ({ label: `${exam.order}`, value: exam.lgsScore ?? null }));
  const trendWidth = Math.floor((width - 8) * 0.58) - 20;

  return (
    <Document title={`${title} — Deneme Gelişim Raporu`} author={header.schoolName}>
      {pages.map((chunk, pageIndex) => (
        <Page key={`p-${pageIndex}`} size="A4" orientation="landscape" style={kitStyles.pageLandscape}>
          {pageIndex === 0 ? (
            <>
              <ReportHeader
                schoolName={header.schoolName}
                title={title}
                subtitle={subtitle}
                meta={[
                  { label: 'Sınav', value: String(exams.length) },
                  { label: 'Ort. net', value: formatNum(averages.totalNet, 2) },
                  { label: 'Ort. puan', value: formatNum(averages.lgsScore, 2) },
                  { label: 'En iyi puan', value: formatNum(best, 2) },
                  { label: 'Son puan', value: formatNum(latest?.lgsScore, 2) },
                ]}
              />
              <View style={kitStyles.cardRow}>
                <LineChartCard
                  title="Puan gelişimi (deneme sırasına göre)"
                  points={trendPoints}
                  width={trendWidth}
                  height={88}
                  flex={1.3}
                  digits={0}
                />
                <BarListCard title="Ders başarısı (ort. net / soru sayısı)" items={subjectBars} max={100} flex={1} />
              </View>
            </>
          ) : (
            <CompactHeader title={title} subtitle="Deneme gelişim raporu" />
          )}
          <KitTable
            columns={columns}
            rows={pageIndex === lastPageIndex ? [...chunk, { ...averageRow, __decimal: true }] : chunk}
            width={width}
            rowHeight={18}
            rowTone={summaryTone}
          />
          <ReportFooter schoolName={header.schoolName} label={`${title} · Deneme gelişimi`} generatedAt={generatedAt} />
        </Page>
      ))}
    </Document>
  );
}
