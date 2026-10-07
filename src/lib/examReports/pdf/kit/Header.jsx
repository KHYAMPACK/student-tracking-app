import { Text, View } from '@react-pdf/renderer';
import { StyleSheet } from '@react-pdf/renderer';
import { theme } from './theme';

const s = StyleSheet.create({
  full: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 8,
    marginBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.accent,
  },
  left: {
    flexShrink: 1,
    paddingRight: 12,
  },
  eyebrow: {
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: 0.8,
    color: theme.accent,
    marginBottom: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: theme.ink,
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 8.5,
    color: theme.muted,
    marginTop: 3,
  },
  meta: {
    flexDirection: 'row',
    gap: 14,
  },
  metaItem: {
    alignItems: 'flex-end',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: 700,
    color: theme.ink,
  },
  metaLabel: {
    fontSize: 6.5,
    color: theme.muted,
    marginTop: 1,
  },
  compact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 5,
    marginBottom: 8,
    borderBottomWidth: 0.75,
    borderBottomColor: theme.lineStrong,
  },
  compactTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: theme.ink,
  },
  compactSub: {
    fontSize: 7,
    color: theme.muted,
  },
});

/**
 * Page header: school eyebrow, report title, subtitle and a few key figures on the right.
 * @param {{ schoolName?: string, title: string, subtitle?: string, meta?: { label: string, value: string }[] }} props
 */
export function ReportHeader({ schoolName, title, subtitle, meta = [] }) {
  return (
    <View style={s.full}>
      <View style={s.left}>
        {schoolName ? <Text style={s.eyebrow}>{String(schoolName).toLocaleUpperCase('tr-TR')}</Text> : null}
        <Text style={s.title}>{title}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {meta.length ? (
        <View style={s.meta}>
          {meta.map((item) => (
            <View key={item.label} style={s.metaItem}>
              <Text style={s.metaValue}>{item.value}</Text>
              <Text style={s.metaLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Slim running header for continuation pages. */
export function CompactHeader({ title, subtitle }) {
  return (
    <View style={s.compact}>
      <Text style={s.compactTitle}>{title}</Text>
      {subtitle ? <Text style={s.compactSub}>{subtitle}</Text> : null}
    </View>
  );
}
