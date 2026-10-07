import { LGS_SUBJECTS, computeLgsScore, computeNet } from '../lgsExam';

const SCHOOL = 'Örnek Eğitim Kurumu';

const NAMES = [
  'Kerem Özkan',
  'Poyraz Tütüncü',
  'Yağız Kaba',
  'Zeynep Sude Çetin',
  'Ömer Selim Burcan',
  'Ecrin Sude Er',
  'Berra Bak',
  'Alper Kaplan',
  'Elif Naz Yılmaz',
  'Mert Can Demir',
  'Defne Aksoy',
  'Emir Kaan Çelik',
  'Asya Şahin',
  'Yusuf Efe Koç',
  'Ayşe Nur Polat',
  'Bartu Arslan',
  'Melisa Güneş',
  'Kuzey Aydın',
  'Ilgın Doğan',
  'Çağan Erdem',
  'Nehir Öztürk',
  'Toprak Yıldız',
  'Sena Kurt',
  'Arda Karaca',
  'Beren Acar',
  'Doruk Tan',
];

const CLASS_LABELS = ['8-A', '8-B', '8-C'];

function wobble(seed, index) {
  return (((seed * 7 + index * 13) % 11) - 5) / 50;
}

/** Subject figures where D + Y + B always equals the question count. */
function makeSubjects(level, seed) {
  return LGS_SUBJECTS.map((def, index) => {
    const ratio = Math.max(0.05, Math.min(0.98, level + wobble(seed, index)));
    const correct = Math.round(def.questions * ratio);
    const wrong = Math.round((def.questions - correct) * 0.6);
    const blank = def.questions - correct - wrong;
    return { code: def.code, correct, wrong, blank, net: computeNet(correct, wrong) };
  });
}

function totalsOf(subjects) {
  const totalCorrect = subjects.reduce((sum, subject) => sum + subject.correct, 0);
  const totalWrong = subjects.reduce((sum, subject) => sum + subject.wrong, 0);
  const totalBlank = subjects.reduce((sum, subject) => sum + subject.blank, 0);
  const totalNet = Math.round(subjects.reduce((sum, subject) => sum + subject.net, 0) * 100) / 100;
  return {
    totalCorrect,
    totalWrong,
    totalBlank,
    totalNet,
    lgsScore: computeLgsScore(subjects.map((subject) => ({ subject_code: subject.code, net: subject.net }))),
  };
}

function averageOf(rows) {
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
  const r = (value, digits) => Math.round(value * 10 ** digits) / 10 ** digits;
  return {
    subjects: LGS_SUBJECTS.map((def) => {
      const entries = rows.map((row) => row.subjects.find((subject) => subject.code === def.code));
      return {
        code: def.code,
        correct: r(mean(entries.map((entry) => entry.correct)), 1),
        wrong: r(mean(entries.map((entry) => entry.wrong)), 1),
        blank: r(mean(entries.map((entry) => entry.blank)), 1),
        net: r(mean(entries.map((entry) => entry.net)), 2),
      };
    }),
    totalCorrect: r(mean(rows.map((row) => row.totalCorrect)), 1),
    totalWrong: r(mean(rows.map((row) => row.totalWrong)), 1),
    totalBlank: r(mean(rows.map((row) => row.totalBlank)), 1),
    totalNet: r(mean(rows.map((row) => row.totalNet)), 2),
    lgsScore: r(mean(rows.map((row) => row.lgsScore)), 2),
  };
}

function makeStudents(count, baseLevel = 0.72) {
  return NAMES.slice(0, count)
    .map((studentName, index) => {
      const subjects = makeSubjects(baseLevel - index * 0.017, index + 3);
      return {
        studentName,
        classLabel: CLASS_LABELS[index % CLASS_LABELS.length],
        grade: 8,
        subjects,
        ...totalsOf(subjects),
      };
    })
    .sort((a, b) => b.lgsScore - a.lgsScore || b.totalNet - a.totalNet);
}

/** @returns {import('./reportSchemas').ExamResultsPdfModel} */
export function mockExamResultsReport() {
  const students = makeStudents(26);
  const classCounter = {};
  const rows = students.map((student, index) => {
    classCounter[student.classLabel] = (classCounter[student.classLabel] ?? 0) + 1;
    return {
      ...student,
      rank: index + 1,
      ranks: { school: index + 1, class: classCounter[student.classLabel], grade: index + 1 },
    };
  });
  const top = rows[0];
  return {
    type: 'exam_results',
    header: {
      schoolName: SCHOOL,
      sessionTitle: 'Deneme Sonuçları (Örnek Yayınları - 1)',
      sessionDate: '07.10.2026',
      scopeLabel: 'Tüm kurum',
      reportDate: '07.10.2026',
    },
    participantCount: rows.length,
    topScore: { name: top.studentName, score: top.lgsScore },
    averages: averageOf(rows),
    rows,
  };
}

