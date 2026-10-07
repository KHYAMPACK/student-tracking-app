import { STAFF_ROLES } from './roles';
import { normalizeProfileRoles } from './profileRoles';

/**
 * Staff-only release notes. Add a new entry at the top whenever you ship
 * panel changes staff should know about.
 *
 * - id: unique string (e.g. YYYY-MM-DD slug). Bump when publishing.
 * - roles: omit or null = all staff; otherwise limit to listed roles.
 * - items[].roles: optional per-item role filter.
 */
export const STAFF_CHANGELOG = [
  {
    id: '2026-10-07-sekme-yenileme',
    title: 'Sekme değiştirince uygulama artık yenilenmiyor',
    publishedOn: '2026-10-07',
    intro:
      'Başka bir sekmeden uygulamaya geri döndüğünüzde sayfa kendiliğinden «Profiliniz yükleniyor…» ekranına düşüp açık olduğunuz yeri kaybediyordu; düzeltildi.',
    items: [
      {
        title: 'Açık sayfa korunuyor',
        summary:
          'Sekmeler arasında gezerken, uygulamayı arka planda bırakıp döndüğünüzde veya oturum kendini yenilediğinde açık olduğunuz sekme, yazdığınız form ve kaydırma konumu olduğu gibi kalır. Profil yalnızca farklı bir kullanıcı giriş yaptığında yeniden yüklenir.',
      },
    ],
  },
  {
    id: '2026-10-07-raporlar',
    title: 'Deneme raporları yenilendi, sonuç listesi eklendi',
    publishedOn: '2026-10-07',
    intro:
      'Tüm deneme PDF raporları baştan tasarlandı: daha okunaklı, doğru hizalanmış tablolar ve yeni bir deneme sonuç listesi.',
    items: [
      {
        title: 'Yeni: Deneme sonuç listesi',
        summary:
          'Raporlar → Tek deneme bölümünden alınır. Seçilen denemede her öğrencinin ders bazlı doğru/yanlış/net değerleri, puanı ve sıralaması puana göre sıralı tek listede gelir; en üstte kurum ortalaması yer alır. Yayınevinin gönderdiği sonuç listesinin aynı düzenidir.',
        steps: [
          'Raporlar → «Hangi deneme?» listesinden denemeyi seçin.',
          '«Deneme sonuç listesi» kartında «PDF oluştur»a basın.',
        ],
        roles: ['director', 'counselor', 'teacher'],
      },
      {
        title: 'Yenilenen PDF görünümü',
        summary:
          'Şube ortalama listesi, çoklu deneme ortalaması, öğrenci gelişim raporu, birleştirilmiş karne ve soru frekans analizi daha büyük yazı, net tablo başlıkları, puan gelişim grafiği ve sayfa numaralarıyla yenilendi. Eski raporlarda başlıklardaki harflerin kesilmesi ve boş «Genel / LGS21 / LGS20 / LGS22» sütunları kaldırıldı. Soru analizinde doğru şık yeşil, en çok işaretlenen yanlış şık kırmızı gösterilir.',
        roles: ['director', 'counselor', 'teacher'],
      },
      {
        title: 'Düzeltmeler',
        summary:
          'Şube ortalama ve çoklu deneme raporlarında toplam doğru/yanlış/boş değerleri artık hesaplanıyor (daha önce boş görünüyordu). Birleştirilmiş karnede konu başarısı artık seçilen her denemenin kendi cevap anahtarından toplanıyor; daha önce yalnızca tek bir denemenin anahtarı kullanılıyordu. Raporlarda «Tüm kurum» yazısı yalnızca tüm kurum için çıkar, tek şubeyi görüyorsanız şube adı yazar. Çoklu deneme raporunda her denemenin puanı da ayrı sütunda görünür.',
        roles: ['director', 'counselor', 'teacher'],
      },
    ],
  },
  {
    id: '2026-10-07-puan-hesabi',
    title: 'Deneme puanı yayınevi puanıyla aynı hesaplanıyor',
    publishedOn: '2026-10-07',
    intro:
      'Net ve sıralama hesabı yayınevinin sonuç listesiyle karşılaştırılıp düzeltildi; artık LGS puanı da yayınevi katsayılarıyla hesaplanıyor.',
    items: [
      {
        title: 'LGS puanı ve puana göre sıralama',
        summary:
          'Puan, ders netleri katsayılarla çarpılarak hesaplanır (varsayılan: 200 + Türkçe 3,9 + İnkılap 1,8 + Din 1,7 + İngilizce 1,5 + Matematik 4,9 + Fen 3,7; tam doğru 500 puan). Sıralama artık nete değil puana göre yapılır, puanlar eşitse net bakılır. Puan ekranlarda yayınevi gibi iki ondalıkla gösterilir; eski «tahmini» puan yalnızca ders dökümü olmayan eski kayıtlarda kalır.',
        roles: ['director', 'counselor'],
      },
      {
        title: 'Deneme başına puan katsayıları',
        summary:
          'Başka bir yayınevinin katsayıları farklıysa denemeyi açıp «Puan katsayıları» bölümünden değiştirin; kaydedince o denemenin puanları ve sıralaması yeniden hesaplanır. «Varsayılana dön» ile ilk haline dönersiniz.',
        steps: [
          'Denemeler → ilgili deneme → Puan katsayıları.',
          'Taban puan ve ders katsayılarını girin.',
          '«Kaydet ve yeniden hesapla»ya basın.',
        ],
        roles: ['director', 'counselor'],
      },
      {
        title: 'Çift işaretli soru yanlış sayılır',
        summary:
          'Optik okuyucuda bir soruya iki şık işaretlenmişse (*) yayınevi bunu boş değil yanlış sayar; artık biz de yanlış sayıyoruz. Yüklemede kaç çift işaretli soru olduğu not olarak yazar. Genel net de ders netlerinin toplamı olarak gösterilir, böylece onay ekranındaki net yayınevi listesiyle aynı çıkar.',
        roles: ['director', 'counselor'],
      },
    ],
  },
  {
    id: '2026-10-07-konu-kodlari',
    title: 'Deneme konuları kazanım kodundan otomatik belirlenir',
    publishedOn: '2026-10-07',
    intro:
      '8. sınıf denemelerinde sorunun konusu artık kazanım kodundan (ör. T.8.3.5.1, F.8.1.1.1) bulunur; 8. sınıf ünitelerine konu listeleri eklendi.',
    items: [
      {
        title: 'Kazanım koduyla konu seçimi',
        summary:
          'Cevap anahtarı Excel’inde her sorunun kazanım kodu okunur ve MEB kazanım tablosundan konusu bulunur. Kod tabloda yoksa üst kod kullanılır (ör. T.8.3.25.99 → T.8.3.25). İkisi de yoksa konu sorulur ve cevabınız kaydedilir; sonraki denemelerde aynı konu tekrar sorulmaz. Onay ekranında konuların kodla mı, üst kodla mı, dosyadaki etiketle mi belirlendiği yazar.',
        roles: ['director', 'counselor'],
      },
      {
        title: '8. sınıf ünitelerinde konu listeleri',
        summary:
          'Fen, Din ve İnkılap ünitelerinin altına MEB konuları eklendi (ör. Mevsimler ve İklim → Mevsimlerin Oluşumu, İklim ve Hava Hareketleri). Öğretmen müfredat ekranında ünitenin konuları görünür; konu eşleştirmede «Alt konu» seçilebilir. Matematik, Türkçe ve İngilizce ünitelerinde değişiklik yok. Türkçe’de müfredatta karşılığı olmayan birkaç konu (ör. Fiilimsi) ilk denemede bir kez sorulur.',
        roles: ['director', 'counselor', 'teacher'],
      },
    ],
  },
  {
    id: '2026-10-07-optik-import',
    title: 'Denemeye Excel anahtarı ve optik .txt ile sonuç yükleme',
    publishedOn: '2026-10-07',
    intro:
      'Yayınevinin Excel cevap anahtarı ve optik okuyucunun .txt çıktısı artık doğrudan yüklenebilir; CSV’ye çevirmeye gerek yok.',
    items: [
      {
        title: 'Cevap anahtarı Excel (.xlsx)',
        summary:
          'Deneme → Cevap anahtarı adımında .xlsx yükleyin. Dersler, A/B kitapçık sırası ve konular okunur; konu adları müfredat ünitelerine otomatik bağlanır, bağlanamayanlar bir kez sorulur ve kaydedilir; sonraki denemelerde aynı konu tekrar sorulmaz. İnkılap konuları da artık müfredata bağlanabilir.',
        steps: [
          'Denemeler → ilgili deneme → Cevap anahtarı → .xlsx dosyasını seçin.',
          'Soru listesini kontrol edip «Onayla ve kaydet»e basın.',
        ],
        roles: ['director', 'counselor'],
      },
      {
        title: 'Optik okuyucu .txt',
        summary:
          'Öğrenci cevapları .txt olarak yüklenir. A ve B kitapçığı otomatik ayrılır, adlar öğrenci listesiyle eşleştirilir (Türkçe harf, boşluk, eksik ikinci ad ve okunamayan harfler tolere edilir). Tam eşleşenler sorulmadan geçer; eşleşmeyen, tahminle eşleşen veya kitapçığı şüpheli satırlar için sizden karar istenir.',
        steps: [
          'Cevap anahtarı kaydedildikten sonra «Öğrenci cevapları» adımında .txt dosyasını seçin.',
          'Onay ekranı yalnızca karar bekleyen satırları gösterir ve her seferinde tek satır açıktır: öğrenciyi seçin, «Doğru, onayla» deyin veya «Dışarıdan katılıyor» ile atlayın. Yanlışlık olursa «Verilen kararlar» bölümünden «Geri al» diyebilirsiniz.',
          'Bekleyen kalmayınca «Onayla ve içe aktar»a basın.',
        ],
        roles: ['director', 'counselor'],
      },
      {
        title: 'Dışarıdan katılan öğrenciler',
        summary:
          'Okulda kayıtlı olmayıp sınava dışarıdan katılan öğrenciler «Dışarıdan katılıyor» ile atlanır. Bu karar hatırlanmaz: aynı kişi sonraki denemede yine çıkarsa yeniden sorulur.',
        roles: ['director', 'counselor'],
      },
    ],
  },
  {
    id: '2026-10-07-ozel-ders-saati',
    title: 'Haftalık programa özel ders saati',
    publishedOn: '2026-10-07',
    intro:
      'Haftalık ders programına artık Soru Çözümü, Ödev gibi kendi etkinliklerinizi de yazabilirsiniz.',
    items: [
      {
        title: 'Özel ders saati ekleme',
        summary:
          'Haftalık ders programında bir hücrede «Özel…» seçip etkinliğin adını yazın. Özel saat de 4 ders saatinden birinin yerini alır; veliler programda bu adı görür. Daha önce kullandığınız adlar yazarken öneri olarak çıkar.',
        steps: [
          'Haftalık ders programı → şube ve haftayı seçin.',
          'İlgili hücrede açılır listeden «Özel…» seçin ve adı yazın (ör. Soru Çözümü).',
          '«Programı kaydet»e basın.',
        ],
        roles: ['director', 'counselor'],
      },
      {
        title: 'Yoklama',
        summary:
          'Programda özel etkinlik yazan bir saatte öğretmen yine kendi branşıyla yoklama alabilir; «farklı ders» uyarısı çıkmaz ve haftalık program değişmez.',
        roles: ['director', 'counselor', 'teacher'],
      },
    ],
  },
  {
    id: '2026-10-07-yoklama-duzeltme',
    title: 'Atlas yoklamasını düzeltme',
    publishedOn: '2026-10-07',
    intro:
      'Kaydedilmiş bir ders saatinin yoklamasında hata yaptıysanız artık kendiniz düzeltebilirsiniz.',
    items: [
      {
        title: 'Kayıtlı ders saatini düzeltme',
        summary:
          'Ders ekranında kendi kaydettiğiniz ders saati «Düzelt» etiketiyle açılır; kayıtlı Var/Yok bilgisi yüklenir, değiştirip «Yoklamayı güncelle»ye basarsınız. Düzeltme, yoklama girmeyle aynı sürede yapılır: bugün 20:00’a kadar veya bu haftanın önceki okul günleri. Velilere yeni bildirim gitmez. Başka öğretmenin kaydını yalnızca müdür düzeltebilir.',
        steps: [
          'Ders sekmesi → şubeyi seçin (geçmiş gün için Bu hafta · telafi → Yoklama gir).',
          'Üstteki ders saatlerinden «Düzelt» yazan saate dokunun.',
          'Öğrencilerin Var/Yok durumunu değiştirip «Yoklamayı güncelle»ye basın.',
        ],
        roles: ['director', 'teacher'],
      },
      {
        title: 'Soru sonuçları',
        summary:
          'Düzeltmede bir öğrenciyi devamsız yaparsanız, o derse girilmiş soru (test) sonucu da silinir. Yeni «Var» yaptığınız öğrencinin sonucunu Sorular sekmesinden girmeniz gerekir.',
        roles: ['director', 'teacher'],
      },
      {
        title: 'Başkasının kaydı korunuyor',
        summary:
          'Dolu bir ders saatine başka bir öğretmen yoklama yazarak eski kaydı artık ezemez; sistem «düzenlenemiyor» hatası verir.',
        roles: ['director', 'teacher'],
      },
    ],
  },
  {
    id: '2026-09-18-muhasebe-atlas',
    title: 'Atlas’ta Muhasebe her zaman açık',
    publishedOn: '2026-09-18',
    intro: 'Atlas okullarında Muhasebe modülü artık kendiliğinden kapanmıyor.',
    items: [
      {
        title: 'Muhasebe sekmesi sürekli açık',
        summary:
          'Genel Bakış’taki «Muhasebe modülünü aç» anahtarı Atlas okullarında açık konumda kilitlidir; kapatılamaz. Muhasebe sekmesi ve içindeki ödeme takibi eskisi gibi çalışır.',
        roles: ['director'],
      },
    ],
  },
  {
    id: '2026-09-18-sinif-ogretmeni',
    title: 'Sınıf öğretmeni',
    publishedOn: '2026-09-18',
    intro:
      'Bir şubenin sorumlu öğretmenini belirleyebilirsiniz. Sınıf öğretmeni, kendi şubesini tüm dersleriyle birlikte görür.',
    items: [
      {
        title: 'Sınıf öğretmeni atama',
        summary:
          'Öğretmen Yönetimi’nde ayrı bir «Sınıf öğretmenleri» bölümü var (varsayılan kapalı). Her şubenin yanından bir öğretmen seçilir. Bir şubenin en fazla bir sınıf öğretmeni olur; aynı öğretmen birden fazla şubede olabilir. Atama zorunlu değildir.',
        steps: [
          'Yönetim → Öğretmen Yönetimi → «Sınıf öğretmenleri» bölümünü açın.',
          'Şubenin yanındaki listeden öğretmeni seçin ve Kaydet’e basın.',
          'Sınıf öğretmenini kaldırmak için «Atanmamış» seçip kaydedin.',
        ],
        roles: ['director'],
      },
      {
        title: 'Sınıfım sekmesi',
        summary:
          'Sınıf öğretmeni olan öğretmenin panelinde «Sınıfım» sekmesi görünür. Birden fazla şube varsa üstten şube seçilir.',
        steps: [
          'Yoklama: şubenin tüm derslerdeki yoklaması ve öğrenci devam durumu.',
          'Öğrenciler: şube listesi ve tam öğrenci dosyası.',
          'Rehberlik: haftalık rehberlik planı araçları (geniş tablolar için bilgisayar gerekir).',
          'Raporlar: deneme sonuç raporları. Deneme oluşturma ve düzenleme yoktur.',
        ],
        roles: ['director', 'teacher'],
      },
      {
        title: 'Veliler açısından',
        summary:
          'Sınıf öğretmeni, velilerin «öğretmenle iletişim» listesinde görünür. Duyuruları, o şubede ders vermese bile şubenin velilerine ulaşır.',
        roles: ['director', 'teacher'],
      },
    ],
  },
  {
    id: '2026-09-18-yoklama-guncellemeleri',
    title: 'Yoklama, kayıtlar ve veli bildirimi',
    publishedOn: '2026-09-18',
    intro:
      'Atlas yoklamaları artık Kayıtlar’da görünüyor. Program boşken de yoklama alınabiliyor. Velilere günün ilk dersi bildirimi gidiyor.',
    items: [
      {
        title: 'Kayıtlar → Yoklama Atlas’ta çalışıyor',
        summary:
          'Ders sekmesinden alınan yoklamalar Müdür panelinde Kayıtlar → Yoklama altında listelenir. Atlas’ta «konu tekrarı gereken» bölümü gösterilmez.',
        roles: ['director'],
      },
      {
        title: 'Okul kayıtlarında öğretmen işlemleri',
        summary:
          'Bugüne kadar okul kayıtlarında yalnızca müdür işlemleri görünüyordu. Artık öğretmen ve rehber işlemleri de kaydediliyor. Eski işlemler geriye dönük eklenmez.',
        roles: ['director'],
      },
      {
        title: 'Program boşsa da yoklama alınır',
        summary:
          'Haftalık programda o saat boşsa öğretmen kendi branşıyla yoklama alır ve program o saat için kendiliğinden dolar. Programda başka bir ders yazıyorsa öğretmene onay sorulur; kayıt öğretmenin dersi olarak tutulur ve plan değişmez.',
        steps: [
          'Ders sekmesinden şubeyi seçin ve yoklamayı kaydedin.',
          'Planlı ders farklıysa açılan pencerede onaylayın.',
          'Müdür: Haftalık ders programında o hücrenin altındaki turuncu not, o gün gerçekte hangi dersin işlendiğini gösterir.',
        ],
        roles: ['director', 'counselor', 'teacher'],
      },
      {
        title: 'Velilere günün ilk dersi bildirimi',
        summary:
          'Günün ilk dersinin yoklaması kaydedilince velisine «geldi / gelmedi» bildirimi gider. Yalnızca o günkü canlı kayıtta gönderilir, günde bir kez; sonradan düzeltme veya telafi girişinde tekrar gitmez. Atlas’ta 1. ders, klasik yoklamada günün ilk kaydedilen yoklaması esas alınır. Veli bildirimleri açmış olmalıdır.',
        roles: ['director', 'teacher'],
      },
      {
        title: 'Sekme değişince sayfa başa dönüyor',
        summary:
          'Uzun bir sekmede aşağı kaydırıp kısa bir sekmeye geçince sayfa boş görünüyordu; artık her sekme değişiminde en üste dönüyor.',
        roles: ['director', 'counselor', 'teacher'],
      },
      {
        title: 'Öğretmen panelinden Ödev sekmesi kaldırıldı',
        summary:
          'Öğretmen panelinde artık Ödev sekmesi yok. Veli panelindeki ödev bölümü aynen duruyor.',
        roles: ['director', 'teacher'],
      },
    ],
  },
  {
    id: '2026-09-16-ogrenci-listesi-yoklama',
    title: 'Şubede öğrenci listesi ve yoklama bildirimi düzeltmesi',
    publishedOn: '2026-09-16',
    intro:
      'Bazı öğretmenler şubeyi görüp içindeki öğrencileri göremiyordu; giderildi. Yoklama bildirim kartı da küçültüldü.',
    items: [
      {
        title: 'Şubede öğrenci listesi görünüyor',
        summary:
          'Yetki kaydındaki bir eksiklik yüzünden öğretmenler (örn. İngilizce) şubeyi seçebiliyor ama listede öğrenci göremiyordu; "Bu şubede öğrenci yok" hatalı şekilde gösteriliyordu. Sunucu tarafında düzeltildi, yeniden giriş gerekmiyor.',
        roles: ['director', 'counselor', 'teacher'],
      },
      {
        title: 'Yoklama bildirim kartı küçüldü',
        summary:
          'Panelin üstünde otomatik çıkan «Yoklama girilmedi» kartı gereğinden büyüktü; artık daha küçük ve derli toplu görünüyor. Bildirim zili menüsündeki liste değişmedi.',
        roles: ['director', 'counselor', 'teacher'],
      },
    ],
  },
  {
    id: '2026-09-10-rehberlik-ogretmen',
    title: 'Rehberlikçi öğretmen paneline de girer',
    publishedOn: '2026-09-10',
    intro:
      'Rehberlik branşıyla oluşturulan personel hem rehberlikçi hem öğretmen olur; Atlas’ta tüm şubelere erişir.',
    items: [
      {
        title: 'Rehberlik = iki rol',
        summary:
          'Yeni öğretmen oluştururken branş Rehberlik seçilirse hesap hem öğretmen hem rehberlikçi paneline girer. Rol menüsünden paneller arası geçiş yapılır.',
        steps: [
          'Personel → Yeni öğretmen.',
          'Branş olarak Rehberlik seçin ve oluşturun.',
          'Giriş sonrası menüden Öğretmen veya Rehberlikçi panelini seçin.',
        ],
        roles: ['director', 'counselor', 'teacher'],
      },
      {
        title: 'Atlas rehberlikçi şube erişimi',
        summary:
          'Mevcut Atlas rehberlikçi hesapları öğretmen rolü ve tüm şubelere erişimle güncellendi; ders verebilirler.',
        roles: ['director', 'counselor', 'teacher'],
      },
    ],
  },
  {
    id: '2026-09-10-pwa-yukle',
    title: 'Uygulamayı telefona veya bilgisayara yükleme',
    publishedOn: '2026-09-10',
    intro:
      'Paneli ana ekrana ekleyebilirsiniz. Veliler Atlas sitesindeki yükle düğmesiyle aynı ekrana gelir.',
    items: [
      {
        title: 'Girişte yükle',
        summary:
          'Giriş ekranında «Uygulamayı yükle» görünür. Chrome ve Edge kendi onayını açar; iPhone’da Paylaş → Ana Ekrana Ekle adımları çıkar. Yüklü uygulamada düğme gizlenir.',
        steps: [
          'Çıkış yapıp giriş ekranına gidin.',
          '«Uygulamayı yükle»ye dokunun ve tarayıcının onayını kabul edin.',
        ],
        roles: ['director', 'teacher', 'counselor'],
      },
      {
        title: 'Veli yükleme bağlantısı',
        summary:
          'Atlas sitesinden gelen veliler veli adresine ?install=1 ile düşer; giriş yapmadan yükleme paneli açılır.',
        roles: ['director'],
      },
    ],
  },
  {
    id: '2026-09-08-atlas-yonetim',
    title: 'Atlas yönetim ve öğrenci listesi',
    publishedOn: '2026-09-08',
    intro:
      'Haftalık program ayrı sayfada. Atlas’ta tüm öğretmenler tüm şubelere erişir. Öğrenci listesinde veli adı görünür.',
    items: [
      {
        title: 'Haftalık ders programı',
        summary:
          'Program artık Müfredat içinde değil; Yönetim altında kendi sayfası. Rehberlikçi Program sekmesini kullanır.',
        steps: [
          'Yönetim → Haftalık ders programı.',
          'Şube ve hafta seçip Pazartesi–Cuma 4 dersi kaydedin.',
        ],
        roles: ['director', 'counselor', 'teacher'],
      },
      {
        title: 'Atlas şube erişimi',
        summary:
          'Yeni ve mevcut öğretmenler tüm şubelere atanır; yeni şube de tüm öğretmenlere açılır. Şube Atama Atlas’ta gizlenir.',
        steps: ['Öğretmen oluşturduktan sonra Ders ve mesaj için tüm şubeler hazırdır.'],
        roles: ['director', 'teacher'],
      },
      {
        title: 'Öğrenci listesinde veli',
        summary: 'Öğrenci Yönetimi’nde çocuğa bağlı veli varsa adı şube satırının altında görünür.',
        steps: ['Yönetim → Öğrenci Yönetimi → öğrenci satırında «Veli: …».'],
        roles: ['director'],
      },
      {
        title: 'Veli oluşturma',
        summary: 'Veli hesabı oluştururken oluşan sunucu hatası giderildi.',
        roles: ['director'],
      },
    ],
  },
  {
    id: '2026-09-08-branch-timetable',
    title: 'Öğretmen branşları ve haftalık program',
    publishedOn: '2026-09-08',
    intro:
      'Rehberlikçi artık öğretmen gibi eklenir. Atlas okullarında her şube için haftalık 4 derslik program elle girilir.',
    items: [
      {
        title: 'Öğretmen branşları',
        summary:
          'Yeni öğretmen oluştururken branş: Sosyal, İngilizce, Rehberlik, Matematik, Türkçe, Fen. Rehberlik seçilince kişi rehberlikçi paneline de girer.',
        steps: [
          'Personel → Yeni öğretmen formunu açın.',
          'Ad soyad ve branş seçin. Rehberlik branşı ayrı rehberlikçi formu yerine geçer.',
          'Mevcut öğretmende branşı Rehberlik olarak kaydederseniz rehberlikçi rolü eklenir; başka branşa çevirirseniz kalkar.',
        ],
        roles: ['director'],
      },
      {
        title: 'Haftalık ders programı',
        summary:
          'Her şube ve hafta için Pazartesi–Cuma 4 dersi siz seçersiniz. Atlas yoklaması öğretmen branşına göre değil, o saatteki programa göre kaydedilir.',
        steps: [
          'Müdür: Yönetim → Haftalık ders programı. Rehberlikçi: Program sekmesi.',
          'Şube ve hafta seçin, her güne 4 ders atayın, kaydedin.',
          'Aynı programı hızlandırmak için «Önceki haftayı kopyala» kullanın.',
          'Veliler Ders programı sekmesinde çocuğun o haftaki programını görür.',
        ],
        roles: ['director', 'counselor', 'teacher'],
      },
    ],
  },
  {
    id: '2026-09-08-panel-updates',
    title: 'Panel güncellemeleri',
    publishedOn: '2026-09-08',
    intro:
      'Deneme import, müdür yetkileri ve takvimle ilgili son değişiklikler. Her madde yalnızca bir kez gösterilir.',
    items: [
      {
        title: 'Öğrenci cevap onayı artık pencerede',
        summary:
          'CSV import adımında öğrenci eşleştirmesi sayfa içinde değil, ayrı bir onay penceresinde açılır.',
        steps: [
          'Denemeler → CSV import → öğrenci cevapları CSV dosyasını yükleyin.',
          'Açılan pencerede eşleşmeyen satırlar için okul listesinden öğrenci seçin.',
          'Filtreler (Tümü / Eşleşenler / Sorunlu) ile listeyi daraltabilirsiniz.',
          'Pencereyi kapatırsanız, aynı adımdan «Öğrenci eşleştirmesini aç» ile geri dönebilirsiniz.',
        ],
        roles: ['director', 'counselor'],
      },
      {
        title: 'Konu eşleştirme penceresi',
        summary:
          'Cevap anahtarı kaydedilirken tanınmayan konu etiketleri müfredat ünitelerine bağlanmak üzere açılır.',
        steps: [
          'Cevap anahtarı CSV yükleyin ve onaylayın.',
          'Bilinmeyen konu varsa eşleştirme penceresi otomatik açılır.',
          'Her etiket için ünite (ve varsa alt konu) seçin veya «Atla» ile geçin.',
        ],
        roles: ['director', 'counselor'],
      },
      {
        title: 'Tüm müdürler tam yetkili',
        summary:
          'Sonradan müdür yapılan personel de artık asıl müdürle aynı yetkilere sahip (personel silme, rol yönetimi, öğrenci silme).',
        steps: [
          'Personel sekmesinden öğretmen veya rehber personele «Müdür» rolü ekleyebilirsiniz.',
          'Eklenen müdürler tüm yönetim işlemlerini yapabilir.',
        ],
        roles: ['director'],
      },
      {
        title: 'Atlas yıllık takvim',
        summary: '2026–2027 Atlas akademik takvimi güncellendi ve yeniden yüklendi.',
        steps: [
          'Takvim sekmesinden tatil, deneme ve etkinlik tarihlerini kontrol edin.',
          'Müfredat yıllık planı takvimdeki okul günlerine göre hafta sayısını kullanır.',
        ],
        roles: ['director', 'teacher', 'counselor'],
      },
    ],
  },
];

