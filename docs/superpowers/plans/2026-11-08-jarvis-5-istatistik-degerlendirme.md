# Jarvis Plan 5: İstatistik + İçgörüler + Haftalık Değerlendirme — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the İstatistik screen: the weekly summary, 8-week trends, per-course breakdown, focus by hour of day, and data-backed insights. Build the Sunday weekly review: an auto summary, 3 questions, picking next week's goals, and a "Yeniden başla" (start over) flow after a bad week. Wire the real "Haftayı değerlendir" prompt into the Today screen and add an insight card.

**Architecture:** Use the same layers as Plans 1–4. The pure functions go in `src/logic/stats.ts` and `src/logic/insights.ts` and are tested with Vitest. Data loading goes in `src/db/repo/stats.ts` and `src/db/repo/reviews.ts`. The UI goes in `src/features/stats/` and `src/features/review/`. There is no schema change, because `reviews` already exists with key `weekStart`.

**Tech Stack:** Vite, Preact 11, TS, Dexie 4, Vitest + fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-11-07-jarvis-design.md` (section 6.11, plus 6.1 prompts)

## Global Constraints

- All UI copy is Turkish. Design mobile-first at 375 px, with tap targets ≥ 44 px. Format numbers with `tr-TR` (decimal comma).
- Local days come from `todayStr()` (04:00 day start). Weeks run Monday–Sunday via `weekStart()`. `src/logic/` never imports Dexie or the DOM.
- Insights compare two groups. Show one only when **each group has ≥ 7 days** of data and the relative difference is **> 15 %**. With insufficient data, show nothing; never show a guess.
- A bad week is a habit consistency below **40 %**. That week shows the "Yeniden başla" flow.
- Trends cover **8 weeks**. Focus by hour and insights look at the last **30 / 60 days** respectively (hour chart 30, insights 60).
- The weekly review asks 3 questions: "Ne iyi gitti?", "Neyi iyileştireyim?", "Gelecek haftanın odağı". It saves via an upsert on `weekStart`.
- Which week the review is for: on Sunday it is the current week. On other days it is the previous week, and only if that week has no review yet; otherwise it is the current week (read-only view of an existing one).
- The Today prompt "Haftayı değerlendir" shows on Sunday when the current week has no review. This replaces the hard-coded `true` passed to `dayPrompt` in `src/features/today/TodayPage.tsx`.

## Review Focus

1. **A brand-new user with no data** sees the İstatistik and review screens with zeros or "Henüz yeterli veri yok", with no NaN, no division by zero, and no crash. → Task 1 tests (empty inputs).
2. **Insights with exactly 7 vs 6 days** in a group: 7 shows the insight, 6 does not. A difference of exactly 15 % does not show it. → Task 1 tests.
3. **Reviewing on Monday** saves to the previous week's `weekStart`, and Sunday's prompt disappears after saving. → Task 2 tests.
4. **A focus session after midnight (02:00)** counts toward the previous day and week, and in the hour chart it counts at hour 2. → Task 1 test.
5. **"Yeniden başla" target reductions** never set a target below its minimum (course weekly target ≥ 30 min, weekly workout target ≥ 1). → Task 2 test.

---

### Task 1: Stats + insights logic (pure)

**Files:**
- Create: `src/logic/stats.ts`, `src/logic/insights.ts`
- Test: `tests/logic/stats.test.ts`, `tests/logic/insights.test.ts`

**Interfaces:**
- Consumes: `todayStr`, `addDays`, `weekStart`, `diffDays` (dates); `consistency` (habits.ts); `setVolume` (progression.ts); `peakWindow` (blocks.ts).
- Produces:
  - `interface StatsInput { sessions: FocusSession[]; courses: Course[]; workouts: Workout[]; sets: WorkoutSet[]; habits: Habit[]; habitLogs: HabitLog[]; checkins: Checkin[]; health: HealthDay[]; tasks: Task[] }`
  - `interface WeekSummary { weekStart: string; focusMin: number; byCourse: { courseId: string; name: string; color: string; min: number; target: number }[]; ratedSessions: number; workouts: number; volume: number; habitRate: number | null; avgSleepH: number | null; avgEnergy: number | null; tasksDone: number }`
  - `weekSummary(input: StatsInput, weekStartDate: string): WeekSummary`. Rules for each field:
    - **Sessions and days:** a session's day is `todayStr(new Date(startedAt))`.
    - **Workouts:** only workouts with ≥ 1 set count.
    - **`habitRate`:** for each non-archived habit, use `consistency` evaluated with `today = min(weekStart + 6, today-of-data)`, but restricted to that week. Implement a helper `weekHabitRate(habits, logs, weekStart, today)` = Σ done / Σ planned over the week's days (days-type: planned days, minus jokers; perWeek: `n`, prorated if the habit was created mid-week). Return null when the planned total is 0.
    - **`avgSleepH`:** taken from `health.sleepMin` first, and from `checkin.sleepHours` when that is missing.
    - **`avgEnergy`:** taken from the check-ins.
    - **`tasksDone`:** tasks whose `doneAt` day falls in the week.
    - **`byCourse`:** sorted by minutes, descending.
  - `trend(input: StatsInput, endWeekStart: string, weeks = 8): WeekSummary[]` lists the weeks oldest first.
  - `focusByHour(sessions: FocusSession[], today: string, days = 30): number[]` returns 24 values: minutes by the local start hour, over sessions whose day is within `[today − days + 1, today]`.
  - `isBadWeek(s: WeekSummary): boolean` is `s.habitRate !== null && s.habitRate < 0.4`.
  - `insights.ts`:
    - `interface DayRecord { date: string; focusMin: number; sleepH?: number; energy?: number; workout: boolean }`
    - `buildDayRecords(input: StatsInput, today: string, days = 60): DayRecord[]` builds one record per day, including days with zero focus.
    - `compare(a: number[], b: number[]): { meanA: number; meanB: number; diffPct: number } | null` returns null if either array has fewer than 7 values or `|diffPct| <= 15`. `diffPct = (meanA − meanB) / meanB × 100`, and if `meanB === 0` it returns null.
    - `interface Insight { id: 'uyku-odak' | 'verimli-saat' | 'spor-enerji'; text: string }`
    - `computeInsights(records: DayRecord[], sessions: FocusSession[], today: string): Insight[]` produces:
      - **`uyku-odak`:** compares focusMin on days with sleepH ≥ 7 against days with sleepH < 7 (days without sleep are excluded). Text: `7+ saat uyuduğun günlerde %X daha fazla odaklanıyorsun` (or `daha az`), where X is the rounded |diff|.
      - **`verimli-saat`:** when `peakWindow(sessions, today).fromData`, the text is `En verimli saatlerin: 10–12`.
      - **`spor-enerji`:** compares next-day energy after a workout day against next-day energy after a non-workout day (only pairs where the next day has energy). Text: `Spor yaptığın günün ertesinde enerjin %X daha yüksek` (or `düşük`).

- [ ] **Step 1: Failing tests**
  - `weekSummary` of empty input gives `focusMin` 0, `habitRate` null, `avgSleepH` null, an empty `byCourse`, and no NaN anywhere.
  - A session at local `2026-11-09 02:00` counts in week `2026-11-02`, not `2026-11-09`, and `focusByHour` puts its minutes at index 2.
  - `byCourse` is sorted and includes `target`.
  - A workout with 0 sets is not counted.
  - `avgSleepH` prefers health 420 min (7 h) over check-in 6 h for the same day.
  - `weekHabitRate`: a days-habit Mon/Wed/Fri with 2 done and 1 joker gives 2/2 = 1. A perWeek n = 3 habit with 1 done gives 1/3.
  - `isBadWeek`: rate 0.39 is true and 0.4 is false.
  - `compare`: 7 vs 7 values with a 20 % difference returns a result; 6 values returns null; exactly 15 % returns null; `meanB` 0 returns null.
  - `computeInsights`: 8 days with sleep ≥ 7 and focus 60, plus 8 days with sleep < 7 and focus 40, gives text containing `%50 daha fazla`. With insufficient data it returns `[]`.
- [ ] **Step 2:** Run the tests → FAIL. Implement. Run them → PASS. Commit `feat: weekly stats and insight logic`.

### Task 2: Data loading, reviews repo, Today prompt wiring

**Files:**
- Create: `src/db/repo/stats.ts`, `src/db/repo/reviews.ts`, `src/logic/review.ts`
- Modify: `src/features/today/TodayPage.tsx`
- Test: `tests/db/reviews.test.ts`, `tests/logic/review.test.ts`

**Interfaces:**
- Produces:
  - `repo/stats.ts`: `loadStatsInput(): Promise<StatsInput>`, which reads all needed tables (volumes are small), and `useStatsInput()`, a `useLiveQuery` wrapper.
  - `logic/review.ts`: `reviewWeekFor(today: string, existingWeekStarts: string[]): { weekStart: string; mode: 'edit' | 'view' }`, following the rule in Global Constraints. When the current week already has a review on Sunday, it returns `mode 'edit'` (editable). `reduceTargets(courses: Course[], workoutTarget: number): { courses: { id: string; weeklyTargetMin: number }[]; workoutTarget: number }` returns each course target × 0.7 rounded to 5 with a minimum of 30, and `workoutTarget − 1` with a minimum of 1.
  - `repo/reviews.ts`:
    - `saveReview(weekStart, fields: { wentWell; toImprove; nextFocus; goalIds: string[] })` upserts and keeps `createdAt`.
    - `getReview(weekStart)`, `useReview(weekStart)`.
    - `isWeekReviewed(date): Promise<boolean>` checks the review for `weekStart(date)`. `useWeekReviewed(date)`.
    - `applyRestart(): Promise<void>` applies `reduceTargets` to the courses and the `weeklyWorkoutTarget` setting.
  - TodayPage: pass the result of `useWeekReviewed(today)` (treat undefined while loading as `true`, so the banner doesn't flash) instead of the literal `true`.

- [ ] **Step 1: Failing tests**
  - `reviewWeekFor('2026-11-08' (Sun), [])` → `{ '2026-11-02', 'edit' }`.
  - `reviewWeekFor('2026-11-09' (Mon), [])` → `{ '2026-11-02', 'edit' }`.
  - `reviewWeekFor('2026-11-09', ['2026-11-02'])` → `{ '2026-11-09', 'view' }`.
  - `reduceTargets([{ weeklyTargetMin: 300 }, { weeklyTargetMin: 35 }], 1)` → 210, 30, workoutTarget 1.
  - `saveReview` twice for the same week leaves 1 row with the updated text and the original `createdAt`.
  - `isWeekReviewed('2026-11-08')` is true after saving `2026-11-02`.
- [ ] **Step 2:** Run the tests → FAIL. Implement. Run them → PASS. Run `npm run build` → OK. Commit `feat: reviews repo, stats loader and weekly prompt`.

### Task 3: İstatistik + Değerlendirme screens + Today insight card

**Files:**
- Create: `src/features/stats/StatsPage.tsx` (`#/istatistik`), `src/ui/charts/Bars.tsx`, `src/features/review/ReviewPage.tsx` (`#/degerlendirme`), `src/features/review/RestartCard.tsx`
- Modify: `src/app.tsx`, `src/features/today/cards.tsx`

