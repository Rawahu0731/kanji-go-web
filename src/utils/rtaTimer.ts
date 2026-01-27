// RTA timer utility
// Anchors start time to a trusted Tokyo server time and measures elapsed with performance.now()
type RtaStart = {
  serverTimeMs: number;
  perfStart: number;
  serverIso?: string;
};

const STORAGE_KEY = 'rta_start_v1';

async function fetchTokyoTime(timeoutMs = 5000): Promise<{serverTimeMs: number; iso: string}> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Tokyo', { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error('time fetch failed');
    const json = await res.json();
    // worldtimeapi returns datetime like "2026-01-27T12:34:56.789+09:00"
    const dt = String(json.datetime || json.utc_datetime || json.unixtime);
    let serverMs = Date.parse(dt as string);
    if (!serverMs || isNaN(serverMs)) {
      // try unixtime seconds
      if (typeof json.unixtime === 'number') serverMs = Math.floor(json.unixtime * 1000);
      else throw new Error('invalid time response');
    }
    return { serverTimeMs: serverMs, iso: new Date(serverMs).toISOString() };
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

export async function startRta(): Promise<{serverTimeMs:number; serverIso:string}> {
  try {
    const { serverTimeMs, iso } = await fetchTokyoTime();
    const perfStart = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const start: RtaStart = { serverTimeMs, perfStart, serverIso: iso };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(start)); } catch (e) {}
    return { serverTimeMs, serverIso: iso };
  } catch (e) {
    // If fetching failed, fall back to using local Date.now() as anchor but mark it as less-trustworthy
    const serverTimeMs = Date.now();
    const iso = new Date(serverTimeMs).toISOString();
    const perfStart = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const start: RtaStart = { serverTimeMs, perfStart, serverIso: iso };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(start)); } catch (err) {}
    return { serverTimeMs, serverIso: iso };
  }
}

export async function endRta(): Promise<{startIso: string; endIso: string; elapsedMs: number} | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const start: RtaStart = JSON.parse(raw) as RtaStart;
    const perfNow = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const elapsed = Math.max(0, perfNow - (start.perfStart || 0));
    const endServerMs = (start.serverTimeMs || Date.now()) + elapsed;
    const startIso = (start.serverIso) ? new Date(start.serverTimeMs).toISOString() : new Date(start.serverTimeMs).toISOString();
    const endIso = new Date(endServerMs).toISOString();
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    return { startIso, endIso, elapsedMs: Math.round(elapsed) };
  } catch (e) {
    try { localStorage.removeItem(STORAGE_KEY); } catch (err) {}
    return null;
  }
}

export function formatJstIso(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false });
  } catch (e) {
    return iso;
  }
}

export function formatElapsed(ms: number) {
  const total = Math.floor(ms);
  const msPart = total % 1000;
  const s = Math.floor(total / 1000) % 60;
  const m = Math.floor(total / 60000) % 60;
  const h = Math.floor(total / 3600000);
  const pad = (n:number, w=2) => String(n).padStart(w,'0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}.${String(msPart).padStart(3,'0')}`;
  return `${pad(m)}:${pad(s)}.${String(msPart).padStart(3,'0')}`;
}

export function clearRtaStart() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}
