// Live-data widgets: Weather, GitHub, Hacker News, Daily Image, Focus Chart
const { useState: useStateLW, useEffect: useEffectLW, useMemo: useMemoLW } = React;

// ============================================================
// Generic helpers
// ============================================================
function useCached(key, fetcher, ttlMs = 15 * 60 * 1000) {
  const [data, setData] = useStateLW(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const { value, ts } = JSON.parse(raw);
      if (Date.now() - ts > ttlMs) return null;
      return value;
    } catch (e) {return null;}
  });
  const [status, setStatus] = useStateLW(data ? "ok" : "loading");

  useEffectLW(() => {
    let alive = true;
    if (!data) {
      setStatus("loading");
      fetcher().
      then((value) => {
        if (!alive) return;
        setData(value);
        setStatus("ok");
        try {localStorage.setItem(key, JSON.stringify({ value, ts: Date.now() }));} catch (e) {}
      }).
      catch(() => {
        if (!alive) return;
        setStatus("error");
      });
    }
    return () => {alive = false;};
    // eslint-disable-next-line
  }, []);

  const refresh = () => {
    setStatus("loading");
    fetcher().
    then((value) => {
      setData(value);
      setStatus("ok");
      try {localStorage.setItem(key, JSON.stringify({ value, ts: Date.now() }));} catch (e) {}
    }).
    catch(() => setStatus("error"));
  };

  return { data, status, refresh };
}

function CardSkeleton({ rows = 3 }) {
  return (
    <div className="lw-skel">
      {Array.from({ length: rows }).map((_, i) =>
      <div key={i} className="lw-skel-row" style={{ width: 60 + Math.random() * 40 + "%" }} />
      )}
    </div>);

}

function CardError({ msg = "Couldn't load", onRetry }) {
  return (
    <div className="lw-err">
      <div className="lw-err-msg">{msg}</div>
      {onRetry && <button className="lw-err-btn" onClick={onRetry}>Retry</button>}
    </div>);

}

// ============================================================
// Weather (Open-Meteo, no API key)
// ============================================================
function WeatherCard() {
  // Prague lat/lon
  const LAT = 50.0755,LON = 14.4378;
  const { data, status, refresh } = useCached(
    "lp.weather.v1",
    async () => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset` +
      `&forecast_days=4&timezone=auto`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("weather");
      return await r.json();
    },
    30 * 60 * 1000
  );

  return (
    <div className="card weather-card">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, #38bdf8, #1e3a8a)" }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
            <path d="M7 17h10a4 4 0 100-8 6 6 0 00-11.7 1.5A4 4 0 007 17z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">Weather</div>
          <div className="card-sub">
            <span>Prague</span>
            <span className="card-sub-dot" />
            <span>{status === "ok" ? "live" : status}</span>
          </div>
        </div>
        <button className="card-action" onClick={refresh} title="Refresh">↻</button>
      </div>

      {status === "loading" && <CardSkeleton rows={3} />}
      {status === "error" && <CardError msg="Weather service unreachable" onRetry={refresh} />}
      {status === "ok" && data &&
      <React.Fragment>
          <div className="wx-now">
            <div className="wx-icon">{wxEmoji(data.current.weather_code)}</div>
            <div className="wx-temp-wrap">
              <div className="wx-temp">{Math.round(data.current.temperature_2m)}°</div>
              <div className="wx-desc">{wxLabel(data.current.weather_code)}</div>
              <div className="wx-meta">
                Feels {Math.round(data.current.apparent_temperature)}° ·
                Wind {Math.round(data.current.wind_speed_10m)} km/h ·
                {data.current.relative_humidity_2m}% RH
              </div>
            </div>
          </div>
          <div className="wx-forecast">
            {data.daily.time.slice(0, 4).map((d, i) =>
          <div className="wx-day" key={d}>
                <div className="wx-day-name">{i === 0 ? "Today" : new Date(d).toLocaleDateString(undefined, { weekday: "short" })}</div>
                <div className="wx-day-icon">{wxEmoji(data.daily.weather_code[i])}</div>
                <div className="wx-day-temps">
                  <span className="wx-day-hi">{Math.round(data.daily.temperature_2m_max[i])}°</span>
                  <span className="wx-day-lo">{Math.round(data.daily.temperature_2m_min[i])}°</span>
                </div>
              </div>
          )}
          </div>
        </React.Fragment>
      }
    </div>);

}

function wxEmoji(code) {
  if (code === 0) return "☀";
  if (code >= 1 && code <= 3) return "⛅";
  if (code >= 45 && code <= 48) return "🌫";
  if (code >= 51 && code <= 67) return "🌧";
  if (code >= 71 && code <= 77) return "❄";
  if (code >= 80 && code <= 82) return "🌦";
  if (code >= 95) return "⛈";
  return "☁";
}
function wxLabel(code) {
  if (code === 0) return "Clear";
  if (code >= 1 && code <= 3) return "Partly cloudy";
  if (code >= 45 && code <= 48) return "Foggy";
  if (code >= 51 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

// ============================================================
// GitHub activity (off-plate org)
// ============================================================
function GitHubCard() {
  const { data, status, refresh } = useCached(
    "lp.github.v1",
    async () => {
      const r = await fetch("https://api.github.com/orgs/off-plate/events/public?per_page=12");
      if (!r.ok) throw new Error("github");
      return await r.json();
    },
    10 * 60 * 1000
  );

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, #6366f1, #1e1b4b)" }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
            <path d="M12 .5C5.6.5.5 5.6.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2.1c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2.9-.3 1.9-.4 2.9-.4s2 .1 2.9.4c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.7.8 1.2 1.9 1.2 3.2 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.6 18.4.5 12 .5z" />
          </svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">GitHub · off-plate</div>
          <div className="card-sub">
            <span>{data ? data.length + " events" : "Recent activity"}</span>
            <span className="card-sub-dot" />
            <span>{status}</span>
          </div>
        </div>
        <a className="card-action" href="https://github.com/off-plate" target="_blank" rel="noopener noreferrer" title="Open org">↗</a>
      </div>

      {status === "loading" && <CardSkeleton rows={4} />}
      {status === "error" && <CardError msg="GitHub API rate-limited or unreachable" onRetry={refresh} />}
      {status === "ok" && data &&
      <div className="gh-list">
          {data.slice(0, 6).map((e) =>
        <a key={e.id} className="gh-row" href={`https://github.com/${e.repo.name}`} target="_blank" rel="noopener noreferrer">
              <div className={"gh-type p-" + ghTypeKey(e.type)}>{ghTypeIcon(e.type)}</div>
              <div className="gh-main">
                <div className="gh-text">
                  <span className="gh-actor">{e.actor.login}</span>
                  {" " + ghTypeLabel(e.type) + " "}
                  <span className="gh-repo">{e.repo.name.replace("off-plate/", "")}</span>
                </div>
                {ghDetail(e) && <div className="gh-detail">{ghDetail(e)}</div>}
              </div>
              <div className="gh-when">{timeAgoShort(new Date(e.created_at).getTime())}</div>
            </a>
        )}
        </div>
      }
    </div>);

}

