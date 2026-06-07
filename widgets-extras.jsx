// Extra widgets: Today summary, Habits tracker, Quick notes, Time blocks, Focus heatmap
const { useState: useStateWX, useEffect: useEffectWX, useMemo: useMemoWX, useRef: useRefWX } = React;

// ============================================================
// Helper: read various LP localStorage shapes
// ============================================================
function readTodos() {
  try {
    const raw = localStorage.getItem("launchpad.todos.v1");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {return [];}
}
function readPomoState() {
  try {
    const raw = localStorage.getItem("launchpad.pomo.v1");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {return null;}
}

// ============================================================
// Today widget — combined snapshot
// ============================================================
function TodayCard() {
  const [tick, setTick] = useStateWX(0);
  const [now, setNow] = useStateWX(new Date());
  useEffectWX(() => {
    const id = setInterval(() => {setTick((n) => n + 1);setNow(new Date());}, 1000);
    const onChange = () => setTick((n) => n + 1);
    window.addEventListener("lp:todos-changed", onChange);
    window.addEventListener("lp:pomo-sync", onChange);
    return () => {clearInterval(id);window.removeEventListener("lp:todos-changed", onChange);window.removeEventListener("lp:pomo-sync", onChange);};
  }, []);

  const todos = useMemoWX(() => readTodos(), [tick]);
  const openTodos = todos.filter((i) => !i.done).slice(0, 4);
  const doneCount = todos.filter((i) => i.done).length;
  const pomo = useMemoWX(() => readPomoState(), [tick]);

  // Today's events from LP_DATA.events.today
  const events = window.LP_DATA && window.LP_DATA.events && window.LP_DATA.events.today || [];

  // Focus minutes today from Pomodoro history
  const focusedToday = useMemoWX(() => {
    if (!pomo || !pomo.history) return 0;
    const start = new Date();start.setHours(0, 0, 0, 0);
    return Math.round(pomo.history.
    filter((h) => h.phase === "focus" && h.ts >= start.getTime()).
    reduce((s, h) => s + h.duration, 0) / 60);
  }, [pomo]);

  // Mini pomo ring
  const total = pomo && pomo.durations ? pomo.durations[pomo.phase] : 25 * 60;
  const pct = pomo ? (total - pomo.remaining) / total : 0;
  const R = 26;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - pct);
  const mm = pomo ? String(Math.floor(pomo.remaining / 60)).padStart(2, "0") : "25";
  const ss = pomo ? String(pomo.remaining % 60).padStart(2, "0") : "00";
  const phaseColor = !pomo || pomo.phase === "focus" ? "var(--accent)" : pomo.phase === "short" ? "var(--accent-3)" : "var(--accent-2)";

  const toggleTodo = (id) => {
    const next = todos.map((i) => i.id === id ? { ...i, done: !i.done } : i);
    try {localStorage.setItem("launchpad.todos.v1", JSON.stringify(next));} catch (e) {}
    window.dispatchEvent(new CustomEvent("lp:todos-changed"));
  };

  const greet = (() => {
    const h = now.getHours();
    if (h < 5) return "Late night";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="card td-card">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
            <path d="M5 9l7 4 7-4M5 9v8a1 1 0 001 1h12a1 1 0 001-1V9M5 9l-1-3h16l-1 3" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">Today</div>
          <div className="card-sub">
            <span>{greet}</span>
            <span className="card-sub-dot" />
            <span>{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}</span>
          </div>
        </div>
      </div>

      <div className="td-row td-focus-row">
        <button
          className="td-pomo"
          onClick={() => window.dispatchEvent(new CustomEvent("lp:pomo-toggle"))}
          title={pomo && pomo.running ? "Pause Pomodoro" : "Start Pomodoro"}>
          
          <svg viewBox="0 0 64 64" width="56" height="56">
            <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <g transform="rotate(-90 32 32)">
              <circle cx="32" cy="32" r={R} fill="none" stroke={phaseColor} strokeWidth="4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)" }} />
            </g>
          </svg>
          <span className="td-pomo-glyph" aria-hidden="true">
            {pomo && pomo.running ? (
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                <rect x="4" y="3" width="3" height="10" rx="0.8" />
                <rect x="9" y="3" width="3" height="10" rx="0.8" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                <path d="M5 3.2l8 4.8-8 4.8V3.2z" />
              </svg>
            )}
          </span>
        </button>
        <div className="td-focus-meta">
          <div className="td-focus-clock">{mm}:{ss}</div>
          <div className="td-focus-sub">
            {pomo ? pomo.phase === "focus" ? "Focus" : pomo.phase === "short" ? "Short break" : "Long break" : "Focus"}
            {" · "}{focusedToday} min today
          </div>
          {pomo && pomo.focusOn && <div className="td-focus-on">→ {pomo.focusOn}</div>}
        </div>
      </div>

      <div className="td-section">
        <div className="td-section-head">
          <span className="td-section-label">Up next</span>
          <span className="td-section-meta">{openTodos.length} open · {doneCount} done</span>
        </div>
        {openTodos.length === 0 ?
        <div className="td-empty">All clear — add something in the To-do widget.</div> :

        <div className="td-todo-list">
            {openTodos.map((t) =>
          <div key={t.id} className="td-todo">
                <button className="todo-check" onClick={() => toggleTodo(t.id)} />
                <div className="td-todo-text">{t.text}</div>
              </div>
          )}
          </div>
        }
      </div>

      <div className="td-section">
        <div className="td-section-head">
          <span className="td-section-label">Today's events</span>
          <span className="td-section-meta">{events.length}</span>
        </div>
        {events.length === 0 ?
        <div className="td-empty">Calendar's clear today.</div> :

        <div className="td-events">
            {events.map((e, i) =>
          <div key={i} className="td-event">
                <div className={"cal-event-bar v" + (e.v || 1)} />
                <div className="td-event-time">{e.time}</div>
                <div className="td-event-title">{e.title}</div>
              </div>
          )}
          </div>
        }
      </div>
    </div>);

}

