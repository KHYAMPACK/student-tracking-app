import { StyleSheet, Text, View } from '@react-pdf/renderer';
import { theme } from './theme';

const s = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: theme.line,
    fontSize: 6.5,
    color: theme.muted,
  },
});

/** Fixed footer with page numbers. `inset` matches the page's horizontal padding. */
export function ReportFooter({ schoolName, label, generatedAt, inset = 24 }) {
  return (
    <View style={[s.footer, { left: inset, right: inset }]} fixed>
      <Text>
        {[schoolName, label].filter(Boolean).join(' · ')}
        {generatedAt ? `  ·  ${generatedAt}` : ''}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `Sayfa ${pageNumber} / ${totalPages}`} />
    </View>
  );
}
