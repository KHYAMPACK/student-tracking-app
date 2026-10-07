import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { recordSchoolActivity } from '../../lib/activityLog';
import {
  loadQuestionsForAnswerKey,
  saveAnswerKeyWithQuestions,
} from '../../lib/examAnalysis';
import { parseAnswerKeyCsv } from '../../lib/examAnswerKeyImport';
import { parseAnswerKeyXlsx } from '../../lib/examKeyXlsxImport';
import {
  matchOptikEntriesToStudents,
  parseOptikExamCsv,
  saveOptikImport,
} from '../../lib/examOptikImport';
import { decodeOptikBytes, parseOptikTxt } from '../../lib/examOptikTxtImport';
import { matchOptikTxtEntries, rowNeedsDecision } from '../../lib/examNameMatch';
import { InlineError, SuccessMessage } from '../dashboardUi';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Icon } from '../ui/Icon';
import AnswerKeyReviewGrid from './AnswerKeyReviewGrid';
import ExamUploadDropzone from './ExamUploadDropzone';
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
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);
  const [studentFileWarnings, setStudentFileWarnings] = useState([]);
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [studentPreview, setStudentPreview] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
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

  // The manual picker lists the exam's grades first-class: students of other grades only
  // show up when the roster has no grade info at all.
  const pickerStudents = useMemo(() => {
    const inGrades = students.filter(
      (student) => student.grade != null && audienceGrades.includes(student.grade)
    );
    return inGrades.length ? inGrades : students;
  }, [students, audienceGrades]);
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

  async function handleAnswerKeyFile(file) {
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

  async function handleStudentFile(file) {
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
      const firstPending = matched.find(rowNeedsDecision);
      setExpandedRows(new Set(firstPending ? [previewRowKey(firstPending)] : []));
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

  // Only one pending row is open at a time, and resolving a row opens the next pending one,
  // so the confirm button never gets pushed off screen.
  function openNextPending(resolvedKey) {
    const next = studentPreview.find(
      (row) => previewRowKey(row) !== resolvedKey && rowNeedsDecision(row)
    );
    setExpandedRows(new Set(next ? [previewRowKey(next)] : []));
  }

  function restoreOriginal(row) {
    const original = row.original ?? {};
    return {
      student_id: original.student_id ?? null,
      matchedStudent: original.matchedStudent ?? null,
      studentName: original.matchedStudent?.full_name ?? row.student_name ?? row.studentName,
      matchStatus: original.matchStatus ?? 'unmatched',
      confirmed: false,
      external: false,
      decision: null,
    };
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
            decision: 'assigned',
            original: row.original ?? {
              student_id: row.student_id,
              matchedStudent: row.matchedStudent,
              matchStatus: row.matchStatus,
            },
          }
        : restoreOriginal(row)
    );
    if (student) openNextPending(rowKey);
  }

  function handleConfirmRow(rowKey) {
    patchStudentRow(rowKey, () => ({ confirmed: true, decision: 'confirmed' }));
    openNextPending(rowKey);
  }

  function handleMarkExternal(rowKey, external) {
    patchStudentRow(rowKey, () => ({ external, decision: external ? 'external' : null }));
    if (external) openNextPending(rowKey);
  }

  function handleUndoDecision(rowKey) {
    patchStudentRow(rowKey, (row) => {
      if (row.decision === 'external') return { external: false, decision: null };
      if (row.decision === 'confirmed') return { confirmed: false, decision: null };
      return restoreOriginal(row);
    });
    setExpandedRows(new Set([rowKey]));
  }

  function handleToggleRow(rowKey, isOpen) {
    setExpandedRows((current) => {
      if (isOpen) return new Set([rowKey]);
      if (!current.has(rowKey)) return current;
      const next = new Set(current);
      next.delete(rowKey);
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
    setRestartConfirmOpen(false);
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
        students={pickerStudents}
        questionCount={questionCount}
        expandedRows={expandedRows}
        onToggleRow={handleToggleRow}
        onAssignStudent={handleAssignStudent}
        onConfirmRow={handleConfirmRow}
        onMarkExternal={handleMarkExternal}
        onUndoDecision={handleUndoDecision}
        saving={saving}
        onCancel={() => {
          if (saving) return;
          setStudentDialogOpen(false);
        }}
        onConfirm={handleConfirmStudentImport}
      />

      <ConfirmDialog
        open={restartConfirmOpen}
        title="Cevap anahtarı yeniden yüklensin mi?"
        confirmLabel="Evet, yeniden yükle"
        cancelLabel="Vazgeç"
        onCancel={() => setRestartConfirmOpen(false)}
        onConfirm={restartAnswerKey}
      >
        <p className="app-dialog__lead">
          Yeni bir cevap anahtarı yükleyeceksiniz. Yenisini kaydedene kadar mevcut anahtar geçerli
          kalır.
        </p>
        <p className="dash-hint">
          Yeni anahtar kaydedildiğinde, bu denemeye daha önce yüklenen öğrenci cevaplarını yeni
          anahtarla yeniden yüklemeniz gerekir.
        </p>
      </ConfirmDialog>

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
          <div>
            <h3 className="exam-workspace-block__title">1. Cevap anahtarını yükleyin</h3>
            <p className="dash-hint">
              Yayınevinin cevap anahtarı dosyası. Doğru cevaplar, A/B kitapçık sırası ve konular
              dosyadan okunur; bir sonraki adımda soru listesini kontrol edip kaydedersiniz.
            </p>
          </div>
          <ExamUploadDropzone
            formats={['Excel (.xlsx)', 'CSV']}
            extensions={['.xlsx', '.xls', '.csv']}
            hint="CSV için sütunlar: question_index, subject_code, correct_choice, topic_label"
            onFile={handleAnswerKeyFile}
          />
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
          {keyMeta?.topicStats ? (
            <p className="dash-hint">
              Konular: {keyMeta.topicStats.kod} soru kazanım koduyla
              {keyMeta.topicStats['ust-kod'] ? `, ${keyMeta.topicStats['ust-kod']} soru üst koduyla` : ''}
              {keyMeta.topicStats.dosya ? `, ${keyMeta.topicStats.dosya} soru dosyadaki etiketle` : ''}
              {keyMeta.topicStats.yok ? `; ${keyMeta.topicStats.yok} soru için konu sorulacak` : ''}.
            </p>
          ) : null}
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
          <h3 className="exam-workspace-block__title">3. Öğrenci cevaplarını yükleyin</h3>
          {!activeAnswerKeyId ? (
            <p className="dash-hint">Öğrenci cevaplarını yüklemeden önce cevap anahtarını kaydedin.</p>
          ) : (
            <>
              <div className="exam-key-status">
                <span className="exam-key-status__text">
                  <Icon name="check" size={16} />
                  Cevap anahtarı kaydedildi
                  {reviewQuestions.length ? ` · ${reviewQuestions.length} soru` : ''}
                </span>
                <button
                  type="button"
                  className="demo-btn demo-btn--ghost"
                  onClick={() => setRestartConfirmOpen(true)}
                >
                  Cevap anahtarını yeniden yükle
                </button>
              </div>
              <p className="dash-hint">
                Optik okuyucunun çıktısını yükleyin. A/B kitapçığı otomatik ayrılır ve öğrenciler
                adlarından eşleştirilir. Eşleşmeyen veya tahminle eşleşen öğrenciler için sizden onay
                istenir; sınava dışarıdan katılanları «Dışarıdan katılıyor» ile atlarsınız (bu seçim
                sonraki denemeye taşınmaz).
              </p>
              <ExamUploadDropzone
                formats={['Optik çıktı (.txt)', 'CSV']}
                extensions={['.txt', '.csv']}
                hint={`CSV için sütunlar: okul_no, ad_soyad, s1…s${reviewQuestions.length || 90}`}
                onFile={handleStudentFile}
              />
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
