// Widget components for Launchpad
const { useState, useEffect, useMemo, useRef } = React;

// ---------- Profile card ----------
function ProfileCard({ name = "Michael", handle = "michael@launchpad.dev" }) {
  return (
    <div className="card profile">
      <div className="profile-photo">
        <span className="profile-photo-initial">{(name || "U")[0].toUpperCase()}</span>
      </div>
      <h2 className="profile-name">{name}</h2>
      <p className="profile-handle">{handle}</p>
      <span className="profile-meta">◆ Launchpad+</span>
      <div className="profile-spacer" />
      <div className="profile-stats">
        <div>
          <div className="profile-stat-num">14</div>
          <div>apps</div>
        </div>
        <div>
          <div className="profile-stat-num">3</div>
          <div>workspaces</div>
        </div>
        <div>
          <div className="profile-stat-num">∞</div>
          <div>ideas</div>
        </div>
      </div>
    </div>);

}

// ---------- App tile ----------
function AppTile({ app }) {
  const bg = `linear-gradient(140deg, ${app.color[0]} 0%, ${app.color[1]} 100%)`;
  return (
    <a className="app-tile" href={app.url} target="_blank" rel="noopener noreferrer" title={app.desc}>
      <div className="app-icon" style={{ background: bg }}>
        <span style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}>{app.glyph}</span>
      </div>
      <div className="app-label">{app.name}</div>
      {app.tag && <div className="app-tag">{app.tag}</div>}
    </a>);

}

// ---------- Apps card ----------
function AppsCard() {
  const [tab, setTab] = useState("all");
  const apps = window.LP_DATA.apps;
  const list = useMemo(() => {
    if (tab === "all") return [...apps.personal, ...apps.offplate, ...apps.tools];
    if (tab === "personal") return apps.personal;
    if (tab === "offplate") return apps.offplate;
    if (tab === "tools") return apps.tools;
    return [];
  }, [tab]);

  return (
    <div className="card apps">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" stroke="white" strokeWidth="1.8" /></svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">Apps</div>
          <div className="card-sub">
            <span>{list.length} shortcuts</span>
            <span className="card-sub-dot" />
            <span>tap to launch</span>
          </div>
        </div>
        <div className="apps-tabs">
          <button className={"apps-tab " + (tab === "all" ? "active" : "")} onClick={() => setTab("all")}>All</button>
          <button className={"apps-tab " + (tab === "personal" ? "active" : "")} onClick={() => setTab("personal")}>Personal</button>
          <button className={"apps-tab " + (tab === "offplate" ? "active" : "")} onClick={() => setTab("offplate")}>Off-Plate</button>
          <button className={"apps-tab " + (tab === "tools" ? "active" : "")} onClick={() => setTab("tools")}>Tools</button>
        </div>
      </div>
      <div className="app-grid">
        {list.map((a) => <AppTile key={a.url} app={a} />)}
      </div>
    </div>);

}