/** @returns {import('./reportSchemas').ClassAveragePdfModel} */
export function mockClassAverageReport() {
  const classRows = ['8-A', '8-B', '8-C', '7-A', '7-B']
    .map((classLabel, index) => {
      const students = makeStudents(8, 0.74 - index * 0.05);
      const avg = averageOf(students);
      return { classLabel, participantCount: 8 - (index % 3), studentCount: 9, ...avg };
    })
    .sort((a, b) => b.lgsScore - a.lgsScore)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return {
    type: 'class_average',
    header: {
      schoolName: SCHOOL,
      sessionTitle: 'Deneme Sonuçları (Örnek Yayınları - 1)',
      sessionDate: '07.10.2026',
      scopeLabel: 'Tüm kurum',
      reportDate: '07.10.2026',
    },
    schoolAverages: {
      ...averageOf(classRows.map((row) => ({ ...row, subjects: row.subjects }))),
      participantCount: classRows.reduce((sum, row) => sum + row.participantCount, 0),
    },
    classRows,
  };
}

/** @returns {import('./reportSchemas').MultiExamAveragePdfModel} */
export function mockMultiExamAverageReport() {
  const sessions = [
    { order: 1, title: 'Örnek Yayınları - 1', heldOn: '07.09.2026' },
    { order: 2, title: 'Örnek Yayınları - 2', heldOn: '21.09.2026' },
    { order: 3, title: 'Deneme Sınavı - 3', heldOn: '05.10.2026' },
    { order: 4, title: 'Deneme Sınavı - 4', heldOn: '19.10.2026' },
  ];
  const students = makeStudents(20, 0.7);
  const rows = students.map((student, index) => {
    const examScores = sessions.map((_, examIndex) => {
      const subjects = makeSubjects(0.7 - index * 0.017 + examIndex * 0.012, index * 5 + examIndex + 1);
      return totalsOf(subjects).lgsScore;
    });
    const mean = examScores.reduce((sum, value) => sum + value, 0) / examScores.length;
    return { ...student, examCount: sessions.length, examScores, lgsScore: Math.round(mean * 100) / 100 };
  });
  rows.sort((a, b) => b.lgsScore - a.lgsScore);
  rows.forEach((row, index) => {
    row.rank = index + 1;
  });

  return {
    type: 'multi_exam_average',
    header: { schoolName: SCHOOL, scopeLabel: 'Tüm kurum', reportDate: '07.10.2026' },
    sessions: sessions.map((session, index) => ({
      ...session,
      avgScore: Math.round((rows.reduce((sum, row) => sum + row.examScores[index], 0) / rows.length) * 100) / 100,
    })),
    schoolAverages: averageOf(rows),
    rows,
  };
}

/** @returns {import('./reportSchemas').StudentAllExamsPdfModel} */
export function mockStudentAllExamsReport() {
  const dates = ['07.09.2026', '21.09.2026', '05.10.2026', '19.10.2026', '02.11.2026'];
  const titles = ['Örnek Yayınları - 1', 'Örnek Yayınları - 2', 'Deneme Sınavı - 3', 'Deneme Sınavı - 4', 'Deneme Sınavı - 5'];
  const exams = titles.map((title, index) => {
    const subjects = makeSubjects(0.6 + index * 0.045, index + 4);
    return {
      order: index + 1,
      title,
      heldOn: dates[index],
      subjects,
      ...totalsOf(subjects),
      ranks: { school: 14 - index * 2, class: 6 - index, grade: 14 - index * 2 },
    };
  });
  return {
    type: 'student_all_exams',
    header: {
      schoolName: SCHOOL,
      studentName: 'Azra Nur Metin',
      studentNumber: '80027',
      classLabel: '8-B',
      reportDate: '07.10.2026',
      examCount: exams.length,
    },
    exams,
    averages: averageOf(exams),
  };
}