// ============================================================
// Habits tracker — daily checkboxes, streaks
// ============================================================
const HABITS_KEY = "launchpad.habits.v1";
const DEFAULT_HABITS = [
{ id: "water", name: "Drink water", icon: "💧", color: "#38bdf8" },
{ id: "move", name: "Move body", icon: "🏃", color: "#34d399" },
{ id: "read", name: "Read", icon: "📖", color: "#f472b6" },
{ id: "sleep", name: "Sleep 7h+", icon: "🌙", color: "#a78bfa" }];


function loadHabits() {
  try {
    const raw = localStorage.getItem(HABITS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { habits: parsed.habits || DEFAULT_HABITS, completions: parsed.completions || {} };
    }
  } catch (e) {}
  return { habits: DEFAULT_HABITS, completions: {} };
}
function saveHabits(s) {try {localStorage.setItem(HABITS_KEY, JSON.stringify(s));} catch (e) {}}

function HabitsCard() {
  const [state, setState] = useStateWX(loadHabits);
  useEffectWX(() => saveHabits(state), [state]);

  const today = isoDate(new Date());
  const week = useMemoWX(() => {
    const out = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      out.push({ date: d, key: isoDate(d), label: d.toLocaleDateString(undefined, { weekday: "narrow" }), dayNum: d.getDate() });
    }
    return out;
  }, []);

  const toggle = (habitId, dateKey) => {
    setState((s) => {
      const next = { ...s, completions: { ...s.completions } };
      const day = { ...(next.completions[dateKey] || {}) };
      day[habitId] = !day[habitId];
      next.completions[dateKey] = day;
      return next;
    });
  };

  const streakFor = (habitId) => {
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = isoDate(d);
      const done = state.completions[key] && state.completions[key][habitId];
      if (done) streak++;else
      if (i > 0) break; // today not yet done = streak still alive
    }
    return streak;
  };

  return (
    <div className="card hb-card">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, #34d399, #065f46)" }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
            <path d="M4 12l5 5 11-11" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">Habits</div>
          <div className="card-sub">
            <span>Daily check-in</span>
            <span className="card-sub-dot" />
            <span>{state.habits.length} habits</span>
          </div>
        </div>
      </div>

      <div className="hb-table">
        <div className="hb-row hb-row-head">
          <div className="hb-name" />
          {week.map((d) =>
          <div key={d.key} className={"hb-day " + (d.key === today ? "today" : "")}>
              <div>{d.label}</div>
              <div className="hb-day-num">{d.dayNum}</div>
            </div>
          )}
          <div className="hb-streak-head">↯</div>
        </div>
        {state.habits.map((h) => {
          const streak = streakFor(h.id);
          return (
            <div className="hb-row" key={h.id}>
              <div className="hb-name">
                <span className="hb-icon" style={{ background: h.color + "22", color: h.color }}>{h.icon}</span>
                <span>{h.name}</span>
              </div>
              {week.map((d) => {
                const done = state.completions[d.key] && state.completions[d.key][h.id];
                const isToday = d.key === today;
                return (
                  <button
                    key={d.key}
                    className={"hb-cell " + (done ? "done " : "") + (isToday ? "today" : "")}
                    onClick={() => toggle(h.id, d.key)}
                    style={done ? { background: h.color, borderColor: h.color } : {}}
                    title={d.date.toLocaleDateString()}>
                    
                    {done ? "✓" : ""}
                  </button>);

              })}
              <div className="hb-streak" title="Current streak">{streak}<span>d</span></div>
            </div>);

        })}
      </div>
    </div>);

}

