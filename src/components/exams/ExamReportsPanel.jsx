import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadExamSessions } from '../../lib/exams';
import {
  loadRankingsForSessions,
  loadSessionRankings,
  loadSubjectResults,
  loadSubjectResultsForSessions,
} from '../../lib/lgsExam';
import {
  loadQuestionsForAnswerKey,
  loadSessionStudentAnswers,
} from '../../lib/examAnalysis';
import { buildClassAverageReport } from '../../lib/examReports/buildClassAverageReport';
import { buildClassCombinedReport } from '../../lib/examReports/buildClassCombinedReport';
import { buildExamResultsReport, resolveScopeLabel } from '../../lib/examReports/buildExamResultsReport';
import { buildMultiExamAverageReport } from '../../lib/examReports/buildMultiExamAverageReport';
import { buildQuestionFrequencyReportData } from '../../lib/examReports/buildQuestionFrequencyReport';
import { buildStudentAllExamsReport } from '../../lib/examReports/buildStudentAllExamsReport';
import { getMockReport } from '../../lib/examReports/examReportMockData';
import { InlineError } from '../dashboardUi';
import ExamReportExport from './reports/ExamReportExport';

const MOCK_REPORTS = [
  {
    id: 'exam_results',
    label: 'Deneme sonuç listesi',
    blurb: 'Tek deneme, öğrenci bazlı net, puan ve sıralama',
  },
  {
    id: 'class_average',
    label: 'Şube ortalama listesi',
    blurb: 'Tek deneme, şube bazlı ortalamalar',
  },
  {
    id: 'question_frequency',
    label: 'Soru frekans',
    blurb: 'Soru bazlı doğru/yanlış dağılımı',
  },
  {
    id: 'student_all_exams',
    label: 'Öğrenci gelişim',
    blurb: 'Tek öğrencinin tüm sınavları',
  },
  {
    id: 'multi_exam_average',
    label: 'Çoklu deneme ortalaması',
    blurb: 'Birden fazla deneme, öğrenci ortalamaları',
  },
  {
    id: 'class_combined',
    label: 'Birleştirilmiş karne',
    blurb: 'Çoklu deneme + konu analizi',
  },
];

function ReportTypeCard({
  title,
  audience,
  description,
  requirement,
  ready,
  actionLabel = 'PDF oluştur',
  onAction,
}) {
  return (
    <article className="exam-report-type">
      <div className="exam-report-type__head">
        <h3 className="exam-report-type__title">{title}</h3>
        <span className="exam-report-type__audience">{audience}</span>
      </div>
      <p className="exam-report-type__desc">{description}</p>
      <p className={`exam-report-type__req${ready ? ' exam-report-type__req--ok' : ''}`}>
        <span className="exam-report-type__req-label">Gereksinim:</span> {requirement}
      </p>
      <button type="button" className="demo-btn exam-report-type__btn" disabled={!ready} onClick={onAction}>
        {actionLabel}
      </button>
    </article>
  );
}

function formatSessionLabel(session) {
  return `${session.title} · ${session.held_on}`;
}

