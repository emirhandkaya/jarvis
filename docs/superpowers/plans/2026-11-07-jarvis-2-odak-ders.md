# Jarvis Plan 2: Odak + Ders — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Odak screen (Pomodoro / free timer / mixed mode, recall prompt) and the Ders screens (courses, exam countdown, weekly target, spaced-review topics, mock exams), plus the Today screen cards for them.

**Architecture:** This builds on Plan 1. Decisions live in pure functions in `src/logic/` (`spacedReview.ts`, `timer.ts`, `study.ts`), tested with Vitest. Persistence goes through `src/db/repo/`. Dexie gets a schema v2 that adds `mockExams`. The running timer is persisted in settings (`activeTimer`), so it survives reloads.

**Tech Stack:** Same as Plan 1: Vite, Preact 11, TS, Dexie 4, Vitest + fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-11-07-jarvis-design.md` (sections 6.4, 6.5, 6.1, 7)

## Global Constraints

- Turkish UI copy. Mobile-first at 375 px, ≥ 44 px tap targets, every record ≤ 2 taps.
- Local days come from `todayStr()` (`src/logic/dates.ts`, day starts 04:00). Never use `toISOString().slice(0,10)` to get a day.
- `src/logic/` never imports Dexie or touches the DOM.
- Pomodoro defaults come from `getSettings().pomodoro` (`work 25`, `short 5`, `long 15`, `longEvery 4`).
- Spaced-review stages in days: **1 → 3 → 7 → 14 → 30 → 60** (stage index 0–5). kolay = one stage up (max 5), orta = same stage, zor = one stage down (min 0).
- The exam-compression window is **14 days**.
- Open-session sanity limit is **4 hours**, which triggers a "Bitirmeyi unuttun mu?" prompt.
- Recall prompt: at most **3** items, skippable.
- When a session ends: sound + vibration. While running: Wake Lock if available. While running: `setTimerRunning(true)` from `src/ui/UpdateBanner.tsx`.
- Existing Plan 1 interfaces stay unchanged, except for the schema v2 additions listed in Task 1.

## Review Focus

1. **Timer survives reload / app switch:** the user closes the PWA mid-pomodoro and reopens it 10 minutes later. The remaining time is correct, and a phase that ended while closed has advanced. → Task 2 tests (`advance` across multiple elapsed phases).
2. **Exam tomorrow or past:** compression never schedules a review after the exam day, and a past exam date means no compression. → Task 3 tests.
3. **Deleting a course with topics/sessions:** its topics are archived, sessions keep their minutes, and no orphan topic shows up as due. → Task 4 test.
4. **Very short sessions (< 1 min) or an accidental start:** the session is discarded and nothing is saved. → Task 4 test.
5. **Upgrade from schema v1 with existing data:** existing tasks and check-ins survive opening v2. A v1 backup file still imports. → Task 1 tests.

---

### Task 1: Schema v2 (mockExams) + backup table list

**Files:**
- Modify: `src/db/version.ts`, `src/db/schema.ts`, `src/db/types.ts`, `src/logic/backup.ts`, `tests/db/schema.test.ts`
- Test: `tests/db/upgrade.test.ts`

**Interfaces:**
- Produces: `SCHEMA_VERSION = 2`. `interface MockExam extends Base { courseId: string; date: string; score: number; notes?: string }`. The `db.mockExams` table has index `'id, courseId, date'`. `TABLE_NAMES` includes `'mockExams'`.

- [ ] **Step 1:** Change the schema so the original v1 stores stay declared as `this.version(1).stores({...})` exactly as now, and add `this.version(2).stores({ mockExams: 'id, courseId, date' })`. Don't redefine the other v1 stores in v2.
- [ ] **Step 2: Tests.** In the schema test, the table list now contains 17 names including `mockExams`. In `upgrade.test.ts`: open a raw `new Dexie('jarvis')` at version 1 with the v1 stores, add a task, close it, then open `db` (v2). The task is still there and `db.mockExams.count()` is `0`. Also, `validateBackup` accepts `{ app: 'jarvis', schemaVersion: 1, exportedAt: '', tables: { tasks: [] } }`.
- [ ] **Step 3:** Run `npm test` → PASS. Commit `feat: schema v2 with mock exams`.

### Task 2: Timer logic (pure)

**Files:**
- Create: `src/logic/timer.ts`
- Test: `tests/logic/timer.test.ts`

**Interfaces:**
- Produces:
  - `type Phase = 'work' | 'short' | 'long'`
  - `interface PomodoroCfg { work: number; short: number; long: number; longEvery: number }`
  - `interface ActiveTimer { mode: 'pomodoro' | 'serbest' | 'karisik'; startedAt: string; phase: Phase; phaseStartedAt: string; round: number; workSec: number; paused: boolean; pausedAt?: string; courseId?: string; topicIds: string[]; taskId?: string }`. `round` starts at 1 and counts work phases. `workSec` is work seconds completed in finished phases.
  - `phaseMinutes(phase: Phase, cfg: PomodoroCfg): number`
  - `nextPhase(phase: Phase, round: number, cfg: PomodoroCfg): { phase: Phase; round: number }`: work → `long` if `round % longEvery === 0`, otherwise `short`. A break → work with `round + 1`.
  - `advance(t: ActiveTimer, now: Date, cfg: PomodoroCfg): { timer: ActiveTimer; finishedPhases: Phase[] }`: rolls forward through every phase that ended before `now` (pomodoro / karisik only), adding the work time of finished work phases to `workSec`. In `serbest` mode it never rolls. When paused it returns the timer unchanged.
  - `remainingSec(t: ActiveTimer, now: Date, cfg: PomodoroCfg): number`: ≥ 0. In serbest mode it returns elapsed seconds instead.
  - `totalWorkSec(t: ActiveTimer, now: Date, cfg: PomodoroCfg): number`: `workSec` plus the current work phase elapsed, if in work.
  - `currentTopic(t: ActiveTimer): string | undefined`: in karisik mode `topicIds[(round - 1) % topicIds.length]`, otherwise `topicIds[0]`.
  - `isStale(t: ActiveTimer, now: Date): boolean`: true when `now - startedAt > 4 h`.

- [ ] **Step 1: Failing tests** (cfg 25/5/15/4, start `2026-11-07T10:00:00`, local time):
  - At 10:10 the work phase has 900 s remaining.
  - At 10:27 `advance` gives phase `short`, round 1, workSec 1500, finishedPhases `['work']`.
  - At 11:52, after 3 full cycles (25 + 5 per cycle, 3 cycles = 90 min, ending 11:30), round 4 work runs 11:30–11:55, so phase is `work`, round 4, workSec 4500.
  - At 11:56 the phase is `long`.
  - Serbest: `remainingSec` at 10:10 is 600 (elapsed seconds) and the phase stays `work`.
  - Paused: `advance` returns the timer unchanged.
  - Karisik with topics `[a, b]`: round 1 → a, round 2 → b, round 3 → a.
  - `isStale` is false at 14:00 and true at 14:01.
- [ ] **Step 2:** Run the tests → FAIL. Implement. Run them → PASS. Commit `feat: pomodoro timer logic`.

### Task 3: Spaced review + study logic (pure)

**Files:**
- Create: `src/logic/spacedReview.ts`, `src/logic/study.ts`
- Test: `tests/logic/spacedReview.test.ts`, `tests/logic/study.test.ts`

**Interfaces:**
- Produces:
  - `STAGE_DAYS = [1, 3, 7, 14, 30, 60] as const`
  - `type Rating = 'kolay' | 'orta' | 'zor'`
  - `nextStage(stage: Topic['stage'], rating: Rating): Topic['stage']`
  - `reviewInterval(stage: Topic['stage'], today: string, examDate?: string): number`. Let `daysLeft = diffDays(today, examDate)`. If there is no exam or `daysLeft <= 0` → `STAGE_DAYS[stage]`. If `daysLeft <= 14` → `min(STAGE_DAYS[stage], max(1, floor(daysLeft / 2)))`. Otherwise → `min(STAGE_DAYS[stage], daysLeft - 1)`, with a floor of 1.
  - `applyReview(topic: Topic, rating: Rating, today: string, examDate?: string): Pick<Topic, 'stage' | 'lastReviewedAt' | 'nextReviewDate'>`: new stage, then `nextReviewDate = addDays(today, reviewInterval(newStage, today, examDate))`, `lastReviewedAt = today`.
  - `dueTopics(topics: Topic[], today: string): Topic[]`: not archived and `nextReviewDate <= today`, sorted by `nextReviewDate` ascending, then name.
  - `study.ts`: `weekMinutes(sessions: FocusSession[], weekStartDate: string, courseId?: string): number` sums minutes of sessions whose `todayStr(new Date(startedAt))` falls in [weekStart, weekStart + 6]. `dayMinutes(sessions, day)`. `examCountdown(examDate: string | undefined, today: string): number | null` gives days left, or null when absent or past. `nearestExam(courses: Course[], today: string): { course: Course; days: number } | null`.

- [ ] **Step 1: Failing tests:**
  - `nextStage`: (0, zor) → 0; (5, kolay) → 5; (2, kolay) → 3; (2, orta) → 2; (2, zor) → 1.
  - `reviewInterval`: (3, '2026-11-07') → 14. With exam '2026-12-30' (53 days left): (5) → 52; (2) → 7. With exam '2026-11-17' (10 days left): (3) → 5; (0) → 1. With exam '2026-11-08' (1 day left): (4) → 1. With exam '2026-11-01' (past): (2) → 7.
  - `applyReview` of a stage-1 topic rated kolay on '2026-11-07', no exam → stage 2, next '2026-11-14', lastReviewedAt '2026-11-07'.
  - `dueTopics`: an archived topic and a future topic are excluded, and a topic without `nextReviewDate` is excluded. Order is by date.
  - `weekMinutes`: a session at `2026-11-09T02:00` local counts for 2026-11-08 (Sunday), so it is in the week of 2026-11-02 and not in the week of 2026-11-09.
  - `examCountdown`: past → null; same day → 0. `nearestExam` picks the smallest non-null value.
- [ ] **Step 2:** Run the tests → FAIL. Implement. Run them → PASS. Commit `feat: spaced review and study stats logic`.

### Task 4: Repos: courses, topics, mock exams, focus sessions, active timer

**Files:**
- Create: `src/db/repo/courses.ts`, `src/db/repo/topics.ts`, `src/db/repo/mockExams.ts`, `src/db/repo/focus.ts`
- Modify: `src/db/repo/settings.ts` (add `activeTimer: null as ActiveTimer | null` to `DEFAULT_SETTINGS`)
- Test: `tests/db/study.test.ts`, `tests/db/focus.test.ts`

**Interfaces:**
- Consumes: Task 2 and 3 functions, `newRecord`/`touch`, `getSettings`/`setSetting`.
- Produces:
  - `courses.ts`: `addCourse(name: string, opts?: { color?: string; examDate?: string; weeklyTargetMin?: number }): Promise<Course | null>` (blank name → null; defaults: color from a fixed 6-color palette rotating by course count, `weeklyTargetMin: 300`). Also `updateCourse(id, patch)`, `deleteCourse(id)` (deletes the course, archives its topics, keeps sessions and mock exams), and `useCourses()`.
  - `topics.ts`: `addTopic(courseId, name): Promise<Topic | null>` (stage 0, no nextReviewDate). Also `reviewTopic(id: string, rating: Rating, today: string): Promise<void>`, which uses `applyReview` with the course's examDate. Also `archiveTopic(id)`, `useTopics(courseId?)`, and `useDueTopics(today)`, which returns due topics joined with their course and excludes topics whose course no longer exists.
  - `mockExams.ts`: `addMockExam(courseId, date, score, notes?)`, `useMockExams(courseId)` sorted by date, `deleteMockExam(id)`.
  - `focus.ts`: `getActiveTimer(): Promise<ActiveTimer | null>`, `startTimer(opts: { mode; courseId?; topicIds: string[]; taskId? }, now = new Date()): Promise<ActiveTimer>`, `saveTimer(t)`, `pauseTimer(now)`, `resumeTimer(now)` (shifts `phaseStartedAt` forward by the paused duration), and `discardTimer()`. Also `finishTimer(now: Date, review: { recall: string[]; ratings: Record<string, Rating> }): Promise<FocusSession | null>`. It computes `minutes = round(totalWorkSec / 60)`. If minutes < 1, it clears the timer and returns null without saving. Otherwise it writes the FocusSession (`recall` trimmed, empty items dropped, max 3; `rating` is the first rating if any), calls `reviewTopic` for each rating entry, and clears `activeTimer`. Also `useFocusSessions()`.

- [ ] **Step 1: Failing tests:**
  - A blank course name is not added.
  - `deleteCourse` archives the course's 2 topics and keeps its 1 session, and `useDueTopics`' underlying query (export it as `dueTopicsWithCourse(today)`) excludes them.
  - `reviewTopic` kolay on a new topic → stage 1, next = today + 3.
  - `startTimer` → `getActiveTimer` round-trips. `pauseTimer` at +5 min then `resumeTimer` at +15 min: `phaseStartedAt` moves forward 10 min.
  - `finishTimer` after 30 s → null, with no session and the timer cleared.
  - `finishTimer` after a 25-minute work phase → a session with 25 minutes, recall `['a','b','c']` from input `['a',' ','b','c','d']`, and the topic stage updated.
- [ ] **Step 2:** Run the tests → FAIL. Implement. Run them → PASS. Run `npm run build` → OK. Commit `feat: study and focus repos`.

### Task 5: Odak screen

**Files:**
- Create: `src/features/focus/FocusPage.tsx`, `src/features/focus/FocusSetup.tsx`, `src/features/focus/FocusRunning.tsx`, `src/features/focus/FocusFinish.tsx`, `src/ui/alarm.ts`
- Modify: `src/app.tsx` (route `odak` → FocusPage)

**Interfaces:**
- Consumes: Task 2 and 4 functions, `useSettings`, `setTimerRunning`, `useNow`, `useCourses`, `useTopics`, `useTasks`.
- Produces: `alarm.ts` provides `beep(): void` (WebAudio, 3 short tones), `vibrate(): void` (`navigator.vibrate?.([200,100,200])`), `requestWakeLock(): Promise<() => void>` (returns a release function; a no-op if unsupported), and `ensureNotificationPermission()` is NOT included (no push in this app).

- [ ] **Step 1: FocusSetup** (no active timer): mode chips Pomodoro / Serbest / Karışık; a course picker defaulting to the last-used course (`settings.lastFocusCourseId`, added to DEFAULT_SETTINGS); topic chips for that course (one topic, or several in Karışık mode); an optional task; a big "Başla" button → `startTimer`.
- [ ] **Step 2: FocusRunning:** a big mm:ss countdown (count-up in Serbest mode), phase label (Çalış / Kısa mola / Uzun mola), round number, the current topic name (Karışık rotates), and Duraklat/Devam and Bitir buttons. Tick every second with `advance`, persisting the timer on every phase change. When `finishedPhases` is non-empty, call `beep()` + `vibrate()`. Hold the Wake Lock while mounted and running, re-acquiring it on `visibilitychange`. Call `setTimerRunning(true)` while active and false on unmount or finish. If `isStale`, show a Sheet "Bitirmeyi unuttun mu?" with "Şimdi bitir" / "Sil" / "Devam".
- [ ] **Step 3: FocusFinish** (after Bitir; ≤ 20 s to complete): "Ne hatırlıyorum?" with 3 single-line inputs; for each topic studied, kolay/orta/zor chips; "Kaydet" → `finishTimer` → shows "X dk kaydedildi" → `#/`. Also a "Atla" button that saves with empty recall and no ratings. If `finishTimer` returns null, show "1 dakikadan kısa, kaydedilmedi."
- [ ] **Step 4:** Verify `npm test` and `npm run build`. In dev at 375 px: start a pomodoro, reload the page, and confirm the timer continues correctly; then finish and confirm the session saves. Commit `feat: focus screen with pomodoro, free and mixed modes`.

