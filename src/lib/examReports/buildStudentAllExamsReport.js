import { LGS_SUBJECTS, estimateLgsScore, summarizeStudentSubjects } from '../lgsExam';

export function buildStudentAllExamsReport({
  student,
  klass,
  subjectResults,
  rankings,
  schoolName,
  reportDate = new Date().toISOString().slice(0, 10),
}) {
  const bySession = new Map();
  for (const row of subjectResults ?? []) {
    const session = row.exam_sessions;
    if (!session) continue;
    if (!bySession.has(session.id)) {
      bySession.set(session.id, { session, subjects: [], ranking: null });
    }
    bySession.get(session.id).subjects.push(row);
  }

  for (const ranking of rankings ?? []) {
    const bucket = bySession.get(ranking.session_id);
    if (bucket) bucket.ranking = ranking;
  }

  const exams = [...bySession.values()]
    .sort((a, b) => (a.session.held_on ?? '').localeCompare(b.session.held_on ?? ''))
    .map(({ session, subjects, ranking }, index) => {
      const summary = summarizeStudentSubjects(subjects, session.score_coefficients);
      return {
        order: index + 1,
        title: session.title,
        heldOn: session.held_on,
        subjects: LGS_SUBJECTS.map((def) => {
          const row = subjects.find((s) => s.subject_code === def.code);
          return {
            ...def,
            ss: def.questions,
            correct: row?.correct_count ?? null,
            wrong: row?.wrong_count ?? null,
            blank: row?.blank_count ?? null,
            net: row?.net ?? null,
          };
        }),
        ...summary,
        schoolRank: ranking?.school_rank ?? null,
        gradeRank: ranking?.grade_rank ?? null,
        classRank: ranking?.class_rank ?? null,
        lgsScore: ranking?.lgs_score ?? summary.lgsScore,
      };
    });

  const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
  const round = (value, digits) => (value == null ? null : Math.round(value * 10 ** digits) / 10 ** digits);
  const averages = {
    subjects: LGS_SUBJECTS.map((def) => {
      const entries = exams
        .map((exam) => exam.subjects.find((subject) => subject.code === def.code))
        .filter((entry) => entry?.net != null);
      const avg = (field) => round(mean(entries.map((entry) => Number(entry[field]) || 0)), field === 'net' ? 2 : 1);
      return {
        ...def,
        net: entries.length ? avg('net') : null,
        correct: entries.length ? avg('correct') : null,
        wrong: entries.length ? avg('wrong') : null,
        blank: entries.length ? avg('blank') : null,
      };
    }),
    totalCorrect: round(mean(exams.map((exam) => exam.totalCorrect ?? 0)), 1),
    totalWrong: round(mean(exams.map((exam) => exam.totalWrong ?? 0)), 1),
    totalBlank: round(mean(exams.map((exam) => exam.totalBlank ?? 0)), 1),
    totalNet: exams.length ? round(mean(exams.map((exam) => exam.totalNet ?? 0)), 2) : null,
    lgsScore: null,
  };
  // Her denemenin puanı kendi katsayılarıyla hesaplanmıştır; ortalama puan bunların ortalamasıdır.
  const examScores = exams.map((e) => Number(e.lgsScore)).filter((score) => Number.isFinite(score));
  averages.lgsScore = examScores.length
    ? Math.round((examScores.reduce((a, b) => a + b, 0) / examScores.length) * 100) / 100
    : estimateLgsScore(averages.totalNet);

  return {
    type: 'student_all_exams',
    schoolName,
    studentName: student?.full_name,
    studentNumber: student?.student_number,
    classLabel: klass ? `${klass.grade}-${klass.name}` : null,
    reportDate,
    examCount: exams.length,
    exams,
    averages,
  };
}
