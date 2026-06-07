// Launchpad — main app shell
// Features: multi-page dashboards, widget gallery, drag-and-resize bento grid,
// app workspace iframes (with split view), wallpaper picker, custom Pomodoro durations.

const { useState: useStateApp, useEffect: useEffectApp, useRef: useRefApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "midnight",
  "name": "Michael",
  "handle": "michael@launchpad.dev",
  "autoQuote": true,
  "density": "comfortable",
  "pomoFocusMin": 25,
  "pomoShortMin": 5,
  "pomoLongMin": 15,
  "wallpaperUrl": "",
  "wallpaperBlur": 12,
  "wallpaperOverlay": 60,
  "googleClientId": ""
}/*EDITMODE-END*/;

// ---------- Widget registry ----------
// Each widget declares its default size in {w, h} grid units (w 1-3, h 1-3).
const WIDGETS = {
  profile:    { label: "Profile",         render: (t)     => <ProfileCard name={t.name} handle={t.handle} />, defaultW: 1, defaultH: 1 },
  apps:       { label: "Apps",            render: (t, ws, upd) => <AppsCardV2 workspace={ws} updateWorkspaceAppSelection={upd} />, defaultW: 2, defaultH: 1 },
  calendar:   { label: "Calendar",        render: ()      => <CalendarCard />,      defaultW: 1, defaultH: 1 },
  todo:       { label: "To-do",           render: ()      => <TodoCard />,          defaultW: 1, defaultH: 1 },
  pomodoro:   { label: "Pomodoro",        render: (t)     => <PomodoroCard durationMinutes={{ focus: t.pomoFocusMin, short: t.pomoShortMin, long: t.pomoLongMin }} />, defaultW: 1, defaultH: 1 },
  quote:      { label: "Today's spark",   render: (t)     => <QuoteCard auto={t.autoQuote} />, defaultW: 1, defaultH: 1 },
  recents:    { label: "Recents",         render: ()      => <RecentsCardV2 />,     defaultW: 3, defaultH: 1 },
  weather:    { label: "Weather",         render: ()      => <WeatherCard />,       defaultW: 1, defaultH: 1 },
  github:     { label: "GitHub activity", render: ()      => <GitHubCard />,        defaultW: 2, defaultH: 1 },
  hn:         { label: "Hacker News",     render: ()      => <HackerNewsCard />,    defaultW: 1, defaultH: 1 },
  dailyimg:   { label: "Daily image",     render: ()      => <LazyMount><DailyImageCard /></LazyMount>, defaultW: 1, defaultH: 1 },
  focus:      { label: "Focus",           render: ()      => <FocusCard />,         defaultW: 2, defaultH: 2 },
  habits:     { label: "Habits",          render: ()      => <HabitsCard />,        defaultW: 2, defaultH: 1 },
  notes:      { label: "Quick notes",     render: ()      => <QuickNotesCard />,    defaultW: 1, defaultH: 1 },
  timeblocks: { label: "Time blocks",     render: ()      => <TimeBlocksCard />,    defaultW: 3, defaultH: 2 }
};

