/** @typedef {'exam_results' | 'class_combined' | 'question_frequency' | 'student_all_exams' | 'class_average' | 'multi_exam_average'} ExamReportType */

/**
 * One subject's figures for a student (or an average over students/exams).
 * @typedef {Object} SubjectStat
 * @property {string} code            turkce | inkilap | din | ingilizce | matematik | fen
 * @property {number|null} [correct]
 * @property {number|null} [wrong]
 * @property {number|null} [blank]
 * @property {number|null} [net]
 */

/**
 * Puan and totals shared by every list row.
 * @typedef {Object} ScoreTotals
 * @property {number|null} totalCorrect
 * @property {number|null} totalWrong
 * @property {number|null} totalBlank
 * @property {number|null} totalNet
 * @property {number|null} lgsScore   Official puan (exam coefficients), 2+ decimals.
 */

/**
 * @typedef {Object} RankStats
 * @property {number|null} [school]
 * @property {number|null} [class]
 * @property {number|null} [grade]
 */

/**
 * @typedef {Object} PdfHeader
 * @property {string} schoolName
 * @property {string} [scopeLabel]     "Tüm kurum" or a şube like "8-B".
 * @property {string} [sessionTitle]
 * @property {string} [sessionDate]
 * @property {string} [reportDate]
 * @property {string} [studentName]
 * @property {string} [studentNumber]
 * @property {string} [classLabel]
 * @property {number} [examCount]
 */

/**
 * @typedef {ScoreTotals & { subjects: SubjectStat[], participantCount?: number|null }} Averages
 */

/**
 * @typedef {ScoreTotals & {
 *   rank: number, studentName: string, classLabel: string, grade: number|null,
 *   subjects: SubjectStat[], ranks: RankStats,
 * }} ExamResultRow
 */

/**
 * @typedef {Object} ExamResultsPdfModel
 * @property {'exam_results'} type
 * @property {PdfHeader} header
 * @property {number} participantCount
 * @property {{ name: string, score: number }|null} topScore
 * @property {Averages} averages
 * @property {ExamResultRow[]} rows
 */

/**
 * @typedef {ScoreTotals & {
 *   rank: number, classLabel: string, participantCount: number, studentCount: number, subjects: SubjectStat[],
 * }} ClassAverageRow
 */

/**
 * @typedef {Object} ClassAveragePdfModel
 * @property {'class_average'} type
 * @property {PdfHeader} header
 * @property {Averages} schoolAverages
 * @property {ClassAverageRow[]} classRows
 */

/**
 * @typedef {Object} SessionRef
 * @property {number} order
 * @property {string} title
 * @property {string} heldOn
 * @property {number|null} [avgScore]
 * @property {number|null} [avgNet]
 */

/**
 * @typedef {ScoreTotals & {
 *   rank: number, classLabel: string, studentName: string, examCount: number|null,
 *   subjects: SubjectStat[], examScores: (number|null)[],
 * }} MultiExamStudentRow
 */

/**
 * @typedef {Object} MultiExamAveragePdfModel
 * @property {'multi_exam_average'} type
 * @property {PdfHeader} header
 * @property {SessionRef[]} sessions
 * @property {Averages} schoolAverages
 * @property {MultiExamStudentRow[]} rows
 */

/**
 * @typedef {ScoreTotals & {
 *   order: number, title: string, heldOn: string, subjects: SubjectStat[], ranks: RankStats,
 * }} StudentExamRow
 */

/**
 * @typedef {Object} StudentAllExamsPdfModel
 * @property {'student_all_exams'} type
 * @property {PdfHeader} header
 * @property {StudentExamRow[]} exams
 * @property {Averages} averages
 */

/**
 * @typedef {Object} TopicRow
 * @property {string} label
 * @property {string} subjectCode
 * @property {number} ss
 * @property {number} correct
 * @property {number} wrong
 * @property {number} blank
 * @property {number} successRate
 */

/**
 * @typedef {Object} ClassCombinedPdfModel
 * @property {'class_combined'} type
 * @property {PdfHeader} header
 * @property {{ withAnswers: number, total: number }|null} topicCoverage
 * @property {{ order: number, title: string, heldOn: string, participants: number, avgNet: number, avgScore: number|null }[]} exams
 * @property {TopicRow[]} topics
 */

/**
 * @typedef {Object} QuestionFrequencyRow
 * @property {number} questionIndex
 * @property {number|null} bookletA
 * @property {number|null} bookletB
 * @property {string|null} correctChoice
 * @property {string} topic
 * @property {number} successPct
 * @property {number} blankPct
 * @property {{ A?: number, B?: number, C?: number, D?: number }} choices
 */

/**
 * @typedef {Object} QuestionFrequencyPdfModel
 * @property {'question_frequency'} type
 * @property {PdfHeader} header
 * @property {{ subjectLabel: string, subjectCode: string, rows: QuestionFrequencyRow[] }[]} sections
 */

/** @typedef {ExamResultsPdfModel | ClassCombinedPdfModel | QuestionFrequencyPdfModel | StudentAllExamsPdfModel | ClassAveragePdfModel | MultiExamAveragePdfModel} ExamPdfModel */

export const REPORT_TYPE_LABELS = {
  exam_results: 'Deneme Sonuç Listesi',
  class_combined: 'Birleştirilmiş Karne',
  question_frequency: 'Soru Frekans Analizi',
  student_all_exams: 'Öğrenci Gelişim Raporu',
  class_average: 'Şube Ortalama Listesi',
  multi_exam_average: 'Çoklu Deneme Ortalaması',
};