export default function ExamReportsPanel({
  schoolId,
  school,
  students = [],
  classes = [],
  embedded = false,
}) {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [rankings, setRankings] = useState([]);
  const [subjectResults, setSubjectResults] = useState([]);
  const [reportSessionIds, setReportSessionIds] = useState([]);
  const [reportStudentId, setReportStudentId] = useState('');
  const [activeReport, setActiveReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionRows = await loadExamSessions(schoolId);
      setSessions(sessionRows);
      setSelectedSessionId((current) => current || sessionRows[0]?.id || '');
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedSessionId) return;
    (async () => {
      try {
        const [rankRows, subjectRows] = await Promise.all([
          loadSessionRankings(selectedSessionId),
          loadSubjectResults(selectedSessionId),
        ]);
        setRankings(rankRows);
        setSubjectResults(subjectRows);
      } catch (loadError) {
        setError(loadError);
      }
    })();
  }, [selectedSessionId]);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) ?? null;
  const selectedStudent = students.find((s) => s.id === reportStudentId) ?? null;
  const multiSelected = sessions.filter((s) => reportSessionIds.includes(s.id));
  const hasSessionResults = subjectResults.length > 0 || rankings.length > 0;
  const hasAnswerKey = Boolean(selectedSession?.answer_key_id);
  const scopeLabel = useMemo(() => resolveScopeLabel(students, classes), [students, classes]);
  const multiWithKey = multiSelected.filter((session) => session.answer_key_id);

  function toggleReportSession(sessionId) {
    setReportSessionIds((current) =>
      current.includes(sessionId) ? current.filter((id) => id !== sessionId) : [...current, sessionId]
    );
  }

  function exportClassCombined() {
    if (!multiSelected.length) {
      setError(new Error('En az bir deneme seçin.'));
      return;
    }
    if (!multiWithKey.length) {
      setError(new Error('Birleştirilmiş karne için seçilen denemelerden en az birinde cevap anahtarı gerekir.'));
      return;
    }
    (async () => {
      try {
        setError(null);
        const ids = multiSelected.map((s) => s.id);
        // Every exam has its own answer key, so topics are read from each exam's own questions.
        const keyIds = [...new Set(multiWithKey.map((session) => session.answer_key_id))];
        const [allSubjects, allRankings, questionSets, answerSets] = await Promise.all([
          loadSubjectResultsForSessions(ids),
          loadRankingsForSessions(ids),
          Promise.all(keyIds.map((keyId) => loadQuestionsForAnswerKey(keyId))),
          Promise.all(multiWithKey.map((session) => loadSessionStudentAnswers(session.id))),
        ]);
        const questionsByKey = new Map(keyIds.map((keyId, index) => [keyId, questionSets[index]]));
        setActiveReport(
          buildClassCombinedReport({
            sessions: multiSelected,
            subjectResults: allSubjects,
            rankings: allRankings,
            topicSources: multiWithKey.map((session, index) => ({
              questions: questionsByKey.get(session.answer_key_id) ?? [],
              answers: answerSets[index],
            })),
            studentIds: students.map((s) => s.id),
            scopeLabel,
            schoolName: school?.name,
          })
        );
      } catch (reportError) {
        setError(reportError);
      }
    })();
  }

  function exportQuestionFrequency() {
    if (!selectedSession?.answer_key_id) {
      setError(new Error('Soru frekans raporu için cevap anahtarı gerekir.'));
      return;
    }
    (async () => {
      try {
        setError(null);
        const [questions, answers] = await Promise.all([
          loadQuestionsForAnswerKey(selectedSession.answer_key_id),
          loadSessionStudentAnswers(selectedSession.id),
        ]);
        setActiveReport(
          buildQuestionFrequencyReportData({
            session: selectedSession,
            questions,
            answers,
            classStudentIds: students.map((s) => s.id),
            classLabel: scopeLabel,
            schoolName: school?.name,
          })
        );
      } catch (reportError) {
        setError(reportError);
      }
    })();
  }

  function exportExamResults() {
    if (!selectedSession) return;
    setError(null);
    setActiveReport(
      buildExamResultsReport({
        session: selectedSession,
        subjectResults,
        rankings,
        students,
        classes,
        schoolName: school?.name,
        scopeLabel,
      })
    );
  }

  function exportClassAverage() {
    if (!selectedSession) return;
    setError(null);
    setActiveReport(
      buildClassAverageReport({
        session: selectedSession,
        subjectResults,
        students,
        classes,
        rankings,
        schoolName: school?.name,
        scopeLabel,
      })
    );
  }

  function exportMultiExamAverage() {
    if (!multiSelected.length) return;
    (async () => {
      try {
        setError(null);
        const ids = multiSelected.map((s) => s.id);
        const [allSubjects, allRankings] = await Promise.all([
          loadSubjectResultsForSessions(ids),
          loadRankingsForSessions(ids),
        ]);
        setActiveReport(
          buildMultiExamAverageReport({
            sessions: multiSelected,
            subjectResults: allSubjects,
            students,
            classes,
            rankings: allRankings,
            schoolName: school?.name,
            scopeLabel,
          })
        );
      } catch (reportError) {
        setError(reportError);
      }
    })();
  }

  function exportStudentAllExams() {
    const student = students.find((s) => s.id === reportStudentId);
    if (!student) return;
    const klass = classes.find((c) => c.id === student.class_id);
    const sessionIds = sessions.map((s) => s.id);
    if (!sessionIds.length) return;
    (async () => {
      try {
        setError(null);
        const [allSubjects, allRankings] = await Promise.all([
          loadSubjectResultsForSessions(sessionIds),
          loadRankingsForSessions(sessionIds),
        ]);
        setActiveReport(
          buildStudentAllExamsReport({
            student,
            klass,
            subjectResults: allSubjects.filter((r) => r.student_id === student.id),
            rankings: allRankings.filter((r) => r.student_id === student.id),
            schoolName: school?.name,
          })
        );
      } catch (reportError) {
        setError(reportError);
      }
    })();
  }

  return (
    <>
      {!embedded ? (
        <header className="dash-header">
          <h1 className="dash-title">Raporlar</h1>
          <p className="dash-subtitle">
            Deneme sonuçlarından PDF rapor üretin — veli görüşmesi, sınıf analizi veya soru incelemesi için
          </p>
        </header>
      ) : null}

      {error && <InlineError error={error} context="calendar" />}

      {loading ? (
        <section className="dash-card">
          <p className="dash-hint">Denemeler yükleniyor…</p>
        </section>
      ) : sessions.length === 0 ? (
        <section className="dash-card">
          <h2 className="dash-section-title">Henüz deneme yok</h2>
          <p className="dash-hint">
            Rapor oluşturmak için önce <strong>Denemeler</strong> sekmesinden bir oturum açıp sonuç girin.
          </p>
        </section>
      ) : (
        <>
          {!embedded ? (
            <section className="dash-card exam-reports-guide">
              <h2 className="dash-section-title">Nasıl kullanılır?</h2>
              <ol className="exam-reports-guide__steps">
                <li>
                  <strong>Tek deneme</strong> — Bir sınav seçin; sınıf sıralaması veya soru analizi alın.
                </li>
                <li>
                  <strong>Öğrenci</strong> — Bir öğrenci seçin; tüm denemelerdeki gelişim raporunu indirin.
                </li>
                <li>
                  <strong>Birden fazla deneme</strong> — Karşılaştırmak istediğiniz sınavları işaretleyin; birleşik
                  karne veya ortalama tablosu oluşturun.
                </li>
              </ol>
            </section>
          ) : null}

          <section className="dash-card exam-reports-section">
            <div className="exam-reports-section__head">
              <div>
                <p className="exam-reports-section__eyebrow">1 · Tek deneme</p>
                <h2 className="dash-section-title">Sınıf ve soru analizi</h2>
                <p className="dash-hint exam-reports-section__lead">
                  Seçtiğiniz <strong>bir deneme</strong> için kurum geneli raporlar. Sınıf toplantısı veya ders
                  bazlı zayıf konuları görmek için uygundur.
                </p>
              </div>
              <label className="dash-label exam-reports-section__picker">
                Hangi deneme?
                <select
                  className="dash-input"
                  value={selectedSessionId}
                  onChange={(event) => setSelectedSessionId(event.target.value)}
                >
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {formatSessionLabel(session)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="exam-report-type-grid">
              <ReportTypeCard
                title="Deneme sonuç listesi"
                audience="Müdür · Rehberlik · Öğretmen"
                description="Seçilen denemede her öğrencinin ders bazlı doğru/yanlış/net değerlerini, puanını ve sıralamasını puana göre sıralı tek listede verir."
                requirement={
                  hasSessionResults
                    ? `${formatSessionLabel(selectedSession)} için sonuç mevcut`
                    : 'Bu denemeye en az bir öğrenci sonucu girilmeli'
                }
                ready={Boolean(selectedSession && hasSessionResults)}
                onAction={exportExamResults}
              />
              <ReportTypeCard
                title="Şube ortalama listesi"
                audience="Rehberlik · Müdür"
                description="Seçilen denemede şubelerin ders net ortalamalarını ve ortalama puanlarını karşılaştırır."
                requirement={
                  hasSessionResults
                    ? `${formatSessionLabel(selectedSession)} için sonuç mevcut`
                    : 'Bu denemeye en az bir öğrenci sonucu girilmeli'
                }
                ready={Boolean(selectedSession && hasSessionResults)}
                onAction={exportClassAverage}
              />
              <ReportTypeCard
                title="Soru frekans analizi"
                audience="Öğretmen · Rehberlik"
                description="Her sorunun kaç öğrenci tarafından doğru/yanlış/boş bırakıldığını ve hangi konuda zorlanıldığını gösterir."
                requirement={
                  hasAnswerKey
                    ? 'Cevap anahtarı yüklü — öğrenci cevapları kullanılır'
                    : 'Denemeler sekmesinden cevap anahtarı yükleyin'
                }
                ready={Boolean(selectedSession && hasAnswerKey)}
                onAction={exportQuestionFrequency}
              />
            </div>
          </section>

          <section className="dash-card exam-reports-section">
            <div className="exam-reports-section__head">
              <div>
                <p className="exam-reports-section__eyebrow">2 · Bireysel</p>
                <h2 className="dash-section-title">Öğrenci gelişim raporu</h2>
                <p className="dash-hint exam-reports-section__lead">
                  <strong>Tek bir öğrenci</strong> için tüm denemelerdeki net, sıralama ve ders bazlı gelişimi tek
                  PDF&apos;te toplar. Veli görüşmesi ve bireysel rehberlik için uygundur.
                </p>
              </div>
              <label className="dash-label exam-reports-section__picker">
                Hangi öğrenci?
                <select
                  className="dash-input"
                  value={reportStudentId}
                  onChange={(event) => setReportStudentId(event.target.value)}
                >
                  <option value="">Öğrenci seçin</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="exam-report-type-grid exam-report-type-grid--single">
              <ReportTypeCard
                title="Öğrencinin tüm sınavları"
                audience="Veli · Rehberlik"
                description={
                  selectedStudent
                    ? `${selectedStudent.full_name} adlı öğrencinin kayıtlı tüm deneme sonuçlarını yan yana gösterir.`
                    : 'Listeden bir öğrenci seçtiğinizde, o öğrencinin tüm deneme geçmişi raporlanır.'
                }
                requirement={
                  reportStudentId
                    ? `${sessions.length} deneme kaydı taranır`
                    : 'Yukarıdan öğrenci seçin'
                }
                ready={Boolean(reportStudentId)}
                onAction={exportStudentAllExams}
              />
            </div>
          </section>

          <section className="dash-card exam-reports-section">
            <div className="exam-reports-section__head">
              <div>
                <p className="exam-reports-section__eyebrow">3 · Birden fazla deneme</p>
                <h2 className="dash-section-title">Karşılaştırma ve birleşik karne</h2>
                <p className="dash-hint exam-reports-section__lead">
                  Aşağıdan <strong>birden fazla sınav</strong> işaretleyin. Seçimleriniz hem birleşik karne hem de
                  çoklu ortalama raporları için kullanılır.
                </p>
              </div>
              <p className="exam-reports-section__count">
                {reportSessionIds.length ? (
                  <>
                    <strong>{reportSessionIds.length}</strong> deneme seçildi
                  </>
                ) : (
                  'Henüz deneme seçilmedi'
                )}
              </p>
            </div>

            <ul className="exam-reports-session-pick">
              {sessions.map((session) => {
                const checked = reportSessionIds.includes(session.id);
                return (
                  <li key={`report-${session.id}`}>
                    <label className={`exam-reports-session-pick__item${checked ? ' exam-reports-session-pick__item--on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleReportSession(session.id)}
                      />
                      <span>
                        <strong>{session.title}</strong>
                        <span className="dash-hint">{session.held_on}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            <div className="exam-report-type-grid">
              <ReportTypeCard
                title="Birleştirilmiş sınıf karnesi"
                audience="Rehberlik · Sınıf öğretmeni"
                description="Seçilen denemeleri tek PDF'te birleştirir; her denemenin kendi cevap anahtarından konu bazlı başarıyı toplar."
                requirement={
                  !reportSessionIds.length
                    ? 'En az bir deneme işaretleyin'
                    : multiWithKey.length === 0
                      ? 'Seçilen denemelerin hiçbirinde cevap anahtarı yok'
                      : multiWithKey.length < reportSessionIds.length
                        ? `${reportSessionIds.length} deneme · konu analizi ${multiWithKey.length} denemenin cevap anahtarıyla`
                        : `${reportSessionIds.length} deneme · hepsinde cevap anahtarı var`
                }
                ready={multiWithKey.length > 0}
                onAction={exportClassCombined}
              />
              <ReportTypeCard
                title="Çoklu deneme ortalaması"
                audience="Müdür · Rehberlik"
                description="Seçilen denemelerin ortalamasına göre öğrenci sıralaması ve ders net ortalamalarını gösterir."
                requirement={
                  reportSessionIds.length >= 2
                    ? `${reportSessionIds.length} deneme birleştirilecek`
                    : reportSessionIds.length === 1
                      ? 'Karşılaştırma için en az 2 deneme seçin'
                      : 'En az iki deneme işaretleyin'
                }
                ready={reportSessionIds.length >= 2}
                onAction={exportMultiExamAverage}
              />
            </div>
          </section>

          <section className="dash-card exam-reports-mock">
            <details className="exam-reports-mock__details">
              <summary className="exam-reports-mock__summary">
                Şablon önizleme (örnek veri)
                <span className="dash-hint">Gerçek sonuç olmadan PDF düzenini test edin</span>
              </summary>
              <div className="exam-report-type-grid exam-report-type-grid--mock">
                {MOCK_REPORTS.map((item) => (
                  <article key={item.id} className="exam-report-type exam-report-type--mock">
                    <h3 className="exam-report-type__title">{item.label}</h3>
                    <p className="exam-report-type__desc">{item.blurb}</p>
                    <button
                      type="button"
                      className="demo-btn exam-report-type__btn"
                      onClick={() => setActiveReport(getMockReport(item.id))}
                    >
                      Örnek PDF önizle
                    </button>
                  </article>
                ))}
              </div>
            </details>
          </section>
        </>
      )}

      {activeReport ? (
        <ExamReportExport report={activeReport} onClose={() => setActiveReport(null)} />
      ) : null}
    </>
  );
}
