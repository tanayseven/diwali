import type {PointData} from "pixi.js"

// The other houses along the street, each drawn by night in its own SVG, in scene
// units from its top left corner (scripts/art/houses.py draws them, and prints these). What the game
// needs to know of each: its name (a key of LL.houses), its size, its porch floor by
// its corners going round from the back left, its open front door from its top to its
// step, the bottom edges of its eaves, which kandils hang from, and the pots of plants
// standing on its porch, by the middle of their feet. In the order they stand in,
// from the left; the main house stands between the second and the third

type HouseDrawing = {
  name: HouseName
  url: string
  size: {width: number, height: number}
  porch: PointData[]
  door: {left: number, right: number, top: number, bottom: number}
  eaves: [PointData, PointData][]
  pots: PointData[]
}

type HouseName = "deepaNiwas" | "lakshmiSadan" | "thulasiMana" | "saiKrupa" | "ganeshKunj" | "anandVilla"

const neighbours: HouseDrawing[] = [
  {
    name: "lakshmiSadan",
    url: "sprites/houses/lakshmi-sadan.svg",
    size: {width: 640, height: 440},
    porch: [{x: 24, y: 340}, {x: 616, y: 340}, {x: 632, y: 420}, {x: 8, y: 420}],
    door: {left: 95, right: 157, top: 225, bottom: 340},
    eaves: [[{x: 30, y: 193}, {x: 610, y: 193}]],
    pots: [{x: 60, y: 354}, {x: 176, y: 354}],
  },
  {
    name: "thulasiMana",
    url: "sprites/houses/thulasi-mana.svg",
    size: {width: 620, height: 450},
    porch: [{x: 24, y: 350}, {x: 596, y: 350}, {x: 612, y: 430}, {x: 8, y: 430}],
    door: {left: 258, right: 316, top: 235, bottom: 350},
    eaves: [[{x: 20, y: 243}, {x: 600, y: 243}], [{x: 130, y: 114}, {x: 485, y: 114}]],
    pots: [{x: 48, y: 362}, {x: 575, y: 362}],
  },
  {
    name: "saiKrupa",
    url: "sprites/houses/sai-krupa.svg",
    size: {width: 600, height: 470},
    porch: [{x: 24, y: 370}, {x: 576, y: 370}, {x: 592, y: 450}, {x: 8, y: 450}],
    door: {left: 250, right: 308, top: 255, bottom: 370},
    eaves: [[{x: 40, y: 241}, {x: 580, y: 241}], [{x: 40, y: 111}, {x: 580, y: 111}]],
    pots: [{x: 84, y: 384}, {x: 336, y: 384}],
  },
  {
    name: "ganeshKunj",
    url: "sprites/houses/ganesh-kunj.svg",
    size: {width: 560, height: 400},
    porch: [{x: 24, y: 300}, {x: 536, y: 300}, {x: 552, y: 380}, {x: 8, y: 380}],
    door: {left: 140, right: 196, top: 196, bottom: 300},
    eaves: [[{x: 40, y: 134}, {x: 520, y: 134}], [{x: 66, y: 168}, {x: 266, y: 168}]],
    pots: [{x: 38, y: 314}],
  },
  {
    name: "anandVilla",
    url: "sprites/houses/anand-villa.svg",
    size: {width: 660, height: 420},
    porch: [{x: 24, y: 320}, {x: 636, y: 320}, {x: 652, y: 400}, {x: 8, y: 400}],
    door: {left: 306, right: 364, top: 205, bottom: 320},
    eaves: [[{x: 205, y: 192}, {x: 475, y: 192}], [{x: 30, y: 177}, {x: 230, y: 177}]],
    pots: [{x: 250, y: 334}],
  },
]

// How many of them stand to the left of the main house
const neighboursLeft = 2

export {neighbours, neighboursLeft}
export type {HouseDrawing, HouseName}
