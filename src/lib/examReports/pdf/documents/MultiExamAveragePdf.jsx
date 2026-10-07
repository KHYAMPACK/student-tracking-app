import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { LGS_SUBJECTS } from '../../../lgsExam';
import { formatNum, formatReportDateTime } from '../formatReport';
import { BarListCard, LineChartCard } from '../kit/Charts';
import { CompactHeader, ReportHeader } from '../kit/Header';
import { ReportFooter } from '../kit/Footer';
import { KitTable, paginateRows } from '../kit/Table';
import { PAGE, PDF_SUBJECT_ORDER, PDF_SUBJECT_SHORT, kitStyles, theme } from '../kit/theme';
import { puanColumn, subjectNetColumns, summaryTone, totalDynColumns } from '../kit/columns';

const FIRST_PAGE_ROWS = 14;
const NEXT_PAGE_ROWS = 27;
const MAX_EXAM_COLUMNS = 6;

const s = StyleSheet.create({
  sessionLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  sessionChip: {
    fontSize: 6.5,
    color: theme.body,
    marginRight: 12,
    marginBottom: 2,
  },
  sessionNo: {
    fontWeight: 700,
    color: theme.accent,
  },
});

function subjectOf(subjects, code) {
  return subjects?.find((subject) => subject.code === code) ?? null;
}

/** @param {{ model: import('../../reportSchemas').MultiExamAveragePdfModel }} props */
export function MultiExamAveragePdf({ model }) {
  const { header, sessions, schoolAverages, rows } = model;
  const generatedAt = formatReportDateTime(new Date());
  const title = 'Çoklu Deneme Ortalaması';
  const subtitle = [`${sessions.length} denemenin ortalaması`, header.scopeLabel].filter(Boolean).join('  ·  ');
  const width = PAGE.landscape.content;
  const showExamScores = sessions.length > 0 && sessions.length <= MAX_EXAM_COLUMNS;

  const columns = [
    { key: 'rank', label: 'SIRA', w: 2.6, render: (row) => (row.__avg ? '' : row.rank) },
    { key: 'class', label: 'ŞUBE', w: 3.2, render: (row) => row.classLabel },
    {
      key: 'name',
      label: 'ADI SOYADI',
      w: 12,
      align: 'left',
      tone: () => ({ bold: true }),
      render: (row) => row.studentName,
    },
    { key: 'count', label: 'DEN.', w: 2.2, render: (row) => (row.__avg ? '' : row.examCount) },
    ...subjectNetColumns({ group: 'DERS NET ORTALAMALARI', w: 3.6 }),
    ...totalDynColumns({ group: 'TOPLAM ORTALAMA' }),
    puanColumn({ label: 'ORT. PUAN' }),
    ...(showExamScores
      ? sessions.map((session, index) => ({
          key: `exam_${session.order}`,
          label: `${session.order}`,
          w: 3.6,
          group: 'DENEME PUANLARI',
          sep: index === 0,
          render: (row) => (row.examScores?.[index] != null ? formatNum(row.examScores[index], 1) : '—'),
        }))
      : []),
  ];

  const toRow = (row) => ({ ...row, __decimal: true });
  const averageRow = {
    ...schoolAverages,
    id: 'avg',
    __avg: true,
    __decimal: true,
    classLabel: '',
    studentName: 'KURUM ORTALAMASI',
    examScores: sessions.map((session) => session.avgScore ?? null),
  };

  const pages = paginateRows(rows.map(toRow), FIRST_PAGE_ROWS, NEXT_PAGE_ROWS);

  const subjectBars = PDF_SUBJECT_ORDER.map((code) => {
    const def = LGS_SUBJECTS.find((item) => item.code === code);
    const net = subjectOf(schoolAverages.subjects, code)?.net ?? 0;
    return {
      label: PDF_SUBJECT_SHORT[code],
      value: def?.questions ? (net / def.questions) * 100 : 0,
      display: `${formatNum(net, 1)} / ${def?.questions ?? ''}`,
    };
  });

  const trendPoints = sessions.map((session) => ({
    label: `${session.order}`,
    value: session.avgScore ?? null,
  }));
  const trendWidth = Math.floor((width - 8) * 0.56) - 20;

  return (
    <Document title={title} author={header.schoolName}>
      {pages.map((chunk, pageIndex) => (
        <Page key={`p-${pageIndex}`} size="A4" orientation="landscape" style={kitStyles.pageLandscape}>
          {pageIndex === 0 ? (
            <>
              <ReportHeader
                schoolName={header.schoolName}
                title={title}
                subtitle={subtitle}
                meta={[
                  { label: 'Öğrenci', value: String(rows.length) },
                  { label: 'Deneme', value: String(sessions.length) },
                  { label: 'Ort. net', value: formatNum(schoolAverages.totalNet, 2) },
                  { label: 'Ort. puan', value: formatNum(schoolAverages.lgsScore, 2) },
                ]}
              />
              <View style={kitStyles.cardRow}>
                <LineChartCard
                  title="Deneme ortalama puanı"
                  points={trendPoints}
                  width={trendWidth}
                  height={88}
                  flex={1.28}
                  digits={0}
                />
                <BarListCard title="Ders başarısı (net / soru sayısı)" items={subjectBars} max={100} flex={1} />
              </View>
              <View style={s.sessionLine}>
                {sessions.map((session) => (
                  <Text key={session.order} style={s.sessionChip}>
                    <Text style={s.sessionNo}>{session.order}  </Text>
                    {session.title}
                    {session.heldOn ? `  ${session.heldOn}` : ''}
                  </Text>
                ))}
              </View>
            </>
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