function ghTypeKey(t) {
  if (t === "PushEvent") return "push";
  if (t === "PullRequestEvent") return "pr";
  if (t === "IssuesEvent") return "issue";
  if (t === "CreateEvent") return "create";
  if (t === "ForkEvent") return "fork";
  if (t === "WatchEvent") return "star";
  return "other";
}
function ghTypeIcon(t) {
  if (t === "PushEvent") return "→";
  if (t === "PullRequestEvent") return "⇆";
  if (t === "IssuesEvent") return "!";
  if (t === "CreateEvent") return "+";
  if (t === "ForkEvent") return "⑂";
  if (t === "WatchEvent") return "★";
  return "•";
}
function ghTypeLabel(t) {
  if (t === "PushEvent") return "pushed to";
  if (t === "PullRequestEvent") return "PR on";
  if (t === "IssuesEvent") return "issue on";
  if (t === "CreateEvent") return "created";
  if (t === "ForkEvent") return "forked";
  if (t === "WatchEvent") return "starred";
  return "event on";
}
function ghDetail(e) {
  if (e.type === "PushEvent" && e.payload && e.payload.commits && e.payload.commits.length) {
    return e.payload.commits[0].message.split("\n")[0].slice(0, 80);
  }
  if (e.type === "PullRequestEvent" && e.payload && e.payload.pull_request) {
    return "#" + e.payload.pull_request.number + " · " + e.payload.pull_request.title.slice(0, 70);
  }
  if (e.type === "IssuesEvent" && e.payload && e.payload.issue) {
    return "#" + e.payload.issue.number + " · " + e.payload.issue.title.slice(0, 70);
  }
  return null;
}

// ============================================================
// Hacker News (Algolia, no key)
// ============================================================
function HackerNewsCard() {
  const { data, status, refresh } = useCached(
    "lp.hn.v1",
    async () => {
      const r = await fetch("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=12");
      if (!r.ok) throw new Error("hn");
      const j = await r.json();
      return j.hits;
    },
    15 * 60 * 1000
  );

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, #f97316, #7c2d12)" }}>
          <span style={{ color: "white", fontWeight: 800, fontSize: 11, letterSpacing: "-0.04em" }}>HN</span>
        </div>
        <div className="card-title-block">
          <div className="card-title">Hacker News</div>
          <div className="card-sub">
            <span>Front page</span>
            <span className="card-sub-dot" />
            <span>{status}</span>
          </div>
        </div>
        <button className="card-action" onClick={refresh} title="Refresh">↻</button>
      </div>

      {status === "loading" && <CardSkeleton rows={5} />}
      {status === "error" && <CardError msg="HN unreachable" onRetry={refresh} />}
      {status === "ok" && data &&
      <div className="hn-list">
          {data.slice(0, 7).map((h) =>
        <a
          key={h.objectID}
          className="hn-row"
          href={h.url || `https://news.ycombinator.com/item?id=${h.objectID}`}
          target="_blank"
          rel="noopener noreferrer">
          
              <div className="hn-pts">{h.points || 0}</div>
              <div className="hn-main">
                <div className="hn-title">{h.title}</div>
                <div className="hn-meta">
                  {h.author && <span>by {h.author}</span>}
                  {h.url && <span> · {hostOf(h.url)}</span>}
                  <span> · {h.num_comments || 0} comments</span>
                </div>
              </div>
            </a>
        )}
        </div>
      }
    </div>);

}

