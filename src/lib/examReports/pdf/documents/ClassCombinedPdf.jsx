import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { formatNum, formatReportDateTime } from '../formatReport';
import { BarListCard, CHART, DonutCard, SuccessBar } from '../kit/Charts';
import { CompactHeader, ReportHeader } from '../kit/Header';
import { ReportFooter } from '../kit/Footer';
import { KitTable } from '../kit/Table';
import {
  PAGE,
  PDF_SUBJECT_LABELS,
  PDF_SUBJECT_ORDER,
  PDF_SUBJECT_SHORT,
  kitStyles,
  theme,
} from '../kit/theme';

const TOPIC_ROW_HEIGHT = 15;
const PAGE_UNITS = 40;
const MIN_ATTEMPTS_FOR_PRIORITY = 8;

const s = StyleSheet.create({
  subjectHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
  },
  subjectName: {
    fontSize: 9,
    fontWeight: 700,
    color: theme.ink,
  },
  subjectStat: {
    fontSize: 7,
    color: theme.muted,
  },
  note: {
    fontSize: 7,
    color: theme.muted,
    marginBottom: 8,
  },
});

function successOf(items) {
  const attempts = items.reduce((sum, item) => sum + (item.ss ?? 0), 0);
  const correct = items.reduce((sum, item) => sum + (item.correct ?? 0), 0);
  return attempts ? (correct / attempts) * 100 : 0;
}

function groupTopics(topics) {
  const groups = PDF_SUBJECT_ORDER.map((code) => ({
    code,
    label: PDF_SUBJECT_LABELS[code],
    rows: topics.filter((topic) => topic.subjectCode === code).sort((a, b) => a.successRate - b.successRate),
  })).filter((group) => group.rows.length);
  const others = topics.filter((topic) => !PDF_SUBJECT_ORDER.includes(topic.subjectCode));
  if (others.length) {
    groups.push({ code: 'other', label: 'DİĞER', rows: others.sort((a, b) => a.successRate - b.successRate) });
  }
  return groups;
}

/** Fills pages greedily; a subject may continue on the next page. */
function packTopicPages(groups) {
  const pages = [];
  let current = { blocks: [], used: 0 };
  const flush = () => {
    if (current.blocks.length) pages.push(current);
    current = { blocks: [], used: 0 };
  };

  for (const group of groups) {
    let remaining = group.rows;
    let continued = false;
    while (remaining.length) {
      const free = PAGE_UNITS - current.used - 3;
      if (free < 4) {
        flush();
        continue;
      }
      const take = remaining.slice(0, free);
      current.blocks.push({ ...group, rows: take, continued, total: group.rows });
      current.used += take.length + 3;
      remaining = remaining.slice(take.length);
      continued = true;
      if (remaining.length) flush();
    }
  }
  flush();
  return pages;
}

