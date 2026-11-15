// English for the "How it landed" animation (Spanish original in data/landingMethods.ts), by craft type.
import type { LandingInfo } from '../data/landingMethods';

export const LANDING_EN: Record<string, { title: string; text: string }> = {
  rover_msl: {
    title: 'Sky crane',
    text: 'A red-hot heat shield, a huge parachute and, at the end, a rocket-powered crane that lowered the rover on cables and then flew away.',
  },
  heli_ingenuity: {
    title: 'Sky crane',
    text: 'It traveled folded under the belly of Perseverance, which was lowered on cables from a rocket-powered crane.',
  },
  rover_mer: {
    title: 'Airbags',
    text: 'Heat shield, parachute and retro-rockets; then it dropped wrapped in airbags that bounced across the ground until they came to rest.',
  },
  rover_sojourner: {
    title: 'Airbags',
    text: 'It traveled inside Mars Pathfinder, which dropped wrapped in airbags and bounced across the ground until it came to rest.',
  },
  lander_pathfinder: {
    title: 'Airbags',
    text: 'Heat shield, parachute and retro-rockets; then it dropped wrapped in airbags that bounced across the ground until they came to rest.',
  },
  lander_viking: {
    title: 'Parachute and retro-rockets',
    text: 'Heat shield, parachute and, at the end, retro-rockets to set down gently on its three legs.',
  },
  lander_phoenix: {
    title: 'Parachute and retro-rockets',
    text: 'Heat shield, parachute and, at the end, retro-rockets to set down gently on its three legs.',
  },
  lander_solar: {
    title: 'Parachute and retro-rockets',
    text: 'Heat shield, parachute and, at the end, retro-rockets to set down gently on its three legs.',
  },
  lander_apollo: {
    title: 'Piloted descent engine',
    text: 'The Moon has no air to slow you down: the astronauts flew the lunar module and its descent engine braked the fall until touchdown.',
  },
  lander_apollo_lrv: {
    title: 'Piloted descent engine',
    text: 'The Moon has no air to slow you down: the astronauts flew the lunar module and its descent engine braked the fall until touchdown.',
  },
  rover_lrv: {
    title: 'Folded on the lunar module',
    text: 'It traveled folded on the side of the lunar module, which braked down with its engine; the astronauts unfolded it on the ground.',
  },
  package_alsep: {
    title: 'Aboard the lunar module',
    text: 'It traveled stowed in the lunar module, which braked down with its engine; the astronauts set it up by hand on the ground.',
  },
  lander_surveyor: {
    title: 'Retro-rocket',
    text: 'The Moon has no air to slow you down: a powerful retro-rocket braked most of the fall and small engines set it down gently.',
  },
  rover_lunokhod: {
    title: 'Retro-rocket landing stage',
    text: 'It came down on a Soviet Luna landing platform that braked with retro-rockets; then the rover rolled down to the ground on ramps.',
  },
  lander_huygens: {
    title: 'Parachutes through the haze',
    text: 'It fell through Titan\'s thick orange haze hanging from parachutes for about two and a half hours.',
  },
  lander_venera: {
    title: 'Parachute and braking disk',
    text: 'It used parachutes in the high clouds; then it fell slowed only by a metal disk around the spacecraft, because the air of Venus is so dense.',
  },
  lander_philae: {
    title: 'Free fall and bounces',
    text: 'Rosetta released it and it fell for about 7 hours; its harpoons did not fire and it bounced twice before stopping next to a cliff.',
  },
  probe_near: {
    title: 'Thruster descent',
    text: 'It was an orbiter: with small pushes from its thrusters it came down slowly until it rested on asteroid Eros.',
  },
};

/** El método de aterrizaje en el idioma pedido. */
export function landingText(craftType: string, info: LandingInfo, lang: 'en' | 'es'): LandingInfo {
  if (lang === 'es') return info;
  const en = LANDING_EN[craftType];
  return en ? { ...info, ...en } : info;
}
