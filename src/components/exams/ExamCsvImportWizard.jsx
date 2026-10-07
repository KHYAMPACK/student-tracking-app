import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { recordSchoolActivity } from '../../lib/activityLog';
import {
  loadQuestionsForAnswerKey,
  saveAnswerKeyWithQuestions,
} from '../../lib/examAnalysis';
import {
  downloadAnswerKeyTemplate,
  parseAnswerKeyCsv,
} from '../../lib/examAnswerKeyImport';
import { parseAnswerKeyXlsx } from '../../lib/examKeyXlsxImport';
import {
  downloadOptikTemplate,
  matchOptikEntriesToStudents,
  parseOptikExamCsv,
  saveOptikImport,
} from '../../lib/examOptikImport';
import { decodeOptikBytes, parseOptikTxt } from '../../lib/examOptikTxtImport';
import { matchOptikTxtEntries, rowNeedsDecision } from '../../lib/examNameMatch';
import { InlineError, SuccessMessage } from '../dashboardUi';
import AnswerKeyReviewGrid from './AnswerKeyReviewGrid';
import KonuEslestirmeDialog from './KonuEslestirmeDialog';
import OgrenciImportOnayDialog from './OgrenciImportOnayDialog';
import {
  findUnknownKonuFromQuestions,
  loadExamKonuContext,
  preferResolvableTopicLabels,
  resolveAudienceGrades,
  saveKonuMappingBatch,
} from '../../lib/examKonuMapping';

const WIZARD_STEPS = [
  { id: 'upload-key', label: 'Cevap anahtarı' },
  { id: 'review-key', label: 'Anahtar onayı' },
  { id: 'upload-students', label: 'Öğrenci cevapları' },
  { id: 'review-students', label: 'Öğrenci onayı' },
];

function previewRowKey(row) {
  return row.rowNumber ?? row.student_number ?? row.studentName ?? 'row';
}

function resolveInitialStep(answerKeyId) {
  return answerKeyId ? 'upload-students' : 'upload-key';
}

function stepIndex(stepId) {
  return WIZARD_STEPS.findIndex((step) => step.id === stepId);
}

