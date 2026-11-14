export interface OfflineNasaPhoto {
  nasaId: string;
  title: string;
  description: string;
  dateCreated: string;
  instrument: string;
  url: string;
}

const OFFLINE_NASA_CATALOG: Record<string, OfflineNasaPhoto[]> = {
  "perseverance": [
    {
      "nasaId": "PIA24320",
      "title": "Mars Landing Sites, Including Perseverance (Illustration)",
      "description": "This map of Mars shows the landing site for NASA's Perseverance rover in relation to those of previous successful Mars missions. The newest addition to the group, Perseverance is set to land in Jezero Crater on Feb. 18, 2021. https://photojournal.jpl.nasa.gov/catalog/PIA24320",
      "dateCreated": "2020-12-16",
      "instrument": "JPL",
      "url": "/nasa-photos/perseverance/0.jpg"
    },
    {
      "nasaId": "PIA24745",
      "title": "An Expanse for Perseverance to Explore",
      "description": "This wide view of Mars' Jezero Crater was taken by NASA's Perseverance rover on July 15, 2021 (the 143rd sol, or Martian day, of its mission). The rover has driven nearly a mile (1.5 kilometers) south of its landing site, \"Octavia E. Butler Landing,\" into a region the team has ni",
      "dateCreated": "2021-07-21",
      "instrument": "JPL",
      "url": "/nasa-photos/perseverance/1.jpg"
    },
    {
      "nasaId": "PIA25243",
      "title": "Perseverance's View of Possible Future Sample Cache Depot Site",
      "description": "This annotated image from NASA's Perseverance Mars rover shows its wheel tracks in Jezero Crater and a distant view of the first potential location it could deposit a group of sample tubes for possible future return to Earth. The image was taken on Aug. 29, 2022, the 542nd Martia",
      "dateCreated": "2022-09-15",
      "instrument": "JPL",
      "url": "/nasa-photos/perseverance/2.jpg"
    }
  ],
  "curiosity": [
    {
      "nasaId": "PIA23378",
      "title": "Curiosity at 'Glen Etive'",
      "description": "NASA's Curiosity rover took this selfie on Oct. 11, 2019, the 2,553rd Martian day, or sol, of its mission. The rover drilled twice in this location, nicknamed \"Glen Etive\" (pronounced \"glen EH-tiv\"). About 984 feet (300 meters) behind the rover, Vera Rubin Ridge rises up. Behind ",
      "dateCreated": "2019-10-24",
      "instrument": "JPL",
      "url": "/nasa-photos/curiosity/0.jpg"
    },
    {
      "nasaId": "PIA22207",
      "title": "Mount Sharp 'Photobombs' Curiosity",
      "description": "This self-portrait of NASA's Curiosity Mars rover shows the vehicle on Vera Rubin Ridge, which it's been investigating for the past several months. Directly behind the rover is the start of a clay-rich slope scientists are eager to begin exploring. In the coming week, Curiosity w",
      "dateCreated": "2018-01-31",
      "instrument": "JPL",
      "url": "/nasa-photos/curiosity/1.jpg"
    },
    {
      "nasaId": "PIA19807",
      "title": "Curiosity Low-Angle Self-Portrait at Buckskin Drilling Site on Mount Sharp",
      "description": "This low-angle self-portrait of NASA's Curiosity Mars rover shows the vehicle above the \"Buckskin\" rock target, where the mission collected its seventh drilled sample. The site is in the \"Marias Pass\" area of lower Mount Sharp. The scene combines dozens of images taken by Curiosi",
      "dateCreated": "2015-08-19",
      "instrument": "JPL",
      "url": "/nasa-photos/curiosity/2.jpg"
    }
  ],
  "opportunity": [
    {
      "nasaId": "PIA13375",
      "title": "View from Halfway Through Multi-Year Trek",
      "description": "During a long drive on Labor Day, NASA Mars Exploration Rover Opportunity reached the estimated halfway point of its journey from Victoria Crater to Endeavour Crater.",
      "dateCreated": "2010-09-09",
      "instrument": "JPL",
      "url": "/nasa-photos/opportunity/0.jpg"
    },
    {
      "nasaId": "PIA14510",
      "title": "Small Odyssey Crater on Rim of Huge Endeavour Crater",
      "description": "NASA Mars Exploration Rover Opportunity arrived at the rim of Endeavour crater on Aug. 9, 2011, after a trek of more than 13 miles 21 kilometers lasting nearly three years since departing the rover previous major destination, Victoria crater.",
      "dateCreated": "2011-08-10",
      "instrument": "JPL",
      "url": "/nasa-photos/opportunity/1.jpg"
    }
  ],
  "spirit": [
    {
      "nasaId": "PIA07075",
      "title": "Track of Right-Wheel Drag 3-D",
      "description": "This site, labeled Spirit site 93, is in the Columbia Hills inside Gusev Crater. NASA Mars Exporation rover Spirit tracks point westward. 3D glasses are necessary to view this image.",
      "dateCreated": "2004-11-24",
      "instrument": "JPL",
      "url": "/nasa-photos/spirit/0.jpg"
    },
    {
      "nasaId": "PIA07089",
      "title": "Digital Elevation Map of Spirit Trek",
      "description": "This digital elevation map, produced from satellite data overlain on an image taken by the Mars Orbital Camera on NASA's Mars Global Surveyor spacecraft, shows changes in elevation along the trek of NASA's Mars Exploration Rover Spirit as of the rover's 328th martian day, or sol ",
      "dateCreated": "2004-12-08",
      "instrument": "JPL",
      "url": "/nasa-photos/spirit/1.jpg"
    }
  ],
  "insight": [
    {
      "nasaId": "PIA19143",
      "title": "Finalist Site for Next Landing on Mars",
      "description": "This map shows the single area under continuing evaluation as the InSight mission's Mars landing site, as of a year before the mission's May 2016 launch. The finalist ellipse marked within the northern portion of flat-lying Elysium Planitia is centered at about 4.5 degrees north ",
      "dateCreated": "2015-03-04",
      "instrument": "JPL",
      "url": "/nasa-photos/insight/0.jpg"
    },
    {
      "nasaId": "PIA19811",
      "title": "Artist Concept of InSight Lander on Mars",
      "description": "This artist's concept from August 2015 depicts NASA's InSight Mars lander fully deployed for studying the deep interior of Mars. This illustration updates the correct placement and look of Insight's main instruments. For an earlier artist rendition, see PIA17358. InSight, short f",
      "dateCreated": "2015-08-18",
      "instrument": "JPL",
      "url": "/nasa-photos/insight/1.jpg"
    },
    {
      "nasaId": "PIA17358",
      "title": "Artist Concept of InSight Lander on Mars",
      "description": "This artist's concept depicts the stationary NASA Mars lander known by the acronym InSight at work studying the interior of Mars. The InSight mission (for Interior Exploration using Seismic Investigations, Geodesy and Heat Transport) is scheduled to launch in March 2016 and land ",
      "dateCreated": "2014-03-26",
      "instrument": "JPL",
      "url": "/nasa-photos/insight/2.jpg"
    }
  ],
  "sojourner": [
    {
      "nasaId": "PIA11436",
      "title": "Newest is Biggest: Three Generations of NASA Mars Rovers",
      "description": "Full-scale models of three generations of NASA Mars rovers show the increase in size from the Sojourner rover of the Mars Pathfinder project, to the twin Mars Exploration Rovers Spirit and Opportunity, to the Mars Science Laboratory rover.",
      "dateCreated": "2008-11-19",
      "instrument": "JPL",
      "url": "/nasa-photos/sojourner/0.jpg"
    },
    {
      "nasaId": "PIA11431",
      "title": "Size Comparison: Three Generations of Mars Rovers",
      "description": "Full-scale models of three generations of NASA Mars rovers show the increase in size from the Sojourner rover of the Mars Pathfinder project, to the twin Mars Exploration Rovers Spirit and Opportunity, to the Mars Science Laboratory rover.",
      "dateCreated": "2008-11-19",
      "instrument": "JPL",
      "url": "/nasa-photos/sojourner/1.jpg"
    },
    {
      "nasaId": "PIA04422",
      "title": "Rovers and Sojourner",
      "description": "The twin rovers of NASAa Mars Exploration Rover Mission pose with their groundbreaking predecessor, the flight spare of the Sojourner rover from NASA 1997 Pathfinder mission.",
      "dateCreated": "2003-02-26",
      "instrument": "JPL",
      "url": "/nasa-photos/sojourner/2.jpg"
    }
  ],
  "phoenix": [
    {
      "nasaId": "KSC-07pd2075",
      "title": "KSC-07pd2075",
      "description": "KENNEDY SPACE CENTER, FLA. — Attached to an overhead crane, the Phoenix Mars Lander is lifted up alongside the mobile service tower on Launch Pad 17-A at Cape Canaveral Air Force Station. Once inside the tower, the lander will be mated to the Delta II launch vehicle. Launch of NA",
      "dateCreated": "2007-07-23",
      "instrument": "KSC",
      "url": "/nasa-photos/phoenix/0.jpg"
    },
    {
      "nasaId": "KSC-07pd2078",
      "title": "KSC-07pd2078",
      "description": "KENNEDY SPACE CENTER, FLA. — The Phoenix Mars Lander is lifted into the upper level of the mobile service tower on Launch Pad 17-A at Cape Canaveral Air Force Station. The lander will be mated to the Delta II launch vehicle. Launch of NASA's Phoenix Mars Lander is scheduled for A",
      "dateCreated": "2007-07-23",
      "instrument": "KSC",
      "url": "/nasa-photos/phoenix/1.jpg"
    },
    {
      "nasaId": "KSC-07pd2079",
      "title": "KSC-07pd2079",
      "description": "KENNEDY SPACE CENTER, FLA. — The Phoenix Mars Lander is moved inside the upper level of the mobile service tower on Launch Pad 17-A at Cape Canaveral Air Force Station. The lander will be mated to the Delta II launch vehicle. Launch of NASA's Phoenix Mars Lander is scheduled for ",
      "dateCreated": "2007-07-23",
      "instrument": "KSC",
      "url": "/nasa-photos/phoenix/2.jpg"
    }
  ],
  "mro": [
    {
      "nasaId": "PIA21494",
      "title": "Rover Landing Hardware at Eagle Crater, Mars",
      "description": "The bright landing platform left behind by NASA's Mars Exploration Rover Opportunity in 2004 is visible inside Eagle Crater, at upper right in this April 8, 2017, observation by NASA's Mars Reconnaissance Orbiter. Mars Reconnaissance Orbiter arrived at Mars in March 2006, more th",
      "dateCreated": "2017-04-21",
      "instrument": "JPL",
      "url": "/nasa-photos/mro/0.jpg"
    },
    {
      "nasaId": "PIA21586",
      "title": "Sources of Gullies in Hale Crater",
      "description": "Color from the High Resolution Imaging Science Experiment (HiRISE) instrument onboard NASA's Mars Reconnaissance Orbiter can show mineralogical differences due to the near-infrared filter. The sources of channels on the north rim of Hale Crater show fresh blue, green, purple and ",
      "dateCreated": "2017-04-12",
      "instrument": "JPL",
      "url": "/nasa-photos/mro/1.jpg"
    },
    {
      "nasaId": "PIA08813",
      "title": "Victoria Crater at Meridiani Planum",
      "description": "This image from the HiRISE instrument on NASA Mars Reconnaissance Orbiter shows Victoria crater, an impact crater at Meridiani Planum, near the equator of Mars.",
      "dateCreated": "2006-10-06",
      "instrument": "JPL",
      "url": "/nasa-photos/mro/2.jpg"
    }
  ],
  "apollo11": [
    {
      "nasaId": "624073main_1969-04-04_full",
      "title": "Apollo 11 Lunar Module",
      "description": "The Lunar Module for Apollo 11 moves from the landing gear fixture and mate to the spacecraft-lunar module adapter.",
      "dateCreated": "1969-04-04",
      "instrument": "KSC",
      "url": "/nasa-photos/apollo11/0.jpg"
    },
    {
      "nasaId": "as11-37-5445",
      "title": "Apollo 11 Command/Service modules photographed from Lunar Module in orbit",
      "description": "AS11-37-5445 (20 July 1969) --- The Apollo 11 Command and Service Modules (CSM) are photographed from the Lunar Module (LM) in lunar orbit during the Apollo 11 lunar landing mission. The lunar surface below is in the north central Sea of Fertility. The coordinates of the center o",
      "dateCreated": "1969-07-20",
      "instrument": "JSC",
      "url": "/nasa-photos/apollo11/1.jpg"
    },
    {
      "nasaId": "as11-44-6626",
      "title": "Apollo 11 Lunar Module ascent stage photographed from Command Module",
      "description": "AS11-44-6626 (21 July 1969) --- The Apollo 11 Lunar Module (LM) ascent stage, with astronauts Neil A. Armstrong and Edwin E. Aldrin Jr. aboard, is photographed from the Command and Service Modules (CSM) in lunar orbit. Astronaut Michael Collins, command module pilot, remained wit",
      "dateCreated": "1969-07-21",
      "instrument": "JSC",
      "url": "/nasa-photos/apollo11/2.jpg"
    }
  ],
  "apollo12": [
    {
      "nasaId": "as12-46-6728",
      "title": "Apollo 12 Mission image - Dark view of Astronaut Alan L. Bean climbing down the ladder of the Lunar Module (LM)",
      "description": "AS12-46-6728 (19 Nov. 1969) --- Astronaut Alan L. Bean, lunar module pilot for the Apollo 12 mission, is about to step off the ladder of the Lunar Module to join astronaut Charles Conrad Jr., mission commander, in extravehicular activity (EVA). Conrad and Bean descended in the Ap",
      "dateCreated": "1969-11-19",
      "instrument": "JSC",
      "url": "/nasa-photos/apollo12/0.jpg"
    },
    {
      "nasaId": "as12-48-7034",
      "title": "Apollo 12 Mission image - Modular Equipment Stowage Assemble (MESA) and the Fuel Cask on the Lunar Module (LM)",
      "description": "AS12-48-7034 (19 Nov. 1969) --- A close-up view of a portion of quadrant II of the descent stage of the Apollo 12 Lunar Module (LM), photographed during the Apollo 12 extravehicular activity (EVA). At lower left is the LM's Y footpad. The empty Radioisotope Thermoelectric Generat",
      "dateCreated": "1969-11-19",
      "instrument": "JSC",
      "url": "/nasa-photos/apollo12/1.jpg"
    },
    {
      "nasaId": "AS12-46-6832",
      "title": "Apollo 12 Mission image - View of lunar surface mound",
      "description": "AS12-46-6832 (19 Nov. 1969) --- A close-up view of a lunar mound as photographed during the Apollo 12 extravehicular activity (EVA) on the lunar surface. Astronaut Richard F. Gordon Jr., command module pilot, remained with the Apollo 12 Command and Service Modules (CSM) in lunar ",
      "dateCreated": "1969-11-19",
      "instrument": "JSC",
      "url": "/nasa-photos/apollo12/2.jpg"
    }
  ],
  "apollo14": [
    {
      "nasaId": "as14_66_09232",
      "title": "Astronaut Alan Shepard during Apollo 14 EVA on the moon",
      "description": "AS14-66-9232 (5 Feb. 1971) --- Astronaut Alan B. Shepard Jr., commander of the Apollo 14 lunar landing mission, stands by the deployed United States flag on the lunar surface during the early moments of the first extravehicular activity (EVA) of the mission. Shadows of the Lunar ",
      "dateCreated": "1971-02-05",
      "instrument": "JSC",
      "url": "/nasa-photos/apollo14/0.jpg"
    },
    {
      "nasaId": "as14-66-9233",
      "title": "Apollo 14 Mission image - Astronaut Edgar D. Mitchell, lunar module pilot for the Apollo 14 lunar landing mission, stand",
      "description": "AS14-66-9233 (5 Feb. 1971) --- Astronaut Edgar D. Mitchell, lunar module pilot for the Apollo 14 lunar landing mission, stands by the deployed U.S. flag on the lunar surface during the early moments of the first extravehicular activity (EVA) of the mission. He was photographed by",
      "dateCreated": "1971-02-05",
      "instrument": "JSC",
      "url": "/nasa-photos/apollo14/1.jpg"
    },
    {
      "nasaId": "AS14-68-9405",
      "title": "View of the Central Station of the ALSEP deploy by Apollo 14 astronauts",
      "description": "AS14-68-9405 (6 Feb. 1971) --- Astronaut Alan B. Shepard Jr., Apollo 14 commander, assembles a double core tube as he stands beside the rickshaw-type portable workbench or modularized equipment transporter (MET) unique to this mission. The photograph was taken by astronaut Edgar ",
      "dateCreated": "1971-02-05",
      "instrument": "JSC",
      "url": "/nasa-photos/apollo14/2.jpg"
    }
  ],
  "apollo15": [
    {
      "nasaId": "9250827",
      "title": "Saturn Apollo Program",
      "description": "The fifth marned lunar landing mission, Apollo 15 (SA-510), carrying a crew of three astronauts: Mission commander David R. Scott, Lunar Module pilot James B. Irwin, and Command Module pilot Alfred M. Worden Jr., lifted off on July 26, 1971. Astronauts Scott and Irwin were the fi",
      "dateCreated": "1971-07-26",
      "instrument": "MSFC",
      "url": "/nasa-photos/apollo15/0.jpg"
    },
    {
      "nasaId": "S71-38189",
      "title": "Artists concept of Apollo 15 crewmen performing deployment of LRV",
      "description": "S71-38189 (26 June 1971) --- An artist's concept showing the final steps of readying the Apollo 15 Lunar Roving Vehicle (LRV) or Rover 1 for mobility on the lunar surface. Performing the last few LRV deployment tasks here are, left to right, astronauts James B. Irwin, lunar modul",
      "dateCreated": "1971-06-26",
      "instrument": "JSC",
      "url": "/nasa-photos/apollo15/1.jpg"
    },
    {
      "nasaId": "s71-24079",
      "title": "s71-24079",
      "description": "S71-24079 (1971) --- Astronauts Richard F. Gordon Jr., right, and Harrison H. Schmitt ? back-up crew members for the Apollo 15 lunar landing mission -- traverse in an Earth-bound training version of the Apollo Lunar Roving Vehicle (LRV or Rover) during geology training in Hawaii.",
      "dateCreated": "2013-09-11",
      "instrument": "JSC",
      "url": "/nasa-photos/apollo15/2.jpg"
    }
  ],
  "apollo16": [
    {
      "nasaId": "9515834",
      "title": "Saturn Apollo Program",
      "description": "This view of the back side of the Moon was captured by the Apollo 16 mission crew. The sixth manned lunar landing mission, the Apollo 16 (SA-511), carrying three astronauts: Mission Commander John W. Young, Command Module pilot Thomas K. Mattingly II, and Lunar Module pilot Charl",
      "dateCreated": "1972-04-18",
      "instrument": "MSFC",
      "url": "/nasa-photos/apollo16/0.jpg"
    },
    {
      "nasaId": "GSFC_20171208_Archive_e000501",
      "title": "LRO Finds Apollo 16 Booster Rocket Impact Site",
      "description": "After decades of uncertainty, the Apollo 16 S-IVB impact site on the lunar surface has been identified. S-IVBs were portions of the Saturn V rockets that brought astronauts to the moon. The site was identified in imagery from the high-resolution LROC Narrow Angle Camera aboard NA",
      "dateCreated": "2017-12-08",
      "instrument": "GSFC",
      "url": "/nasa-photos/apollo16/1.jpg"
    },
    {
      "nasaId": "KSC-20220508-PH-SNQ01_0001",
      "title": "Apollo 15 Landing Site: Hadley - Apennine region of the Moon",
      "description": "NASA’s Exploration Ground Systems’ Program Manager Shawn Quinn captured this image of the Hadley–Apennine region of the moon including the Apollo 15 landing site (very near the edge of the shadow of one of the lunar mountains in the area). Image is a crop of a full frame image. A",
      "dateCreated": "2022-05-08",
      "instrument": "KSC",
      "url": "/nasa-photos/apollo16/2.jpg"
    }
  ],
  "apollo17": [
    {
      "nasaId": "as17-145-22162",
      "title": "Apollo 17,Sta 5,Panoramic",
      "description": "AS17-145-22162 (7-19 Dec. 1972) --- One of the Apollo 17 crew photographed this view during lunar surface extravehicular activities (EVA) at the Taurus-Littrow landing site. The Lunar Rover Vehicle (LRV), which was used extensively by astronauts Eugene A. Cernan and Harrison H. S",
      "dateCreated": "2009-03-24",
      "instrument": "JSC",
      "url": "/nasa-photos/apollo17/0.jpg"
    },
    {
      "nasaId": "as17-137-20979",
      "title": "Close-up of lunar roving vehicle at Apollo 17 Taurus-Littrow landing site",
      "description": "AS17-137-20979 (12 Dec. 1972) --- A close-up view of the lunar roving vehicle (LRV) at the Taurus-Littrow landing site photographed during Apollo 17 lunar surface extravehicular activity. Note the makeshift repair arrangement on the right rear fender of the LRV. During EVA-1 a ha",
      "dateCreated": "1972-12-12",
      "instrument": "JSC",
      "url": "/nasa-photos/apollo17/1.jpg"
    }
  ],
  "lro": [
    {
      "nasaId": "GSFC_20171208_Archive_e001054",
      "title": "Soaring Over Lunar Mt. Hadley",
      "description": "Apollo mission planners selected an adventurous landing site for Apollo 15 located on a relatively small patch of lava plains, called &quot;mare&quot; on the moon. This site is nestled between the towering Apennine mountains to the east, attaining heights of 3-5 km (about 10,000-",
      "dateCreated": "2017-12-08",
      "instrument": "GSFC",
      "url": "/nasa-photos/lro/0.jpg"
    },
    {
      "nasaId": "PIA12890",
      "title": "The Moon in 3-D",
      "description": "NASA Lunar Reconnaissance Orbiter looks at the Moon in 3D. 3D glasses are necessary to view this image.",
      "dateCreated": "2009-07-21",
      "instrument": "JPL",
      "url": "/nasa-photos/lro/1.jpg"
    },
    {
      "nasaId": "PIA13008",
      "title": "Alphonsus Crater Mantled Floor Fracture",
      "description": "Many fractures on the Moon are seen in the floors of ancient, flat-floored highlands craters in this image taken by NASA Lunar Reconnaissance Orbiter.",
      "dateCreated": "2010-04-02",
      "instrument": "JPL",
      "url": "/nasa-photos/lro/2.jpg"
    }
  ],
  "lunokhod1": [
    {
      "nasaId": "PIA14859",
      "title": "Off-Earth Driving Champs in Miles",
      "description": "The total distance driven on Mars by NASA Mars Exploration Rover, 21.35 miles by early December 2011, is approaching the record total for off-Earth driving, held by the robotic Lunokhod 2 rover operated on Earth moon by the Soviet Union in 1973.",
      "dateCreated": "2011-12-07",
      "instrument": "JPL",
      "url": "/nasa-photos/lunokhod1/0.jpg"
    },
    {
      "nasaId": "PIA14860",
      "title": "Off-Earth Driving Champs in Kilometers",
      "description": "The total distance driven on Mars by NASA Mars Exploration Rover, 34.36 kilometers by early December 2011, is approaching the record total for off-Earth driving, held by the robotic Lunokhod 2 rover operated on Earth moon by the Soviet Union in 1973.",
      "dateCreated": "2009-10-13",
      "instrument": "JPL",
      "url": "/nasa-photos/lunokhod1/1.jpg"
    }
  ],
  "lunokhod2": [
    {
      "nasaId": "PIA14859",
      "title": "Off-Earth Driving Champs in Miles",
      "description": "The total distance driven on Mars by NASA Mars Exploration Rover, 21.35 miles by early December 2011, is approaching the record total for off-Earth driving, held by the robotic Lunokhod 2 rover operated on Earth moon by the Soviet Union in 1973.",
      "dateCreated": "2011-12-07",
      "instrument": "JPL",
      "url": "/nasa-photos/lunokhod2/0.jpg"
    },
    {
      "nasaId": "PIA14860",
      "title": "Off-Earth Driving Champs in Kilometers",
      "description": "The total distance driven on Mars by NASA Mars Exploration Rover, 34.36 kilometers by early December 2011, is approaching the record total for off-Earth driving, held by the robotic Lunokhod 2 rover operated on Earth moon by the Soviet Union in 1973.",
      "dateCreated": "2009-10-13",
      "instrument": "JPL",
      "url": "/nasa-photos/lunokhod2/1.jpg"
    }
  ],
  "surveyor3": [
    {
      "nasaId": "AS12-48-7134",
      "title": "Apollo 12 Mission image - Astronaut Alan L. Bean,lunar module pilot,and two U.S. spacecraft",
      "description": "AS12-48-7134 (20 Nov. 1969) --- This unusual photograph, taken during the second Apollo 12 extravehicular activity (EVA), shows two U.S. spacecraft on the surface of the moon. The Apollo 12 Lunar Module (LM) is in the background. The unmanned Surveyor 3 spacecraft is in the foreg",
      "dateCreated": "1969-11-20",
      "instrument": "JSC",
      "url": "/nasa-photos/surveyor3/0.jpg"
    },
    {
      "nasaId": "AS12-48-7133",
      "title": "View of two U.S. spacecraft on the surface of the moon",
      "description": "AS12-48-7133 (20 Nov. 1969) --- This unusual photograph, taken during the second Apollo 12 extravehicular activity (EVA), shows two U.S. spacecraft on the surface of the moon. The Apollo 12 Lunar Module (LM) is in the background. The unmanned Surveyor 3 spacecraft is in the foreg",
      "dateCreated": "1969-11-20",
      "instrument": "JSC",
      "url": "/nasa-photos/surveyor3/1.jpg"
    },
    {
      "nasaId": "S69-55553",
      "title": "ARTIST CONCEPT - SURVEYOR III - OCEAN OF STORM",
      "description": "S69-55553 (October 1969) --- Ryan Aeronautical Company artist's concept depicting a close-up view of Surveyor 3 resting in the Ocean of Storms on the lunar nearside. Two Apollo 12 astronauts are seen approaching in the background. The Apollo 12 Lunar Module (LM) is in the left ba",
      "dateCreated": "1969-10-23",
      "instrument": "JSC",
      "url": "/nasa-photos/surveyor3/2.jpg"
    }
  ],
  "iss": [
    {
      "nasaId": "international-space-station-mockup-training_52233924879_o",
      "title": "International Space Station mockup training",
      "description": "Expedition 68 trains for their upcoming International Space Station mission inside a mockup that models the real orbiting lab at NASA's Johnson Space Center in Houston, Texas. Credit: NASA/James Blair",
      "dateCreated": "2022-05-13",
      "instrument": "JSC",
      "url": "/nasa-photos/iss/0.jpg"
    },
    {
      "nasaId": "200623_ISS_1",
      "title": "2020 International Space Station Configuration",
      "description": "2020 International Space Station Configuration",
      "dateCreated": "2020-06-24",
      "instrument": "JSC",
      "url": "/nasa-photos/iss/1.jpg"
    },
    {
      "nasaId": "KSC-20171017-PH_ISS01_0001",
      "title": "Veg-03D Experiment Onboard the International Space Station",
      "description": "Veg-03D Experiment Onboard the International Space Station. First time three different plant varieties are being grown simultaneously in the Veggie chamber -- Mizuna mustard, Waldmann's green lettuce and Outredgeous Red Romaine lettuce.",
      "dateCreated": "2017-10-17",
      "instrument": "KSC",
      "url": "/nasa-photos/iss/2.jpg"
    }
  ],
  "hubble": [
    {
      "nasaId": "sts061-s-097",
      "title": "Mission control activity during STS-61 EVA",
      "description": "Flight controller Susan P. Rainwater observes as two astronauts work through a lengthy period of extravehicular activity (EVA) in the cargo bay of the Earth-looking Space Shuttle Endeavour. Rainwater's EVA console was one of Mission Control's busiest during this eleven-day Hubble",
      "dateCreated": "1993-12-07",
      "instrument": "JSC",
      "url": "/nasa-photos/hubble/0.jpg"
    },
    {
      "nasaId": "s125e007413",
      "title": "View of the HST docked with the Space Shuttle Atlantis",
      "description": "S125-E-007413 (14 May 2009) --- A medium view of a portion of the Hubble Space Telescope, locked down in the cargo bay of the Earth-orbiting Space Shuttle Atlantis, which will be site of a great deal of hands on servicing over the next five days.",
      "dateCreated": "2009-05-13",
      "instrument": "JSC",
      "url": "/nasa-photos/hubble/1.jpg"
    },
    {
      "nasaId": "jsc2009e121338",
      "title": "STS-125 IO Support",
      "description": "JSC2009-E-121338 (20 May 2009) --- President Barack Obama talks to the crew of the STS-125 mission, orbiting Earth aboard the Space Shuttle Atlantis the day after the crew released the freshly serviced Hubble Space Telescope. Photo credit: NASA/White House/Pete Souza",
      "dateCreated": "2009-05-21",
      "instrument": "JSC",
      "url": "/nasa-photos/hubble/2.jpg"
    }
  ],
  "jwst": [
    {
      "nasaId": "GSFC_20171208_Archive_e001822",
      "title": "Being \"Secondary\" is Important for a Webb Telescope Mirror",
      "description": "NASA release July 19, 2011 Click here to learn about the James Webb Space Telescope The secondary mirror (shown here) was polished at the L3 Integrated Optical Systems - Tinsley in Richmond, Calif. to accuracies of less than one millionth of an inch. That accuracy is important fo",
      "dateCreated": "2017-12-08",
      "instrument": "GSFC",
      "url": "/nasa-photos/jwst/0.jpg"
    },
    {
      "nasaId": "GSFC_20171208_Archive_e001823",
      "title": "Being \"Secondary\" is Important for a Webb Telescope Mirror",
      "description": "NASA release July 19, 2011 Click here to learn about the James Webb Space Telescope The secondary mirror (shown here) was polished at the L3 Integrated Optical Systems - Tinsley in Richmond, Calif. to accuracies of less than one millionth of an inch. That accuracy is important fo",
      "dateCreated": "2017-12-08",
      "instrument": "GSFC",
      "url": "/nasa-photos/jwst/1.jpg"
    },
    {
      "nasaId": "GSFC_20171208_Archive_e001917",
      "title": "The Webb Telescope's Actuators: Curving Mirrors in Space",
      "description": "NASA image release December 9, 2010 Caption: The James Webb Space Telescope's Engineering Design Unit (EDU) primary mirror segment, coated with gold by Quantum Coating Incorporated. The actuator is located behind the mirror. Credit: Photo by Drew Noel NASA's James Webb Space Tele",
      "dateCreated": "2017-12-08",
      "instrument": "GSFC",
      "url": "/nasa-photos/jwst/2.jpg"
    }
  ],
  "juno": [
    {
      "nasaId": "PIA24237",
      "title": "PIA24237",
      "description": "This composite of images from the JunoCam imager aboard NASA's Juno spacecraft shows the eight circumpolar cyclones around a central cyclone located at Jupiter's north pole. The sizes of these cyclones range from 1,500 miles (2,400 kilometers) to 1,740 miles (2,800 kilometers) ac",
      "dateCreated": "2020-12-14",
      "instrument": "JPL",
      "url": "/nasa-photos/juno/0.jpg"
    },
    {
      "nasaId": "PIA26295",
      "title": "NASA's Juno Catches 3 Waves of Jupiter's Polar Cyclones",
      "description": "This composite shows views of Jupiter's northern polar cyclones in three different wavelengths of light – microwave, visible, and ultraviolet – as captured by NASA's Juno mission. These differing perspectives allowed Juno scientists to deduce that all Jovian polar cyclones are no",
      "dateCreated": "2024-04-18",
      "instrument": "JPL",
      "url": "/nasa-photos/juno/1.jpg"
    },
    {
      "nasaId": "PIA25730",
      "title": "NASA's Juno Mission Captures Close-Ups of Polar Storms on Jupiter",
      "description": "During its 65th close flyby of Jupiter on Sept. 20, 2024, NASA's Juno spacecraft captured this series of images as it approached the giant planet and swung low over its north polar region. Juno's recent orbits have provided exceptionally clear views of Jupiter's circumpolar cyclo",
      "dateCreated": "2025-01-27",
      "instrument": "JPL",
      "url": "/nasa-photos/juno/2.jpg"
    }
  ],
  "cassini": [
    {
      "nasaId": "PIA12543",
      "title": "Color Between Moons",
      "description": "Two of Saturn moons straddle the planet rings in this color view from NASA Cassini spacecraft. Mimas is closest to NASA Cassini spacecraft here. Epimetheus is on the far side of the rings. Saturn shadow cuts across the middle of the rings.",
      "dateCreated": "2010-02-05",
      "instrument": "JPL",
      "url": "/nasa-photos/cassini/0.jpg"
    },
    {
      "nasaId": "PIA06538",
      "title": "The Adventure Ahead",
      "description": "Saturn shadow stretches across the rings in this image captured by NASA Cassini spacecraft.",
      "dateCreated": "2004-12-08",
      "instrument": "JPL",
      "url": "/nasa-photos/cassini/1.jpg"
    },
    {
      "nasaId": "PIA12639",
      "title": "Bisected Crescent",
      "description": "The rings split the planet in two in this NASA Cassini spacecraft view of a crescent Saturn. Saturn moon Tethys is the small dot on the left of the image, below the rings.",
      "dateCreated": "2010-05-24",
      "instrument": "JPL",
      "url": "/nasa-photos/cassini/2.jpg"
    }
  ],
  "huygens": [
    {
      "nasaId": "KSC-97PC915",
      "title": "KSC-97PC915",
      "description": "KENNEDY SPACE CENTER, FLA. -- A Centaur upper stage is prepared for hoisting at Launch Pad 40 at Cape Canaveral Air Station to be mated with the Titan IV expendable launch vehicle that will propel the Cassini spacecraft and the European Space Agency's Huygens probe to Saturn and ",
      "dateCreated": "1997-06-20",
      "instrument": "KSC",
      "url": "/nasa-photos/huygens/0.jpg"
    },
    {
      "nasaId": "KSC-97PC916",
      "title": "KSC-97PC916",
      "description": "KENNEDY SPACE CENTER, FLA. -- A Centaur upper stage is hoisted at Launch Pad 40 at Cape Canaveral Air Station for mating with the Titan IV expendable launch vehicle that will propel the Cassini spacecraft and the European Space Agency's Huygens probe to Saturn and its moon Titan.",
      "dateCreated": "1997-06-20",
      "instrument": "KSC",
      "url": "/nasa-photos/huygens/1.jpg"
    },
    {
      "nasaId": "KSC-97pc595",
      "title": "KSC-97pc595",
      "description": "The Huygens probe, which will study the clouds, atmosphere and surface of Saturn's largest moon, Titan, as part of the Cassini mission to Saturn, is prepared for transport from the Skid Strip, Cape Canaveral Air Station (CCAS), after being off-loaded from a plane. The probe was d",
      "dateCreated": "1997-04-02",
      "instrument": "KSC",
      "url": "/nasa-photos/huygens/2.jpg"
    }
  ],
  "venera13": [
    {
      "nasaId": "S91-50687",
      "title": "Magellan 3D perspective of Venus surface in western Eistla Regio",
      "description": "Magellan synthetic aperture radar data was used to create this three- dimensional (3D) perspective view of Venus' western Eistla Regio. This viewpoint is located at 1,310 kilometers (812 miles) southwest of Gula Mons at an elevation of 0.178 kilometers (0.48 miles). The view is o",
      "dateCreated": "1991-10-29",
      "instrument": "JSC",
      "url": "/nasa-photos/venera13/0.jpg"
    },
    {
      "nasaId": "PIA00478",
      "title": "Venus - Global View Centered at 180 degrees",
      "description": "This global view of the surface of Venus is centered at 180 degrees east longitude. Magellan synthetic aperture radar mosaics from the first cycle of Magellan mapping, and a 5 degree latitude-longitude grid, are mapped onto a computer-simulated globe to create this image. Data ga",
      "dateCreated": "1996-11-26",
      "instrument": "JPL",
      "url": "/nasa-photos/venera13/1.jpg"
    },
    {
      "nasaId": "PIA00481",
      "title": "Venus - Three-Dimensional Perspective View of Alpha Region",
      "description": "A portion of Alpha Regio is displayed in this three-dimensional perspective view of the surface of Venus from NASA Magellan spacecraft. In 1963, Alpha Regio was the first feature on Venus to be identified from Earth-based radar.",
      "dateCreated": "1996-12-02",
      "instrument": "JPL",
      "url": "/nasa-photos/venera13/2.jpg"
    }
  ],
  "messenger": [
    {
      "nasaId": "PIA19419",
      "title": "Unmasking the Secrets of Mercury",
      "description": "The MASCS instrument onboard NASA MESSENGER spacecraft was designed to study both the exosphere and surface of Mercury. To learn more about the minerals and surface processes on Mercury, the Visual and Infrared Spectrometer (VIRS) portion of MASCS has been diligently collecting s",
      "dateCreated": "2015-04-16",
      "instrument": "JPL",
      "url": "/nasa-photos/messenger/0.jpg"
    },
    {
      "nasaId": "GSFC_20171208_Archive_e001544",
      "title": "False Color View of Mercury",
      "description": "This colorful view of Mercury was produced by using images from the color base map imaging campaign during MESSENGER's primary mission. These colors are not what Mercury would look like to the human eye, but rather the colors enhance the chemical, mineralogical, and physical diff",
      "dateCreated": "2017-12-08",
      "instrument": "GSFC",
      "url": "/nasa-photos/messenger/1.jpg"
    }
  ],
  "rosetta_philae": [
    {
      "nasaId": "PIA21068",
      "title": "Farewell Rosetta: ESA Mission to End on Comet Surface",
      "description": "This view shows Comet 67P/Churyumov-Gerasimenko as seen by the OSIRIS wide-angle camera on ESA's Rosetta spacecraft on September 29, 2016, when Rosetta was at an altitude of 14 miles (23 kilometers). The European Space Agency's (ESA) Rosetta mission will come to a dramatic end on",
      "dateCreated": "2016-09-29",
      "instrument": "JPL",
      "url": "/nasa-photos/rosetta_philae/0.jpg"
    },
    {
      "nasaId": "PIA18596",
      "title": "Comet Surface Variations",
      "description": "This image from ESA Rosetta spacecraft is of 67P/Churyumov-Gerasimenko shows the diversity of surface structures on the comet nucleus.",
      "dateCreated": "2014-08-14",
      "instrument": "JPL",
      "url": "/nasa-photos/rosetta_philae/1.jpg"
    },
    {
      "nasaId": "PIA17484",
      "title": "3-D Models of Comet 67P/Churyumov-Gerasimenko Nucleus",
      "description": "Hubble measured the size, shape and rotational period of the Rosetta mission backup target, comet 67P/Churyumov-Gerasimenko 67P/C-G.",
      "dateCreated": "2003-09-05",
      "instrument": "JPL",
      "url": "/nasa-photos/rosetta_philae/2.jpg"
    }
  ],
  "newhorizons": [
    {
      "nasaId": "PIA21025",
      "title": "Pluto Methane Snowcaps on the Edge of Darkness context",
      "description": "This area is south of Pluto's dark equatorial band informally named Cthulhu Regio, and southwest of the vast nitrogen ice plains informally named Sputnik Planitia. North is at the top; in the western portion of the image, a chain of bright mountains extends north into Cthulhu Reg",
      "dateCreated": "2016-08-31",
      "instrument": "JPL",
      "url": "/nasa-photos/newhorizons/0.jpg"
    },
    {
      "nasaId": "PIA21026",
      "title": "Pluto Methane Snowcaps on the Edge of Darkness",
      "description": "This area is south of Pluto's dark equatorial band informally named Cthulhu Regio, and southwest of the vast nitrogen ice plains informally named Sputnik Planitia. North is at the top; in the western portion of the image, a chain of bright mountains extends north into Cthulhu Reg",
      "dateCreated": "2016-08-31",
      "instrument": "JPL",
      "url": "/nasa-photos/newhorizons/1.jpg"
    },
    {
      "nasaId": "PIA21863",
      "title": "Soaring over Pluto",
      "description": "In July 2015, NASA's New Horizons spacecraft sent home the first close-up pictures of Pluto and its moons. Using actual New Horizons data and digital elevation models of Pluto and its largest moon, Charon, mission scientists created flyover movies that offer spectacular new persp",
      "dateCreated": "2017-07-14",
      "instrument": "JPL",
      "url": "/nasa-photos/newhorizons/2.jpg"
    }
  ],
  "voyager1": [
    {
      "nasaId": "PIA23645",
      "title": "Pale Blue Dot Revisited",
      "description": "For the 30th anniversary of one of the most iconic images taken by NASA's Voyager mission, a new version of the image known as \"the Pale Blue Dot.\" Planet Earth is visible as a bright speck within the sunbeam just right of center and appears softly blue, as in the original versio",
      "dateCreated": "2020-02-12",
      "instrument": "JPL",
      "url": "/nasa-photos/voyager1/0.jpg"
    },
    {
      "nasaId": "PIA22915",
      "title": "Voyager 2 Spacecraft Instruments",
      "description": "This illustration of NASA's Voyager 2 spacecraft shows the location of the onboard science instruments that are still operating: the magnetometer, the cosmic ray subsystem, the plasma science experiment, the low-energy charged particle instrument and the antennas used by the plas",
      "dateCreated": "2018-12-10",
      "instrument": "JPL",
      "url": "/nasa-photos/voyager1/1.jpg"
    },
    {
      "nasaId": "PIA14111",
      "title": "Model of Voyager Artist Concept",
      "description": "This artist rendering shows NASA Voyager spacecraft. Voyager 2 was launched on Aug. 20, 1977. Voyager 1 was launched on Sept. 5, 1977.",
      "dateCreated": "2011-04-29",
      "instrument": "JPL",
      "url": "/nasa-photos/voyager1/2.jpg"
    }
  ],
  "voyager2": [
    {
      "nasaId": "ARC-1986-AC86-7042",
      "title": "ARC-1986-AC86-7042",
      "description": "Range : 1 illion km. ( 600,000 mi. ) Resolution : 140 km. ( 90 mi. ) P-29539C This Voyager 2 image of Uranus was captured as the spacecraft was leaving Uranus behind on its cruise to Neptune. The image is a color composite of three photographs taken through blue, grren, and orang",
      "dateCreated": "1986-01-24",
      "instrument": "ARC",
      "url": "/nasa-photos/voyager2/0.jpg"
    },
    {
      "nasaId": "ARC-1989-A89-7039",
      "title": "ARC-1989-A89-7039",
      "description": "P-34712 Range: 1.1 million kilometers (683,000 miles) This wide-angle Voyager 2 image, taken through the camera's clear filter, is the first to show Neptune's rings in detail. The two main rings, about 53,000 km (33,000 miles) and 63,000 km (39,000 miles) from Neptune, are 5 to 1",
      "dateCreated": "1989-08-26",
      "instrument": "ARC",
      "url": "/nasa-photos/voyager2/1.jpg"
    },
    {
      "nasaId": "7994970",
      "title": "Space Science",
      "description": "On February 5, 1979, Voyager 1 made its closest approach to Jupiter since early 1974 and 1975 when Pioneers 10 and 11 made their voyages to Jupiter and beyond. Voyager 1 completed its Jupiter encounter in early April, after taking almost 19,000 pictures and recording many other s",
      "dateCreated": "1979-02-05",
      "instrument": "MSFC",
      "url": "/nasa-photos/voyager2/2.jpg"
    }
  ],
  "milkyway": [
    {
      "nasaId": "PIA12348",
      "title": "Great Observatories Unique Views of the Milky Way",
      "description": "In celebration of the International Year of Astronomy 2009, NASA's Great Observatories -- the Hubble Space Telescope, the Spitzer Space Telescope, and the Chandra X-ray Observatory -- have produced a matched trio of images of the central region of our Milky Way galaxy. Each image",
      "dateCreated": "2009-11-10",
      "instrument": "JPL",
      "url": "/nasa-photos/milkyway/0.jpg"
    },
    {
      "nasaId": "PIA20070",
      "title": "Map of Exoplanet Search Areas",
      "description": "In a global experiment in exoplanet observation, the K2 mission and Earth-based observatories on six continents will survey millions of stars toward the center of our Milky Way galaxy.",
      "dateCreated": "2016-04-07",
      "instrument": "JPL",
      "url": "/nasa-photos/milkyway/1.jpg"
    },
    {
      "nasaId": "PIA17446",
      "title": "Big Data on the Big Screen",
      "description": "The center of the Milky Way galaxy imaged by NASA Spitzer Space Telescope is displayed on a quarter-of-a-billion-pixel, high-definition 23-foot-wide 7-meter LCD science visualization screen at NASA Ames Research Center.",
      "dateCreated": "2013-10-17",
      "instrument": "JPL",
      "url": "/nasa-photos/milkyway/2.jpg"
    }
  ],
  "sagittarius_a": [
    {
      "nasaId": "0300607",
      "title": "History of Chandra X-Ray Observatory",
      "description": "A 2 week observation through the optic eye of the Chandra X-Ray Observatory revealed this sturning explosion occurring in the super massive black hole at the Milky Way's center, known as Sagittarius A or Sgr A*. Huge lobes of 20-million degree Centigrade gas ( red loops in image)",
      "dateCreated": "2003-01-06",
      "instrument": "MSFC",
      "url": "/nasa-photos/sagittarius_a/0.jpg"
    },
    {
      "nasaId": "PIA16213",
      "title": "First Look at Milky Way Monster in High-Energy X-ray Light",
      "description": "These images, taken by NASA black-hole hunter, NuSTAR, are the first, focused high-energy X-ray views of the area surrounding the supermassive black hole, called Sagittarius A*, at the center of our galaxy.",
      "dateCreated": "2012-10-23",
      "instrument": "JPL",
      "url": "/nasa-photos/sagittarius_a/1.jpg"
    },
    {
      "nasaId": "PIA17009",
      "title": "Hustle and Bustle at Center of Milky Way",
      "description": "This artist concept illustrates the frenzied activity at the core of our Milky Way galaxy. The galactic center hosts a supermassive black hole in the region known as Sagittarius A*, or Sgr A*, with a mass of about four million times that of our sun.",
      "dateCreated": "2013-05-07",
      "instrument": "JPL",
      "url": "/nasa-photos/sagittarius_a/2.jpg"
    }
  ],
  "cygnus_x1": [
    {
      "nasaId": "8003548",
      "title": "High Energy Astronomy Observatory (HEAO)",
      "description": "This image of the suspected Black Hole, Cygnus X-1, was the first object seen by the High Energy Astronomy Observatory (HEAO)-2/Einstein Observatory. According to the theories to date, one concept of a black hole is a star, perhaps 10 times more massive than the Sun, that has ent",
      "dateCreated": "1980-01-01",
      "instrument": "MSFC",
      "url": "/nasa-photos/cygnus_x1/0.jpg"
    },
    {
      "nasaId": "9126011",
      "title": "Spacelab",
      "description": "This image shows a part of the Cygnus loop supernova remnant, taken by the Ultraviolet Imaging Telescope (UIT) on the Astro Observatory during the Astro-1 mission (STS-35) on December 5, 1990. Pictured is a portion of the huge Cygnus loop, an array of interstellar gas clouds that",
      "dateCreated": "1990-12-05",
      "instrument": "MSFC",
      "url": "/nasa-photos/cygnus_x1/1.jpg"
    }
  ],
  "gaia_bh1": [
    {
      "nasaId": "deml241_lmc_p3_circled",
      "title": "LMC P3",
      "description": "This composite image contains data from Chandra (purple) that provides evidence for the survival of a companion star from the blast of a supernova explosion. Chandra's X-rays reveal a point-like source in the supernova remnant at the location of a massive star. The data suggest t",
      "dateCreated": "2016-10-10",
      "instrument": "GSFC",
      "url": "/nasa-photos/gaia_bh1/0.jpg"
    },
    {
      "nasaId": "deml241",
      "title": "Hardy Star Survives Supernova Blast",
      "description": "This composite image contains data from Chandra (purple) that provides evidence for the survival of a companion star from the blast of a supernova explosion. Chandra's X-rays reveal a point-like source in the supernova remnant at the location of a massive star. The data suggest t",
      "dateCreated": "2014-03-20",
      "instrument": "GSFC",
      "url": "/nasa-photos/gaia_bh1/1.jpg"
    },
    {
      "nasaId": "0002272",
      "title": "History of Chandra X-Ray Observatory",
      "description": "Chandra X-Ray Observatory took this first x-ray picture of the Andromeda Galaxy (M31) on October 13, 1999. The blue dot in the center of the image is a \"cool\" million-degree x-ray source where a supermassive black hole with the mass of 30-million suns is located. The x-rays are p",
      "dateCreated": "1999-10-13",
      "instrument": "MSFC",
      "url": "/nasa-photos/gaia_bh1/2.jpg"
    }
  ],
  "grs_1915": [
    {
      "nasaId": "PIA08617",
      "title": "Black Hole Spills Kaleidoscope of Color",
      "description": "This new false-colored image from NASA Hubble, Chandra and Spitzer space telescopes shows a giant jet of particles that has been shot out from the vicinity of a type of supermassive black hole called a quasar.",
      "dateCreated": "2006-07-21",
      "instrument": "JPL",
      "url": "/nasa-photos/grs_1915/0.jpg"
    },
    {
      "nasaId": "GSFC_20171208_Archive_e002148",
      "title": "Winds of Change",
      "description": "Observation Date: 1 pointing on Dec 4, 2000 and 9 pointings between Nov 18 and Dec 5, 2008. Distance Estimate: About 50 million light years away. This is a composite image of NGC 1068, one of the nearest and brightest galaxies containing a rapidly growing supermassive black hole.",
      "dateCreated": "2017-12-08",
      "instrument": "GSFC",
      "url": "/nasa-photos/grs_1915/1.jpg"
    },
    {
      "nasaId": "0202374",
      "title": "History of Chandra X-Ray Observatory",
      "description": "This is a photo taken by NASA's Chandra X-ray Observatory that reveals the remains of an explosion in the form of two enormous arcs of multimillion-degree gas in the galaxy Centaurus A that appear to be part of a ring 25,000 light years in diameter. The size and location of the r",
      "dateCreated": "2002-07-31",
      "instrument": "MSFC",
      "url": "/nasa-photos/grs_1915/2.jpg"
    }
  ],
  "crab_pulsar": [
    {
      "nasaId": "PIA20347",
      "title": "Versatile Instrument to Scout for Kuiper Belt Objects",
      "description": "This image of the Crab Pulsar was taken with CHIMERA, an instrument at the Palomar Observatory, which is operated by the California Institute of Technology.",
      "dateCreated": "2016-03-03",
      "instrument": "JPL",
      "url": "/nasa-photos/crab_pulsar/0.jpg"
    },
    {
      "nasaId": "7890338",
      "title": "High Energy Astronomy Observatory (HEAO)",
      "description": "This image is of the Crab Nebula in visible light photographed by the Hale Observatory optical telescope in 1959. The faint object at the center had been identified as a pulsar and is thought to be the remains of the original star. It had been observed as a pulsar in visible ligh",
      "dateCreated": "1959-01-01",
      "instrument": "MSFC",
      "url": "/nasa-photos/crab_pulsar/1.jpg"
    },
    {
      "nasaId": "9905980",
      "title": "History of Chandra X-Ray Observatory",
      "description": "After barely 2 months in space, the Chandra X-Ray Observatory (CXO) took this sturning image of the Crab Nebula, the spectacular remains of a stellar explosion, revealing something never seen before, a brilliant ring around the nebula's heart. The image shows the central pulsar s",
      "dateCreated": "1999-09-01",
      "instrument": "MSFC",
      "url": "/nasa-photos/crab_pulsar/2.jpg"
    }
  ],
  "vela_pulsar": [
    {
      "nasaId": "8000103",
      "title": "High Energy Astronomy Observatory (HEAO)",
      "description": "Like the Crab Nebula, the Vela Supernova Remnant has a radio pulsar at its center. In this image taken by the High Energy Astronomy Observatory (HEAO)-2/Einstein Observatory, the pulsar appears as a point source surrounded by weak and diffused emissions of x-rays. HEAO-2's comput",
      "dateCreated": "1980-01-01",
      "instrument": "MSFC",
      "url": "/nasa-photos/vela_pulsar/0.jpg"
    }
  ],
  "nebula_orion": [
    {
      "nasaId": "PIA04227",
      "title": "Orion Nebula and Bow Shock",
      "description": "Astronomers using NASA Hubble Space Telescope have found a bow shock around a very young star in the nearby Orion nebula, an intense star-forming region of gas and dust.",
      "dateCreated": "1999-12-02",
      "instrument": "JPL",
      "url": "/nasa-photos/nebula_orion/0.jpg"
    },
    {
      "nasaId": "PIA25434",
      "title": "Orion Nebula in Infrared",
      "description": "This new image of the Orion Nebula produced using previously released data from three telescopes shows two enormous caverns carved out by unseen giant stars that can release up to a million times more light than our Sun. All that radiation breaks apart dust grains there, helping ",
      "dateCreated": "2022-11-22",
      "instrument": "JPL",
      "url": "/nasa-photos/nebula_orion/1.jpg"
    },
    {
      "nasaId": "0302062",
      "title": "History of Hubble Space Telescope (HST)",
      "description": "The nearby intense star-forming region known as the Great Nebula in the Orion constellation reveals a bow shock around a very young star as seen by NASA's Hubble Space Telescope (HST). Named for the crescent-shaped wave made by a ship as it moves through the water, a bow shock ca",
      "dateCreated": "1995-02-01",
      "instrument": "MSFC",
      "url": "/nasa-photos/nebula_orion/2.jpg"
    }
  ],
  "nebula_eagle": [
    {
      "nasaId": "PIA25433",
      "title": "The Eagle Nebula Observed by WISE",
      "description": "The dusty face of the Eagle Nebula and its surroundings are revealed in this image based on data from NASA's Wide Field Survey Explorer (WISE). WISE detects infrared light, or a range of wavelengths longer than what the human eye can see. This large star forming region is about 5",
      "dateCreated": "2022-11-11",
      "instrument": "JPL",
      "url": "/nasa-photos/nebula_eagle/0.jpg"
    },
    {
      "nasaId": "GSFC_20171208_Archive_e000732",
      "title": "Pillars of Creation Revealed in 3-D",
      "description": "This video clip shows a visualisation of the three-dimensional structure of the Pillars of Creation within the star formation region Messier 16 (also called the Eagle Nebula). It is based on new observations of the object using the MUSE instrument on ESO’s Very Large Telescope in",
      "dateCreated": "2017-12-08",
      "instrument": "GSFC",
      "url": "/nasa-photos/nebula_eagle/1.jpg"
    },
    {
      "nasaId": "GSFC_20171208_Archive_e000842",
      "title": "Hubble Goes High Def to Revisit the Iconic 'Pillars of Creation'",
      "description": "This NASA Hubble Space Telescope image, taken in near-infrared light, transforms the pillars into eerie, wispy silhouettes, which are seen against a background of myriad stars. The near-infrared light can penetrate much of the gas and dust, revealing stars behind the nebula as we",
      "dateCreated": "2017-12-08",
      "instrument": "GSFC",
      "url": "/nasa-photos/nebula_eagle/2.jpg"
    }
  ],
  "nebula_carina": [
    {
      "nasaId": "carina_nebula",
      "title": "James Webb Space Telescope NIRCam Image of the “Cosmic Cliffs” in Carina Nebula",
      "description": "What looks much like craggy mountains on a moonlit evening is actually the edge of a nearby, young, star-forming region NGC 3324 in the Carina Nebula. Captured in infrared light by the Near-Infrared Camera (NIRCam) on NASA’s James Webb Space Telescope, this image reveals previous",
      "dateCreated": "2022-07-12",
      "instrument": "STScI (Webb)",
      "url": "/nasa-photos/nebula_carina/0.jpg"
    },
    {
      "nasaId": "NHQ202207120010",
      "title": "JWST’s First Full-Color Images",
      "description": "The image captured by NASA’s James Webb Space Telescope of the star-forming region called NGC 3324 in the Carina Nebula is seen on a screen as members of the media and guests watch the broadcast releasing the first full-color images from NASA’s James Webb Space Telescope, Tuesday",
      "dateCreated": "2022-07-12",
      "instrument": "HQ",
      "url": "/nasa-photos/nebula_carina/1.jpg"
    },
    {
      "nasaId": "NHQ202207120021",
      "title": "JWST’s First Full-Color Images",
      "description": "NASA James Webb Space Telescope Deputy Project Scientist for Communications Amber Straughn speaks about the infrared image of the star-forming region called NGC 3324 in the Carina Nebula as it is shown on a screen during a broadcast releasing the telescope’s first full-color imag",
      "dateCreated": "2022-07-12",
      "instrument": "HQ",
      "url": "/nasa-photos/nebula_carina/2.jpg"
    }
  ],
  "nebula_crab": [
    {
      "nasaId": "PIA03606",
      "title": "Most Detailed Image of the Crab Nebula",
      "description": "The Crab Nebula is one of the most intricately structured and highly dynamical objects ever observed. The new Hubble image of the Crab was assembled from 24 individual exposures taken with the NASA/ESA Hubble Space Telescope",
      "dateCreated": "2005-12-01",
      "instrument": "JPL",
      "url": "/nasa-photos/nebula_crab/0.jpg"
    },
    {
      "nasaId": "GSFC_20171208_Archive_e000053",
      "title": "Observatories Combine to Crack Open the Crab Nebula",
      "description": "Astronomers have produced a highly detailed image of the Crab Nebula, by combining data from telescopes spanning nearly the entire breadth of the electromagnetic spectrum, from radio waves seen by the Karl G. Jansky Very Large Array (VLA) to the powerful X-ray glow as seen by the",
      "dateCreated": "2017-12-08",
      "instrument": "GSFC",
      "url": "/nasa-photos/nebula_crab/1.jpg"
    },
    {
      "nasaId": "GSFC_20171208_Archive_e000054",
      "title": "Observatories Combine to Crack Open the Crab Nebula",
      "description": "Astronomers have produced a highly detailed image of the Crab Nebula, by combining data from telescopes spanning nearly the entire breadth of the electromagnetic spectrum, from radio waves seen by the Karl G. Jansky Very Large Array (VLA) to the powerful X-ray glow as seen by the",
      "dateCreated": "2017-12-08",
      "instrument": "GSFC",
      "url": "/nasa-photos/nebula_crab/2.jpg"
    }
  ],
  "nebula_helix": [
    {
      "nasaId": "PIA15658",
      "title": "NGC 7293, the Helix Nebula",
      "description": "NGC 7293, better known as the Helix nebula, displays its ultraviolet glow courtesy of NASA GALEX. The Helix is the nearest example of a planetary nebula, which is the eventual fate of a star, like our own Sun, as it approaches the end of its life.",
      "dateCreated": "2012-05-16",
      "instrument": "JPL",
      "url": "/nasa-photos/nebula_helix/0.jpg"
    },
    {
      "nasaId": "PIA09178",
      "title": "Comets Kick up Dust in Helix Nebula",
      "description": "This infrared image from NASA Spitzer Space Telescope shows the Helix nebula, a cosmic starlet often photographed by amateur astronomers for its vivid colors and eerie resemblance to a giant eye.",
      "dateCreated": "2007-02-12",
      "instrument": "JPL",
      "url": "/nasa-photos/nebula_helix/1.jpg"
    },
    {
      "nasaId": "PIA07902",
      "title": "Planetary Nebula NGC 7293 also Known as the Helix Nebula",
      "description": "This ultraviolet image from NASA Galaxy Evolution Explorer is of the planetary nebula NGC 7293 also known as the Helix Nebula. It is the nearest example of what happens to a star, like our own Sun, as it approaches the end of its life when it runs out of fuel, expels gas outward ",
      "dateCreated": "2005-05-05",
      "instrument": "JPL",
      "url": "/nasa-photos/nebula_helix/2.jpg"
    }
  ]
};

export function getOfflineNasaPhotos(
  id: string,
  _fallbackQuery?: string,
): OfflineNasaPhoto[] {
  const key = id.trim().toLowerCase();
  if (OFFLINE_NASA_CATALOG[key] && OFFLINE_NASA_CATALOG[key].length > 0) {
    return OFFLINE_NASA_CATALOG[key];
  }
  return OFFLINE_NASA_CATALOG.milkyway ?? [];
}
