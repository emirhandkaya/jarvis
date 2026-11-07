# Jarvis Plan 1: Temel + Günlük Döngü — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Telefona eklenebilen, çevrimdışı çalışan Jarvis PWA iskeletini kurmak ve günlük döngüyü (Bugün ekranı, sabah check-in, akşam kapanışı, görevler, hedefler, yedekleme) çalışır hale getirip `jarvis.emirhandurmuskaya.com`'da yayınlamak.

**Architecture:** Vite + Preact + TypeScript statik SPA, hash router. Tüm veri Dexie (IndexedDB) içinde; tüm şema v1'de baştan tanımlanır, sonraki planlar sadece repo/UI ekler. Kararlar `src/logic/` içindeki saf fonksiyonlarda (Vitest ile test edilir); bileşenler `src/db/repo/` üzerinden okur/yazar.

**Tech Stack:** Vite, Preact (`@preact/preset-vite`, `preact/compat`), TypeScript (strict), Dexie 4 + `dexie-react-hooks`, `vite-plugin-pwa`, Vitest + `fake-indexeddb` + `jsdom`, Cloudflare Pages. Paketler kurulum anındaki son kararlı sürümle kurulur.

**Spec:** `docs/superpowers/specs/2026-11-07-jarvis-design.md`

Sonraki planlar (ayrı dosyalar, bu plan bittikten sonra yazılır): 2 Odak + Ders, 3 Spor + Alışkanlıklar + Sağlık köprüsü, 4 Plan (zaman blokları), 5 İstatistik + içgörüler + haftalık değerlendirme.

## Global Constraints