/** @returns {import('./reportSchemas').ClassCombinedPdfModel} */
export function mockClassCombinedReport() {
  const exams = [
    { order: 1, title: 'Örnek Yayınları - 1', heldOn: '07.09.2026', participants: 24, avgNet: 48.4, avgScore: 318.2 },
    { order: 2, title: 'Örnek Yayınları - 2', heldOn: '21.09.2026', participants: 25, avgNet: 51.9, avgScore: 331.6 },
    { order: 3, title: 'Deneme Sınavı - 3', heldOn: '05.10.2026', participants: 23, avgNet: 49.7, avgScore: 325.1 },
    { order: 4, title: 'Deneme Sınavı - 4', heldOn: '19.10.2026', participants: 26, avgNet: 55.2, avgScore: 346.9 },
  ];
  const topic = (subjectCode, label, ss, correct, wrong) => ({
    subjectCode,
    label,
    ss,
    correct,
    wrong,
    blank: ss - correct - wrong,
    successRate: Math.round((correct / ss) * 1000) / 10,
  });
  return {
    type: 'class_combined',
    header: { schoolName: SCHOOL, scopeLabel: 'Tüm kurum', examType: 'LGS', reportDate: '07.10.2026' },
    topicCoverage: { withAnswers: 4, total: 4 },
    exams,
    topics: [
      topic('turkce', 'Sözcükte Anlam', 198, 159, 34),
      topic('turkce', 'Paragrafta Anlam ve Yapı', 427, 361, 58),
      topic('turkce', 'Fiilimsiler', 96, 52, 38),
      topic('turkce', 'Cümlenin Ögeleri', 88, 49, 31),
      topic('matematik', 'Kareköklü İfadeler', 382, 253, 94),
      topic('matematik', 'Olasılık', 120, 61, 48),
      topic('matematik', 'Cebirsel İfadeler ve Özdeşlikler', 154, 101, 40),
      topic('fen', 'DNA ve Genetik Kod', 579, 500, 66),
      topic('fen', 'Basınç', 144, 80, 51),
      topic('inkilap', 'Kurtuluş Savaşı Hazırlık Dönemi', 90, 72, 12),
      topic('din', 'Kader İnancı', 70, 58, 9),
      topic('ingilizce', 'Friendship', 64, 41, 15),
    ],
  };
}

/** @returns {import('./reportSchemas').QuestionFrequencyPdfModel} */
export function mockQuestionFrequencyReport() {
  const makeRows = (topics) =>
    topics.map((topic, index) => {
      const correctChoice = ['A', 'B', 'C', 'D'][(index * 3 + 1) % 4];
      const success = 28 + ((index * 17) % 62);
      const blank = index % 4 === 0 ? 8 : index % 3;
      const rest = 100 - success - blank;
      const distractors = ['A', 'B', 'C', 'D'].filter((choice) => choice !== correctChoice);
      const split = index % 2 ? [0.6, 0.25, 0.15] : [0.34, 0.33, 0.33];
      const choices = { [correctChoice]: success };
      distractors.forEach((choice, i) => {
        choices[choice] = Math.round(rest * split[i]);
      });
      return {
        questionIndex: index + 1,
        bookletA: index + 1,
        bookletB: topics.length - index,
        correctChoice,
        topic,
        successPct: success,
        blankPct: blank,
        choices,
      };
    });

  return {
    type: 'question_frequency',
    header: {
      schoolName: SCHOOL,
      sessionTitle: 'Deneme Sonuçları (Örnek Yayınları - 1)',
      scopeLabel: 'Tüm kurum',
      reportDate: '07.10.2026',
    },
    sections: [
      {
        subjectCode: 'turkce',
        subjectLabel: 'Türkçe',
        rows: makeRows([
          'Paragrafta Anlam ve Yapı',
          'Paragrafta Dil ve Anlatım',
          'Edebi Türler',
          'Sözcükte Anlam',
          'Cümlenin Ögeleri',
          'Fiilimsiler',
          'Anlatım Bozuklukları',
          'Yazım Kuralları',
          'Noktalama İşaretleri',
          'Söz Sanatları',
        ]),
      },
      {
        subjectCode: 'matematik',
        subjectLabel: 'Matematik',
        rows: makeRows([
          'Gerçek Sayılar ve İrrasyonel Sayılar',
          'Basit Olayların Olma Olasılığı',
          'Cebirsel İfadeler ve Özdeşlikler',
          'Kareköklü İfadeler',
          'Eşitsizlikler',
          'Üçgenler',
        ]),
      },
    ],
  };
}

/** @type {Record<string, () => import('./reportSchemas').ExamPdfModel>} */
export const MOCK_REPORT_BUILDERS = {
  exam_results: mockExamResultsReport,
  class_combined: mockClassCombinedReport,
  question_frequency: mockQuestionFrequencyReport,
  student_all_exams: mockStudentAllExamsReport,
  class_average: mockClassAverageReport,
  multi_exam_average: mockMultiExamAverageReport,
};

export function getMockReport(type) {
  const builder = MOCK_REPORT_BUILDERS[type];
  if (!builder) throw new Error(`Unknown mock report type: ${type}`);
  return builder();
}
