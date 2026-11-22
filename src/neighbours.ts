import type {PointData} from "pixi.js"
import type {Background} from "./background"

// What decorates a house: strings of fairy lights, lit kandils hung from its eaves and a
// rangoli design on its porch, none of which the player can touch
type Decorators = {
  lights?: {hangFixed: (from: PointData, to: PointData, colour: number) => void}
  kandils?: {hangFixed: (tiedAt: PointData, length: number, paper: number, tails: number) => void}
  rangoli?: {putFixed: (at: PointData, random: () => number) => void}
}

// Eaves shorter than this, in scene units, have no string of lights along them, and
// longer than this have two kandils from them rather than one, a little way in from
// their ends
const shortestStrung = 60
const twoKandils = 200
// Strings of lights hang from this far in from an eave's ends, and this far below it,
// and kandils by strings this long
const strungIn = 6
const strungBelow = 3
const kandilString = {least: 10, most: 22}

// The same random numbers every time for a house, so each neighbour's decorated the same
// way whenever the game's played
const seeded = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// One thing put up on a neighbour's house: a string of lights, a kandil or a rangoli
type Decoration = {kind: "lights" | "kandil" | "rangoli", put: () => void}

// What each house but the player's is decorated with, in the order it's put up, by the
// house's place on the street: a string of lights along each of its eaves, all of a
// colour or mixed, a lit kandil or two hung from its longest, and a rangoli in the middle
// of its porch. Nothing's put up until each is put
const neighbourDecorations = (background: Background, {lights, kandils, rangoli}: Decorators) =>
  background.houses.map(({eaves, porch}, idx) => {
    const decorations: Decoration[] = []
    if (idx === background.home()) {
      return decorations
    }
    const random = seeded(idx * 7919 + 17)
    const colour = Math.floor(random() * 100)
    eaves.forEach(([left, right]) => {
      if (lights && right.x - left.x >= shortestStrung) {
        decorations.push({kind: "lights", put: () => lights.hangFixed(
          {x: left.x + strungIn, y: left.y + strungBelow},
          {x: right.x - strungIn, y: right.y + strungBelow},
          colour,
        )})
      }
    })
    const longest = eaves.reduce<[PointData, PointData] | undefined>(
      (best, eave) => !best || eave[1].x - eave[0].x > best[1].x - best[0].x ? eave : best, undefined)
    if (longest && kandils) {
      const [left, right] = longest
      const length = right.x - left.x
      const paper = Math.floor(random() * 100)
      const tails = Math.floor(random() * 100)
      const along = length >= twoKandils ? [0.22, 0.78] : [0.5]
      along.forEach((share, k) => {
        const string = kandilString.least + random() * (kandilString.most - kandilString.least)
        decorations.push({kind: "kandil", put: () => kandils.hangFixed(
          {x: left.x + length * share, y: left.y}, string, paper + k, tails + k)})
      })
    }
    if (rangoli) {
      const middle = {
        x: porch.reduce((sum, point) => sum + point.x, 0) / porch.length,
        y: porch.reduce((sum, point) => sum + point.y, 0) / porch.length,
      }
      // The house's random numbers go on into its design: all the others have been
      // drawn by now, so it's the same design whenever it's put
      decorations.push({kind: "rangoli", put: () => rangoli.putFixed(middle, random)})
    }
    return decorations
  })

// Every house but the player's, decorated already for Diwali, as the neighbours have
// done theirs
const decorateNeighbours = (background: Background, decorators: Decorators) =>
  neighbourDecorations(background, decorators).forEach(decorations => decorations.forEach(({put}) => put()))

export {decorateNeighbours, neighbourDecorations}
export type {Decoration}