function hostOf(url) {
  try {return new URL(url).host.replace(/^www\./, "");} catch (e) {return "";}
}

// ============================================================
// Daily Image (Picsum — deterministic per day)
// ============================================================
function DailyImageCard() {
  const today = new Date().toISOString().slice(0, 10);
  const seed = today;
  const src = `https://picsum.photos/seed/${seed}/1200/800`;
  const [loaded, setLoaded] = useStateLW(false);

  return (
    <div className="card di-card">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, #ec4899, #831843)" }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="white" strokeWidth="1.6" /><circle cx="9" cy="11" r="2" stroke="white" strokeWidth="1.6" /><path d="M3 17l5-5 5 5 3-3 5 5" stroke="white" strokeWidth="1.6" strokeLinejoin="round" /></svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">Daily image</div>
          <div className="card-sub">
            <span>via picsum.photos</span>
            <span className="card-sub-dot" />
            <span>{today}</span>
          </div>
        </div>
      </div>
      <div className="di-frame">
        {!loaded && <div className="di-loading">Loading…</div>}
        <img
          className="di-img"
          src={src}
          alt={"Daily image " + today}
          onLoad={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0 }} />
        
        <div className="di-overlay">
          <div className="di-cap">A new image, every day.</div>
          <a className="di-link" href={src} target="_blank" rel="noopener noreferrer">View original ↗</a>
        </div>
      </div>
    </div>);

}

// ============================================================
// Focus chart (last 14 days from Pomodoro history)
// ============================================================
function FocusChartCard() {
  const [tick, setTick] = useStateLW(0);
  useEffectLW(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    const onSync = () => setTick((n) => n + 1);
    window.addEventListener("lp:pomo-sync", onSync);
    return () => {clearInterval(id);window.removeEventListener("lp:pomo-sync", onSync);};
  }, []);

  const days = useMemoLW(() => {
    let pomo = null;
    try {pomo = JSON.parse(localStorage.getItem("launchpad.pomo.v1"));} catch (e) {}
    const history = pomo && pomo.history || [];
    const out = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const start = d.getTime();
      const end = start + 24 * 60 * 60 * 1000;
      const focusSeconds = history.
      filter((h) => h.phase === "focus" && h.ts >= start && h.ts < end).
      reduce((s, h) => s + h.duration, 0);
      out.push({
        date: d,
        minutes: Math.round(focusSeconds / 60),
        label: d.toLocaleDateString(undefined, { weekday: "short" })[0]
      });
    }
    return out;
    // eslint-disable-next-line
  }, [tick]);

  const max = Math.max(25, ...days.map((d) => d.minutes));
  const total = days.reduce((s, d) => s + d.minutes, 0);
  const todayMin = days[days.length - 1].minutes;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-header-glyph" style={{ background: "linear-gradient(135deg, #f97316, #b91c1c)" }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none"><path d="M4 19V5M4 19h16M7 16l3-4 3 2 5-6" stroke="white" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" /></svg>
        </div>
        <div className="card-title-block">
          <div className="card-title">Focus chart</div>
          <div className="card-sub">
            <span>{total} min · 14 days</span>
            <span className="card-sub-dot" />
            <span>{todayMin} min today</span>
          </div>
        </div>
      </div>

      <div className="fc-bars">
        {days.map((d, i) => {
          const h = d.minutes / max;
          const isToday = i === days.length - 1;
          return (
            <div className="fc-col" key={i} title={d.date.toLocaleDateString() + " — " + d.minutes + " min focused"}>
              <div className="fc-bar-wrap">
                <div
                  className={"fc-bar " + (isToday ? "today" : "")}
                  style={{ height: Math.max(2, h * 100) + "%" }} />
                
              </div>
              <div className={"fc-day " + (isToday ? "today" : "")}>{d.label}</div>
            </div>);

        })}
      </div>

      <div className="fc-footer">
        <div>Best day: {Math.max(...days.map((d) => d.minutes))} min</div>
        <div>Avg: {Math.round(total / 14)} min/day</div>
      </div>
    </div>);

}

function timeAgoShort(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return s + "s";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h";
  const d = Math.floor(h / 24);
  if (d < 7) return d + "d";
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

Object.assign(window, {
  WeatherCard, GitHubCard, HackerNewsCard, DailyImageCard, FocusChartCard
});