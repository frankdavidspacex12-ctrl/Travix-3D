import * as THREE from 'three';

export const AU_TO_UNITS = 1000;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const J2000_JD = 2451545.0;

/**
 * Converts JS timestamp (ms since Unix epoch) to Julian Date (JD).
 */
export function timestampToJD(ms: number): number {
  return ms / 86400000 + 2440587.5;
}

/**
 * Days since J2000.0 epoch (2000-01-01 12:00:00 TT/UTC approx).
 */
export function daysSinceJ2000(ms: number): number {
  return timestampToJD(ms) - J2000_JD;
}

export interface KeplerElementsJ2000 {
  /** Semi-major axis (AU) */
  a: number;
  /** Eccentricity */
  e: number;
  /** Inclination (deg) */
  I: number;
  /** Mean longitude at J2000 (deg) */
  L0: number;
  /** Rate of mean longitude (deg/day) */
  n: number;
  /** Longitude of perihelion (deg) */
  wBar: number;
  /** Longitude of ascending node (deg) */
  Omega: number;
}

/**
 * NASA/JPL Standish J2000 Keplerian elements for the 8 planets + Comet 67P.
 * Mean motion n = 360 / orbitalPeriodDays (Sidereal).
 */
export const PLANET_ELEMENTS_J2000: Record<string, KeplerElementsJ2000> = {
  mercury: {
    a: 0.38709927,
    e: 0.20563593,
    I: 7.00497902,
    L0: 252.2503235,
    n: 4.09233445,
    wBar: 77.45779628,
    Omega: 48.33076593,
  },
  venus: {
    a: 0.72333566,
    e: 0.00677672,
    I: 3.39467605,
    L0: 181.9790995,
    n: 1.60213034,
    wBar: 131.60246718,
    Omega: 76.67984255,
  },
  earth: {
    a: 1.00000261,
    e: 0.01671123,
    I: 0.00001531,
    L0: 100.46457166,
    n: 0.9856091,
    wBar: 102.93768193,
    Omega: 0.0,
  },
  mars: {
    a: 1.52371034,
    e: 0.0933941,
    I: 1.84969142,
    L0: -4.55343205,
    n: 0.524033,
    wBar: -23.94362959,
    Omega: 49.55953891,
  },
  jupiter: {
    a: 5.202887,
    e: 0.04838624,
    I: 1.30439695,
    L0: 34.39644051,
    n: 0.08309121,
    wBar: 14.72847983,
    Omega: 100.47390909,
  },
  saturn: {
    a: 9.53667594,
    e: 0.05386179,
    I: 2.48599187,
    L0: 49.95424423,
    n: 0.03345965,
    wBar: 92.59887831,
    Omega: 113.66242448,
  },
  uranus: {
    a: 19.18916464,
    e: 0.04725744,
    I: 0.77263783,
    L0: 313.23810451,
    n: 0.01173129,
    wBar: 170.9542763,
    Omega: 74.01692503,
  },
  neptune: {
    a: 30.06992276,
    e: 0.00859048,
    I: 1.77004347,
    L0: -55.12002969,
    n: 0.00598106,
    wBar: 44.96476227,
    Omega: 131.78422574,
  },
  comet67p: {
    // 67P/Churyumov-Gerasimenko (perihelion Aug 2015 -> d = 5703, period ~2352.6 days)
    a: 3.4628,
    e: 0.64097,
    I: 7.0402,
    L0: 191.5, // Calibrated to Aug 13, 2015 perihelion
    n: 360 / 2352.6,
    wBar: 62.9,
    Omega: 50.147,
  },
  ceres: {
    a: 2.7675,
    e: 0.0758,
    I: 10.593,
    L0: 256.8,
    n: 360 / 1681.63,
    wBar: 153.9,
    Omega: 80.329,
  },
  pluto: {
    a: 39.4821,
    e: 0.24883,
    I: 17.1417,
    L0: 238.929,
    n: 360 / 90560.0,
    wBar: 224.069,
    Omega: 110.303,
  },
  eris: {
    a: 67.781,
    e: 0.44068,
    I: 44.0445,
    L0: 204.16,
    n: 360 / 204199.0,
    wBar: 187.4,
    Omega: 35.95,
  },
};

