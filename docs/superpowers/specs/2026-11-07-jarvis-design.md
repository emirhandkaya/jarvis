# Jarvis — Tasarım Belgesi (Spec)

- Tarih: 2026-11-07
- Adres: https://jarvis.emirhandurmuskaya.com
- Durum: Kullanıcı onayı bekliyor

## 1. Amaç ve başarı ölçütü

Jarvis, tek kişinin (Emirhan) günlük hayatını düzenleyen, telefonda uygulama gibi kullanılan kişisel bir web uygulamasıdır. Ders çalışma, spor, alışkanlıklar ve zaman yönetimini tek yerde toplar.

Temel fikir: saat saymak değil, **kanıtlı davranışları kolaylaştırmak**. Bunlar aralıklı tekrar, aktif hatırlama, hedef + kendini izleme + geri bildirim, kademeli yük artırma, eğer-sonra planları ve haftalık değerlendirmedir.

Başarı ölçütleri:
- Günlük kullanım 2 dakikanın altında kalır (sabah check-in + akşam kapanışı ≤ 1'er dk).
- Her kayıt en fazla 2 dokunuş sürer.
- 8 hafta sonra kullanıcı hâlâ her gün açıyor (sürdürülebilirlik asıl hedef).
- Haftalık değerlendirme kullanıcıya en az bir anlamlı içgörü verir.

## 2. Kısıtlar

- Tek kullanıcı, giriş yok, sunucu (backend) yok.
- Veri cihazda: IndexedDB. Yedek: JSON dışa/içe aktarma.
- Telefonda ana ekrana eklenen PWA; çevrimdışı çalışır.
- Arayüz Türkçe, saat dilimi cihazın yerel saati (Europe/Istanbul varsayılır), tarihler `YYYY-MM-DD` yerel gün olarak saklanır.
- Ücretsiz statik hosting.

Bilinen sınırlar:
- Arka planda push bildirimi yok; zamanlayıcı uygulama açıkken çalışır.
- HealthKit'e doğrudan erişim yok; iOS Kısayollar köprüsü kullanılır (bkz. 6.9).
- iOS ana ekran widget'ı yok; Kısayollar widget'ı kullanılır (bkz. 6.10).

## 3. Teknik mimari

| Katman | Seçim | Neden |
|---|---|---|
| Derleme | Vite + TypeScript | Hızlı, statik çıktı |
| Arayüz | Preact (+ `preact/compat`) | React ile aynı API, ~4 KB, telefonda hızlı |
| Yönlendirme | Hash router (`#/...`) | Her statik hostta çalışır, Kısayollar URL'leri basit |
| Veri | Dexie.js (IndexedDB) + `dexie-react-hooks` (`useLiveQuery`) | Canlı sorgular, şema sürümleme |
| PWA | `vite-plugin-pwa` (Workbox) | Manifest, offline önbellek, güncelleme |
| Grafik | Elle yazılmış SVG bileşenleri | Bağımlılık yok, tam kontrol |
| Stil | Düz CSS + CSS değişkenleri (koyu tema varsayılan) | Basit, hızlı |
| Test | Vitest (+ `fake-indexeddb`) | Mantık katmanı için |
| Hosting | Cloudflare Pages, `jarvis` için CNAME | Ücretsiz, otomatik HTTPS |

### Klasör yapısı

```
src/
  main.tsx, app.tsx, router.ts
  db/          schema.ts (Dexie tabloları), repo/*.ts (tablo başına okuma/yazma)
  logic/       saf fonksiyonlar, UI'dan bağımsız, test edilen kısım
               dates.ts, consistency.ts, spacedReview.ts, progression.ts,
               capacity.ts, insights.ts, healthImport.ts, backup.ts
  features/    today/ checkin/ tasks/ focus/ study/ gym/ habits/ plan/ stats/ review/ settings/
  ui/          ortak bileşenler (Card, Sheet, Button, NavBar, charts/)
  styles/
tests/         logic/*.test.ts
```

Kural: `logic/` içindeki fonksiyonlar Dexie'ye ve DOM'a dokunmaz; veri alır, sonuç döner. Bileşenler `db/repo` üzerinden veri okur/yazar, kararları `logic/`'e bırakır.

## 4. Veri modeli (Dexie şeması v1)

Tüm kayıtlarda `id` (string, `crypto.randomUUID()`), `createdAt`, `updatedAt` (ISO) vardır.

| Tablo | Alanlar (özet) |
|---|---|
| `settings` | `key`, `value` (pomodoro süreleri, haftalık hedefler, kart sırası, son yedek tarihi) |
| `checkins` | `date` (PK), `sleepHours?`, `energy` 1–5, `mood` 1–5, `priorities[3]` (görev id veya metin), `wins?`, `learned?`, `tomorrowFirst?` |
| `goals` | `kind` (`identity` / `cycle` / `week`), `title`, `parentId?`, `start?`, `end?`, `status` |
| `tasks` | `title`, `tag` (`ders`/`spor`/`kisisel`/`is`), `priority` 1–3, `dueDate?`, `plannedDate?`, `estimateMin?`, `energy` (`high`/`low`), `goalId?`, `doneAt?` |
| `courses` | `name`, `color`, `examDate?`, `weeklyTargetMin` |
| `topics` | `courseId`, `name`, `stage` 0–5, `lastReviewedAt?`, `nextReviewDate?`, `archived` |
| `focusSessions` | `startedAt`, `endedAt`, `minutes`, `mode` (`pomodoro`/`serbest`/`karisik`), `courseId?`, `topicIds[]`, `taskId?`, `recall[]` (≤3 madde), `rating?` (kolay/orta/zor) |
| `exercises` | `name`, `group`, `repMin`, `repMax`, `incrementKg` |
| `templates` | `name`, `items[]` (`exerciseId`, `sets`) |
| `workouts` | `date`, `templateId?`, `readiness?` 1–5, `isDeload`, `notes?` |
| `sets` | `workoutId`, `exerciseId`, `order`, `weightKg`, `reps`, `rpe?` |
| `habits` | `name`, `ifThen` (“Kahvaltıdan sonra…”), `minVersion`, `schedule` (`{type:'days', days:[1..7]}` veya `{type:'perWeek', n}`), `archived` |
| `habitLogs` | `habitId`, `date`, `status` (`done`/`min`/`joker`) — benzersiz `[habitId+date]` |
| `blocks` | `date?` veya `repeatDays[]?`, `start`, `end` (HH:mm), `title`, `kind` (`ders`/`spor`/`is`/`mola`/`diger`), `refId?` |
| `health` | `date` (PK), `sleepMin?`, `steps?`, `activeKcal?`, `restingHr?`, `hrvMs?`, `source` |
| `reviews` | `weekStart` (PK, pazartesi), `wentWell`, `toImprove`, `nextFocus`, `goalIds[]` |

Şema değişiklikleri Dexie `version(n).upgrade()` ile yapılır; yedek dosyası `schemaVersion` taşır.

## 5. Ekranlar ve gezinme

Alt gezinme (5 sekme): **Bugün** · **Plan** · **Odak** (ortada, büyük) · **Spor** · **Menü**.
Menü: Ders, Alışkanlıklar, Görevler, Hedefler, İstatistik, Haftalık değerlendirme, Ayarlar.

Rotalar: `#/`, `#/checkin`, `#/kapanis`, `#/plan`, `#/odak`, `#/ders`, `#/ders/:id`, `#/spor`, `#/spor/yeni`, `#/aliskanlik`, `#/gorevler`, `#/hedefler`, `#/istatistik`, `#/degerlendirme`, `#/ayarlar`, `#/import-health?d=...`.

## 6. Modüller

### 6.1 Bugün (ana ekran)
- Üstte duruma göre tek bir çağrı: sabah check-in yapılmadıysa "Güne başla", akşam 20:00'den sonra "Günü kapat", pazar ise "Haftayı değerlendir".
- Widget kartları (sıralanabilir, gizlenebilir): bugünün 3 önceliği, sıradaki zaman bloğu, bugün tekrar edilecek konular, alışkanlık listesi (tek dokunuşla işaretle; uzun basınca "minimum" veya "joker"), spor durumu ve önerisi, en yakın sınav geri sayımı, bugünkü / haftalık odak dakikası, uyku-enerji.
- "Odaklan" butonu her zaman görünür.

### 6.2 Sabah check-in ve akşam kapanışı
- Sabah (≤ 1 dk): uyku saati (sağlık verisi varsa dolu gelir), enerji 1–5, ruh hali 1–5, bugünün 3 önceliği (görevlerden seç veya yaz).
- Enerji ≤ 2 ise "Minimum gün" önerilir: alışkanlıkların minimum versiyonları gösterilir, plan hafifletilir.
- Akşam (≤ 1 dk): ne iyi gitti, ne öğrendim, yarın ilk iş. "Yarın ilk iş" ertesi sabah öncelik olarak önerilir.

### 6.3 Görevler ve hedefler
- Hızlı ekleme satırı: başlık yaz, Enter. Etiket/öncelik/tarih isteğe bağlı.
- "Bugüne al", "Yarına at". Geciken görevler bugünün listesinin üstünde, sessiz bir uyarıyla görünür.
- Hedef zinciri: kimlik ("Düzenli spor yapan biri") → 12 haftalık döngü hedefi → haftalık hedef → görevler. Görev kartında bağlı olduğu hedef küçük bir etiketle görünür.

### 6.4 Odak (Pomodoro)
- Modlar: Pomodoro (varsayılan 25/5, her 4 turda 15), serbest kronometre, karışık (birden fazla konu arasında sırayla dönme).
- Başlarken ders/konu veya görev seçilir (son seçim varsayılan).
- Zamanlayıcı başlangıç zamanını saklar; sayfa kapanıp açılsa da doğru süreyi gösterir. Ekran açık kalır (Wake Lock), bitince ses + titreşim.
- Bitince (≤ 20 sn): "Ne hatırlıyorum?" en fazla 3 madde (atlanabilir) ve konu zorluğu (kolay/orta/zor). Bu, tekrar zamanlayıcıyı günceller.

### 6.5 Ders
- Ders listesi: renk, sınav tarihi (geri sayım), haftalık hedef dakika, bu hafta ilerleme çubuğu.
- Konular: aralıklı tekrar aşamaları **1 → 3 → 7 → 14 → 30 → 60 gün**.
  - Kolay: bir aşama ileri. Orta: aynı aşamada kal, aralık tekrar. Zor: bir aşama geri (en az 0).
  - `nextReviewDate` = bugün + aşamanın gün sayısı. Bugün ve gecikmiş olanlar Bugün ekranında görünür.
- Sınava 14 gün kala: o dersin konuları için tekrar sıklığı artırılır (aralıklar sınav tarihini geçmeyecek şekilde kısaltılır).
- Deneme sınavı kaydı: tarih, net/puan, notlar; ders sayfasında küçük bir trend çizgisi.

### 6.6 Spor
- Egzersiz kütüphanesi ve şablonlar (örnek: Push / Pull / Bacak hazır gelir, düzenlenebilir).
- Antrenman kaydı: şablonu seç, her set için "geçen sefer" değerleri ve öneri dolu gelir; tek dokunuşla onayla veya değiştir. Setler arası dinlenme sayacı.
- Kademeli yük önerisi (çift ilerleme):
  - Son antrenmanda tüm setler `repMax`'a ulaştıysa → ağırlık + `incrementKg`, tekrar `repMin`.
  - Ulaşmadıysa → aynı ağırlık, +1 tekrar hedefle.
  - Üst üste 2 antrenmanda `repMin` tutmadıysa → %10 hafiflet.
- Deload: son deload'dan beri 6 hafta geçtiyse veya son 3 günün enerji/hazırlık ortalaması ≤ 2 ise deload haftası önerilir (hacim yarıya).
- Haftalık hedef (örnek: 3 antrenman) ve haftalık hacim grafiği.

### 6.7 Alışkanlıklar
- Her alışkanlık: ad, eğer-sonra cümlesi, minimum versiyon, plan (belirli günler veya haftada N kez).
- Seri yerine **tutarlılık oranı**: son 30 gündeki planlı günlerde yapılan oran ("24/30"). `min` tam sayılır, `joker` planlı gün sayısından düşer.
- Joker hakkı: alışkanlık başına haftada 1.
- "İki kere üst üste kaçırma": dün kaçırıldıysa bugün kart vurgulanır ("Bugün minimum versiyonu yeter").
- 66 günlük yerleşme çubuğu (başlangıçtan beri yapılan gün sayısı / 66); bilgi amaçlı, ceza yok.
- Takvim ısı haritası (son 12 hafta).

### 6.8 Plan (zaman blokları)
- Günlük dikey zaman çizelgesi (06:00–24:00), 15 dakikalık adımlar. Blok ekle, sürükle, kenarından uzat.
- Tekrarlanan bloklar (rutin: "Pzt-Çar-Cum 18:00 spor").
- Görevleri veya dersleri bloğa sürükleyerek yerleştirme.
- Enerji ipucu: `energy: high` görevler/dersler, kullanıcının en verimli saatlerine (istatistikten; veri yoksa sabah) yerleştirilmesi için önerilir.
- Kapasite uyarısı: planlanan blok + tahmini görev süresi toplamı, günün uyanık saatlerinin (Ayarlar'daki kalkış–yatış saati, varsayılan 07:00–23:00) %70'ini geçerse "Bugün X saat planladın, gerçekçi mi?" uyarısı.

### 6.9 Sağlık verisi (Apple Watch → Kısayollar köprüsü)
- Kullanıcı iOS'ta bir kısayol kurar (kurulum sayfası `#/ayarlar` içinde, adım adım). Kısayol dünkü uyku, adım, aktif kalori, dinlenme nabzı, HRV verilerini okuyup şunu açar:
  `https://jarvis.emirhandurmuskaya.com/#/import-health?d=<base64url JSON>`
- Veri `#` sonrasında olduğu için sunucuya gitmez. Uygulama veriyi doğrular, `health` tablosuna yazar, adres çubuğundan siler ve check-in ekranına geçer.
- Kişisel otomasyon: her sabah belirli saatte çalışır.
- Yedek yol: Sağlık "Tüm Verileri Dışa Aktar" dosyasındaki `export.xml`'i yükleyip geçmişi bir kerede alma (tarayıcıda akışlı ayrıştırma, sadece gereken türler).

### 6.10 Widget'lar
- Uygulama içi widget kartları: 6.1.
- iPhone ana ekranı/kilit ekranı: Kısayollar widget'ı ile "Odaklan" (`#/odak`), "Spor kaydet" (`#/spor/yeni`), "Check-in" (`#/checkin`), "Bugün" (`#/`) butonları. Kurulum sayfası Ayarlar'da.
- Scriptable ile bilgi gösteren widget ve gerçek, canlı widget v2'ye bırakıldı.

### 6.11 İstatistik ve haftalık değerlendirme
- Haftalık özet: toplam odak saati ve ders dağılımı, ders hedeflerine ulaşma, yapılan tekrarlar, antrenman sayısı ve hacim, alışkanlık tutarlılığı, ortalama uyku/enerji.
- İçgörüler (`logic/insights.ts`): iki grup karşılaştırması, her grupta en az 7 gün veri varsa ve fark %15'ten büyükse gösterilir. Örnekler:
  - Uyku ≥ 7 saat olan günlerde ortalama odak dakikası vs. diğer günler.
  - Saat dilimine göre odak dakikası → "En verimli saatlerin: 10–12".
  - Antrenman yapılan günlerde ertesi gün enerji.
  Yetersiz veri varsa içgörü gösterilmez (yanlış sonuç vermektense sessiz kalır).
- Pazar değerlendirmesi (≤ 5 dk): otomatik özet + 3 soru (ne iyi gitti, neyi iyileştireyim, gelecek haftanın odağı) + haftalık hedefleri seç.
- Kötü hafta (tutarlılık < %40) sonrasında "Yeniden başla" ekranı: hedefleri küçült, minimum versiyonlarla başla.

### 6.12 Ayarlar ve yedek
- JSON dışa aktar (`jarvis-yedek-YYYY-MM-DD.json`, `schemaVersion` içerir) ve içe aktar (önce doğrula, önizleme göster, "değiştir" onayıyla yaz).
- Son yedekten 7 gün geçtiyse Bugün ekranında küçük bir "Yedek al" hatırlatması.
- İlk açılışta `navigator.storage.persist()` istenir; reddedilirse Ayarlar'da uyarı.
- Pomodoro süreleri, haftalık hedefler, kart sırası, tema.

## 7. Hata yönetimi

- İçe aktarma ve sağlık verisi: şema doğrulaması; hatalı alanlar atlanır, kullanıcıya kaç kaydın alındığı/atlandığı gösterilir. Bozuk dosya veritabanına hiçbir şey yazmaz (tek transaction).
- IndexedDB açılamazsa (özel mod vb.): tam ekran açıklama, uygulama salt-okunur demo moduna düşmez, net mesaj verir.
- Service worker güncellemesi: yeni sürüm hazır olunca "Güncelle" bandı; kullanıcı onaylayınca yenilenir (zamanlayıcı çalışırken band ertelenir).
- Zamanlayıcı: başlangıç zamanı saklandığı için sayfa yenilense de süre kaybolmaz; 4 saati geçen açık seans "Bitirmeyi unuttun mu?" ile sorulur.

## 8. Test

- Vitest ile `logic/` birim testleri: tarih/gün sınırları (gece yarısı, yaz saati yok ama yerel gün), tutarlılık oranı ve joker, aralıklı tekrar aşamaları ve sınav öncesi sıkıştırma, kademeli yük ve deload kuralları, kapasite hesabı, içgörü eşikleri, sağlık verisi ayrıştırma, yedek dışa/içe aktarma gidiş-dönüş (`fake-indexeddb`).
- Manuel kontrol listesi (her aşama sonunda telefonda): ana ekrana ekle, uçak modunda aç, seans kaydet, uygulamayı kapat-aç, dışa aktar → veriyi sil → içe aktar, Kısayollar URL'siyle sağlık verisi gönder.
- Lighthouse PWA ve performans kontrolü.

## 9. Uygulama sırası

Hepsi ilk sürümün parçası, ama her aşama ayrı ayrı canlıya alınır ve telefonda denenir:
1. İskelet: proje, tema, gezinme, Dexie şeması, PWA, Cloudflare Pages + `jarvis` subdomain'i, Kısayollar widget rotaları.
2. Bugün + sabah check-in / akşam kapanışı + görevler/hedefler.
3. Odak + Ders (aralıklı tekrar, sınav geri sayımı).
4. Spor + Alışkanlıklar + sağlık verisi köprüsü.
5. Plan (zaman blokları, kapasite uyarısı).
6. İstatistik, içgörüler, haftalık değerlendirme, yedekleme, cilalama.

## 10. Kapsam dışı (v2)

Cihazlar arası senkron, native iOS kabuğu (HealthKit + gerçek widget), Scriptable widget, push bildirimleri, günlük/jurnal, su takibi, puan/rozet oyunlaştırması, sosyal özellikler.