function WizardStepIndicator({ currentStep, answerKeyId, complete, studentDialogOpen }) {
  const displayStep = studentDialogOpen ? 'review-students' : currentStep;
  const currentIndex = stepIndex(displayStep);

  return (
    <ol className="exam-import-wizard__steps" aria-label="Import adımları">
      {WIZARD_STEPS.map((step, index) => {
        let status = 'upcoming';
        if (complete) status = 'done';
        else if (index < currentIndex) status = 'done';
        else if (index === currentIndex) status = 'active';
        else if (step.id === 'upload-students' || step.id === 'review-students') {
          if (!answerKeyId && index > 1) status = 'disabled';
        }

        return (
          <li
            key={step.id}
            className={`exam-import-wizard__step exam-import-wizard__step--${status}`}
            aria-current={status === 'active' ? 'step' : undefined}
          >
            <span className="exam-import-wizard__step-index">{index + 1}</span>
            <span className="exam-import-wizard__step-label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function ExamCsvImportWizard({
  session,
  schoolId,
  students = [],
  classes = [],
  answerKeyId,
  onAnswerKeySaved,
  onResultsSaved,
  onNavigateToResults,
  onNavigateToAnalysis,
}) {
  const { profile } = useAuth();
  const [step, setStep] = useState(() => resolveInitialStep(answerKeyId));
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);

  const [draftQuestions, setDraftQuestions] = useState([]);
  const [draftWarnings, setDraftWarnings] = useState([]);
  const [keyMeta, setKeyMeta] = useState(null);
  const [studentFileWarnings, setStudentFileWarnings] = useState([]);
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [studentPreview, setStudentPreview] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [studentFilter, setStudentFilter] = useState('all');
  const [expandedRows, setExpandedRows] = useState(() => new Set());
  const [localAnswerKeyId, setLocalAnswerKeyId] = useState(null);
  const [konuDialogOpen, setKonuDialogOpen] = useState(false);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [unknownKonu, setUnknownKonu] = useState([]);
  const [konuContext, setKonuContext] = useState(null);
  const audienceGrades = useMemo(() => resolveAudienceGrades(session), [session]);

  const activeAnswerKeyId = answerKeyId ?? localAnswerKeyId;

  useEffect(() => {
    setStep(resolveInitialStep(activeAnswerKeyId));
    setComplete(false);
    setError(null);
    setSuccess(null);
    setDraftQuestions([]);
    setDraftWarnings([]);
    setKeyMeta(null);
    setStudentFileWarnings([]);
    setStudentPreview([]);
    setExpandedRows(new Set());
    setLocalAnswerKeyId(null);
    setStudentDialogOpen(false);
  }, [session.id]);

  useEffect(() => {
    if (!activeAnswerKeyId) {
      setSavedQuestions([]);
      return;
    }
    (async () => {
      try {
        const rows = await loadQuestionsForAnswerKey(activeAnswerKeyId);
        setSavedQuestions(rows);
      } catch (loadError) {
        setError(loadError);
      }
    })();
  }, [activeAnswerKeyId]);

  const reviewQuestions = savedQuestions.length ? savedQuestions : draftQuestions;

  const importCount = studentPreview.filter((row) => row.student_id && !row.external).length;
  const externalCount = studentPreview.filter((row) => row.external).length;
  const pendingCount = studentPreview.filter(rowNeedsDecision).length;

  function patchDraftQuestion(index, field, value) {
    setDraftQuestions((current) =>
      current.map((row) =>
        row.question_index === index ? { ...row, [field]: value.toUpperCase?.() ?? value } : row
      )
    );
  }

  async function handleAnswerKeyFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    try {
      const isExcel = /\.xlsx?$/i.test(file.name);
      const parsed = isExcel
        ? parseAnswerKeyXlsx(await file.arrayBuffer())
        : parseAnswerKeyCsv(await file.text());
      setDraftQuestions(parsed.questions);
      setDraftWarnings(parsed.warnings);
      setKeyMeta(parsed.meta ?? null);
      setStep('review-key');
    } catch (fileError) {
      setError(fileError);
    }
  }

  async function persistAnswerKey(questions = draftQuestions) {
    const keyRow = await saveAnswerKeyWithQuestions({
      schoolId,
      sessionId: session.id,
      title: session.title || 'Cevap anahtarı',
      questions,
    });
    setLocalAnswerKeyId(keyRow.id);
    recordSchoolActivity(supabase, profile, {
      schoolId,
      category: 'exam',
      action: 'saved',
      summary: `Cevap anahtarı: ${session.title ?? 'Deneme'} · ${questions.length} soru`,
    });
    setSuccess('Cevap anahtarı kaydedildi. Şimdi öğrenci cevaplarını yükleyin.');
    setDraftWarnings([]);
    await onAnswerKeySaved?.();
    setStep('upload-students');
  }

  async function handleConfirmAnswerKey() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const validQuestions = draftQuestions.filter((row) => row.correct_choice);
      if (!validQuestions.length) {
        throw new Error('Kaydetmek için en az bir geçerli cevap şıkkı gerekli.');
      }

      const context = await loadExamKonuContext(schoolId, audienceGrades);
      const prepared = preferResolvableTopicLabels({
        questions: draftQuestions,
        units: context.allUnits,
        mappingLookup: context.mappingLookup,
      });
      setDraftQuestions(prepared);
      const unknown = findUnknownKonuFromQuestions({
        questions: prepared,
        units: context.allUnits,
        mappingLookup: context.mappingLookup,
      });

      if (unknown.length) {
        setKonuContext(context);
        setUnknownKonu(unknown);
        setKonuDialogOpen(true);
        return;
      }

      await persistAnswerKey(prepared);
    } catch (saveError) {
      setError(saveError);
    } finally {
      setSaving(false);
    }
  }

  async function handleKonuDialogConfirm(decisions) {
    if (!konuContext) return;
    setSaving(true);
    setError(null);
    try {
      await saveKonuMappingBatch({
        schoolId,
        grades: audienceGrades,
        decisions,
        units: konuContext.allUnits,
        subjects: konuContext.subjects,
        createdBy: profile?.id ?? null,
      });
      setKonuDialogOpen(false);
      setUnknownKonu([]);
      await persistAnswerKey();
    } catch (saveError) {
      setError(saveError);
    } finally {
      setSaving(false);
    }
  }

  async function handleStudentFile(event) {
    const file = event.target.files?.[0];
    if (!file || !activeAnswerKeyId) return;
    setError(null);
    setSuccess(null);
    try {
      let matched;
      let columnCount;
      setStudentFileWarnings([]);
      if (/\.txt$/i.test(file.name)) {
        const questions = savedQuestions.length
          ? savedQuestions
          : await loadQuestionsForAnswerKey(activeAnswerKeyId);
        const parsed = parseOptikTxt(decodeOptikBytes(await file.arrayBuffer()));
        matched = matchOptikTxtEntries(parsed.entries, students, {
          questions,
          grades: audienceGrades,
          classes,
        });
        columnCount = questions.length;
        setStudentFileWarnings(parsed.warnings);
      } else {
        const parsed = parseOptikExamCsv(await file.text());
        matched = matchOptikEntriesToStudents(parsed.entries, students);
        columnCount = parsed.questionHeaders.length;
      }
      setStudentPreview(matched);
      setQuestionCount(columnCount);
      setExpandedRows(new Set(matched.filter(rowNeedsDecision).map(previewRowKey)));
      setStudentFilter('all');
      setStudentDialogOpen(true);
    } catch (fileError) {
      setError(fileError);
      setStudentPreview([]);
    }
  }

  function patchStudentRow(rowKey, buildPatch) {
    setStudentPreview((current) =>
      current.map((row) => (previewRowKey(row) === rowKey ? { ...row, ...buildPatch(row) } : row))
    );
  }

  function handleAssignStudent(rowKey, studentId) {
    const student = students.find((item) => item.id === studentId) ?? null;
    patchStudentRow(rowKey, (row) =>
      student
        ? {
            student_id: student.id,
            matchedStudent: student,
            studentName: student.full_name,
            student_number: student.student_number ?? row.student_number,
            matchStatus: 'manual',
            confirmed: true,
            external: false,
          }
        : {
            student_id: null,
            matchedStudent: null,
            studentName: row.student_name ?? row.studentName,
            matchStatus: 'unmatched',
            confirmed: false,
          }
    );
  }

  function handleConfirmRow(rowKey) {
    patchStudentRow(rowKey, () => ({ confirmed: true }));
  }

  function handleMarkExternal(rowKey, external) {
    patchStudentRow(rowKey, () => ({ external }));
  }

  function handleToggleRow(rowKey, isOpen) {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (isOpen) next.add(rowKey);
      else next.delete(rowKey);
      return next;
    });
  }

  async function handleConfirmStudentImport() {
    if (!activeAnswerKeyId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const questions = savedQuestions.length
        ? savedQuestions
        : await loadQuestionsForAnswerKey(activeAnswerKeyId);
      if (pendingCount > 0) {
        throw new Error(`${pendingCount} satır için karar bekleniyor.`);
      }
      const matchedEntries = studentPreview.filter((row) => row.student_id && !row.external);
      if (!matchedEntries.length) {
        throw new Error('İçe aktarmak için en az bir eşleşen öğrenci gerekli.');
      }
      const result = await saveOptikImport({
        sessionId: session.id,
        answerKeyId: activeAnswerKeyId,
        questions,
        matchedEntries,
      });
      recordSchoolActivity(supabase, profile, {
        schoolId,
        category: 'exam',
        action: 'saved',
        summary: `Optik import: ${session.title ?? 'Deneme'} · ${result.studentCount} öğrenci`,
      });
      setSuccess(
        `${result.studentCount} öğrenci, ${result.answerCount} cevap içe aktarıldı.` +
          (externalCount ? ` ${externalCount} dışarıdan katılan öğrenci atlandı.` : '')
      );
      setStudentPreview([]);
      setComplete(true);
      setStep('upload-students');
      setStudentDialogOpen(false);
      onResultsSaved?.();
    } catch (importError) {
      setError(importError);
    } finally {
      setSaving(false);
    }
  }

  function restartAnswerKey() {
    setStep('upload-key');
    setDraftQuestions([]);
    setDraftWarnings([]);
    setComplete(false);
    setSuccess(null);
    setError(null);
  }

  return (
    <div className="exam-import-wizard">
      <KonuEslestirmeDialog
        open={konuDialogOpen}
        unknownItems={unknownKonu}
        units={konuContext?.allUnits ?? []}
        grades={audienceGrades}
        saving={saving}
        onCancel={() => {
          if (saving) return;
          setKonuDialogOpen(false);
        }}
        onConfirm={handleKonuDialogConfirm}
      />

      <OgrenciImportOnayDialog
        open={studentDialogOpen}
        studentPreview={studentPreview}
        questions={reviewQuestions}
        students={students}
        questionCount={questionCount}
        studentFilter={studentFilter}
        onStudentFilterChange={setStudentFilter}
        expandedRows={expandedRows}
        onToggleRow={handleToggleRow}
        onAssignStudent={handleAssignStudent}
        onConfirmRow={handleConfirmRow}
        onMarkExternal={handleMarkExternal}
        saving={saving}
        onCancel={() => {
          if (saving) return;
          setStudentDialogOpen(false);
        }}
        onConfirm={handleConfirmStudentImport}
      />

      <WizardStepIndicator
        currentStep={step}
        answerKeyId={activeAnswerKeyId}
        complete={complete}
        studentDialogOpen={studentDialogOpen}
      />

      {error ? <InlineError error={error} context="calendar" /> : null}
      {success ? <SuccessMessage message={success} /> : null}

      {complete ? (
        <div className="exam-import-wizard__step-panel exam-import-wizard__complete">
          <h3 className="exam-workspace-block__title">Import tamamlandı</h3>
          <p className="dash-hint">Sonuçlar kaydedildi. Sıralama ve analiz sekmelerinden inceleyebilirsiniz.</p>
          <div className="exam-import-wizard__actions">
            <button type="button" className="demo-btn demo-btn--primary" onClick={onNavigateToResults}>
              Sonuçları gör
            </button>
            <button type="button" className="demo-btn" onClick={onNavigateToAnalysis}>
              Analize git
            </button>
            <button type="button" className="demo-btn demo-btn--ghost" onClick={() => { setComplete(false); setStep('upload-students'); }}>
              Yeniden import
            </button>
          </div>
        </div>
      ) : null}

      {!complete && step === 'upload-key' ? (
        <div className="exam-import-wizard__step-panel">
          <h3 className="exam-workspace-block__title">1. Cevap anahtarı</h3>
          <p className="dash-hint">
            Yayınevi cevap anahtarını Excel (.xlsx: her ders için A ve B kitapçığı sütunlu) veya CSV
            (question_index, subject_code, correct_choice, topic_label) olarak yükleyin.
          </p>
          <div className="exam-import-wizard__actions">
            <button type="button" className="demo-btn demo-btn--ghost" onClick={downloadAnswerKeyTemplate}>
              CSV şablonu indir
            </button>
          </div>
          <label className="dash-label">
            Cevap anahtarı dosyası
            <input
              className="dash-input"
              type="file"
              accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleAnswerKeyFile}
            />
          </label>
        </div>
      ) : null}

      {!complete && step === 'review-key' ? (
        <div className="exam-import-wizard__step-panel">
          <h3 className="exam-workspace-block__title">2. Cevap anahtarını onayla</h3>
          <p className="dash-hint">
            {keyMeta?.examName ? `${keyMeta.examName} · ` : ''}
            {draftQuestions.length} soru
            {draftWarnings.length ? ` · ${draftWarnings.length} uyarı` : ''}
            {' · '}
            Konu etiketleri kayıttan önce müfredat ünitelerine bağlanır.
          </p>
          {draftWarnings.length ? (
            <ul className="exam-import-wizard__warnings">
              {draftWarnings.slice(0, 8).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
              {draftWarnings.length > 8 ? (
                <li>… ve {draftWarnings.length - 8} uyarı daha</li>
              ) : null}
            </ul>
          ) : null}
          <AnswerKeyReviewGrid questions={draftQuestions} onPatch={patchDraftQuestion} />
          <div className="exam-import-wizard__actions">
            <button type="button" className="demo-btn demo-btn--ghost" onClick={() => setStep('upload-key')}>
              Geri
            </button>
            <button
              type="button"
              className="demo-btn demo-btn--primary"
              disabled={saving}
              onClick={handleConfirmAnswerKey}
            >
              {saving ? 'Kaydediliyor…' : 'Onayla ve kaydet'}
            </button>
          </div>
        </div>
      ) : null}

      {!complete && step === 'upload-students' ? (
        <div className="exam-import-wizard__step-panel">
          <h3 className="exam-workspace-block__title">3. Öğrenci cevapları</h3>
          {!activeAnswerKeyId ? (
            <p className="dash-hint">Öğrenci cevaplarını yüklemeden önce cevap anahtarını kaydedin.</p>
          ) : (
            <>
              <p className="dash-hint">
                Optik okuyucu çıktısı (.txt) veya CSV (okul_no, ad_soyad, s1…s
                {reviewQuestions.length || 90}). Kitapçık (A/B) otomatik ayrılır. Eşleşmeyen veya
                tahminle eşleşen öğrenciler için sizden onay istenir; sınava dışarıdan katılanları
                «Dışarıdan katılıyor» ile atlarsınız (her denemede yeniden sorulur).
              </p>
              <div className="exam-import-wizard__actions">
                <button type="button" className="demo-btn demo-btn--ghost" onClick={downloadOptikTemplate}>
                  Şablon indir
                </button>
                <button type="button" className="demo-btn demo-btn--ghost" onClick={restartAnswerKey}>
                  Cevap anahtarını yeniden yükle
                </button>
              </div>
              <label className="dash-label">
                Öğrenci cevapları dosyası
                <input
                  className="dash-input"
                  type="file"
                  accept=".txt,.csv,text/plain,text/csv"
                  onChange={handleStudentFile}
                />
              </label>
              {studentFileWarnings.length ? (
                <ul className="exam-import-wizard__warnings">
                  {studentFileWarnings.slice(0, 5).map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                  {studentFileWarnings.length > 5 ? (
                    <li>… ve {studentFileWarnings.length - 5} uyarı daha</li>
                  ) : null}
                </ul>
              ) : null}
              {studentPreview.length && !studentDialogOpen ? (
                <div className="exam-import-wizard__actions">
                  <button
                    type="button"
                    className="demo-btn demo-btn--primary"
                    onClick={() => setStudentDialogOpen(true)}
                  >
                    Öğrenci onayını aç ({importCount} aktarılacak
                    {pendingCount ? ` · ${pendingCount} karar bekliyor` : ''})
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