/**
 * Solves Kepler's Equation M = E - e * sin(E) via Newton-Raphson.
 */
function solveKepler(M: number, e: number): number {
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 7; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-11) break;
  }
  return E;
}

/**
 * Computes heliocentric 3D coordinates in Three.js world units (ecliptic plane = XZ).
 */
export function computeHeliocentricPosition(
  el: KeplerElementsJ2000,
  dJ2000: number,
  out: THREE.Vector3,
  scale = AU_TO_UNITS,
): THREE.Vector3 {
  const L = el.L0 + el.n * dJ2000;
  let M = (L - el.wBar) % 360;
  if (M > 180) M -= 360;
  if (M < -180) M += 360;
  const Mrad = M * DEG2RAD;

  const E = solveKepler(Mrad, el.e);
  const xOrb = el.a * (Math.cos(E) - el.e);
  const yOrb = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);

  const w = (el.wBar - el.Omega) * DEG2RAD;
  const Om = el.Omega * DEG2RAD;
  const inc = el.I * DEG2RAD;

  const cosW = Math.cos(w);
  const sinW = Math.sin(w);
  const cosOm = Math.cos(Om);
  const sinOm = Math.sin(Om);
  const cosI = Math.cos(inc);
  const sinI = Math.sin(inc);

  const xEcl =
    (cosW * cosOm - sinW * sinOm * cosI) * xOrb +
    (-sinW * cosOm - cosW * sinOm * cosI) * yOrb;
  const yEcl =
    (cosW * sinOm + sinW * cosOm * cosI) * xOrb +
    (-sinW * sinOm + cosW * cosOm * cosI) * yOrb;
  const zEcl = sinW * sinI * xOrb + cosW * sinI * yOrb;

  // Map ecliptic (+X vernal equinox, +Y 90° ecliptic lon, +Z ecliptic north) -> Three.js (+X, +Y north, -Z)
  return out.set(xEcl * scale, zEcl * scale, -yEcl * scale);
}

/**
 * Generates full closed elliptical orbit points in Three.js world space.
 */
export function sampleOrbitEllipsePoints(
  el: KeplerElementsJ2000,
  segments = 256,
  scale = AU_TO_UNITS,
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const periodDays = 360 / el.n;
  for (let i = 0; i < segments; i++) {
    const d = (i / segments) * periodDays;
    const p = new THREE.Vector3();
    computeHeliocentricPosition(el, d, p, scale);
    pts.push(p);
  }
  return pts;
}

/**
 * IAU/J2000 Sidereal Prime Meridian angles W(d) = W0 + Wdot * d (degrees).
 * Calibrates Earth's Greenwich Meridian, Mars's Airy-0 Meridian, etc. to real UTC time.
 */
const PRIME_MERIDIAN_J2000: Record<string, { w0: number; wDot: number }> = {
  sun: { w0: 84.176, wDot: 14.1844 },
  mercury: { w0: 329.5469, wDot: 6.1385025 },
  venus: { w0: 160.2, wDot: -1.4813688 }, // Retrograde
  earth: { w0: 190.147, wDot: 360.9856235 },
  mars: { w0: 176.63, wDot: 350.89198226 },
  jupiter: { w0: 284.95, wDot: 870.536 },
  saturn: { w0: 38.9, wDot: 810.7939024 },
  uranus: { w0: 203.81, wDot: -501.1600928 }, // Retrograde
  neptune: { w0: 253.18, wDot: 536.3128492 },
  comet67p: { w0: 45.0, wDot: 696.7 },
  ceres: { w0: 95.2, wDot: 952.1532 },
  pluto: { w0: 237.3, wDot: -56.3625 }, // Retrograde 6.39 days
  eris: { w0: 120.0, wDot: 333.59 },
};

/**
 * Returns Three.js mesh.rotation.y (radians) aligned so Prime Meridian (lon=0) points accurately in J2000 space.
 */
