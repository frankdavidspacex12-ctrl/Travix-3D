// Posición real de la Estación Espacial Internacional (ISS) a partir de sus elementos orbitales (TLE).
//
// Propagador compacto sin dependencias: órbita kepleriana con las variaciones seculares por el
// achatamiento terrestre (J2) y el decaimiento por arrastre que trae el propio TLE (ṅ/2).
// Cerca de la época del TLE el punto bajo la ISS queda a unas decenas de km del valor de SGP4;
// por eso, con internet, se descarga el TLE más reciente de CelesTrak (se renueva cada pocas horas)
// y se guarda en el navegador. Sin internet se usa el último guardado o el incluido aquí.

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
const MU = 398600.4418; // km³/s²
const RE = 6378.137; // km (radio ecuatorial, el de J2)
const J2 = 1.08262668e-3;

/** TLE de respaldo (CelesTrak, época 14-nov-2026 07:16 UTC). */
const FALLBACK_TLE: [string, string] = [
  '1 25544U 98067A   26318.30312735  .00009396  00000+0  17615-3 0  9993',
  '2 25544  51.6324 277.2306 0007380  24.2289 335.9045 15.49368089595028',
];

const TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE';
const STORAGE_KEY = 'travix-iss-tle';
const REFRESH_AFTER_MS = 6 * 3600 * 1000;

interface Elements {
  epochMs: number;
  /** ṅ/2 del TLE, en rev/día² */
  nDotHalf: number;
  incl: number;
  raan0: number;
  ecc: number;
  argp0: number;
  m0: number;
  /** movimiento medio, rev/día */
  n: number;
  // derivados
  aKm: number;
  raanDot: number; // rad/día
  argpDot: number; // rad/día
  mDot: number; // rad/día
}

export interface IssSubpoint {
  latDeg: number;
  lonDeg: number;
  altKm: number;
}

function checksumOk(line: string): boolean {
  if (line.length < 69) return false;
  let sum = 0;
  for (let i = 0; i < 68; i++) {
    const c = line[i];
    if (c >= '0' && c <= '9') sum += Number(c);
    else if (c === '-') sum += 1;
  }
  return sum % 10 === Number(line[68]);
}

function parseTle(l1: string, l2: string): Elements | null {
  l1 = l1.trimEnd();
  l2 = l2.trimEnd();
  if (!l1.startsWith('1 25544') || !l2.startsWith('2 25544')) return null;
  if (!checksumOk(l1) || !checksumOk(l2)) return null;
  const yy = Number(l1.slice(18, 20));
  const day = Number(l1.slice(20, 32));
  const year = yy < 57 ? 2000 + yy : 1900 + yy;
  const epochMs = Date.UTC(year, 0, 1) + (day - 1) * 86400000;
  const nDotHalf = Number(l1.slice(33, 43));
  const incl = Number(l2.slice(8, 16)) * DEG;
  const raan0 = Number(l2.slice(17, 25)) * DEG;
  const ecc = Number(`0.${l2.slice(26, 33).trim()}`);
  const argp0 = Number(l2.slice(34, 42)) * DEG;
  const m0 = Number(l2.slice(43, 51)) * DEG;
  const n = Number(l2.slice(52, 63));
  if (![epochMs, nDotHalf, incl, raan0, ecc, argp0, m0, n].every(Number.isFinite) || n <= 0) return null;

  const nRadSec = (n * TWO_PI) / 86400;
  const aKm = Math.cbrt(MU / (nRadSec * nRadSec));
  const p = aKm * (1 - ecc * ecc);
  const nRadDay = n * TWO_PI;
  const k = 1.5 * J2 * (RE / p) ** 2 * nRadDay;
  const s2 = Math.sin(incl) ** 2;
  return {
    epochMs,
    nDotHalf,
    incl,
    raan0,
    ecc,
    argp0,
    m0,
    n,
    aKm,
    raanDot: -k * Math.cos(incl),
    argpDot: k * (2 - 2.5 * s2),
    mDot: nRadDay + k * Math.sqrt(1 - ecc * ecc) * (1 - 1.5 * s2),
  };
}

