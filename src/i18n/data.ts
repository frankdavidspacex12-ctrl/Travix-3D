// Cambia el idioma de los DATOS en su sitio (misiones, notas, nombres de planetas y lunas,
// métodos de aterrizaje) y guarda el español original para poder volver. Así cada componente y
// el motor 3D leen el idioma actual sin cambios en cada lugar donde se muestran.
import { ABANDONED_MISSIONS } from '../data/abandonedMissionsData';
import { LEFT_BEHIND_NOTES } from '../data/leftBehindNotes';
import { CELESTIAL_BODIES, DEEP_SPACE_TARGETS } from '../data/solarSystemData';
import { LANDING_BY_CRAFT } from '../data/landingMethods';
import { MISSIONS_EN } from './missionsEn';
import { NOTES_EN, sourceLabelEn } from './notesEn';
import { LANDING_EN } from './landingEn';
import { BODIES_EN, DEEP_SPACE_EN } from './bodiesEn';
import { getLang, subscribeLang, type Lang } from './index';

const originals = new WeakMap<object, Record<string, unknown>>();

/** Pone en `obj` los campos de `en` (inglés) o restaura los originales (español). */
function swap(obj: object, en: Record<string, unknown> | undefined, lang: Lang): void {
  const target = obj as Record<string, unknown>;
  if (!en) return;
  if (!originals.has(obj)) {
    const orig: Record<string, unknown> = {};
    for (const k of Object.keys(en)) orig[k] = target[k];
    originals.set(obj, orig);
  }
  const orig = originals.get(obj)!;
  for (const k of Object.keys(en)) {
    if (!(k in orig)) orig[k] = target[k];
    target[k] = lang === 'en' ? en[k] : orig[k];
  }
}

const CATEGORY_EN: Record<string, string> = { Satélite: 'Satellite', Sonda: 'Probe' };

export function applyLanguageToData(lang: Lang): void {
  for (const m of ABANDONED_MISSIONS) {
    const en: Record<string, unknown> = { ...(MISSIONS_EN[m.id] ?? {}) };
    const cat = CATEGORY_EN[(originals.get(m)?.categoryLabel as string) ?? m.categoryLabel];
    if (cat) en.categoryLabel = cat;
    swap(m, en, lang);
  }
  for (const [id, note] of Object.entries(LEFT_BEHIND_NOTES)) {
    const en = NOTES_EN[id];
    if (en) swap(note, { leftBehind: en.leftBehind, ...(note.farewellNote && en.farewellNote ? { farewellNote: en.farewellNote } : {}) }, lang);
    for (const s of note.sources) swap(s, { label: sourceLabelEn((originals.get(s)?.label as string) ?? s.label) }, lang);
  }
  for (const [craft, info] of Object.entries(LANDING_BY_CRAFT)) swap(info, LANDING_EN[craft], lang);
  for (const b of CELESTIAL_BODIES) {
    swap(b, BODIES_EN[b.id], lang);
    for (const moon of b.moons) swap(moon, BODIES_EN[moon.id], lang);
  }
  for (const d of DEEP_SPACE_TARGETS) swap(d, DEEP_SPACE_EN[d.id], lang);
}

applyLanguageToData(getLang());
subscribeLang(() => applyLanguageToData(getLang()));
