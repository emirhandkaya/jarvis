# Jarvis Plan 3: Spor + Alışkanlıklar + Sağlık köprüsü — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Spor screens (templates, set logging with progressive-overload suggestions, deload, rest timer, weekly volume), the Alışkanlıklar screens (if-then, minimum version, consistency rate, joker, never-miss-twice, 66-day bar, heatmap), and the Apple Health bridge (Shortcuts URL import + export.xml upload). Add Today cards for all three.

**Architecture:** Same layering as Plans 1–2. Decisions are pure functions in `src/logic/progression.ts`, `src/logic/habits.ts` and `src/logic/healthImport.ts`, tested with Vitest. Persistence goes through `src/db/repo/`. No schema change is needed: all tables already exist in v1/v2.

**Tech Stack:** Vite, Preact 11, TS, Dexie 4, Vitest + fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-11-07-jarvis-design.md` (sections 6.6, 6.7, 6.9, 6.1)

## Global Constraints

- Turkish UI copy. Mobile-first at 375 px, tap targets ≥ 44 px, every record ≤ 2 taps.
- Local days come from `todayStr()` (04:00 day start). `src/logic/` never imports Dexie or the DOM.
- Progression (double progression): if all sets of the last workout reached `repMax` → `+incrementKg`, reps `repMin`. Otherwise keep the same weight and target +1 rep. If the last **2** workouts of that exercise each had a set below `repMin` → lighten by **10 %**.
- Deload is suggested when **6 weeks** have passed since the last deload (or since the first workout), or when the average energy over the last **3** days is **≤ 2**. A deload halves the set count (`ceil(sets / 2)`).
- Habit consistency is measured over the last **30** days. `min` counts as done. A `joker` removes the day from the planned count. One joker per habit per week. The establishment bar is **66** days. The heatmap covers **12** weeks.
- Weekday numbering: 1 = Monday … 7 = Sunday.
- Health data arrives in the URL **fragment** only (`#/import-health?d=<base64url JSON>`), is never sent anywhere, and is stripped from the address bar after import.
- Health value ranges (out-of-range values are dropped): sleepMin 0–1440, steps 0–100000, activeKcal 0–10000, restingHr 20–250, hrvMs 1–300.
- Settings defaults to add: `weeklyWorkoutTarget: 3`, `restSec: 90`.

## Review Focus

1. **First workout ever / exercise with no history:** no suggestion is shown, the fields are empty, and nothing crashes. → Task 1 test.
2. **Habit created mid-window:** consistency counts only days since the habit was created, not 30 days of "misses". → Task 2 test.
3. **Malformed or hostile `d` parameter** (not base64, not JSON, huge numbers, a strange date): nothing is written, and a Turkish error is shown. → Task 3 test.
4. **Re-importing the same day's health data:** existing fields are merged and updated, not duplicated, and fields missing from the new payload are kept. → Task 4 test.
5. **Finishing a workout with zero logged sets:** the empty workout is deleted, not saved. → Task 4 test.

---

### Task 1: Progression + deload logic (pure)

**Files:** Create `src/logic/progression.ts`. Test `tests/logic/progression.test.ts`.

**Interfaces:**
- Produces:
  - `interface Suggestion { weightKg: number; reps: number; reason: 'artir' | 'tekrar' | 'hafiflet' }`
  - `suggestNext(ex: Exercise, last: WorkoutSet[], prev: WorkoutSet[]): Suggestion | null`. Here `last`/`prev` are this exercise's sets from its latest and second-latest workout. The base weight is the max `weightKg` in `last`. Rules are those from the Global Constraints, checked in the order hafiflet → artir → tekrar. For tekrar, `reps = min(repMax, min reps in last + 1)`. For hafiflet, the weight is `base * 0.9` rounded down to the nearest 0.5 and `reps = repMin`. If `last` is empty, return null.
  - `deloadReason(lastDeload: string | undefined, firstWorkout: string | undefined, today: string, recentEnergy: number[]): 'zaman' | 'yorgunluk' | null`. Use `zaman` if `diffDays(lastDeload ?? firstWorkout, today) >= 42`, or `yorgunluk` if `recentEnergy.length >= 3` and the average of the last 3 values is ≤ 2. `yorgunluk` takes precedence. Return null if there is no workout history and no energy.
  - `deloadSets(n: number): number`, which is `max(1, ceil(n / 2))`.
  - `setVolume(sets: WorkoutSet[]): number`, which is Σ weightKg × reps.

