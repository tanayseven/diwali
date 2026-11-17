import {Application, Container, Graphics, PointData, Sprite} from "pixi.js"
import {doorway, porchFloor, porchPots} from "./background"
import type {Background} from "./background"
import {createFigure, looks, makeLook} from "./guestFigures"
import type {Action, Figure, Look, Role} from "./guestFigures"
import type {FireworkKind} from "./fireworks"
import {onHappening} from "./happenings"
import type {Happening} from "./happenings"
import type {Light, Lighting} from "./lighting"

// The family and friends celebrating on the porch. They come out of the house's front
// door now and then, wander about, chat, admire what's lit, and go back in. They turn
// to watch a firework's fuse being lit, stepping back if they're close, cheer or clap
// as it goes off and flinch at a bang; they look up and point at a kandil as it's lit,
// and go over to a diya as it's lit to fold their hands to it. Now and then one comes
// out with a lit diya of their own and puts it down on the porch floor, where it's
// the player's like any other. They're only seen, never pressed: presses go through
// them to whatever's behind

// What they can see on the porch, from the tools that put it there
type Porch = {
  diyas?: {
    placedAt: () => (PointData & {lit: boolean})[]
    placeLitDiya: (at: PointData, facing: "left" | "right") => void
  }
  fireworks?: {
    placedAt: () => (PointData & {alight: boolean})[]
    placeForGuest: (kind: FireworkKind, at: PointData) => object
    lightForGuest: (firework: object, at: PointData) => boolean
    spent: () => (PointData & {firework: object, since: number})[]
    clearSpent: (firework: object) => boolean
  }
  kandils?: {standingAt: () => PointData[], litAt: () => PointData[]}
}

// A house the guests live in: its open door, from its top to the step at its foot,
// the porch floor in front of it, by its corners going round from the back left, and
// the pots of plants standing on it, by the middle of their feet
type Home = {
  door: {left: number, right: number, top: number, bottom: number}
  floor: PointData[]
  pots: PointData[]
}

// Someone in the family: how they look, how fast they walk (scene units a second, at
// a full stride), how soon after the scene starts they first come out, whether
// they're a child, and who they follow in and out and stay near, by their place in
// the family
type Member = {look: Look, speed: number, firstOut: number, child?: boolean, follows?: number}

// The first house, the one the scene's built round
const firstHome: Home = {
  door: {left: doorway.topLeft.x, right: doorway.bottomRight.x, top: doorway.topLeft.y, bottom: doorway.bottomRight.y},
  floor: porchFloor,
  pots: porchPots,
}

// And its family. The grandson follows his grandfather in and out, and stays near him
const firstFamily: Member[] = [
  {look: looks.grandfather, speed: 22, firstOut: 2},
  {look: looks.grandson, speed: 34, firstOut: 2.8, child: true, follows: 0},
  {look: looks.sari, speed: 28, firstOut: 7},
  {look: looks.youngMan, speed: 32, firstOut: 12},
  {look: looks.girl, speed: 36, firstOut: 17, child: true},
]

// A source of randomness that gives the same numbers from the same seed, so a house's
// family looks the same each time
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// A family made up for a house from a seed: grandparents, perhaps, a couple or two,
// and children, who each follow one of the grown-ups, and their outfits and looks
const familyFor = (seed: number): Member[] => {
  const random = seeded(seed)
  const roles: Role[] = []
  if (random() < 0.6) {
    roles.push("grandfather")
  }
  if (random() < 0.6) {
    roles.push("grandmother")
  }
  roles.push("man", "woman")
  if (random() < 0.4) {
    roles.push(random() < 0.5 ? "man" : "woman")
  }
  if (random() < 0.5) {
    roles.push("teen")
  }
  const kids = 1 + Math.floor(random() * 2)
  for (let idx = 0; idx < kids; idx++) {
    roles.push(random() < 0.5 ? "boy" : "girl")
  }
  const grownUps = roles.flatMap((role, idx) => ["man", "woman", "grandfather", "grandmother"].includes(role) ? [idx] : [])
  return roles.map((role, idx) => {
    const child = role === "boy" || role === "girl"
    const elder = role === "grandfather" || role === "grandmother"
    return {
      look: makeLook(role, random),
      speed: elder ? 20 + random() * 4 : child ? 33 + random() * 5 : 27 + random() * 6,
      firstOut: 1 + idx * 3 + random() * 3,
      child: child || role === "teen",
      follows: child ? grownUps[Math.floor(random() * grownUps.length)] : undefined,
    }
  })
}