// ---------- Calendar card ----------
function CalendarCard() {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const isCurrentMonth = view.y === today.getFullYear() && view.m === today.getMonth();
  const eventDays = isCurrentMonth ? window.LP_DATA.events.eventDays : [];

  const monthName = new Date(view.y, view.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const firstDay = new Date(view.y, view.m, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const prevMonthDays = new Date(view.y, view.m, 0).getDate();
  // Start grid on Monday: shift so Mon=0
  const lead = (firstDay + 6) % 7;

  const cells = [];
  for (let i = lead - 1; i >= 0; i--) cells.push({ d: prevMonthDays - i, muted: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, muted: false });
  while (cells.length % 7 !== 0) cells.push({ d: cells.length - lead - daysInMonth + 1, muted: true });
  while (cells.length < 42) cells.push({ d: cells.length - lead - daysInMonth + 1, muted: true });

  const todayEvents = isCurrentMonth ? window.LP_DATA.events.today : [];

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, #f87171, #b91c1c)" }}>
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><rect x="3" y="5" width="18" height="16" rx="2" stroke="white" strokeWidth="1.6" /><path d="M3 9h18M8 3v4M16 3v4" stroke="white" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">Calendar</div>
          <div className="card-sub">
            <span>All Calendars</span>
            <span className="card-sub-dot" />
            <span>{todayEvents.length} events today</span>
          </div>
        </div>
        <button className="card-action" title="Add event">＋</button>
      </div>

      <div className="cal-month-row">
        <div className="cal-month">{monthName}</div>
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={() => setView((v) => ({ y: v.m === 0 ? v.y - 1 : v.y, m: (v.m + 11) % 12 }))}>‹</button>
          <button className="cal-nav-btn" onClick={() => setView({ y: today.getFullYear(), m: today.getMonth() })} title="Today">●</button>
          <button className="cal-nav-btn" onClick={() => setView((v) => ({ y: v.m === 11 ? v.y + 1 : v.y, m: (v.m + 1) % 12 }))}>›</button>
        </div>
      </div>

      <div className="cal-weekdays">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="cal-wd">{d}</div>)}
      </div>
      <div className="cal-grid">
        {cells.map((c, i) => {
          const isToday = !c.muted && isCurrentMonth && c.d === today.getDate();
          const hasEvent = !c.muted && eventDays.includes(c.d);
          const cls = ["cal-day"];
          if (c.muted) cls.push("muted");
          if (isToday) cls.push("today");
          if (hasEvent) cls.push("has-event");
          return <div key={i} className={cls.join(" ")}>{c.d}</div>;
        })}
      </div>

      <div className="cal-events">
        {todayEvents.length > 0 ? todayEvents.map((e, i) =>
        <div className="cal-event" key={i}>
            <div className={"cal-event-bar v" + e.v} />
            <div className="cal-event-time">{e.time}</div>
            <div className="cal-event-title">{e.title}</div>
          </div>
        ) :
        <div className="cal-empty">No events today</div>
        }
      </div>
    </div>);

}

// ---------- Todo card ----------
function TodoCard() {
  const KEY = "launchpad.todos.v1";
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return window.LP_DATA.todoSeed;
  });
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("all");
  const inputRef = useRef(null);

  useEffect(() => {
    try {localStorage.setItem(KEY, JSON.stringify(items));} catch (e) {}
  }, [items]);

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    setItems([{ id: Date.now(), text: t, done: false }, ...items]);
    setDraft("");
    inputRef.current && inputRef.current.focus();
  };
  const toggle = (id) => setItems(items.map((i) => i.id === id ? { ...i, done: !i.done } : i));
  const remove = (id) => setItems(items.filter((i) => i.id !== id));
  const clear = () => setItems(items.filter((i) => !i.done));

  const visible = items.filter((i) => filter === "all" ? true : filter === "open" ? !i.done : i.done);
  const openCount = items.filter((i) => !i.done).length;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, var(--accent-2), var(--accent))" }}>
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M4 7h12M4 12h12M4 17h8" stroke="white" strokeWidth="1.8" strokeLinecap="round" /><circle cx="19" cy="7" r="1.3" fill="white" /><circle cx="19" cy="12" r="1.3" fill="white" /></svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">To-do</div>
          <div className="card-sub">
            <span>{openCount} open</span>
            <span className="card-sub-dot" />
            <span>auto-saves</span>
          </div>
        </div>
      </div>

      <div className="todo-add">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {if (e.key === "Enter") add();}}
          placeholder="What needs doing?" />
        
        <button className="todo-add-btn" onClick={add} disabled={!draft.trim()}>＋</button>
      </div>

      <div className="todo-list">
        {visible.length === 0 ?
        <div className="cal-empty">{filter === "done" ? "Nothing finished yet" : "All clear ✦"}</div> :
        visible.map((i) =>
        <div className="todo-item" key={i.id}>
            <button className={"todo-check " + (i.done ? "done" : "")} onClick={() => toggle(i.id)} aria-label="Toggle done">
              {i.done && (
                <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
                  <path d="M3 8.5l3 3 7-7" stroke="#1a0e08" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              )}
            </button>
            <div className={"todo-text " + (i.done ? "done" : "")}>{i.text}</div>
            <button className="todo-del" onClick={() => remove(i.id)} title="Delete">×</button>
          </div>
        )}
      </div>

      <div className="todo-footer">
        <div className="todo-filter">
          <button className={"todo-fbtn " + (filter === "all" ? "active" : "")} onClick={() => setFilter("all")}>All</button>
          <button className={"todo-fbtn " + (filter === "open" ? "active" : "")} onClick={() => setFilter("open")}>Open</button>
          <button className={"todo-fbtn " + (filter === "done" ? "active" : "")} onClick={() => setFilter("done")}>Done</button>
        </div>
        <button className="todo-fbtn" onClick={clear} title="Clear completed">Clear done</button>
      </div>
    </div>);

}

