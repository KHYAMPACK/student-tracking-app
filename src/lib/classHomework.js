import { supabase } from './supabase';
import { withSchoolFilter } from './tenant';
import { istanbulDateIso } from './calendar';

export const CLASS_HOMEWORK_SELECT =
  'id, school_id, batch_id, class_id, created_by, author_name, subject_label, title, description, due_on, created_at';

/** Rows given together share a batch_id; this folds them into one entry with its class list. */
export function groupHomeworkBatches(rows) {
  const batches = new Map();
  for (const row of rows ?? []) {
    const current = batches.get(row.batch_id);
    if (current) {
      current.classIds.push(row.class_id);
    } else {
      batches.set(row.batch_id, { ...row, classIds: [row.class_id] });
    }
  }
  return [...batches.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Staff: own homework, or everything for a director. */
export async function loadStaffClassHomework(schoolId, { createdBy } = {}) {
  let query = supabase
    .from('class_homework')
    .select(CLASS_HOMEWORK_SELECT)
    .order('created_at', { ascending: false })
    .limit(300);
  if (createdBy) query = query.eq('created_by', createdBy);
  const { data, error } = await withSchoolFilter(query, schoolId);
  if (error) throw error;
  return data ?? [];
}

/** Parents: homework for their child's class that is still relevant. */
export async function loadClassHomeworkForClass(classId) {
  if (!classId) return [];
  const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('class_homework')
    .select(CLASS_HOMEWORK_SELECT)
    .eq('class_id', classId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  const today = istanbulDateIso();
  return (data ?? []).filter((row) => !row.due_on || row.due_on >= today);
}

export async function createClassHomework({
  schoolId,
  classIds,
  createdBy,
  authorName,
  subjectLabel,
  title,
  description,
  dueOn,
}) {
  const batchId = crypto.randomUUID();
  const rows = classIds.map((classId) => ({
    school_id: schoolId,
    batch_id: batchId,
    class_id: classId,
    created_by: createdBy,
    author_name: authorName || 'Öğretmen',
    subject_label: subjectLabel.trim(),
    title: title.trim(),
    description: description.trim(),
    due_on: dueOn || null,
  }));
  const { error } = await supabase.from('class_homework').insert(rows);
  if (error) throw error;
  return batchId;
}

export async function deleteClassHomeworkBatch(batchId) {
  const { error } = await supabase.from('class_homework').delete().eq('batch_id', batchId);
  if (error) throw error;
}

export async function notifyClassHomework({ batchId, schoolId }) {
  const response = await fetch('/api/homework-notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batchId, schoolId }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? 'Ödev bildirimi gönderilemedi');
  }
  return response.json();
}