const STORAGE_PREFIX = 'staffChangelogSeen:';

function readSeenIds(profileId) {
  if (!profileId || typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${profileId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSeenIds(profileId, ids) {
  if (!profileId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${profileId}`, JSON.stringify([...ids]));
  } catch {
    // ignore quota / private mode
  }
}

function roleMatchesFilter(userStaffRoles, filterRoles) {
  if (!filterRoles?.length) return true;
  return userStaffRoles.some((role) => filterRoles.includes(role));
}

function visibleItemsForRoles(entry, userStaffRoles) {
  return (entry.items ?? []).filter((item) => roleMatchesFilter(userStaffRoles, item.roles));
}

export function isStaffProfile(profile) {
  return normalizeProfileRoles(profile).some((role) => STAFF_ROLES.includes(role));
}

export function getVisibleStaffChangelog(userStaffRoles = []) {
  if (!userStaffRoles.length) return [];

  return STAFF_CHANGELOG.map((entry) => {
    const items = visibleItemsForRoles(entry, userStaffRoles);
    if (!roleMatchesFilter(userStaffRoles, entry.roles) && !items.length) return null;
    if (!items.length) return null;
    return { ...entry, items };
  }).filter(Boolean);
}

export function getUnseenStaffChangelog(profile, userStaffRoles = []) {
  if (!profile?.id || !userStaffRoles.length) return [];

  const seen = readSeenIds(profile.id);
  return getVisibleStaffChangelog(userStaffRoles).filter((entry) => !seen.has(entry.id));
}

export function markStaffChangelogSeen(profileId, entryIds) {
  if (!profileId || !entryIds?.length) return;
  const seen = readSeenIds(profileId);
  for (const id of entryIds) seen.add(id);
  writeSeenIds(profileId, seen);
}

/** Dev / support: clear seen state for current user (optional export). */
export function resetStaffChangelogSeen(profileId) {
  if (!profileId || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${profileId}`);
  } catch {
    // ignore
  }
}