// ---------- Quote card ----------
function QuoteCard({ auto = true }) {
  const quotes = window.LP_DATA.quotes;
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * quotes.length));
  const [fade, setFade] = useState(1);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      setFade(0);
      setTimeout(() => {
        setIdx((i) => (i + 1) % quotes.length);
        setFade(1);
      }, 360);
    }, 9000);
    return () => clearInterval(id);
  }, [auto, quotes.length]);

  const step = (delta) => {
    setFade(0);
    setTimeout(() => {
      setIdx((i) => (i + delta + quotes.length) % quotes.length);
      setFade(1);
    }, 220);
  };

  const q = quotes[idx];
  // Show up to 6 progress dots representing position relative
  const dotCount = Math.min(6, quotes.length);
  const activeDot = Math.floor(idx / quotes.length * dotCount);

  return (
    <div className="card quote">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, var(--accent-3), var(--accent-2))" }}>
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M7 7c-2 1-3 3-3 5v5h6v-7H6c0-1 1-2 2-3zM17 7c-2 1-3 3-3 5v5h6v-7h-4c0-1 1-2 2-3z" stroke="white" strokeWidth="1.4" /></svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">Today's spark</div>
          <div className="card-sub">
            <span>Motivation</span>
            <span className="card-sub-dot" />
            <span>rotates every 9s</span>
          </div>
        </div>
        <button className="card-action" onClick={() => step(1)} title="Next">↻</button>
      </div>

      <div className="quote-mark">“</div>
      <div className="quote-body" style={{ opacity: fade }}>
        {q.text}
      </div>
      <div className="quote-attr" style={{ opacity: fade, transition: "opacity 360ms" }}>— {q.who}</div>

      <div className="quote-footer">
        <div className="quote-progress">
          {Array.from({ length: dotCount }).map((_, i) =>
          <div key={i} className={"quote-dot " + (i === activeDot ? "active" : "")} />
          )}
        </div>
        <div className="quote-controls">
          <button className="card-action" onClick={() => step(-1)}>‹</button>
          <button className="card-action" onClick={() => step(1)}>›</button>
        </div>
      </div>
    </div>);

}

