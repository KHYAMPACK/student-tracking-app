import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { previewOptikEntryStats } from '../../lib/examOptikImport';
import { rowNeedsDecision } from '../../lib/examNameMatch';

function rowKeyOf(row) {
  return row.rowNumber ?? row.student_number ?? row.studentName ?? 'row';
}

function StudentReviewRow({
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
  const external = Boolean(row.external);
  const matched = Boolean(row.student_id) && !external;
  const needsDecision = rowNeedsDecision(row);

  let badge = { label: 'Eşleşti', tone: 'ok' };
  if (external) badge = { label: 'Dışarıdan', tone: 'muted' };
  else if (!row.student_id) badge = { label: 'Eşleşmedi', tone: 'warn' };
  else if (needsDecision) badge = { label: 'Onay bekliyor', tone: 'warn' };

  return (
    <details
      className={`exam-import-review-row${expanded ? ' exam-import-review-row--open' : ''}${needsDecision ? ' exam-import-review-row--issue' : ''}`}
      open={expanded}
      onToggle={(event) => onToggle(rowKey, event.currentTarget.open)}
    >
      <summary className="exam-import-review-row__summary">
        <span className="exam-import-review-row__title">
          {row.studentName || row.student_number || '—'}
        </span>
        <span className="exam-import-review-row__meta">
          {row.student_number ? <span className="dash-hint">No {row.student_number}</span> : null}
          {row.booklet ? <span className="dash-hint">Kitapçık {row.booklet}</span> : null}
          <span
            className={`exam-student-review__badge${badge.tone === 'ok' ? ' exam-student-review__badge--ok' : badge.tone === 'warn' ? ' exam-student-review__badge--warn' : ''}`}
          >
            {badge.label}
          </span>
          {matched ? (
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

        {external ? (
          <div className="exam-import-wizard__actions">
            <p className="dash-hint">Dışarıdan katılıyor; bu satır içe aktarılmayacak.</p>
            <button
              type="button"
              className="demo-btn demo-btn--ghost"
              onClick={() => onMarkExternal(rowKey, false)}
            >
              Geri al
            </button>
          </div>
        ) : needsDecision ? (
          <>
            <label className="dash-label exam-import-review-row__assign">
              {row.student_id ? 'Başka öğrenci seç' : 'Öğrenci eşleştir'}
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
            <div className="exam-import-wizard__actions">
              {row.student_id ? (
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
          </>
        ) : null}

        {!external ? (
          <>
            <div className="exam-student-review__subjects">
              {stats.subjects
                .filter((subject) => subject.correct + subject.wrong + subject.blank > 0)
                .map((subject) => (
                  <span key={subject.subject_code} className="exam-student-review__subject-chip">
                    {subject.shortLabel}: {subject.net.toFixed(1)} net
                  </span>
                ))}
            </div>

            <div className="exam-grid-wrap">
              <table className="exam-entry-grid exam-student-review__grid">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>CVP</th>
                    <th>Öğr.</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {(questions ?? []).map((question) => {
                    const choice = row.choices?.[question.question_index] ?? '';
                    let status = 'blank';
                    if (choice) {
                      status = choice === question.correct_choice ? 'correct' : 'wrong';
                    }
                    return (
                      <tr
                        key={question.question_index}
                        className={`exam-student-review__choice exam-student-review__choice--${status}`}
                      >
                        <td>{question.question_index}</td>
                        <td>{question.correct_choice ?? '—'}</td>
                        <td>{choice || '—'}</td>
                        <td>{status === 'correct' ? 'D' : status === 'wrong' ? 'Y' : 'B'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
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
  studentFilter,
  onStudentFilterChange,
  expandedRows,
  onToggleRow,
  onAssignStudent,
  onConfirmRow,
  onMarkExternal,
  saving = false,
  onCancel,
  onConfirm,
}) {
  const importCount = studentPreview.filter((row) => row.student_id && !row.external).length;
  const externalCount = studentPreview.filter((row) => row.external).length;
  const pendingCount = studentPreview.filter(rowNeedsDecision).length;

  const usedStudentIds = useMemo(
    () =>
      new Set(
        studentPreview.filter((row) => row.student_id && !row.external).map((row) => row.student_id)
      ),
    [studentPreview]
  );

  const filteredPreview = useMemo(() => {
    if (studentFilter === 'matched') {
      return studentPreview.filter((row) => row.student_id && !row.external);
    }
    if (studentFilter === 'issues') {
      return studentPreview.filter(rowNeedsDecision);
    }
    return studentPreview;
  }, [studentPreview, studentFilter]);

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
          {questionCount || questions.length} soru · {importCount} aktarılacak
          {pendingCount ? ` · ${pendingCount} karar bekliyor` : ''}
          {externalCount ? ` · ${externalCount} dışarıdan katılıyor` : ''}. Eşleşmeyen veya
          tahminle eşleşen öğrenciler için öğrenciyi seçin/onaylayın ya da «Dışarıdan katılıyor»
          deyin. Bu kararlar sonraki denemelere taşınmaz.
        </p>

        <div className="exam-student-review__filters" role="group" aria-label="Öğrenci filtresi">
          {[
            { id: 'all', label: 'Tümü' },
            { id: 'matched', label: 'Aktarılacaklar' },
            { id: 'issues', label: 'Karar bekleyen' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`cur-assign-chip${studentFilter === item.id ? ' cur-assign-chip--active' : ''}`}
              onClick={() => onStudentFilterChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="exam-import-review-dialog__list">
          {filteredPreview.length === 0 ? (
            <p className="dash-hint exam-import-review-dialog__empty">Bu filtrede öğrenci yok.</p>
          ) : (
            filteredPreview.map((row) => {
              const rowKey = rowKeyOf(row);
              return (
                <StudentReviewRow
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
        </div>

        <p className="dash-hint exam-import-review-dialog__progress">
          {pendingCount
            ? `${pendingCount} satır için karar verin`
            : `${importCount} öğrenci aktarılacak`}
        </p>

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
                : `${importCount} öğrenciyi onayla ve içe aktar`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
