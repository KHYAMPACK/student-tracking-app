import { useCallback, useEffect, useMemo, useState } from 'react';
import { useActiveRole } from '../../context/ActiveRoleContext';
import { USER_ROLES } from '../../lib/roles';
import { formatClassLabel, getTeacherSubjectSlug, loadSchoolClasses } from '../../lib/curriculum';
import { teacherBranchLabel } from '../../lib/teacherBranches';
import { formatCalendarDateTr, istanbulDateIso } from '../../lib/calendar';
import {
  createClassHomework,
  deleteClassHomeworkBatch,
  groupHomeworkBatches,
  loadStaffClassHomework,
  notifyClassHomework,
} from '../../lib/classHomework';
import { InlineError, SendButton, SuccessMessage } from '../dashboardUi';

const SUBJECT_PRESETS = ['Matematik', 'Türkçe', 'Fen', 'Sosyal', 'İngilizce', 'Din'];

/** Free-text homework for one or several classes at once; parents see it read-only. */
export default function ClassHomeworkSection({ profile, schoolId }) {
  const { activeRole } = useActiveRole();
  const isDirector = activeRole === USER_ROLES.director;

  const [classes, setClasses] = useState([]);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [subject, setSubject] = useState(() => teacherBranchLabel(getTeacherSubjectSlug(profile)) || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueOn, setDueOn] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const load = useCallback(async () => {
    try {
      const [classRows, homeworkRows] = await Promise.all([
        loadSchoolClasses(schoolId),
        loadStaffClassHomework(schoolId, { createdBy: isDirector ? null : profile.id }),
      ]);
      setClasses(classRows);
      setRows(homeworkRows);
    } catch (loadError) {
      setError(loadError);
    }
  }, [schoolId, profile.id, isDirector]);

  useEffect(() => {
    load();
  }, [load]);

  const classLabelById = useMemo(
    () => new Map(classes.map((klass) => [klass.id, formatClassLabel(klass.grade, klass.name)])),
    [classes]
  );
  const batches = useMemo(() => groupHomeworkBatches(rows), [rows]);

  function toggleClass(classId) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!selected.size) {
      setError(new Error('En az bir şube seçin.'));
      return;
    }
    if (!subject.trim() || !title.trim()) {
      setError(new Error('Ders ve başlık gerekli.'));
      return;
    }
    setSaving(true);
    try {
      const batchId = await createClassHomework({
        schoolId,
        classIds: [...selected],
        createdBy: profile.id,
        authorName: profile.full_name,
        subjectLabel: subject,
        title,
        description,
        dueOn,
      });
      let notified = '';
      try {
        const result = await notifyClassHomework({ batchId, schoolId });
        notified = ` ${result.inserted ?? 0} veliye bildirim gitti.`;
      } catch {
        notified = ' Bildirim gönderilemedi; ödev yine de velilere görünür.';
      }
      setSuccess(`Ödev ${selected.size} şubeye verildi.${notified}`);
      setSelected(new Set());
      setTitle('');
      setDescription('');
      setDueOn('');
      await load();
    } catch (saveError) {
      setError(saveError);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(batch) {
    if (deletingId) return;
    setDeletingId(batch.batch_id);
    setError(null);
    setSuccess(null);
    try {
      await deleteClassHomeworkBatch(batch.batch_id);
      setRows((current) => current.filter((row) => row.batch_id !== batch.batch_id));
    } catch (deleteError) {
      setError(deleteError);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="demo-stack">
      <form className="dash-form dash-card" onSubmit={handleSubmit}>
        <h2 className="dash-section-title">Sınıfa ödev ver</h2>
        <p className="dash-hint">
          Bir veya birden fazla şube seçin. Veliler ödevi Haftalık özetlerinde görür ve hemen bildirim alır.
        </p>

        <div>
          <p className="dash-label">Şubeler</p>
          <div className="cur-assign-chips" role="group" aria-label="Şube seçimi">
            {classes.map((klass) => (
              <button
                key={klass.id}
                type="button"
                className={`cur-assign-chip${selected.has(klass.id) ? ' cur-assign-chip--active' : ''}`}
                aria-pressed={selected.has(klass.id)}
                onClick={() => toggleClass(klass.id)}
              >
                {formatClassLabel(klass.grade, klass.name)}
              </button>
            ))}
          </div>
        </div>

        <label className="dash-label">
          Ders
          <input
            className="dash-input"
            list="class-homework-subjects"
            value={subject}
            maxLength={40}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Matematik"
          />
          <datalist id="class-homework-subjects">
            {SUBJECT_PRESETS.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="dash-label">
          Başlık
          <input
            className="dash-input"
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Sayfa 40–45, 12 soru"
          />
        </label>

        <label className="dash-label">
          Açıklama (isteğe bağlı)
          <textarea
            className="dash-textarea"
            rows={3}
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <label className="dash-label">
          Teslim tarihi (isteğe bağlı)
          <input
            className="dash-input"
            type="date"
            min={istanbulDateIso()}
            value={dueOn}
            onChange={(event) => setDueOn(event.target.value)}
          />
        </label>

        {error ? <InlineError error={error} context="general" /> : null}
        {success ? <SuccessMessage message={success} /> : null}
        <SendButton sending={saving} label="Ödevi ver" sendingLabel="Gönderiliyor…" />
      </form>

      <section className="dash-card">
        <h2 className="dash-section-title">{isDirector ? 'Tüm sınıf ödevleri' : 'Verdiğim ödevler'}</h2>
        {batches.length === 0 ? (
          <p className="dash-hint">Henüz ödev yok.</p>
        ) : (
          <ul className="exam-list">
            {batches.map((batch) => (
              <li key={batch.batch_id} className="class-homework-item">
                <div className="class-homework-item__main">
                  <strong>
                    {batch.subject_label} · {batch.title}
                  </strong>
                  <span className="dash-hint">
                    {batch.classIds.map((id) => classLabelById.get(id) ?? '—').join(', ')}
                    {batch.due_on ? ` · Teslim: ${formatCalendarDateTr(batch.due_on)}` : ''}
                    {isDirector ? ` · ${batch.author_name}` : ''}
                  </span>
                  {batch.description ? <p className="dash-hint">{batch.description}</p> : null}
                </div>
                <button
                  type="button"
                  className="demo-btn demo-btn--danger"
                  disabled={Boolean(deletingId)}
                  onClick={() => handleDelete(batch)}
                >
                  {deletingId === batch.batch_id ? 'Siliniyor…' : 'Sil'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