// ============================================================
// Quick notes
// ============================================================
function QuickNotesCard() {
  const KEY = "launchpad.notes.v1";
  const [text, setText] = useStateWX(() => {
    try {return localStorage.getItem(KEY) || "";} catch (e) {return "";}
  });
  const [saved, setSaved] = useStateWX(true);

  useEffectWX(() => {
    setSaved(false);
    const id = setTimeout(() => {
      try {localStorage.setItem(KEY, text);} catch (e) {}
      setSaved(true);
    }, 400);
    return () => clearTimeout(id);
  }, [text]);

  const lineCount = text.split("\n").length;
  const charCount = text.length;

  return (
    <div className="card qn-card">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, #facc15, #854d0e)" }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
            <path d="M4 5a2 2 0 012-2h9l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" stroke="white" strokeWidth="1.6" />
            <path d="M14 3v6h6M8 13h8M8 17h5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">Quick notes</div>
          <div className="card-sub">
            <span>{lineCount} line{lineCount === 1 ? "" : "s"} · {charCount} chars</span>
            <span className="card-sub-dot" />
            <span className={saved ? "qn-saved" : "qn-saving"}>{saved ? "saved" : "saving…"}</span>
          </div>
        </div>
      </div>
      <textarea
        className="qn-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Scratchpad — anything that pops into your head. Auto-saves to this browser." />
      
    </div>);

}

// ============================================================
// Time blocks — drag focus blocks onto a horizontal day timeline
// ============================================================
const TIMEBLOCK_KEY = "launchpad.timeblocks.v1";
const TB_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const TB_PALETTES = [
{ from: "var(--accent)", to: "oklch(from var(--accent) calc(l - 0.18) c h)" },
{ from: "var(--accent-2)", to: "oklch(from var(--accent-2) calc(l - 0.18) c h)" },
{ from: "var(--accent-3)", to: "oklch(from var(--accent-3) calc(l - 0.18) c h)" },
{ from: "#f472b6", to: "#831843" },
{ from: "#38bdf8", to: "#075985" }];


