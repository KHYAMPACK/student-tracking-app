import { StyleSheet } from '@react-pdf/renderer';

export const theme = {
  ink: '#0f172a',
  body: '#1e293b',
  muted: '#64748b',
  faint: '#94a3b8',
  line: '#e2e8f0',
  lineStrong: '#cbd5e1',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  tint: '#eef2ff',
  accent: '#4338ca',
  accentSoft: '#c7d2fe',
  headerBg: '#1e293b',
  headerGroupBg: '#0f172a',
  headerText: '#ffffff',
  headerMuted: '#cbd5e1',
  good: '#15803d',
  goodSoft: '#dcfce7',
  bad: '#b91c1c',
  badSoft: '#fee2e2',
  warn: '#b45309',
  warnSoft: '#fef3c7',
};

const A4 = { w: 841.89, h: 595.28 };

/** Usable content box per orientation (points). */
export const PAGE = {
  landscape: {
    width: A4.w,
    height: A4.h,
    marginX: 24,
    marginTop: 22,
    marginBottom: 38,
    content: Math.floor(A4.w - 48),
  },
  portrait: {
    width: A4.h,
    height: A4.w,
    marginX: 28,
    marginTop: 26,
    marginBottom: 40,
    content: Math.floor(A4.h - 56),
  },
};

/** Publisher / official LGS booklet order. */
export const PDF_SUBJECT_ORDER = ['turkce', 'inkilap', 'din', 'ingilizce', 'matematik', 'fen'];

export const PDF_SUBJECT_LABELS = {
  turkce: 'TÜRKÇE',
  inkilap: 'İNKILAP TARİHİ',
  din: 'DİN KÜLTÜRÜ',
  ingilizce: 'İNGİLİZCE',
  matematik: 'MATEMATİK',
  fen: 'FEN BİLİMLERİ',
};

export const PDF_SUBJECT_SHORT = {
  turkce: 'Türkçe',
  inkilap: 'İnkılap',
  din: 'Din',
  ingilizce: 'İngilizce',
  matematik: 'Matematik',
  fen: 'Fen',
};

export const kitStyles = StyleSheet.create({
  pageLandscape: {
    fontFamily: 'NotoSans',
    fontSize: 7,
    color: theme.body,
    backgroundColor: theme.surface,
    paddingTop: PAGE.landscape.marginTop,
    paddingBottom: PAGE.landscape.marginBottom,
    paddingHorizontal: PAGE.landscape.marginX,
  },
  pagePortrait: {
    fontFamily: 'NotoSans',
    fontSize: 8,
    color: theme.body,
    backgroundColor: theme.surface,
    paddingTop: PAGE.portrait.marginTop,
    paddingBottom: PAGE.portrait.marginBottom,
    paddingHorizontal: PAGE.portrait.marginX,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: theme.ink,
    marginTop: 10,
    marginBottom: 5,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
});
