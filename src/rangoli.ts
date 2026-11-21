import {Application, Container, FederatedPointerEvent, Graphics, Point, PointData, RenderTexture, Sprite, Text, Texture} from "pixi.js"
import {report} from "./progress"
import {fontFamily, quality} from "./app"
import {Background} from "./background"
import type {Lighting} from "./lighting"
import {createHud, hudFrame, slotSize} from "./hud"
import {LL} from "./locale"
import {setOutline} from "./outline"
import {createDesignPicker, Design, designLines} from "./rangoliDesigns"
import {addTooltip, hideTooltipFor, showTooltipOf, wasLongPressed} from "./tooltip"

// How long Clear waits for a second tap, once it's asked, in ms
const clearAskedFor = 3000

// Rangoli powder colours, as drawn on the porch
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
const powderNames = Object.keys(powders) as Powder[]
type Tool = Powder | "eraser"

// Sizes in scene units: a stroke is about a fifth of a diya wide
const brushRadius = 2.2
const eraserRadius = 4
// Stamps are laid this far apart along a stroke, as a share of the brush's radius
const stampSpacing = 0.35
// How many texture pixels the drawing has per scene unit, so it stays crisp up close,
// on a phone a little fewer
const resolution = quality.rangoliResolution
// A ready-made design's size, from its middle to its edge, in scene units, and how
// much it's squashed top to bottom, as it lies flat on the floor
const designRadius = 58
const floorTilt = 0.5
// Its lines are finer than drawing by hand, so its shapes stay clear
const designBrushRadius = 1.3
// The button that opens the designs, above the bar's left end, in CSS pixels
const designsButtonSize = 48
const designsButtonGap = 8
// Before anything's put down, where it'd go is shown over the night: a ready-made design
// as a faint copy of itself, wherever the mouse is, or where a finger's pressing, to be
// slid about before it's let go, and the brush's size and colour round the mouse. Where
// it could go, the porches' floors, is outlined while a design's picked, while the mouse
// is off them, and for a moment when the tool's picked, pulsing this often a second
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

// A soft, solid round dab, for the eraser
const solidTexture = (size: number) => {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")!
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)")
  gradient.addColorStop(0.7, "rgba(255, 255, 255, 1)")
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)")
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  return Texture.from(canvas)
}

