// Widget components for Launchpad
const { useState, useEffect, useMemo, useRef } = React;

// ---------- Profile card ----------
function ProfileCard({ name = "Michael", handle = "michael@launchpad.dev" }) {
  const stats = useMemo(() => {
    const apps = window.LP_DATA && window.LP_DATA.apps;
    const appCount = apps ? apps.personal.length + apps.offplate.length + apps.tools.length : 0;
    let workspaceCount = 0;
    try {
      const raw = localStorage.getItem("launchpad.workspaces.v1");
      if (raw) workspaceCount = (JSON.parse(raw) || []).length;
    } catch (e) {}
    let openTodos = 0;
    try {
      const raw = localStorage.getItem("launchpad.todos.v1");
      if (raw) openTodos = (JSON.parse(raw) || []).filter((t) => !t.done).length;
    } catch (e) {}
    return { appCount, workspaceCount, openTodos };
  }, []);

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
          <div className="profile-stat-num">{stats.appCount}</div>
          <div>apps</div>
        </div>
        <div>
          <div className="profile-stat-num">{stats.workspaceCount}</div>
          <div>workspaces</div>
        </div>
        <div>
          <div className="profile-stat-num">{stats.openTodos}</div>
          <div>open todos</div>
        </div>
      </div>
    </div>);

}

// ---------- Calendar card (Google Calendar via OAuth) ----------
function CalendarCard() {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const isCurrentMonth = view.y === today.getFullYear() && view.m === today.getMonth();

  // Client ID is set in Tweaks → stored on body[data-google-client-id]
  const clientId = (typeof document !== "undefined" && document.body.getAttribute("data-google-client-id")) || "";
  const gcal = window.useGoogleCalendar
    ? window.useGoogleCalendar(clientId, view.y, view.m)
    : { events: [], status: "no-client", signIn: () => {}, signOut: () => {}, refresh: () => {}, hasToken: false };

  const eventDays = useMemo(() => {
    const days = new Set();
    gcal.events.forEach((e) => { if (e.day != null) days.add(e.day); });
    return days;
  }, [gcal.events]);

  const todayDate = today.getDate();
  const todayEvents = useMemo(() => {
    if (!isCurrentMonth) return [];
    return gcal.events.filter((e) => e.day === todayDate).slice(0, 8);
  }, [gcal.events, isCurrentMonth, todayDate]);

  const monthName = new Date(view.y, view.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const firstDay = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const prevMonthDays = new Date(view.y, view.m, 0).getDate();
  const lead = (firstDay + 6) % 7;

  const cells = [];
  for (let i = lead - 1; i >= 0; i--) cells.push({ d: prevMonthDays - i, muted: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, muted: false });
  while (cells.length % 7 !== 0) cells.push({ d: cells.length - lead - daysInMonth + 1, muted: true });
  while (cells.length < 42) cells.push({ d: cells.length - lead - daysInMonth + 1, muted: true });

  const subStatus = gcal.status === "ok"
    ? todayEvents.length + " events today"
    : gcal.status === "loading" ? "Loading…"
    : gcal.status === "needs-auth" ? "Sign in to load events"
    : gcal.status === "no-client" ? "Set Client ID in Tweaks"
    : gcal.status === "error" ? "Couldn't load" : "Idle";

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, #f87171, #b91c1c)" }}>
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><rect x="3" y="5" width="18" height="16" rx="2" stroke="white" strokeWidth="1.6" /><path d="M3 9h18M8 3v4M16 3v4" stroke="white" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">Calendar</div>
          <div className="card-sub">
            <span>Google · primary</span>
            <span className="card-sub-dot" />
            <span>{subStatus}</span>
          </div>
        </div>
        {gcal.hasToken && (
          <button className="card-action" onClick={gcal.refresh} title="Refresh">↻</button>
        )}
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
          const hasEvent = !c.muted && eventDays.has(c.d);
          const cls = ["cal-day"];
          if (c.muted) cls.push("muted");
          if (isToday) cls.push("today");
          if (hasEvent) cls.push("has-event");
          return <div key={i} className={cls.join(" ")}>{c.d}</div>;
        })}
      </div>

      <div className="cal-events">
        {gcal.status === "no-client" && (
          <div className="cal-empty">Open Tweaks → Google Calendar to paste your OAuth Client ID.</div>
        )}
        {gcal.status === "needs-auth" && (
          <div className="cal-events-cta">
            <button className="cal-signin-btn" onClick={gcal.signIn}>Sign in with Google</button>
            <div className="cal-signin-sub">Read-only access to your primary calendar.</div>
          </div>
        )}
        {gcal.status === "error" && (
          <div className="cal-empty">Couldn't load events. <button className="cal-link-btn" onClick={gcal.refresh}>Retry</button></div>
        )}
        {gcal.status === "ok" && (
          todayEvents.length > 0 ? todayEvents.map((e) => (
            <a className="cal-event" key={e.id} href={e.htmlLink || "#"} target="_blank" rel="noopener noreferrer">
              <div className={"cal-event-bar v" + ((Math.abs(hashStr(e.id)) % 3) + 1)} />
              <div className="cal-event-time">{e.allDay ? "all day" : e.time}</div>
              <div className="cal-event-title">{e.title}</div>
            </a>
          )) : <div className="cal-empty">No events today</div>
        )}
        {gcal.hasToken && (
          <div className="cal-account-row">
            <button className="cal-link-btn" onClick={gcal.signOut}>Sign out</button>
          </div>
        )}
      </div>
    </div>);

}