export function computeAxialRotationRad(id: string, dJ2000: number): number {
  const pm = PRIME_MERIDIAN_J2000[id];
  if (!pm) return 0;
  // Convert IAU W angle to Three.js rotation.y around +Y
  const wDeg = (pm.w0 + pm.wDot * dJ2000) % 360;
  return wDeg * DEG2RAD;
}

/**
 * Exact spherical coordinate conversion matching Three.js SphereGeometry equirectangular UV mapping.
 * lonDeg: East longitude (-180..180 or 0..360), latDeg: latitude (-90..90).
 */
export function latLonToLocalVector3(
  latDeg: number,
  lonDeg: number,
  radius: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  const lat = latDeg * DEG2RAD;
  const lonSigned = (((lonDeg + 180) % 360) + 360) % 360 - 180;
  const lon = lonSigned * DEG2RAD;

  const cosLat = Math.cos(lat);
  out.set(
    radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * cosLat * Math.sin(lon),
  );
  return out;
}

/**
 * Formats an astronomical longitude/latitude pair cleanly for telemetry display.
 */
export function formatCoordinates(latDeg: number, lonDeg: number): string {
  const latHem = latDeg >= 0 ? 'N' : 'S';
  const lonSigned = (((lonDeg + 180) % 360) + 360) % 360 - 180;
  const lonHem = lonSigned >= 0 ? 'E' : 'O';
  return `${Math.abs(latDeg).toFixed(3)}° ${latHem} · ${Math.abs(lonSigned).toFixed(3)}° ${lonHem} (${lonDeg.toFixed(2)}° E)`;
}

export function radToDeg(rad: number): number {
  return rad * RAD2DEG;
}

export interface BodyTelemetry {
  distanceAu: number;
  distanceMillionKm: number;
  orbitalSpeedKmS: number;
  lightTimeMinutes: number;
  heliocentricLonDeg: number;
  orbitalProgressPct: number;
}

const AU_KM = 149.5978707; // Million km per AU
const EARTH_MEAN_ORBIT_SPEED_KMS = 29.7847;
const LIGHT_TIME_1AU_SEC = 499.00478;
const _telemetryVec = new THREE.Vector3();

/**
 * Computes instantaneous J2000 orbital telemetry via Kepler's equation & vis-viva law.
 */
export function computeBodyTelemetry(id: string, dJ2000: number): BodyTelemetry {
  if (id === 'sun') {
    return {
      distanceAu: 0,
      distanceMillionKm: 0,
      orbitalSpeedKmS: 230.0, // Galactocentric speed around Milky Way (NASA)
      lightTimeMinutes: 0,
      heliocentricLonDeg: 0,
      orbitalProgressPct: 0,
    };
  }
  const el = PLANET_ELEMENTS_J2000[id];
  if (!el) {
    return {
      distanceAu: 0,
      distanceMillionKm: 0,
      orbitalSpeedKmS: 0,
      lightTimeMinutes: 0,
      heliocentricLonDeg: 0,
      orbitalProgressPct: 0,
    };
  }
  computeHeliocentricPosition(el, dJ2000, _telemetryVec, 1);
  const rAu = _telemetryVec.length();
  const visViva = Math.max(0, 2 / rAu - 1 / el.a);
  const orbitalSpeedKmS = EARTH_MEAN_ORBIT_SPEED_KMS * Math.sqrt(visViva);
  const distanceMillionKm = rAu * AU_KM;
  const lightTimeMinutes = (rAu * LIGHT_TIME_1AU_SEC) / 60;

  let lonDeg = Math.atan2(-_telemetryVec.z, _telemetryVec.x) * RAD2DEG;
  if (lonDeg < 0) lonDeg += 360;

  const meanAnomaly = (((el.L0 + el.n * dJ2000 - el.wBar) % 360) + 360) % 360;
  const orbitalProgressPct = (meanAnomaly / 360) * 100;

  return {
    distanceAu: rAu,
    distanceMillionKm,
    orbitalSpeedKmS,
    lightTimeMinutes,
    heliocentricLonDeg: lonDeg,
    orbitalProgressPct,
  };
}

