import { getSupabaseAdmin, buildPushItems, fetchSubscriptionRows, sendWebPushItems } from './_lib/webPush.js';
import { buildPushIconUrl, fetchSchoolBrandingById, getRequestOrigin } from './_lib/tenant.js';

const KIND = 'class_homework';

function childFirstName(fullName) {
  return fullName?.trim().split(/\s+/)[0] ?? 'Çocuğunuz';
}

/** Notifies the parents of every class that received the homework batch. */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { batchId, schoolId } = req.body ?? {};
  if (!batchId || !schoolId) {
    return res.status(400).json({ error: 'batchId and schoolId required' });
  }

  try {
    const { adminDb } = getSupabaseAdmin();

    const { data: homework, error: homeworkError } = await adminDb
      .from('class_homework')
      .select('id, class_id, subject_label, title, due_on')
      .eq('batch_id', batchId)
      .eq('school_id', schoolId);
    if (homeworkError) throw homeworkError;
    if (!homework?.length) {
      return res.status(404).json({ error: 'Homework not found' });
    }

    const classIds = homework.map((row) => row.class_id);
    const { data: students, error: studentsError } = await adminDb
      .from('students')
      .select('id, full_name, class_id')
      .eq('school_id', schoolId)
      .in('class_id', classIds);
    if (studentsError) throw studentsError;

    const studentIds = (students ?? []).map((row) => row.id);
    if (!studentIds.length) {
      return res.status(200).json({ inserted: 0, sent: 0, message: 'No students to notify' });
    }

    const { data: parentLinks, error: parentError } = await adminDb
      .from('student_parents')
      .select('parent_id, student_id')
      .in('student_id', studentIds);
    if (parentError) throw parentError;

    const homeworkByClass = Object.fromEntries(homework.map((row) => [row.class_id, row]));
    const studentById = Object.fromEntries((students ?? []).map((row) => [row.id, row]));

    const tenant = await fetchSchoolBrandingById(schoolId);
    const origin = getRequestOrigin(req) ?? process.env.APP_ORIGIN ?? null;
    const pushIcon = buildPushIconUrl(origin, tenant);

    let inserted = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const link of parentLinks ?? []) {
      const student = studentById[link.student_id];
      const item = student ? homeworkByClass[student.class_id] : null;
      if (!student || !item) continue;

      const { data: existing } = await adminDb
        .from('parent_notifications')
        .select('id')
        .eq('parent_id', link.parent_id)
        .eq('student_id', link.student_id)
        .eq('kind', KIND)
        .eq('class_homework_id', item.id)
        .maybeSingle();
      if (existing) {
        skipped += 1;
        continue;
      }

      const title = 'Yeni ödev';
      const body = `${childFirstName(student.full_name)} için ${item.subject_label} ödevi: ${item.title}`;

      const { data: notification, error: insertError } = await adminDb
        .from('parent_notifications')
        .insert({
          school_id: schoolId,
          parent_id: link.parent_id,
          student_id: link.student_id,
          kind: KIND,
          class_homework_id: item.id,
          week_index: null,
          title,
          body,
        })
        .select('id')
        .single();
      if (insertError) throw insertError;
      inserted += 1;

      const subscriptionRows = await fetchSubscriptionRows(adminDb, {
        targetType: 'student',
        targetId: link.student_id,
        studentIds: [link.student_id],
      });
      const tag = `class-homework-${item.id}-${link.student_id}`;
      const items = buildPushItems(subscriptionRows, { body, url: '/', tag });

      if (items.length) {
        const pushResult = await sendWebPushItems(items, { title: tenant.name, icon: pushIcon, tag });
        sent += pushResult.sent;
        failed += pushResult.failed;
        if (pushResult.sent > 0) {
          await adminDb
            .from('parent_notifications')
            .update({ push_sent_at: new Date().toISOString() })
            .eq('id', notification.id);
        }
      }
    }

    return res.status(200).json({ inserted, sent, failed, skipped, batchId });
  } catch (error) {
    console.error('class-homework-notify error:', error);
    return res.status(500).json({ error: error.message ?? 'Internal server error' });
  }
}
