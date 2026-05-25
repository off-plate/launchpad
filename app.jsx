// Launchpad — main app shell with bento grid + edit/drag/resize
const { useState: useStateApp, useEffect: useEffectApp, useRef: useRefApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "midnight",
  "name": "Michael",
  "handle": "michael@launchpad.dev",
  "autoQuote": true,
  "density": "comfortable"
} /*EDITMODE-END*/;

// --- Widget registry: id → render fn + display label
const WIDGETS = {
  profile: { label: "Profile", render: (t) => <ProfileCard name={t.name} handle={t.handle} /> },
  apps: { label: "Apps", render: () => <AppsCard /> },
  calendar: { label: "Calendar", render: () => <CalendarCard /> },
  todo: { label: "To-do", render: () => <TodoCard /> },
  pomodoro: { label: "Pomodoro", render: () => <PomodoroCard /> },
  quote: { label: "Today's spark", render: (t) => <QuoteCard auto={t.autoQuote} /> },
  now: { label: "Now", render: () => <NowCard /> },
  recents: { label: "Recents", render: () => <RecentsCard /> }
};

// --- Default layout — 3-col bento, rows sum to 3
const DEFAULT_LAYOUT = [
{ id: "profile", w: 1 },
{ id: "apps", w: 2 },
{ id: "calendar", w: 1 },
{ id: "pomodoro", w: 2 },
{ id: "todo", w: 1 },
{ id: "quote", w: 1 },
{ id: "now", w: 1 },
{ id: "recents", w: 3 }];


const LAYOUT_KEY = "launchpad.layout.v3";

function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Filter to known widgets; ensure shape
      const valid = parsed.filter((i) => WIDGETS[i.id] && [1, 2, 3].includes(i.w));
      // Append any missing default widgets so adding new ones doesn't strand them
      const present = new Set(valid.map((i) => i.id));
      DEFAULT_LAYOUT.forEach((d) => {if (!present.has(d.id)) valid.push(d);});
      return valid;
    }
  } catch (e) {}
  return DEFAULT_LAYOUT;
}

function LaunchpadApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [editMode, setEditMode] = useStateApp(false);
  const [layout, setLayout] = useStateApp(loadLayout);

  useEffectApp(() => {
    document.body.setAttribute("data-theme", t.theme);
    document.body.setAttribute("data-density", t.density);
  }, [t.theme, t.density]);

  useEffectApp(() => {
    try {localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));} catch (e) {}
  }, [layout]);

  const resetLayout = () => setLayout(DEFAULT_LAYOUT);

  return (
    <div className="stage">
      <div className="shell">
        <LayoutGrid
          layout={layout}
          setLayout={setLayout}
          editMode={editMode}
          tweaks={t} />
        
      </div>

      <EditBar
        editMode={editMode}
        setEditMode={setEditMode}
        resetLayout={resetLayout} />
      

      <TweaksPanel title="Tweaks">
        <TweakSection title="Theme">
          <TweakRadio
            label="Palette"
            value={t.theme}
            onChange={(v) => setTweak("theme", v)}
            options={[
            { label: "Midnight", value: "midnight" },
            { label: "Aurora", value: "aurora" }]
            } />
          
          <TweakSelect
            label="More palettes"
            value={t.theme}
            onChange={(v) => setTweak("theme", v)}
            options={[
            { label: "Midnight (warm dark)", value: "midnight" },
            { label: "Aurora (cool teal)", value: "aurora" },
            { label: "Sunset (warm coral)", value: "sunset" },
            { label: "Forest (green dark)", value: "forest" }]
            } />
          
        </TweakSection>

        <TweakSection title="Identity">
          <TweakText label="Display name" value={t.name} onChange={(v) => setTweak("name", v)} />
          <TweakText label="Handle / email" value={t.handle} onChange={(v) => setTweak("handle", v)} />
        </TweakSection>

        <TweakSection title="Widgets">
          <TweakToggle label="Auto-rotate quotes" checked={t.autoQuote} onChange={(v) => setTweak("autoQuote", v)} />
          <TweakButton label="Reset layout" onClick={resetLayout} />
        </TweakSection>
      </TweaksPanel>
    </div>);

}

// ---------- Welcome banner ----------
function Welcome({ name }) {
  const hour = new Date().getHours();
  const greet = hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <div className="welcome">
      <div className="welcome-icon">✦</div>
      <div className="welcome-text">
        <div className="welcome-title" data-comment-anchor="47d7ed8839-div-134-9">{greet}, {name} — your cockpit is ready.</div>
        <div className="welcome-sub">All your apps, today's plan, and a little fuel — in one place.</div>
      </div>
      <button className="welcome-arrow">→</button>
    </div>);

}

