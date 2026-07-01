# CLAUDE.md — kurumsal-takvim-panel

Bu dosya, Claude Code'un bu repo üzerinde çalışırken bilmesi gereken bağlamı içerir.
Mami (reis) OrwexAI çatısı altında bu projeye geliştirme yapacak. Yeni özellik/değişiklik
istekleri geldikçe bu dosya güncellenecek.

## Proje nedir

Kurumsal takvim / etkinlik takip paneli. Sender adı ve varsayılan içeriklerden anlaşıldığı
kadarıyla **"Tuzla Belediyesi Afet İşleri ve Risk Yönetimi"** için yapılmış bir admin panel:
etkinlik/toplantı takvimi, hatırlatıcılar (mail), doküman arşivi, admin kullanıcı yönetimi,
aktivite logları, istatistik/heatmap.

- Backend: Node.js + Express 5, PostgreSQL (Supabase), JWT auth, Brevo (Sendinblue) ile mail
- Frontend: React 19 + Vite + TypeScript + Tailwind, FullCalendar, react-router 7
- Barındırma: Backend Render'da, frontend Vercel'de (`tuzlabelafad.vercel.app`)
- Dosya depolama: UploadThing (diske hiçbir şey yazılmıyor)

## Mimari özeti

```
backend/
  src/
    server.js          → bootstrap, middleware, route mount
    config/env.js       → tüm env değişkenleri + (tehlikeli) fallback default'lar
    db/index.js          → pg Pool + initDatabase (CREATE TABLE IF NOT EXISTS...)
    db/seed.js            → ilk süper admin'i oluşturur (env'den, yoksa default)
    middleware/auth.js     → requireAuth, requireSuperAdmin (JWT tabanlı)
    middleware/validation.js → basit input validasyonu + XSS için tag stripping
    routes/*.js              → auth, events, documents, admins, mail, settings, stats,
                               notifications (SSE dahil), reminders, activityLogs,
                               departments, staff
    services/*.js             → mailer (Brevo API), scheduler (node-cron ile hatırlatma),
                                sseManager (bildirim stream'i), notifications
frontend/
  src/
    api/*.ts        → axios tabanlı backend client'ları (http.ts JWT'yi localStorage'dan okur)
    pages/*.tsx      → Dashboard, CalendarPage, ActiveEvents/PastEvents, Documents,
                      AdminManagement, ActivityLogs, Reminders, Labels, MailSettings, Login, Staff
    components/*.tsx  → EventDrawer, Form, Card, PDF export bileşenleri
    auth/AuthContext.tsx → login/logout state
```

## Bilinen sorunlar / teknik borç (öncelik sırasına yakın)

> Bunlar 2026-07-01 tarihli bir kod incelemesinden. Biri çözüldükçe buradan silinsin/işaretlensin.

1. **[ÇÖZÜLDÜ - 2026-07-01] Gerçek DB kimlik bilgileri commit'lenmişti.**
   ✅ Supabase DB şifresi reset edildi (eski şifre artık geçersiz).
   ✅ Yeni `DATABASE_URL` Render env'e girildi.
   ✅ `backend/migrate-neon-to-supabase.js` temizlendi — artık env değişkenlerinden okuyor.
   ✅ Git history `git filter-repo` ile temizlendi ve force-push edildi; tüm geçmişte
      credential izleri kalmadığı iki kez bağımsız olarak doğrulandı.

2. **[ÇÖZÜLDÜ - 2026-07-01] Zayıf default fallback'ler.**
   ✅ `JWT_SECRET` env yoksa `config/env.js` bootstrap'ta `process.exit(1)` yapar.
   ✅ `DEFAULT_ADMIN_PASSWORD` env yoksa `db/seed.js` admin oluşturmayı `process.exit(1)` ile durdurur.
      (Admin zaten varsa bu env gerekmez; sadece ilk kurulumda zorunlu.)
   Artık uygulama bu env'ler eksikse sessizce zayıf değerlerle başlamıyor.