let elements: Elements = parseTle(...FALLBACK_TLE)!;

function loadStored(): void {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const { l1, l2 } = JSON.parse(raw) as { l1: string; l2: string };
    const el = parseTle(l1, l2);
    if (el && el.epochMs > elements.epochMs) elements = el;
  } catch {
    // sin almacenamiento o dato dañado: se queda el TLE incluido
  }
}

let refreshing = false;
/**
 * Descarga el TLE más reciente de CelesTrak si el actual tiene más de unas horas. Silencioso si
 * no hay internet (la app es una PWA que funciona sin conexión).
 */
export async function refreshIssElements(): Promise<void> {
  if (refreshing || typeof fetch === 'undefined') return;
  if (Date.now() - elements.epochMs < REFRESH_AFTER_MS) return;
  refreshing = true;
  try {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(TLE_URL, { signal: ctrl.signal, cache: 'no-store' });
    window.clearTimeout(timer);
    if (!res.ok) return;
    const lines = (await res.text()).split(/\r?\n/).filter((l) => /^[12] 25544/.test(l));
    if (lines.length < 2) return;
    const el = parseTle(lines[0], lines[1]);
    if (el && el.epochMs >= elements.epochMs) {
      elements = el;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ l1: lines[0], l2: lines[1] }));
      } catch {
        // sin almacenamiento: se usa solo en esta visita
      }
    }
  } catch {
    // sin conexión o bloqueado: se mantiene el TLE disponible
  } finally {
    refreshing = false;
  }
}

if (typeof window !== 'undefined') loadStored();

/** Tiempo sidéreo medio de Greenwich (rad), el mismo que usa la rotación de la Tierra en la app. */
function gmstRad(ms: number): number {
  const d = ms / 86400000 + 2440587.5 - 2451545.0;
  const deg = (280.46061837 + 360.98564736629 * d) % 360;
  return deg * DEG;
}

/** Punto de la superficie bajo la ISS (latitud/longitud geocéntricas) y su altitud, para la fecha dada. */
export function computeIssSubpoint(ms: number, out: IssSubpoint = { latDeg: 0, lonDeg: 0, altKm: 0 }): IssSubpoint {
  const el = elements;
  const t = (ms - el.epochMs) / 86400000; // días desde la época
  const raan = el.raan0 + el.raanDot * t;
  const argp = el.argp0 + el.argpDot * t;
  // Arrastre: M = M0 + ṁ·t + 2π·(ṅ/2)·t²; el semieje mayor baja con el movimiento medio
  const M = el.m0 + el.mDot * t + TWO_PI * el.nDotHalf * t * t;
  const nNow = el.n + 2 * el.nDotHalf * t;
  const a = nNow > 0 ? el.aKm * Math.pow(el.n / nNow, 2 / 3) : el.aKm;

  let E = M;
  for (let i = 0; i < 6; i++) E -= (E - el.ecc * Math.sin(E) - M) / (1 - el.ecc * Math.cos(E));
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const xp = a * (cosE - el.ecc);
  const yp = a * Math.sqrt(1 - el.ecc * el.ecc) * sinE;

  const cO = Math.cos(raan);
  const sO = Math.sin(raan);
  const cw = Math.cos(argp);
  const sw = Math.sin(argp);
  const ci = Math.cos(el.incl);
  const si = Math.sin(el.incl);
  // Plano orbital → ecuatorial (marco verdadero de la fecha, como TEME)
  const x = (cO * cw - sO * sw * ci) * xp + (-cO * sw - sO * cw * ci) * yp;
  const y = (sO * cw + cO * sw * ci) * xp + (-sO * sw + cO * cw * ci) * yp;
  const z = sw * si * xp + cw * si * yp;

  const r = Math.hypot(x, y, z);
  let lon = (Math.atan2(y, x) - gmstRad(ms)) / DEG;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  out.latDeg = Math.asin(z / r) / DEG;
  out.lonDeg = lon;
  out.altKm = r - 6371;
  return out;
}
