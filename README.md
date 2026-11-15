# Travix 3D — Left Behind, Not Forgotten

**NASA Space Apps Challenge 2026 · Challenge: _Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars_**
**Team:** Steps Ahead — Juan José Quintero Giraldo, Luis Fernando Alzate, Frank David Sierra Guerra, Luz Angela Parra, Ivan Molina

🌐 **Live app:** https://travix-3-d.vercel.app (installable PWA, works offline)

> Independent educational project. Not affiliated with, endorsed by, or sponsored by NASA.
> The interface is in Spanish (our audience is Spanish-speaking school students); this README and the project page are in English.

---

## What it is

Travix 3D is an interactive 3D map of the Solar System, in real time, that tells the stories of the hardware humanity left behind: the descent stages of the Apollo lunar modules, the Lunar Roving Vehicles, the ALSEP science stations, the Surveyor landers, Sojourner, Spirit, Opportunity, the Viking landers, Phoenix, InSight, Ingenuity, Dawn, NEAR Shoemaker, Pioneer 10 and 11, Kepler and more.

School-age explorers fly through the Solar System, find each artifact at its real landing site, watch how it actually landed, and read **why it was left there**, what it discovered, and where it is today, with a link to the official NASA/NSSDCA source.

## How it addresses the challenge

| Challenge goal | What Travix 3D does |
|---|---|
| Tell the story of equipment left on the Moon, Mars and beyond | 55 missions on their real coordinates; every artifact from the challenge's NASA resource list has its own story card |
| Explain what it is, why it was sent and what science it made possible | Each story card covers: what it did, why it matters, **why it was left there** (the engineering decision or the end of the mission) and its legacy |
| Make it engaging for school-age audiences | Real-time 3D flight, a "ship mode" with hyperspace jumps, short texts for students, a narrated welcome tutorial, and a **"How it landed"** animation for every surface mission (sky crane, airbags, retro-rockets, parachutes in Titan's haze…) |
| Accuracy | Facts and dates checked against NSSDCA and science.nasa.gov; the source is linked on every card. Poetic phrases are labeled as interpretation (e.g. Opportunity's famous "My battery is low…" is an interpretation of its last telemetry, not a literal message) |

## Highlights

- **Real time.** Planet positions from JPL Keplerian elements (J2000); Earth's day/night side matches the real UTC time; the ISS is placed over its real ground track (propagated from CelesTrak orbital elements).
- **Find every artifact.** Surface missions show as dots with names on the planet or moon you are looking at, plus an "On the surface" list. Moon labels keep the planet and its moons easy to find.
- **"How it landed."** A short, schematic animation with synchronized sound shows the real landing method of each surface mission (labeled as an illustration, not to scale).
- **Offline and installable.** Progressive Web App: install it and use it with no internet, all 3D models, textures and NASA photos included.
- **Accessible.** Respects "reduce motion", keyboard-friendly tutorial, optional voice narration.

## NASA data and resources used

- **NASA Space Science Data Coordinated Archive (NSSDCA)** and **NASA Science mission pages** (science.nasa.gov): mission facts, landing sites, dates and final status (the resources listed in the challenge).
- **NASA 3D Resources** (github.com/nasa/NASA-3D-Resources): 3D models of Perseverance, Ingenuity, InSight, the Apollo Lunar Module, Hubble, JWST, LRO, MRO, Juno, Cassini, Huygens, MESSENGER, Rosetta and Voyager.
- **NASA Image and Video Library** (images.nasa.gov): mission photos stored offline, each with its NASA ID.
- **JPL Solar System Dynamics** — Keplerian elements for approximate planet positions (Standish), and IAU rotation models.

Other data: **CelesTrak** orbital elements for the ISS (fetched when online; a copy is bundled for offline use).

## Credits and licenses

- **3D models:** NASA 3D Resources (NASA media usage guidelines).
- **Photos:** NASA Image and Video Library (NASA media usage guidelines). NASA does not endorse this project.
- **Planet and moon surface maps:** gathered during the initial AI-assisted build of the app in Google AI Studio; they are maps derived from NASA/JPL-Caltech/USGS imagery (the same file sets distributed with the three.js examples and Planet Pixel Emporium). The exact original source of each file was not recorded.
- **Team starship model:** AI-generated (see AI disclosure below).
- **Sound:** synthesized in real time with the Web Audio API (no audio files). Voice narration uses the device's built-in speech voices.
- **Libraries:** React (MIT), three.js (MIT), Vite (MIT), Tailwind CSS (MIT), lucide-react (ISC), vite-plugin-pwa (MIT), Google Draco decoder (Apache 2.0). Fonts: Outfit, Plus Jakarta Sans and JetBrains Mono (SIL Open Font License).
- No NASA logos or insignia are used.

## Use of Artificial Intelligence (AI)

AI tools were used as accelerators; the idea, the story, the mission selection and every decision are the team's.

- **Code:** the first version of the app was generated in **Google AI Studio** (Gemini) from the team's prompt; later work was written with **Claude Code** (Claude). Everything was directed, reviewed and tested by the team, and the git history records each change.
- **Texts:** mission story texts were drafted with AI help and checked against NSSDCA and NASA mission pages.
- **Images / 3D:** the team starship was generated with AI: a concept image made with **Google Gemini**, turned into a 3D model with **MakerWorld MakerLab "Image to 3D"** (Bambu Lab), then optimized by the team. The planet and moon textures were gathered during the initial build in Google AI Studio. Any AI-generated image or video used in the demo carries a visible watermark.
- **Audio:** no AI-generated audio is used in the app (all sounds are synthesized in code).

## Run it locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build in dist/
npm run preview  # serve the production build
```

Requirements: Node.js 20+ and a WebGL-capable browser.

## Tech stack

React 19 · TypeScript (strict) · Vite · three.js (imperative engine, no react-three-fiber) · Tailwind CSS v4 · vite-plugin-pwa / Workbox · Web Audio API · Web Speech API.
