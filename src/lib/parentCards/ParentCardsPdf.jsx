import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { registerPdfFonts } from '../examReports/pdf/registerFonts';

const s = StyleSheet.create({
  page: {
    fontFamily: 'NotoSans',
    padding: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  cell: { width: '50%', height: '25%', padding: 6 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94a3b8',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'space-between',
  },
  school: { fontSize: 11, fontWeight: 700, color: '#4338ca' },
  title: { fontSize: 8, color: '#64748b', marginTop: 1 },
  who: { fontSize: 8.5, color: '#0f172a', marginTop: 6 },
  label: { fontSize: 7, color: '#64748b', marginTop: 6 },
  user: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
  pin: { fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: 3 },
  address: { fontSize: 8.5, fontWeight: 700, color: '#0f172a', marginTop: 6 },
  hint: { fontSize: 6.5, color: '#64748b', marginTop: 2 },
});

function chunk(items, size) {
  const pages = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

/**
 * Cut-out login cards, 8 per A4 page.
 * @param {{ schoolName: string, address: string, cards: { parentName: string, children: string[], username: string, pin: string }[] }} props
 */
export function ParentCardsPdf({ schoolName, address, cards }) {
  registerPdfFonts();
  return (
    <Document title={`${schoolName} — Veli giriş kartları`} author={schoolName}>
      {chunk(cards, 8).map((pageCards, pageIndex) => (
        <Page key={pageIndex} size="A4" style={s.page}>
          {pageCards.map((card) => (
            <View key={card.username} style={s.cell} wrap={false}>
              <View style={s.card}>
                <View>
                  <Text style={s.school}>{schoolName}</Text>
                  <Text style={s.title}>Veli giriş bilgileri</Text>
                  <Text style={s.who} maxLines={1}>
                    {card.parentName}
                  </Text>
                  {card.children.length ? (
                    <Text style={s.title} maxLines={2}>
                      {card.children.join(', ')}
                    </Text>
                  ) : null}
                </View>
                <View>
                  <Text style={s.label}>Kullanıcı adı</Text>
                  <Text style={s.user}>{card.username}</Text>
                  <Text style={s.label}>PIN</Text>
                  <Text style={s.pin}>{card.pin}</Text>
                </View>
                <View>
                  <Text style={s.address}>{address}</Text>
                  <Text style={s.hint}>
                    Tarayıcıdan açıp «Ana ekrana ekle» derseniz uygulama gibi kullanabilirsiniz.
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
