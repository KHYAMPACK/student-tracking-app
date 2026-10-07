import { Document, Page, View } from '@react-pdf/renderer';
import { LGS_SUBJECTS } from '../../../lgsExam';
import { formatNum, formatReportDateTime } from '../formatReport';
import { BarListCard, CHART, DonutCard } from '../kit/Charts';
import { CompactHeader, ReportHeader } from '../kit/Header';
import { ReportFooter } from '../kit/Footer';
import { KitTable, paginateRows } from '../kit/Table';
import { PAGE, PDF_SUBJECT_ORDER, PDF_SUBJECT_SHORT, kitStyles } from '../kit/theme';
import { puanColumn, subjectNetColumns, summaryTone, totalDynColumns } from '../kit/columns';

const FIRST_PAGE_ROWS = 11;
const NEXT_PAGE_ROWS = 26;

function subjectOf(subjects, code) {
  return subjects?.find((subject) => subject.code === code) ?? null;
}

/** @param {{ model: import('../../reportSchemas').ClassAveragePdfModel }} props */
export function ClassAveragePdf({ model }) {
  const { header, schoolAverages, classRows } = model;
  const generatedAt = formatReportDateTime(new Date());
  const title = 'Şube Ortalama Listesi';
  const subtitle = [header.sessionTitle, header.sessionDate, header.scopeLabel].filter(Boolean).join('  ·  ');
  const width = PAGE.landscape.content;
  const participantTotal = classRows.reduce((sum, row) => sum + (row.participantCount ?? 0), 0);

  const columns = [
    { key: 'rank', label: 'SIRA', w: 2.6, render: (row) => (row.__avg ? '' : row.rank) },
    {
      key: 'class',
      label: 'ŞUBE',
      w: 4.6,
      align: 'left',
      tone: () => ({ bold: true }),
      render: (row) => row.classLabel,
    },
    {
      key: 'count',
      label: 'KATILAN',
      w: 3.6,
      render: (row) =>
        row.__avg
          ? String(row.participantCount ?? '')
          : row.studentCount && row.studentCount !== row.participantCount
            ? `${row.participantCount} / ${row.studentCount}`
            : String(row.participantCount ?? ''),
    },
    ...subjectNetColumns({ group: 'DERS NET ORTALAMALARI', w: 4.2 }),
    ...totalDynColumns({ group: 'TOPLAM ORTALAMA' }),
    puanColumn({ label: 'ORT. PUAN' }),
  ];

  const toRow = (row, extra = {}) => ({ ...row, __decimal: true, ...extra });
  const averageRow = toRow(
    { ...schoolAverages, id: 'avg', classLabel: 'ORTALAMA', participantCount: schoolAverages.participantCount },
    { __avg: true }
  );

  const pages = paginateRows(classRows.map((row) => toRow(row)), FIRST_PAGE_ROWS, NEXT_PAGE_ROWS);

  const subjectBars = PDF_SUBJECT_ORDER.map((code) => {
    const def = LGS_SUBJECTS.find((item) => item.code === code);
    const net = subjectOf(schoolAverages.subjects, code)?.net ?? 0;
    return {
      label: PDF_SUBJECT_SHORT[code],
      value: def?.questions ? (net / def.questions) * 100 : 0,
      display: `${formatNum(net, 1)} / ${def?.questions ?? ''}`,
    };
  });

  const classBars = classRows.slice(0, 8).map((row) => ({
    label: row.classLabel,
    value: row.lgsScore ?? 0,
    display: formatNum(row.lgsScore, 0),
  }));

  return (
    <Document title={`${title} — ${header.sessionTitle ?? ''}`} author={header.schoolName}>
      {pages.map((chunk, pageIndex) => (
        <Page key={`p-${pageIndex}`} size="A4" orientation="landscape" style={kitStyles.pageLandscape}>
          {pageIndex === 0 ? (
            <>
              <ReportHeader
                schoolName={header.schoolName}
                title={title}
                subtitle={subtitle}
                meta={[
                  { label: 'Şube', value: String(classRows.length) },
                  { label: 'Katılımcı', value: String(participantTotal) },
                  { label: 'Ort. net', value: formatNum(schoolAverages.totalNet, 2) },
                  { label: 'Ort. puan', value: formatNum(schoolAverages.lgsScore, 2) },
                ]}
              />
              <View style={kitStyles.cardRow}>
                <BarListCard title="Ders başarısı (net / soru sayısı)" items={subjectBars} max={100} flex={1.15} />
                <BarListCard title="Şube ortalama puanı" items={classBars} max={500} flex={1} />
                <DonutCard
                  title="Ortalama cevap dağılımı"
                  centerLabel="soru"
                  digits={1}
                  flex={1}
                  segments={[
                    { label: 'Doğru', value: schoolAverages.totalCorrect ?? 0, color: CHART.correct },
                    { label: 'Yanlış', value: schoolAverages.totalWrong ?? 0, color: CHART.wrong },
                    { label: 'Boş', value: schoolAverages.totalBlank ?? 0, color: CHART.blank },
                  ]}
                />
              </View>
            </>
          ) : (
            <CompactHeader title={title} subtitle={subtitle} />
          )}
          <KitTable
            columns={columns}
            rows={pageIndex === 0 ? [averageRow, ...chunk] : chunk}
            width={width}
            rowHeight={18}
            rowTone={summaryTone}
          />
          <ReportFooter schoolName={header.schoolName} label={title} generatedAt={generatedAt} />
        </Page>
      ))}
    </Document>
  );
}
