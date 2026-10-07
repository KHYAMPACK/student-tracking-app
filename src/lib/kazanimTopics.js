import { LGS8_KAZANIM_TOPICS } from './lgsKazanimTopics';

const MIN_SEGMENTS = 4;

export function normalizeKazanimCode(raw) {
  const compact = String(raw ?? '')
    .toLocaleUpperCase('tr')
    .replace(/\s+/g, '');
  if (!/^[A-ZÇĞİÖŞÜ]{1,4}\.\d/.test(compact)) return '';
  return compact.endsWith('.') ? compact : `${compact}.`;
}

/**
 * Topic for a kazanım code: the exact code if the table has it, otherwise the nearest
 * parent code (T.8.3.25.6 → T.8.3.25), otherwise null so the caller can ask the user.
 */
export function lookupKazanimTopic(rawCode) {
  const code = normalizeKazanimCode(rawCode);
  if (!code) return null;

  const exact = LGS8_KAZANIM_TOPICS[code];
  if (exact) return { match: 'exact', code, subject: exact[0], konu: exact[1], unit: exact[2] };

  const segments = code.slice(0, -1).split('.');
  while (segments.length > MIN_SEGMENTS) {
    segments.pop();
    const parentCode = `${segments.join('.')}.`;
    const parent = LGS8_KAZANIM_TOPICS[parentCode];
    if (parent) {
      return {
        match: 'parent',
        code: parentCode,
        subject: parent[0],
        konu: parent[1],
        unit: parent[2],
      };
    }
  }
  return null;
}
