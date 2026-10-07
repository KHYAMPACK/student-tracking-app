import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { previewOptikEntryStats } from '../../lib/examOptikImport';
import { rowNeedsDecision } from '../../lib/examNameMatch';

function rowKeyOf(row) {
  return row.rowNumber ?? row.student_number ?? row.studentName ?? 'row';
}

function decisionText(row) {
  if (row.decision === 'external') return 'Dışarıdan katılıyor';
  const name = row.matchedStudent?.full_name ?? '';
  return row.decision === 'confirmed' ? `${name} (onaylandı)` : name;
}

function PendingRow({
  row,
  questions,
  students,
  usedStudentIds,
  onAssignStudent,
  onConfirmRow,
  onMarkExternal,
  expanded,
  onToggle,
}) {
  const stats = useMemo(() => previewOptikEntryStats(row, questions), [row, questions]);
  const rowKey = rowKeyOf(row);
  const hasStudent = Boolean(row.student_id);

  return (
    <details
      className={`exam-import-review-row exam-import-review-row--issue${expanded ? ' exam-import-review-row--open' : ''}`}
      open={expanded}
      onToggle={(event) => onToggle(rowKey, event.currentTarget.open)}
    >
      <summary className="exam-import-review-row__summary">
        <span className="exam-import-review-row__title">
          {row.studentName || row.student_number || '—'}
        </span>
        <span className="exam-import-review-row__meta">
          {row.booklet ? <span className="dash-hint">Kitapçık {row.booklet}</span> : null}
          <span className="exam-student-review__badge exam-student-review__badge--warn">
            {hasStudent ? 'Onay bekliyor' : 'Eşleşmedi'}
          </span>
          {hasStudent ? (
            <span className="dash-hint">
              Net {stats.totalNet.toFixed(2)} · D {stats.totalCorrect} / Y {stats.totalWrong} / B{' '}
              {stats.totalBlank}
            </span>
          ) : null}
        </span>
      </summary>
      <div className="exam-import-review-row__body">
        {row.notes?.length ? (
          <ul className="exam-import-wizard__warnings">
            {row.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}

        <label className="dash-label exam-import-review-row__assign">
          {hasStudent ? 'Başka öğrenci seç' : 'Öğrenci eşleştir'}
          <select
            className="dash-input"
            value={row.student_id ?? ''}
            onChange={(event) => onAssignStudent(rowKey, event.target.value || null)}
          >
            <option value="">Seçin…</option>
            {students.map((student) => {
              const taken = usedStudentIds.has(student.id) && student.id !== row.student_id;
              return (
                <option key={student.id} value={student.id} disabled={taken}>
                  {student.full_name}
                  {student.student_number ? ` · ${student.student_number}` : ''}
                  {taken ? ' · başka satırda' : ''}
                </option>
              );
            })}
          </select>
        </label>

        <div className="exam-import-review-row__actions">
          {hasStudent ? (
            <button
              type="button"
              className="demo-btn demo-btn--primary"
              onClick={() => onConfirmRow(rowKey)}
            >
              Doğru, onayla
            </button>
          ) : null}
          <button type="button" className="demo-btn" onClick={() => onMarkExternal(rowKey, true)}>
            Dışarıdan katılıyor
          </button>
        </div>
      </div>
    </details>
  );
}

export default function OgrenciImportOnayDialog({
  open,
  studentPreview = [],
  questions = [],
  students = [],
  questionCount = 0,
  expandedRows,
  onToggleRow,
  onAssignStudent,
  onConfirmRow,
  onMarkExternal,
  onUndoDecision,
  saving = false,
  onCancel,
  onConfirm,
}) {
  const pendingRows = useMemo(() => studentPreview.filter(rowNeedsDecision), [studentPreview]);
  const decidedRows = useMemo(() => studentPreview.filter((row) => row.decision), [studentPreview]);
  const importCount = studentPreview.filter((row) => row.student_id && !row.external).length;
  const autoCount = studentPreview.filter(
    (row) => row.student_id && !row.external && !row.decision && !rowNeedsDecision(row)
  ).length;
  const pendingCount = pendingRows.length;

  const usedStudentIds = useMemo(
    () =>
      new Set(
        studentPreview.filter((row) => row.student_id && !row.external).map((row) => row.student_id)
      ),
    [studentPreview]
  );

  if (!open) return null;

  return createPortal(
    <div className="app-dialog" role="presentation" onClick={saving ? undefined : onCancel}>
      <div
        className="app-dialog__panel exam-import-review-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-import-review-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="student-import-review-title" className="app-dialog__title">
          Öğrenci cevaplarını onayla
        </h2>
        <p className="app-dialog__lead">
          {questionCount || questions.length} soru · {autoCount} öğrenci otomatik eşleşti.{' '}
          {pendingCount
            ? `${pendingCount} satır için karar verin: öğrenciyi seçin/onaylayın ya da «Dışarıdan katılıyor» deyin. Bu kararlar sonraki denemelere taşınmaz.`
            : 'Tüm kararlar verildi.'}
        </p>

        <div className="exam-import-review-dialog__list">
          {pendingCount === 0 ? (
            <p className="dash-hint exam-import-review-dialog__empty">
              Bekleyen karar yok. {importCount} öğrenci içe aktarılacak.
            </p>
          ) : (
            pendingRows.map((row) => {
              const rowKey = rowKeyOf(row);
              return (
                <PendingRow
                  key={rowKey}
                  row={row}
                  questions={questions}
                  students={students}
                  usedStudentIds={usedStudentIds}
                  onAssignStudent={onAssignStudent}
                  onConfirmRow={onConfirmRow}
                  onMarkExternal={onMarkExternal}
                  expanded={expandedRows.has(rowKey)}
                  onToggle={onToggleRow}
                />
              );
            })
          )}

          {decidedRows.length ? (
            <div className="exam-import-decided">
              <p className="exam-import-decided__title">Verilen kararlar</p>
              <ul className="exam-import-decided__list">
                {decidedRows.map((row) => {
                  const rowKey = rowKeyOf(row);
                  return (
                    <li key={rowKey} className="exam-import-decided__item">
                      <span className="exam-import-decided__text">
                        <strong>{row.student_name || row.studentName}</strong>
                        <span className="dash-hint">
                          {row.decision === 'external' ? '' : '→ '}
                          {decisionText(row)}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="demo-btn demo-btn--ghost"
                        onClick={() => onUndoDecision(rowKey)}
                      >
                        Geri al
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="app-dialog__actions">
          <button type="button" className="demo-btn demo-btn--ghost" disabled={saving} onClick={onCancel}>
            İptal
          </button>
          <button
            type="button"
            className="demo-btn demo-btn--primary"
            disabled={saving || importCount === 0 || pendingCount > 0}
            onClick={onConfirm}
          >
            {saving
              ? 'Aktarılıyor…'
              : pendingCount
                ? `${pendingCount} karar bekliyor`
                : `${importCount} öğrenciyi içe aktar`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
