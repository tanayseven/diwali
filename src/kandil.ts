import {Application, Assets, Container, FederatedPointerEvent, Point, PointData, Rectangle, Sprite, Texture} from "pixi.js"
import Matter from "matter-js"
import type {Background} from "./background"
import {Item, createHud, cropped} from "./hud"
import {Light, Lighting} from "./lighting"
import {LL} from "./locale"
import {draggedFrom} from "./matchstick"
import {mostOverlapped, screenBox} from "./overlap"
import {accelerate, airFriction, createParticleBody, hangingWorld, place as placeBody, velocityOf} from "./physics"
import {addHint} from "./hints"
import {haptics, refusalShown} from "./feedback"
import {setOutline} from "./outline"
import {addTooltip, showTooltipOf, Tooltip} from "./tooltip"
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
  | {kind: "kandil", sprite: Container, kandil: Kandil, from?: Kandil["place"]}
  | {kind: "paper", sprite: Sprite, paper: Paper}
  | {kind: "tails", sprite: Sprite, tails: Tails}
  | {kind: "bulb", sprite: Sprite}

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

  const frames: Item = {url: frameUrl, crop: bodyCrop, count: 5}
  const frameSlot = bar.addItem(0, frames)
  const paperSlots = papers.map((paper, idx) => bar.addItem(1 + idx, {url: paperUrl(paper), crop: bodyCrop}))
  const tailsSlots = tailColours.map((tails, idx) =>
    bar.addItem(1 + papers.length + idx, {url: tailsUrl(tails), crop: tailsCrop}))
  const bulbSlot = bar.addItem(1 + papers.length + tailColours.length, {url: bulbUrl, crop: bulbCrop})

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

  // Where a kandil held by the top of its string at a point on screen would go if let
  // go there, by a pointer at another: standing on the porch if its foot's on the floor,
  // or else hung from the eave above, if there's house there to hang it on. Nowhere,
  // with the pointer over the bar, as letting go there puts it back
  const placeAt = (at: PointData, finger: PointData): Kandil["place"] | undefined => {
    if (hudShown && bar.isOver(finger)) {
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
      setOverBar(hudShown && bar.isOver(finger))
      drag.sprite.alpha = place || overBar ? 1 : 0.4
      if (place?.on === "house") {
        drawString(dragString, place.tiedAt, {x: place.tiedAt.x, y: place.tiedAt.y + place.length})
      } else {
        dragString.visible = false
      }
    } else {
      setTarget(kandilAt(screenBox(drag.sprite), takes[drag.kind]))
    }
  }

  const setOverBar = (value: boolean) => {
    if (overBar !== value) {
      overBar = value
      render()
    }
  }

  const light = (kandil: Kandil) => {
    haptics.lit()
    kandil.lit = true
    kandil.light = lighting.addLight(lampColours[kandil.paper!])
    litLayer.addChild(kandil.container)
    showKandil(kandil)
  }

  const pickUp = (kandil: Kandil, finger: PointData, pointerType: string) => {
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

  // Let go of by a pointer at a point, of a type
  const endDrag = (finger: PointData, pointerType: string) => {
    if (!drag) {
      return
    }
    const at = touch.follow(finger, pointerType)
    touch.hide()
    const current = drag
    const into = target
    drag = undefined
    setTarget(undefined)
    setOverBar(false)
    dragString.visible = false
    setOutline(current.sprite, "selected", false)
    if (current.kind === "kandil") {
      const place = placeAt(at, finger)
      const toBar = hudShown && bar.isOver(finger)
      if (place) {
        putKandil(current.kandil, place, true)
        haptics.placed()
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
      if (into && current.kind === "paper") {
        into.paper = current.paper
        showKandil(into)
        haptics.done()
      } else if (into && current.kind === "tails") {
        into.tails = current.tails
        showKandil(into)
        haptics.done()
      } else if (into) {
        light(into)
      } else if (!(hudShown && bar.isOver(finger))) {
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
    pressed = undefined
    endDrag(toStage(e), e.pointerType)
  }
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
  const tick = () => {
    const dt = Math.min(0.1, app.ticker.deltaMS / 1000)
    time += dt
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

  render()

  return {
    container,
    layout: bar.layout,
    // What to take first from its bar, to show someone new to it
    firstSlot: () => bar.slotAt(0),
    // Shows its bar, while the Craft Kandil tool is the one in use
    setHudShown(shown: boolean) {
      hudShown = shown
      bar.setShown(shown)
      bar.setInteractive(shown)
    },
    destroy() {
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