// ---------- Pomodoro card ----------
function PomodoroCard() {
  const KEY = "launchpad.pomo.v1";
  const DEFAULTS = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };

  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...parsed, running: false, history: parsed.history || [] };
      }
    } catch (e) {}
    return { phase: "focus", remaining: DEFAULTS.focus, running: false, completed: 0, durations: DEFAULTS, history: [] };
  });

  useEffect(() => {
    try {localStorage.setItem(KEY, JSON.stringify(state));} catch (e) {}
  }, [state]);

  // Tick loop
  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(() => {
      setState((s) => {
        if (!s.running) return s;
        if (s.remaining > 1) return { ...s, remaining: s.remaining - 1 };
        // Phase complete → advance + log to history
        const nextCompleted = s.phase === "focus" ? s.completed + 1 : s.completed;
        const nextPhase = s.phase === "focus" ?
        nextCompleted % 4 === 0 ? "long" : "short" :
        "focus";
        const entry = {
          ts: Date.now(),
          phase: s.phase,
          duration: s.durations[s.phase]
        };
        const newHistory = [entry, ...(s.history || [])].slice(0, 50);
        beep();
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification(s.phase === "focus" ? "Focus session done" : "Break over", {
              body: nextPhase === "focus" ? "Time to focus." : "Step away for a bit."
            });
          } catch (e) {}
        }
        return { ...s, phase: nextPhase, remaining: s.durations[nextPhase], completed: nextCompleted, running: false, history: newHistory };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state.running]);

  const beep = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      [880, 660].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);gain.connect(ctx.destination);
        osc.type = "sine";osc.frequency.value = freq;
        const t0 = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
        osc.start(t0);osc.stop(t0 + 0.35);
      });
    } catch (e) {}
  };

  const toggle = () => {
    if (!state.running && typeof Notification !== "undefined" && Notification.permission === "default") {
      try {Notification.requestPermission();} catch (e) {}
    }
    setState((s) => ({ ...s, running: !s.running }));
  };
  const reset = () => setState((s) => ({ ...s, remaining: s.durations[s.phase], running: false }));
  const skip = () => setState((s) => {
    const nextCompleted = s.phase === "focus" ? s.completed + 1 : s.completed;
    const nextPhase = s.phase === "focus" ?
    nextCompleted % 4 === 0 ? "long" : "short" :
    "focus";
    return { ...s, phase: nextPhase, remaining: s.durations[nextPhase], completed: nextCompleted, running: false };
  });
  const choosePhase = (phase) =>
  setState((s) => ({ ...s, phase, remaining: s.durations[phase], running: false }));

  const clearHistory = () => setState((s) => ({ ...s, history: [], completed: 0 }));

  const total = state.durations[state.phase];
  const pct = total > 0 ? (total - state.remaining) / total : 0;
  const R = 80;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - pct);
  const mm = String(Math.floor(state.remaining / 60)).padStart(2, "0");
  const ss = String(state.remaining % 60).padStart(2, "0");
  const phaseLabel = { focus: "Focus", short: "Short break", long: "Long break" }[state.phase];
  const ringClass = state.phase === "short" ? "break" : state.phase === "long" ? "long" : "";
  const dots = Array.from({ length: 4 }, (_, i) => state.completed % 4 > i);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, #f87171, #c2410c)" }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
            <path d="M9 2h6" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="12" cy="13" r="8" stroke="white" strokeWidth="1.6" />
            <path d="M12 9v5l3 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">Pomodoro</div>
          <div className="card-sub">
            <span>{phaseLabel}</span>
            <span className="card-sub-dot" />
            <span>{state.completed} session{state.completed === 1 ? "" : "s"} done</span>
          </div>
        </div>
      </div>

      <div className="pomo">
        <div className="pomo-ring">
          <svg viewBox="0 0 180 180" aria-hidden="true">
            <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
            <g transform="rotate(-90 90 90)">
              <circle
                cx="90" cy="90" r={R} fill="none"
                strokeWidth="8" strokeLinecap="round"
                className={"pomo-ring-fg " + ringClass}
                strokeDasharray={C}
                strokeDashoffset={offset} />
              
            </g>
          </svg>
          <div className="pomo-time">
            <div className="pomo-phase">{phaseLabel}</div>
            <div className="pomo-clock">{mm}:{ss}</div>
            <div className="pomo-sublabel">{state.running ? "running" : "paused"}</div>
          </div>
        </div>

        <div className="pomo-controls">
          <div className="pomo-presets">
            <button className={"pomo-preset " + (state.phase === "focus" ? "active" : "")} onClick={() => choosePhase("focus")}>
              <div className="pomo-preset-label">Focus</div>
              <div className="pomo-preset-time">25:00</div>
            </button>
            <button className={"pomo-preset " + (state.phase === "short" ? "active" : "")} onClick={() => choosePhase("short")}>
              <div className="pomo-preset-label">Short</div>
              <div className="pomo-preset-time">05:00</div>
            </button>
            <button className={"pomo-preset " + (state.phase === "long" ? "active" : "")} onClick={() => choosePhase("long")}>
              <div className="pomo-preset-label">Long</div>
              <div className="pomo-preset-time">15:00</div>
            </button>
          </div>

          <div className="pomo-btns">
            <button className="pomo-btn primary" onClick={toggle}>
              {state.running ?
              <React.Fragment><span className="pomo-btn-glyph">❚❚</span> Pause</React.Fragment> :

              <React.Fragment><span className="pomo-btn-glyph">▶</span> Start</React.Fragment>
              }
            </button>
            <button className="pomo-btn" onClick={reset} title="Reset current phase">↺</button>
            <button className="pomo-btn" onClick={skip} title="Skip to next phase">⏭</button>
          </div>

          <div className="pomo-stats">
            <div>Cycle {Math.floor(state.completed / 4) + 1} · session {state.completed % 4 + (state.phase === "focus" ? 1 : 0)}/4</div>
            <div className="pomo-dots">
              {dots.map((f, i) => <div key={i} className={"pomo-dot " + (f ? "filled" : "")} />)}
            </div>
          </div>
        </div>
      </div>
      <div className="pomo-history">
        <div className="pomo-history-head">
          <div className="pomo-history-title">Session history</div>
          <div className="pomo-history-meta">
            {totalFocusMinutes(state.history) > 0 &&
            <span>{totalFocusMinutes(state.history)} min focused</span>
            }
            {(state.history || []).length > 0 &&
            <button className="pomo-history-clear" onClick={clearHistory} title="Clear history">Clear</button>
            }
          </div>
        </div>
        <div className="pomo-history-list">
          {(state.history || []).length === 0 ?
          <div className="pomo-history-empty">Completed sessions will appear here.</div> :

          (state.history || []).slice(0, 8).map((h, i) =>
          <div className="pomo-history-row" key={h.ts + "-" + i}>
                <div className={"pomo-history-bar p-" + h.phase} />
                <div className="pomo-history-phase">{h.phase === "focus" ? "Focus" : h.phase === "short" ? "Short break" : "Long break"}</div>
                <div className="pomo-history-dur">{Math.round(h.duration / 60)}m</div>
                <div className="pomo-history-when">{timeAgo(h.ts)}</div>
              </div>
          )
          }
        </div>
      </div>
    </div>);
}

