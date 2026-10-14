import { supabase } from './supabase';

const ACTIVE_DAYS = 14;

export async function loadParentAdoption() {
  const { data, error } = await supabase.rpc('get_parent_adoption');
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.parent_id, row]));
}

/** Where parents open the app: the school's own domain if it has one, else the current origin. */
export function schoolAppAddress(school) {
  const domain = school?.custom_domain?.trim();
  if (domain) return domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return typeof window === 'undefined' ? '' : window.location.host;
}

/**
 * Splits parents into who has never opened the app, who is active, and who could get push,
 * and finds students nobody is linked to.
 */
export function summarizeAdoption({ parents, students, links, adoption }) {
  const now = Date.now();
  const linkedStudentIds = new Set(links.map((link) => link.student_id));
  const rows = parents.map((parent) => {
    const info = adoption.get(parent.id);
    const lastSignInAt = info?.last_sign_in_at ?? null;
    const active = lastSignInAt ? now - new Date(lastSignInAt).getTime() <= ACTIVE_DAYS * 86400000 : false;
    return {
      parent,
      lastSignInAt,
      neverSignedIn: !lastSignInAt,
      active,
      hasPush: Boolean(info?.has_push),
    };
  });

  return {
    rows,
    unlinkedStudents: students.filter((student) => !linkedStudentIds.has(student.id)),
    totals: {
      parents: rows.length,
      everSignedIn: rows.filter((row) => !row.neverSignedIn).length,
      active: rows.filter((row) => row.active).length,
      withPush: rows.filter((row) => row.hasPush).length,
    },
  };
}

export function loginCardText({ schoolName, address, parentName, username, pin }) {
  return [
    `${schoolName} — Veli giriş bilgileri`,
    `Veli: ${parentName}`,
    `Kullanıcı adı: ${username}`,
    `PIN: ${pin}`,
    `Adres: ${address}`,
    'Tarayıcıdan açıp «Ana ekrana ekle» derseniz uygulama gibi kullanabilirsiniz.',
  ].join('\n');
}

export function whatsappShareUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
