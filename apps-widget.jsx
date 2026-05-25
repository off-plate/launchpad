// Apps widget v2 — drag-reorder, pin/unpin, favicons, lastOpened tracking
const { useState: useStateAW, useEffect: useEffectAW, useMemo: useMemoAW, useRef: useRefAW } = React;

const PREFS_KEY = "launchpad.apps-prefs.v1";

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { pinned: [], order: [], lastOpened: {} };
}
function savePrefs(p) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) {}
}

// Mark an app as opened — called by app launching elsewhere
window.LP_recordOpen = function (url) {
  const p = loadPrefs();
  p.lastOpened = p.lastOpened || {};
  p.lastOpened[url] = Date.now();
  savePrefs(p);
  window.dispatchEvent(new CustomEvent("lp:apps-prefs-changed"));
};

function useAppsPrefs() {
  const [prefs, setPrefs] = useStateAW(() => loadPrefs());
  useEffectAW(() => {
    const onChange = () => setPrefs(loadPrefs());
    window.addEventListener("lp:apps-prefs-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("lp:apps-prefs-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  const update = (mut) => {
    const next = mut({ ...prefs, lastOpened: { ...prefs.lastOpened } });
    savePrefs(next);
    setPrefs(next);
    window.dispatchEvent(new CustomEvent("lp:apps-prefs-changed"));
  };
  return [prefs, update];
}

function faviconFor(url) {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch (e) { return null; }
}

// ---------- Single app tile ----------
function AppTileV2({ app, pinned, onPin, editing, onDragStart, onDragOver, onDrop, isDragging, isDropTarget }) {
  const bg = `linear-gradient(140deg, ${app.color[0]} 0%, ${app.color[1]} 100%)`;

  const launch = (e) => {
    if (editing) { e.preventDefault(); return; }
    e.preventDefault();
    // Track lastOpened and dispatch open event
    window.LP_recordOpen(app.url);
    window.dispatchEvent(new CustomEvent("lp:open-app", { detail: app }));
  };

  return (
    <a
      className={"app-tile " + (editing ? "editing " : "") + (isDragging ? "dragging " : "") + (isDropTarget ? "drop-target " : "")}
      href={app.url}
      onClick={launch}
      title={app.desc}
      draggable={editing}
      onDragStart={(e) => editing && onDragStart && onDragStart(e, app.url)}
      onDragOver={(e) => editing && onDragOver && onDragOver(e, app.url)}
      onDragLeave={(e) => editing && onDragOver && onDragOver(e, null)}
      onDrop={(e) => editing && onDrop && onDrop(e, app.url)}
    >
      <div className="app-icon" style={{ background: bg }}>
        <span className="app-glyph">{app.glyph}</span>
      </div>
      <div className="app-label">{app.name}</div>
      {app.tag && !editing && <div className="app-tag">{app.tag}</div>}
      {pinned && !editing && <div className="app-pin-badge" title="Pinned">📌</div>}
      {editing && (
        <button
          className="app-pin-btn"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPin && onPin(app.url); }}
          title={pinned ? "Unpin" : "Pin to top"}
        >
          {pinned ? "★" : "☆"}
        </button>
      )}
    </a>
  );
}

// ---------- Apps card v2 ----------
function AppsCardV2({ workspace, updateWorkspaceAppSelection }) {
  const [tab, setTab] = useStateAW("all");
  const [editing, setEditing] = useStateAW(false);
  const [pickerOpen, setPickerOpen] = useStateAW(false);
  const [dragId, setDragId] = useStateAW(null);
  const [dropTarget, setDropTarget] = useStateAW(null);
  const [prefs, updatePrefs] = useAppsPrefs();

  const apps = window.LP_DATA.apps;
  const allApps = useMemoAW(
    () => [...apps.personal, ...apps.offplate, ...apps.tools],
    [apps]
  );

  // Workspace-scoped filter: if workspace defines a custom subset, restrict to it
  const wsFilter = useMemoAW(() => {
    if (!workspace || !workspace.appSelection || workspace.appSelection.mode !== "custom") return null;
    const set = new Set(workspace.appSelection.apps || []);
    return (a) => set.has(a.url);
  }, [workspace]);

  // Build the visible list for the current tab — applying workspace filter, user order and pin priority
  const list = useMemoAW(() => {
    let base;
    if (tab === "all") base = allApps;
    else if (tab === "personal") base = apps.personal;
    else if (tab === "offplate") base = apps.offplate;
    else if (tab === "tools") base = apps.tools;
    else base = [];

    if (wsFilter) base = base.filter(wsFilter);

    const orderIndex = (url) => {
      const i = prefs.order.indexOf(url);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    const isPinned = (url) => prefs.pinned.includes(url);

    return [...base].sort((a, b) => {
      const pa = isPinned(a.url) ? 0 : 1;
      const pb = isPinned(b.url) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      const oa = orderIndex(a.url);
      const ob = orderIndex(b.url);
      if (oa !== ob) return oa - ob;
      return 0;
    });
  }, [tab, allApps, apps, prefs, wsFilter]);

  const isCustomSelection = workspace && workspace.appSelection && workspace.appSelection.mode === "custom";
  const selectedCount = isCustomSelection ? (workspace.appSelection.apps || []).length : allApps.length;

  const togglePin = (url) => {
    updatePrefs((p) => {
      const has = p.pinned.includes(url);
      return { ...p, pinned: has ? p.pinned.filter((u) => u !== url) : [...p.pinned, url] };
    });
  };

  const onDragStart = (e, url) => {
    setDragId(url);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", url); } catch (err) {}
  };
  const onDragOver = (e, url) => {
    if (!dragId) return;
    if (e) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }
    if (dropTarget !== url) setDropTarget(url);
  };
  const onDrop = (e, targetUrl) => {
    if (!dragId || dragId === targetUrl) { setDragId(null); setDropTarget(null); return; }
    if (e) e.preventDefault();
    const currentOrder = list.map((a) => a.url);
    const from = currentOrder.indexOf(dragId);
    const to = currentOrder.indexOf(targetUrl);
    if (from < 0 || to < 0) { setDragId(null); setDropTarget(null); return; }
    const next = [...currentOrder];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updatePrefs((p) => ({ ...p, order: next.concat(p.order.filter((u) => !next.includes(u))) }));
    setDragId(null);
    setDropTarget(null);
  };

  return (
    <div className="card apps">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}>
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" stroke="white" strokeWidth="1.8" /></svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">Apps</div>
          <div className="card-sub">
            <span>{list.length} shown</span>
            <span className="card-sub-dot" />
            <span>{prefs.pinned.length} pinned</span>
            {isCustomSelection && (
              <React.Fragment>
                <span className="card-sub-dot" />
                <span>{selectedCount}/{allApps.length} in workspace</span>
              </React.Fragment>
            )}
          </div>
        </div>
        <div className="apps-tabs">
          <button className={"apps-tab " + (tab === "all" ? "active" : "")} onClick={() => setTab("all")}>All</button>
          <button className={"apps-tab " + (tab === "personal" ? "active" : "")} onClick={() => setTab("personal")}>Personal</button>
          <button className={"apps-tab " + (tab === "offplate" ? "active" : "")} onClick={() => setTab("offplate")}>Off-Plate</button>
          <button className={"apps-tab " + (tab === "tools" ? "active" : "")} onClick={() => setTab("tools")}>Tools</button>
        </div>
        {workspace && updateWorkspaceAppSelection && (
          <button
            className="apps-edit-btn"
            onClick={() => setPickerOpen(true)}
            title="Choose which apps appear in this workspace"
          >
            ⚙ Pick
          </button>
        )}
        <button
          className={"apps-edit-btn " + (editing ? "active" : "")}
          onClick={() => setEditing((v) => !v)}
          title={editing ? "Done arranging" : "Arrange apps"}
        >
          {editing ? "Done" : "Arrange"}
        </button>
      </div>

      <div className={"app-grid " + (editing ? "editing" : "")}>
        {list.map((a) => (
          <AppTileV2
            key={a.url}
            app={a}
            pinned={prefs.pinned.includes(a.url)}
            onPin={togglePin}
            editing={editing}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            isDragging={dragId === a.url}
            isDropTarget={dropTarget === a.url && dragId !== a.url}
          />
        ))}
        {list.length === 0 && (
          <div className="apps-empty">
            No apps in this workspace yet. Click <strong>⚙ Pick</strong> above to choose some.
          </div>
        )}
      </div>

      {editing && (
        <div className="apps-edit-help">
          Drag tiles to reorder · click ☆ to pin
        </div>
      )}

      {pickerOpen && updateWorkspaceAppSelection && (
        <AppPickerModal
          workspace={workspace}
          allApps={allApps}
          onClose={() => setPickerOpen(false)}
          onSave={(selection) => { updateWorkspaceAppSelection(selection); setPickerOpen(false); }}
        />
      )}
    </div>
  );
}

