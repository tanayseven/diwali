import {Application, Assets, Container, FederatedPointerEvent, Graphics, Point, PointData, Rectangle, Sprite, Text, Texture} from "pixi.js"
import {fontFamily} from "./app"
import Matter from "matter-js"
import type {Background} from "./background"
import {Item, createHud, cropped, highlight, slotSize} from "./hud"
import {Light, Lighting} from "./lighting"
import {LL} from "./locale"
import {draggedFrom} from "./matchstick"
import {mostOverlapped, screenBox} from "./overlap"
import {accelerate, airFriction, createParticleBody, hangingWorld, place as placeBody, velocityOf} from "./physics"
import {addHint} from "./hints"
import {haptics, refusalShown} from "./feedback"
import {happen} from "./happenings"
import {setOutline} from "./outline"
import {addTooltip, showTooltipOf, Tooltip, wasLongPressed} from "./tooltip"
import {createTouchMarker} from "./touchMarker"
import type {Wind} from "./wind"

// An akash kandil is built up in layers, each drawn on the same 200 by 480 canvas,
// which loads at twice that size, so they line up: its bamboo frame, the paper it's
// wrapped in and the tails hanging below it. scripts/kandil-sprites.py draws them
const papers = ["red", "orange", "blue", "mixed"] as const
type Paper = typeof papers[number]
const tailColours = ["green", "red", "gold", "mixed"] as const
type Tails = typeof tailColours[number]
const frameUrl = "sprites/kandil/frame.svg"
const paperUrl = (paper: Paper) => `sprites/kandil/paper-${paper}.svg`
const tailsUrl = (tails: Tails) => `sprites/kandil/tails-${tails}.svg`
const bulbUrl = "sprites/kandil/bulb.svg"
const kandilAssets = [frameUrl, ...papers.map(paperUrl), ...tailColours.map(tailsUrl), bulbUrl]

// Each is held by the top of its string, at the middle of its canvas's top edge. Its
// frame and paper end at y 444, the bottom band's lower edge, where it stands when
// it's put down and where its tails hang from; they reach down to about y 950
const canvas = {width: 400, height: 960}
const baseY = 444
// Where each drawing sits in its canvas, so it can be cropped to fill a slot
const bodyCrop = new Rectangle(26, 0, 348, 450)
const tailsCrop = new Rectangle(70, 440, 260, 515)
const bulbCrop = new Rectangle(8, 8, 104, 166)
// Hung with its tails, the whole thing is about two thirds as tall as the door, and
// the lantern itself about as wide as a diya is
const kandilScale = 70 / 952
// The middle of the lantern, where the bulb goes, from where it's held
const lampOffset = {x: 0, y: 242}
// Picked up, and given paper, tails or a bulb, by the lantern, not the tails
const bodyArea = new Rectangle(-180, 20, 360, 430)
// Picked up by the lantern and the top of its tails, not the gaps at their ends
const grabArea = new Rectangle(-180, 0, 360, 700)
// Put down on the porch, its tails are heaped round its foot
const heapedTails = {x: 1.25, y: 0.16}
// One that can take what's dragged grows this much while it's over it
const targetGrowth = 1.12

// Lit, its bulb glows through its paper and lights up whatever's round it in the
// paper's colour, flickering a little
const lampColours: Record<Paper, number> = {red: 0xff5a5a, orange: 0xffa24a, blue: 0x6aa8ff, mixed: 0xff9a7a}
const lampRadius = 70
const lampStrength = 0.75
const glowRadius = 32
const glowAlpha = 0.55
// How far off screen, in scene units, one still counts as on it, for its light
const kandilMargin = lampRadius
// A hung one's string runs up to the eave above it, as thin as it's drawn, and
// darkened by the night like the house behind it
const stringWidth = 0.25
const stringColour = 0xe8dcd0
// Hung, it's a pendulum: its weight is at its lamp, held from where its string's tied
// by the string and the kandil above the lamp, swinging under gravity. Just hung, it
// swings by this much, in radians, and the air slows its swing by this share a second.
// The wind pushes it by this share of how much faster the wind's going than it is, a
// second, which leans it over in a gust and sets it swaying as the wind changes
const hangSwing = 0.14
const swingDamping = 0.4
const windPush = 0.85
// A press on a placed one only picks it up once it's dragged this far, on screen
const pickUpSlop = 6

// Making one is shown step by step. The bar's slots are grouped under numbered badges,
// 1 the frame, 2 the paper, 3 the tails and 4 the bulb, above the bar, a step's slots
// faded while no kandil needs it and its badge pulsing while one does
const stepBadgeRadius = 14
const stepLift = 8
const fadedStep = 0.4
// Paper, tails or the bulb dragged this close to a kandil that'd take them, on screen,
// go onto it, a dotted line showing which, though they don't touch it
const magnetPixels = 60
// A kandil can be tapped to pick it, then a slot tapped to give it what's in it; a tap
// is a press that moves less than this, on screen
const tapMove = 12
// After each step, what a kandil needs next floats up above it, for this long, in ms,
// rising this far, on screen
const labelFor = 2600
const labelRise = 26
// While a frame's dragged, where it can go is outlined: the eaves it can hang from, the
// one it would brighter, and the porches' floors
const spotLine = 1.4
const hangLine = 3
// The first time the tool's picked, a hand shows how: a frame dragged up to hang from an
// eave, then paper onto it, each over this long, with a pause between, in ms
const demoFadeIn = 400
const demoMove = 1100
const demoPause = 600
const demoFadeOut = 500

