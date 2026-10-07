-- 8. sınıf konuları (curriculum_units.sections): MEB 8. sınıf kazanım kitapçığı (Cilt 1) ve LGS kazanım kataloğundan.
-- Yalnızca sections boş olan 8. sınıf üniteleri doldurulur; mevcut içerik asla ezilmez. Geri almak için sections = '[]'.

-- Din ünite adları genel (Ünite 1-5); MEB sırası: 8.1 Kader İnancı, 8.2 Zekât ve Sadaka, 8.3 Din ve Hayat, 8.4 Hz. Muhammed'in Örnekliği, 8.5 Kur'an-ı Kerim ve Özellikleri.

update public.curriculum_units cu
set sections = $j$["Mevsimlerin Oluşumu", "İklim ve Hava Hareketleri"]$j$::jsonb
from public.curriculum_subjects cs
where cs.id = cu.subject_id and cs.grade = 8 and cs.slug = 'fen'
  and cu.title = $t$Mevsimler ve İklim$t$
  and coalesce(jsonb_array_length(cu.sections), 0) = 0;

update public.curriculum_units cu
set sections = $j$["DNA ve Genetik Kod", "Kalıtım", "Mutasyon ve Modifikasyon", "Adaptasyon (Çevreye Uyum)", "Biyoteknoloji"]$j$::jsonb
from public.curriculum_subjects cs
where cs.id = cu.subject_id and cs.grade = 8 and cs.slug = 'fen'
  and cu.title = $t$DNA ve Genetik Kod$t$
  and coalesce(jsonb_array_length(cu.sections), 0) = 0;

update public.curriculum_units cu
set sections = $j$["Periyodik Sistem", "Fiziksel ve Kimyasal Değişimler", "Kimyasal Tepkimeler", "Asitler ve Bazlar", "Maddenin Isı ile Etkileşimi", "Türkiye'de Kimya Endüstrisi"]$j$::jsonb
from public.curriculum_subjects cs
where cs.id = cu.subject_id and cs.grade = 8 and cs.slug = 'fen'
  and cu.title = $t$Madde ve Endüstri$t$
  and coalesce(jsonb_array_length(cu.sections), 0) = 0;

update public.curriculum_units cu
set sections = $j$["Kader ve Kaza İnancı", "İnsanın İradesi ve Kader", "Kaderle İlgili Kavramlar", "Bir Peygamber Tanıyorum: Hz. Musa (a.s.)", "Bir Ayet Tanıyorum: Ayet el-Kürsi ve Anlamı"]$j$::jsonb
from public.curriculum_subjects cs
where cs.id = cu.subject_id and cs.grade = 8 and cs.slug = 'din'
  and cu.title = $t$Ünite 1$t$
  and coalesce(jsonb_array_length(cu.sections), 0) = 0;

update public.curriculum_units cu
set sections = $j$["İslam’ın Paylaşma ve Yardımlaşmaya Verdiği Önem", "Zekât ve Sadaka İbadeti", "Zekât ve Sadakanın Bireysel ve Toplumsal Faydaları", "Bir Peygamber Tanıyorum: Hz. Şuayb (a.s.)", "Bir Sure Tanıyorum: Maûn Suresi ve Anlamı"]$j$::jsonb
from public.curriculum_subjects cs
where cs.id = cu.subject_id and cs.grade = 8 and cs.slug = 'din'
  and cu.title = $t$Ünite 2$t$
  and coalesce(jsonb_array_length(cu.sections), 0) = 0;

update public.curriculum_units cu
set sections = $j$["Din, Birey ve Toplum", "Dinin Temel Gayesi", "Bir Peygamber Tanıyorum: Hz. Yusuf (a.s.)", "Bir Sure Tanıyorum: Asr Suresi ve Anlamı"]$j$::jsonb
from public.curriculum_subjects cs
where cs.id = cu.subject_id and cs.grade = 8 and cs.slug = 'din'
  and cu.title = $t$Ünite 3$t$
  and coalesce(jsonb_array_length(cu.sections), 0) = 0;

update public.curriculum_units cu
set sections = $j$["Besin Zinciri ve Enerji Akışı", "Enerji Dönüşümleri", "Madde Döngüleri ve Çevre Sorunları", "Sürdürülebilir Kalkınma"]$j$::jsonb
from public.curriculum_subjects cs
where cs.id = cu.subject_id and cs.grade = 8 and cs.slug = 'fen'
  and cu.title = $t$Enerji Dönüşümleri ve Çevre Bilimi$t$
  and coalesce(jsonb_array_length(cu.sections), 0) = 0;

update public.curriculum_units cu
set sections = $j$["Elektrik Yükleri ve Elektriklenme", "Elektrik Yüklü Cisimler", "Elektrik Enerjisinin Dönüşümü"]$j$::jsonb
from public.curriculum_subjects cs
where cs.id = cu.subject_id and cs.grade = 8 and cs.slug = 'fen'
  and cu.title = $t$Elektrik Yükleri ve Elektrik Enerjisi$t$
  and coalesce(jsonb_array_length(cu.sections), 0) = 0;

update public.curriculum_units cu
set sections = $j$["Hz. Muhammed'in (s.a.v.) Doğruluğu ve Güvenilir Kişiliği", "Hz. Muhammed'in (s.a.v.) Merhametli ve Affedici Oluşu", "Hz. Muhammed'in (s.a.v.) İstişareye Önem Vermesi", "Hz. Muhammed'in (s.a.v.) Davasındaki Cesaret ve Kararlılığı", "Hz. Muhammed'in (s.a.v.) Hakkı Gözetmedeki Hassasiyeti", "Hz. Muhammed'in (s.a.v.) İnsanlara Değer Vermesi", "Bir Sure Tanıyorum: Kureyş Suresi ve Anlamı"]$j$::jsonb
from public.curriculum_subjects cs
where cs.id = cu.subject_id and cs.grade = 8 and cs.slug = 'din'
  and cu.title = $t$Ünite 4$t$
  and coalesce(jsonb_array_length(cu.sections), 0) = 0;

