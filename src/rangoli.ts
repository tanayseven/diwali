import {Application, Container, FederatedPointerEvent, Graphics, Point, PointData, RenderTexture, Sprite, Text, Texture} from "pixi.js"
import {fontFamily, quality} from "./app"
import {Background} from "./background"
import {createHud, slotSize} from "./hud"
import type {Lighting} from "./lighting"
import {LL} from "./locale"
import {setOutline} from "./outline"
import {report} from "./progress"
import {createDesignPicker, Design, designLines, randomDesign} from "./rangoliDesigns"
import {addTooltip, hideTooltipFor, showTooltipOf, wasLongPressed} from "./tooltip"

// How long Clear waits for a second tap, once it's asked, in ms
const clearAskedFor = 3000

// Rangoli powder colours, as a design's drawn in on the porch
const powders = {
  red: 0xe23b2e,
  orange: 0xff8c1a,
  yellow: 0xffd23f,
  green: 0x2fae4e,
  blue: 0x2e6fe0,
  purple: 0x8e44c9,
  pink: 0xff5fa2,
  white: 0xf7f3e8,
}
type Powder = keyof typeof powders

// Stamps of powder are laid this far apart along a line, as a share of their radius
const stampSpacing = 0.35
// How many texture pixels the drawing has per scene unit, so it stays crisp up close,
// on a phone a little fewer
const resolution = quality.rangoliResolution
// A design's size, from its middle to its edge, in scene units, and how much it's
// squashed top to bottom, as it lies flat on the floor, and how thick its lines are
const designRadius = 58
const floorTilt = 0.5
const designBrushRadius = 1.3
// The design picked, drawn in its slot, from its middle to its edge, and its lines' width,
// in the bar's units
const slotDesignRadius = slotSize * 0.38
const slotLine = 2.5
// Before a design's put down, where it'd go is shown over the night as a faint copy of
// itself, wherever the mouse is, or where a finger's pressing, to be slid about before
// it's let go. Where it could go, the porches' floors, is outlined, pulsing this often a
// second, while the tool's in use, brightly for a moment when it's picked and while the
// mouse is off them
const highlightColour = 0xffd23f
const floorLine = 1.2
const pulseRate = 3
const showFloorsFor = 3000

// A dab of powder: a dense middle that thins out to scattered grains at the edge
const powderTexture = (size: number) => {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")!
  const radius = size / 2
  for (let k = 0; k < size * size * 0.6; k++) {
    // More grains towards the middle
    const r = radius * Math.sqrt(Math.random()) * (0.6 + 0.4 * Math.random())
    const angle = Math.random() * Math.PI * 2
    const alpha = 0.35 + 0.65 * (1 - r / radius)
    context.fillStyle = `rgba(255, 255, 255, ${alpha})`
    context.fillRect(radius + Math.cos(angle) * r, radius + Math.sin(angle) * r, 1.2, 1.2)
  }
  return Texture.from(canvas)
}