// ---------- Layout grid with drag + resize ----------
function LayoutGrid({ layout, setLayout, editMode, tweaks }) {
  const [dragId, setDragId] = useStateApp(null);
  const [dropTarget, setDropTarget] = useStateApp(null);

  const handleDragStart = (e, id) => {
    if (!editMode) return;
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    try {e.dataTransfer.setData("text/plain", id);} catch (err) {}
  };
  const handleDragOver = (e, id) => {
    if (!editMode || !dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropTarget !== id) setDropTarget(id);
  };
  const handleDragLeave = (e, id) => {
    if (dropTarget === id) setDropTarget(null);
  };
  const handleDrop = (e, targetId) => {
    if (!editMode || !dragId) return;
    e.preventDefault();
    if (dragId === targetId) {setDragId(null);setDropTarget(null);return;}
    const next = [...layout];
    const from = next.findIndex((x) => x.id === dragId);
    const to = next.findIndex((x) => x.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setLayout(next);
    setDragId(null);
    setDropTarget(null);
  };
  const handleDragEnd = () => {setDragId(null);setDropTarget(null);};

  const resize = (id, delta) => {
    setLayout(layout.map((it) =>
    it.id === id ? { ...it, w: Math.min(3, Math.max(1, it.w + delta)) } : it
    ));
  };

  return (
    <div className={"grid " + (editMode ? "edit-mode" : "")}>
      {layout.map((item, i) => {
        const W = WIDGETS[item.id];
        if (!W) return null;
        const isDragging = dragId === item.id;
        const isDropTarget = dropTarget === item.id && dragId && dragId !== item.id;
        return (
          <div
            key={item.id}
            className={
            "lp-cell w-" + item.w + (
            isDragging ? " dragging" : "") + (
            isDropTarget ? " drop-target" : "")
            }
            style={{ "--i": i }}
            draggable={editMode}
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragOver={(e) => handleDragOver(e, item.id)}
            onDragLeave={(e) => handleDragLeave(e, item.id)}
            onDrop={(e) => handleDrop(e, item.id)}
            onDragEnd={handleDragEnd}>
            
            {W.render(tweaks)}
            {editMode &&
            <React.Fragment>
                <div className="edit-handle" title="Drag to reorder">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                    <circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" />
                    <circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" />
                    <circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" />
                  </svg>
                </div>
                <div className="edit-overlay">
                  <button
                  className="edit-chip"
                  disabled={item.w <= 1}
                  onClick={() => resize(item.id, -1)}
                  title="Narrower">
                  −</button>
                  <span className="edit-chip w-display">w<strong>{item.w}</strong>/3</span>
                  <button
                  className="edit-chip"
                  disabled={item.w >= 3}
                  onClick={() => resize(item.id, +1)}
                  title="Wider">
                  +</button>
                </div>
              </React.Fragment>
            }
          </div>);

      })}
    </div>);

}

// ---------- Recents card ----------
function RecentsCard() {
  const all = [...window.LP_DATA.apps.personal, ...window.LP_DATA.apps.offplate, ...window.LP_DATA.apps.tools];
  const recents = all.slice(0, 6);
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, #a78bfa, #4c1d95)" }}>
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M4 6h16M4 12h16M4 18h10" stroke="white" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">Recents</div>
          <div className="card-sub">
            <span>Last opened</span>
            <span className="card-sub-dot" />
            <span>{recents.length} items</span>
          </div>
        </div>
        <button className="card-action">⋯</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 4 }}>
        {recents.map((a, i) =>
        <a key={a.url} className="todo-item" href={a.url} target="_blank" rel="noopener noreferrer" style={{ borderRadius: 10 }}>
            <div className="app-icon" style={{ width: 28, height: 28, borderRadius: 8, fontSize: 14, background: `linear-gradient(140deg, ${a.color[0]}, ${a.color[1]})` }}>
              <span style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.35))" }}>{a.glyph}</span>
            </div>
            <div className="todo-text" style={{ fontSize: 12.5 }}>{a.name}</div>
            <div style={{ fontSize: 10, color: "var(--text-faint)", fontFamily: "'JetBrains Mono', monospace" }}>{["2m", "18m", "1h", "3h", "5h", "1d"][i]}</div>
          </a>
        )}
      </div>
    </div>);

}

// ---------- Edit bar (floating bottom) ----------
function EditBar({ editMode, setEditMode, resetLayout }) {
  if (!editMode) {
    return (
      <div className="edit-bar">
        <span className="edit-bar-text">Layout</span>
        <span className="edit-bar-sub">Drag to reorder · resize ±</span>
        <button className="edit-bar-btn" onClick={() => setEditMode(true)}>
          Edit layout
        </button>
      </div>);

  }
  return (
    <div className="edit-bar">
      <span className="edit-bar-text">◆ Edit mode</span>
      <span className="edit-bar-sub">Drag cards · use ± to resize (1-3 cols)</span>
      <button className="edit-bar-btn ghost" onClick={resetLayout}>Reset</button>
      <button className="edit-bar-btn" onClick={() => setEditMode(false)}>Done</button>
    </div>);

}

// ---------- Mount ----------
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<LaunchpadApp />);