### Task 6: Ders screens

**Files:**
- Create: `src/features/study/StudyPage.tsx` (`#/ders`), `src/features/study/CourseDetail.tsx` (`#/ders/:id`), `src/features/study/CourseSheet.tsx`, `src/ui/charts/Sparkline.tsx`
- Modify: `src/app.tsx`

**Interfaces:**
- Consumes: Task 3 and 4 functions, `weekStart`, `useNow`.
- Produces: `<Sparkline values={number[]} width height />`, an SVG polyline with no axes that renders nothing when there are fewer than 2 values.

- [ ] **Step 1: StudyPage:** a "+ Ders" quick add; one card per course showing the color dot, name, exam countdown ("Sınava 12 gün", hidden if none), and a progress bar of this week's minutes vs `weeklyTargetMin` ("120 / 300 dk"). Tapping a card opens CourseDetail. At the top, a "Bugün tekrar: N konu" line linking to the due list.
- [ ] **Step 2: CourseDetail:** a header with the edit sheet (name, color from the palette, exam date, weekly target min, delete with confirm). Sections:
  - Konular: an add-topic input; each topic shows its stage as dots 0–5 and "Tekrar: bugün / 3 gün sonra / —", with an inline kolay/orta/zor review for due topics, and archive.
  - Bu hafta: minutes this week and the last 8 weeks as a Sparkline.
  - Denemeler: an add row (date defaulting to today, score number, notes) and a list with a score Sparkline.
  - A "Bu derse odaklan" button → `#/odak`, pre-selecting the course via `lastFocusCourseId`.
- [ ] **Step 3:** Verify build + tests. In dev: add a course with an exam date, add topics, review one, and confirm its next date matches the logic. Commit `feat: study screens with spaced review and mock exams`.

### Task 7: Today cards for study and focus

**Files:**
- Modify: `src/features/today/cards.tsx`

**Interfaces:**
- Consumes: `useDueTopics`, `nearestExam`, `dayMinutes`, `weekMinutes`, `useFocusSessions`, `getActiveTimer`.
- Produces: new `CARDS` entries with ids `tekrar`, `sinav`, `odak`. They are appended, so existing users' saved order puts them at the end (`orderCards` already handles this).

- [ ] **Step 1:** `tekrar` lists up to 5 due topics with their course color and inline kolay/orta/zor; it returns null when none are due. `sinav` shows the nearest exam ("Fizik sınavına 12 gün") and returns null when there is none. `odak` shows "Bugün 50 dk · Bu hafta 6 sa 20 dk", and when a timer is active it shows "Odak devam ediyor 12:31" linking to `#/odak`.
- [ ] **Step 2:** Verify build + tests. Commit `feat: today cards for reviews, exams and focus`.