type Kandil = {
  container: Container
  tailsSprite: Sprite
  paperSprite: Sprite
  glow: Sprite
  string: Sprite
  paper?: Paper
  tails?: Tails
  lit: boolean
  light?: Light
  // Where it is: standing on the porch with its foot at a point, or hung, its string
  // tied to the eave above it and hanging that far below it
  place: {on: "porch", at: PointData} | {on: "house", tiedAt: PointData, length: number}
  // Hung, its weight swinging on its string
  pendulum?: {body: Matter.Body, string: Matter.Constraint}
  // Its own offset for its bulb's flicker
  phase: number
}

type Drag =
  // A kandil, a new one from the stack or one picked up, and where to put it back
  | {kind: "kandil", sprite: Container, kandil: Kandil, from?: Kandil["place"], pressedAt?: PointData}
  // Paper, tails or the bulb, from the bar, and where the press that took it out was
  | {kind: "paper", sprite: Sprite, paper: Paper, pressedAt?: PointData}
  | {kind: "tails", sprite: Sprite, tails: Tails, pressedAt?: PointData}
  | {kind: "bulb", sprite: Sprite, pressedAt?: PointData}

// The Craft Kandil tool: akash kandils to make and hang on the house, prepared just as
// diyas are. Its bar holds a stack of bamboo frames, paper in each colour, tails in each
// colour and a bulb. A frame is dragged onto the porch to make it there, or onto the
// house to hang it by its string from the eave above. Paper dragged onto a frame wraps
// it, tails dragged onto a wrapped one hang below it, and the bulb dragged onto one with
// both lights it, glowing in its paper's colour. Made or not, one can be dragged from
// the porch to the house and back, or onto the bar to put its frame back on the stack.
// Let go anywhere else, it goes back where it came from.
// Expects kandilAssets to have been loaded already
const createKandils = (app: Application, background: Background, lighting: Lighting, wind: Wind) => {
  const texture = (url: string) => Assets.get<Texture>(url)
  const container = new Container()
  const bar = createHud(app)
  // Above the bar, so whatever is being dragged is never hidden behind it
  const dragLayer = new Container()
  container.addChild(bar.container, dragLayer)
  // A hand holding whatever a finger drags, its forefinger's tip over it
  const touch = createTouchMarker()
  dragLayer.sortableChildren = true
  dragLayer.addChild(touch.marker, touch.front)

  // Lit ones shine through the night; unlit ones stand among the diyas on the porch,
  // nearer ones in front, or hang in the dark
  const litLayer = new Container()
  litLayer.zIndex = lighting.aboveNight
  // Strings are darkened by the night, and behind everything else placed in the scene
  const stringLayer = new Container()
  stringLayer.zIndex = -1
  stringLayer.eventMode = "none"
  // A string is a thin strip turned to run from where it's tied to where it hangs, as
  // it's cheaper to move than a line drawn afresh as it sways
  const createString = () => {
    const string = new Sprite(Texture.WHITE)
    string.anchor.set(0.5, 0)
    string.width = stringWidth
    string.tint = stringColour
    string.visible = false
    stringLayer.addChild(string)
    return string
  }
  // The string of the one being dragged, up from where it'd hang
  const dragString = createString()
  background.decorations.sortableChildren = true
  background.decorations.addChild(litLayer, stringLayer)
  const placed: Kandil[] = []
  // Hung ones swing with whatever else hangs on the house, touching nothing
  const swinging = hangingWorld(app)
  let drag: Drag | undefined
  let pressed: {kandil: Kandil, at: Point} | undefined
  // The placed kandil what's dragged would go onto if let go now
  let target: Kandil | undefined
  let overBar = false
  let hudShown = false
  let time = 0
  // The kandil picked by a tap, to give what's tapped in the bar next
  let selected: Kandil | undefined

  const frames: Item = {url: frameUrl, crop: bodyCrop, count: 5}
  const frameSlot = bar.addItem(0, frames)
  const paperSlots = papers.map((paper, idx) => bar.addItem(1 + idx, {url: paperUrl(paper), crop: bodyCrop}))
  const tailsSlots = tailColours.map((tails, idx) =>
    bar.addItem(1 + papers.length + idx, {url: tailsUrl(tails), crop: tailsCrop}))
  const bulbSlot = bar.addItem(1 + papers.length + tailColours.length, {url: bulbUrl, crop: bulbCrop})

  // Each step's slots, under a bracket with its number above the bar
  const stepSlots = [[frameSlot], paperSlots, tailsSlots, [bulbSlot]]
  const stepBadges = stepSlots.map((slots, idx) => {
    const xs = slots.map(slot => slot.container.x)
    const left = Math.min(...xs) - slotSize / 2 + 6
    const right = Math.max(...xs) + slotSize / 2 - 6
    const y = slots[0].container.y - slotSize / 2 - 12 - stepLift - stepBadgeRadius
    const middle = (left + right) / 2
    const bracket = new Graphics()
      .moveTo(left, y + stepBadgeRadius).lineTo(left, y).lineTo(right, y).lineTo(right, y + stepBadgeRadius)
      .stroke({width: 2, color: 0xffffff, alpha: 0.5})
    const badge = new Container()
    badge.position.set(middle, y)
    const circle = new Graphics().circle(0, 0, stepBadgeRadius).fill(0xffffff).stroke({width: 2, color: 0x000000})
    const number = new Text({text: String(idx + 1), style: {fontFamily, fontSize: 18, fill: 0x000000}})
    number.anchor.set(0.5)
    number.roundPixels = true
    badge.addChild(circle, number)
    const group = new Container()
    group.eventMode = "none"
    group.addChild(bracket, badge)
    bar.container.addChild(group)
    return {badge, circle}
  })
  // Which step a kandil's on: 1 for paper, 2 for tails, 3 for the bulb, or none once lit
  const stepOf = (kandil: Kandil) => !kandil.paper ? 1 : !kandil.tails ? 2 : !kandil.lit ? 3 : undefined

  const tips = LL.tooltip.kandil
  const paperNames: Record<Paper, () => string> = {
    red: tips.paper.red, orange: tips.paper.orange, blue: tips.paper.blue, mixed: tips.paper.mixed,
  }
  const tailsNames: Record<Tails, () => string> = {
    green: tips.tails.green, red: tips.tails.red, gold: tips.tails.gold, mixed: tips.tails.mixed,
  }
  addTooltip(frameSlot.container, () => ({
    title: tips.frame.name(), lines: [frames.count === 0 ? LL.tooltip.noneLeft() : tips.frame.stack()],
  }))
  papers.forEach((paper, idx) => addTooltip(paperSlots[idx].container, () => ({
    title: paperNames[paper](), lines: [tips.paper.hint()],
  })))
  tailColours.forEach((tails, idx) => addTooltip(tailsSlots[idx].container, () => ({
    title: tailsNames[tails](), lines: [tips.tails.hint()],
  })))
  addTooltip(bulbSlot.container, () => ({title: tips.bulb.name(), lines: [tips.bulb.hint()]}))

  // What a placed kandil still needs, or that it's lit
  const kandilTooltip = (kandil: Kandil) => (): Tooltip => {
    const status = kandil.lit ? tips.lit() : !kandil.paper ? tips.needsPaper() : !kandil.tails ? tips.needsTails() : tips.ready()
    return {title: tips.name(), lines: [status, tips.move()]}
  }
  // What to do next with a kandil that isn't lit yet, for its hint's badge
  const kandilHint = (kandil: Kandil) => (): Tooltip | undefined => {
    if (kandil.lit) {
      return undefined
    }
    const [status, next] = !kandil.paper ? [tips.needsPaper(), LL.tooltip.next.addPaper()]
      : !kandil.tails ? [tips.needsTails(), LL.tooltip.next.addTails()]
      : [tips.ready(), LL.tooltip.next.addBulb()]
    return {title: tips.name(), lines: [status, next]}
  }

  const render = () => {
    bar.drawBoxes(overBar ? frameSlot.box : undefined)
    frameSlot.show()
    paperSlots.forEach((slot, idx) => slot.show(drag?.kind === "paper" && drag.paper === papers[idx]))
    tailsSlots.forEach((slot, idx) => slot.show(drag?.kind === "tails" && drag.tails === tailColours[idx]))
    bulbSlot.show(drag?.kind === "bulb")
  }

  // Shows a kandil as it's been made so far: its frame, its paper over it if it's been
  // wrapped, its tails hanging below or heaped round its foot, and its glow if it's lit
  const showKandil = (kandil: Kandil) => {
    const {paperSprite, tailsSprite, glow, paper, tails, lit, place} = kandil
    paperSprite.visible = paper !== undefined
    if (paper) {
      paperSprite.texture = texture(paperUrl(paper))
      glow.tint = lampColours[paper]
    }
    tailsSprite.visible = tails !== undefined
    if (tails) {
      tailsSprite.texture = texture(tailsUrl(tails))
    }
    const heaped = place.on === "porch"
    tailsSprite.scale.set(heaped ? heapedTails.x : 1, heaped ? heapedTails.y : 1)
    glow.visible = lit
  }

  const createKandil = (): Kandil => {
    const layer = (url: string) => {
      const sprite = new Sprite(texture(url))
      sprite.anchor.set(0.5, 0)
      return sprite
    }
    const tailsSprite = layer(frameUrl)
    // Its tails hang, or heap, from its bottom band's lower edge
    tailsSprite.anchor.set(0.5, baseY / canvas.height)
    tailsSprite.y = baseY
    const paperSprite = layer(frameUrl)
    const glow = new Sprite({texture: lighting.glowTexture, blendMode: "add"})
    glow.anchor.set(0.5)
    glow.position.copyFrom(lampOffset)
    glow.width = glow.height = glowRadius * 2 / kandilScale
    glow.alpha = glowAlpha
    const kandilContainer = new Container()
    kandilContainer.addChild(tailsSprite, layer(frameUrl), paperSprite, glow)
    kandilContainer.hitArea = grabArea
    kandilContainer.cursor = "grab"
    const string = createString()
    const kandil: Kandil = {
      container: kandilContainer, tailsSprite, paperSprite, glow, string, lit: false,
      place: {on: "porch", at: {x: 0, y: 0}}, phase: Math.random() * Math.PI * 2,
    }
    addTooltip(kandilContainer, kandilTooltip(kandil))
    addHint(kandilContainer, kandilHint(kandil), bodyArea)
    kandilContainer.on("pointerdown", e => {
      if (!drag) {
        e.stopPropagation()
        pressed = {kandil, at: e.global.clone()}
      }
    })
    return kandil
  }

  // Whether the kandil being dragged, shown at one point by a pointer at another, would
  // go back on the bar if let go there
  const backOnBar = (at: PointData, finger: PointData, current = drag) =>
    hudShown && bar.takesBack(at, finger, current?.pressedAt)

  // Where a kandil held by the top of its string at a point on screen would go if let
  // go there, by a pointer at another: standing on the porch if its foot's on the floor,
  // or else hung from the eave above, if there's house there to hang it on. Nowhere,
  // when letting go there would put it back on the bar
  const placeAt = (at: PointData, finger: PointData, current = drag): Kandil["place"] | undefined => {
    if (backOnBar(at, finger, current)) {
      return undefined
    }
    const top = background.toScene(at)
    const foot = {x: top.x, y: top.y + baseY * kandilScale}
    if (background.isOnPorchFloor(foot)) {
      return {on: "porch", at: foot}
    }
    if (!background.isOnHouse(top)) {
      return undefined
    }
    const tiedAt = {x: top.x, y: background.eaveAbove(top) ?? top.y}
    return {on: "house", tiedAt, length: top.y - tiedAt.y}
  }

  const drawString = (string: Sprite, from: PointData, to: PointData) => {
    string.visible = true
    string.position.copyFrom(from)
    string.height = Math.hypot(to.x - from.x, to.y - from.y)
    string.rotation = Math.atan2(from.x - to.x, to.y - from.y)
  }

  // The placed kandil that could take what's dragged that it touches most, drawn in a
  // box on screen, the nearest if it touches more than one as much
  const kandilAt = (box: Rectangle, wants: (kandil: Kandil) => boolean) => mostOverlapped(
    box,
    placed.filter(wants).sort((a, b) => b.container.zIndex - a.container.zIndex),
    kandil => screenBox(kandil.container, bodyArea),
  )

  const setTarget = (kandil: Kandil | undefined) => {
    if (target === kandil) {
      return
    }
    if (target) {
      target.container.scale.set(kandilScale)
      setOutline(target.container, "selected", false)
    }
    target = kandil
    if (target) {
      target.container.scale.set(kandilScale * targetGrowth)
      setOutline(target.container, "selected", true)
    }
  }

  // Picks a kandil, by a tap or as it's made, to give what's tapped in the bar next,
  // outlined, or none. A lit one has nothing more to take
  const select = (kandil?: Kandil) => {
    const next = kandil && !kandil.lit ? kandil : undefined
    if (selected === next) {
      return
    }
    if (selected && !selected.container.destroyed) {
      setOutline(selected.container, "ready", false)
    }
    selected = next
    if (selected) {
      setOutline(selected.container, "ready", true)
    }
  }

  // What a kandil needs next, floating up above it for a moment
  const labelLayer = new Container()
  labelLayer.eventMode = "none"
  container.addChild(labelLayer)
  const labels = new Map<Kandil, {text: Text, age: number}>()
  const showNext = (kandil: Kandil) => {
    const said = kandil.lit ? tips.lit() : !kandil.paper ? tips.needsPaper() : !kandil.tails ? tips.needsTails() : tips.ready()
    labels.get(kandil)?.text.destroy()
    const text = new Text({text: said, style: {
      fontFamily, fontSize: 20, fill: highlight, stroke: {color: 0x000000, width: 5}, align: "center",
    }})
    text.anchor.set(0.5, 1)
    labelLayer.addChild(text)
    labels.set(kandil, {text, age: 0})
  }
  const moveLabels = (dt: number) => labels.forEach((label, kandil) => {
    label.age += dt * 1000
    if (label.age >= labelFor || kandil.container.destroyed || !kandil.container.parent) {
      label.text.destroy()
      labels.delete(kandil)
      return
    }
    const top = screenBox(kandil.container, bodyArea)
    const t = label.age / labelFor
    label.text.position.set(top.x + top.width / 2, top.top - 6 - labelRise * t)
    label.text.alpha = Math.min(1, (1 - t) / 0.3)
  })

  // Where a frame can go, while one's dragged: every eave, and every porch floor, over
  // the night, and the eave it'd hang from as it is, brighter
  const spots = new Graphics()
  const eaves = background.houses.flatMap(house => house.eaves)
  eaves.forEach(([left, right]) => spots.moveTo(left.x, left.y).lineTo(right.x, right.y))
  spots.stroke({width: spotLine, color: highlight})
  background.houses.forEach(({porch}) => spots.poly(porch.flatMap(p => [p.x, p.y])).stroke({width: spotLine, color: highlight}))
  const hangingFrom = new Graphics()
  const spotLayer = new Container()
  spotLayer.zIndex = lighting.aboveNight
  spotLayer.eventMode = "none"
  spotLayer.visible = false
  spotLayer.addChild(spots, hangingFrom)
  background.decorations.addChild(spotLayer)
  const showSpots = (place: Kandil["place"] | undefined) => {
    spotLayer.visible = true
    hangingFrom.clear()
    if (place?.on === "house") {
      const eave = eaves.find(([left, right]) => left.y === place.tiedAt.y && place.tiedAt.x >= left.x && place.tiedAt.x <= right.x)
      if (eave) {
        hangingFrom.moveTo(eave[0].x, eave[0].y).lineTo(eave[1].x, eave[1].y).stroke({width: hangLine, color: 0xffffff})
      }
    }
  }
  const hideSpots = () => {
    spotLayer.visible = false
    hangingFrom.clear()
  }

  // A dotted line from paper, tails or the bulb to the kandil they'd go onto
  const tether = new Graphics()
  tether.eventMode = "none"

  // The kandil that could take something, near a box on screen though not touching it,
  // the nearest within reach
  const kandilNear = (box: Rectangle, wants: (kandil: Kandil) => boolean) => {
    const middle = {x: box.x + box.width / 2, y: box.y + box.height / 2}
    let best: {kandil: Kandil, distance: number} | undefined
    for (const kandil of placed.filter(wants)) {
      const body = screenBox(kandil.container, bodyArea)
      const dx = Math.max(body.left - middle.x, 0, middle.x - body.right)
      const dy = Math.max(body.top - middle.y, 0, middle.y - body.bottom)
      const distance = Math.hypot(dx, dy)
      if (distance <= magnetPixels && distance < (best?.distance ?? Infinity)) {
        best = {kandil, distance}
      }
    }
    return best?.kandil
  }
  const drawTether = (from: PointData, to?: Kandil) => {
    tether.clear()
    if (!to) {
      return
    }
    const body = screenBox(to.container, bodyArea)
    const end = {x: body.x + body.width / 2, y: body.y + body.height / 2}
    const length = Math.hypot(end.x - from.x, end.y - from.y)
    for (let along = 0; along < length; along += 10) {
      const a = along / length
      const b = Math.min(1, (along + 5) / length)
      tether.moveTo(from.x + (end.x - from.x) * a, from.y + (end.y - from.y) * a)
        .lineTo(from.x + (end.x - from.x) * b, from.y + (end.y - from.y) * b)
    }
    tether.stroke({width: 2, color: highlight})
  }

  dragLayer.addChild(tether)

  // Puts a kandil in its place in the scene: standing on the porch among the diyas, or
  // hung with its string up to the eave. Just hung, it swings
  const putKandil = (kandil: Kandil, place: Kandil["place"], swing: boolean) => {
    const {container: sprite} = kandil
    kandil.place = place
    sprite.removeFromParent()
    setOutline(sprite, "selected", false)
    sprite.alpha = 1
    sprite.rotation = 0
    sprite.scale.set(kandilScale)
    sprite.eventMode = "static"
    if (place.on === "porch") {
      sprite.position.set(place.at.x, place.at.y - baseY * kandilScale)
      sprite.zIndex = place.at.y
      kandil.string.visible = false
    } else {
      sprite.position.set(place.tiedAt.x, place.tiedAt.y + place.length)
      sprite.zIndex = 0
      hang(kandil, place, swing)
    }
    ;(kandil.lit ? litLayer : background.decorations).addChild(sprite)
    if (!placed.includes(kandil)) {
      placed.push(kandil)
    }
    showKandil(kandil)
  }

  // Hangs a kandil's weight from where its string's tied, straight down, or set swinging
  // just as it's hung
  const hang = (kandil: Kandil, place: Extract<Kandil["place"], {on: "house"}>, swing: boolean) => {
    const length = place.length + lampOffset.y * kandilScale
    const body = createParticleBody()
    body.frictionAir = airFriction(swingDamping)
    const gravity = swinging.engine.gravity.scale * 1e6
    const sideways = swing ? hangSwing * Math.sqrt(gravity * length) * (Math.random() < 0.5 ? -1 : 1) : 0
    placeBody(body, place.tiedAt.x, place.tiedAt.y + length, sideways, 0)
    const string = Matter.Constraint.create({pointA: {...place.tiedAt}, bodyB: body, length, stiffness: 1, damping: 0})
    swinging.add(body, string)
    kandil.pendulum = {body, string}
  }

  const unhang = (kandil: Kandil) => {
    if (kandil.pendulum) {
      swinging.remove(kandil.pendulum.body, kandil.pendulum.string)
      kandil.pendulum = undefined
    }
  }

  // Back on the stack, its frame's used again; its paper, tails and bulb aren't
  const returnKandil = (kandil: Kandil) => {
    if (selected === kandil) {
      select(undefined)
    }
    const index = placed.indexOf(kandil)
    if (index >= 0) {
      placed.splice(index, 1)
    }
    unhang(kandil)
    kandil.light?.destroy()
    kandil.string.destroy()
    kandil.container.destroy({children: true})
    frames.count! += 1
  }

  // Started by a pointer at a point, of a type, which on touch screens shows it beside
  // the finger instead of under it
  const startDrag = (finger: PointData, pointerType: string, next: Drag, scale: number) => {
    const {sprite} = next
    const at = touch.follow(finger, pointerType)
    sprite.rotation = 0
    sprite.scale.set(scale)
    sprite.position.copyFrom(at)
    sprite.eventMode = "none"
    dragLayer.addChild(sprite)
    setOutline(sprite, "selected", true)
    drag = next
    // From the bar, where it was pressed, so a tap that puts it straight back is quiet
    if (next.kind !== "kandil" || !next.from) {
      next.pressedAt = {x: finger.x, y: finger.y}
    }
    if (next.kind === "kandil") {
      next.kandil.light?.off()
      next.kandil.string.visible = false
      // Carried, its tails hang down again
      next.kandil.tailsSprite.scale.set(1)
    }
    showDrag(at, finger)
    render()
  }

  // A sheet of paper, the tails or the bulb, held by its middle at the size it'd be
  // on a kandil
  const startItemDrag = (
    e: FederatedPointerEvent, next: Exclude<Drag, {kind: "kandil"}>, url: string, crop: Rectangle,
  ) => {
    next.sprite.texture = cropped(url, crop)
    next.sprite.anchor.set(0.5)
    startDrag(e.global, e.pointerType, next, background.scale() * kandilScale)
  }

  frameSlot.container.on("pointerdown", e => {
    if (frames.count === 0 || drag) {
      return
    }
    frames.count! -= 1
    const kandil = createKandil()
    startDrag(e.global, e.pointerType, {kind: "kandil", sprite: kandil.container, kandil}, background.scale() * kandilScale)
  })
  papers.forEach((paper, idx) => paperSlots[idx].container.on("pointerdown", e => {
    if (!drag) {
      startItemDrag(e, {kind: "paper", sprite: new Sprite(), paper}, paperUrl(paper), bodyCrop)
    }
  }))
  tailColours.forEach((tails, idx) => tailsSlots[idx].container.on("pointerdown", e => {
    if (!drag) {
      startItemDrag(e, {kind: "tails", sprite: new Sprite(), tails}, tailsUrl(tails), tailsCrop)
    }
  }))
  bulbSlot.container.on("pointerdown", e => {
    if (!drag) {
      startItemDrag(e, {kind: "bulb", sprite: new Sprite()}, bulbUrl, bulbCrop)
    }
  })

  // Each step needs the one before: paper on a bare frame, tails once it's wrapped,
  // and the bulb once it has both
  const takes: Record<Exclude<Drag["kind"], "kandil">, (kandil: Kandil) => boolean> = {
    paper: kandil => !kandil.paper,
    tails: kandil => kandil.paper !== undefined && !kandil.tails,
    bulb: kandil => kandil.tails !== undefined && !kandil.lit,
  }

  // A kandil that can't go where it is shows faded, with the string it'd hang from
  // where it'd hang, and the bar lights up while the pointer's over it, as letting go
  // there puts it back. Paper, tails or the bulb pick out the kandil they touch most,
  // that they'd go onto. It's shown at one point, dragged by a pointer at another
  const showDrag = (at: PointData, finger: PointData) => {
    if (!drag) {
      return
    }
    if (drag.kind === "kandil") {
      const place = placeAt(at, finger)
      setOverBar(backOnBar(at, finger))
      showSpots(place)
      drag.sprite.alpha = place || overBar ? 1 : 0.4
      if (place?.on === "house") {
        drawString(dragString, place.tiedAt, {x: place.tiedAt.x, y: place.tiedAt.y + place.length})
      } else {
        dragString.visible = false
      }
    } else {
      const box = screenBox(drag.sprite)
      const touching = kandilAt(box, takes[drag.kind])
      setTarget(touching ?? kandilNear(box, takes[drag.kind]))
      // Only when it's pulled onto one it isn't touching
      drawTether(at, touching ? undefined : target)
    }
  }

  const setOverBar = (value: boolean) => {
    if (overBar !== value) {
      overBar = value
      render()
    }
  }

  const light = (kandil: Kandil) => {
    select(undefined)
    haptics.lit()
    happen("kandil", kandil.container.position)
    kandil.lit = true
    kandil.light = lighting.addLight(lampColours[kandil.paper!])
    litLayer.addChild(kandil.container)
    showKandil(kandil)
  }

  const pickUp = (kandil: Kandil, finger: PointData, pointerType: string) => {
    if (selected === kandil) {
      select(undefined)
    }
    placed.splice(placed.indexOf(kandil), 1)
    unhang(kandil)
    startDrag(finger, pointerType, {kind: "kandil", sprite: kandil.container, kandil, from: kandil.place}, background.scale() * kandilScale)
  }

  // Felt, and the tooltip of the slot it came from shown, saying where it goes, for
  // something that couldn't go where it was let go
  const refuse = (slot: {container: Container}, near?: Container) => {
    haptics.refused()
    showTooltipOf(slot.container, undefined, {hideAfter: refusalShown, near})
  }
  // Or, for something let go on, or tapped in the bar for, a kandil that isn't ready for
  // it, that kandil's own tooltip, saying what it needs
  const refuseFor = (kandil: Kandil) => {
    haptics.refused()
    showTooltipOf(kandil.container, undefined, {hideAfter: refusalShown})
  }

  // Let go of by a pointer at a point, of a type
  const endDrag = (finger: PointData, pointerType: string) => {
    if (!drag) {
      return
    }
    const at = touch.follow(finger, pointerType)
    touch.hide()
    const current = drag
    const into = target
    // Where it was let go, before it's gone, and whether it was only tapped in the bar
    const box = screenBox(current.sprite)
    const tapped = current.kind !== "kandil" && current.pressedAt !== undefined
      && Math.hypot(finger.x - current.pressedAt.x, finger.y - current.pressedAt.y) < tapMove
    drag = undefined
    setTarget(undefined)
    setOverBar(false)
    hideSpots()
    tether.clear()
    dragString.visible = false
    setOutline(current.sprite, "selected", false)
    if (current.kind === "kandil") {
      const place = placeAt(at, finger, current)
      const toBar = backOnBar(at, finger, current)
      if (place) {
        putKandil(current.kandil, place, true)
        haptics.placed()
        // Picked, to give it what's tapped next, and what it needs said above it
        select(current.kandil)
        if (!current.kandil.lit) {
          showNext(current.kandil)
        }
      } else if (current.from && !toBar) {
        // Back where it was if it can't go where it was let go
        putKandil(current.kandil, current.from, false)
        // Beside the kandil, as the bar may be hidden
        refuse(frameSlot, current.kandil.container)
      } else {
        returnKandil(current.kandil)
        if (!toBar) {
          refuse(frameSlot)
        }
      }
    } else {
      current.sprite.destroy()
      // Tapped in the bar with a kandil picked, it goes onto that one, if it's ready for it
      const onto = into ?? (tapped && selected && takes[current.kind](selected) ? selected : undefined)
      if (onto && current.kind === "paper") {
        onto.paper = current.paper
        showKandil(onto)
        haptics.done()
        select(onto)
        showNext(onto)
      } else if (onto && current.kind === "tails") {
        onto.tails = current.tails
        showKandil(onto)
        haptics.done()
        select(onto)
        showNext(onto)
      } else if (onto) {
        light(onto)
        showNext(onto)
      } else if (tapped && selected) {
        refuseFor(selected)
      } else if (!backOnBar(at, finger, current)) {
        // Let go on a kandil that isn't ready for it, that kandil says what it needs
        const onKandil = kandilAt(box, () => true) ?? kandilNear(box, () => true)
        if (onKandil) {
          refuseFor(onKandil)
          render()
          return
        }
        // Not touching a kandil ready for it, as one still to be wrapped in paper for
        // tails, and its slot says what it goes on
        refuse(current.kind === "paper" ? paperSlots[papers.indexOf(current.paper)]
          : current.kind === "tails" ? tailsSlots[tailColours.indexOf(current.tails)] : bulbSlot)
      }
    }
    render()
  }

  const toStage = (e: PointerEvent) => {
    const point = new Point()
    app.renderer.events.mapPositionToPoint(point, e.clientX, e.clientY)
    return point
  }
  const onPointerMove = (e: PointerEvent) => {
    const finger = toStage(e)
    if (pressed && draggedFrom(pressed.at, finger, pickUpSlop)) {
      const {kandil} = pressed
      pressed = undefined
      pickUp(kandil, finger, e.pointerType)
    }
    if (drag) {
      const at = touch.follow(finger, e.pointerType)
      drag.sprite.position.copyFrom(at)
      showDrag(at, finger)
    }
  }
  const onPointerUp = (e: PointerEvent) => {
    // A tap on a kandil, not a drag nor held to read its tooltip, picks it, or unpicks it
    if (pressed && e.type === "pointerup" && !wasLongPressed(pressed.kandil.container)) {
      const {kandil} = pressed
      select(selected === kandil ? undefined : kandil)
      if (selected) {
        showNext(selected)
      }
    }
    pressed = undefined
    endDrag(toStage(e), e.pointerType)
  }
  // A press anywhere but on a kandil or the bar unpicks the one picked
  const onAnyPress = (e: PointerEvent) => {
    if (!selected || e.target !== app.canvas) {
      return
    }
    const at = toStage(e)
    for (let hit: Container | null = app.renderer.events.rootBoundary.hitTest(at.x, at.y); hit; hit = hit.parent) {
      if (hit === bar.container || placed.some(kandil => kandil.container === hit)) {
        return
      }
    }
    select(undefined)
  }
  window.addEventListener("pointerdown", onAnyPress, true)
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerUp)

  // The wind pushes each hung one's weight along with it
  swinging.onStep(() => placed.forEach(({pendulum}) => {
    if (pendulum) {
      const {body} = pendulum
      accelerate(body, (wind.at(body.position.x) - velocityOf(body).x) * windPush * swinging.dt, 0)
    }
  }))

  // Hung ones are drawn turned the way their strings hang, from where they're tied, and
  // lit ones light up what's round their bulbs. Ones off screen don't, as their light
  // can't reach the screen from there
  // The steps' badges pulse for what's needed next, by the kandil picked, or any, or
  // the frame if there are none, and the steps no kandil needs are faded
  const guide = () => {
    const needed = new Set<number>()
    ;(selected ? [selected] : placed).forEach(kandil => {
      const step = stepOf(kandil)
      if (step !== undefined) {
        needed.add(step)
      }
    })
    const pulse = 0.5 + 0.5 * Math.sin(time * 5)
    stepBadges.forEach(({badge, circle}, idx) => {
      const usable = idx === 0 || needed.has(idx)
      const next = needed.has(idx) || (idx === 0 && needed.size === 0)
      stepSlots[idx].forEach(slot => slot.container.alpha = usable ? 1 : fadedStep)
      badge.scale.set(next ? 1 + 0.15 * pulse : 1)
      circle.tint = next ? highlight : 0xffffff
      badge.alpha = usable ? 1 : fadedStep
    })
    spots.alpha = 0.45 + 0.4 * pulse
  }

  const tick = () => {
    const dt = Math.min(0.1, app.ticker.deltaMS / 1000)
    time += dt
    guide()
    moveLabels(dt)
    placed.forEach(kandil => {
      const {container: sprite, place, light, pendulum, phase} = kandil
      if (place.on === "house" && pendulum) {
        const {x, y} = pendulum.body.position
        sprite.rotation = Math.atan2(place.tiedAt.x - x, y - place.tiedAt.y)
        sprite.position.set(
          place.tiedAt.x - place.length * Math.sin(sprite.rotation),
          place.tiedAt.y + place.length * Math.cos(sprite.rotation),
        )
        drawString(kandil.string, place.tiedAt, sprite.position)
      }
      if (!light) {
        return
      }
      const at = background.decorations.toLocal(lampOffset, sprite)
      if (!background.inView(at.x, at.y, kandilMargin)) {
        light.off()
        return
      }
      const flicker = 0.92 + 0.05 * Math.sin(time * 5 + phase + sprite.x) + 0.03 * Math.sin(time * 11 + sprite.x * 1.3)
      light.shine(at, lampRadius, lampStrength * flicker)
    })
  }
  app.ticker.add(tick)

  // Shows how a kandil's made: a hand drags a frame from the bar up to hang from the eave
  // nearest the middle of the screen, then red paper onto it, and it all fades away. Any
  // press or key ends it. Resolves with whether it was shown to the end
  let endDemo: (() => void) | undefined
  const onHouseInView = (middle: PointData, margin: number) => {
    const {view} = background
    const height = view.bottom - view.top
    for (const down of [0.2, 0.3, 0.15, 0.4]) {
      for (const across of [0, -0.1, 0.1, -0.2, 0.2, -0.3, 0.3]) {
        const at = {x: middle.x + across * (view.right - view.left), y: view.top + down * height}
        if (at.x > view.left + margin && at.x < view.right - margin && background.isOnHouse(at)
          && background.inView(at.x, at.y + baseY * kandilScale)) {
          return {eave: {x: at.x, y: background.eaveAbove(at) ?? at.y}, at}
        }
      }
    }
    return undefined
  }
  const demonstrate = () => new Promise<boolean>(resolve => {
    const {view} = background
    const middle = {x: (view.left + view.right) / 2, y: (view.top + view.bottom) / 2}
    const margin = (view.right - view.left) * 0.1
    const hangHere = eaves.flatMap(([left, right]) => {
      const x = Math.min(Math.min(right.x, view.right - margin), Math.max(Math.max(left.x, view.left + margin), middle.x))
      const at = {x, y: left.y + 4}
      return x >= left.x && x <= right.x && background.inView(at.x, at.y) && background.isOnHouse(at)
        && background.inView(at.x, at.y + baseY * kandilScale) ? [{eave: {x, y: left.y}, at}] : []
    }).sort((a, b) => Math.hypot(a.at.x - middle.x, a.at.y - middle.y) - Math.hypot(b.at.x - middle.x, b.at.y - middle.y))[0]
      // Or, zoomed in with no eave on screen, from the house high up near the middle, by
      // a string up to the eave above it, as it would be if it were let go there
      ?? onHouseInView(middle, margin)
    if (!hangHere || frames.count === 0 || endDemo) {
      // Nothing shown, so what to take first is shown instead
      resolve(true)
      return
    }
    const scale = background.scale() * kandilScale
    const layer = new Container()
    layer.eventMode = "none"
    layer.sortableChildren = true
    const hand = createTouchMarker()
    const frame = new Sprite(texture(frameUrl))
    frame.anchor.set(0.5, 0)
    frame.scale.set(scale)
    const paper = new Sprite(cropped(paperUrl("red"), bodyCrop))
    paper.anchor.set(0.5)
    paper.scale.set(scale)
    paper.visible = false
    const string = new Graphics()
    layer.addChild(string, frame, paper, hand.marker, hand.front)
    container.addChild(layer)
    const top = background.decorations.toGlobal(hangHere.at)
    const tied = background.decorations.toGlobal(hangHere.eave)
    const body = {x: top.x, y: top.y + (bodyCrop.y + bodyCrop.height / 2) * scale}
    const slotAt = (slot: {container: Container}) => slot.container.getGlobalPosition()
    // Where the hand holds what it's dragging: on the slot, then eased to where it goes
    const ease = (t: number) => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
    const along = (from: PointData, to: PointData, t: number) => ({x: from.x + (to.x - from.x) * ease(t), y: from.y + (to.y - from.y) * ease(t)})
    const hold = (sprite: Sprite, at: PointData) => {
      sprite.position.copyFrom(at)
      hand.follow({x: at.x + 64, y: at.y + 64}, "touch")
    }
    const frameFrom = slotAt(frameSlot)
    const paperFrom = slotAt(paperSlots[0])
    const phases = [demoFadeIn, demoMove, demoPause, demoFadeIn, demoMove, demoPause, demoFadeOut]
    const total = phases.reduce((sum, length) => sum + length, 0)
    let elapsed = 0
    const finish = (completed: boolean) => {
      app.ticker.remove(step)
      window.removeEventListener("pointerdown", cancel, true)
      window.removeEventListener("keydown", cancel, true)
      layer.destroy({children: true})
      endDemo = undefined
      resolve(completed)
    }
    const cancel = () => finish(false)
    endDemo = cancel
    function step() {
      elapsed += app.ticker.deltaMS
      if (elapsed >= total) {
        finish(true)
        return
      }
      let t = elapsed
      const phase = phases.findIndex(length => (t -= length) < 0)
      const within = (t + phases[phase]) / phases[phase]
      layer.alpha = phase === 6 ? 1 - within : 1
      if (phase <= 1) {
        // The frame, faded in on its slot, dragged up to hang
        frame.alpha = phase === 0 ? within : 1
        hold(frame, phase === 0 ? frameFrom : along(frameFrom, top, within))
        string.clear()
      } else if (phase === 2) {
        hold(frame, top)
        hand.hide()
        string.clear().moveTo(tied.x, tied.y).lineTo(top.x, top.y).stroke({width: 1.5, color: stringColour})
      } else if (phase <= 4) {
        paper.visible = true
        paper.alpha = phase === 3 ? within : 1
        hold(paper, phase === 3 ? paperFrom : along(paperFrom, body, within))
      } else {
        hand.hide()
        paper.position.copyFrom(body)
      }
    }
    window.addEventListener("pointerdown", cancel, true)
    window.addEventListener("keydown", cancel, true)
    app.ticker.add(step)
  })

  render()

  return {
    container,
    layout: bar.layout,
    // Where each kandil standing on the porch is in the scene, for the guests there to
    // keep clear of, and each lit one, standing or hung, for them to look at
    standingAt: () => placed.flatMap(({place}) => place.on === "porch" ? [place.at] : []),
    litAt: () => placed.filter(kandil => kandil.lit).map(({container}) => ({x: container.x, y: container.y})),
    // What to take first from its bar, to show someone new to it
    firstSlot: () => bar.slotAt(0),
    demonstrate,
    // Whether it's the tool in use; when it isn't, no kandil's left picked, and the
    // showing of how to make one ends
    setActive(active: boolean) {
      if (!active) {
        select(undefined)
        endDemo?.()
      }
    },
    // Shows its bar, while the Craft Kandil tool is the one in use
    setHudShown(shown: boolean) {
      hudShown = shown
      bar.setShown(shown)
      bar.setInteractive(shown)
    },
    destroy() {
      endDemo?.()
      window.removeEventListener("pointerdown", onAnyPress, true)
      spotLayer.destroy({children: true})
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
      app.ticker.remove(tick)
      ;[...placed].forEach(returnKandil)
      litLayer.destroy({children: true})
      stringLayer.destroy({children: true})
      container.destroy({children: true})
    },
  }
}

export {createKandils, kandilAssets}
