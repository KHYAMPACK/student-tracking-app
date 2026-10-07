import { LGS_SUBJECTS } from '../../lgsExam';
import { formatReportDate } from './formatReport';

/** ISO dates from the database become dd.mm.yyyy; anything already formatted is left alone. */
function fmtDate(value) {
  if (!value) return '';
  return /^\d{4}-\d{2}-\d{2}/.test(String(value)) ? formatReportDate(String(value).slice(0, 10)) : String(value);
}

/** @param {import('../reportSchemas').ExamPdfModel | any} report */
export function toExamPdfModel(report) {
  switch (report.type) {
    case 'exam_results':
      return toExamResultsPdfModel(report);
    case 'class_combined':
      return toClassCombinedPdfModel(report);
    case 'question_frequency':
      return toQuestionFrequencyPdfModel(report);
    case 'student_all_exams':
      return toStudentAllExamsPdfModel(report);
    case 'class_average':
      return toClassAveragePdfModel(report);
    case 'multi_exam_average':
      return toMultiExamAveragePdfModel(report);
    default:
      throw new Error(`Unknown report type: ${report.type}`);
  }
}

function mapSubjectRows(subjects) {
  return (subjects ?? []).map((subject) => ({
    code: subject.code ?? subject.subject_code,
    correct: subject.correct ?? subject.correct_count ?? null,
    wrong: subject.wrong ?? subject.wrong_count ?? null,
    blank: subject.blank ?? subject.blank_count ?? null,
    net: subject.net ?? null,
  }));
}

function mapTotals(source) {
  return {
    totalCorrect: source?.totalCorrect ?? source?.total_correct ?? null,
    totalWrong: source?.totalWrong ?? source?.total_wrong ?? null,
    totalBlank: source?.totalBlank ?? source?.total_blank ?? null,
    totalNet: source?.totalNet ?? source?.total_net ?? null,
    lgsScore: source?.lgsScore ?? source?.lgs_score ?? null,
  };
}

function mapAverages(averages) {
  return {
    subjects: mapSubjectRows(averages?.subjects),
    ...mapTotals(averages),
    participantCount: averages?.participantCount ?? null,
  };
}

/** @param {any} report */
export function toExamResultsPdfModel(report) {
  return {
    type: 'exam_results',
    header: {
      schoolName: report.schoolName ?? 'Okul',
      sessionTitle: report.sessionTitle ?? '',
      sessionDate: fmtDate(report.sessionDate),
      scopeLabel: report.scopeLabel,
      reportDate: formatReportDate(new Date()),
    },
    participantCount: report.participantCount ?? report.rows?.length ?? 0,
    topScore: report.topScore ?? null,
    averages: mapAverages(report.averages),
    rows: (report.rows ?? []).map((row) => ({
      rank: row.rank,
      studentName: row.studentName,
      classLabel: row.classLabel ?? '—',
      grade: row.grade ?? null,
      subjects: mapSubjectRows(row.subjects),
      ...mapTotals(row),
      ranks: { school: row.ranks?.school, class: row.ranks?.class, grade: row.ranks?.grade },
    })),
  };
}

/** @param {any} report */
export function toClassCombinedPdfModel(report) {
  return {
    type: 'class_combined',
    header: {
      schoolName: report.schoolName ?? 'Okul',
      scopeLabel: report.classLabel ?? report.scopeLabel,
      examType: 'LGS',
      reportDate: formatReportDate(new Date()),
    },
    topicCoverage: report.topicCoverage ?? null,
    exams: (report.examSummaries ?? []).map((row) => ({
      order: row.order,
      title: row.title,
      heldOn: fmtDate(row.heldOn),
      participants: row.participants,
      avgNet: row.avgNet,
      avgScore: row.avgScore ?? null,
    })),
    topics: (report.topicRows ?? []).map((row) => ({
      label: row.topicLabel ?? row.label,
      subjectCode: row.subject_code ?? row.subjectCode,
      ss: row.attempts ?? row.ss ?? 0,
      correct: row.correct ?? 0,
      wrong: row.wrong ?? 0,
      blank: row.blank ?? 0,
      successRate: row.successRate ?? 0,
    })),
  };
}

