// English text for each mission card (the Spanish original stays in abandonedMissionsData.ts).
// Only the fields shown in the app are translated; anything missing falls back to Spanish.
import type { AbandonedMission } from '../data/abandonedMissionsData';

type MissionText = Partial<
  Pick<
    AbandonedMission,
    | 'name'
    | 'categoryLabel'
    | 'destinationLabel'
    | 'region'
    | 'launchDate'
    | 'lastContactDate'
    | 'status'
    | 'whatItDid'
    | 'whyImportant'
    | 'farewellMessage'
  >
>;

export const MISSIONS_EN: Record<string, MissionText> = {
  perseverance: {
    name: 'Perseverance and Ingenuity',
    destinationLabel: 'Mars',
    region: 'Jezero Crater · Ancient river delta',
    launchDate: 'Jul 30, 2020',
    lastContactDate: 'Active · Ongoing operations',
    status: 'Perseverance: active · Ingenuity: inactive since January 2024',
    whatItDid:
      'Explores the ancient delta of the Jezero lake, drills and seals sample tubes for a future return to Earth, made oxygen with MOXIE, and flew 72 times together with the Ingenuity helicopter.',
    whyImportant:
      'It carried the first powered, controlled flight on another planet (Ingenuity) and collected key sediment cores to find out whether ancient microbial life existed on Mars.',
    farewellMessage:
      'Ingenuity made its 72nd flight on January 18, 2024; damage to its rotor blades grounded it for good in Jezero Crater.',
  },
  curiosity: {
    name: 'Curiosity (MSL)',
    destinationLabel: 'Mars',
    region: 'Gale Crater · Mount Sharp (Aeolis Mons)',
    launchDate: 'Nov 26, 2011',
    lastContactDate: 'Active · Ongoing operations',
    status: 'Active · Climbing Mount Sharp',
    whatItDid:
      'It has driven more than 33 km up the rock layers of Mount Sharp in Gale Crater, zapping rocks with its ChemCam laser and analyzing organic compounds.',
    whyImportant:
      'It confirmed that Gale Crater held a freshwater lake for millions of years, with chemistry suitable for supporting microbial life.',
    farewellMessage: 'Powered by a plutonium-238 nuclear generator (RTG), it keeps climbing Mount Sharp.',
  },
  opportunity: {
    name: 'Opportunity (MER-B)',
    destinationLabel: 'Mars',
    region: 'Meridiani Planum · Perseverance Valley',
    launchDate: 'Jul 7, 2003',
    lastContactDate: 'Jun 10, 2018',
    status: 'Inactive · Historic legacy',
    whatItDid:
      'It drove 45.16 km exploring Eagle, Endurance, Victoria and Endeavour craters, studying sedimentary rocks and hematite with its robotic arm.',
    whyImportant:
      'It showed for the first time, with direct mineral evidence, that Mars once had liquid water on its surface, and it outlived its planned lifetime 55 times over.',
    farewellMessage: '"My battery is low and it\'s getting dark."',
  },
  spirit: {
    name: 'Spirit (MER-A)',
    destinationLabel: 'Mars',
    region: 'Gusev Crater · Columbia Hills',
    launchDate: 'Jun 10, 2003',
    lastContactDate: 'Mar 22, 2010',
    status: 'Inactive · Historic legacy',
    whatItDid:
      'It crossed 7.73 km in Gusev Crater, climbed Husband Hill and studied dust devils, volcanic rocks and hydrothermal deposits.',
    whyImportant:
      'It found almost pure silica and carbonates formed in ancient hot springs, revealing habitable environments on early Mars.',
    farewellMessage:
      'Stuck in soft sand near Home Plate, it could not tilt its solar panels toward the winter Sun and went into permanent hibernation.',
  },
  insight: {
    name: 'InSight',
    destinationLabel: 'Mars',
    region: 'Elysium Planitia',
    launchDate: 'May 5, 2018',
    lastContactDate: 'Dec 15, 2022',
    status: 'Inactive · Historic legacy',
    whatItDid:
      'It set up an ultra-sensitive seismometer and a heat probe in Elysium Planitia to listen to the seismic pulse of Mars and to meteorite impacts.',
    whyImportant:
      'It recorded more than 1,300 marsquakes and made the first measurements of the thickness of the crust and the size of the liquid Martian core.',
    farewellMessage: '"My power\'s really low, so this may be the last image I can send."',
  },
  sojourner: {
    name: 'Sojourner (Pathfinder)',
    destinationLabel: 'Mars',
    region: 'Ares Vallis',
    launchDate: 'Dec 4, 1996',
    lastContactDate: 'Sep 27, 1997',
    status: 'Inactive · Historic legacy',
    whatItDid:
      'It explored the area around the Pathfinder station in Ares Vallis, analyzing boulders carried there by ancient catastrophic floods.',
    whyImportant:
      'It was the first robotic vehicle ever to rove on Mars, proving the rocker-bogie suspension still used today by Perseverance.',
    farewellMessage:
      'The last transmission from the Pathfinder base station stopped after its battery was exhausted during the cold Martian night.',
  },
  pathfinder: {
    name: 'Mars Pathfinder · Carl Sagan Memorial Station',
    destinationLabel: 'Mars',
    region: 'Ares Vallis · a few meters from Sojourner',
    launchDate: 'Dec 4, 1996',
    lastContactDate: 'Sep 27, 1997',
    status: 'Inactive · Carl Sagan Memorial Station',
    whatItDid:
      'It landed on July 4, 1997 bouncing on airbags, opened its three solar-panel petals and rolled the Sojourner rover down a ramp. Its mast camera photographed the landscape and it measured the Martian weather.',
    whyImportant:
      'It proved a low-cost airbag landing later used by Spirit and Opportunity, and it was the station that linked the first Mars rover with Earth.',
    farewellMessage:
      'Contact was lost on September 27, 1997; NSSDCA notes the cause was never confirmed. It is named after astronomer Carl Sagan.',
  },
  phoenix: {
    name: 'Phoenix Mars Lander',
    destinationLabel: 'Mars',
    region: 'Vastitas Borealis · Martian Arctic',
    launchDate: 'Aug 4, 2007',
    lastContactDate: 'Nov 2, 2008',
    status: 'Inactive · Historic legacy',
    whatItDid:
      'It dug trenches in the Martian arctic soil, analyzed samples in its onboard oven laboratory and watched snow falling in the upper atmosphere.',
    whyImportant:
      'It physically touched and confirmed water ice just a few centimeters below the surface near the north pole of Mars.',
    farewellMessage: 'Silenced by the arrival of the polar night and the CO₂ ice that built up on its solar panels.',
  },
  viking1: {
    name: 'Viking 1 Lander',
    destinationLabel: 'Mars',
    region: 'Chryse Planitia · Thomas Mutch Memorial Station',
    launchDate: 'Aug 20, 1975',
    lastContactDate: 'Nov 13, 1982',
    status: 'Inactive · Longest-lived Mars lander until 2010',
    whatItDid:
      'It landed on July 20, 1976, took the first photograph from the surface of Mars, measured the daily weather and ran the first biology experiments searching for life.',
    whyImportant:
      'The first US lander to operate successfully on Mars; its atmosphere and soil data guided every later Mars mission.',
    farewellMessage:
      'A faulty software command pointed its antenna away from Earth in November 1982; MRO has photographed it intact where it landed.',
  },
  viking2: {
    name: 'Viking 2 Lander',
    destinationLabel: 'Mars',
    region: 'Utopia Planitia · Gerald Soffen Memorial Station',
    launchDate: 'Sep 9, 1975',
    lastContactDate: 'Apr 11, 1980',
    status: 'Inactive · Battery failure',
    whatItDid:
      'It landed on September 3, 1976 on the northern plains, photographed water frost on the ground in winter and repeated the biology experiments of Viking 1.',
    whyImportant:
      'Together with its twin it gave science two weather stations working at the same time on Mars for years, and the first image of water ice on the surface.',
    farewellMessage:
      'Its batteries failed in April 1980; it remains exactly where it landed, about 6,500 km from Viking 1.',
  },
  ingenuity: {
    name: 'Ingenuity Helicopter',
    destinationLabel: 'Mars',
    region: 'Valinor Hills · Neretva Vallis, Jezero Crater (≈18.5° N 77.3° E)',
    launchDate: 'Jul 30, 2020',
    lastContactDate: 'Jan 18, 2024 · Flight 72',
    status: 'Inactive · Stationary weather station',
    whatItDid:
      'It traveled under the belly of Perseverance and on April 19, 2021 made the first powered, controlled flight on another planet; it completed 72 flights covering more than 17 km.',
    whyImportant:
      'It proved that flight is possible in an atmosphere only 1% as dense as Earth\'s, opening the door to future aerial explorers.',
    farewellMessage:
      'On flight 72 it damaged a rotor blade while landing; it still stands in Valinor Hills recording data like a small fixed station.',
  },
  mro: {
    name: 'Mars Reconnaissance Orbiter (MRO)',
    destinationLabel: 'Mars orbit',
    region: 'Low polar orbit · 255 × 320 km',
    launchDate: 'Aug 12, 2005',
    lastContactDate: 'Active · Daily relay',
    status: 'Active · Mapping satellite and relay',
    whatItDid:
      'It photographs Mars with the HiRISE telescopic camera at 30 cm per pixel, detects water-bearing minerals with CRISM and relays data for Curiosity and Perseverance.',
    whyImportant:
      'It has returned more science data than all other interplanetary missions combined and has photographed every rover on the surface from orbit.',
    farewellMessage: 'Its eyes in orbit keep watching dust devils, polar avalanches and future landing sites.',
  },
  apollo11: {
    name: 'Apollo 11 · Eagle',
    destinationLabel: 'The Moon (Earth)',
    region: 'Mare Tranquillitatis · Tranquility Base',
    launchDate: 'Jul 16, 1969',
    lastContactDate: 'Jul 21, 1969',
    status: 'Inactive · Historic monument',
    whatItDid:
      'It carried Neil Armstrong and Buzz Aldrin down to the Sea of Tranquility, where they set up a seismometer and laser reflectors and collected 21.5 kg of Moon rocks.',
    whyImportant:
      'It marked the first crewed Moon landing in human history; its descent stage remains intact on the Moon as scientific heritage.',
    farewellMessage: '"Houston, Tranquility Base here. The Eagle has landed."',
  },
  apollo12: {
    name: 'Apollo 12 · Intrepid',
    destinationLabel: 'The Moon (Earth)',
    region: 'Oceanus Procellarum · Next to Surveyor 3',
    launchDate: 'Nov 14, 1969',
    lastContactDate: 'Nov 20, 1969',
    status: 'Inactive · Lunar heritage',
    whatItDid:
      'Pete Conrad and Alan Bean made a pinpoint landing just 163 meters from Surveyor 3, walked to the probe and brought its camera back to Earth.',
    whyImportant:
      'It showed NASA could land precisely next to an existing target, and revealed how human-made hardware survives 2.5 years in the lunar vacuum.',
    farewellMessage: '"Whoopee! Man, that may have been a small one for Neil, but that\'s a long one for me."',
  },
  apollo14: {
    name: 'Apollo 14 · Antares',
    destinationLabel: 'The Moon (Earth)',
    region: 'Fra Mauro highlands',
    launchDate: 'Jan 31, 1971',
    lastContactDate: 'Feb 6, 1971',
    status: 'Inactive · Lunar heritage',
    whatItDid:
      'Alan Shepard and Edgar Mitchell explored the Fra Mauro highlands on foot, pulling a metal cart (the MET) almost to the rim of Cone Crater.',
    whyImportant:
      'They collected 42.3 kg of ancient breccias thrown out from deep in the Moon when the Imbrium basin formed.',
    farewellMessage: '"Miles and miles and miles!" — Alan Shepard after hitting two golf balls in low gravity.',
  },
  apollo15: {
    name: 'Apollo 15 · Falcon and Rover LRV-1',
    destinationLabel: 'The Moon (Earth)',
    region: 'Hadley Rille · Apennine Mountains',
    launchDate: 'Jul 26, 1971',
    lastContactDate: 'Aug 2, 1971',
    status: 'Inactive · Lander and LRV on the surface',
    whatItDid:
      'David Scott and James Irwin drove the first Lunar Roving Vehicle (LRV) 27.9 km along the edge of Hadley Rille and the Apennine Mountains.',
    whyImportant:
      'They found the famous "Genesis Rock", a 4.1-billion-year-old anorthosite that supported the idea of the magma ocean that formed the Moon.',
    farewellMessage:
      'At the foot of the Falcon lander lies the "Fallen Astronaut" plaque, next to the first electric car driven on the Moon.',
  },
  apollo16: {
    name: 'Apollo 16 · Orion and Rover LRV-2',
    destinationLabel: 'The Moon (Earth)',
    region: 'Descartes Highlands',
    launchDate: 'Apr 16, 1972',
    lastContactDate: 'Apr 24, 1972',
    status: 'Inactive · Lander and LRV on the surface',
    whatItDid:
      'John Young and Charles Duke explored the central highlands for 26.7 km in rover LRV-2, set up the first ultraviolet telescope on the Moon and collected 95.7 kg of rocks.',
    whyImportant:
      'It disproved the volcanic theories about the Descartes region, showing that the highlands are dominated by breccias from large impacts.',
    farewellMessage:
      'The Orion descent stage and John Young\'s gold ultraviolet telescope still stand in front of Stone Mountain.',
  },
  apollo17: {
    name: 'Apollo 17 · Challenger and Rover LRV-3',
    destinationLabel: 'The Moon (Earth)',
    region: 'Taurus-Littrow Valley',
    launchDate: 'Dec 7, 1972',
    lastContactDate: 'Dec 14, 1972',
    status: 'Inactive · Last human footprints',
    whatItDid:
      'Eugene Cernan and geologist Harrison Schmitt drove 35.9 km in rover LRV-3, discovered orange volcanic soil and collected a record 110.5 kg of lunar samples.',
    whyImportant:
      'It took the first professional geologist to another world and was the last time humans walked on the Moon in the 20th century.',
    farewellMessage: '"As I take man\'s last step from the surface, back home for some time to come..." — Eugene Cernan.',
  },
  lro: {
    name: 'Lunar Reconnaissance Orbiter (LRO)',
    destinationLabel: 'Lunar orbit',
    region: 'Lunar polar orbit · 50 km altitude',
    launchDate: 'Jun 18, 2009',
    lastContactDate: 'Active · Continuous lunar watch',
    status: 'Active · Lunar mapping satellite',
    whatItDid:
      'It maps the whole Moon in 3D with the LOLA laser altimeter, measures the temperature of polar craters in permanent shadow and photographs every Apollo, Lunokhod and Surveyor lander from orbit.',
    whyImportant:
      'It produced the most precise topographic map of the Moon ever made and visually confirmed, from orbit, the tracks and landers of every Apollo mission.',
    farewellMessage: 'Its LROC cameras keep taking daily images to prepare the Artemis Moon landings.',
  },
  lunokhod1: {
    name: 'Lunokhod 1',
    destinationLabel: 'The Moon (Earth)',
    region: 'Mare Imbrium',
    launchDate: 'Nov 10, 1970',
    lastContactDate: 'Sep 14, 1971',
    status: 'Inactive · Laser reflector still in use',
    whatItDid:
      'It drove 10.54 km across Mare Imbrium, made 500 mechanical tests of the soil and sent back more than 20,000 images and panoramas.',
    whyImportant:
      'It was the first remotely driven rover on another world; its laser retroreflector is still used to measure the Earth-Moon distance to the millimeter.',
    farewellMessage:
      'Its telemetry ended after ten and a half months of driving; its French-built retroreflector still bounces laser pulses back to Earth.',
  },
  lunokhod2: {
    name: 'Lunokhod 2',
    destinationLabel: 'The Moon (Earth)',
    region: 'Le Monnier Crater · Mare Serenitatis',
    launchDate: 'Jan 8, 1973',
    lastContactDate: 'May 11, 1973',
    status: 'Inactive · Historic legacy',
    whatItDid:
      'It drove 39 km along the rim of Le Monnier crater measuring magnetic fields, the chemistry of the regolith and the brightness of the lunar sky.',
    whyImportant:
      'For 41 years it held the world record for the longest distance driven by a vehicle on the surface of another world.',
    farewellMessage:
      'Its solar lid scooped up lunar soil when it brushed a crater wall, covering its radiator and causing its final shutdown.',
  },
  surveyor3: {
    name: 'Surveyor 3',
    destinationLabel: 'The Moon (Earth)',
    region: 'Oceanus Procellarum · Surveyor Crater',
    launchDate: 'Apr 17, 1967',
    lastContactDate: 'May 4, 1967',
    status: 'Inactive · Visited by Apollo 12',
    whatItDid:
      'It landed on the slope of a crater in Oceanus Procellarum, dug four trenches with its scoop and sent back 6,315 photographs.',
    whyImportant:
      'It confirmed the lunar soil was firm enough for the Apollo missions, and in 1969 the Apollo 12 crew walked to it to bring its camera home.',
    farewellMessage:
      'After surviving its first lunar day it succumbed to the freezing lunar night; in 1969 Pete Conrad and Alan Bean inspected it in person.',
  },
  surveyor1: {
    name: 'Surveyor 1',
    destinationLabel: 'The Moon (Earth)',
    region: 'Oceanus Procellarum · North of Flamsteed crater',
    launchDate: 'May 30, 1966',
    lastContactDate: 'Jan 7, 1967',
    status: 'Inactive · First US soft landing',
    whatItDid:
      'It soft-landed on June 2, 1966 in Oceanus Procellarum and sent back 11,240 television pictures of the ground and of its own footpads, sunk just a few centimeters.',
    whyImportant:
      'It proved the lunar soil could hold up a heavy spacecraft: the direct evidence the Apollo program needed before sending astronauts.',
    farewellMessage:
      'The first US spacecraft to soft-land on another world still stands in the Ocean of Storms; NASA\'s LRO has photographed it from orbit.',
  },
  surveyor5: {
    name: 'Surveyor 5',
    destinationLabel: 'The Moon (Earth)',
    region: 'Mare Tranquillitatis · slope of a small crater',
    launchDate: 'Sep 8, 1967',
    lastContactDate: 'Dec 17, 1967',
    status: 'Inactive · Surveyor probe at its landing site',
    whatItDid:
      'It landed on September 11, 1967 in the Sea of Tranquility and was the first spacecraft to chemically analyze the lunar soil, with an alpha-particle instrument: it found it resembled Earth\'s volcanic basalt.',
    whyImportant:
      'Its chemical analysis helped confirm that the lunar "seas" are solidified lava, and it landed near where Apollo 11 would later touch down.',
    farewellMessage: 'It sent its last transmission on December 17, 1967; it remains on the slope of the small crater where it landed.',
  },
  surveyor6: {
    name: 'Surveyor 6',
    destinationLabel: 'The Moon (Earth)',
    region: 'Sinus Medii · center of the near side',
    launchDate: 'Nov 7, 1967',
    lastContactDate: 'Dec 14, 1967',
    status: 'Inactive · Surveyor probe at its landing site',
    whatItDid:
      'It landed on November 10, 1967 in Sinus Medii, at the center of the Moon\'s near side. On November 17 it fired its engines, rose 3 to 4 meters and set down again about 2.5 meters away: the first liftoff from the surface of the Moon.',
    whyImportant:
      'Its small "hop" showed a spacecraft could fire its engines and lift off from the Moon, something the Apollo astronauts would need to get back home.',
    farewellMessage: 'NASA briefly contacted it on December 14, 1967 without receiving useful data; it remains in Sinus Medii.',
  },
  surveyor7: {
    name: 'Surveyor 7',
    destinationLabel: 'The Moon (Earth)',
    region: 'Highlands near Tycho crater',
    launchDate: 'Jan 7, 1968',
    lastContactDate: 'Feb 21, 1968',
    status: 'Inactive · Surveyor probe at its landing site',
    whatItDid:
      'It landed on January 10, 1968 near Tycho crater, in the southern highlands. It was the only Surveyor to explore a mountainous area: it took more than 21,000 photos, dug trenches with its arm and analyzed the soil.',
    whyImportant:
      'It showed that the lunar highlands have a different composition from the volcanic seas, and it successfully closed the Surveyor program that prepared the Apollo landings.',
    farewellMessage: 'NASA ended its operations on February 21, 1968; it was the last of the five Surveyors that landed successfully.',
  },
  alsep_apollo12: {
    name: 'ALSEP · Apollo 12 science station',
    destinationLabel: 'The Moon (Earth)',
    region: 'Oceanus Procellarum · 130 m northwest of the Intrepid LM',
    launchDate: 'Nov 14, 1969',
    lastContactDate: 'Sep 30, 1977 · ALSEP network switched off',
    status: 'Inactive · Retroreflectors still in use (Apollo 11, 14 and 15)',
    whatItDid:
      'On November 19, 1969 Alan Bean set up the first complete ALSEP station: a passive seismometer, a magnetometer, a solar wind spectrometer and ionosphere instruments, powered by an RTG nuclear generator.',
    whyImportant:
      'The ALSEP network of Apollo 12, 14, 15, 16 and 17 recorded thousands of moonquakes and revealed the Moon\'s inner structure; the laser retroreflectors still measure the Earth-Moon distance to the millimeter.',
    farewellMessage:
      'On September 30, 1977 NASA switched off all five stations for budget reasons; their panels, cables and RTG are still spread out on the lunar soil.',
  },
  alsep_apollo14: {
    name: 'ALSEP · Apollo 14 science station',
    destinationLabel: 'The Moon (Earth)',
    region: 'Fra Mauro highlands · a little over 100 m from the Antares LM (approximate position)',
    launchDate: 'Jan 31, 1971',
    lastContactDate: 'Sep 30, 1977 · ALSEP network switched off',
    status: 'Inactive · Its laser retroreflector is still in use',
    whatItDid:
      'A set of experiments the Apollo 14 astronauts installed next to the lunar module, powered by a nuclear generator (RTG): a passive seismometer, an active seismometer (with small charges that shook the ground), an ion detector, a pressure gauge and a charged-particle detector. Next to it they left a laser retroreflector.',
    whyImportant:
      'Together with the other ALSEP stations it formed a network of instruments at several points on the Moon that recorded thousands of moonquakes and let scientists study the Moon\'s interior from Earth.',
    farewellMessage:
      'On September 30, 1977 NASA switched off all ALSEP stations for budget reasons; their instruments, cables and generator remain on the lunar soil.',
  },
  alsep_apollo15: {
    name: 'ALSEP · Apollo 15 science station',
    destinationLabel: 'The Moon (Earth)',
    region: 'Hadley Rille · Apennine Mountains · a little over 100 m from the Falcon LM (approximate position)',
    launchDate: 'Jul 26, 1971',
    lastContactDate: 'Sep 30, 1977 · ALSEP network switched off',
    status: 'Inactive · Its laser retroreflector is still in use',
    whatItDid:
      'A set of experiments the Apollo 15 astronauts installed next to the lunar module, powered by a nuclear generator (RTG): a passive seismometer, a magnetometer, a solar wind spectrometer, an ion detector, a pressure gauge and a heat-flow experiment for the Moon\'s interior. Next to it they left the largest laser retroreflector of the Apollo missions.',
    whyImportant:
      'Together with the other ALSEP stations it formed a network of instruments at several points on the Moon that recorded thousands of moonquakes and let scientists study the Moon\'s interior from Earth.',
    farewellMessage:
      'On September 30, 1977 NASA switched off all ALSEP stations for budget reasons; their instruments, cables and generator remain on the lunar soil.',
  },
  alsep_apollo16: {
    name: 'ALSEP · Apollo 16 science station',
    destinationLabel: 'The Moon (Earth)',
    region: 'Descartes Highlands · a little over 100 m from the Orion LM (approximate position)',
    launchDate: 'Apr 16, 1972',
    lastContactDate: 'Sep 30, 1977 · ALSEP network switched off',
    status: 'Inactive · Switched off in 1977',
    whatItDid:
      'A set of experiments the Apollo 16 astronauts installed next to the lunar module, powered by a nuclear generator (RTG): a passive seismometer, an active seismometer, a magnetometer and a heat-flow experiment. The heat-flow cable broke when an astronaut tripped over it, so that instrument never worked.',
    whyImportant:
      'Together with the other ALSEP stations it formed a network of instruments at several points on the Moon that recorded thousands of moonquakes and let scientists study the Moon\'s interior from Earth.',
    farewellMessage:
      'On September 30, 1977 NASA switched off all ALSEP stations for budget reasons; their instruments, cables and generator remain on the lunar soil.',
  },
  alsep_apollo17: {
    name: 'ALSEP · Apollo 17 science station',
    destinationLabel: 'The Moon (Earth)',
    region: 'Taurus-Littrow Valley · a little over 100 m from the Challenger LM (approximate position)',
    launchDate: 'Dec 7, 1972',
    lastContactDate: 'Sep 30, 1977 · ALSEP network switched off',
    status: 'Inactive · Switched off in 1977',
    whatItDid:
      'A set of experiments the Apollo 17 astronauts installed next to the lunar module, powered by a nuclear generator (RTG): a seismic experiment with explosive charges, a gravimeter, a heat-flow experiment, a dust and micrometeorite detector and a spectrometer to measure the Moon\'s thin atmosphere.',
    whyImportant:
      'Together with the other ALSEP stations it formed a network of instruments at several points on the Moon that recorded thousands of moonquakes and let scientists study the Moon\'s interior from Earth.',
    farewellMessage:
      'On September 30, 1977 NASA switched off all ALSEP stations for budget reasons; their instruments, cables and generator remain on the lunar soil.',
  },
  lrv1: {
    name: 'Lunar Roving Vehicle LRV-1 (Apollo 15)',
    destinationLabel: 'The Moon (Earth)',
    region: 'Hadley Rille · parked about 90 m east of the Falcon LM (approximate position)',
    launchDate: 'Jul 26, 1971',
    lastContactDate: 'Aug 2, 1971 · filmed the LM liftoff',
    status: 'Inactive · Parked on the Moon forever',
    whatItDid:
      'A battery-powered electric car that David Scott and James Irwin drove on the three Apollo 15 moonwalks, covering about 28 km to reach geological sites far from the lunar module. It was the first vehicle driven by people on another world.',
    whyImportant:
      'It let the astronauts travel several kilometers from the lander, explore much more ground and bring back rocks from places they could never have reached on foot.',
    farewellMessage:
      'Its last job was to film the lunar module lifting off to orbit with its TV camera; then it stayed parked where it was left.',
  },
  lrv2: {
    name: 'Lunar Roving Vehicle LRV-2 (Apollo 16)',
    destinationLabel: 'The Moon (Earth)',
    region: 'Descartes Highlands · parked near the Orion LM (approximate position)',
    launchDate: 'Apr 16, 1972',
    lastContactDate: 'Apr 24, 1972 · filmed the LM liftoff',
    status: 'Inactive · Parked on the Moon forever',
    whatItDid:
      'A battery-powered electric car that John Young and Charles Duke drove on the three Apollo 16 moonwalks, covering about 27 km to reach geological sites far from the lunar module.',
    whyImportant:
      'It let the astronauts travel several kilometers from the lander, explore much more ground and bring back rocks from places they could never have reached on foot.',
    farewellMessage:
      'Its last job was to film the lunar module lifting off to orbit with its TV camera; then it stayed parked where it was left.',
  },
  lrv3: {
    name: 'Lunar Roving Vehicle LRV-3 (Apollo 17)',
    destinationLabel: 'The Moon (Earth)',
    region: 'Taurus-Littrow Valley · parked near the Challenger LM (approximate position)',
    launchDate: 'Dec 7, 1972',
    lastContactDate: 'Dec 14, 1972 · filmed the LM liftoff',
    status: 'Inactive · Parked on the Moon forever',
    whatItDid:
      'A battery-powered electric car that Eugene Cernan and Harrison Schmitt drove on the three Apollo 17 moonwalks, covering about 36 km to reach geological sites far from the lunar module. It is the last vehicle anyone has driven on the Moon.',
    whyImportant:
      'It let the astronauts travel several kilometers from the lander, explore much more ground and bring back rocks from places they could never have reached on foot.',
    farewellMessage:
      'Its last job was to film the lunar module lifting off to orbit with its TV camera; then it stayed parked where it was left.',
  },
  iss: {
    name: 'International Space Station (ISS)',
    destinationLabel: 'Low Earth orbit (408 km)',
    region: 'Orbit inclined 51.6° · 27,600 km/h',
    launchDate: 'Nov 20, 1998',
    lastContactDate: 'Active · Continuous human presence',
    status: 'Active · Crewed orbital laboratory',
    whatItDid:
      'It sees 16 sunrises every day, 408 km above Earth, while its crews run thousands of experiments in biomedicine, fluid physics, astronomy and Earth observation.',
    whyImportant:
      'It is the largest structure humans have ever built in space and has kept people living off Earth without interruption since November 2000.',
    farewellMessage: 'Its seven-window Cupola gives astronauts an uninterrupted view of Earth\'s thin blue atmosphere.',
  },
  hubble: {
    name: 'Hubble Space Telescope',
    destinationLabel: 'Earth orbit (540 km)',
    region: 'Low Earth orbit · 540 km',
    launchDate: 'Apr 24, 1990',
    lastContactDate: 'Active · More than 1.6 million observations',
    status: 'Active · Space observatory',
    whatItDid:
      'It observes the cosmos in ultraviolet, visible and near-infrared light free from atmospheric blur, capturing deep fields of galaxies and the atmospheres of exoplanets.',
    whyImportant:
      'It helped measure the age of the universe precisely (13.8 billion years), discovered the accelerating expansion driven by dark energy and transformed our view of the cosmos.',
    farewellMessage: 'Repaired on five historic Space Shuttle spacewalk missions, it keeps revealing the secrets of the universe.',
  },
  jwst: {
    name: 'James Webb Space Telescope (JWST)',
    destinationLabel: 'Sun-Earth Lagrange point L2 (1.5 million km)',
    region: 'Halo orbit around L2',
    launchDate: 'Dec 25, 2021',
    lastContactDate: 'Active · Deep infrared',
    status: 'Active · Infrared observatory',
    whatItDid:
      'It unfolded a 6.5-meter segmented gold mirror and a five-layer sunshield the size of a tennis court to observe the first galaxies born after the Big Bang.',
    whyImportant:
      'It detects the chemical fingerprints of water, methane and CO₂ on exoplanets and sees through the dust clouds where new planetary systems are born.',
    farewellMessage:
      '1.5 million kilometers from Earth, it keeps its instruments at −233 °C while looking toward the cosmic dawn.',
  },
  juno: {
    name: 'Juno',
    destinationLabel: 'Polar orbit of Jupiter',
    region: 'Close passes over Jupiter\'s poles',
    launchDate: 'Aug 5, 2011',
    lastContactDate: 'Active · Extended mission to the moons',
    status: 'Active · Extreme polar orbit',
    whatItDid:
      'It flies just a few thousand kilometers above Jupiter\'s cloud tops with three huge 9-meter solar wings to probe its gravity, magnetosphere and polar cyclones.',
    whyImportant:
      'The first solar-powered spacecraft at 5.2 AU; it found that Jupiter\'s core is diffuse and made close flybys of Europa, Io and Ganymede.',
    farewellMessage: 'It carries three aluminum figures of Galileo, Juno and Jupiter while it uncovers the depths of the giant planet.',
  },
  cassini: {
    name: 'Cassini (Grand Finale)',
    destinationLabel: 'Saturn',
    region: 'Upper equatorial atmosphere · Saturn\'s rings',
    launchDate: 'Oct 15, 1997',
    lastContactDate: 'Sep 15, 2017',
    status: 'Intentionally destroyed',
    whatItDid:
      'It made 293 orbits around Saturn, released Huygens over Titan and dived 22 times between the planet and its rings in the Grand Finale.',
    whyImportant:
      'It discovered geysers from an underground ocean on Enceladus and liquid hydrocarbon seas on Titan; it plunged into Saturn to protect its moons.',
    farewellMessage:
      'Its last signal reached Earth 83 minutes after the spacecraft dived like a meteor into Saturn\'s clouds.',
  },
  galileo: {
    name: 'Galileo and its atmospheric probe',
    destinationLabel: 'Jupiter',
    region: 'Jupiter\'s equatorial atmosphere · probe entry (6.5° N)',
    launchDate: 'Oct 18, 1989',
    lastContactDate: 'Sep 21, 2003',
    status: 'Intentionally destroyed in Jupiter',
    whatItDid:
      'The first spacecraft to orbit Jupiter (Dec 7, 1995). That same day its atmospheric probe parachuted 58 minutes into the clouds before being crushed by the pressure.',
    whyImportant:
      'It found signs of a salty ocean under Europa\'s ice, measured Io\'s extreme volcanism and discovered Ganymede\'s magnetic field. On the way it watched comet Shoemaker-Levy 9 crash into Jupiter.',
    farewellMessage:
      'Out of fuel, it was steered into Jupiter on September 21, 2003 so it could never contaminate Europa\'s possible ocean.',
  },
  huygens: {
    name: 'Huygens probe',
    destinationLabel: 'Titan (Saturn)',
    region: 'Adiri region · Hydrocarbon plain',
    launchDate: 'Oct 15, 1997',
    lastContactDate: 'Jan 14, 2005',
    status: 'Inactive · Historic legacy',
    whatItDid:
      'It parachuted for 2.5 hours through Titan\'s orange haze and sent back images and spectra from its icy surface.',
    whyImportant:
      'It made the most distant landing humanity has ever achieved, revealing rivers of liquid methane and rocks of water ice.',
    farewellMessage: 'It kept transmitting from Titan\'s icy ground until the Cassini orbiter set below the moon\'s horizon.',
  },
  venera13: {
    name: 'Venera 13',
    destinationLabel: 'Venus',
    region: 'Phoebe Regio',
    launchDate: 'Oct 30, 1981',
    lastContactDate: 'Mar 1, 1982',
    status: 'Inactive · Historic legacy',
    whatItDid:
      'It survived 127 minutes at 457 °C and 89 atmospheres in Phoebe Regio, drilled into Venus\'s basalt rock and sent back panoramas of the ground.',
    whyImportant:
      'It took the first color photographs and the first sound recording on the surface of Venus before melting under its crushing pressure.',
    farewellMessage:
      'Slowly crushed and melted under 89 atmospheres and 457 °C, after lasting four times its planned 32-minute thermal lifetime.',
  },
  messenger: {
    name: 'MESSENGER',
    destinationLabel: 'Mercury',
    region: 'Shakespeare plain · Impact basin',
    launchDate: 'Aug 3, 2004',
    lastContactDate: 'Apr 30, 2015',
    status: 'Inactive · Impact crater',
    whatItDid:
      'It completed 4,104 orbits around Mercury measuring its lopsided magnetic field, its surface composition and its full global topography.',
    whyImportant:
      'It was the first spacecraft to orbit Mercury and discovered water ice in permanently shadowed polar craters, despite being so close to the Sun.',
    farewellMessage:
      'It crashed into Mercury\'s far side at 14,080 km/h after using up the last helium in its thrusters.',
  },
  rosetta_philae: {
    name: 'Rosetta and Philae',
    destinationLabel: 'Comet 67P/C-G',
    region: 'Abydos / Ma\'at region · Smaller lobe',
    launchDate: 'Mar 2, 2004',
    lastContactDate: 'Sep 30, 2016',
    status: 'Inactive on comet 67P',
    whatItDid:
      'It flew alongside comet 67P on its trip around the Sun for more than two years and released the Philae lander onto its two-lobed nucleus.',
    whyImportant:
      'It made the first controlled landing on a comet and found amino acids and organic molecules older than the planets.',
    farewellMessage:
      'Rosetta gently touched down on comet 67P at 3.2 km/h and switched off its transmitter to rest next to the Philae lander.',
  },
  newhorizons: {
    name: 'New Horizons',
    destinationLabel: 'Pluto and the Kuiper Belt',
    region: 'Sputnik Planitia flyby · 58+ AU',
    launchDate: 'Jan 19, 2006',
    lastContactDate: 'Active · Kuiper Belt',
    status: 'Active · Exploring the Kuiper Belt',
    whatItDid:
      'It made the historic first flyby of Pluto and Charon in 2015 at 58,000 km/h and later visited the primordial object Arrokoth deep in the Kuiper Belt.',
    whyImportant:
      'It revealed that Pluto is a geologically alive world, with water-ice mountains and active nitrogen glaciers forming a huge white heart.',
    farewellMessage: 'It keeps measuring dust and the solar wind in the frozen depths beyond Neptune and Pluto.',
  },
  pioneer10: {
    name: 'Pioneer 10',
    destinationLabel: 'Deep space · ≈140 AU',
    region: 'Heading toward Aldebaran (Taurus) · Beyond the heliosphere',
    launchDate: 'Mar 3, 1972',
    lastContactDate: 'Jan 23, 2003',
    status: 'Inactive · Silently drifting toward the stars',
    whatItDid:
      'The first spacecraft to cross the asteroid belt and to visit Jupiter (December 1973), measuring its radiation belts and taking the first close-up images.',
    whyImportant:
      'It opened the way to the outer planets and was the first human-made object to go beyond Neptune\'s orbit; it carries the Pioneer plaque with a message for other civilizations.',
    farewellMessage:
      'Its last signal, faint as a whisper, arrived on January 23, 2003; it will take about 2 million years to pass near Aldebaran.',
  },
  pioneer11: {
    name: 'Pioneer 11',
    destinationLabel: 'Deep space · ≈119 AU',
    region: 'Heading toward the constellation Aquila · Beyond the heliosphere',
    launchDate: 'Apr 6, 1973',
    lastContactDate: 'Sep 30, 1995',
    status: 'Inactive · Silently drifting toward the stars',
    whatItDid:
      'It flew past Jupiter in 1974 and was the first spacecraft to visit Saturn (September 1979), discovering the F ring and a new small moon.',
    whyImportant:
      'It proved a spacecraft could safely cross the plane of Saturn\'s rings, clearing the way for the Voyagers.',
    farewellMessage:
      'Its nuclear generator ran down and NASA lost contact on September 30, 1995; it travels silently toward Aquila.',
  },
  kepler: {
    name: 'Kepler Space Telescope',
    destinationLabel: 'Earth-trailing solar orbit',
    region: '372.5-day orbit around the Sun · falling farther behind Earth',
    launchDate: 'Mar 7, 2009',
    lastContactDate: 'Nov 15, 2018 · Last command',
    status: 'Inactive · Out of fuel, drifting',
    whatItDid:
      'It watched more than 150,000 stars in Cygnus-Lyra nonstop and, after losing two reaction wheels, kept working as the K2 mission along the ecliptic.',
    whyImportant:
      'It confirmed more than 2,600 exoplanets and showed there are more planets than stars in our galaxy, many of them Earth-sized in the habitable zone.',
    farewellMessage:
      'It ran out of fuel in October 2018, received its last command on November 15 and drifts without power in an orbit that slowly brings it toward and away from Earth.',
  },
  spitzer: {
    name: 'Spitzer Space Telescope',
    destinationLabel: 'Earth-trailing solar orbit',
    region: 'Orbit around the Sun · more than 250 million km behind Earth',
    launchDate: 'Aug 25, 2003',
    lastContactDate: 'Jan 30, 2020 · Retired',
    status: 'Inactive · Hibernating, drifting',
    whatItDid:
      'It observed the universe in infrared light, seeing through the dust of the Milky Way, and after running out of liquid helium in 2009 it worked 11 more years as a "warm" mission.',
    whyImportant:
      'With ground telescopes it discovered the seven rocky planets of TRAPPIST-1, found Saturn\'s giant Phoebe ring and measured light from exoplanets for the first time.',
    farewellMessage: 'NASA switched it off on January 30, 2020; it follows Earth around the Sun, a little farther behind every year.',
  },
  osiris_rex: {
    name: 'OSIRIS-REx · OSIRIS-APEX',
    destinationLabel: 'Heading to asteroid Apophis',
    region: 'Solar orbit near Earth · arrives at Apophis in 2029',
    launchDate: 'Sep 8, 2016',
    lastContactDate: 'Active · Heading to Apophis',
    status: 'Active · Extended mission OSIRIS-APEX',
    whatItDid:
      'It studied asteroid Bennu for two years, touched its surface on Oct 20, 2020 and returned a 121.6 g sample that landed in Utah on Sep 24, 2023.',
    whyImportant:
      'It is the largest asteroid sample ever brought to Earth: it holds water locked in minerals, amino acids and compounds key to understanding the origin of life.',
    farewellMessage:
      'After releasing its capsule, the spacecraft flew on under a new name, OSIRIS-APEX, to study Apophis after its close pass by Earth in April 2029.',
  },
  voyager1: {
    name: 'Voyager 1',
    destinationLabel: 'Interstellar space · 166 AU',
    region: 'Beyond the heliopause · 24.8 billion km',
    launchDate: 'Sep 5, 1977',
    lastContactDate: 'Active · More than 47 years in flight',
    status: 'Active · Interstellar space',
    whatItDid:
      'It discovered Io\'s active volcanoes at Jupiter, studied Saturn\'s rings, took the iconic "Pale Blue Dot" portrait and crossed the heliopause in 2012.',
    whyImportant:
      'It is the first human spacecraft to enter interstellar space, carrying the Golden Record with sounds and music of Earth for any future civilization.',
    farewellMessage: '"Look again at that dot. That\'s here. That\'s home. That\'s us." — Carl Sagan (Voyager 1, 1990)',
  },
  voyager2: {
    name: 'Voyager 2',
    destinationLabel: 'Interstellar space · 139 AU',
    region: 'Interstellar space · 20.8 billion km',
    launchDate: 'Aug 20, 1977',
    lastContactDate: 'Active · Grand Tour completed',
    status: 'Active · Interstellar space',
    whatItDid:
      'It made the once-in-a-lifetime "Grand Tour" of Jupiter, Saturn, Uranus (1986) and Neptune (1989), discovering geysers on Triton and dozens of new moons.',
    whyImportant:
      'It is still the only spacecraft ever to visit Uranus and Neptune; since 2018 it measures the interstellar plasma from outside the heliosphere.',
    farewellMessage: 'It carries its own Golden Record toward the stars of the southern sky after completing the planetary Grand Tour.',
  },
  near_shoemaker: {
    name: 'NEAR Shoemaker',
    destinationLabel: 'Asteroid 433 Eros',
    region: 'South of the Himeros depression · 35.8° S 80.4° E',
    launchDate: 'Feb 17, 1996',
    lastContactDate: 'Feb 28, 2001',
    status: 'Inactive · Resting on Eros',
    whatItDid:
      'It orbited Eros for a year from February 14, 2000, mapping its shape, composition and gravity, and on February 12, 2001 it gently set down on it.',
    whyImportant:
      'The first spacecraft to orbit an asteroid and the first to land on one, even though it was not designed to land; it kept transmitting from the surface.',
    farewellMessage:
      'After touching down at 1.6 m/s it sent gamma-ray data for two weeks; its last signal arrived on February 28, 2001.',
  },
  dawn: {
    name: 'Dawn',
    destinationLabel: 'Orbit of Ceres',
    region: 'Stable elliptical orbit over Ceres · Asteroid belt',
    launchDate: 'Sep 27, 2007',
    lastContactDate: 'Oct 31, 2018',
    status: 'Inactive · Powerless orbit forever',
    whatItDid:
      'Using ion engines it first orbited asteroid Vesta and then dwarf planet Ceres, mapping the bright salts of Occator crater and the ice volcano Ahuna Mons.',
    whyImportant:
      'The only spacecraft to orbit two different bodies beyond Earth, thanks to its xenon ion propulsion.',
    farewellMessage:
      'It ran out of hydrazine to point itself in October 2018; it will stay for decades in a stable orbit around Ceres so it will not contaminate it.',
  },
};

const CATEGORY_EN: Record<string, string> = {
  Rover: 'Rover',
  Lander: 'Lander',
  Satélite: 'Satellite',
  Sonda: 'Probe',
};

/** La misión con sus textos en el idioma pedido (en inglés, con respaldo en español). */
export function missionText<T extends AbandonedMission>(m: T, lang: 'en' | 'es'): T {
  if (lang === 'es') return m;
  const en = MISSIONS_EN[m.id];
  const categoryLabel = (CATEGORY_EN[m.categoryLabel] ?? m.categoryLabel) as T['categoryLabel'];
  return en ? { ...m, ...en, categoryLabel } : { ...m, categoryLabel };
}
