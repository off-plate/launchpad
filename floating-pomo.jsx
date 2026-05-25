// Floating Pomodoro mini — visible when in app view
// Pill itself is the play/pause button. Separate ⤢ button jumps to dashboard.
const { useState: useStateFP, useEffect: useEffectFP } = React;

function FloatingPomo({ onJumpToDashboard }) {
  const [state, setState] = useStateFP(() => readPomo());

  useEffectFP(() => {
    const id = setInterval(() => setState(readPomo()), 1000);
    return () => clearInterval(id);
  }, []);

  const toggleRun = (e) => {
    e && e.stopPropagation();
    // Drive the canonical PomodoroCard via event — it will update localStorage
    window.dispatchEvent(new CustomEvent("lp:pomo-toggle"));
    // Optimistically reflect locally
    setState(s => s ? { ...s, running: !s.running } : s);
  };

  const jumpToDashboard = (e) => {
    e && e.stopPropagation();
    if (onJumpToDashboard) onJumpToDashboard();
    // Scroll-and-pulse the Pomodoro card after navigating
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("lp:focus-pomo"));
    }, 50);
  };

  if (!state) return null;
  const mm = String(Math.floor(state.remaining / 60)).padStart(2, "0");
  const ss = String(state.remaining % 60).padStart(2, "0");
  const total = state.durations[state.phase];
  const pct = total > 0 ? (total - state.remaining) / total : 0;
  const R = 18;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - pct);
  const phaseColor = state.phase === "short" ? "var(--accent-3)" : state.phase === "long" ? "var(--accent-2)" : "var(--accent)";
  const phaseLabel = { focus: "Focus", short: "Short break", long: "Long break" }[state.phase];

  return (
    <div className="fp-wrap">
      <div className="fp-pill" style={{ "--fp-color": phaseColor }}>
        <button
          className="fp-toggle"
          onClick={toggleRun}
          title={(state.running ? "Pause" : "Start") + " · " + phaseLabel + " · " + mm + ":" + ss}
          aria-label={state.running ? "Pause Pomodoro" : "Start Pomodoro"}
        >
          <span className="fp-ring">
            <svg viewBox="0 0 44 44" width="36" height="36">
              <circle cx="22" cy="22" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5" />
              <g transform="rotate(-90 22 22)">
                <circle
                  cx="22" cy="22" r={R} fill="none"
                  stroke={phaseColor} strokeWidth="3.5" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={offset}
                  style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1)" }}
                />
              </g>
            </svg>
            <span className="fp-ring-glyph">
              {state.running ? (
                /* pause icon — shown while running */
                <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><rect x="4" y="3" width="3" height="10" rx="0.8"/><rect x="9" y="3" width="3" height="10" rx="0.8"/></svg>
              ) : (
                /* play icon — shown while paused */
                <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M5 3.2l8 4.8-8 4.8V3.2z"/></svg>
              )}
            </span>
          </span>
        </button>

        <div className="fp-meta" onClick={toggleRun}>
          <div className="fp-time">{mm}:{ss}</div>
          <div className="fp-phase">{phaseLabel}</div>
        </div>

        <div className="fp-divider" />

        <button
          className="fp-expand"
          onClick={jumpToDashboard}
          title="Open full Pomodoro on dashboard"
          aria-label="Open full Pomodoro on dashboard"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
            <path d="M3 7V3h4M13 9v4H9M3 3l5 5M13 13l-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function readPomo() {
  try {
    const raw = localStorage.getItem("launchpad.pomo.v1");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

Object.assign(window, { FloatingPomo });