3. **[ŞEMA UYUŞMAZLIĞI] `documents` tablosu.** `db/index.js`'teki
   `CREATE TABLE IF NOT EXISTS documents` şeması (`file_path` kolonu) ile
   `routes/documents.js`'in gerçekte kullandığı kolonlar (`file_url`, `file_key`,
   `category`) uyuşmuyor. Migrations klasöründe de bu farkı kapatan bir dosya yok.
   Muhtemelen prod DB elle ALTER edilmiş. Sıfırdan kurulumda (yeni bir Supabase projesi)
   bu route çalışmaz. **Yapılacak:** gerçek prod şemasını `\d documents` ile çek,
   `migrations/` altına doğru `CREATE TABLE`/`ALTER TABLE`'ı ekle, `db/index.js`'i senkronla.

4. **[ÖLÜ / YARIM KOD] Mail ayarları paneli çalışmıyor.**
   `PUT /api/settings/mail` hiçbir şeyi kaydetmiyor, sadece mevcut env değerini geri
   döndürüyor. `services/brevoSettings.js` ve `services/smtpSettings.js` (DB'den API key
   okuma/yazma) hiçbir yerden çağrılmıyor — tamamen ölü kod. Gerçek mail gönderimi
   (`services/mailer.js`) sadece `process.env.BREVO_API_KEY`'i kullanıyor. Ya bu özelliği
   tamamlayıp panelden mail ayarı değiştirilebilir hale getirin ya da ölü kodu silip
   frontend'deki `MailSettings.tsx` sayfasını "sadece env'den okunur, salt-okunur bilgi"
   olarak netleştirin.

5. **[KISMI ÇÖZÜLDÜ - 2026-07-01] Bağımlılık güvenliği.**
   `npm audit fix` uygulandı:
   - Frontend: 20 → 2 zafiyet. `react-router` 7.18.1'e güncellendi (RCE/XSS kapatıldı ✅).
   - Backend: 14 → 3 zafiyet. `multer`, `path-to-regexp`, `express-rate-limit` vb. düzeltildi ✅.
   ⚠️ **KALAN (düzeltilemez — major downgrade gerektirir):**
   - Backend: `uploadthing@7.7.4` → `effect` zafiyeti (HIGH, AsyncLocalStorage/RPC).
     Düzeltmek için v7→v6 downgrade gerekiyor, bu dosya yüklemeyi tamamen kırar.
     Bu projede RPC/fiber kullanılmıyor; pratik risk düşük.
   - Frontend: `exceljs@4.4.0` → `uuid` buffer bounds zafiyeti (MODERATE).
     Düzeltmek için v4→v3 downgrade gerekiyor, Excel export kırılır.
     Sadece `buf` parametresi ile uuid çağrısında tetiklenir; pratik risk düşük.
   Her iki paket için upstream'de fix sürümü çıkması beklenecek.

6. **[TEMİZLİK] Repoda kazara commit'lenmiş dosyalar:**
   - Kök dizinde `-` adında 1.3MB'lık anlamsız bir dosya
   - `logo_base64.txt`, `logo_data_uri.txt` (toplam ~2.6MB, muhtemelen bir kerelik script çıktısı)
   - `convert.ps1`, `create_data_uri.ps1` (yerel yardımcı script'ler, repo'da işi yok)
   - `backend/migration_log.txt`
   - `backend/test-simple-auth.js` (kullanılmayan eski test/debug dosyası)
   - `backend/src/routes/admin.js` (tek satır "deprecated" yorumu dışında boş)

7. **[MİMARİ / YETKİ]** Events route'larında (`events.js`) sahiplik/rol kontrolü yok —
   herhangi bir authenticated admin, başka bir adminin oluşturduğu etkinliği
   silebiliyor/güncelleyebiliyor. `documents.js`'te ise silme işlemi doğru şekilde
   sahiplik + süper admin kontrolü yapıyor. Bu tutarsızlığın bilinçli mi yoksa gözden
   kaçmış mı olduğu netleştirilmeli.

8. **[HAFİF]** `middleware/validation.js`'deki XSS koruması regex ile `<...>` silme —
   zayıf bir yöntem. React zaten default escape yaptığı için risk düşük ama
   `dangerouslySetInnerHTML` ileride bir yerde kullanılırsa açık kapı olur.
   JWT'nin `localStorage`'da tutulması da XSS senaryosunda token çalınmasını kolaylaştırıyor.

## Geliştirme notları

- Backend'i çalıştırmak için `backend/.env` gerekiyor, `.env.example`'ı referans al.
  `DATABASE_URL` olmadan uygulama hiç ayağa kalkmıyor (bilinçli tasarım, iyi).