/** @param {any} report */
export function toQuestionFrequencyPdfModel(report) {
  const bySubject = new Map();
  for (const row of report.rows ?? []) {
    const code = row.subject_code ?? 'other';
    if (!bySubject.has(code)) {
      bySubject.set(code, {
        subjectCode: code,
        subjectLabel: LGS_SUBJECTS.find((subject) => subject.code === code)?.label ?? code,
        rows: [],
      });
    }
    bySubject.get(code).rows.push({
      questionIndex: row.question_index ?? row.localIndex,
      bookletA: row.booklet_a_no ?? row.bookletA,
      bookletB: row.booklet_b_no ?? row.bookletB,
      correctChoice: row.correct_choice ?? row.correctChoice,
      topic: row.topic_label ?? row.topic ?? '—',
      successPct: row.successRate ?? row.successPct ?? 0,
      blankPct: row.blankRate ?? row.blankPct ?? 0,
      choices: {
        A: row.distribution?.A?.pct ?? row.choices?.A,
        B: row.distribution?.B?.pct ?? row.choices?.B,
        C: row.distribution?.C?.pct ?? row.choices?.C,
        D: row.distribution?.D?.pct ?? row.choices?.D,
      },
    });
  }

  return {
    type: 'question_frequency',
    header: {
      schoolName: report.schoolName ?? 'Okul',
      sessionTitle: report.sessionTitle ?? 'Soru frekans analizi',
      scopeLabel: report.classLabel ?? report.scopeLabel,
      reportDate: formatReportDate(new Date()),
    },
    sections: [...bySubject.values()],
  };
}

/** @param {any} report */
export function toStudentAllExamsPdfModel(report) {
  return {
    type: 'student_all_exams',
    header: {
      schoolName: report.schoolName ?? 'Okul',
      studentName: report.studentName,
      studentNumber: report.studentNumber,
      classLabel: report.classLabel,
      reportDate: formatReportDate(report.reportDate ?? new Date()),
      examCount: report.examCount ?? report.exams?.length ?? 0,
    },
    exams: (report.exams ?? []).map((exam) => ({
      order: exam.order,
      title: exam.title,
      heldOn: fmtDate(exam.heldOn),
      subjects: mapSubjectRows(exam.subjects),
      ...mapTotals(exam),
      ranks: {
        school: exam.schoolRank ?? exam.ranks?.school,
        class: exam.classRank ?? exam.ranks?.class,
        grade: exam.gradeRank ?? exam.ranks?.grade,
      },
    })),
    averages: mapAverages(report.averages),
  };
}

/** @param {any} report */
export function toClassAveragePdfModel(report) {
  return {
    type: 'class_average',
    header: {
      schoolName: report.schoolName ?? 'Okul',
      sessionTitle: report.sessionTitle,
      sessionDate: fmtDate(report.sessionDate),
      scopeLabel: report.scopeLabel,
      reportDate: formatReportDate(new Date()),
    },
    schoolAverages: mapAverages(report.schoolAverages),
    classRows: (report.classRows ?? []).map((row) => ({
      rank: row.rank,
      classLabel: row.classLabel,
      participantCount: row.participantCount ?? row.studentCount,
      studentCount: row.studentCount,
      subjects: mapSubjectRows(row.subjects),
      ...mapTotals(row),
    })),
  };
}

/** @param {any} report */
export function toMultiExamAveragePdfModel(report) {
  return {
    type: 'multi_exam_average',
    header: {
      schoolName: report.schoolName ?? 'Okul',
      scopeLabel: report.scopeLabel,
      reportDate: formatReportDate(new Date()),
    },
    sessions: (report.sessions ?? []).map((session) => ({
      order: session.order,
      title: session.title,
      heldOn: fmtDate(session.heldOn),
      avgScore: session.avgScore ?? null,
      avgNet: session.avgNet ?? null,
    })),
    schoolAverages: mapAverages(report.schoolAverages),
    rows: (report.rows ?? []).map((row) => ({
      rank: row.rank,
      classLabel: row.classLabel ?? '—',
      studentName: row.student?.full_name ?? row.studentName ?? '—',
      examCount: row.examCount ?? null,
      subjects: mapSubjectRows(row.subjects),
      ...mapTotals(row),
      examScores: row.examScores ?? [],
    })),
  };
}
