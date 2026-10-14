/**
 * Parent-facing release notes. Only things a parent can see or use; staff changes live in
 * staffChangelog.js. Add a new entry at the top whenever the parent panel changes.
 */
export const PARENT_CHANGELOG = [
  {
    id: 'parent-2026-10-14',
    title: 'Veli paneli yenilikleri',
    publishedOn: '2026-10-14',
    intro: 'Haftalık özet zenginleşti, deneme sonuçları daha doğru ve okunaklı hale geldi.',
    items: [
      {
        title: 'Haftalık özette son deneme sonucu',
        summary:
          'Okulun velilere açtığı en son deneme; net, puan, kurum ve sınıf sıralaması ile ders bazında doğru/yanlış/boş tablosuyla Haftalık özetin en üstünde görünür.',
      },
      {
        title: 'Sınıf ödevleri',
        summary:
          'Öğretmenlerin sınıfa verdiği ödevler Haftalık özette «Ödevler» bölümünde ders, başlık ve teslim tarihiyle görünür. Yeni ödev verildiğinde hemen bildirim alırsınız. Bu bölüm yalnızca okumak içindir.',
      },
      {
        title: 'Öğretmen notları',
        summary:
          'Öğretmenler soru çözümünden sonra öğrenci için kısa bir not bırakabilir. Çocuğunuza yazılan notlar Haftalık özette gün ve ders adıyla «Öğretmen notları» bölümünde görünür.',
      },
      {
        title: 'Deneme puanı',
        summary:
          'Puan artık okulun deneme için belirlediği ders katsayılarıyla hesaplanıyor ve yayınevi listesindeki gibi iki ondalıkla gösteriliyor. Sıralama puana göre yapılıyor. D/Y/B tablosunun hizası da düzeltildi.',
      },
      {
        title: 'Haftalık programda Rehberlik',
        summary: 'Rehberlik dersi artık haftalık ders programında kendi rengiyle görünür.',
      },
      {
        title: 'Daha rahat kullanım',
        summary:
          'Giriş ekranında PIN’i göster/gizle düğmesi var. Başka bir sekmeden uygulamaya döndüğünüzde sayfa artık yenilenmiyor. «Anlık bildirimler» penceresi X veya «Şimdi değil» ile kapatılabilir.',
      },
    ],
  },
];

const STORAGE_PREFIX = 'parentChangelogSeen:';

function readSeenIds(profileId) {
  if (!profileId || typeof window === 'undefined') return new Set();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(`${STORAGE_PREFIX}${profileId}`) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function getUnseenParentChangelog(profileId) {
  if (!profileId) return [];
  const seen = readSeenIds(profileId);
  return PARENT_CHANGELOG.filter((entry) => !seen.has(entry.id));
}

export function markParentChangelogSeen(profileId, entryIds) {
  if (!profileId || !entryIds?.length || typeof window === 'undefined') return;
  const seen = readSeenIds(profileId);
  for (const id of entryIds) seen.add(id);
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${profileId}`, JSON.stringify([...seen]));
  } catch {
    // Storage blocked (private mode): the note simply shows again next time.
  }
}