// ---------- App picker modal (per-workspace) ----------
function AppPickerModal({ workspace, allApps, onClose, onSave }) {
  const initial = workspace.appSelection || { mode: "all", apps: [] };
  const [mode, setMode] = useStateAW(initial.mode);
  const [selected, setSelected] = useStateAW(new Set(initial.apps || []));

  const toggle = (url) => {
    setSelected((s) => {
      const next = new Set(s);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  };

  const save = () => onSave({ mode, apps: Array.from(selected) });

  return (
    <div className="gallery-backdrop" onClick={onClose}>
      <div className="gallery picker" onClick={(e) => e.stopPropagation()}>
        <div className="gallery-head">
          <div>
            <div className="gallery-title">Workspace apps</div>
            <div className="gallery-sub">
              Choose which apps show in <strong>{workspace.name}</strong>
            </div>
          </div>
          <button className="gallery-close" onClick={onClose}>×</button>
        </div>

        <div className="picker-mode">
          <button className={"picker-mode-btn " + (mode === "all" ? "active" : "")} onClick={() => setMode("all")}>
            <div className="picker-mode-label">Show all apps</div>
            <div className="picker-mode-sub">Every app from data, no filtering</div>
          </button>
          <button className={"picker-mode-btn " + (mode === "custom" ? "active" : "")} onClick={() => setMode("custom")}>
            <div className="picker-mode-label">Pick a subset</div>
            <div className="picker-mode-sub">{selected.size} selected of {allApps.length}</div>
          </button>
        </div>

        {mode === "custom" && (
          <div className="picker-grid">
            {allApps.map((a) => {
              const on = selected.has(a.url);
              return (
                <button
                  key={a.url}
                  className={"picker-card " + (on ? "on" : "")}
                  onClick={() => toggle(a.url)}
                >
                  <div className="picker-icon" style={{ background: `linear-gradient(140deg, ${a.color[0]}, ${a.color[1]})` }}>
                    {a.glyph}
                  </div>
                  <div className="picker-body">
                    <div className="picker-name">{a.name}</div>
                    <div className="picker-desc">{a.desc}</div>
                  </div>
                  <div className={"picker-check " + (on ? "on" : "")}>{on ? "✓" : ""}</div>
                </button>
              );
            })}
          </div>
        )}

        <div className="picker-actions">
          {mode === "custom" && (
            <React.Fragment>
              <button className="picker-btn ghost" onClick={() => setSelected(new Set(allApps.map((a) => a.url)))}>Select all</button>
              <button className="picker-btn ghost" onClick={() => setSelected(new Set())}>Clear</button>
            </React.Fragment>
          )}
          <div style={{ flex: 1 }} />
          <button className="picker-btn ghost" onClick={onClose}>Cancel</button>
          <button className="picker-btn primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Recents card v2 (real lastOpened-based) ----------
function RecentsCardV2() {
  const [prefs] = useAppsPrefs();
  const all = useMemoAW(() => {
    const apps = window.LP_DATA.apps;
    return [...apps.personal, ...apps.offplate, ...apps.tools];
  }, []);

  const recents = useMemoAW(() => {
    const withTs = all.map((a) => ({ ...a, ts: (prefs.lastOpened && prefs.lastOpened[a.url]) || 0 }));
    return withTs
      .filter((a) => a.ts > 0)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 6);
  }, [all, prefs]);

  const empty = recents.length === 0;
  const launch = (e, app) => {
    e.preventDefault();
    window.LP_recordOpen(app.url);
    window.dispatchEvent(new CustomEvent("lp:open-app", { detail: app }));
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, #a78bfa, #4c1d95)" }}>
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M4 6h16M4 12h16M4 18h10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">Recents</div>
          <div className="card-sub">
            <span>Last opened</span>
            <span className="card-sub-dot" />
            <span>{recents.length} items</span>
          </div>
        </div>
      </div>
      {empty ? (
        <div className="recents-empty">
          Open any app from the Apps widget — your recent launches will appear here.
        </div>
      ) : (
        <div className="recents-grid">
          {recents.map((a) => (
            <a key={a.url} className="recents-row" href={a.url} onClick={(e) => launch(e, a)}>
              <div className="app-icon recents-icon" style={{ background: `linear-gradient(140deg, ${a.color[0]}, ${a.color[1]})` }}>
                <RecentsIconImage app={a} />
              </div>
              <div className="recents-text">
                <div className="recents-name">{a.name}</div>
                <div className="recents-desc">{a.desc}</div>
              </div>
              <div className="recents-when">{timeAgoCompact(a.ts)}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentsIconImage({ app }) {
  return <span style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.35))" }}>{app.glyph}</span>;
}

function timeAgoCompact(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h";
  const d = Math.floor(h / 24);
  if (d < 7) return d + "d";
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

Object.assign(window, { AppsCardV2, RecentsCardV2 });