- SQL injection'a karşı proje genelinde parametrized query kullanımı tutarlı — bu iyi,
  yeni route'larda da bu pattern korunmalı (`$1, $2...` + params array).
- Mail gönderimi Brevo Transactional Email API üzerinden (`sib-api-v3-sdk`), SMTP değil
  (kod içinde `smtp.js`/`mail.js` gibi isimler kafa karıştırabilir ama gerçek gönderim
  Brevo API ile).
- Hatırlatıcılar `services/scheduler.js`'de node-cron ile çalışıyor, İstanbul saat dilimine
  göre gün aralığı hesaplıyor.
- Bildirimler SSE (`/api/notifications/stream`) ile anlık gönderiliyor, token hem header
  hem query param (`?token=`) ile kabul ediliyor (EventSource header gönderemediği için).

## Yeni özellik eklerken

- Yeni route eklerken mutlaka `requireAuth` (ve gerekiyorsa `requireSuperAdmin`)
  middleware'ini uygula, mevcut route'lardaki pattern'i takip et.
- Yeni tablo/kolon eklerken hem `db/index.js`'teki `initDatabase()`'e hem
  `backend/migrations/` altına ilgili SQL'i ekle — ikisi senkron kalmalı (bkz. madde 3).
- Aktivite logu ve bildirim oluşturma pattern'i (`activity_logs` insert +
  `createNotificationForAllAdminUsers`) mevcut route'larda (events.js, admins.js) örnek
  alınabilir, yeni CRUD endpoint'lerinde de aynı pattern uygulanmalı.

---

## Yenilik / değişiklik günlüğü

_Mami buraya ne ekleneceğini söyledikçe güncellenecek._

- **[2026-07-02] Ekipman / Stok Yönetimi sayfası eklendi.**
  - Yeni tablolar: `inventory_items`, `inventory_variants`, `inventory_assignments` — `db/index.js` ve `backend/migrations/add_inventory.sql` içinde tanımlı.
  - Stok azaltma/iade işlemleri `runTransaction()` ile atomik — race condition riski yok.
  - `runTransaction(callback)` yardımcı fonksiyonu `db/index.js`'e eklendi ve export edildi.
  - Backend: `GET/POST/PUT/DELETE /api/inventory/items`, `POST /items/:id/variants`, `POST /variants/:id/adjust`, `GET /variants/:id/assignments`, `POST /assignments`, `PUT /assignments/:id/return`.
  - `GET /api/staff/:id` artık `active_assignments` dizisi de döndürüyor (zimmetler).
  - Frontend: `pages/Inventory.tsx` (accordion+5 modal), `api/inventory.ts` client'ı eklendi.
  - Staff.tsx'e "Zimmetler" butonu eklendi — tüm adminler görür, "İade Al" yalnızca süper admin.
  - Sidebar'a "Stok" (`Package` ikonu, turuncu) eklendi — tüm adminler görür.

- **[2026-07-01] Ekip / Personel sayfası eklendi.**
  - Yeni tablolar: `departments` (birimler), `staff` (personel) — her ikisi hem `db/index.js` hem `backend/migrations/add_staff_departments.sql` içinde tanımlı.
  - `staff` tablosunda `CHECK` kısıtı: `is_volunteer=true` ise `department_id` NULL olmalı, aksi durumda dolu olmalı.
  - Backend: `GET/POST/PUT/DELETE /api/departments` ve `GET/POST/PUT/DELETE /api/staff` route'ları eklendi.
  - TC Kimlik No validasyonu sunucu tarafında uygulandı (standart algoritma, `validation.js`'de `validateTcNo`).
  - TC No listede her zaman maskeli (`123****89`), detay endpoint'inde süper admin tam görür.
  - Düzenlemede TC no boş bırakılırsa mevcut değer korunur.
  - Frontend: `pages/Staff.tsx` sayfası, `api/departments.ts` ve `api/staff.ts` client'ları eklendi.
  - Sidebar'a "Ekip" (`UserCheck` ikonu) eklendi — tüm adminler görür.
  - "Personel Ekle", "Düzenle", "Sil" butonları ve "Birimleri Yönet" modalı yalnızca `is_super_admin` için görünür.
