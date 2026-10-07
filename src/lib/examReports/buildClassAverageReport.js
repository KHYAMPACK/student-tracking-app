import {
  LGS_SUBJECTS,
  aggregateClassSubjectAverages,
  computeLgsScore,
  summarizeStudentSubjects,
} from '../lgsExam';

export function buildClassAverageReport({
  session,
  subjectResults,
  students,
  classes,
  rankings,
  schoolName,
}) {
  const coefficients = session?.score_coefficients;
  const classAvgs = aggregateClassSubjectAverages(subjectResults, students, coefficients);
  const classMap = new Map((classes ?? []).map((c) => [c.id, c]));

  const schoolSummary = summarizeStudentSubjects(subjectResults, coefficients);
  const participantCount = new Set(subjectResults.map((r) => r.student_id)).size;

  const classRows = classAvgs
    .map((row, index) => {
      const klass = classMap.get(row.classId);
      const classRankings = (rankings ?? []).filter((r) => {
        const student = students.find((s) => s.id === r.student_id);
        return (student?.class_id ?? 'none') === row.classId;
      });
      const avgSchoolRank =
        classRankings.length
          ? Math.round(classRankings.reduce((s, r) => s + (r.school_rank ?? 0), 0) / classRankings.length)
          : null;
      return {
        rank: index + 1,
        classLabel: klass ? `${klass.grade}-${klass.name}` : 'Atanmamış',
        studentCount: row.studentCount,
        subjects: row.subjects,
        totalNet: row.totalNet,
        lgsScore: row.lgsScore,
        avgSchoolRank,
      };
    })
    .sort((a, b) => (b.lgsScore ?? 0) - (a.lgsScore ?? 0) || b.totalNet - a.totalNet)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const schoolSubjectAverages = LGS_SUBJECTS.map((def) => {
    const nets = subjectResults
      .filter((r) => r.subject_code === def.code)
      .map((r) => Number(r.net) || 0);
    const avg = nets.length ? nets.reduce((a, b) => a + b, 0) / nets.length : null;
    return { ...def, net: avg != null ? Math.round(avg * 100) / 100 : null };
  });

  return {
    type: 'class_average',
    schoolName,
    sessionTitle: session?.title,
    sessionDate: session?.held_on,
    participantCount,
    schoolAverages: {
      subjects: schoolSubjectAverages,
      totalNet: schoolSummary.totalNet
        ? Math.round((subjectResults.reduce((s, r) => s + (Number(r.net) || 0), 0) / Math.max(participantCount, 1)) * 100) / 100
        : null,
      lgsScore: computeLgsScore(schoolSubjectAverages, coefficients),
    },
    classRows,
  };
}