- [ ] **Step 1: Failing tests.** Use ex = {repMin 8, repMax 12, incrementKg 2.5}.
  - last [60×12, 60×12, 60×12] gives artir with 62.5×8.
  - last [60×12, 60×10, 60×9] gives tekrar with 60×10.
  - last [60×7, 60×8] and prev [60×7] give hafiflet with 54×8.
  - last [60×7] and prev [] gives tekrar with 60×8. Hafiflet needs both workouts.
  - Empty last gives null.
  - deloadReason('2026-09-26', …, '2026-11-07', []) gives 'zaman'. 42 days → zaman, 41 days → null.
  - Energy [3, 2, 1] gives 'yorgunluk'. [2, 3] gives null. Both conditions true gives 'yorgunluk'.
  - deloadSets(3) is 2, deloadSets(1) is 1.
  - setVolume([60×10, 50×8]) is 1000.
- [ ] **Step 2:** Run the tests and confirm they FAIL. Implement. Run them again and confirm they PASS. Commit `feat: progressive overload and deload logic`.

### Task 2: Habit logic (pure)

**Files:** Create `src/logic/habits.ts`. Test `tests/logic/habits.test.ts`.

**Interfaces:**
- Produces:
  - `weekday(date: string): number` (1–7, Monday = 1)
  - `isPlannedDay(h: Habit, date: string): boolean`. For `days`: weekday is in `days`. For `perWeek`: always true, meaning the habit may be done any day.
  - `consistency(h: Habit, logs: HabitLog[], today: string): { done: number; planned: number; rate: number }`. The window is from `max(today − 29, createdDay)` to today, where `createdDay = todayStr(new Date(h.createdAt))`.
    - For `days`: planned = days in the window that are planned and not joker; done = planned days with `done` or `min`.
    - For `perWeek`: for each week (Mon–Sun) overlapping the window, planned += `n` scaled by the fraction of that week inside the window (rounded up), and done += min(done-or-min logs in that week within the window, that week's planned).
    - `rate = planned ? done / planned : 0`.
  - `jokerAvailable(logs: HabitLog[], today: string): boolean`. There must be no joker in `weekStart(today)` … `+6`. The logs are this habit's.
  - `missedYesterday(h: Habit, logs: HabitLog[], today: string): boolean`. This applies only to the `days` type: yesterday was planned, there is no log for yesterday, and yesterday ≥ createdDay.
  - `establishment(logs: HabitLog[]): { days: number; ratio: number }`. `days` is the count of done/min logs; `ratio = min(days, 66) / 66`.
  - `todayList(habits: Habit[], logs: HabitLog[], today: string): { habit: Habit; status?: HabitLog['status']; missedYesterday: boolean; weekDone?: number }[]`. It contains non-archived habits that are planned today. A `perWeek` habit is included if its weekly done count is < n, or if it was done today.
  - `heatmap(logs: HabitLog[], today: string): { date: string; status?: HabitLog['status'] }[]`. It covers 84 days ending today, oldest first.

- [ ] **Step 1: Failing tests.**
  - weekday('2026-11-09') is 1 and weekday('2026-11-08') is 7.
  - A days-habit [1, 3, 5] created on 2026-10-01, evaluated on 2026-11-07 with logs done on every Mon/Wed/Fri in the window except one, plus one joker on a planned day: planned = 13 − 1 = 12 and done = 11. The window is 2026-10-09…2026-11-07, which has 13 Mon/Wed/Fri days. The implementer computes the exact expected numbers from the dates and asserts them.
  - A habit created 2026-11-05 evaluated on 2026-11-07 only counts 05–07.
  - jokerAvailable is false if a joker exists on 2026-11-03 for today 2026-11-07, and true for 2026-11-09.
  - missedYesterday is true when Friday is planned, today is Saturday and there is no Friday log. It is false for a habit created today.
  - establishment of 70 done logs gives ratio 1.
  - todayList includes a perWeek(n=3) habit with 2 done this week, and excludes it with 3 done unless one was done today.
  - heatmap has length 84 and its last date is today.
- [ ] **Step 2:** Run the tests and confirm they FAIL. Implement. Run them again and confirm they PASS. Commit `feat: habit consistency logic`.

### Task 3: Health import parsing (pure)

**Files:** Create `src/logic/healthImport.ts`. Test `tests/logic/healthImport.test.ts`.

**Interfaces:**
- Produces:
  - `type HealthPatch = { date: string } & Partial<Pick<HealthDay, 'sleepMin' | 'steps' | 'activeKcal' | 'restingHr' | 'hrvMs'>>`
  - `decodeHealthParam(d: string, today: string): { ok: true; days: HealthPatch[]; dropped: number } | { ok: false; error: string }`.
    - Decode base64url (also accepting plain base64 and URL-encoded JSON starting with `{` or `[`), then parse JSON.
    - Accept an object or an array (max 400 items).
    - Each item's `date` must be `YYYY-MM-DD`, not after `today`. If it is missing, default to `today`.
    - Coerce numeric strings to numbers. Drop out-of-range or non-numeric fields and count them in `dropped`. Drop items that have no valid field.
    - The error strings are Turkish: "Veri okunamadı", "Geçerli kayıt yok".
  - `encodeHealthParam(obj: unknown): string`, a base64url of the JSON (used by tests and the guide example).
  - `aggregateExportLines(lines: Iterable<string>): HealthPatch[]`. It scans Apple Health `export.xml` `<Record .../>` lines and handles these types:
    - `HKQuantityTypeIdentifierStepCount`: sum per day of `startDate`.
    - `HKQuantityTypeIdentifierActiveEnergyBurned`: sum, rounded.
    - `HKQuantityTypeIdentifierRestingHeartRate`: average, rounded.
    - `HKQuantityTypeIdentifierHeartRateVariabilitySDNN`: average, rounded.
    - `HKCategoryTypeIdentifierSleepAnalysis` with value containing `Asleep`: minutes summed per day of `endDate`. Here "day" means `todayStr` applied to the local time parsed from the `"2026-11-07 07:12:00 +0300"` format.
    - Other lines are ignored. Apply the same ranges as above.

- [ ] **Step 1: Failing tests.**
  - Round-trip `encodeHealthParam({ date: '2026-11-07', sleepMin: 420, steps: '8000' })` decodes to steps 8000 (a number).
  - An array of 2 days decodes to 2 days.
  - `{ steps: 999999, sleepMin: 400 }` keeps sleepMin and has dropped = 1.
  - A future date is rejected for that item.
  - `'%%%'` returns ok false.
  - `'{}'` returns ok false with "Geçerli kayıt yok".
  - Missing date defaults to today.
  - aggregateExportLines with 2 step records on the same day sums them, one sleep record 23:30→06:30 gives 420 min on the end day, and an unknown type is ignored.
- [ ] **Step 2:** Run the tests and confirm they FAIL. Implement. Run them again and confirm they PASS. Commit `feat: health data import parsing`.

### Task 4: Repos: gym, habits, health + seed

**Files:**
- Create `src/db/repo/gym.ts`, `src/db/repo/habits.ts` and `src/db/repo/health.ts`.
- Modify `src/db/repo/settings.ts` to add the defaults `weeklyWorkoutTarget: 3` and `restSec: 90`.
- Test `tests/db/gym.test.ts`, `tests/db/habits.test.ts` and `tests/db/health.test.ts`.

**Interfaces:**
- Consumes: Tasks 1–3, `newRecord`/`touch`, and `getSettings`.
- Produces:
  - `gym.ts`:
    - `seedGymIfEmpty(): Promise<void>`. If there are no exercises, it creates these, given as name (group, repMin–repMax, incrementKg):
      - Push template: Bench Press (Göğüs 8–12 2.5), Overhead Press (Omuz 8–12 2.5), Incline Dumbbell Press (Göğüs 8–12 2), Triceps Pushdown (Arka kol 10–15 2.5).
      - Pull template: Barbell Row (Sırt 8–12 2.5), Lat Pulldown (Sırt 8–12 2.5), Face Pull (Omuz 12–15 2.5), Biceps Curl (Ön kol 10–15 1).
      - Bacak template: Squat (Bacak 6–10 2.5), Romanian Deadlift (Bacak 8–12 2.5), Leg Press (Bacak 10–15 5), Calf Raise (Bacak 12–20 2.5).
      - Each template item has 3 sets.
    - `addExercise`, `updateExercise`, `addTemplate(name, items)`, `updateTemplate`, `deleteTemplate`.
    - `startWorkout(date: string, templateId?: string, isDeload?: boolean): Promise<Workout>`.
    - `logSet(workoutId, exerciseId, weightKg, reps): Promise<WorkoutSet>`. Its order is the next index for that workout + exercise.
    - `updateSet`, `deleteSet`.
    - `finishWorkout(id): Promise<'saved' | 'discarded'>`. Discard (delete) if there are 0 sets.
    - `exerciseHistory(exerciseId): Promise<{ last: WorkoutSet[]; prev: WorkoutSet[] }>`. This uses the sets of the latest two workouts containing the exercise, ordered by workout date then createdAt, and excludes the currently open workout when an `excludeWorkoutId` param is given.
    - `gymStatus(today): Promise<{ weekCount: number; target: number; deload: 'zaman' | 'yorgunluk' | null; lastWorkoutDate?: string; todayDone: boolean }>`. It uses check-in energies for the last 3 days and the latest workout with `isDeload`.
    - `weeklyVolume(weeks: number, today): Promise<number[]>`, oldest week first.
    - Hooks: `useExercises`, `useTemplates`, `useWorkouts`, `useWorkoutSets(workoutId)`.
  - `habits.ts`:
    - `addHabit(name, opts: { ifThen?: string; minVersion?: string; schedule: HabitSchedule }): Promise<Habit | null>`. A blank name returns null.
    - `updateHabit`, `archiveHabit`.
    - `setHabitStatus(habitId, date, status: HabitLog['status'] | null): Promise<'ok' | 'joker-limit'>`. null deletes the log. A joker is rejected when `jokerAvailable` is false. It upserts on `[habitId+date]`.
    - Hooks: `useHabits()` and `useHabitLogs(habitId?)`.
  - `health.ts`:
    - `upsertHealth(days: HealthPatch[], source: string): Promise<number>`. It merges into the existing row per date (new valid fields overwrite, missing fields are kept) and returns the count.
    - `useHealth(date)` and `recentHealth(n)`.

- [ ] **Step 1: Failing tests.**
  - Seed creates 12 exercises and 3 templates, and calling it twice doesn't duplicate.
  - `finishWorkout` with 0 sets returns 'discarded' and the workout is gone.
  - `exerciseHistory` returns last/prev across 3 workouts on different dates in the correct order.
  - `gymStatus` counts the week's workouts.
  - `setHabitStatus` called twice on the same day updates rather than duplicates.
  - A second joker in the same week returns 'joker-limit'.
  - `upsertHealth` of {date, steps: 5000} then {date, sleepMin: 400} gives one row with both values.
- [ ] **Step 2:** Run the tests and confirm they FAIL. Implement. Run them again and confirm they PASS. Run `npm run build` and confirm it is OK. Commit `feat: gym, habit and health repos`.

### Task 5: Spor screens

**Files:** Create `src/features/gym/GymPage.tsx` (`#/spor`), `src/features/gym/WorkoutPage.tsx` (`#/spor/yeni`), `src/features/gym/SetRow.tsx`, `src/features/gym/RestTimer.tsx` and `src/features/gym/TemplatesSheet.tsx`. Modify `src/app.tsx`.

**Interfaces:**
- Consumes: Task 1 and Task 4 functions, `Sparkline` (`src/ui/charts/Sparkline.tsx`), `beep`/`unlockAudio` (`src/ui/alarm.ts`), `useNow`, and `useSettings`.

- [ ] **Step 1: GymPage.**
  - Calls `seedGymIfEmpty` on mount.
  - Shows a status card: "Bu hafta 2 / 3 antrenman" and the last workout date.
  - Shows a deload suggestion note when `deload` is set:
    - zaman: "6 haftadır yüklendin, bu hafta hafif hafta yap"
    - yorgunluk: "Son günlerde enerjin düşük, hafif bir antrenman iyi olur"
  - A "Antrenmana başla" button opens a template picker: the 3 templates plus "Boş antrenman", and when a deload is suggested a "Hafif (deload)" toggle.
  - Lists recent workouts with date, template, and set/volume summary.
  - Shows weekly volume for the last 8 weeks as a Sparkline.
  - A templates editor sheet lets the user rename a template, add or remove an exercise, change the set count, and add a new exercise (name, group, rep range, increment).
- [ ] **Step 2: WorkoutPage** (`#/spor/yeni`).
  - If there is no open workout (setting `openWorkoutId`, added to DEFAULT_SETTINGS as `null as string | null`), it shows the picker; otherwise it continues the open workout.
  - For each template exercise there is a card with "Geçen sefer: 60×12, 60×10, 60×9" and a suggestion chip ("Öneri: 62.5 kg × 8 — ağırlık artır" / "+1 tekrar" / "%10 hafiflet").
  - It has N SetRows, halved when it is a deload. Each row is prefilled from the suggestion (or the last values), has −/+ steppers for kg (by incrementKg) and reps, and a ✓ button that calls `logSet` and starts the RestTimer (`restSec` from settings, beep at 0, skippable).
  - Logged sets show as done and can be edited or deleted.
  - An "Egzersiz ekle" button adds any exercise.
  - "Bitir" calls `finishWorkout` and clears `openWorkoutId`, then shows "Kaydedildi" (or "Boş antrenman silindi") and navigates to `#/spor`.
- [ ] **Step 3:** Run build + tests. Smoke test in dev: seed, start Push, log 2 sets, reload (the workout continues), finish. Commit `feat: gym screens with progressive overload suggestions`.

### Task 6: Alışkanlıklar screen

**Files:** Create `src/features/habits/HabitsPage.tsx` (`#/aliskanlik`), `src/features/habits/HabitSheet.tsx`, `src/features/habits/Heatmap.tsx` and `src/features/habits/HabitCheck.tsx`. Modify `src/app.tsx`.

**Interfaces:**
- Consumes: Task 2 and Task 4 functions.
- Produces: `<HabitCheck item={todayList entry} today />`. This is a row with a circle: tap toggles done, and a long-press (500 ms) or a "…" button opens the min/joker/clear options. It shows the if-then text in muted style, and when `missedYesterday` is true it highlights the row with "Dün kaçtı — bugün minimum versiyonu yeter: <minVersion>". The Today card reuses it.

- [ ] **Step 1: HabitsPage.**
  - A "Bugün" section lists `HabitCheck` rows.
  - A "Tüm alışkanlıklar" section shows a card per habit with: name, "Eğer/Sonra" text, the consistency "24/30 (%80)", the 66-day establishment bar ("23 / 66 gün"), and a 12-week heatmap (7 rows × 12 columns of small squares: done = accent, min = lighter, joker = outline, none = surface).
  - A "+ Alışkanlık" button opens HabitSheet with these fields:
    - name
    - "Eğer… (ne zaman/nerede?)" with the placeholder "Kahvaltıdan sonra"
    - "Minimum versiyon", with the placeholder "1 sayfa oku"
    - schedule: day chips Pzt..Paz, or "Haftada N kez" with a stepper 1–7
  - The sheet also offers edit and archive.
  - A joker press that returns 'joker-limit' shows "Bu hafta joker hakkını kullandın".
- [ ] **Step 2:** Run build + tests. Smoke test in dev: add a habit, check it, set min and joker, and confirm the heatmap updates. Commit `feat: habits screen with consistency, joker and heatmap`.

### Task 7: Health bridge: import route, guide, export.xml upload

**Files:**
- Create `src/features/health/ImportHealthPage.tsx` (`#/import-health`) and `src/features/settings/HealthGuide.tsx`.
- Modify `src/features/settings/SettingsPage.tsx` and `src/app.tsx`.

**Interfaces:**
- Consumes: `decodeHealthParam`, `aggregateExportLines`, `encodeHealthParam` (Task 3), `upsertHealth` (Task 4), `parseHash`/`navigate`, and `todayStr`.

- [ ] **Step 1: ImportHealthPage.**
  - On mount it reads `d` from the route query and decodes it.
  - On success it calls `upsertHealth(days, 'kisayol')` and then `history.replaceState(null, '', location.pathname + '#/checkin')`, which strips the data from the URL so that a reload doesn't re-import.
  - It shows "Sağlık verisi alındı (N gün)" briefly, then the check-in.
  - On error it shows the Turkish error plus a "Bugün'e dön" button. Nothing is written in that case.
- [ ] **Step 2: HealthGuide** (in Settings, under a "Apple Sağlık bağlantısı" heading).
  - Step-by-step Turkish text for building the Shortcut:
    1. New shortcut.
    2. "Sağlık Örneklerini Bul" ×5 (Uyku Analizi, Adım, Aktif Enerji, Dinlenme Nabzı, Kalp Atış Hızı Değişkenliği) for yesterday/last night with sum or average.
    3. "Sözlük" with keys `date, sleepMin, steps, activeKcal, restingHr, hrvMs`.
    4. "Base64 ile kodla".
    5. "URL'yi aç" with `https://jarvis.emirhandurmuskaya.com/#/import-health?d=` + the result.
    6. Kişisel Otomasyon: every morning at a chosen time.
  - Include a warning that iOS may open links in Safari instead of the home-screen app, in which case data lands in Safari's storage. The user should test once, and if the data doesn't appear in the app, use the export.xml method instead.
  - A "Test bağlantısı" button builds a sample payload with `encodeHealthParam` and navigates to it.
- [ ] **Step 3: export.xml upload** in the same section.
  - A file input (`.xml`) reads the file with `file.stream()` + `TextDecoderStream` and splits it into lines chunk by chunk without loading the whole file into one string.
  - It runs `aggregateExportLines` incrementally (process line batches, keeping aggregation state; the implementer may refactor `aggregateExportLines` into a small stateful aggregator `createExportAggregator(): { push(line): void; result(): HealthPatch[] }`, keeping `aggregateExportLines` as a wrapper so the Task 3 tests still pass).
  - It shows progress (MB read), then calls `upsertHealth(result, 'export')` and shows "N gün aktarıldı".
  - Guide text: in the Sağlık app go to profile → "Tüm Sağlık Verilerini Dışa Aktar", unzip it in Dosyalar, and pick `export.xml`.
- [ ] **Step 4:** Run build + tests. Smoke test in dev: the "Test bağlantısı" button imports and lands on the check-in with sleep prefilled. Commit `feat: apple health bridge via shortcuts and export upload`.

### Task 8: Today cards

**Files:** Modify `src/features/today/cards.tsx`.

**Interfaces:**
- Consumes: `todayList` + `HabitCheck`, `gymStatus`, and `useHealth`.
- Produces: `CARDS` entries `aliskanlik`, `spor` and `saglik`, appended at the end.

- [ ] **Step 1: The three cards.**
  - `aliskanlik` shows today's HabitCheck rows, or null when there are no habits. On a minimum day (`isMinimumDay` of today's check-in) it shows "Minimum gün: minimum versiyonlar yeterli" at the top.
  - `spor` shows "Bu hafta 2 / 3", plus "Bugün antrenman yapıldı ✓" or a "Antrenmana başla" link to `#/spor/yeni`, plus the deload note when present.
  - `saglik` shows today's health row, or null if there is none: sleep in h:mm, steps, HRV and resting heart rate, with only the present fields.
- [ ] **Step 2:** Run build + tests. Commit `feat: today cards for habits, gym and health`.
