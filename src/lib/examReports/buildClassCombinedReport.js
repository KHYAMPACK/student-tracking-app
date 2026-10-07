import { buildTopicAnalysis } from '../examAnalysis';
import { estimateLgsScore } from '../lgsExam';

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Several exams in one karne. Topic success is gathered from every exam's own answer key
 * (exams usually have different keys), then merged by subject + topic.
 *
 * @param {{
 *   sessions: any[],
 *   subjectResults: any[],
 *   rankings?: any[],
 *   topicSources: { questions: any[], answers: any[] }[],
 *   studentIds?: string[],
 *   scopeLabel?: string,
 *   schoolName?: string,
 * }} input
 */
export function buildClassCombinedReport({
  sessions: selectedSessions,
  subjectResults,
  rankings,
  topicSources,
  studentIds,
  scopeLabel,
  schoolName,
}) {
  const sessions = [...(selectedSessions ?? [])].sort((a, b) => (a.held_on ?? '').localeCompare(b.held_on ?? ''));
  const inScope = studentIds ? new Set(studentIds) : null;
  const visible = (row) => !inScope || inScope.has(row.student_id);
  const scopedSubjects = (subjectResults ?? []).filter(visible);
  const scopedRankings = (rankings ?? []).filter(visible);

  const examSummaries = sessions.map((session, index) => {
    const rows = scopedSubjects.filter((row) => row.session_id === session.id);
    const participants = new Set(rows.map((row) => row.student_id)).size;
    const avgNet = participants ? rows.reduce((sum, row) => sum + (Number(row.net) || 0), 0) / participants : 0;
    const scores = scopedRankings
      .filter((row) => row.session_id === session.id)
      .map((row) => (row.lgs_score != null ? Number(row.lgs_score) : estimateLgsScore(row.total_net)))
      .filter((value) => value != null);
    return {
      order: index + 1,
      title: session.title,
      heldOn: session.held_on,
      participants,
      avgNet: round(avgNet, 2),
      avgScore: scores.length ? round(scores.reduce((sum, value) => sum + value, 0) / scores.length, 2) : null,
    };
  });

  const merged = new Map();
  for (const source of topicSources ?? []) {
    const answers = (source.answers ?? []).filter(visible);
    for (const bucket of buildTopicAnalysis({ questions: source.questions, answers })) {
      const key = `${bucket.subject_code}::${bucket.topicLabel}`;
      const current = merged.get(key) ?? {
        subject_code: bucket.subject_code,
        topicLabel: bucket.topicLabel,
        attempts: 0,
        correct: 0,
        wrong: 0,
        blank: 0,
      };
      current.attempts += bucket.attempts;
      current.correct += bucket.correct;
      current.wrong += bucket.wrong;
      current.blank += bucket.blank;
      merged.set(key, current);
    }
  }

  const topicRows = [...merged.values()]
    .filter((row) => row.attempts > 0)
    .map((row) => ({
      ...row,
      successRate: round((row.correct / row.attempts) * 100, 1),
    }))
    .sort((a, b) => a.successRate - b.successRate);

  return {
    type: 'class_combined',
    schoolName,
    classLabel: scopeLabel,
    topicCoverage: {
      withAnswers: (topicSources ?? []).filter((source) => (source.answers ?? []).some(visible)).length,
      total: sessions.length,
    },
    examSummaries,
    topicRows,
  };
}