// The Draw Rangoli tool, of ready-made designs. Its bar has the design picked, drawn in
// its slot, which opens the panel to make another, and one to clear the floor. A tap on a
// porch's floor puts the design down there, lying flat in powder, as many times as it's
// tapped. The rangoli stays on the floor, under anything placed on it
const createRangoli = (app: Application, background: Background, lighting: Lighting) => {
  const container = new Container()
  const bar = createHud(app)
  container.addChild(bar.container)

  // A drawing on each house's porch floor, covering the floor's bounds, clipped to its
  // shape. Each is only made once something's put down on that floor, as on a phone
  // they'd take a good deal of memory
  type Floor = {left: number, top: number, right: number, bottom: number, porch: PointData[], drawing?: RenderTexture, sprite?: Sprite, mask?: Graphics}
  const floors: Floor[] = background.houses.map(({porch}) => ({
    left: Math.min(...porch.map(p => p.x)),
    top: Math.min(...porch.map(p => p.y)),
    right: Math.max(...porch.map(p => p.x)),
    bottom: Math.max(...porch.map(p => p.y)),
    porch,
  }))
  const drawingOf = (floor: Floor) => {
    if (!floor.drawing) {
      const {left, top, right, bottom, porch} = floor
      floor.drawing = RenderTexture.create({width: (right - left) * resolution, height: (bottom - top) * resolution})
      floor.sprite = new Sprite(floor.drawing)
      floor.sprite.position.set(left, top)
      floor.sprite.scale.set(1 / resolution)
      floor.sprite.eventMode = "none"
      // On the floor, under every diya and firework placed on it
      floor.sprite.zIndex = 1
      floor.mask = new Graphics().poly(porch.flatMap(p => [p.x, p.y])).fill(0xffffff)
      floor.sprite.mask = floor.mask
      background.decorations.addChild(floor.sprite, floor.mask)
    }
    return floor.drawing
  }

  const powderStamp = powderTexture(48)
  // Stamps are gathered here, where they are in the scene at the drawings' resolution,
  // and drawn into the drawing of each floor they're on in one go
  const stamps = new Container()
  const drawStamps = () => {
    const bounds = stamps.getLocalBounds()
    floors.forEach(floor => {
      const {left, top, right, bottom} = floor
      if (bounds.maxX >= left * resolution && bounds.minX <= right * resolution
        && bounds.maxY >= top * resolution && bounds.minY <= bottom * resolution) {
        stamps.position.set(-left * resolution, -top * resolution)
        app.renderer.render({container: stamps, target: drawingOf(floor), clear: false})
      }
    })
    stamps.removeChildren().forEach(stamp => stamp.destroy())
  }

  // Where the design would go, over the night so it's clear
  const highlight = new Container()
  highlight.zIndex = lighting.aboveNight
  highlight.eventMode = "none"
  background.decorations.addChild(highlight)
  const floorOutlines = new Graphics()
  // Only the player's porch, as it's the only one they can put a rangoli on
  const homeFloor = floors[background.home()]
  floorOutlines.poly(homeFloor.porch.flatMap(p => [p.x, p.y])).stroke({width: floorLine, color: highlightColour})
  const ghost = new Graphics()
  highlight.addChild(floorOutlines, ghost)
  highlight.visible = false
  // Whether it's the tool in use, bar shown or not, where the mouse is over the scenery,
  // if it is, and until when the floors are outlined brightly after the tool's picked
  let active = false
  let hovering: PointData | undefined
  let showFloorsUntil = 0
  let elapsed = 0

  const tips = LL.tooltip.rangoli

  // The design to put down, made in the panel the first slot opens, starting out as one
  // it suggests, so a tap on the floor puts one down straight away
  const picker = createDesignPicker(powders, LL.tools.rangoli(), made => {
    design = made
    showDesign()
  })
  let design: Design = picker.current()

  // The first slot: the design picked, drawn in it, opening the panel on a tap, not a
  // press, so a finger held on it to read what it does doesn't open it
  const designSlot = bar.addSlot(0)
  const slotDrawing = new Graphics()
  designSlot.container.addChild(slotDrawing)
  designSlot.container.on("pointertap", () => {
    if (!wasLongPressed(designSlot.container)) {
      picker.show()
    }
  })
  addTooltip(designSlot.container, () => ({title: LL.tools.rangoli(), lines: [tips.design()]}))

  const clearSlot = bar.addSlot(1)
  const clearLabel = new Text({text: tips.clear(), style: {fontFamily, fontSize: 22, fill: 0xffffff}})
  clearLabel.anchor.set(0.5)
  clearLabel.roundPixels = true
  clearSlot.container.addChild(clearLabel)
  // On a tap, not a press, so a finger held on it to read what it does doesn't clear it.
  // And only on a second tap, as it can't be undone: the first asks, its label turning
  // to a question, in the language's own question mark, and its tooltip saying what
  // it'll do, outlined, until it's tapped again or a few seconds pass
  let clearAsked: number | undefined
  const stopAsking = () => {
    window.clearTimeout(clearAsked)
    clearAsked = undefined
    clearLabel.text = tips.clear()
  }
  clearSlot.container.on("pointertap", () => {
    if (wasLongPressed(clearSlot.container)) {
      return
    }
    if (clearAsked !== undefined) {
      stopAsking()
      hideTooltipFor(clearSlot.container)
      // Only the player's own, as the neighbours' are theirs
      if (homeFloor.drawing) {
        app.renderer.render({container: new Container(), target: homeFloor.drawing, clear: true})
      }
      for (let idx = laid.length - 1; idx >= 0; idx--) {
        if (background.isOnHomePorch(laid[idx])) {
          laid.splice(idx, 1)
        }
      }
      return
    }
    const questionMark = document.documentElement.dir === "rtl" ? "؟" : "?"
    clearLabel.text = `${tips.clear()}${questionMark}`
    clearAsked = window.setTimeout(stopAsking, clearAskedFor)
    showTooltipOf(clearSlot.container, undefined, {hideAfter: clearAskedFor})
  })
  addTooltip(clearSlot.container, () => ({title: tips.clear(), lines: [tips.clearHint()]}))

  // A design's lines, drawn into a graphic, from its middle out to a radius, squashed top
  // to bottom by a share, with lines of a width
  const drawLines = (into: Graphics, made: Design, radius: number, squash: number, width: number) => {
    designLines(made).forEach(({points, colour}) => {
      if (points.length < 2) {
        return
      }
      into.moveTo(points[0].x * radius, points[0].y * radius * squash)
      points.slice(1).forEach(point => into.lineTo(point.x * radius, point.y * radius * squash))
      into.stroke({width, color: powders[colour as Powder], cap: "round", join: "round"})
    })
  }

  // The design picked, in its slot, outlined, and as the faint copy of it that shows where
  // it'll go, with the ellipse it fills
  const showDesign = () => {
    bar.drawBoxes(designSlot.box)
    setOutline(designSlot.container, "selected", true)
    slotDrawing.clear()
    drawLines(slotDrawing, design, slotDesignRadius, 1, slotLine)
    ghost.clear()
    drawLines(ghost, design, designRadius, floorTilt, designBrushRadius * 2)
    ghost.ellipse(0, 0, designRadius * 1.04, designRadius * floorTilt * 1.04).stroke({width: floorLine, color: highlightColour})
  }

  // Shows where the design would go: where the mouse is or the finger's pressing, bright
  // on the floor and faint off it, and the floors outlined, brighter for a moment once
  // the tool's picked, or while the mouse is off them
  const showHighlight = () => {
    const pulse = 0.5 + 0.5 * Math.sin(elapsed / 1000 * pulseRate * Math.PI)
    const at = placing?.at ?? hovering
    const onFloor = at !== undefined && background.isOnHomePorch(at)
    ghost.visible = active && at !== undefined
    if (ghost.visible) {
      ghost.position.copyFrom(at!)
      ghost.alpha = onFloor ? 0.5 + 0.25 * pulse : 0.2
    }
    floorOutlines.visible = active
    const bright = performance.now() < showFloorsUntil || (at !== undefined && !onFloor)
    floorOutlines.alpha = (bright ? 0.3 + 0.4 * pulse : 0.15 + 0.15 * pulse)
    highlight.visible = ghost.visible || floorOutlines.visible
  }

  // Lays powder along a line, from point to point, in a colour, and draws it in
  const powderAlong = (points: PointData[], colour: number, radius: number) => {
    const dab = (at: PointData) => {
      const stamp = new Sprite(powderStamp)
      stamp.anchor.set(0.5)
      stamp.width = stamp.height = radius * 2 * resolution
      stamp.position.set(at.x * resolution, at.y * resolution)
      stamp.rotation = Math.random() * Math.PI * 2
      stamp.tint = colour
      stamps.addChild(stamp)
    }
    if (points.length > 0) {
      dab(points[0])
    }
    for (let i = 1; i < points.length; i++) {
      const from = points[i - 1]
      const to = points[i]
      const count = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / (radius * stampSpacing)))
      for (let k = 1; k <= count; k++) {
        dab({x: from.x + (to.x - from.x) * k / count, y: from.y + (to.y - from.y) * k / count})
      }
    }
    drawStamps()
  }

  // Where each design's been put down, by its middle, for the families on the porches to
  // walk round rather than over
  const laid: PointData[] = []
  // Puts a design down on the floor, centred on a point, lying flat
  const putDesign = (at: PointData, made: Design) => {
    laid.push({x: at.x, y: at.y})
    designLines(made).forEach(({points, colour}) => powderAlong(
      points.map(point => ({x: at.x + point.x * designRadius, y: at.y + point.y * designRadius * floorTilt})),
      powders[colour as Powder],
      designBrushRadius,
    ))
  }

  // A press on the floor, to put the design down where it's let go, once it's been slid
  // wherever it's to go, unless another finger comes down, as for a pinch
  let placing: {at: PointData, made: Design, pointerId: number} | undefined

  const pressHandler = (at: PointData, e: FederatedPointerEvent) => {
    if (!background.isOnHomePorch(at)) {
      return false
    }
    placing = {at, made: design, pointerId: e.pointerId}
    return true
  }

  const toStage = (e: PointerEvent) => {
    const point = new Point()
    app.renderer.events.mapPositionToPoint(point, e.clientX, e.clientY)
    return point
  }
  const onPointerMove = (e: PointerEvent) => {
    if (placing && e.pointerId === placing.pointerId) {
      placing.at = background.toScene(toStage(e))
    }
  }
  const onPointerUp = (e?: PointerEvent) => {
    if (placing && e?.type === "pointerup" && e.pointerId === placing.pointerId && background.isOnHomePorch(placing.at)) {
      putDesign(placing.at, placing.made)
      report("rangoliPlaced")
    }
    placing = undefined
  }
  // A second finger put down while one's pressing the floor is the start of a pinch, so
  // nothing's put down
  const onPointerDown = (e: PointerEvent) => {
    if (placing && e.pointerId !== placing.pointerId) {
      placing = undefined
    }
  }
  // Where the mouse is over the scenery, and not a button or the bar
  const onHover = (e: PointerEvent) => {
    hovering = undefined
    if (e.pointerType !== "mouse" || !active || e.target !== app.canvas) {
      return
    }
    const stage = toStage(e)
    if (app.renderer.events.rootBoundary.hitTest(stage.x, stage.y)?.parent === background.container) {
      hovering = background.toScene(stage)
    }
  }
  const onLeave = () => {
    hovering = undefined
  }
  window.addEventListener("pointermove", onHover)
  app.canvas.addEventListener("pointerleave", onLeave)
  const tick = () => {
    elapsed += app.ticker.deltaMS
    showHighlight()
  }
  app.ticker.add(tick)
  window.addEventListener("pointerdown", onPointerDown, true)
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  window.addEventListener("pointercancel", onPointerUp)

  showDesign()

  return {
    container,
    layout: bar.layout,
    // What to take first from its bar, to show someone new to it
    firstSlot: () => bar.slotAt(0),
    pressHandler,
    // The middle of each design put down, and how far one reaches across and down
    placedAt: () => laid,
    reach: {x: designRadius * 1.04, y: designRadius * floorTilt * 1.04},
    // Puts a design down on a neighbour's porch, made up by a source of random numbers
    putFixed(at: PointData, random: () => number) {
      putDesign(at, randomDesign(Object.keys(powders), random))
    },
    // Shows its bar while the Draw Rangoli tool is the one in use
    setHudShown(shown: boolean) {
      bar.setShown(shown)
      bar.setInteractive(shown)
      if (!shown) {
        picker.hide()
      }
    },
    // Whether it's the tool in use, bar shown or not, and if it's just been picked, the
    // floors a design can go on are outlined brightly for a moment
    setActive(value: boolean) {
      if (value && !active) {
        showFloorsUntil = performance.now() + showFloorsFor
      }
      active = value
      if (!active) {
        hovering = undefined
      }
    },
    destroy() {
      window.removeEventListener("pointermove", onHover)
      app.canvas.removeEventListener("pointerleave", onLeave)
      app.ticker.remove(tick)
      highlight.destroy({children: true})
      window.removeEventListener("pointerdown", onPointerDown, true)
      picker.destroy()
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
      floors.forEach(({sprite, mask, drawing}) => {
        sprite?.destroy()
        mask?.destroy()
        drawing?.destroy(true)
      })
      powderStamp.destroy(true)
      container.destroy({children: true})
    },
  }
}

export {createRangoli}