/** @param {{ model: import('../../reportSchemas').ClassCombinedPdfModel }} props */
export function ClassCombinedPdf({ model }) {
  const { header, exams, topics, topicCoverage } = model;
  const generatedAt = formatReportDateTime(new Date());
  const title = 'Birleştirilmiş Karne';
  const width = PAGE.portrait.content;

  const totals = topics.reduce(
    (acc, topic) => ({
      correct: acc.correct + (topic.correct ?? 0),
      wrong: acc.wrong + (topic.wrong ?? 0),
      blank: acc.blank + (topic.blank ?? 0),
    }),
    { correct: 0, wrong: 0, blank: 0 }
  );
  const attempts = totals.correct + totals.wrong + totals.blank;
  const overall = attempts ? (totals.correct / attempts) * 100 : null;
  const avgParticipants = exams.length
    ? Math.round(exams.reduce((sum, exam) => sum + exam.participants, 0) / exams.length)
    : 0;
  const avgNet = exams.length ? exams.reduce((sum, exam) => sum + exam.avgNet, 0) / exams.length : 0;

  const subtitleParts = [header.scopeLabel, `${exams.length} deneme`];
  if (topicCoverage && topicCoverage.withAnswers < topicCoverage.total) {
    subtitleParts.push(`konu analizi ${topicCoverage.withAnswers}/${topicCoverage.total} denemenin cevaplarına göre`);
  }
  const subtitle = subtitleParts.filter(Boolean).join('  ·  ');

  const examColumns = [
    { key: 'order', label: 'NO', w: 1.2, render: (row) => row.order },
    { key: 'title', label: 'SINAV ADI', w: 8.5, align: 'left', tone: () => ({ bold: true }), render: (row) => row.title },
    { key: 'date', label: 'TARİH', w: 2.6, render: (row) => row.heldOn ?? '' },
    { key: 'participants', label: 'KATILAN', w: 1.8, render: (row) => row.participants },
    { key: 'net', label: 'ORT. NET', w: 2, sep: true, tone: () => ({ bold: true }), render: (row) => formatNum(row.avgNet, 2) },
    {
      key: 'score',
      label: 'ORT. PUAN',
      w: 2.2,
      tone: () => ({ bold: true, color: theme.accent, bg: theme.tint }),
      render: (row) => formatNum(row.avgScore, 2),
    },
  ];

  const priority = [...topics]
    .filter((topic) => (topic.ss ?? 0) >= MIN_ATTEMPTS_FOR_PRIORITY)
    .sort((a, b) => a.successRate - b.successRate)
    .slice(0, 6);
  const priorityColumns = [
    {
      key: 'subject',
      label: 'DERS',
      w: 2,
      align: 'left',
      render: (row) => PDF_SUBJECT_SHORT[row.subjectCode] ?? '—',
    },
    { key: 'label', label: 'KONU', w: 8, align: 'left', tone: () => ({ bold: true }), render: (row) => row.label },
    { key: 'ss', label: 'SORU', w: 1.4, render: (row) => formatNum(row.ss, 0) },
    {
      key: 'success',
      label: 'BAŞARI',
      w: 4.4,
      render: (row) => <SuccessBar value={row.successRate ?? 0} />,
    },
  ];

  const topicColumns = [
    { key: 'label', label: 'KONU', w: 9, align: 'left', render: (row) => row.label },
    { key: 'ss', label: 'SORU', w: 1.4, render: (row) => formatNum(row.ss, 0) },
    { key: 'd', label: 'D', w: 1.3, sep: true, render: (row) => formatNum(row.correct, 0) },
    { key: 'y', label: 'Y', w: 1.3, render: (row) => formatNum(row.wrong, 0) },
    { key: 'b', label: 'B', w: 1.3, render: (row) => formatNum(row.blank, 0) },
    {
      key: 'success',
      label: 'BAŞARI',
      w: 4.6,
      sep: true,
      render: (row) => <SuccessBar value={row.successRate ?? 0} />,
    },
  ];

  const topicPages = packTopicPages(groupTopics(topics));
  const barItems = exams.map((exam) => ({
    label: `${exam.order}. deneme`,
    value: (exam.avgNet / 90) * 100,
    display: formatNum(exam.avgNet, 1),
  }));

  return (
    <Document title={`${title} — ${header.scopeLabel ?? ''}`} author={header.schoolName}>
      <Page size="A4" style={kitStyles.pagePortrait}>
        <ReportHeader
          schoolName={header.schoolName}
          title={title}
          subtitle={subtitle}
          meta={[
            { label: 'Deneme', value: String(exams.length) },
            { label: 'Ort. katılım', value: String(avgParticipants) },
            { label: 'Genel başarı', value: overall == null ? '—' : `%${formatNum(overall, 0)}` },
            { label: 'Ort. net', value: formatNum(avgNet, 1) },
          ]}
        />

        <View style={kitStyles.cardRow}>
          <BarListCard title="Deneme ortalama neti (90 soru üzerinden)" items={barItems} max={100} flex={1.15} />
          <DonutCard
            title="Cevap dağılımı"
            centerLabel="cevap"
            flex={1}
            segments={[
              { label: 'Doğru', value: totals.correct, color: CHART.correct },
              { label: 'Yanlış', value: totals.wrong, color: CHART.wrong },
              { label: 'Boş', value: totals.blank, color: CHART.blank },
            ]}
          />
        </View>

        <Text style={kitStyles.sectionTitle}>Seçilen denemeler</Text>
        <KitTable columns={examColumns} rows={exams} width={width} rowHeight={16} fontSize={7.5} />

        {priority.length ? (
          <>
            <Text style={kitStyles.sectionTitle}>Öncelikli çalışılacak konular</Text>
            <KitTable columns={priorityColumns} rows={priority} width={width} rowHeight={16} fontSize={7.5} />
          </>
        ) : null}
        <ReportFooter schoolName={header.schoolName} label={title} generatedAt={generatedAt} inset={PAGE.portrait.marginX} />
      </Page>

      {topicPages.map((page, pageIndex) => (
        <Page key={`topics-${pageIndex}`} size="A4" style={kitStyles.pagePortrait}>
          <CompactHeader title="Konu başarı analizi" subtitle={subtitle} />
          {pageIndex === 0 ? (
            <Text style={s.note}>
              Her dersin konuları en düşük başarıdan en yükseğe sıralanmıştır. Başarı = doğru cevap / toplam cevap.
            </Text>
          ) : null}
          {page.blocks.map((block) => (
            <View key={`${block.code}-${block.continued ? 'c' : 's'}`}>
              <View style={s.subjectHead}>
                <Text style={s.subjectName}>
                  {block.label}
                  {block.continued ? ' (devam)' : ''}
                </Text>
                <Text style={s.subjectStat}>
                  {block.total.length} konu · başarı %{formatNum(successOf(block.total), 0)}
                </Text>
              </View>
              <KitTable
                columns={topicColumns}
                rows={block.rows}
                width={width}
                rowHeight={TOPIC_ROW_HEIGHT}
                fontSize={7}
              />
            </View>
          ))}
          <ReportFooter schoolName={header.schoolName} label={title} generatedAt={generatedAt} inset={PAGE.portrait.marginX} />
        </Page>
      ))}
    </Document>
  );
}