**Interfaces:**
- Consumes: Task 1 and 2 functions, `Sparkline`, `useGoals`/`addGoal` (`src/db/repo/goals.ts`), `useNow`, `useSettings`.
- Produces: `<Bars values={number[]} labels?={string[]} height />`, a simple SVG vertical bar chart (e.g. 24 hour bars, or a horizontal course breakdown via a `horizontal` prop). It renders a muted "Veri yok" when all values are 0.

- [ ] **Step 1: StatsPage.**
  - Week navigation ‹ week › (label "2–8 Kasım"; the › button is disabled on the current week).
  - Summary tiles: Odak (`6 sa 20 dk`), Tekrar (rated sessions), Antrenman (`2 · 12.400 kg`), Alışkanlık (`%80` or `—`), Uyku (`7,1 sa` or `—`), Enerji (`3,4` or `—`), Görev (`12`).
  - Per-course horizontal bars, with minutes vs target.
  - Three 8-week Sparklines: odak, antrenman, alışkanlık.
  - Focus by hour (30 days), shown with `Bars` and labels every 3 hours.
  - An "İçgörüler" list; when empty, show "Henüz yeterli veri yok. Birkaç hafta kullandıkça burada sana özel bulgular çıkacak."
- [ ] **Step 2: ReviewPage.**
  - The header shows the week from `reviewWeekFor`.
  - The auto summary is a compact version of the tiles.
  - If `isBadWeek`, show RestartCard: "Zor bir hafta oldu, sorun değil. Hedefleri küçültüp yeniden başlayalım." with buttons "Hedefleri küçült" (`applyRestart` → "Ders hedefleri %30 azaltıldı, spor hedefi 1 azaltıldı") and "Minimum versiyonlarla başla" (link to `#/aliskanlik`).
  - Three textareas.
  - "Gelecek haftanın hedefleri": a list of existing `week` goals for the next week (start = the reviewed week + 7), an add input (`addGoal('week', title, parentId?, start=nextWeekStart, end=+6)`, with an optional parent picker of active cycle goals), and checkboxes that set `goalIds`.
  - "Kaydet" → `saveReview` → "Hafta kaydedildi" → `#/`.
  - In view mode, show the saved answers read-only, with a "Düzenle" button.
- [ ] **Step 3: Today card `icgoru`.** It shows the first insight from `computeInsights` (computed with `useStatsInput`), or null when there are none. The card is appended at the end.
- [ ] **Step 4:** Verify the build and tests. Smoke test in dev: the stats page renders with empty data, a review saves, and the Today prompt hides afterwards (set the dev `Date` to a Sunday via the URL? Not needed; rely on the Task 2 tests). Commit `feat: stats, insights and weekly review screens`.