function hashStr(s) {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
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
    window.dispatchEvent(new CustomEvent("lp:todos-changed"));
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
function PomodoroCard({ durationMinutes }) {
  const KEY = "launchpad.pomo.v1";
  // Convert minute-based config (from Tweaks) into seconds. Fall back to defaults.
  const customDur = {
    focus: Math.max(1, Math.round((durationMinutes && durationMinutes.focus) || 25)) * 60,
    short: Math.max(1, Math.round((durationMinutes && durationMinutes.short) || 5)) * 60,
    long:  Math.max(1, Math.round((durationMinutes && durationMinutes.long)  || 15)) * 60
  };

  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...parsed, running: false, history: parsed.history || [], focusOn: parsed.focusOn || null, durations: customDur };
      }
    } catch (e) {}
    return { phase: "focus", remaining: customDur.focus, running: false, completed: 0, durations: customDur, history: [], focusOn: null };
  });

  // React to changes in Tweaks durations: update phase length, and reset remaining if not running
  useEffect(() => {
    setState((s) => {
      const dur = customDur;
      const sameAsCurrent = s.durations[s.phase] === dur[s.phase];
      return {
        ...s,
        durations: dur,
        remaining: s.running || sameAsCurrent ? s.remaining : dur[s.phase]
      };
    });
    // eslint-disable-next-line
  }, [customDur.focus, customDur.short, customDur.long]);

  // Read open todos for the "focus on" picker
  const [openTodos, setOpenTodos] = useState(() => readOpenTodos());
  useEffect(() => {
    const sync = () => setOpenTodos(readOpenTodos());
    window.addEventListener("storage", sync);
    window.addEventListener("lp:todos-changed", sync);
    const id = setInterval(sync, 3000);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("lp:todos-changed", sync); clearInterval(id); };
  }, []);

  useEffect(() => {
    try {localStorage.setItem(KEY, JSON.stringify(state));} catch (e) {}
  }, [state]);

  // Allow the floating pomo (in workspace view) to toggle this timer remotely
  useEffect(() => {
    const onToggle = () => setState(s => ({ ...s, running: !s.running }));
    window.addEventListener("lp:pomo-toggle", onToggle);
    return () => window.removeEventListener("lp:pomo-toggle", onToggle);
  }, []);

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
          duration: s.durations[s.phase],
          focusOn: s.phase === "focus" ? (s.focusOn || null) : null
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

  const setFocusOn = (todoText) => setState((s) => ({ ...s, focusOn: todoText || null }));

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
            <div className="pomo-sublabel">{state.running ? "running" : "paused"}{state.phase === "focus" && state.focusOn ? " · " + truncate(state.focusOn, 18) : ""}</div>
          </div>
        </div>

        <div className="pomo-controls">
          {state.phase === "focus" && (
            <div className="pomo-focus-on">
              <label className="pomo-focus-on-label">Focusing on</label>
              <select
                className="pomo-focus-on-select"
                value={state.focusOn || ""}
                onChange={(e) => setFocusOn(e.target.value)}
              >
                <option value="">— nothing specific —</option>
                {openTodos.map((t) => (
                  <option key={t.id} value={t.text}>{t.text}</option>
                ))}
              </select>
            </div>
          )}
          <div className="pomo-presets">
            <button className={"pomo-preset " + (state.phase === "focus" ? "active" : "")} onClick={() => choosePhase("focus")}>
              <div className="pomo-preset-label">Focus</div>
              <div className="pomo-preset-time">{mmss(customDur.focus)}</div>
            </button>
            <button className={"pomo-preset " + (state.phase === "short" ? "active" : "")} onClick={() => choosePhase("short")}>
              <div className="pomo-preset-label">Short</div>
              <div className="pomo-preset-time">{mmss(customDur.short)}</div>
            </button>
            <button className={"pomo-preset " + (state.phase === "long" ? "active" : "")} onClick={() => choosePhase("long")}>
              <div className="pomo-preset-label">Long</div>
              <div className="pomo-preset-time">{mmss(customDur.long)}</div>
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
                <div className="pomo-history-phase">
                  {h.phase === "focus" ? "Focus" : h.phase === "short" ? "Short break" : "Long break"}
                  {h.focusOn && <span className="pomo-history-on"> → {truncate(h.focusOn, 28)}</span>}
                </div>
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