function totalFocusMinutes(history) {
  return Math.round((history || []).filter((h) => h.phase === "focus").reduce((sum, h) => sum + h.duration, 0) / 60);
}

function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  if (d < 7) return d + "d ago";
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ---------- Now card (time + weather + focus) ----------
function NowCard() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const dateStr = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });

  return (
    <div className="card" data-comment-anchor="5734045f40-div-330-5">
      <div className="card-header" data-comment-anchor="801f37bfea-div-556-7">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, #38bdf8, #1e40af)" }}>
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><circle cx="12" cy="12" r="8" stroke="white" strokeWidth="1.6" /><path d="M12 7v5l3 2" stroke="white" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">Now</div>
          <div className="card-sub">
            <span>{dateStr}</span>
            <span className="card-sub-dot" />
            <span>Prague</span>
          </div>
        </div>
      </div>

      <div className="now-grid">
        <div className="now-item">
          <div className="now-label">Local time</div>
          <div className="now-time-wrap">
            <div className="now-val">{hh}:{mm}</div>
            <div className="now-secs">{ss}</div>
          </div>
          <div className="now-sub">CET · Week {weekNum(now)}</div>
        </div>
        <div className="now-item">
          <div className="now-label">Weather</div>
          <div className="now-val">14°<span style={{ fontSize: 13, color: "var(--text-faint)" }}> · partly cloudy</span></div>
          <div className="now-sub">H 17° · L 8°</div>
        </div>
        <div className="now-item">
          <div className="now-label">Focus</div>
          <div className="now-val" style={{ fontSize: 16, fontFamily: "'Plus Jakarta Sans'", fontWeight: 600 }}>Ship Launchpad v2</div>
          <div className="now-sub">2 / 5 todos done</div>
        </div>
        <div className="now-item">
          <div className="now-label">Streak</div>
          <div className="now-val">12<span style={{ fontSize: 13, color: "var(--text-faint)" }}>d</span></div>
          <div className="now-sub">daily check-in</div>
        </div>
      </div>
    </div>);

}

function weekNum(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

Object.assign(window, {
  ProfileCard, AppTile, AppsCard, CalendarCard, TodoCard, QuoteCard, NowCard, PomodoroCard
});