update public.curriculum_units cu
set sections = $j$["İslam Dininin Temel Kaynakları", "Kur’an-ı Kerim’in Ana Konuları", "Kur’an-ı Kerim’in Temel Özellikleri", "Bir Peygamber Tanıyorum: Hz. Nuh (a.s.)"]$j$::jsonb
from public.curriculum_subjects cs
where cs.id = cu.subject_id and cs.grade = 8 and cs.slug = 'din'
  and cu.title = $t$Ünite 5$t$
  and coalesce(jsonb_array_length(cu.sections), 0) = 0;

update public.curriculum_units cu
set sections = $j$["Uyanan Avrupa ve Sarsılan Osmanlı", "Mavi Gözlü Çocuk: Mustafa", "Buhranlar Büyük Kahramanlar Doğurur", "Adım Adım Liderliğe"]$j$::jsonb
from public.curriculum_subjects cs
where cs.id = cu.subject_id and cs.grade = 8 and cs.slug = 'sosyal'
  and cu.title = $t$Bir Kahraman Doğuyor$t$
  and coalesce(jsonb_array_length(cu.sections), 0) = 0;

update public.curriculum_units cu
set sections = $j$["I. Dünya Savaşı’na Yol Açan Gelişmeler", "Osmanlı Devleti’nin Son Savaşı: I. Dünya Savaşı", "İşgal Yıllarında Anadolu", "Cemiyetler ve Kuvâ-yi Millîye", "İstiklal Yolculuğu", "Büyük Millet Meclisine Karşı Çıkarılan Ayaklanmalar", "Geçersiz Bir Antlaşma: Sevr Antlaşması"]$j$::jsonb
from public.curriculum_subjects cs
where cs.id = cu.subject_id and cs.grade = 8 and cs.slug = 'sosyal'
  and cu.title = $t$Milli Uyanış$t$
  and coalesce(jsonb_array_length(cu.sections), 0) = 0;

update public.curriculum_units cu
set sections = $j$["Doğu ve Güney Cepheleri", "Batı Cephesi", "Maarif Kongresi", "Millî Mücadele, Millî Seferberlik: Tekalif-i Millîye", "Direnişten Dirilişe: Sakarya'dan Büyük Taarruz’a", "Türkiye'nin Tapu Senedi: Lozan Antlaşması", "Sanat ve Edebiyat Eserlerinde Millî Mücadele"]$j$::jsonb
from public.curriculum_subjects cs
where cs.id = cu.subject_id and cs.grade = 8 and cs.slug = 'sosyal'
  and cu.title = $t$Ya İstiklal Ya Ölüm$t$
  and coalesce(jsonb_array_length(cu.sections), 0) = 0;

update public.curriculum_units cu
set sections = $j$["Atatürk İlkeleri", "Siyasi Alandaki Gelişmeler", "Hukuk Alanındaki Gelişmeler", "Eğitim ve Kültür Alanındaki Gelişmeler", "Toplumsal Alandaki Gelişmeler", "Ekonomi Alanındaki Gelişmeler", "Sağlık Alanındaki Gelişmeler", "İlelebet Cumhuriyet", "Atatürk İlke ve İnkılaplarının Temel Esasları"]$j$::jsonb
from public.curriculum_subjects cs
where cs.id = cu.subject_id and cs.grade = 8 and cs.slug = 'sosyal'
  and cu.title = $t$Atatürkçülük ve Çağdaşlaşan Türkiye$t$
  and coalesce(jsonb_array_length(cu.sections), 0) = 0;

update public.curriculum_units cu
set sections = $j$["Demokratikleşme Yolunda Atılan Adımlar", "Mustafa Kemal'e Suikast Girişimi", "Türkiye Cumhuriyeti’ne Yönelik Tehditler"]$j$::jsonb
from public.curriculum_subjects cs
where cs.id = cu.subject_id and cs.grade = 8 and cs.slug = 'sosyal'
  and cu.title = $t$Demokratikleşme Çabaları$t$
  and coalesce(jsonb_array_length(cu.sections), 0) = 0;

update public.curriculum_units cu
set sections = $j$["Türk Dış Politikasının Temel İlkeleri", "Dış Politikada Yaşanan Gelişmeler", "Misak-ı Millî’nin Son Zaferi: Hatay"]$j$::jsonb
from public.curriculum_subjects cs
where cs.id = cu.subject_id and cs.grade = 8 and cs.slug = 'sosyal'
  and cu.title = $t$Atatürk Dönemi Dış Politika$t$
  and coalesce(jsonb_array_length(cu.sections), 0) = 0;

update public.curriculum_units cu
set sections = $j$["Atatürk’ün Vefatı ve Yankıları", "İnsan Eserleriyle Yaşar", "Yeniden Sarsılan Dünya", "II. Dünya Savaşı’nın Türkiye’ye Etkileri", "Demokrasi Yolunda Güçlü Adımlar"]$j$::jsonb
from public.curriculum_subjects cs
where cs.id = cu.subject_id and cs.grade = 8 and cs.slug = 'sosyal'
  and cu.title = $t$Atatürk'ün Ölümü ve Sonrası$t$
  and coalesce(jsonb_array_length(cu.sections), 0) = 0;

notify pgrst, 'reload schema';
