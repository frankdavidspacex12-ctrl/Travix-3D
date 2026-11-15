# Space Apps 2026 — Submission form texts (ready to paste)

Deadline: **Sunday, November 15, 11:59 PM local time** (Team Owner's time zone). Saving is not submitting: press **Submit for Judging**.

---

## Project Summary

**Project Name** (replace "Project steps ahead"):

> Travix 3D — Left Behind, Not Forgotten

**Summary** (174 words, ≈1,050 of 1,500 characters):

> Travix 3D is an interactive, real-time 3D map of the Solar System that tells the stories of the hardware NASA left behind on the Moon, Mars and beyond: Apollo descent stages, Lunar Roving Vehicles, ALSEP stations, Surveyor, Viking, Sojourner, Spirit, Opportunity, Phoenix, InSight, Ingenuity, Dawn, NEAR Shoemaker, Pioneer and Kepler. Students fly to each artifact at its real landing site, watch how it actually landed, and read a four-act story: what it did, why it mattered, why it was left there and its legacy, linked to the official NASA source. They can ask by voice ("take me to Mars"), follow narrated tours, learn 51 space words and test themselves with 100 questions. It turns "space junk" into a museum of exploration that shows the engineering decisions behind each piece. It is free, works offline once installed and speaks English and Spanish, so schools with poor connectivity, like many rural schools in Colombia, can use it in class. A section on Colombian women and men at NASA shows students that this future is also theirs.

---

## Project Information

**Project Details:**

> **What it does and how it works.** Travix 3D places 54 NASA missions at their real coordinates in a 3D Solar System that moves in real time. Planet positions come from JPL Keplerian elements; Earth's day and night match the real UTC time; the ISS follows its real orbit from CelesTrak data. Each surface mission appears as a labeled point on its planet or moon. Selecting one opens a story card in four acts (what it did, why it mattered, why it was left there, its legacy) with optional voice narration, NASA photos and a link to NSSDCA or science.nasa.gov. A "How it landed" animation shows the real landing method (sky crane, airbags, retro-rockets, parachutes). Six guided tours, including a 17-spacecraft hardware timeline, take students from place to place. A voice assistant flies to any place the student names. The "Learn" section has a 51-word bilingual glossary (descent stage, RTG, sky crane, retroreflector…), each word linked to the object in 3D, and 100 quiz questions that never repeat. "Colombians at NASA" profiles 7 Colombian women and men on NASA missions.
>
> **Benefits and intended impact.** It turns discarded equipment into stories of decisions, discoveries and limits, so students learn science and engineering through the objects themselves. Teachers can use it in classrooms with no internet, since it installs as an app and works offline. Local problem: many public schools in Colombia, especially rural ones, have little connectivity and few space-science materials in Spanish; Travix 3D runs offline, in Spanish and English, on ordinary phones and computers, and we propose it as a free resource for science and technology classes (grades 5–9), starting with schools near our San Vicente venue.
>
> **Scalability.** Every mission, quiz question, glossary word and profile is a data record, so new content (future Artemis hardware, other agencies' landers, satellites and orbital debris) can be added without touching the 3D engine. New languages need only a translation file. Planet positions and the ISS orbit are computed from live orbital data. It is a static site with no servers to maintain.
>
> **Tools, languages and software.** TypeScript, React 19, three.js, Vite, Tailwind CSS, vite-plugin-pwa (Workbox), Web Audio API (all sounds synthesized in code) and Web Speech API (narration and voice commands). Hosted on Vercel; code on GitHub. NASA 3D Resources models, NASA Image and Video Library photos, NSSDCA and NASA Science mission data, JPL orbital elements.
>
> **Creativity.** A Solar System you can fly through like a museum: every artifact has a voice, a landing animation and a "why it was left there" explanation, and a starship mode makes the distances feel real.
>
> **Factors considered.** Accuracy (facts checked against NSSDCA and NASA pages; interpretive phrases are labeled as such), school-age reading level, accessibility (reduced motion, keyboard use, narration), offline use for schools with poor connectivity, English and Spanish, and performance on phones.

**Use of Super Intelligence (SI)** — select what applies (exact option names may differ; pick the closest):

- [x] Code (Google AI Studio / Gemini for the first version; Claude Code for later development)
- [x] Text / content writing (mission story drafts, checked against NASA sources; translation to English)
- [x] Images / 3D (team starship: Gemini concept image → MakerWorld MakerLab "Image to 3D")
- [ ] Audio — **not used** (sounds are synthesized in code; narration is the device's own text-to-speech)
- [ ] Video — only if AI is used to make the demo video (then it needs a watermark)

Rules to respect (from the form):
- **Images and videos made with AI must carry a visible watermark** ("AI-generated"). In the demo video, every shot that shows the starship, or any AI image, needs the watermark.
- AI-generated content **may not use, contain or modify NASA logos, flags or mission identifiers**. Checked: the starship image has no NASA logos, flags or insignia; the app uses no NASA logos.
- Code and data: disclosed in the README section "Use of Artificial Intelligence (AI)" (descriptive text) and in the git history (metadata).

**NASA Data:**

> NASA Space Science Data Coordinated Archive (NSSDCA) and NASA Science mission pages (science.nasa.gov): mission facts, landing sites, dates and final status. NASA 3D Resources (github.com/nasa/NASA-3D-Resources): 3D models of Perseverance, Ingenuity, InSight, the Apollo Lunar Module, Hubble, JWST, LRO, MRO, Juno, Cassini, Huygens, MESSENGER, Rosetta and Voyager. NASA Image and Video Library (images.nasa.gov): mission photos, each with its NASA ID. JPL Solar System Dynamics: Keplerian elements for planet positions and IAU rotation models.

---

## Project Links

**Project Demonstration** (public link, no login): a video of **30 seconds or less** (YouTube unlisted/public, or Google Drive "Anyone with the link") **or** slides with **7 slides or fewer**. Suggested 30 s video script:

| Time | Shot | English subtitle |
|---|---|---|
| 0–4 s | Solar System opening | "NASA left hardware all over the Solar System." |
| 4–10 s | Fly to the Moon, Apollo 11 label | "Travix 3D finds every artifact at its real landing site." |
| 10–16 s | "How it landed" animation (Spirit airbags or Perseverance sky crane) | "See how each one landed…" |
| 16–22 s | Opportunity story card, "Why it was left there" | "…and why it was left behind." |
| 22–27 s | Ship mode hyperspace jump (**"AI-generated ship" watermark**) | "Fly through real distances, in real time." |
| 27–30 s | Logo + URL | "Travix 3D · travix-3-d.vercel.app" |

**Project** (public link):

> https://travix-3-d.vercel.app

(Also add the code: https://github.com/frankdavidspacex12-ctrl/Travix-3D — it is public.)