const random = (min: number, max: number) => min + (max - min) * Math.random()
const chance = (share: number) => Math.random() < share
const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)]
const distance = (a: PointData, b: PointData) => Math.hypot(a.x - b.x, a.y - b.y)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// How tall a grown-up is at the back of the porch and at its front, in scene units:
// a little shorter than the door, and taller as they come nearer
const figureHeight = 105
const tallBack = 84
const tallFront = 96

// How far a bang is heard from, across the scene, to flinch at it
const bangHeard = 420
// How often they look round for fireworks alight too near them or their way, in
// seconds, and how much nearer than they'd keep from one that counts as too near
const lookRoundEvery = 0.25
const tooNear = 0.85
// How close they come to things, and how far they keep from a lit firework
const keepFromPot = 26
const keepFromDiya = 24
const keepFromFirework = 36
const keepFromAlight = 120
const keepFromKandil = 28
// The most diyas on the porch for any more to be put down by a guest, and the most
// they put down in all
const mostDiyas = 18
const mostGuestDiyas = 12
// The fireworks they bring out to set off, the commoner ones more often, how many can
// be on their porch, lit or not, for them to bring out another, how far from anyone
// they put one down, and how long a burnt-out one's left before it's cleared away
const guestFireworks: FireworkKind[] = ["anar", "anar", "anar", "chakri", "chakri", "chakri", "rocket", "rocket", "laddi", "sutli"]
const mostFireworks = 5
const fireworkClearance = 60
const clearAfter = 6
// How far the diya they bring out lights up round it, and how brightly, and the match
// they light a firework with
const carriedLightRadius = 70
const carriedLightStrength = 0.75
const carriedGlowRadius = 9
const matchLightRadius = 34
const matchGlowRadius = 5

type Step =
  // Walking to a point at a share of their speed, doing something with their arms as
  // they go, like carrying a diya
  | {do: "walk", to: PointData, pace?: number, action?: Action, fleeing?: boolean}
  // Doing something where they stand for a while, turned to face a point if given
  | {do: "act", action: Action, for: number, face?: PointData}
  // Putting down the diya they're carrying where they planned to
  | {do: "place"}
  // Putting down the firework they've brought, taking out a match, and lighting it
  | {do: "putFirework"}
  | {do: "lightFirework"}
  // Picking up a burnt-out firework, to take away
  | {do: "pickUp"}
  // Out of sight inside the house, for a while or until the one they follow comes out
  | {do: "inside", for: number}

type Guest = {
  figure: Figure
  child: boolean
  speed: number
  x: number
  y: number
  facing: 1 | -1
  // Where they are in their plan, and how long they've been at its current step
  plan: Step[]
  elapsed: number
  isInside: boolean
  // When they last came out, and how long they'll stay out this time
  outSince: number
  stayFor: number
  // Where they mean to put the diya they're carrying, if they are
  carrying?: PointData
  // The firework they've brought out, where they mean to put it, and once it's down,
  // what to light it by
  firework?: {kind: FireworkKind, spot: PointData, placed?: object}
  // A burnt-out firework they're going over to clear away
  clearing?: PointData & {firework: object}
  // When they'll next think of setting off a firework
  nextFireworkAt: number
  // When they'll next think of bringing out a diya
  nextDiyaAt: number
  leader?: Guest
  // Going back in, so the one following goes too
  leaving: boolean
  // Something they've noticed and are about to turn to, and when
  noticed?: {happening: Happening, at: number}
  // Until when they're flinching, so a string of bangs doesn't keep them at it
  startledUntil: number
  // The doorway, to hide them behind its frame as they go through it
  mask: Graphics
  // A copy of them, posed the same, cut out of the house's lit windows behind them
  silhouette: Figure
  light?: Light
  glow: Sprite
}