// ---------- Default workspaces ----------
const DEFAULT_WORKSPACES = [
  {
    id: "personal",
    name: "Personal",
    icon: "✦",
    layout: [
      { id: "focus",    w: 2, h: 2 },
      { id: "apps",     w: 2, h: 1 },
      { id: "calendar", w: 1, h: 1 },
      { id: "pomodoro", w: 1, h: 1 },
      { id: "quote",    w: 1, h: 1 },
      { id: "habits",   w: 2, h: 1 },
      { id: "profile",  w: 1, h: 1 },
      { id: "recents",  w: 2, h: 1 }
    ],
    appSelection: { mode: "all", apps: [] }
  },
  {
    id: "work",
    name: "Work",
    icon: "◆",
    layout: [
      { id: "focus",      w: 2, h: 2 },
      { id: "weather",    w: 1, h: 1 },
      { id: "pomodoro",   w: 1, h: 1 },
      { id: "timeblocks", w: 3, h: 2 },
      { id: "apps",       w: 2, h: 1 },
      { id: "notes",      w: 1, h: 1 },
      { id: "github",     w: 2, h: 1 },
      { id: "hn",         w: 1, h: 1 }
    ],
    appSelection: {
      mode: "custom",
      apps: [
        "https://personal-dashboard-jarvis.netlify.app/",
        "https://hodina.netlify.app/",
        "https://ace-technik.netlify.app/",
        "https://claude.ai/design",
        "https://github.com/off-plate",
        "https://off-plate.github.io/audits/"
      ]
    }
  },
  {
    id: "sidehustle",
    name: "Side hustle",
    icon: "⤴",
    layout: [
      { id: "focus",      w: 2, h: 2 },
      { id: "apps",       w: 2, h: 1 },
      { id: "pomodoro",   w: 1, h: 1 },
      { id: "timeblocks", w: 2, h: 2 },
      { id: "github",     w: 2, h: 1 },
    ],
    appSelection: {
      mode: "custom",
      apps: [
        "https://michaels-corner.netlify.app/",
        "https://marketeers.netlify.app/",
        "https://postezuj-si.netlify.app/",
        "https://off-plate.github.io/audits/",
        "https://github.com/off-plate",
        "https://off-plate.github.io/30years/"
      ]
    }
  },
  {
    id: "growth",
    name: "Personal development",
    icon: "✺",
    layout: [
      { id: "focus",      w: 2, h: 2 },
      { id: "quote",      w: 1, h: 1 },
      { id: "pomodoro",   w: 1, h: 1 },
      { id: "apps",       w: 2, h: 1 },
      { id: "habits",     w: 2, h: 1 },
      { id: "notes",      w: 1, h: 1 },
      { id: "dailyimg",   w: 1, h: 1 }
    ],
    appSelection: {
      mode: "custom",
      apps: [
        "https://lift-up.netlify.app/",
        "https://zepp-health.netlify.app/",
        "https://hodina.netlify.app/",
        "https://ace-technik.netlify.app/",
        "https://spotify-vibes.netlify.app/",
        "https://claude.ai/design"
      ]
    }
  }
];

const WORKSPACES_KEY = "launchpad.workspaces.v1";
const ACTIVE_WORKSPACE_KEY = "launchpad.active-workspace.v1";

function loadWorkspaces() {
  let loaded = null;
  try {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        loaded = parsed.map((w) => {
          // Migrate today/focuschart/heatmap → unified focus widget
          const migratedLayout = [];
          const seenFocus = new Set();
          (w.layout || []).forEach((i) => {
            const id = (i.id === "today" || i.id === "focuschart" || i.id === "heatmap") ? "focus" : i.id;
            if (id === "focus") {
              if (seenFocus.has(id)) return; // dedupe
              seenFocus.add(id);
              migratedLayout.push({ id, w: 2, h: 2 });
              return;
            }
            migratedLayout.push({ ...i, id });
          });
          return {
            ...w,
            icon: w.icon || "✦",
            appSelection: w.appSelection || { mode: "all", apps: [] },
            layout: migratedLayout
              .filter((i) => WIDGETS[i.id] && [1, 2, 3].includes(i.w))
              .map((i) => ({ ...i, h: [1, 2, 3].includes(i.h) ? i.h : 1 }))
          };
        });
      }
    }
    // Migrate from earlier v1 pages key if present
    if (!loaded) {
      const v1Pages = localStorage.getItem("launchpad.pages.v1");
      if (v1Pages) {
        const parsed = JSON.parse(v1Pages);
        if (Array.isArray(parsed)) {
          loaded = parsed.map((p) => ({
            id: p.id,
            name: p.name,
            icon: p.icon || "✦",
            layout: (p.layout || []).filter((i) => WIDGETS[i.id]),
            appSelection: { mode: "all", apps: [] }
          }));
        }
      }
    }
    // Migrate from v3 single layout if present
    if (!loaded) {
      const v3 = localStorage.getItem("launchpad.layout.v3");
      if (v3) {
        const parsed = JSON.parse(v3);
        if (Array.isArray(parsed)) {
          const personal = { ...DEFAULT_WORKSPACES[0], layout: parsed.filter((i) => WIDGETS[i.id]) };
          loaded = [personal];
        }
      }
    }
  } catch (e) {}

  if (!loaded) return JSON.parse(JSON.stringify(DEFAULT_WORKSPACES));

  // Rename legacy "Inspire" → "Personal development" if present
  loaded = loaded.map((w) => {
    if (w.id === "inspire") {
      const def = DEFAULT_WORKSPACES.find((d) => d.id === "growth");
      return { ...w, id: "growth", name: def ? def.name : "Personal development", icon: def ? def.icon : w.icon };
    }
    return w;
  });

  // Ensure every default workspace exists; append any missing in their default order
  const haveIds = new Set(loaded.map((w) => w.id));
  DEFAULT_WORKSPACES.forEach((def) => {
    if (!haveIds.has(def.id)) loaded.push(JSON.parse(JSON.stringify(def)));
  });

  return loaded;
}
function saveWorkspaces(workspaces) {
  try { localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces)); } catch (e) {}
}
function loadActiveWorkspaceId(workspaces) {
  try {
    const id = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    if (id && workspaces.find((p) => p.id === id)) return id;
  } catch (e) {}
  return workspaces[0].id;
}

