import { formatClassLabel } from '../curriculum';
import { LGS_SUBJECTS, estimateLgsScore } from '../lgsExam';

function round(value, digits) {
  if (value == null) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

/**
 * Per-student average over several exams (puan, subject nets) with the puan of each exam
 * next to it, plus the exam-by-exam school average for the trend chart.
 */
export function buildMultiExamAverageReport({
  sessions: selectedSessions,
  subjectResults,
  students,
  classes,
  rankings,
  schoolName,
  scopeLabel,
}) {
  // Oldest first so "1, 2, 3…" reads as a timeline.
  const sessions = [...(selectedSessions ?? [])].sort((a, b) =>
    (a.held_on ?? '').localeCompare(b.held_on ?? '')
  );
  const sessionIds = sessions.map((session) => session.id);
  const sessionIdSet = new Set(sessionIds);
  const classMap = new Map((classes ?? []).map((klass) => [klass.id, klass]));
  const filteredSubjects = (subjectResults ?? []).filter((row) => sessionIdSet.has(row.session_id));
  const filteredRankings = (rankings ?? []).filter((row) => sessionIdSet.has(row.session_id));

  const byStudent = new Map();
  for (const student of students ?? []) {
    byStudent.set(student.id, {
      student,
      subjects: Object.fromEntries(
        LGS_SUBJECTS.map((def) => [def.code, { nets: [], correct: [], wrong: [], blank: [] }])
      ),
      scoresBySession: new Map(),
      netsBySession: new Map(),
    });
  }

  for (const row of filteredSubjects) {
    const sub = byStudent.get(row.student_id)?.subjects[row.subject_code];
    if (!sub) continue;
    sub.nets.push(Number(row.net) || 0);
    sub.correct.push(Number(row.correct_count) || 0);
    sub.wrong.push(Number(row.wrong_count) || 0);
    sub.blank.push(Number(row.blank_count) || 0);
  }

  for (const ranking of filteredRankings) {
    const bucket = byStudent.get(ranking.student_id);
    if (!bucket) continue;
    // Each exam's puan is stored with that exam's own coefficients, so it can be averaged directly.
    const score = ranking.lgs_score != null ? Number(ranking.lgs_score) : estimateLgsScore(ranking.total_net);
    bucket.scoresBySession.set(ranking.session_id, score);
    bucket.netsBySession.set(ranking.session_id, Number(ranking.total_net) || 0);
  }

  const rows = [...byStudent.values()]
    .filter((bucket) => bucket.scoresBySession.size > 0)
    .map(({ student, subjects, scoresBySession, netsBySession }) => {
      const subjectAverages = LGS_SUBJECTS.map((def) => {
        const sub = subjects[def.code];
        return {
          code: def.code,
          correct: round(mean(sub.correct), 1),
          wrong: round(mean(sub.wrong), 1),
          blank: round(mean(sub.blank), 1),
          net: round(mean(sub.nets), 2),
        };
      });
      const sumOf = (field) => round(subjectAverages.reduce((sum, subject) => sum + (subject[field] ?? 0), 0), 1);
      const klass = student.class_id ? classMap.get(student.class_id) : null;
      return {
        student,
        studentName: student.full_name,
        classLabel: klass ? formatClassLabel(klass.grade, klass.name) : '—',
        examCount: scoresBySession.size,
        subjects: subjectAverages,
        totalCorrect: sumOf('correct'),
        totalWrong: sumOf('wrong'),
        totalBlank: sumOf('blank'),
        totalNet: round(mean([...netsBySession.values()]), 2),
        lgsScore: round(mean([...scoresBySession.values()]), 2),
        examScores: sessionIds.map((id) => (scoresBySession.has(id) ? scoresBySession.get(id) : null)),
      };
    })
    .sort((a, b) => (b.lgsScore ?? 0) - (a.lgsScore ?? 0) || (b.totalNet ?? 0) - (a.totalNet ?? 0))
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const schoolSubjects = LGS_SUBJECTS.map((def) => {
    const entries = rows.map((row) => row.subjects.find((subject) => subject.code === def.code)).filter((entry) => entry?.net != null);
    const avg = (field) => round(mean(entries.map((entry) => entry[field] ?? 0)), field === 'net' ? 2 : 1);
    return {
      code: def.code,
      correct: entries.length ? avg('correct') : null,
      wrong: entries.length ? avg('wrong') : null,
      blank: entries.length ? avg('blank') : null,
      net: entries.length ? avg('net') : null,
    };
  });
  const schoolSum = (field) => (rows.length ? round(rows.reduce((sum, row) => sum + (row[field] ?? 0), 0) / rows.length, 1) : null);

  const sessionRefs = sessions.map((session, index) => {
    const scores = filteredRankings
      .filter((row) => row.session_id === session.id && byStudent.has(row.student_id))
      .map((row) => (row.lgs_score != null ? Number(row.lgs_score) : estimateLgsScore(row.total_net)))
      .filter((value) => value != null);
    const nets = filteredRankings
      .filter((row) => row.session_id === session.id && byStudent.has(row.student_id))
      .map((row) => Number(row.total_net) || 0);
    return {
      order: index + 1,
      title: session.title,
      heldOn: session.held_on,
      avgScore: round(mean(scores), 2),
      avgNet: round(mean(nets), 2),
    };
  });

  return {
    type: 'multi_exam_average',
    schoolName,
    scopeLabel,
    sessions: sessionRefs,
    schoolAverages: {
      subjects: schoolSubjects,
      totalCorrect: schoolSum('totalCorrect'),
      totalWrong: schoolSum('totalWrong'),
      totalBlank: schoolSum('totalBlank'),
      totalNet: rows.length ? round(mean(rows.map((row) => row.totalNet ?? 0)), 2) : null,
      lgsScore: rows.length ? round(mean(rows.map((row) => row.lgsScore ?? 0)), 2) : null,
    },
    rows,
  };
}
