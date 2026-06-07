// Workspace shell — app tabs, iframe view, split view, floating Pomodoro
const { useState: useStateWS, useEffect: useEffectWS, useRef: useRefWS } = React;

// ---------- WorkspaceBar (top tabs) ----------
function WorkspaceBar({ openApps, activeView, setActiveView, closeApp, closeAll, splitMode, setSplitMode, splitWith, setSplitWith, activeWorkspace, switchWorkspace }) {
  const active = openApps.find((a) => a.url === activeView);

  const onTabClick = (url) => {
    if (splitMode && url !== activeView) {
      // In split mode, secondary click sets the right pane
      setSplitWith(url === splitWith ? null : url);
    } else {
      setActiveView(url);
    }
  };

  // Find the originating workspace for the currently active app (or fall back to current workspace)
  const sourceWsId = (active && active.fromWorkspace) || (activeWorkspace && activeWorkspace.id);
  const sourceWs = sourceWsId && switchWorkspace ? switchWorkspace.find((w) => w.id === sourceWsId) : null;

  return (
    <div className="ws-bar">
      <button
        className={"ws-home " + (activeView === "dashboard" ? "active" : "")}
        onClick={() => setActiveView("dashboard")}
        title={sourceWs ? "Back to " + sourceWs.name : "Back to dashboard"}>
        
        <div className="ws-home-mark" />
        <span className="ws-home-label">Dashboard</span>
        {sourceWs && (
          <span className="ws-home-context" title={"Active workspace: " + sourceWs.name}>
            <span className="ws-home-context-divider">/</span>
            <span className="ws-home-context-icon">{sourceWs.icon || "✦"}</span>
            <span className="ws-home-context-name">{sourceWs.name}</span>
          </span>
        )}
      </button>

      <div className="ws-tabs">
        {openApps.map((app) => {
          const isActive = activeView === app.url;
          const isSplitPartner = splitMode && splitWith === app.url;
          return (
            <button
              key={app.url}
              className={"ws-tab " + (isActive ? "active " : "") + (isSplitPartner ? "split-partner " : "")}
              onClick={() => onTabClick(app.url)}
              title={splitMode && !isActive ? "Click to show on the right side" : app.name + " · " + app.url}>
              
              <div className="ws-tab-icon" style={{ background: `linear-gradient(140deg, ${app.color[0]}, ${app.color[1]})` }}>
                {app.glyph}
              </div>
              <span className="ws-tab-name">{app.name}</span>
              {isSplitPartner && <span className="ws-tab-side">R</span>}
              <span className="ws-tab-close" onClick={(e) => {e.stopPropagation();closeApp(app.url);}} title="Close tab">×</span>
            </button>);

        })}
      </div>

      <div className="ws-bar-actions">
        {openApps.length >= 2 && activeView !== "dashboard" &&
        <button
          className={"ws-act ws-act-toggle " + (splitMode ? "on" : "")}
          onClick={() => {
            setSplitMode(!splitMode);
            if (!splitMode && !splitWith) {
              // Auto-pick the next open app as the right pane
              const others = openApps.filter((a) => a.url !== activeView);
              if (others.length) setSplitWith(others[0].url);
            }
          }}
          title={splitMode ? "Exit split view" : "Split view — show two apps side-by-side (experimental)"}>
          
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
              <rect x="3" y="5" width="8" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
              <rect x="13" y="5" width="8" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <span>{splitMode ? "Split on" : "Split"}</span>
          </button>
        }
        {active &&
        <React.Fragment>
            <a className="ws-act" href={active.url} target="_blank" rel="noopener noreferrer" title="Open in new tab">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                <path d="M14 4h6v6M10 14L20 4M19 13v6a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h6"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <button className="ws-act" onClick={() => closeApp(active.url)} title="Close current">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </React.Fragment>
        }
        {openApps.length > 1 &&
        <button className="ws-act ws-act-text" onClick={closeAll} title="Close all tabs">Close all</button>
        }
      </div>
    </div>);

}

// ---------- AppFrame (iframe container, stays mounted in background) ----------
function AppFrame({ app, active, side }) {
  const [status, setStatus] = useStateWS("loading"); // 'loading' | 'loaded' | 'blocked'
  const frameRef = useRefWS(null);

  useEffectWS(() => {
    setStatus("loading");
    const t = setTimeout(() => {
      setStatus((s) => s === "loading" ? "blocked" : s);
    }, 8000);
    return () => clearTimeout(t);
  }, [app.url]);

  const sideClass = side === "left" ? " split-left" : side === "right" ? " split-right" : "";

  return (
    <div className={"ws-frame-wrap " + (active ? "active" : "") + sideClass}>
      {side &&
      <div className="ws-frame-pill" title={app.name}>
          <span style={{ background: `linear-gradient(140deg, ${app.color[0]}, ${app.color[1]})` }}>{app.glyph}</span>
          {app.name}
        </div>
      }
      {status !== "loaded" &&
      <div className="ws-frame-state">
          {status === "loading" ?
        <React.Fragment>
              <div className="ws-frame-spinner" />
              <div className="ws-frame-msg">Loading <strong>{app.name}</strong>…</div>
            </React.Fragment> :

        <React.Fragment>
              <div className="ws-frame-icon" style={{ background: `linear-gradient(140deg, ${app.color[0]}, ${app.color[1]})` }}>
                {app.glyph}
              </div>
              <div className="ws-frame-msg"><strong>{app.name}</strong> couldn't load in-place</div>
              <div className="ws-frame-sub">The site blocks embedding. Open it in a new tab instead.</div>
              <a className="ws-frame-btn" href={app.url} target="_blank" rel="noopener noreferrer">Open in new tab ↗</a>
            </React.Fragment>
        }
        </div>
      }
      <iframe
        ref={frameRef}
        className="ws-frame"
        src={app.url}
        title={app.name}
        onLoad={() => setStatus("loaded")}
        loading="eager"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
        referrerPolicy="no-referrer-when-downgrade" />
      
    </div>);

}

Object.assign(window, { WorkspaceBar, AppFrame });