// The Draw Rangoli tool. Its bar has a slot for each colour of powder, an eraser and
// one to clear the floor; with a colour or the eraser picked, dragging on the porch's
// floor draws with it. The drawing stays on the floor, under anything placed on it
const createRangoli = (app: Application, background: Background, lighting: Lighting) => {
  const container = new Container()
  const bar = createHud(app)
  container.addChild(bar.container)

  // A drawing on each house's porch floor, covering the floor's bounds, clipped to its
  // shape. Each is only made once something's drawn on that floor, as on a phone they'd
  // take a good deal of memory
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
  const eraserStamp = solidTexture(32)
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
  // Where things would go, over the night so they're clear
  const highlight = new Container()
  highlight.zIndex = lighting.aboveNight
  highlight.eventMode = "none"
  background.decorations.addChild(highlight)
  const floorOutlines = new Graphics()
  floors.forEach(({porch}) => floorOutlines.poly(porch.flatMap(p => [p.x, p.y])).stroke({width: floorLine, color: highlightColour}))
  const ghost = new Graphics()
  const brushRing = new Graphics()
  highlight.addChild(floorOutlines, ghost, brushRing)
  highlight.visible = false
  // Whether it's the tool in use, bar shown or not, where the mouse is over the scenery,
  // if it is, and until when the floors are outlined after the tool's picked
  let active = false
  let hovering: PointData | undefined
  let showFloorsUntil = 0
  let elapsed = 0

  let tool: Tool = "red"
  let last: PointData | undefined
  let drawingNow = false
  // The pointer drawing, so a second finger, to pinch, doesn't draw too
  let drawingWith: number | undefined

  const tips = LL.tooltip.rangoli
  const colourNames: Record<Powder, () => string> = {
    red: tips.red, orange: tips.orange, yellow: tips.yellow, green: tips.green,
    blue: tips.blue, purple: tips.purple, pink: tips.pink, white: tips.white,
  }

  // A swatch of each colour, heaped like a little pile of powder
  const powderSlots = powderNames.map((powder, idx) => {
    const slot = bar.addSlot(idx, true)
    const swatch = new Sprite(powderStamp)
    swatch.anchor.set(0.5)
    swatch.tint = powders[powder]
    swatch.width = swatch.height = slotSize * 0.7
    const heap = new Graphics().circle(0, 0, slotSize * 0.2).fill(powders[powder])
    slot.container.addChild(swatch, heap)
    slot.container.on("pointerdown", () => select(powder))
    addTooltip(slot.container, () => ({title: colourNames[powder](), lines: [tips.hint()]}))
    return slot
  })

  const eraserSlot = bar.addSlot(powderNames.length)
  eraserSlot.container.addChild(new Graphics()
    .roundRect(-slotSize * 0.28, -slotSize * 0.16, slotSize * 0.56, slotSize * 0.32, 6)
    .fill(0xf2c4ce)
    .stroke({width: 2, color: 0xffffff})
    .rect(-slotSize * 0.28, -slotSize * 0.16, slotSize * 0.18, slotSize * 0.32)
    .fill(0x4a7fd4))
  eraserSlot.container.rotation = -0.5
  eraserSlot.container.on("pointerdown", () => select("eraser"))
  addTooltip(eraserSlot.container, () => ({title: tips.eraser(), lines: [tips.eraserHint()]}))

  const clearSlot = bar.addSlot(powderNames.length + 1)
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
      floors.forEach(({drawing}) => drawing && app.renderer.render({container: new Container(), target: drawing, clear: true}))
      return
    }
    const questionMark = document.documentElement.dir === "rtl" ? "؟" : "?"
    clearLabel.text = `${tips.clear()}${questionMark}`
    clearAsked = window.setTimeout(stopAsking, clearAskedFor)
    showTooltipOf(clearSlot.container, undefined, {hideAfter: clearAskedFor})
  })
  addTooltip(clearSlot.container, () => ({title: tips.clear(), lines: [tips.clearHint()]}))

  // A ready-made design, made in the designs panel, put down wherever the floor's
  // pressed while it's picked, until a colour or the eraser's picked instead
  let design: Design | undefined
  const picker = createDesignPicker(powders, LL.tools.rangoli(), made => {
    design = made
    render()
    drawGhost(made)
  })
  // A round button above the bar's left end, with a little rangoli on it, opening them
  const designsButton = document.createElement("button")
  designsButton.type = "button"
  designsButton.setAttribute("aria-label", LL.tools.rangoli())
  designsButton.title = LL.tools.rangoli()
  Object.assign(designsButton.style, {
    position: "fixed",
    left: "0",
    top: "0",
    zIndex: "1",
    width: `${designsButtonSize}px`,
    height: `${designsButtonSize}px`,
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    padding: "0",
    borderRadius: "50%",
    background: "rgba(26, 26, 26, 0.9)",
    cursor: "pointer",
    touchAction: "manipulation",
  })
  designsButton.innerHTML = `<svg width="30" height="30" viewBox="-10 -10 20 20" aria-hidden="true">
    <circle r="8.5" fill="none" stroke="#ffd23f" stroke-width="1.4"/>
    ${[0, 45, 90, 135, 180, 225, 270, 315].map(angle => `<ellipse rx="1.6" ry="4" cy="-4.2" fill="#e23b2e" transform="rotate(${angle})"/>`).join("")}
    <circle r="1.8" fill="#2fae4e"/></svg>`
  designsButton.addEventListener("click", () => picker.show())
  document.body.appendChild(designsButton)
  const placeDesignsButton = () => {
    const frame = hudFrame(app.screen)
    const canvas = app.canvas.getBoundingClientRect()
    designsButton.style.transform = `translate(${canvas.left + frame.x - frame.width / 2}px, ${
      canvas.top + frame.y - frame.height / 2 - designsButtonSize - designsButtonGap}px)`
  }

  // A faint copy of a design, its lines as they'd be laid, and the ellipse it fills
  const drawGhost = (made: Design) => {
    ghost.clear()
    designLines(made).forEach(({points, colour}) => {
      if (points.length < 2) {
        return
      }
      ghost.moveTo(points[0].x * designRadius, points[0].y * designRadius * floorTilt)
      points.slice(1).forEach(point => ghost.lineTo(point.x * designRadius, point.y * designRadius * floorTilt))
      ghost.stroke({width: designBrushRadius * 2, color: powders[colour as Powder], cap: "round", join: "round"})
    })
    ghost.ellipse(0, 0, designRadius * 1.04, designRadius * floorTilt * 1.04).stroke({width: floorLine, color: highlightColour})
  }

  // Shows where what's picked would go: the design where the mouse is or the finger's
  // pressing, bright on the floor and faint off it, or the brush round the mouse on the
  // floor, and the floors outlined while there's a design to put down, the mouse is off
  // them, or the tool's just been picked
  const showHighlight = () => {
    const pulse = 0.5 + 0.5 * Math.sin(elapsed / 1000 * pulseRate * Math.PI)
    const at = placing?.at ?? hovering
    const onFloor = at !== undefined && background.isOnPorchFloor(at)
    ghost.visible = active && design !== undefined && at !== undefined
    if (ghost.visible) {
      ghost.position.copyFrom(at!)
      ghost.alpha = onFloor ? 0.5 + 0.25 * pulse : 0.2
    }
    brushRing.visible = active && !design && hovering !== undefined && background.isOnPorchFloor(hovering)
    if (brushRing.visible) {
      brushRing.position.copyFrom(hovering!)
    }
    floorOutlines.visible = active && (design !== undefined || performance.now() < showFloorsUntil
      || (at !== undefined && !onFloor))
    floorOutlines.alpha = 0.3 + 0.4 * pulse
    highlight.visible = ghost.visible || brushRing.visible || floorOutlines.visible
  }

  // The brush's ring, the size it draws, in its colour, or for the eraser, white
  const drawBrushRing = () => {
    const radius = tool === "eraser" ? eraserRadius : brushRadius
    brushRing.clear()
      .circle(0, 0, radius).fill({color: tool === "eraser" ? 0xffffff : powders[tool], alpha: 0.35})
      .circle(0, 0, radius).stroke({width: 0.5, color: tool === "eraser" ? 0xffffff : powders[tool]})
  }

  // What's picked is outlined as well as its box highlighted, or with a design picked,
  // its button
  const render = () => {
    const picked = design ? undefined : tool === "eraser" ? eraserSlot : powderSlots[powderNames.indexOf(tool)]
    bar.drawBoxes(picked?.box)
    ;[...powderSlots, eraserSlot].forEach(slot => setOutline(slot.container, "selected", slot === picked))
    designsButton.style.border = `3px solid ${design ? "#ffd700" : "#555555"}`
  }

  function select(next: Tool) {
    tool = next
    design = undefined
    render()
    drawBrushRing()
  }

  // Lays stamps from the last point to this one, then draws them into the drawing
  const strokeTo = (at: PointData) => {
    const from = last ?? at
    const radius = tool === "eraser" ? eraserRadius : brushRadius
    const distance = Math.hypot(at.x - from.x, at.y - from.y)
    const count = Math.max(1, Math.ceil(distance / (radius * stampSpacing)))
    for (let k = last ? 1 : 0; k <= count; k++) {
      const t = k / count
      const stamp = new Sprite(tool === "eraser" ? eraserStamp : powderStamp)
      stamp.anchor.set(0.5)
      stamp.width = stamp.height = radius * 2 * resolution
      stamp.position.set((from.x + (at.x - from.x) * t) * resolution, (from.y + (at.y - from.y) * t) * resolution)
      stamp.rotation = Math.random() * Math.PI * 2
      if (tool === "eraser") {
        stamp.blendMode = "erase"
      } else {
        stamp.tint = powders[tool]
      }
      stamps.addChild(stamp)
    }
    drawStamps()
    last = at
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

  // Puts the picked design down on the floor, centred on a point, lying flat
  const putDesign = (at: PointData, made: Design) => {
    designLines(made).forEach(({points, colour}) => powderAlong(
      points.map(point => ({x: at.x + point.x * designRadius, y: at.y + point.y * designRadius * floorTilt})),
      powders[colour as Powder],
      designBrushRadius,
    ))
  }

  // A press on the floor with a design picked, to put it down where it's let go, once
  // it's been slid wherever it's to go, unless another finger comes down, as for a pinch
  let placing: {at: PointData, made: Design, pointerId: number} | undefined

  // A press on the porch's floor starts drawing there, or puts the design down there
  const pressHandler = (at: PointData, e: FederatedPointerEvent) => {
    if (!background.isOnPorchFloor(at)) {
      return false
    }
    if (design) {
      placing = {at, made: design, pointerId: e.pointerId}
      return true
    }
    drawingNow = true
    drawingWith = e.pointerId
    last = undefined
    strokeTo(at)
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
    if (drawingNow && e.pointerId === drawingWith) {
      strokeTo(background.toScene(toStage(e)))
    }
  }
  const onPointerUp = (e?: PointerEvent) => {
    if (placing && e?.type === "pointerup" && e.pointerId === placing.pointerId && background.isOnPorchFloor(placing.at)) {
      putDesign(placing.at, placing.made)
      report("rangoliPlaced")
    }
    if (drawingNow && e?.type === "pointerup" && e.pointerId === drawingWith) {
      report("rangoliDrawn")
    }
    placing = undefined
    drawingNow = false
    drawingWith = undefined
    last = undefined
  }
  // A second finger put down while drawing is the start of a pinch, so the stroke ends
  // there, before the scene zooms under it
  const onPointerDown = (e: PointerEvent) => {
    if (placing && e.pointerId !== placing.pointerId) {
      placing = undefined
    }
    if (drawingNow && e.pointerId !== drawingWith) {
      onPointerUp()
    }
  }
  // Where the mouse is over the scenery, and not a button or the bar
  const onHover = (e: PointerEvent) => {
    hovering = undefined
    if (e.pointerType !== "mouse" || !active || e.target !== app.canvas) {
      return
    }
    const stage = toStage(e)
    if (drawingNow || app.renderer.events.rootBoundary.hitTest(stage.x, stage.y)?.parent === background.container) {
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

  render()
  drawBrushRing()

  placeDesignsButton()

  return {
    container,
    layout() {
      bar.layout()
      placeDesignsButton()
    },
    // What to take first from its bar, to show someone new to it
    firstSlot: () => bar.slotAt(0),
    pressHandler,
    // Shows its bar, and the designs button above it, while the Draw Rangoli tool is
    // the one in use
    setHudShown(shown: boolean) {
      bar.setShown(shown)
      bar.setInteractive(shown)
      designsButton.style.display = shown ? "flex" : "none"
      if (!shown) {
        picker.hide()
      }
    },
    // Whether it's the tool in use, bar shown or not, and if it's just been picked, the
    // floors it draws on are outlined for a moment
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
      designsButton.remove()
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
      eraserStamp.destroy(true)
      container.destroy({children: true})
    },
  }
}

export {createRangoli}