function readOpenTodos() {
  try {
    const raw = localStorage.getItem("launchpad.todos.v1");
    if (!raw) return [];
    return (JSON.parse(raw) || []).filter((t) => !t.done);
  } catch (e) { return []; }
}

function mmss(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
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

// ---------- Now card — DEPRECATED, replaced by TodayCard. Kept for old saved layouts. ----------
function NowCard() {
  const [now, setNow] = useState(new Date());
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    const slow = setInterval(() => setTick((n) => n + 1), 30000);
    return () => { clearInterval(id); clearInterval(slow); };
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const dateStr = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });

  // Real weather from the cache the WeatherCard maintains
  const wx = useMemo(() => {
    try {
      const raw = localStorage.getItem("lp.weather.v1");
      if (!raw) return null;
      const { value } = JSON.parse(raw);
      if (!value || !value.current || !value.daily) return null;
      return {
        temp: Math.round(value.current.temperature_2m),
        code: value.current.weather_code,
        hi: Math.round(value.daily.temperature_2m_max[0]),
        lo: Math.round(value.daily.temperature_2m_min[0])
      };
    } catch (e) { return null; }
  }, [tick]);

  // Real focus: open todos + what Pomodoro is focused on + minutes today
  const focus = useMemo(() => {
    let openTodos = 0, doneTodos = 0;
    try {
      const raw = localStorage.getItem("launchpad.todos.v1");
      if (raw) {
        const todos = JSON.parse(raw) || [];
        openTodos = todos.filter((t) => !t.done).length;
        doneTodos = todos.filter((t) => t.done).length;
      }
    } catch (e) {}
    let focusOn = null, minutesToday = 0;
    try {
      const raw = localStorage.getItem("launchpad.pomo.v1");
      if (raw) {
        const pomo = JSON.parse(raw) || {};
        focusOn = pomo.focusOn || null;
        const start = new Date(); start.setHours(0, 0, 0, 0);
        minutesToday = Math.round((pomo.history || [])
          .filter((h) => h.phase === "focus" && h.ts >= start.getTime())
          .reduce((s, h) => s + h.duration, 0) / 60);
      }
    } catch (e) {}
    return { openTodos, doneTodos, focusOn, minutesToday };
  }, [tick]);

  return (
    <div className="card">
      <div className="card-header">
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
          {wx ? (
            <React.Fragment>
              <div className="now-val">{wx.temp}°<span style={{ fontSize: 13, color: "var(--text-faint)" }}> · {nowWxLabel(wx.code)}</span></div>
              <div className="now-sub">H {wx.hi}° · L {wx.lo}°</div>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <div className="now-val" style={{ fontSize: 16, fontWeight: 600 }}>—</div>
              <div className="now-sub">Add Weather widget</div>
            </React.Fragment>
          )}
        </div>
        <div className="now-item">
          <div className="now-label">Focus</div>
          <div className="now-val" style={{ fontSize: 16, fontFamily: "'Bricolage Grotesque'", fontWeight: 600 }}>
            {focus.focusOn ? truncate(focus.focusOn, 22) : (focus.openTodos > 0 ? focus.openTodos + " open" : "All clear")}
          </div>
          <div className="now-sub">{focus.doneTodos} / {focus.doneTodos + focus.openTodos} todos done</div>
        </div>
        <div className="now-item">
          <div className="now-label">Focused today</div>
          <div className="now-val">{focus.minutesToday}<span style={{ fontSize: 13, color: "var(--text-faint)" }}>m</span></div>
          <div className="now-sub">Pomodoro time</div>
        </div>
      </div>
    </div>);

}

function nowWxLabel(code) {
  if (code === 0) return "Clear";
  if (code >= 1 && code <= 3) return "Partly cloudy";
  if (code >= 45 && code <= 48) return "Foggy";
  if (code >= 51 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

function weekNum(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

Object.assign(window, {
  ProfileCard, CalendarCard, TodoCard, QuoteCard, NowCard, PomodoroCard
});