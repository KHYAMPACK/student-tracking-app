import { formatClassLabel } from '../curriculum';
import { LGS_SUBJECTS, aggregateClassSubjectAverages, computeLgsScore } from '../lgsExam';

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** One row per şube (average of its participants) plus the school-wide averages. */
export function buildClassAverageReport({
  session,
  subjectResults: allSubjectResults,
  students,
  classes,
  rankings: allRankings,
  schoolName,
  scopeLabel,
}) {
  const coefficients = session?.score_coefficients;
  const classMap = new Map((classes ?? []).map((klass) => [klass.id, klass]));
  // A scoped viewer (e.g. a homeroom teacher) only sees their own students.
  const inScope = new Set((students ?? []).map((student) => student.id));
  const subjectResults = (allSubjectResults ?? []).filter((row) => inScope.has(row.student_id));
  const rankings = (allRankings ?? []).filter((row) => inScope.has(row.student_id));
  const classAvgs = aggregateClassSubjectAverages(subjectResults, students, coefficients);

  const classRows = classAvgs
    .filter((row) => row.participantCount > 0)
    .map((row) => {
      const klass = classMap.get(row.classId);
      return {
        classLabel: klass ? formatClassLabel(klass.grade, klass.name) : 'Atanmamış',
        studentCount: row.studentCount,
        participantCount: row.participantCount,
        subjects: row.subjects.map((subject) => ({
          code: subject.code,
          net: subject.net,
          correct: subject.correct,
          wrong: subject.wrong,
          blank: subject.blank,
        })),
        totalCorrect: row.totalCorrect,
        totalWrong: row.totalWrong,
        totalBlank: row.totalBlank,
        totalNet: row.totalNet,
        lgsScore: row.lgsScore,
      };
    })
    .sort((a, b) => (b.lgsScore ?? 0) - (a.lgsScore ?? 0) || b.totalNet - a.totalNet)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const participantCount = new Set(subjectResults.map((row) => row.student_id)).size;

  const subjects = LGS_SUBJECTS.map((def) => {
    const rows = subjectResults.filter((row) => row.subject_code === def.code);
    const mean = (field) => (rows.length ? rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0) / rows.length : null);
    return {
      code: def.code,
      net: rows.length ? round(mean('net'), 2) : null,
      correct: rows.length ? round(mean('correct_count'), 1) : null,
      wrong: rows.length ? round(mean('wrong_count'), 1) : null,
      blank: rows.length ? round(mean('blank_count'), 1) : null,
    };
  });
  const sumOf = (field) => {
    const values = subjects.map((subject) => subject[field]);
    return values.every((value) => value == null)
      ? null
      : round(values.reduce((sum, value) => sum + (value ?? 0), 0), 1);
  };

  // Puan is linear in the subject nets, so the puan of the average nets is the average puan.
  const scores = rankings.map((row) => Number(row.lgs_score)).filter((value) => Number.isFinite(value));
  const lgsScore = scores.length
    ? round(scores.reduce((sum, value) => sum + value, 0) / scores.length, 2)
    : computeLgsScore(subjects.map((subject) => ({ subject_code: subject.code, net: subject.net })), coefficients);

  return {
    type: 'class_average',
    schoolName,
    sessionTitle: session?.title,
    sessionDate: session?.held_on,
    scopeLabel,
    schoolAverages: {
      subjects,
      participantCount,
      totalCorrect: sumOf('correct'),
      totalWrong: sumOf('wrong'),
      totalBlank: sumOf('blank'),
      totalNet: participantCount
        ? round(subjects.reduce((sum, subject) => sum + (subject.net ?? 0), 0), 2)
        : null,
      lgsScore,
    },
    classRows,
  };
}
