import { LGS_SUBJECTS } from '../lgsExam';
import { formatClassLabel } from '../curriculum';

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

/** "Tüm kurum" unless the visible students all belong to one şube. */
export function resolveScopeLabel(students, classes) {
  const classIds = new Set((students ?? []).map((student) => student.class_id).filter(Boolean));
  if (classIds.size === 1) {
    const klass = (classes ?? []).find((item) => item.id === [...classIds][0]);
    if (klass) return formatClassLabel(klass.grade, klass.name);
  }
  return 'Tüm kurum';
}

/**
 * Per-student result list for one exam, ordered by puan (net breaks ties) — the same
 * layout the publisher sends, but with our own ranks.
 */
export function buildExamResultsReport({
  session,
  subjectResults,
  rankings,
  students,
  classes,
  schoolName,
  scopeLabel,
}) {
  const studentMap = new Map((students ?? []).map((student) => [student.id, student]));
  const classMap = new Map((classes ?? []).map((klass) => [klass.id, klass]));

  const subjectsByStudent = new Map();
  for (const row of subjectResults ?? []) {
    if (!subjectsByStudent.has(row.student_id)) subjectsByStudent.set(row.student_id, []);
    subjectsByStudent.get(row.student_id).push(row);
  }

  const ordered = (rankings ?? [])
    .filter((ranking) => studentMap.has(ranking.student_id))
    .sort(
      (a, b) =>
        (Number(b.lgs_score) || 0) - (Number(a.lgs_score) || 0) ||
        (Number(b.total_net) || 0) - (Number(a.total_net) || 0) ||
        (a.school_rank ?? 0) - (b.school_rank ?? 0)
    );

  const rows = ordered.map((ranking, index) => {
    const student = studentMap.get(ranking.student_id);
    const klass = student.class_id ? classMap.get(student.class_id) : null;
    const subjectRows = subjectsByStudent.get(ranking.student_id) ?? [];
    return {
      rank: index + 1,
      studentName: student.full_name,
      studentNumber: student.student_number ?? '',
      classLabel: klass ? formatClassLabel(klass.grade, klass.name) : '—',
      grade: klass?.grade ?? student.grade ?? null,
      subjects: LGS_SUBJECTS.map((def) => {
        const row = subjectRows.find((item) => item.subject_code === def.code);
        return {
          code: def.code,
          correct: row?.correct_count ?? null,
          wrong: row?.wrong_count ?? null,
          blank: row?.blank_count ?? null,
          net: row?.net != null ? Number(row.net) : null,
        };
      }),
      totalCorrect: ranking.total_correct,
      totalWrong: ranking.total_wrong,
      totalBlank: ranking.total_blank,
      totalNet: Number(ranking.total_net),
      lgsScore: ranking.lgs_score != null ? Number(ranking.lgs_score) : null,
      ranks: {
        school: ranking.school_rank,
        class: ranking.class_rank,
        grade: ranking.grade_rank,
      },
    };
  });

  const subjectAverages = LGS_SUBJECTS.map((def) => {
    const entries = rows.map((row) => row.subjects.find((item) => item.code === def.code)).filter((item) => item?.net != null);
    const avg = (field) => average(entries.map((item) => Number(item[field]) || 0));
    return {
      code: def.code,
      correct: entries.length ? round(avg('correct'), 1) : null,
      wrong: entries.length ? round(avg('wrong'), 1) : null,
      blank: entries.length ? round(avg('blank'), 1) : null,
      net: entries.length ? round(avg('net'), 2) : null,
    };
  });

  const scores = rows.map((row) => row.lgsScore).filter((value) => value != null);
  const best = rows.find((row) => row.lgsScore != null) ?? null;
  const avgOf = (field) => {
    const value = average(rows.map((row) => Number(row[field]) || 0));
    return value == null ? null : value;
  };

  return {
    type: 'exam_results',
    schoolName,
    sessionTitle: session?.title,
    sessionDate: session?.held_on,
    scopeLabel,
    participantCount: rows.length,
    topScore: best ? { name: best.studentName, score: best.lgsScore } : null,
    averages: {
      subjects: subjectAverages,
      totalCorrect: rows.length ? round(avgOf('totalCorrect'), 1) : null,
      totalWrong: rows.length ? round(avgOf('totalWrong'), 1) : null,
      totalBlank: rows.length ? round(avgOf('totalBlank'), 1) : null,
      totalNet: rows.length ? round(avgOf('totalNet'), 2) : null,
      lgsScore: scores.length ? round(average(scores), 2) : null,
    },
    rows,
  };
}