// =============================================================
// Root
// =============================================================
function LaunchpadApp() {
  const askConfirm = useConfirm();
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [workspaces, setWorkspaces] = useStateApp(loadWorkspaces);
  const [activeWorkspaceId, setActiveWorkspaceId] = useStateApp(() => loadActiveWorkspaceId(loadWorkspaces()));
  const [editMode, setEditMode] = useStateApp(false);
  const [galleryOpen, setGalleryOpen] = useStateApp(false);

  // Workspace iframe state (the "app workspace" — the open-apps view)
  const [openApps, setOpenApps] = useStateApp([]);
  const [activeView, setActiveView] = useStateApp("dashboard");
  const [splitMode, setSplitMode] = useStateApp(false);
  const [splitWith, setSplitWith] = useStateApp(null);

  const activeWorkspace = workspaces.find((p) => p.id === activeWorkspaceId) || workspaces[0];

  const updateWorkspaceLayout = (id, layout) => {
    setWorkspaces((ps) => ps.map((p) => p.id === id ? { ...p, layout } : p));
  };
  const updateWorkspaceAppSelection = (selection) => {
    setWorkspaces((ps) => ps.map((p) => p.id === activeWorkspaceId ? { ...p, appSelection: selection } : p));
  };

  const openApp = (app) => {
    // Tag the opened app with the workspace it was launched from
    const tagged = { ...app, fromWorkspace: activeWorkspaceId };
    setOpenApps((prev) => {
      const existing = prev.find((a) => a.url === app.url);
      if (existing) {
        // Update its fromWorkspace if user is re-opening from a different workspace
        return prev.map((a) => a.url === app.url ? { ...a, fromWorkspace: activeWorkspaceId } : a);
      }
      return [...prev, tagged];
    });
    setActiveView(app.url);
  };
  const closeApp = (url) => {
    setOpenApps((prev) => prev.filter((a) => a.url !== url));
    setActiveView((cur) => cur === url ? "dashboard" : cur);
    if (splitWith === url) setSplitWith(null);
  };
  const closeAll = () => {
    setOpenApps([]); setActiveView("dashboard"); setSplitMode(false); setSplitWith(null);
  };

  useEffectApp(() => {
    const onOpen = (e) => openApp(e.detail);
    const onFocusPomo = () => {
      setActiveView("dashboard");
      // Switch to a workspace that has pomodoro
      const page = workspaces.find((p) => p.layout.some((i) => i.id === "pomodoro"));
      if (page) setActiveWorkspaceId(page.id);
      setTimeout(() => {
        const cell = document.querySelector('[data-widget="pomodoro"]');
        if (!cell) return;
        cell.scrollIntoView({ behavior: "smooth", block: "center" });
        cell.classList.add("pomo-focused");
        setTimeout(() => cell.classList.remove("pomo-focused"), 1500);
      }, 120);
    };
    window.addEventListener("lp:open-app", onOpen);
    window.addEventListener("lp:focus-pomo", onFocusPomo);
    return () => {
      window.removeEventListener("lp:open-app", onOpen);
      window.removeEventListener("lp:focus-pomo", onFocusPomo);
    };
  }, [workspaces]);

  useEffectApp(() => {
    document.body.setAttribute("data-theme", t.theme);
    document.body.setAttribute("data-density", t.density);
  }, [t.theme, t.density]);

  // Propagate Google Calendar Client ID to body attribute (read by CalendarCard)
  useEffectApp(() => {
    if (t.googleClientId) document.body.setAttribute("data-google-client-id", t.googleClientId);
    else document.body.removeAttribute("data-google-client-id");
  }, [t.googleClientId]);

  useEffectApp(() => { saveWorkspaces(workspaces); }, [workspaces]);
  useEffectApp(() => { try { localStorage.setItem(ACTIVE_WORKSPACE_KEY, activeWorkspaceId); } catch (e) {} }, [activeWorkspaceId]);

  // Wallpaper background
  useEffectApp(() => {
    const stage = document.querySelector(".stage");
    if (!stage) return;
    if (t.wallpaperUrl) {
      stage.style.setProperty("--wallpaper", `url("${t.wallpaperUrl.replace(/"/g, '\\"')}")`);
      stage.style.setProperty("--wallpaper-blur", t.wallpaperBlur + "px");
      stage.style.setProperty("--wallpaper-overlay", (t.wallpaperOverlay / 100));
      stage.classList.add("has-wallpaper");
    } else {
      stage.classList.remove("has-wallpaper");
    }
  }, [t.wallpaperUrl, t.wallpaperBlur, t.wallpaperOverlay]);

  // Reset current workspace layout to its default
  const resetCurrentWorkspace = () => {
    askConfirm({
      title: "Reset this workspace?",
      body: "This restores the default layout and app selection for \"" + activeWorkspace.name + "\". Your todos, Pomodoro history, notes, etc. are kept.",
      confirmLabel: "Reset"
    }).then((ok) => {
      if (!ok) return;
      const def = DEFAULT_WORKSPACES.find((p) => p.id === activeWorkspaceId);
      if (def) {
        setWorkspaces((ws) => ws.map((w) => w.id === activeWorkspaceId
          ? { ...w, layout: JSON.parse(JSON.stringify(def.layout)), appSelection: JSON.parse(JSON.stringify(def.appSelection || { mode: "all", apps: [] })) }
          : w));
      }
    });
  };
  const askReset = () => {
    askConfirm({
      title: "Reset all workspaces?",
      body: "This restores every workspace to its default layout. Your saved data (todos, Pomodoro history, notes, habits) is preserved.",
      confirmLabel: "Reset all",
      danger: true
    }).then((ok) => { if (ok) setWorkspaces(JSON.parse(JSON.stringify(DEFAULT_WORKSPACES))); });
  };

  // Workspaces CRUD
  const addWorkspace = () => {
    const id = "ws-" + Date.now();
    setWorkspaces((ps) => [...ps, { id, name: "New workspace", icon: "✦", layout: [{ id: "focus", w: 2, h: 2 }], appSelection: { mode: "all", apps: [] } }]);
    setActiveWorkspaceId(id);
    setEditMode(true);
  };
  const renameWorkspace = (id, name) => setWorkspaces((ps) => ps.map((p) => p.id === id ? { ...p, name } : p));
  const removeWorkspace = (id) => {
    if (workspaces.length <= 1) return;
    const ws = workspaces.find((w) => w.id === id);
    askConfirm({
      title: "Delete workspace?",
      body: "\"" + (ws ? ws.name : id) + "\" will be removed along with its layout. Your todos, Pomodoro history, etc. remain.",
      confirmLabel: "Delete",
      danger: true
    }).then((ok) => {
      if (!ok) return;
      setWorkspaces((ps) => ps.filter((p) => p.id !== id));
      if (activeWorkspaceId === id) setActiveWorkspaceId(workspaces.find((p) => p.id !== id).id);
    });
  };

  // Widget gallery: add/remove on current workspace
  const addWidget = (widgetId) => {
    const def = WIDGETS[widgetId];
    if (!def) return;
    updateWorkspaceLayout(activeWorkspaceId, [...activeWorkspace.layout, { id: widgetId, w: def.defaultW, h: def.defaultH || 1 }]);
  };
  const removeWidget = (widgetId) => {
    updateWorkspaceLayout(activeWorkspaceId, activeWorkspace.layout.filter((i) => i.id !== widgetId));
  };

  // Move a widget from current workspace to another
  const moveWidgetToWorkspace = (widgetId, targetWsId) => {
    const item = activeWorkspace.layout.find((i) => i.id === widgetId);
    if (!item) return;
    setWorkspaces((ws) => ws.map((w) => {
      if (w.id === activeWorkspaceId) return { ...w, layout: w.layout.filter((i) => i.id !== widgetId) };
      if (w.id === targetWsId) {
        // If target already has this widget, don't duplicate
        if (w.layout.some((i) => i.id === widgetId)) return w;
        return { ...w, layout: [...w.layout, item] };
      }
      return w;
    }));
  };

  const wallpaperPresets = [
    { name: "None",      url: "" },
    { name: "Mountains", url: "https://picsum.photos/seed/mountains/1920/1080" },
    { name: "Aurora",    url: "https://picsum.photos/seed/aurora/1920/1080" },
    { name: "City",      url: "https://picsum.photos/seed/city/1920/1080" },
    { name: "Daily",     url: "https://picsum.photos/seed/" + new Date().toISOString().slice(0,10) + "/1920/1080" }
  ];

  return (
    <div className="stage">
      {openApps.length > 0 && (
        <WorkspaceBar
          openApps={openApps}
          activeView={activeView}
          setActiveView={setActiveView}
          closeApp={closeApp}
          closeAll={closeAll}
          splitMode={splitMode}
          setSplitMode={setSplitMode}
          splitWith={splitWith}
          setSplitWith={setSplitWith}
          activeWorkspace={activeWorkspace}
          switchWorkspace={workspaces}
        />
      )}

      <div
        className={"shell " + (openApps.length > 0 ? "ws-shell-pad" : "")}
        style={{ display: activeView === "dashboard" ? "" : "none" }}
      >
        <WorkspaceTabs
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          setActiveWorkspaceId={setActiveWorkspaceId}
          editMode={editMode}
          renameWorkspace={renameWorkspace}
          removeWorkspace={removeWorkspace}
          addWorkspace={addWorkspace}
        />

        <LayoutGrid
          workspace={activeWorkspace}
          updateLayout={(layout) => updateWorkspaceLayout(activeWorkspace.id, layout)}
          editMode={editMode}
          tweaks={t}
          removeWidget={removeWidget}
          updateWorkspaceAppSelection={updateWorkspaceAppSelection}
          workspaces={workspaces}
          moveWidgetToWorkspace={moveWidgetToWorkspace}
        />

        {editMode && (
          <div className="add-widget-row">
            <button className="add-widget-btn" onClick={() => setGalleryOpen(true)}>
              <span style={{ fontSize: 16 }}>＋</span> Add widget
            </button>
          </div>
        )}
      </div>

      {/* App iframes — kept mounted in background */}
      {openApps.map((app) => {
        const visible = activeView !== "dashboard" && (
          app.url === activeView ||
          (splitMode && splitWith && app.url === splitWith)
        );
        const side = splitMode && splitWith && activeView !== "dashboard"
          ? (app.url === activeView ? "left" : app.url === splitWith ? "right" : null)
          : null;
        return (
          <AppFrame
            key={app.url}
            app={app}
            active={visible}
            side={visible ? side : null}
          />
        );
      })}

      {openApps.length > 0 && (
        <div className={activeView === "dashboard" ? "fp-wrap dashboard-active" : ""}>
          <FloatingPomo onJumpToDashboard={() => setActiveView("dashboard")} />
        </div>
      )}

      {activeView === "dashboard" && (
        <EditBar
          editMode={editMode}
          setEditMode={setEditMode}
          resetLayout={resetCurrentWorkspace}
          openGallery={() => setGalleryOpen(true)}
        />
      )}

      {galleryOpen && (
        <WidgetGallery
          workspace={activeWorkspace}
          allWidgets={WIDGETS}
          addWidget={(id) => { addWidget(id); }}
          removeWidget={removeWidget}
          onClose={() => setGalleryOpen(false)}
        />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Layout">
          <TweakButton label={editMode ? "Exit edit mode" : "Edit layout"} onClick={() => setEditMode((v) => !v)} />
          <TweakButton label="Open widget gallery"  onClick={() => setGalleryOpen(true)} />
          <TweakButton label="Reset current workspace" onClick={resetCurrentWorkspace} />
          <TweakButton label="Reset ALL workspaces" onClick={askReset} />
        </TweakSection>

        <TweakSection label="Theme">
          <TweakSelect
            label="Palette"
            value={t.theme}
            onChange={(v) => setTweak("theme", v)}
            options={[
              { label: "Midnight (warm dark)", value: "midnight" },
              { label: "Aurora (cool teal)",   value: "aurora" },
              { label: "Sunset (warm coral)",  value: "sunset" },
              { label: "Forest (green dark)",  value: "forest" }
            ]}
          />
        </TweakSection>

        <TweakSection label="Wallpaper">
          <TweakSelect
            label="Preset"
            value={wallpaperPresets.find((w) => w.url === t.wallpaperUrl) ? t.wallpaperUrl : ""}
            onChange={(v) => setTweak("wallpaperUrl", v)}
            options={wallpaperPresets.map((w) => ({ label: w.name, value: w.url }))}
          />
          <TweakText label="Custom image URL" value={t.wallpaperUrl} onChange={(v) => setTweak("wallpaperUrl", v)} />
          {t.wallpaperUrl && (
            <React.Fragment>
              <TweakSlider label="Blur" min={0} max={40} step={1} value={t.wallpaperBlur} onChange={(v) => setTweak("wallpaperBlur", v)} />
              <TweakSlider label="Overlay darkness" min={0} max={100} step={1} value={t.wallpaperOverlay} onChange={(v) => setTweak("wallpaperOverlay", v)} />
            </React.Fragment>
          )}
        </TweakSection>

        <TweakSection label="Google Calendar">
          <TweakText label="OAuth Client ID" value={t.googleClientId} onChange={(v) => setTweak("googleClientId", v)} />
          <div style={{ fontSize: 11, color: "var(--text-faint)", padding: "4px 10px 8px", lineHeight: 1.4 }}>
            Create a Web OAuth client in Google Cloud Console (APIs &amp; Services → Credentials), add this site's origin to authorised JavaScript origins, paste the Client ID here. Scope is read-only.
          </div>
        </TweakSection>

        <TweakSection label="Pomodoro durations">
          <TweakSlider label="Focus (min)"       min={5}  max={90} step={1} value={t.pomoFocusMin} onChange={(v) => setTweak("pomoFocusMin", v)} />
          <TweakSlider label="Short break (min)" min={1}  max={20} step={1} value={t.pomoShortMin} onChange={(v) => setTweak("pomoShortMin", v)} />
          <TweakSlider label="Long break (min)"  min={5}  max={45} step={1} value={t.pomoLongMin}  onChange={(v) => setTweak("pomoLongMin", v)} />
        </TweakSection>

        <TweakSection label="Identity">
          <TweakText label="Display name" value={t.name} onChange={(v) => setTweak("name", v)} />
          <TweakText label="Handle / email" value={t.handle} onChange={(v) => setTweak("handle", v)} />
        </TweakSection>

        <TweakSection label="Widgets">
          <TweakToggle label="Auto-rotate quotes" value={t.autoQuote} onChange={(v) => setTweak("autoQuote", v)} />
        </TweakSection>
      </TweaksPanel>
    </div>);
}

// =============================================================
// Workspace tabs
// =============================================================
function WorkspaceTabs({ workspaces, activeWorkspaceId, setActiveWorkspaceId, editMode, renameWorkspace, removeWorkspace, addWorkspace }) {
  const [editingId, setEditingId] = useStateApp(null);
  return (
    <div className="ws-tabs-row">
      <div className="ws-tabs-label">Workspaces</div>
      <div className="ws-tabs-list">
        {workspaces.map((p, idx) => {
          const active = p.id === activeWorkspaceId;
          return (
            <div key={p.id} className={"ws-tab-item " + (active ? "active " : "") + (editMode ? "editing " : "")}>
              {editingId === p.id ? (
                <input
                  className="ws-tab-input"
                  value={p.name}
                  autoFocus
                  onChange={(e) => renameWorkspace(p.id, e.target.value)}
                  onBlur={() => setEditingId(null)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingId(null); }}
                />
              ) : (
                <button
                  className="ws-tab-pill"
                  onClick={() => setActiveWorkspaceId(p.id)}
                  onDoubleClick={() => editMode && setEditingId(p.id)}
                  title={"Switch to " + p.name}
                >
                  <span className="ws-tab-pill-icon">{p.icon || "✦"}</span>
                  <span className="ws-tab-pill-name">{p.name}</span>
                </button>
              )}
              {editMode && (
                <React.Fragment>
                  <button className="ws-tab-edit" onClick={() => setEditingId(p.id)} title="Rename">✎</button>
                  {workspaces.length > 1 && (
                    <button
                      className="ws-tab-del"
                      onClick={() => removeWorkspace(p.id)}
                      title="Delete workspace"
                    >×</button>
                  )}
                </React.Fragment>
              )}
            </div>
          );
        })}
        {editMode && (
          <button className="ws-tab-add" onClick={addWorkspace} title="New workspace">＋ Workspace</button>
        )}
      </div>
    </div>
  );
}

// =============================================================
// Layout grid (drag + resize + remove)
// =============================================================
function LayoutGrid({ workspace, updateLayout, editMode, tweaks, removeWidget, updateWorkspaceAppSelection, workspaces, moveWidgetToWorkspace }) {
  const layout = workspace.layout;
  const [ctxMenu, setCtxMenu] = useStateApp(null);

  const resize = (id, deltaW) => {
    updateLayout(layout.map((it) =>
      it.id === id ? { ...it, w: Math.min(3, Math.max(1, it.w + deltaW)) } : it
    ));
  };
  const resizeH = (id, deltaH) => {
    updateLayout(layout.map((it) =>
      it.id === id ? { ...it, h: Math.min(3, Math.max(1, (it.h || 1) + deltaH)) } : it
    ));
  };
  const setSize = (id, w, h) => {
    updateLayout(layout.map((it) =>
      it.id === id ? { ...it, w: Math.min(3, Math.max(1, w)), h: Math.min(3, Math.max(1, h)) } : it
    ));
  };

  // Pointer-based reorder (touch + mouse). Drag the handle, hit-test the cell under the pointer.
  const reorderTo = (fromId, toId) => {
    if (fromId === toId) return;
    const next = [...layout];
    const from = next.findIndex((x) => x.id === fromId);
    const to = next.findIndex((x) => x.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updateLayout(next);
  };
  const reorder = usePointerReorder({
    items: layout,
    getId: (i) => i.id,
    selector: "[data-widget]",
    getCellId: (el) => el.getAttribute("data-widget"),
    onReorder: reorderTo
  });

  const openCtxMenu = (e, item) => {
    e.preventDefault();
    const def = WIDGETS[item.id];
    const otherWorkspaces = (workspaces || []).filter((w) => w.id !== workspace.id);
    setCtxMenu({
      x: e.clientX,
      y: e.clientY,
      item,
      items: [
        { label: "Width 1×",  icon: "—",  onClick: () => setSize(item.id, 1, item.h || 1), disabled: item.w === 1 },
        { label: "Width 2×",  icon: "——", onClick: () => setSize(item.id, 2, item.h || 1), disabled: item.w === 2 },
        { label: "Width 3×",  icon: "———",onClick: () => setSize(item.id, 3, item.h || 1), disabled: item.w === 3 },
        { separator: true },
        { label: "Height 1×", icon: "│",   onClick: () => setSize(item.id, item.w, 1), disabled: (item.h || 1) === 1 },
        { label: "Height 2×", icon: "││",  onClick: () => setSize(item.id, item.w, 2), disabled: (item.h || 1) === 2 },
        { label: "Height 3×", icon: "│││", onClick: () => setSize(item.id, item.w, 3), disabled: (item.h || 1) === 3 },
        { separator: true },
        ...otherWorkspaces.map((w) => ({
          label: "Move to " + w.name,
          icon: w.icon || "✦",
          onClick: () => moveWidgetToWorkspace && moveWidgetToWorkspace(item.id, w.id)
        })),
        ...(otherWorkspaces.length ? [{ separator: true }] : []),
        { label: "Remove widget", icon: "×", danger: true, onClick: () => removeWidget(item.id) }
      ]
    });
  };

  if (layout.length === 0) {
    return (
      <div className="grid">
        <div className="empty-page">
          <div className="empty-page-title">This workspace is empty</div>
          <div className="empty-page-sub">Open the Tweaks panel → Layout → Widget gallery to add some.</div>
        </div>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className={"grid " + (editMode ? "edit-mode" : "")}>
        {layout.map((item, i) => {
          const W = WIDGETS[item.id];
          if (!W) return null;
          const isDragging = reorder.dragId === item.id;
          const isDropTarget = reorder.dropTargetId === item.id && reorder.dragId && reorder.dragId !== item.id;
          const h = item.h || 1;
          return (
            <div
              key={item.id}
              data-widget={item.id}
              className={
                "lp-cell w-" + item.w + " h-" + h +
                (isDragging ? " dragging" : "") +
                (isDropTarget ? " drop-target" : "")
              }
              style={{ "--i": i, gridRow: h > 1 ? `span ${h}` : undefined }}
              onContextMenu={(e) => openCtxMenu(e, item)}
            >
              <WidgetErrorBoundary>{W.render(tweaks, workspace, updateWorkspaceAppSelection)}</WidgetErrorBoundary>
              {editMode && (
                <React.Fragment>
                  <div
                    className="edit-handle"
                    title="Drag to reorder"
                    onPointerDown={(e) => reorder.onPointerDown(e, item.id)}
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                      <circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" />
                      <circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" />
                      <circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" />
                    </svg>
                  </div>
                  <div className="edit-overlay">
                    <button className="edit-chip" disabled={item.w <= 1} onClick={() => resize(item.id, -1)} title="Narrower">−</button>
                    <span className="edit-chip w-display">w<strong>{item.w}</strong>/3</span>
                    <button className="edit-chip" disabled={item.w >= 3} onClick={() => resize(item.id, +1)} title="Wider">+</button>
                    <span className="edit-chip-spacer" />
                    <button className="edit-chip" disabled={h <= 1} onClick={() => resizeH(item.id, -1)} title="Shorter">↑</button>
                    <span className="edit-chip w-display">h<strong>{h}</strong>/3</span>
                    <button className="edit-chip" disabled={h >= 3} onClick={() => resizeH(item.id, +1)} title="Taller">↓</button>
                    <span className="edit-chip-spacer" />
                    <button className="edit-chip edit-chip-del" onClick={() => removeWidget(item.id)} title="Remove">×</button>
                  </div>
                </React.Fragment>
              )}
            </div>
          );
        })}
      </div>
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxMenu.items}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </React.Fragment>
  );
}

// =============================================================
// Widget gallery
// =============================================================
function WidgetGallery({ workspace, allWidgets, addWidget, removeWidget, onClose }) {
  const presentIds = new Set(workspace.layout.map((i) => i.id));
  return (
    <div className="gallery-backdrop" onClick={onClose}>
      <div className="gallery" onClick={(e) => e.stopPropagation()}>
        <div className="gallery-head">
          <div>
            <div className="gallery-title">Widget gallery</div>
            <div className="gallery-sub">Click to add or remove on <strong>{workspace.name}</strong></div>
          </div>
          <button className="gallery-close" onClick={onClose}>×</button>
        </div>
        <div className="gallery-grid">
          {Object.entries(allWidgets).map(([id, w]) => {
            const present = presentIds.has(id);
            return (
              <button
                key={id}
                className={"gallery-card " + (present ? "present" : "")}
                onClick={() => present ? removeWidget(id) : addWidget(id)}
              >
                <div className="gallery-card-glyph">{galleryGlyph(id)}</div>
                <div className="gallery-card-name">{w.label}</div>
                <div className="gallery-card-meta">
                  {present ? "On workspace · click to remove" : `Add (${w.defaultW}×1)`}
                </div>
                <div className={"gallery-card-pill " + (present ? "on" : "")}>
                  {present ? "✓ Added" : "+ Add"}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function galleryGlyph(id) {
  const map = {
    profile: "👤", apps: "▦", calendar: "📅", todo: "✓", pomodoro: "⏱",
    quote: "❝", recents: "↻", weather: "☁",
    github: "</>", hn: "Y", dailyimg: "🖼", focus: "◎",
    habits: "✓", notes: "✎", timeblocks: "▭"
  };
  return map[id] || "✦";
}

// =============================================================
// Customize dock — minimal pill that opens the unified Tweaks panel
// =============================================================
function EditBar({ editMode, setEditMode, resetLayout, openGallery }) {
  const openTweaks = () => {
    window.parent.postMessage({ type: "__activate_edit_mode" }, "*");
    window.dispatchEvent(new MessageEvent("message", { data: { type: "__activate_edit_mode" } }));
  };

  return (
    <div className={"customize-dock " + (editMode ? "editing" : "")}>
      {editMode ? (
        <div className="customize-edit-row">
          <span className="customize-edit-tag">◆ Edit mode</span>
          <span className="customize-edit-hint">Drag the ⋮ handle • right-click for more</span>
          <button className="customize-pill ghost" onClick={openGallery}>＋ Widgets</button>
          <button className="customize-pill ghost" onClick={resetLayout}>Reset</button>
          <button className="customize-pill primary" onClick={() => setEditMode(false)}>Done</button>
        </div>
      ) : (
        <button
          className="customize-pill"
          onClick={openTweaks}
          title="Customize — theme, layout, Pomodoro, identity"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true">
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <span>Customize</span>
        </button>
      )}
    </div>
  );
}


// =============================================================
// Error boundary — contains widget crashes
// =============================================================
class WidgetErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("Widget crashed:", info); }
  render() {
    if (this.state.error) {
      return (
        <div className="card widget-error">
          <div className="widget-error-title">Widget crashed</div>
          <div className="widget-error-msg">{String(this.state.error.message || this.state.error)}</div>
          <button className="widget-error-btn" onClick={() => this.setState({ error: null })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// =============================================================
// Mount
// =============================================================
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ConfirmProvider><LaunchpadApp /></ConfirmProvider>);
