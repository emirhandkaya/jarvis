# Jarvis Plan 4: Zaman blokları (Plan ekranı) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Plan screen. It has a daily vertical timeline (06:00–24:00, 15-minute steps) with time blocks. Blocks can be added, moved by dragging, resized from their bottom edge, and repeated weekly. Tasks and courses can be placed into blocks. The screen also gives an energy-based time suggestion and a capacity warning, and the Today screen gets a "current / next block" card.

**Architecture:** This follows the same layers as Plans 1–3. The pure functions live in `src/logic/blocks.ts` and are tested with Vitest. The repo is `src/db/repo/blocks.ts`. The UI lives in `src/features/plan/`. There is no schema change: `blocks` already exists, and only an optional `skipDates?: string[]` field is added to the `Block` type, which needs no index.

**Tech Stack:** Vite, Preact 11, TS, Dexie 4, Vitest + fake-indexeddb.

**Spec:** `docs/superpowers/specs/2026-11-07-jarvis-design.md` (sections 6.8 and 6.1)

## Global Constraints

- All UI copy is in Turkish. Design mobile-first at 375 px, keep tap targets at least 44 px, and keep every record to at most 2 taps.
- Local days come from `todayStr()`, which starts the day at 04:00. `src/logic/` never imports Dexie or touches the DOM. Weekdays run from 1 = Monday to 7 = Sunday (`weekday()` in `src/logic/habits.ts`).
- The timeline runs from **06:00 to 24:00** and snaps to **15 minutes**. The minimum block length is **15 minutes**.
- Capacity warning: when the planned minutes (non-`mola` blocks plus the `estimateMin` of today's open tasks that are not linked to a block) are **more than 70%** of the awake minutes (from Settings `wakeTime`–`sleepTime`, default 07:00–23:00), show "Bugün X saat planladın, gerçekçi mi?".
- Most productive hours come from focus sessions in the last **30** days, using the best **2-hour** window. If there are fewer than **7** distinct days with sessions, fall back to **09:00–11:00**.
- A recurring block's `repeatDays` uses 1–7. "Sadece bugün sil" adds the date to `skipDates`; "Tümünü sil" deletes the series.
- Placing a task or course into the plan uses tap-to-place (two taps: pick the item, then tap a time). Cross-container dragging is out of scope.

## Review Focus

1. **Overlapping blocks** are shown side by side, all readable and tappable, with no block hidden behind another. → Task 1 `layoutDay` test.
2. **Dragging or resizing past the edges** clamps to 06:00–24:00 and to the 15-minute minimum, so no negative or zero-length block is ever saved. → Task 1 `moveBlock`/`resizeBlock` tests.
3. **Scrolling the timeline on a phone** does not accidentally move blocks: dragging starts only after a 250 ms hold. → Task 2 (manual check).
4. **A recurring block skipped "only today"** still appears on other days, and a one-off block on the same day is unaffected. → Task 1 `blocksForDay` test.
5. **The block's end time passing midnight or the wake/sleep settings being odd** (sleep earlier than wake) produce no crash and no warning flood: the awake time is treated as the wrap-around duration. → Task 1 `capacity` test.

---

### Task 1: Block logic (pure) + repo

**Files:**
- Create: `src/logic/blocks.ts`, `src/db/repo/blocks.ts`
- Modify: `src/db/types.ts` (add `skipDates?: string[]` to `Block`)
- Test: `tests/logic/blocks.test.ts`, `tests/db/blocks.test.ts`

**Interfaces:**
- Produces (logic):
  - `DAY_START = 360`, `DAY_END = 1440`, `STEP = 15`
  - `toMin(hhmm: string): number` (`'24:00'` → 1440) and `toHHMM(min: number): string` (1440 → `'24:00'`)
  - `snap(min: number): number` rounds to the nearest 15.
  - `blocksForDay(blocks: Block[], date: string): Block[]` returns one-off blocks with `date === date`, plus recurring blocks whose `repeatDays` includes the weekday and whose `skipDates` does not include the date, sorted by start.
  - `layoutDay(blocks: Block[]): { block: Block; col: number; cols: number }[]` groups transitively overlapping blocks into clusters. Within a cluster it assigns the first free column greedily, and `cols` is the column count of the cluster.
  - `moveBlock(b: Pick<Block,'start'|'end'>, deltaMin: number): { start: string; end: string }` snaps the delta, keeps the duration, and clamps to [DAY_START, DAY_END].
  - `resizeBlock(b, deltaEndMin): { start; end }` snaps the delta, keeps `end ≥ start + 15`, and caps the end at DAY_END.
  - `currentOrNext(dayBlocks: Block[], nowMin: number): { block: Block; state: 'now' | 'next' } | null`
  - `capacity(dayBlocks: Block[], openTasks: Task[], wakeTime: string, sleepTime: string): { plannedMin: number; awakeMin: number; over: boolean }`. Tasks whose id is the `refId` of a day block are not counted twice. When sleep ≤ wake, `awakeMin = 1440 − wake + sleep`.
  - `peakWindow(sessions: FocusSession[], today: string): { start: string; end: string; fromData: boolean }` totals the minutes by start hour over the last 30 days and picks the best consecutive 2-hour window, preferring the earliest on ties. With fewer than 7 distinct days it returns `09:00–11:00` and `fromData: false`.
  - `suggestSlot(dayBlocks: Block[], durationMin: number, window: { start: string; end: string }, afterMin: number): string | null` returns the first 15-minute-aligned free start at or after `afterMin` that fits the duration. It searches inside the window first, then anywhere in the day; if nothing fits it returns null.
- Produces (repo):
  - `addBlock(fields: { date?: string; repeatDays?: number[]; start; end; title; kind; refId? }): Promise<Block | null>` returns null for a blank title or `end ≤ start`.
  - `updateBlock(id, patch)`
  - `deleteBlock(id, scope: 'series' | 'day', date?: string)`: `day` on a recurring block appends to `skipDates`, and `day` on a one-off block deletes it.
  - `blocksOn(date): Promise<Block[]>` uses `blocksForDay` over all blocks.
  - `useBlocksOn(date)`

- [ ] **Step 1: Failing tests**
  - `toMin('07:30')` is 450 and `toHHMM(1440)` is '24:00'. `snap(52)` is 45 and `snap(53)` is 60.
  - `blocksForDay`: a recurring block for Mon/Wed with skipDates ['2026-11-09'] is absent on Monday 2026-11-09 and present on Wednesday 2026-11-11. A one-off block on 2026-11-09 is present that day.
  - `layoutDay`: blocks A 09:00–10:00, B 09:30–10:30, C 10:30–11:00 give A col 0 / cols 2, B col 1 / cols 2, C col 0 / cols 1.
  - `moveBlock({start '23:00', end '23:45'}, +60)` gives 23:15–24:00. `moveBlock({start '06:15', end '07:00'}, -40)` gives 06:00–06:45.
  - `resizeBlock({start '10:00', end '10:30'}, -60)` gives an end of 10:15.
  - `capacity`: blocks totalling 600 min (plus a 60-min `mola`, which is not counted) and one open task of 90 min with a block refId pointing to it give plannedMin 600, awakeMin 960, over false. Adding 120 more minutes makes over true (720 > 672). With wake 23:00 / sleep 07:00, awakeMin is 480.
  - `peakWindow`: on 8 distinct days with sessions at 10:00 and 11:00 it returns 10:00–12:00 with fromData true. With 3 days it returns 09:00–11:00 with fromData false.
  - `suggestSlot`: given a window of 09:00–11:00 with 09:00–10:00 taken, a 60-min slot gives '10:00'. With the window full it gives the first free slot after `afterMin`.
  - Repo: `deleteBlock(id, 'day', '2026-11-09')` on a recurring block keeps it and adds the skip date, and `blocksOn` for that date excludes it. A blank title returns null.
- [ ] **Step 2:** Run the tests → FAIL. Implement. Run them again → PASS. Commit `feat: time block logic and repo`.

### Task 2: Plan screen

**Files:**
- Create: `src/features/plan/PlanPage.tsx` (`#/plan`), `src/features/plan/Timeline.tsx`, `src/features/plan/BlockSheet.tsx`, `src/features/plan/PlaceTray.tsx`
- Modify: `src/app.tsx`, `src/styles/ui.css`

**Interfaces:**
- Consumes: Task 1 functions; `useTasks` + `todayView` (`src/logic/tasks.ts`); `useCourses`; `useFocusSessions`; `useSettings`; `useNow`; `Sheet`, `Card`, `Button`.

- [ ] **Step 1: PlanPage.** The header has ‹ / Bugün / › date navigation, showing a Turkish date such as "Pazartesi, 9 Kasım". Below it is the capacity warning `.note` (only when `over`), then the `PlaceTray`, then the `Timeline`.
- [ ] **Step 2: Timeline.**
  - Draw 1 px per minute over the 1080 px height, with hour lines and labels on the left, and auto-scroll to now (or to wake time on other days) when the screen opens.
  - Place blocks absolutely using `layoutDay`. Width is (100% − label column) / cols, with `left` set by col. Use the kind colour from the existing tokens (`--ders --spor --is`; `mola` and `diger` are muted), and show the title plus "10:00–11:00".
  - Draw a red now-line only on today.
  - Tapping an empty area opens BlockSheet for a new 60-minute block at the snapped time.
  - Tapping a block opens BlockSheet to edit it.
  - Drag: on `pointerdown` on a block, start a 250 ms hold timer. Moving more than 8 px before it fires cancels it, so normal scrolling still works. After the hold, set `touch-action: none` on the block, capture the pointer, and follow it with `moveBlock`, showing a live preview. Save with `updateBlock` on `pointerup`.
  - The bottom 12 px of each block is a resize handle, with the same hold logic, using `resizeBlock`.
  - Editing a recurring block's time via drag updates the whole series. This is a ruling; show "Tekrarlayan blok: tüm günler güncellendi" as a toast/note.
- [ ] **Step 3: BlockSheet.**
  - Fields: title, kind chips (Ders / Spor / İş / Mola / Diğer), start and end time inputs (15-minute steps), and "Tekrarla" day chips Pzt–Paz (none means a one-off block on the shown date).
  - An optional link to a task or course, which sets `refId` and fills the title.
  - Kaydet, which validates `end > start` and rejects an empty title. Messages are in Turkish.
  - Sil: on a recurring block it asks "Sadece bugün" / "Tümü".
- [ ] **Step 4: PlaceTray.**
  - A horizontally scrollable chip row of today's open tasks that are not yet linked to a block on the shown day, plus the courses.
  - Tapping a chip selects it and shows a hint: "Yerleştirmek için saate dokun". If the item is a task with `energy: 'high'` or a course, add "Verimli saatin: 10–12" (from `peakWindow`; when `fromData` is false, "(varsayılan)") and a "Önerilen saat: 10:00" button that uses `suggestSlot` with duration `estimateMin ?? 60`, after now on today and from DAY_START on other days.
  - Tapping a time on the timeline, or the suggestion button, creates the block: title from the item, kind `ders` for courses and from the task tag otherwise (`ders`→ders, `spor`→spor, others→is), `refId` set.
  - Tapping the selected chip again cancels.
- [ ] **Step 5:** Verify build and tests. Smoke-test in dev at 375 px: add a block, add a recurring block, delete a recurring block for today only, drag-move one with hold, place a task via the tray, and check the capacity note. Commit `feat: plan screen with draggable time blocks`.

### Task 3: Today card for the current or next block

**Files:**
- Modify: `src/features/today/cards.tsx`

**Interfaces:**
- Consumes: `useBlocksOn`, `currentOrNext`, `useNow`.
- Produces: a `CARDS` entry with id `blok`. It is appended at the end, but give it a title such that users can move it up. Cards stay in their saved order.

- [ ] **Step 1:** The card shows "Şimdi: Fizik · 18:00–19:30 (45 dk kaldı)" or "Sıradaki: Spor · 19:30". It returns null when there is neither. Tapping it goes to `#/plan`.
- [ ] **Step 2:** Verify build and tests. Commit `feat: today card for current block`.