- Tek kullanıcı, giriş yok, backend yok; tüm veri IndexedDB'de.
- Arayüz metinleri Türkçe.
- Tarihler `YYYY-MM-DD` yerel gün string'i; zaman damgaları ISO string.
- Her kaydın `id` (`crypto.randomUUID()`), `createdAt`, `updatedAt` alanı vardır (PK'si `date`/`key`/`weekStart` olan tablolar hariç `id`).
- Rotalar hash tabanlı: `#/`, `#/checkin`, `#/kapanis`, `#/plan`, `#/odak`, `#/ders`, `#/ders/:id`, `#/spor`, `#/spor/yeni`, `#/aliskanlik`, `#/gorevler`, `#/hedefler`, `#/istatistik`, `#/degerlendirme`, `#/ayarlar`, `#/import-health`, ve Menü sekmesi için `#/menu`.
- Alt gezinme 5 sekme: Bugün · Plan · Odak (ortada, büyük) · Spor · Menü.
- Koyu tema varsayılan; telefon-öncelikli, tek elle kullanım; her kayıt ≤ 2 dokunuş.
- `src/logic/` Dexie'ye ve DOM'a dokunmaz.
- Yedek dosya adı `jarvis-yedek-YYYY-MM-DD.json`, içinde `schemaVersion`.
- Akşam kapanışı çağrısı saat 20:00'den sonra; enerji ≤ 2 ise "Minimum gün" önerisi.
- Ayar varsayılanları: kalkış `07:00`, yatış `23:00`, pomodoro 25/5/15, her 4 turda uzun mola.

## Review Focus

1. **Gece yarısından sonra kullanım:** 00:30'da akşam kapanışı yapan kişi bunun önceki güne yazılmasını bekler. "Bugün", saat 04:00'ten önce bir önceki gündür (`DAY_START_HOUR = 4`). → Task 2 testi.
2. **Aynı gün ikinci check-in:** tekrar kaydetmek yeni satır değil, mevcut kaydı günceller (sabah alanları ve akşam alanları birbirini silmez). → Task 7 testi.
3. **Boş/boşluklu hızlı görev ekleme:** hiçbir şey eklenmez. → Task 5 testi.
4. **Bilinmeyen veya bozuk rota (`#/xyz`, `#`, boş):** Bugün ekranına düşer, beyaz ekran olmaz. → Task 3 testi.
5. **Bozuk/yanlış yedek dosyası içe aktarma:** veritabanına hiçbir şey yazılmaz, mevcut veri kalır, hata mesajı gösterilir. → Task 10 testi.

---

### Task 1: Proje iskeleti, test altyapısı, PWA

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/app.tsx`, `src/styles/theme.css`, `public/icon.svg`, `tests/setup.ts`, `tests/smoke.test.ts`

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm test` (vitest run), `npm run preview`. Vitest ortamı `jsdom`, setup dosyası `fake-indexeddb/auto` import eder.

- [ ] **Step 1:** `npm init` + bağımlılıkları kur: `preact dexie dexie-react-hooks`; dev: `vite @preact/preset-vite typescript vite-plugin-pwa vitest jsdom fake-indexeddb @vite-pwa/assets-generator`. `.gitignore`: `node_modules`, `dist`, `dev-dist`.
- [ ] **Step 2:** `tsconfig.json` strict, `jsx: react-jsx`, `jsxImportSource: preact`, `paths` ile `react`/`react-dom` → `preact/compat` (dexie-react-hooks için). `vite.config.ts`: `preact()` + `VitePWA({ registerType: 'prompt', manifest: { name: 'Jarvis', short_name: 'Jarvis', lang: 'tr', display: 'standalone', start_url: '/#/', background_color: '#0f1115', theme_color: '#0f1115' }, pwaAssets: { image: 'public/icon.svg' } })`; `test: { environment: 'jsdom', setupFiles: ['tests/setup.ts'] }`; `resolve.alias` react → preact/compat.
- [ ] **Step 3:** `public/icon.svg`: koyu zemin üzerinde yuvarlak köşeli "J" harfi. `index.html` `lang="tr"`, `viewport-fit=cover`, `apple-mobile-web-app-capable`.
- [ ] **Step 4:** `src/styles/theme.css`: `:root` renk değişkenleri (`--bg #0f1115`, `--surface`, `--text`, `--muted`, `--accent`, `--danger`, kategori renkleri `--ders --spor --kisisel --is`), `env(safe-area-inset-*)` boşlukları, 16px taban font, ≥ 44px dokunma hedefleri.
- [ ] **Step 5:** Smoke testi yaz: `tests/smoke.test.ts` → `expect(indexedDB).toBeDefined()`. `npm test` → PASS.
- [ ] **Step 6:** `src/app.tsx` "Jarvis" başlığını render etsin. `npm run build` → başarılı, `dist/manifest.webmanifest` ve `dist/sw.js` oluşur.
- [ ] **Step 7:** Commit `chore: scaffold Vite + Preact + PWA project`.

### Task 2: Tarih yardımcıları

**Files:**
- Create: `src/logic/dates.ts`
- Test: `tests/logic/dates.test.ts`

**Interfaces:**
- Produces:
  - `DAY_START_HOUR = 4`
  - `todayStr(now?: Date): string` — `now`'dan 4 saat çıkarılmış yerel gün.
  - `addDays(date: string, n: number): string`
  - `weekStart(date: string): string` — o haftanın pazartesisi.
  - `isSunday(date: string): boolean`
  - `diffDays(a: string, b: string): number` — `b - a` gün.
  - `minutesOfDay(hhmm: string): number`

- [ ] **Step 1: Failing testler**

```ts
test('04:00 öncesi önceki gün sayılır', () => {
  expect(todayStr(new Date(2026, 10, 8, 0, 30))).toBe('2026-11-07')
  expect(todayStr(new Date(2026, 10, 8, 4, 0))).toBe('2026-11-08')
})
test('addDays ay/yıl sınırı', () => {
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
})
test('weekStart pazartesi döner', () => {
  expect(weekStart('2026-11-08')).toBe('2026-11-02') // pazar
  expect(weekStart('2026-11-02')).toBe('2026-11-02')
})
test('diffDays ve minutesOfDay', () => {
  expect(diffDays('2026-11-01', '2026-11-08')).toBe(7)
  expect(minutesOfDay('07:30')).toBe(450)
})
```

- [ ] **Step 2:** `npx vitest run tests/logic/dates.test.ts` → FAIL (modül yok).
- [ ] **Step 3:** Uygula. Hesaplar yerel `Date(y, m-1, d)` ile; UTC'ye çevirme yok (saat dilimi kayması olmasın).
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** Commit `feat: add local date helpers with 04:00 day start`.

### Task 3: Hash router

**Files:**
- Create: `src/router.ts`
- Test: `tests/logic/router.test.ts`

**Interfaces:**
- Produces:
  - `type RouteName = 'bugun'|'checkin'|'kapanis'|'plan'|'odak'|'ders'|'dersDetay'|'spor'|'sporYeni'|'aliskanlik'|'gorevler'|'hedefler'|'istatistik'|'degerlendirme'|'ayarlar'|'importHealth'|'menu'`
  - `interface Route { name: RouteName; params: Record<string,string>; query: URLSearchParams }`
  - `parseHash(hash: string): Route`
  - `useRoute(): Route` (hashchange dinler)
  - `navigate(path: string): void` (`location.hash = path`)
  - `#/menu` rotası da eklenir (Menü sekmesi).

- [ ] **Step 1: Failing testler**

```ts
test('temel rotalar', () => {
  expect(parseHash('#/').name).toBe('bugun')
  expect(parseHash('#/gorevler').name).toBe('gorevler')
})
test('parametre ve query', () => {
  const r = parseHash('#/ders/abc')
  expect(r.name).toBe('dersDetay'); expect(r.params.id).toBe('abc')
  expect(parseHash('#/import-health?d=xyz').query.get('d')).toBe('xyz')
})
test('bilinmeyen/boş rota Bugün\'e düşer', () => {
  for (const h of ['', '#', '#/xyz', '#/ders/a/b']) expect(parseHash(h).name).toBe('bugun')
})
```

- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3:** Uygula: rota tablosu `[pattern, name]`, `:id` segmentleri eşleşir.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** Commit `feat: add hash router`.

### Task 4: Veritabanı şeması ve ayarlar

**Files:**
- Create: `src/db/types.ts`, `src/db/schema.ts`, `src/db/meta.ts`, `src/db/repo/settings.ts`
- Test: `tests/db/schema.test.ts`, `tests/db/settings.test.ts`

**Interfaces:**
- Produces:
  - `src/db/types.ts`: spec bölüm 4'teki tüm tablolar için tipler: `Setting, Checkin, Goal, Task, Course, Topic, FocusSession, Exercise, Template, Workout, WorkoutSet, Habit, HabitLog, Block, HealthDay, Review`. Alan adları spec'teki gibi (`sets` tablosunun tipi `WorkoutSet`).
  - `src/db/schema.ts`: `class JarvisDB extends Dexie`, `export const db`, `SCHEMA_VERSION = 1`. İndeksler:
    `settings: 'key'`, `checkins: 'date'`, `goals: 'id, kind, parentId'`, `tasks: 'id, plannedDate, dueDate, doneAt, goalId'`, `courses: 'id'`, `topics: 'id, courseId, nextReviewDate'`, `focusSessions: 'id, startedAt, courseId'`, `exercises: 'id'`, `templates: 'id'`, `workouts: 'id, date'`, `sets: 'id, workoutId, exerciseId'`, `habits: 'id'`, `habitLogs: 'id, &[habitId+date], date'`, `blocks: 'id, date'`, `health: 'date'`, `reviews: 'weekStart'`.
  - `src/db/meta.ts`: `newRecord<T>(fields: T): T & { id: string; createdAt: string; updatedAt: string }`, `touch<T>(rec: T): T` (updatedAt yeniler).
  - `src/db/repo/settings.ts`: `DEFAULT_SETTINGS = { wakeTime: '07:00', sleepTime: '23:00', pomodoro: { work: 25, short: 5, long: 15, longEvery: 4 }, cardOrder: [] as string[], hiddenCards: [] as string[], lastBackupAt: null as string | null }`, `type Settings = typeof DEFAULT_SETTINGS`, `getSettings(): Promise<Settings>` (eksikleri varsayılanla doldurur), `setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void>`, `useSettings(): Settings | undefined`.

- [ ] **Step 1: Failing testler**

```ts
test('tüm tablolar açılır', async () => {
  await db.open()
  expect(db.tables.map(t => t.name).sort()).toEqual(['blocks','checkins','courses','exercises','focusSessions','goals','habitLogs','habits','health','reviews','settings','sets','tasks','templates','topics','workouts'])
})
test('habitLogs [habitId+date] benzersiz', async () => {
  await db.habitLogs.add({ id: 'a', habitId: 'h', date: '2026-11-07', status: 'done', createdAt: '', updatedAt: '' })
  await expect(db.habitLogs.add({ id: 'b', habitId: 'h', date: '2026-11-07', status: 'min', createdAt: '', updatedAt: '' })).rejects.toThrow()
})
test('ayar varsayılanları ve yazma', async () => {
  expect((await getSettings()).wakeTime).toBe('07:00')
  await setSetting('wakeTime', '06:30')
  expect((await getSettings()).wakeTime).toBe('06:30')
  expect((await getSettings()).pomodoro.work).toBe(25)
})
```
Her test dosyasında `beforeEach(async () => { await db.delete(); await db.open() })`.

- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3:** Uygula.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** Commit `feat: add Dexie schema v1 and settings repo`.

### Task 5: Görevler ve hedefler (mantık + repo)

**Files:**
- Create: `src/logic/tasks.ts`, `src/db/repo/tasks.ts`, `src/db/repo/goals.ts`
- Test: `tests/logic/tasks.test.ts`, `tests/db/tasks.test.ts`

**Interfaces:**
- Consumes: `todayStr`, `addDays` (Task 2), `db`, `newRecord`, `touch` (Task 4).
- Produces:
  - `logic/tasks.ts`: `todayView(tasks: Task[], today: string): { overdue: Task[]; today: Task[]; done: Task[] }` — `overdue`: tamamlanmamış ve (`plannedDate < today` veya `dueDate < today`); `today`: tamamlanmamış ve (`plannedDate === today` veya `dueDate === today`), overdue'da olmayan; `done`: `doneAt` bugüne ait olanlar. Sıralama: öncelik (1 en yüksek), sonra `createdAt`.
  - `repo/tasks.ts`: `addTask(title: string, opts?: Partial<Pick<Task,'tag'|'priority'|'dueDate'|'plannedDate'|'estimateMin'|'energy'|'goalId'>>): Promise<Task | null>` (boş/boşluk → `null`, kaydetmez; varsayılan `tag 'kisisel'`, `priority 2`, `energy 'low'`), `toggleDone(id)`, `planFor(id, date: string | null)`, `updateTask(id, patch)`, `deleteTask(id)`, `useTasks(): Task[] | undefined`.
  - `repo/goals.ts`: `addGoal(kind: Goal['kind'], title: string, parentId?: string, start?: string, end?: string): Promise<Goal>` (kind `cycle` ise `end` verilmezse `start + 84 gün`), `useGoals()`, `goalChain(goals: Goal[], id: string): Goal[]` (kökten yaprağa), `archiveGoal(id)`.

- [ ] **Step 1: Failing testler**

```ts
test('todayView geciken, bugün, biten ayırır', () => {
  const t = (o: Partial<Task>) => ({ id: crypto.randomUUID(), title: 'x', tag: 'kisisel', priority: 2, energy: 'low', createdAt: '2026-11-01T00:00:00Z', updatedAt: '', ...o }) as Task
  const v = todayView([t({ plannedDate: '2026-11-06' }), t({ dueDate: '2026-11-07', priority: 1 }), t({ plannedDate: '2026-11-07', priority: 3 }), t({ plannedDate: '2026-11-07', doneAt: '2026-11-07T10:00:00' })], '2026-11-07')
  expect(v.overdue).toHaveLength(1)
  expect(v.today.map(x => x.priority)).toEqual([1, 3])
  expect(v.done).toHaveLength(1)
})
test('boş başlık eklenmez', async () => {
  expect(await addTask('   ')).toBeNull()
  expect(await db.tasks.count()).toBe(0)
})
test('toggleDone iki kez geri alır', async () => {
  const task = (await addTask('Fizik çöz'))!
  await toggleDone(task.id); expect((await db.tasks.get(task.id))!.doneAt).toBeTruthy()
  await toggleDone(task.id); expect((await db.tasks.get(task.id))!.doneAt).toBeUndefined()
})
test('cycle hedefi 12 hafta', async () => {
  const g = await addGoal('cycle', 'YKS netleri', undefined, '2026-11-09')
  expect(g.end).toBe('2027-02-01')
})
test('goalChain kökten yaprağa', () => {
  const g = (id: string, kind: Goal['kind'], parentId?: string) => ({ id, kind, title: id, parentId, status: 'active' }) as Goal
  const goals = [g('w', 'week', 'c'), g('i', 'identity'), g('c', 'cycle', 'i')]
  expect(goalChain(goals, 'w').map(x => x.id)).toEqual(['i', 'c', 'w'])
  expect(goalChain(goals, 'yok')).toEqual([])
})
```

- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3:** Uygula. `doneAt` bugüne ait mi kontrolü: `todayStr(new Date(doneAt)) === today`.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** Commit `feat: add tasks and goals logic and repos`.

### Task 6: Uygulama kabuğu ve ortak UI

**Files:**
- Create: `src/ui/NavBar.tsx`, `src/ui/Card.tsx`, `src/ui/Sheet.tsx`, `src/ui/Button.tsx`, `src/ui/Page.tsx`, `src/features/menu/MenuPage.tsx`, `src/features/placeholder/ComingSoon.tsx`, `src/styles/ui.css`
- Modify: `src/app.tsx`

**Interfaces:**
- Consumes: `useRoute`, `navigate`, `RouteName` (Task 3).
- Produces: `<Page title actions?>`, `<Card title? onClick?>`, `<Sheet open onClose>` (alttan açılan panel), `<Button variant: 'primary'|'ghost'|'danger'>`. `app.tsx` rota → sayfa eşlemesi; henüz yapılmamış rotalar `<ComingSoon name="Spor" />` gösterir.

- [ ] **Step 1:** NavBar: 5 sekme (Bugün `#/`, Plan `#/plan`, Odak `#/odak` ortada büyük yuvarlak buton, Spor `#/spor`, Menü `#/menu`), aktif sekme vurgulu, `safe-area-inset-bottom`.
- [ ] **Step 2:** MenuPage: Ders, Alışkanlıklar, Görevler, Hedefler, İstatistik, Haftalık değerlendirme, Ayarlar bağlantıları.
- [ ] **Step 3:** `npm run dev`, tarayıcıda 375×812 görünümde her sekmeye ve menü öğesine tıkla → doğru sayfa/ComingSoon açılır, yatay kaydırma yok, `#/xyz` Bugün'ü gösterir.
- [ ] **Step 4:** `npm test` ve `npm run build` → geçer.
- [ ] **Step 5:** Commit `feat: add app shell, nav bar and shared UI`.

### Task 7: Check-in mantığı ve repo

**Files:**
- Create: `src/logic/checkin.ts`, `src/db/repo/checkins.ts`
- Test: `tests/logic/checkin.test.ts`, `tests/db/checkins.test.ts`

**Interfaces:**
- Consumes: `todayStr`, `addDays`, `isSunday` (Task 2), `db` (Task 4).
- Produces:
  - `type DayPrompt = 'checkin' | 'kapanis' | 'degerlendirme' | null`
  - `dayPrompt(now: Date, today: Checkin | undefined, weekReviewed: boolean): DayPrompt` — sabah check-in yoksa `'checkin'`; saat ≥ 20 (veya saat < 4) ve kapanış (`wins`/`learned`/`tomorrowFirst` hepsi boş) yapılmadıysa `'kapanis'`; pazar ve hafta değerlendirilmediyse `'degerlendirme'`; yoksa `null`. Öncelik bu sırayla.
  - `isMinimumDay(c: Checkin | undefined): boolean` — `energy <= 2`.
  - `suggestedPriorities(yesterday: Checkin | undefined): string[]` — dünün `tomorrowFirst`'ü varsa onu ilk öneri yapar.
  - `repo/checkins.ts`: `saveMorning(date, { sleepHours?, energy, mood, priorities })`, `saveEvening(date, { wins?, learned?, tomorrowFirst? })` — ikisi de **upsert**, diğer alanları korur; `useCheckin(date)`.

- [ ] **Step 1: Failing testler**

```ts
test('dayPrompt sırası', () => {
  const morning = { date: '2026-11-07', energy: 3, mood: 3, priorities: [] } as Checkin
  expect(dayPrompt(new Date(2026, 10, 7, 9), undefined, false)).toBe('checkin')
  expect(dayPrompt(new Date(2026, 10, 7, 9), morning, false)).toBeNull()
  expect(dayPrompt(new Date(2026, 10, 7, 21), morning, false)).toBe('kapanis')
  expect(dayPrompt(new Date(2026, 10, 8, 1), morning, false)).toBe('kapanis') // gece 01:00, hâlâ 7 Kasım
  expect(dayPrompt(new Date(2026, 10, 8, 10), { ...morning, date: '2026-11-08' }, false)).toBe('degerlendirme') // pazar
})
test('enerji 2 minimum gün', () => {
  expect(isMinimumDay({ energy: 2 } as Checkin)).toBe(true)
  expect(isMinimumDay({ energy: 3 } as Checkin)).toBe(false)
})
test('sabah ve akşam kaydı birbirini silmez', async () => {
  await saveMorning('2026-11-07', { energy: 4, mood: 3, priorities: ['a'] })
  await saveEvening('2026-11-07', { wins: 'spor' })
  await saveMorning('2026-11-07', { energy: 2, mood: 3, priorities: ['a'] })
  const c = await db.checkins.get('2026-11-07')
  expect(c).toMatchObject({ energy: 2, wins: 'spor' })
  expect(await db.checkins.count()).toBe(1)
})
```

- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3:** Uygula.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** Commit `feat: add check-in logic and repo`.

### Task 8: Check-in ve kapanış ekranları

**Files:**
- Create: `src/features/checkin/CheckinPage.tsx`, `src/features/checkin/KapanisPage.tsx`, `src/ui/Scale.tsx`

**Interfaces:**
- Consumes: `saveMorning`, `saveEvening`, `useCheckin`, `suggestedPriorities` (Task 7), `useTasks`, `todayView` (Task 5), `navigate` (Task 3).
- Produces: `<Scale value onChange max=5 labels?>` (1–5 seçimi, tek dokunuş).

- [ ] **Step 1:** CheckinPage (`#/checkin`): uyku saati (0,5 adımlı, `health` tablosunda bugün `sleepMin` varsa dolu), enerji `Scale`, ruh hali `Scale`, 3 öncelik: bugünün görevlerinden dokunarak seç veya yaz; dünün `tomorrowFirst`'ü ilk sırada önerilir. "Kaydet" → `saveMorning` → `#/`. Enerji ≤ 2 seçilince "Bugün minimum gün olabilir, sorun değil" notu görünür.
- [ ] **Step 2:** KapanisPage (`#/kapanis`): üç kısa metin alanı (Ne iyi gitti? / Ne öğrendim? / Yarın ilk iş?), "Kaydet" → `saveEvening` → `#/`. Gece 00:00–04:00 arası önceki güne yazılır (`todayStr` sayesinde).
- [ ] **Step 3:** Tarayıcıda dene: check-in kaydet → sayfayı yenile → değerler korunur; kapanışı kaydet → yenile → metinler korunur, sabah değerleri silinmemiş. (Ertesi gün önerisi Task 7 testleriyle kapsanır.)
- [ ] **Step 4:** Commit `feat: add morning check-in and evening close screens`.

### Task 9: Görevler ve Hedefler ekranları

**Files:**
- Create: `src/features/tasks/TasksPage.tsx`, `src/features/tasks/QuickAdd.tsx`, `src/features/tasks/TaskRow.tsx`, `src/features/tasks/TaskSheet.tsx`, `src/features/goals/GoalsPage.tsx`

**Interfaces:**
- Consumes: Task 5'teki tüm repo/mantık fonksiyonları, `Sheet`, `Card` (Task 6).
- Produces: `<QuickAdd defaultPlannedDate?: string />`, `<TaskRow task />` (Bugün ekranı da kullanır).

- [ ] **Step 1:** QuickAdd: tek satır, Enter/“+” ile `addTask`, ekledikten sonra alan boşalır ve odakta kalır.
- [ ] **Step 2:** TaskRow: solda daire (dokun → `toggleDone`), başlık, etiket rengi, bağlı hedef küçük etiket; sağa kaydırma yerine satıra dokununca TaskSheet açılır (etiket, öncelik, son tarih, "Bugüne al" / "Yarına at", tahmini süre, enerji yüksek/düşük, hedef seç, sil).
- [ ] **Step 3:** TasksPage (`#/gorevler`): Geciken / Bugün / Yaklaşan / Tarihsiz grupları + en üstte QuickAdd.
- [ ] **Step 4:** GoalsPage (`#/hedefler`): üç bölüm (Kim olmak istiyorum? / 12 haftalık hedefler (kalan hafta göstergesi) / Bu haftanın hedefleri), her biri altına alt hedef ekleme, arşivle.
- [ ] **Step 5:** Tarayıcıda dene: boş görev eklenmiyor, görev ekle → bugüne al → tamamla → geri al; hedef zinciri oluştur ve göreve bağla.
- [ ] **Step 6:** Commit `feat: add tasks and goals screens`.

### Task 10: Yedekleme (dışa/içe aktarma)

**Files:**
- Create: `src/logic/backup.ts`, `src/db/repo/backup.ts`
- Test: `tests/logic/backup.test.ts`, `tests/db/backup.test.ts`

**Interfaces:**
- Consumes: `db`, `SCHEMA_VERSION` (Task 4), `setSetting` (Task 4).
- Produces:
  - `interface BackupFile { app: 'jarvis'; schemaVersion: number; exportedAt: string; tables: Record<string, unknown[]> }`
  - `logic/backup.ts`: `validateBackup(json: unknown): { ok: true; file: BackupFile; counts: Record<string, number> } | { ok: false; error: string }` — `app !== 'jarvis'`, `schemaVersion > SCHEMA_VERSION`, bilinmeyen tablo adı veya dizi olmayan tablo → hata. `backupFileName(date: string): string` → `jarvis-yedek-YYYY-MM-DD.json`. `needsBackupReminder(lastBackupAt: string | null, today: string): boolean` → null ya da ≥ 7 gün.
  - `repo/backup.ts`: `exportAll(): Promise<BackupFile>`, `importAll(file: BackupFile): Promise<void>` — tek `rw` transaction içinde tüm tabloları temizleyip yazar; `downloadBackup()` (Blob + `<a download>`, sonra `lastBackupAt` ayarlanır).

- [ ] **Step 1: Failing testler**

```ts
test('geçersiz dosyalar reddedilir', () => {
  expect(validateBackup(null).ok).toBe(false)
  expect(validateBackup({ app: 'baska', schemaVersion: 1, tables: {} }).ok).toBe(false)
  expect(validateBackup({ app: 'jarvis', schemaVersion: 99, tables: {} }).ok).toBe(false)
  expect(validateBackup({ app: 'jarvis', schemaVersion: 1, tables: { tasks: 'x' } }).ok).toBe(false)
})
test('dosya adı ve hatırlatma', () => {
  expect(backupFileName('2026-11-07')).toBe('jarvis-yedek-2026-11-07.json')
  expect(needsBackupReminder(null, '2026-11-07')).toBe(true)
  expect(needsBackupReminder('2026-11-01T10:00:00Z', '2026-11-07')).toBe(false)
  expect(needsBackupReminder('2026-10-31T10:00:00Z', '2026-11-07')).toBe(true)
})
test('dışa → sil → içe gidiş dönüş', async () => {
  await addTask('A'); await saveMorning('2026-11-07', { energy: 3, mood: 3, priorities: [] })
  const file = await exportAll()
  await db.tasks.clear(); await db.checkins.clear()
  await importAll(file)
  expect(await db.tasks.count()).toBe(1); expect(await db.checkins.count()).toBe(1)
})
test('içe aktarma ortasında hata olursa mevcut veri kalır', async () => {
  await addTask('Mevcut')
  const bad = { app: 'jarvis', schemaVersion: 1, exportedAt: '', tables: { tasks: [{ id: 'x' }, { id: 'x' }] } } as BackupFile // tekrar eden PK
  await expect(importAll(bad)).rejects.toThrow()
  expect((await db.tasks.toArray()).map(t => t.title)).toEqual(['Mevcut'])
})
```

- [ ] **Step 2:** Test → FAIL.
- [ ] **Step 3:** Uygula. `importAll` içinde `bulkAdd` kullan (`bulkPut` değil), böylece tekrar eden PK hata verir ve transaction geri alınır.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5:** Commit `feat: add JSON backup export/import`.

### Task 11: Ayarlar ekranı, kalıcı depolama, Kısayollar kurulumu

**Files:**
- Create: `src/features/settings/SettingsPage.tsx`, `src/features/settings/ShortcutsGuide.tsx`, `src/db/persist.ts`

**Interfaces:**
- Consumes: `getSettings`, `setSetting`, `useSettings` (Task 4), `validateBackup`, `exportAll`, `importAll`, `downloadBackup` (Task 10).
- Produces: `requestPersist(): Promise<boolean>` (`navigator.storage?.persist?.()`; yoksa `false`), `isPersisted(): Promise<boolean>`.

- [ ] **Step 1:** SettingsPage (`#/ayarlar`): kalkış/yatış saati, pomodoro süreleri, "Yedeği indir", "Yedekten geri yükle" (dosya seç → `validateBackup` → tablo başına kayıt sayısı önizlemesi → "Mevcut verinin yerine yaz" onayı → `importAll`; hata mesajı Türkçe), depolama durumu ("Kalıcı" / "Tarayıcı silebilir: uygulamayı ana ekrana ekle").
- [ ] **Step 2:** `main.tsx` ilk açılışta `requestPersist()` çağırır.
- [ ] **Step 3:** ShortcutsGuide: iPhone Kısayollar widget'ı için adım adım metin + kopyalanabilir URL'ler: `https://jarvis.emirhandurmuskaya.com/#/odak`, `/#/spor/yeni`, `/#/checkin`, `/#/`. (Sağlık köprüsü kılavuzu Plan 3'te eklenir.)
- [ ] **Step 4:** Tarayıcıda dene: yedeği indir, bir görev sil, yedeği geri yükle → görev geri gelir; rastgele bir `.json` yükle → hata mesajı, veri değişmez.
- [ ] **Step 5:** Commit `feat: add settings, persistent storage and shortcuts guide`.

### Task 12: Bugün ekranı (widget kartları)

**Files:**
- Create: `src/features/today/TodayPage.tsx`, `src/features/today/cards.tsx`, `src/features/today/PromptBanner.tsx`, `src/logic/cards.ts`
- Test: `tests/logic/cards.test.ts`

**Interfaces:**
- Consumes: `dayPrompt`, `isMinimumDay`, `useCheckin` (Task 7), `useTasks`, `todayView` (Task 5), `TaskRow`, `QuickAdd` (Task 9), `useSettings`, `setSetting` (Task 4), `needsBackupReminder` (Task 10).
- Produces:
  - `interface CardDef { id: string; title: string; Component: () => JSX.Element | null }` ve `export const CARDS: CardDef[]` (sonraki planlar buraya kart ekler: alışkanlık, tekrar, spor, sınav, odak, uyku).
  - `logic/cards.ts`: `orderCards(allIds: string[], order: string[], hidden: string[]): string[]` — `order`'daki sırayla, `order`'da olmayan yeni kartlar sona, `hidden`'dakiler çıkarılır.
  - Bu planda kartlar: `oncelikler` (check-in'deki 3 öncelik, dokununca görev tamamlanır), `gorevler` (geciken + bugün + QuickAdd), `gunluk` (uyku/enerji/ruh hali özeti).

- [ ] **Step 1: Failing test**

```ts
test('orderCards sıra, yeni kart ve gizleme', () => {
  expect(orderCards(['a','b','c','d'], ['c','a'], ['b'])).toEqual(['c','a','d'])
  expect(orderCards(['a'], ['silinmis','a'], [])).toEqual(['a'])
})
```

- [ ] **Step 2:** Test → FAIL; uygula; → PASS.
- [ ] **Step 3:** TodayPage (`#/`): üstte tarih + selam, `PromptBanner` (`dayPrompt` sonucuna göre; haftalık değerlendirme ekranı Plan 5'te geldiği için bu planda `weekReviewed` her zaman `true` geçilir, "Güne başla" → `#/checkin`, "Günü kapat" → `#/kapanis`, "Haftayı değerlendir" → `#/degerlendirme`), minimum gün ise üstte sakin bir not, yedek hatırlatması (`needsBackupReminder`) küçük satır, sonra sıralı kartlar, en altta "Kartları düzenle" (yukarı/aşağı ok + göster/gizle; `cardOrder`, `hiddenCards` ayarına yazar). Sabit "Odaklan" butonu NavBar'daki Odak sekmesi.
- [ ] **Step 4:** Tarayıcıda 375 px genişlikte dene: check-in yokken banner, check-in sonrası öncelik kartı dolu, görev tamamlama, kart sırasını değiştir → yenile → sıra korunur.
- [ ] **Step 5:** Commit `feat: add Today screen with configurable cards`.

### Task 13: PWA güncelleme bandı ve hata ekranı

**Files:**
- Create: `src/ui/UpdateBanner.tsx`, `src/ui/FatalError.tsx`
- Modify: `src/main.tsx`, `src/app.tsx`

**Interfaces:**
- Consumes: `virtual:pwa-register` (`registerSW({ onNeedRefresh })`), `db` (Task 4).
- Produces: `setTimerRunning(running: boolean)` (`src/ui/UpdateBanner.tsx` içinde dışa aktarılır; Plan 2'deki zamanlayıcı çalışırken bandı erteler).

- [ ] **Step 1:** UpdateBanner: yeni sürüm hazır olunca alt kısımda "Yeni sürüm hazır — Güncelle"; `timerRunning` true iken gösterilmez.
- [ ] **Step 2:** `main.tsx`: `db.open()` başarısız olursa `FatalError` render et ("Veriler açılamadı. Gizli sekmede olabilirsin ya da tarayıcı depolamayı engelliyor." + hata metni). Uygulama yarım açılmaz.
- [ ] **Step 3:** `npm run build && npm run preview`, tarayıcıda aç; DevTools → Application → Service Workers kayıtlı; Network "Offline" → sayfa yenilenince açılır. Lighthouse "Installable" geçer.
- [ ] **Step 4:** Commit `feat: add update banner, offline support check and fatal error screen`.

### Task 14: Yayına alma (Cloudflare Pages + subdomain)

**Files:**
- Create: `README.md` (yerelde çalıştırma, test, yayınlama komutları), `public/_headers` (`/sw.js` için `Cache-Control: no-cache`)

Bu görev kullanıcının hesaplarında işlem gerektirir; uygulayan kişi komutları hazırlar, hesap adımlarını kullanıcı yapar.

- [ ] **Step 1:** `npm test` ve `npm run build` → hepsi geçer.
- [ ] **Step 2 (kullanıcı):** Cloudflare hesabına giriş: `npx wrangler login`.
- [ ] **Step 3:** `npx wrangler pages project create jarvis --production-branch main`, sonra `npx wrangler pages deploy dist --project-name jarvis` → `https://jarvis-xxx.pages.dev` adresi döner, açılır.
- [ ] **Step 4 (kullanıcı):** Cloudflare Pages → jarvis → Custom domains → `jarvis.emirhandurmuskaya.com` ekle. Alan adı Cloudflare'de değilse, DNS sağlayıcısında `jarvis` için `CNAME` → `jarvis-xxx.pages.dev` kaydı.
- [ ] **Step 5:** `https://jarvis.emirhandurmuskaya.com` açılır, HTTPS geçerli. `package.json`'a `"deploy": "npm run build && wrangler pages deploy dist --project-name jarvis"` script'i.
- [ ] **Step 6 (kullanıcı, telefonda):** Safari → Paylaş → Ana Ekrana Ekle; uçak modunda aç; check-in yap, uygulamayı kapat-aç → veri duruyor; Kısayollar'da `#/odak` butonu → uygulama Odak sekmesinde açılır.
- [ ] **Step 7:** Commit `chore: add deploy config and README`.