function loadBlocks() {
  try {
    const raw = localStorage.getItem(TIMEBLOCK_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  // Seed with a few example blocks for today
  return {
    [isoDate(new Date())]: [
    { id: 1, start: 9, hours: 2, title: "Deep work — Launchpad v3", palette: 0 },
    { id: 2, start: 11, hours: 1, title: "Standup + emails", palette: 1 },
    { id: 3, start: 13, hours: 1.5, title: "Hunterpart scrape fix", palette: 2 }]

  };
}
function saveBlocks(s) {try {localStorage.setItem(TIMEBLOCK_KEY, JSON.stringify(s));} catch (e) {}}

function TimeBlocksCard() {
  const [store, setStore] = useStateWX(loadBlocks);
  const [activeDate, setActiveDate] = useStateWX(() => isoDate(new Date()));
  const [drag, setDrag] = useStateWX(null);
  const [editingId, setEditingId] = useStateWX(null);
  const trackRef = useRefWX(null);

  useEffectWX(() => saveBlocks(store), [store]);

  const blocks = store[activeDate] || [];
  const setBlocksFor = (date, next) => setStore((s) => ({ ...s, [date]: next }));

  const addBlock = (start) => {
    const id = Date.now();
    const next = [...blocks, { id, start, hours: 1, title: "", palette: blocks.length % TB_PALETTES.length }];
    setBlocksFor(activeDate, next);
    setEditingId(id);
  };
  const updateBlock = (id, patch) => setBlocksFor(activeDate, blocks.map((b) => b.id === id ? { ...b, ...patch } : b));
  const removeBlock = (id) => {
    setBlocksFor(activeDate, blocks.filter((b) => b.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const dayDelta = (delta) => {
    const d = new Date(activeDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setActiveDate(isoDate(d));
  };

  // Drag block body to move
  const onBlockPointerDown = (e, b) => {
    if (editingId === b.id) return; // don't drag while editing
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const track = trackRef.current;
    const rect = track.getBoundingClientRect();
    const hourWidth = rect.width / TB_HOURS.length;
    setDrag({ id: b.id, kind: "move", origStart: b.start, origMouseX: e.clientX, hourWidth, moved: false });
  };
  const onResizeStart = (e, b) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const track = trackRef.current;
    const rect = track.getBoundingClientRect();
    const hourWidth = rect.width / TB_HOURS.length;
    setDrag({ id: b.id, kind: "resize", origHours: b.hours, origMouseX: e.clientX, hourWidth, moved: false });
  };
  const onPointerMove = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.origMouseX;
    if (Math.abs(dx) < 3 && !drag.moved) return;
    const hoursMoved = Math.round(dx / drag.hourWidth * 4) / 4; // 15-min snap
    const block = blocks.find((b) => b.id === drag.id);
    if (!block) return;
    if (drag.kind === "move") {
      const last = TB_HOURS[TB_HOURS.length - 1] + 1;
      const next = Math.max(TB_HOURS[0], Math.min(last - block.hours, drag.origStart + hoursMoved));
      updateBlock(drag.id, { start: next });
    } else {
      const last = TB_HOURS[TB_HOURS.length - 1] + 1;
      const next = Math.max(0.5, Math.min(last - block.start, drag.origHours + hoursMoved));
      updateBlock(drag.id, { hours: next });
    }
    setDrag((d) => d && ({ ...d, moved: true }));
  };
  const onPointerUp = () => setDrag(null);

  // Lane assignment for overlapping blocks
  const blockLanes = useMemoWX(() => {
    const sorted = [...blocks].sort((a, b) => a.start - b.start);
    const lanes = [];
    const out = {};
    sorted.forEach((b) => {
      let placed = false;
      for (let i = 0; i < lanes.length; i++) {
        const last = lanes[i][lanes[i].length - 1];
        const lastEnd = last.start + last.hours;
        if (lastEnd <= b.start) {
          lanes[i].push(b);
          out[b.id] = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        lanes.push([b]);
        out[b.id] = lanes.length - 1;
      }
    });
    return { laneByBlock: out, laneCount: Math.max(1, lanes.length) };
  }, [blocks]);

  const isToday = activeDate === isoDate(new Date());
  const now = new Date();
  const nowPos = isToday ? clamp((now.getHours() + now.getMinutes() / 60 - TB_HOURS[0]) / TB_HOURS.length * 100, 0, 100) : null;
  const totalHours = blocks.reduce((s, b) => s + b.hours, 0);

  return (
    <div className="card tb-card">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
            <rect x="3" y="6" width="18" height="14" rx="2" stroke="white" strokeWidth="1.6" />
            <path d="M3 10h18M8 3v4M16 3v4" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">Time blocks</div>
          <div className="card-sub">
            <span>{blocks.length} block{blocks.length === 1 ? "" : "s"}</span>
            <span className="card-sub-dot" />
            <span>{totalHours} h planned</span>
          </div>
        </div>
        <div className="tb-nav">
          <button className="card-action" onClick={() => dayDelta(-1)}>‹</button>
          <button className="card-action" onClick={() => setActiveDate(isoDate(new Date()))} title="Today">●</button>
          <button className="card-action" onClick={() => dayDelta(1)}>›</button>
        </div>
      </div>

      <div className="tb-date">
        {new Date(activeDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        {!isToday && <button className="tb-today-btn" onClick={() => setActiveDate(isoDate(new Date()))}>jump to today</button>}
      </div>

      <div
        className="tb-track-wrap"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}>
        <div className="tb-hour-row">
          {TB_HOURS.map((h) => (
            <div key={h} className="tb-hour-label">{String(h).padStart(2, "0")}</div>
          ))}
        </div>
        <div
          className="tb-track"
          ref={trackRef}
          style={{ "--lanes": blockLanes.laneCount }}
        >
          {TB_HOURS.map((h) => (
            <button
              key={h}
              className="tb-slot"
              onClick={() => addBlock(h)}
              title={`Click to add a block starting at ${h}:00`}
            />
          ))}
          {nowPos !== null && (
            <div className="tb-now" style={{ left: nowPos + "%" }} title="Now">
              <span>now</span>
            </div>
          )}
          {blocks.map((b) => {
            const startIdx = b.start - TB_HOURS[0];
            const leftPct = startIdx / TB_HOURS.length * 100;
            const widthPct = b.hours / TB_HOURS.length * 100;
            const pal = TB_PALETTES[b.palette % TB_PALETTES.length];
            const lane = blockLanes.laneByBlock[b.id] || 0;
            const laneHeight = 100 / blockLanes.laneCount;
            const isEditing = editingId === b.id;
            return (
              <div
                key={b.id}
                className={"tb-block " + (drag && drag.id === b.id ? "dragging " : "") + (isEditing ? "editing" : "")}
                style={{
                  left: leftPct + "%",
                  width: widthPct + "%",
                  top: `calc(${lane * laneHeight}% + 4px)`,
                  height: `calc(${laneHeight}% - 8px)`,
                  background: `linear-gradient(135deg, ${pal.from}, ${pal.to})`
                }}
                onPointerDown={(e) => onBlockPointerDown(e, b)}
                onDoubleClick={(e) => { e.stopPropagation(); setEditingId(b.id); }}
              >
                <div className="tb-block-inner">
                  <div className="tb-block-time">{formatHour(b.start)}–{formatHour(b.start + b.hours)}</div>
                  {isEditing ? (
                    <input
                      className="tb-block-title"
                      value={b.title}
                      placeholder="What's this block?"
                      autoFocus
                      onChange={(e) => updateBlock(b.id, { title: e.target.value })}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Escape") {
                          e.target.blur();
                        }
                      }}
                    />
                  ) : (
                    <div
                      className="tb-block-title-static"
                      onClick={(e) => { e.stopPropagation(); setEditingId(b.id); }}
                    >
                      {b.title || <span className="tb-block-empty">Click to name…</span>}
                    </div>
                  )}
                </div>
                <button
                  className="tb-block-del"
                  onPointerDown={(e) => { e.stopPropagation(); }}
                  onMouseDown={(e) => { e.stopPropagation(); }}
                  onClick={(e) => { e.stopPropagation(); removeBlock(b.id); }}
                  title="Delete block"
                >
                  <svg viewBox="0 0 16 16" width="10" height="10" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
                <div
                  className="tb-block-resize"
                  onPointerDown={(e) => onResizeStart(e, b)}
                  title="Drag to resize"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="tb-help">
        Click an empty slot to add · drag block to move · drag right edge to resize · click name to edit
      </div>
    </div>
  );
}

// ============================================================
// Focus heatmap — GitHub-style year grid of focus minutes
// ============================================================
function FocusHeatmapCard() {
  const [tick, setTick] = useStateWX(0);
  useEffectWX(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    const onSync = () => setTick((n) => n + 1);
    window.addEventListener("lp:pomo-sync", onSync);
    return () => {clearInterval(id);window.removeEventListener("lp:pomo-sync", onSync);};
  }, []);

  const cells = useMemoWX(() => {
    const pomo = readPomoState();
    const hist = pomo && pomo.history || [];
    const minutesPerDay = {};
    hist.forEach((h) => {
      if (h.phase !== "focus") return;
      const d = new Date(h.ts);
      d.setHours(0, 0, 0, 0);
      const key = isoDate(d);
      minutesPerDay[key] = (minutesPerDay[key] || 0) + h.duration / 60;
    });

    // Build 53 weeks back from today, aligning by Mon-start
    const cells = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = (today.getDay() + 6) % 7; // 0 = Mon
    const start = new Date(today);
    start.setDate(start.getDate() - dayOfWeek - 52 * 7);
    const max = Math.max(60, ...Object.values(minutesPerDay));
    for (let i = 0; i < 53 * 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = isoDate(d);
      const min = minutesPerDay[key] || 0;
      let level = 0;
      if (min > 0) level = Math.min(4, Math.ceil(min / max * 4));
      cells.push({ date: d, key, minutes: Math.round(min), level, future: d > today });
    }
    return { cells, max };
    // eslint-disable-next-line
  }, [tick]);

  const totalMin = cells.cells.reduce((s, c) => s + c.minutes, 0);
  const totalHours = Math.round(totalMin / 60);
  const activeDays = cells.cells.filter((c) => c.minutes > 0).length;

  const monthLabels = useMemoWX(() => {
    const out = [];
    let lastMonth = -1;
    cells.cells.forEach((c, i) => {
      if (i % 7 === 0) {// first cell of a column
        const m = c.date.getMonth();
        if (m !== lastMonth) {
          out.push({ col: i / 7, label: c.date.toLocaleDateString(undefined, { month: "short" }) });
          lastMonth = m;
        }
      }
    });
    return out;
  }, [cells]);

  return (
    <div className="card fh-card">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, #16a34a, #166534)" }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
            <rect x="3" y="3" width="6" height="6" rx="1" stroke="white" strokeWidth="1.4" />
            <rect x="11" y="3" width="6" height="6" rx="1" stroke="white" strokeWidth="1.4" />
            <rect x="3" y="11" width="6" height="6" rx="1" stroke="white" strokeWidth="1.4" />
            <rect x="11" y="11" width="6" height="6" rx="1" stroke="white" strokeWidth="1.4" />
          </svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">Focus heatmap</div>
          <div className="card-sub">
            <span>{totalHours} h focused</span>
            <span className="card-sub-dot" />
            <span>{activeDays} active days · last 12 mo</span>
          </div>
        </div>
      </div>

      <div className="fh-frame">
        <div className="fh-months">
          {monthLabels.map((m) =>
          <span key={m.col + "-" + m.label} style={{ gridColumn: m.col + 1 }}>{m.label}</span>
          )}
        </div>
        <div className="fh-grid">
          {cells.cells.map((c) =>
          <div
            key={c.key}
            className={"fh-cell fh-lvl-" + c.level + (c.future ? " future" : "")}
            title={c.future ? c.date.toLocaleDateString() : `${c.date.toLocaleDateString()} · ${c.minutes} min`} />

          )}
        </div>
      </div>

      <div className="fh-legend">
        <span>Less</span>
        <div className="fh-cell fh-lvl-0" />
        <div className="fh-cell fh-lvl-1" />
        <div className="fh-cell fh-lvl-2" />
        <div className="fh-cell fh-lvl-3" />
        <div className="fh-cell fh-lvl-4" />
        <span>More</span>
      </div>
    </div>);

}

// ============================================================
// Helpers
// ============================================================
function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}
function clamp(x, lo, hi) {return Math.max(lo, Math.min(hi, x));}
function formatHour(h) {
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  return String(whole).padStart(2, "0") + ":" + String(min).padStart(2, "0");
}

Object.assign(window, {
  TodayCard, HabitsCard, QuickNotesCard, TimeBlocksCard, FocusHeatmapCard
});