// A family on a house's porch, coming and going through its door
const createGuests = (
  app: Application, background: Background, lighting: Lighting, porch: Porch,
  home: Home = firstHome, family: Member[] = firstFamily,
) => {
  const layer = background.decorations
  const {floor, pots} = home
  const isOnFloor = (point: PointData) => isInside(point, floor)
  // The porch floor's back edge, along the foot of the walls, and its front edge
  const porchBack = Math.min(...floor.map(point => point.y))
  const porchFront = Math.max(...floor.map(point => point.y))
  const door = {...home.door, middle: (home.door.left + home.door.right) / 2}
  // Where they stand to come and go: in the lit room a step inside, on the doorstep,
  // and on the porch in front of the door
  const inside = {x: door.middle, y: door.bottom - 16}
  const sill = {x: door.middle, y: door.bottom - 3}
  const outside = {x: door.middle, y: porchBack + 10}
  const heightAt = (y: number) => tallBack + (tallFront - tallBack) * (y - porchBack) / (porchFront - porchBack)
  // Their diyas' flames glow through the night
  const glowLayer = new Container()
  glowLayer.eventMode = "none"
  glowLayer.zIndex = lighting.aboveNight
  layer.addChild(glowLayer)
  let now = 0
  let guestDiyas = 0
  const flame = {x: 0, y: 0}

  const guests: Guest[] = family.map(({look, speed, firstOut, child = false}) => {
    const figure = createFigure(look)
    figure.root.eventMode = "none"
    figure.root.visible = false
    const silhouette = createFigure(look)
    silhouette.root.visible = false
    lighting.inFrontOfHouse.addChild(silhouette.root)
    const mask = new Graphics().rect(door.left, door.top, door.right - door.left, door.bottom - door.top + 4).fill(0xffffff)
    mask.visible = false
    layer.addChild(figure.root, mask)
    const glow = new Sprite(lighting.glowTexture)
    glow.anchor.set(0.5)
    glow.tint = 0xffd08a
    glow.blendMode = "add"
    glow.width = glow.height = carriedGlowRadius * 2
    glow.visible = false
    glowLayer.addChild(glow)
    return {
      figure, child, speed, x: inside.x, y: inside.y, facing: 1, plan: [{do: "inside", for: firstOut}], elapsed: 0,
      isInside: true, outSince: 0, stayFor: 0, nextDiyaAt: random(25, 60), nextFireworkAt: random(40, 90), leaving: false,
      startledUntil: 0, mask, glow,
      silhouette,
    }
  })
  family.forEach(({follows}, idx) => {
    guests[idx].leader = follows === undefined ? undefined : guests[follows]
  })
  const others = (guest: Guest) => guests.filter(other => other !== guest && !other.isInside)
  // The fireworks on their own porch, any of them alight, and the burnt-out ones there
  // long enough to clear away that nobody's already going to
  const fireworksHere = () => (porch.fireworks?.placedAt() ?? []).filter(isOnFloor)
  const claimed = new Set<object>()
  const spentHere = () => (porch.fireworks?.spent() ?? [])
    .filter(spent => isOnFloor(spent) && spent.since > clearAfter && !claimed.has(spent.firework))
  // Whether a grown-up could go and fetch a firework to set off now
  const couldSetOff = (guest: Guest) => !guest.child && porch.fireworks !== undefined && now >= guest.nextFireworkAt
    && fireworksHere().length < mostFireworks && !fireworksHere().some(firework => firework.alight)
    && !guests.some(other => other.firework)

  // Whether there's room for another diya from a guest, with so many on the porch now,
  // counting those other guests are already carrying out
  const room = (diyasNow: number, carrier?: Guest) => {
    const carried = guests.filter(guest => guest.carrying && guest !== carrier).length
    return guestDiyas + carried < mostGuestDiyas && diyasNow + carried < mostDiyas
  }

  // How near a point comes to the straight line between two others
  const fromLine = (point: PointData, from: PointData, to: PointData) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const along = clamp(((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy || 1), 0, 1)
    return Math.hypot(point.x - from.x - dx * along, point.y - from.y - dy * along)
  }

  // Whether the way from one point to another keeps clear of something by a distance,
  // or at least leads away from it, when they're already that close to it
  const clearOf = (thing: PointData, from: PointData, to: PointData, keep: number) =>
    distance(thing, from) <= keep ? distance(thing, to) > distance(thing, from) : fromLine(thing, from, to) > keep

  // A point on the porch floor a guest could stand at, clear of the pots and of what's
  // been put down, and well away from any firework that's alight, or nothing if none's
  // found. Near a point, if given, within a reach of it. Walking there from a point, if
  // given, mustn't take them through a pot or near a firework that's alight either
  const freeSpot = (
    keep: number,
    {near, reach = 80, avoid = [], from}: {near?: PointData, reach?: number, avoid?: PointData[], from?: PointData} = {},
  ) => {
    const diyas = porch.diyas?.placedAt() ?? []
    const fireworks = porch.fireworks?.placedAt() ?? []
    const kandils = porch.kandils?.standingAt() ?? []
    const left = Math.min(...floor.map(point => point.x))
    const right = Math.max(...floor.map(point => point.x))
    for (let attempt = 0; attempt < 40; attempt++) {
      const spot = near
        ? {x: near.x + random(-reach, reach), y: clamp(near.y + random(-reach / 3, reach / 3), porchBack + 6, porchFront - 4)}
        : {x: random(left, right), y: random(porchBack + 6, porchFront - 4)}
      if (isOnFloor(spot)
        && pots.every(pot => distance(pot, spot) > keepFromPot)
        && diyas.every(diya => distance(diya, spot) > keep)
        && kandils.every(kandil => distance(kandil, spot) > keepFromKandil)
        && fireworks.every(firework => distance(firework, spot) > (firework.alight ? keepFromAlight : keepFromFirework))
        && avoid.every(point => distance(point, spot) > keep)
        && (!from || (pots.every(pot => clearOf(pot, from, spot, keepFromPot * 0.6))
          && fireworks.every(firework => !firework.alight || clearOf(firework, from, spot, keepFromAlight))))) {
        return spot
      }
    }
    return undefined
  }

  // Where to stand to put a diya down at a spot, beside it, so it's in front of them
  const besideSpot = (guest: Guest, spot: PointData) => {
    const side = spot.x >= guest.x ? 1 : -1
    return {x: spot.x - side * 22 * guest.figure.size, y: spot.y - 3}
  }

  // Going back into the house, and staying in a while, taking back whatever they're
  // holding, like a diya they couldn't find room for or a burnt-out firework
  const goIn = (guest: Guest): Step[] => {
    guest.leaving = true
    return [
      {do: "walk", to: {x: outside.x + random(-6, 6), y: outside.y}},
      {do: "walk", to: sill, pace: 0.8},
      {do: "walk", to: inside, pace: 0.7},
      {do: "inside", for: guest.leader ? Infinity : random(6, 22)},
    ]
  }

  // Coming out, sometimes bringing a lit diya to put down, or a firework to set off
  const comeOut = (guest: Guest): Step[] => {
    guest.isInside = false
    guest.x = inside.x + random(-4, 4)
    guest.y = inside.y
    guest.outSince = now
    guest.stayFor = random(35, 80)
    const diyasNow = porch.diyas?.placedAt().length ?? Infinity
    const firework = couldSetOff(guest) && chance(0.6)
    const bringing = !firework && porch.diyas && room(diyasNow) && now >= guest.nextDiyaAt && chance(0.6)
    const steps: Step[] = [
      {do: "walk", to: sill, pace: 0.7},
      {do: "walk", to: {x: outside.x + random(-10, 10), y: outside.y + random(4, 14)}, pace: 0.8},
    ]
    if (bringing) {
      const spot = freeSpot(keepFromDiya, {avoid: guests.flatMap(other => other.carrying ? [other.carrying] : [])})
      if (spot) {
        guest.carrying = spot
        guest.figure.carrying("diya")
      }
    }
    if (firework) {
      // Well clear of everyone, and of the way to the door
      const others = guests.filter(other => other !== guest && !other.isInside)
      const spot = freeSpot(fireworkClearance, {avoid: [...others, outside]})
      if (spot) {
        guest.firework = {kind: pick(guestFireworks), spot}
        guest.figure.carrying("firework")
      }
    }
    return steps
  }

  // Putting down the firework they've brought, crouching to light it with a match, and
  // then, as everyone does when a fuse is lit near them, hurrying back from it
  const setOff = (guest: Guest): Step[] => {
    const {spot} = guest.firework!
    return [
      {do: "walk", to: besideSpot(guest, spot)},
      {do: "act", action: "bend", for: 0.6, face: spot},
      {do: "putFirework"},
      {do: "act", action: "bend", for: random(0.8, 1.3), face: spot},
      {do: "lightFirework"},
    ]
  }

  // Going over to a burnt-out firework to pick it up and take it away
  const clearUp = (guest: Guest): Step[] => [
    {do: "walk", to: besideSpot(guest, guest.clearing!)},
    {do: "act", action: "bend", for: 0.7, face: guest.clearing},
    {do: "pickUp"},
    {do: "act", action: "bend", for: 0.3, face: guest.clearing},
  ]

  // Putting down the diya they're carrying
  const putDown = (guest: Guest): Step[] => {
    const spot = guest.carrying!
    return [
      {do: "walk", to: besideSpot(guest, spot), action: "carry"},
      {do: "act", action: "bend", for: 0.7, face: spot},
      {do: "place"},
      {do: "act", action: "bend", for: 0.35, face: spot},
      {do: "act", action: "namaste", for: random(1, 1.8), face: spot},
    ]
  }

  // What to do next, once they've done what they were doing
  const think = (guest: Guest): Step[] => {
    const {leader} = guest
    if (guest.carrying) {
      return putDown(guest)
    }
    if (guest.firework) {
      return setOff(guest)
    }
    if (guest.clearing) {
      return clearUp(guest)
    }
    // Something burnt out picked up goes inside
    if (guest.figure.holding() === "spent") {
      return goIn(guest)
    }
    // A grown-up clears away what's burnt out on the porch, once it's been there a while
    const spent = !guest.child ? spentHere() : []
    if (spent.length && chance(0.6)) {
      const nearest = spent.reduce((best, item) => distance(item, guest) < distance(best, guest) ? item : best)
      claimed.add(nearest.firework)
      guest.clearing = nearest
      return clearUp(guest)
    }
    // And now and then goes in to fetch a firework to set off
    if (!leader && couldSetOff(guest) && chance(0.3)) {
      guest.stayFor = 0
      return goIn(guest)
    }
    if (leader && (leader.isInside || leader.leaving)) {
      return goIn(guest)
    }
    if (!leader && now - guest.outSince > guest.stayFor) {
      return goIn(guest)
    }
    // Every so often, in to fetch a diya to bring out
    if (!leader && porch.diyas && now >= guest.nextDiyaAt && guestDiyas < mostGuestDiyas && chance(0.4)) {
      guest.stayFor = 0
      return goIn(guest)
    }
    if (leader && chance(0.75)) {
      const near = {x: leader.x - leader.facing * random(18, 30), y: clamp(leader.y + random(2, 10), porchBack + 6, porchFront - 4)}
      const spot = isOnFloor(near) ? near : freeSpot(10, {near: leader, reach: 40, from: guest})
      return [
        ...(spot ? [{do: "walk", to: spot, pace: random(0.9, 1.2)} as Step] : []),
        {do: "act", action: chance(0.3) ? "talk" : "idle", for: random(0.8, 2.5), face: leader},
      ]
    }
    const roll = Math.random()
    if (roll < 0.2) {
      // Over to someone for a chat
      const friend = others(guest).filter(other => distance(other, guest) < 260 && !other.leaving)
      if (friend.length) {
        const other = pick(friend)
        const side = guest.x < other.x ? -1 : 1
        const spot = {x: other.x + side * random(30, 40), y: other.y + random(-4, 4)}
        if (isOnFloor(spot)) {
          return [{do: "walk", to: spot}, {do: "act", action: "talk", for: random(2, 4.5), face: other}]
        }
      }
    } else if (roll < 0.4) {
      // Over to admire something lit
      const lit = [...(porch.kandils?.litAt() ?? []), ...(porch.diyas?.placedAt().filter(diya => diya.lit) ?? [])]
      if (lit.length) {
        const thing = pick(lit)
        const spot = freeSpot(keepFromDiya, {near: thing, reach: 60, from: guest})
        if (spot) {
          const up = thing.y < porchBack - 20
          return [
            {do: "walk", to: spot, pace: random(0.7, 1)},
            {do: "act", action: up ? {point: thing} : chance(0.5) ? "namaste" : "idle", for: random(1.5, 3), face: thing},
          ]
        }
      }
    }
    // Or a stroll to somewhere on the porch, and a look round
    const spot = freeSpot(keepFromDiya, {from: guest})
    const steps: Step[] = spot ? [{do: "walk", to: spot, pace: random(0.75, 1.1)}] : []
    steps.push({do: "act", action: "idle", for: random(1, 4)})
    if (chance(0.4)) {
      steps.push({do: "act", action: "idle", for: random(1, 3), face: {x: guest.x + random(-100, 100), y: guest.y}})
    }
    return steps
  }

  // Whatever they were carrying they still mean to put down after, and whatever they
  // were going to set off or clear away, to do
  const resume = (guest: Guest): Step[] =>
    guest.carrying ? putDown(guest) : guest.firework ? setOff(guest) : guest.clearing ? clearUp(guest) : []

  // Hurrying well away from a firework that's alight, out across the porch, or into the
  // house if there's nowhere on it far enough, then turning to watch it
  const awayFrom = (guest: Guest, at: PointData): Step[] => {
    const dx = guest.x - at.x || (chance(0.5) ? 1 : -1)
    const dy = guest.y - at.y
    const along = Math.hypot(dx, dy) || 1
    const back = {
      x: at.x + dx / along * keepFromAlight * 1.3,
      y: clamp(at.y + dy / along * keepFromAlight * 0.5 + random(-8, 8), porchBack + 6, porchFront - 4),
    }
    const spot = isOnFloor(back) && distance(back, at) > keepFromAlight ? back : freeSpot(10, {near: back, reach: 90})
    if (!spot) {
      return goIn(guest)
    }
    return [
      {do: "walk", to: spot, pace: 1.8, fleeing: true},
      {do: "act", action: guest.child ? "cheer" : "idle", for: random(2, 3.5), face: at},
      ...resume(guest),
    ]
  }

  // Every so often, each guest out on the porch looks round for a firework alight too
  // near them, as a chakri skitters about, and hurries away from it, or one too near
  // the way they're walking, and stops short of it to watch it instead
  let lookedRoundAt = 0
  const lookRound = () => {
    const alight = fireworksHere().filter(firework => firework.alight)
    if (!alight.length) {
      return
    }
    const near = keepFromAlight * tooNear
    guests.forEach(guest => {
      const step = guest.plan[0]
      if (guest.isInside || guest.y < porchBack || (step?.do === "walk" && step.fleeing)) {
        return
      }
      const nearest = alight.reduce((best, firework) => distance(firework, guest) < distance(best, guest) ? firework : best)
      if (distance(nearest, guest) < near) {
        guest.plan = awayFrom(guest, nearest)
        guest.elapsed = 0
        return
      }
      const inTheWay = step?.do === "walk" && alight.find(firework => fromLine(firework, guest, step.to) < near)
      if (inTheWay) {
        guest.plan = [{do: "act", action: guest.child ? "cheer" : "idle", for: random(2, 3.5), face: inTheWay}, ...resume(guest)]
        guest.elapsed = 0
      }
    })
  }

  // Something going on that a guest's noticed, a moment after it happened
  const react = (guest: Guest, {kind, at}: Happening) => {
    const away = distance(guest, at)
    const {child} = guest
    const after = () => resume(guest)
    if (kind === "bang") {
      // Heard from across the porch, even from a rocket bursting high above it
      if (Math.abs(guest.x - at.x) > bangHeard || now < guest.startledUntil) {
        return
      }
      const flinch = child && chance(0.6) ? "cheer" : "startle"
      const lasts = flinch === "cheer" ? random(1.2, 2) : random(0.6, 1)
      guest.startledUntil = now + lasts + 1.5
      // Just a flinch, then back to whatever they were doing
      guest.plan.unshift({do: "act", action: flinch, for: lasts, face: at})
      guest.elapsed = 0
      return
    }
    if (kind === "fuse") {
      const watch: Step = {do: "act", action: child ? "cheer" : "idle", for: random(2, 3.5), face: at}
      if (away < keepFromAlight) {
        // Too close: back off from it, quickly, then watch
        guest.plan = awayFrom(guest, at)
      } else if (chance(0.7)) {
        guest.plan = [watch, ...after()]
      } else {
        return
      }
    } else if (kind === "show") {
      if (!chance(0.85)) {
        return
      }
      const action: Action = child ? "cheer" : guest.speed < 25 ? "clap" : pick<Action>(["cheer", "clap", {point: at}])
      guest.plan = [{do: "act", action, for: random(3, 6), face: at}, ...after()]
    } else if (kind === "kandil") {
      if (!chance(0.75)) {
        return
      }
      guest.plan = [{do: "act", action: {point: at}, for: random(2, 3.5), face: at}, ...after()]
    } else if (kind === "diya") {
      if (away > 280 || !chance(0.6)) {
        return
      }
      const spot = freeSpot(keepFromDiya, {near: at, reach: 50, from: guest})
      guest.plan = [
        ...(spot ? [{do: "walk", to: spot, pace: random(0.8, 1.1)} as Step] : []),
        {do: "act", action: "namaste", for: random(1.5, 2.5), face: at},
        ...after(),
      ]
    }
    guest.elapsed = 0
    guest.figure.setAction("idle")
  }

  const stopListening = onHappening(happening => {
    guests.forEach(guest => {
      // Only those out on the porch notice, not those coming or going through the door
      if (!guest.isInside && guest.y >= porchBack && !guest.leaving) {
        guest.noticed = {happening, at: now + random(0.1, 0.6)}
      }
    })
  })

  const face = (guest: Guest, point: PointData) => {
    if (Math.abs(point.x - guest.x) > 2) {
      guest.facing = point.x > guest.x ? 1 : -1
    }
  }

  // Moves a guest on through their plan by a frame, and says how far they walked, in
  // scene units, and how fast, as a share of their own full speed
  const advance = (guest: Guest, dt: number) => {
    if (guest.noticed && now >= guest.noticed.at) {
      const {happening} = guest.noticed
      guest.noticed = undefined
      react(guest, happening)
    }
    if (!guest.plan.length) {
      guest.plan = guest.isInside ? comeOut(guest) : think(guest)
      guest.elapsed = 0
    }
    const step = guest.plan[0]
    guest.elapsed += dt
    let walked = {distance: 0, speed: 0}
    let done = false
    if (step.do === "walk") {
      // Carrying whatever they're holding out in front of them
      guest.figure.setAction(step.action ?? (guest.figure.holding() ? "carry" : "idle"))
      const speed = guest.speed * (step.pace ?? 1)
      const dx = step.to.x - guest.x
      const dy = step.to.y - guest.y
      const left = Math.hypot(dx, dy)
      const move = Math.min(left, speed * dt)
      if (left > 0.01) {
        guest.x += dx / left * move
        guest.y += dy / left * move
        // Turning only for a walk across, not one straight towards the door or away
        if (Math.abs(dx) > 3) {
          guest.facing = dx > 0 ? 1 : -1
        }
      }
      walked = {distance: move, speed: move > 0 ? Math.min(1.2, speed / guest.speed) : 0}
      done = left - move < 0.5
    } else if (step.do === "act") {
      guest.figure.setAction(step.action)
      if (step.face) {
        face(guest, step.face)
      }
      done = guest.elapsed >= step.for
    } else if (step.do === "place") {
      guest.nextDiyaAt = now + random(30, 70)
      if (guest.carrying && porch.diyas && room(porch.diyas.placedAt().length, guest)) {
        porch.diyas.placeLitDiya(guest.carrying, guest.facing > 0 ? "right" : "left")
        guestDiyas++
        guest.carrying = undefined
        guest.figure.carrying()
      } else {
        // The porch has filled up since they set out, so they take it back in, still
        // holding it, rather than folding their hands to nothing
        guest.stayFor = 0
        guest.plan = [step, ...goIn(guest)]
      }
      done = true
    } else if (step.do === "putFirework") {
      const {firework} = guest
      if (firework && !firework.placed && porch.fireworks) {
        firework.placed = porch.fireworks.placeForGuest(firework.kind, firework.spot)
      }
      guest.figure.carrying(firework ? "match" : undefined)
      done = true
    } else if (step.do === "lightFirework") {
      const {firework} = guest
      // Unless it's been picked up or lit since, by the player
      if (firework?.placed) {
        porch.fireworks?.lightForGuest(firework.placed, firework.spot)
      }
      guest.firework = undefined
      guest.figure.carrying()
      guest.nextFireworkAt = now + random(60, 120)
      done = true
    } else if (step.do === "pickUp") {
      const {clearing} = guest
      if (clearing && porch.fireworks?.clearSpent(clearing.firework)) {
        guest.figure.carrying("spent")
      }
      if (clearing) {
        claimed.delete(clearing.firework)
      }
      guest.clearing = undefined
      done = true
    } else {
      guest.isInside = true
      guest.leaving = false
      // Whatever they took back in, they've put away
      guest.carrying = undefined
      guest.firework = undefined
      if (guest.clearing) {
        claimed.delete(guest.clearing.firework)
        guest.clearing = undefined
      }
      guest.figure.carrying()
      const {leader} = guest
      // One following comes out a moment after the one they follow does
      done = guest.elapsed >= step.for
        || (leader !== undefined && !leader.isInside && now - leader.outSince > 0.8)
    }
    if (done) {
      guest.plan.shift()
      guest.elapsed = 0
      if (step.do === "act") {
        guest.figure.setAction("idle")
      }
    }
    return walked
  }

  const tick = () => {
    const dt = Math.min(0.1, app.ticker.deltaMS / 1000)
    now += dt
    if (now - lookedRoundAt >= lookRoundEvery) {
      lookedRoundAt = now
      lookRound()
    }
    guests.forEach(guest => {
      const walked = advance(guest, dt)
      const {figure, mask} = guest
      const {root} = figure
      // Only drawn, and posed, while they're out and on screen, as there are many along
      // the street
      root.visible = !guest.isInside && background.inView(guest.x, guest.y - tallFront / 2, tallFront)
      guest.silhouette.root.visible = false
      if (!root.visible) {
        guest.glow.visible = false
        guest.light?.off()
        return
      }
      const scale = heightAt(guest.y) / figureHeight * figure.size
      root.position.set(guest.x, guest.y)
      root.scale.set(scale * guest.facing, scale)
      root.zIndex = guest.y
      // In the doorway, they're only seen through it, and fade into the room
      const inDoorway = guest.y < porchBack - 2
      if (inDoorway !== (root.mask === mask)) {
        root.mask = inDoorway ? mask : null
        mask.visible = inDoorway
      }
      root.alpha = clamp((guest.y - inside.y) / (sill.y - inside.y), 0, 1)
      // How far they walked in their own units, so their steps keep pace with it
      figure.update(dt, walked.distance / scale, walked.speed)
      guest.silhouette.copyPose(figure)
      guest.silhouette.root.visible = root.alpha > 0.3
      // The diya they're carrying, or the match they're lighting a firework with, lights
      // them and round them
      const lit = figure.flameAt(flame)
      guest.glow.visible = lit !== undefined && root.alpha > 0.5
      if (lit) {
        const match = figure.holding() === "match"
        guest.glow.position.set(flame.x, flame.y)
        guest.glow.width = guest.glow.height = (match ? matchGlowRadius : carriedGlowRadius) * 2
        guest.light ??= lighting.addLight(0xffb35c)
        guest.light.shine(flame, match ? matchLightRadius : carriedLightRadius, carriedLightStrength * root.alpha)
      } else {
        guest.light?.off()
      }
    })
  }
  app.ticker.add(tick)

  return {
    destroy() {
      stopListening()
      app.ticker.remove(tick)
      guests.forEach(guest => {
        guest.figure.destroy()
        guest.silhouette.destroy()
        guest.mask.destroy()
        guest.light?.destroy()
      })
      glowLayer.destroy({children: true})
    },
  }
}

// Whether a point is inside a polygon, by counting the edges a ray from it crosses
const isInside = (point: PointData, polygon: PointData[]) => {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) {
      inside = !inside
    }
  }
  return inside
}

export {createGuests, familyFor}
export type {Home, Member}
