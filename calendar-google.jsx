// Google Calendar integration — browser OAuth via Google Identity Services.
// Reads primary calendar events for the visible month. Read-only scope.
const { useState: useStateGC, useEffect: useEffectGC, useCallback: useCallbackGC, useRef: useRefGC } = React;

const GC_TOKEN_KEY    = "lp.gcal.token.v1";       // { token, exp }
const GC_EVENTS_KEY   = "lp.gcal.events.v1";      // per-month cache: { ym, items, ts }
const GC_CACHE_TTL    = 10 * 60 * 1000;           // 10 min
const GC_SCOPE        = "https://www.googleapis.com/auth/calendar.readonly";

function gcReadToken() {
  try {
    const raw = sessionStorage.getItem(GC_TOKEN_KEY);
    if (!raw) return null;
    const { token, exp } = JSON.parse(raw);
    if (!token || !exp || Date.now() > exp) return null;
    return token;
  } catch (e) { return null; }
}
function gcWriteToken(token, expiresInSec) {
  try {
    sessionStorage.setItem(GC_TOKEN_KEY, JSON.stringify({
      token,
      exp: Date.now() + (expiresInSec || 3600) * 1000 - 60_000
    }));
  } catch (e) {}
}
function gcClearToken() {
  try { sessionStorage.removeItem(GC_TOKEN_KEY); } catch (e) {}
}

// Lazy-load Google Identity Services script (only when needed)
let gisLoadPromise = null;
function loadGIS() {
  if (window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;
  gisLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gis]');
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true; s.setAttribute("data-gis", "1");
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
  return gisLoadPromise;
}

function requestGoogleAccessToken(clientId) {
  return loadGIS().then(() => new Promise((resolve, reject) => {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      reject(new Error("Google Identity Services not available"));
      return;
    }
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GC_SCOPE,
      callback: (resp) => {
        if (resp.error) { reject(new Error(resp.error)); return; }
        gcWriteToken(resp.access_token, resp.expires_in);
        resolve(resp.access_token);
      },
      error_callback: (err) => reject(new Error(err && err.type || "auth_failed"))
    });
    tokenClient.requestAccessToken({ prompt: "" });
  }));
}

async function fetchPrimaryEvents(token, viewY, viewM) {
  const start = new Date(viewY, viewM, 1);
  const end   = new Date(viewY, viewM + 1, 1);
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", start.toISOString());
  url.searchParams.set("timeMax", end.toISOString());
  url.searchParams.set("maxResults", "250");
  const r = await fetch(url.toString(), { headers: { Authorization: "Bearer " + token } });
  if (r.status === 401) { gcClearToken(); throw new Error("auth_expired"); }
  if (!r.ok) throw new Error("calendar_fetch_failed:" + r.status);
  const json = await r.json();
  return (json.items || []).map((ev) => {
    const startObj = ev.start && (ev.start.dateTime || ev.start.date);
    const allDay = !!(ev.start && ev.start.date);
    const dt = startObj ? new Date(startObj) : null;
    return {
      id: ev.id,
      title: ev.summary || "(no title)",
      allDay,
      start: dt,
      day: dt ? dt.getDate() : null,
      time: dt && !allDay ? dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }) : null,
      htmlLink: ev.htmlLink || null
    };
  }).filter((e) => e.start);
}

// Hook the CalendarCard uses
function useGoogleCalendar(clientId, viewY, viewM) {
  const [token, setToken] = useStateGC(() => gcReadToken());
  const [events, setEvents] = useStateGC([]);
  const [status, setStatus] = useStateGC("idle"); // idle | loading | ok | needs-auth | error | no-client
  const [error, setError] = useStateGC(null);
  const mountedRef = useRefGC(true);

  useEffectGC(() => () => { mountedRef.current = false; }, []);

  const monthKey = viewY + "-" + String(viewM).padStart(2, "0");

  const loadCached = useCallbackGC(() => {
    try {
      const raw = localStorage.getItem(GC_EVENTS_KEY + ":" + monthKey);
      if (!raw) return null;
      const { items, ts } = JSON.parse(raw);
      if (Date.now() - ts > GC_CACHE_TTL) return null;
      return items.map((e) => ({ ...e, start: new Date(e.start) }));
    } catch (e) { return null; }
  }, [monthKey]);

  const writeCache = useCallbackGC((items) => {
    try {
      localStorage.setItem(GC_EVENTS_KEY + ":" + monthKey, JSON.stringify({
        ts: Date.now(),
        items: items.map((e) => ({ ...e, start: e.start ? e.start.toISOString() : null }))
      }));
    } catch (e) {}
  }, [monthKey]);

  const fetchEvents = useCallbackGC(async (tok) => {
    setStatus("loading"); setError(null);
    try {
      const items = await fetchPrimaryEvents(tok, viewY, viewM);
      if (!mountedRef.current) return;
      setEvents(items);
      setStatus("ok");
      writeCache(items);
    } catch (e) {
      if (!mountedRef.current) return;
      if (e.message === "auth_expired") {
        gcClearToken();
        setToken(null);
        setStatus("needs-auth");
      } else {
        setError(e.message);
        setStatus("error");
      }
    }
  }, [viewY, viewM, writeCache]);

  // React to month change / token presence
  useEffectGC(() => {
    if (!clientId) { setStatus("no-client"); return; }
    const cached = loadCached();
    if (cached) { setEvents(cached); setStatus("ok"); return; }
    if (!token) { setStatus("needs-auth"); return; }
    fetchEvents(token);
  }, [clientId, token, monthKey]);

  const signIn = useCallbackGC(() => {
    if (!clientId) { setStatus("no-client"); return; }
    setStatus("loading");
    requestGoogleAccessToken(clientId).then((tok) => {
      if (!mountedRef.current) return;
      setToken(tok);
      fetchEvents(tok);
    }).catch((e) => {
      if (!mountedRef.current) return;
      setError(e.message);
      setStatus("error");
    });
  }, [clientId, fetchEvents]);

  const signOut = useCallbackGC(() => {
    gcClearToken();
    setToken(null);
    setEvents([]);
    setStatus("needs-auth");
  }, []);

  const refresh = useCallbackGC(() => {
    if (!token) { signIn(); return; }
    fetchEvents(token);
  }, [token, fetchEvents, signIn]);

  return { events, status, error, signIn, signOut, refresh, hasToken: !!token };
}

window.useGoogleCalendar = useGoogleCalendar;
