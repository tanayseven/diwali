import type {PointData} from "pixi.js"

// Ready-made rangoli designs, made of three layers to mix and match: a centre, a ring
// round it and a border round that, each in a shape and a colour of its own. Each
// shape's a set of lines, in a design's own units, from its middle out to 1 at its edge

type Layer = "centre" | "ring" | "border"
const layers: Layer[] = ["centre", "ring", "border"]
type Line = PointData[]

const tau = Math.PI * 2
// Points round a circle, closed
const circle = (radius: number, steps = 48, x = 0, y = 0): Line =>
  Array.from({length: steps + 1}, (_, i) => ({x: x + radius * Math.cos(i / steps * tau), y: y + radius * Math.sin(i / steps * tau)}))
// A filled dot, as rings within rings
const dot = (radius: number, x = 0, y = 0): Line[] =>
  Array.from({length: Math.max(1, Math.round(radius / 0.03))}, (_, i) => circle(radius * (i + 1) / Math.max(1, Math.round(radius / 0.03)), 16, x, y))
// A petal, pointed at its tip, from one distance out to another, at an angle
const petal = (from: number, to: number, angle: number, width: number): Line => {
  const steps = 16
  const side = (sign: number) => Array.from({length: steps + 1}, (_, i) => {
    const t = i / steps
    const r = from + (to - from) * t
    const spread = sign * width * Math.sin(Math.PI * t) * (1 - 0.35 * t)
    return {x: r * Math.cos(angle) - spread * Math.sin(angle), y: r * Math.sin(angle) + spread * Math.cos(angle)}
  })
  return [...side(1), ...side(-1).reverse()]
}
const around = <T>(count: number, make: (angle: number, i: number) => T, offset = 0) =>
  Array.from({length: count}, (_, i) => make(offset + i / count * tau, i))

// Each layer's shapes, by name, in the order they're offered; "none" leaves it out
const shapes: Record<Layer, Record<string, () => Line[]>> = {
  centre: {
    dot: () => dot(0.16),
    flower: () => [...around(6, angle => petal(0.04, 0.3, angle, 0.08)), ...dot(0.05)],
    star: () => {
      const points = around(16, (angle, i) => {
        const r = i % 2 === 0 ? 0.3 : 0.13
        return {x: r * Math.cos(angle - tau / 4), y: r * Math.sin(angle - tau / 4)}
      })
      return [[...points, points[0]], ...dot(0.05)]
    },
    spiral: () => [Array.from({length: 120}, (_, i) => {
      const t = i / 119
      return {x: 0.28 * t * Math.cos(t * tau * 2.5), y: 0.28 * t * Math.sin(t * tau * 2.5)}
    })],
    none: () => [],
  },
  ring: {
    petals: () => around(8, angle => petal(0.34, 0.66, angle, 0.12)),
    dots: () => around(16, angle => dot(0.04, 0.5 * Math.cos(angle), 0.5 * Math.sin(angle))).flat(),
    waves: () => [Array.from({length: 241}, (_, i) => {
      const angle = i / 240 * tau
      const r = 0.5 + 0.07 * Math.sin(angle * 10)
      return {x: r * Math.cos(angle), y: r * Math.sin(angle)}
    }), circle(0.38)],
    lotus: () => around(12, angle => petal(0.36, 0.64, angle, 0.07), tau / 24),
    none: () => [],
  },
  border: {
    rings: () => [circle(0.8, 72), circle(0.95, 72)],
    scallops: () => [Array.from({length: 16 * 12 + 1}, (_, i) => {
      const angle = i / (16 * 12) * tau
      const r = 0.82 + 0.12 * Math.abs(Math.sin(angle * 8))
      return {x: r * Math.cos(angle), y: r * Math.sin(angle)}
    })],
    zigzag: () => [around(49, (angle, i) => {
      const r = i % 2 === 0 ? 0.78 : 0.95
      return {x: r * Math.cos(angle), y: r * Math.sin(angle)}
    }).concat([{x: 0.78, y: 0}])],
    dots: () => around(24, angle => dot(0.035, 0.88 * Math.cos(angle), 0.88 * Math.sin(angle))).flat(),
    none: () => [],
  },
}

type Choice = {shape: string, colour: string}
type Design = Record<Layer, Choice>

// A design's lines, each in its layer's colour
const designLines = (design: Design) => layers.flatMap(layer =>
  shapes[layer][design[layer].shape]().map(points => ({points, colour: design[layer].colour})))

// The panel to make a design with: a preview of it as it is on the left, and on the
// right, for each layer, its shapes to pick from and the colours of powder to draw it
// in. A tick puts it down, wherever the floor's tapped next; a cross closes it.
// Everything in it is drawn, not written, so it needs no translation
const createDesignPicker = (
  colours: Record<string, number>,
  label: string,
  onPlace: (design: Design) => void,
) => {
  const colourNames = Object.keys(colours)
  const hex = (colour: string) => `#${colours[colour].toString(16).padStart(6, "0")}`
  let design: Design = {
    centre: {shape: "flower", colour: colourNames[2]},
    ring: {shape: "petals", colour: colourNames[0]},
    border: {shape: "scallops", colour: colourNames[3]},
  }

  // Draws lines into a square canvas, scaled to fit with a margin
  const drawLines = (canvas: HTMLCanvasElement, lines: {points: Line, colour: string}[], lineWidth: number) => {
    const context = canvas.getContext("2d")!
    const size = canvas.width
    context.clearRect(0, 0, size, size)
    context.lineCap = "round"
    context.lineJoin = "round"
    context.lineWidth = lineWidth
    lines.forEach(({points, colour}) => {
      context.strokeStyle = hex(colour)
      context.beginPath()
      points.forEach((point, i) => {
        const x = size / 2 + point.x * size * 0.46
        const y = size / 2 + point.y * size * 0.46
        if (i === 0) {
          context.moveTo(x, y)
        } else {
          context.lineTo(x, y)
        }
      })
      context.stroke()
    })
  }
  const canvasOf = (size: number) => {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = size * 2
    Object.assign(canvas.style, {width: `${size}px`, height: `${size}px`})
    return canvas
  }

  const overlay = document.createElement("div")
  overlay.setAttribute("role", "dialog")
  overlay.setAttribute("aria-label", label)
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "3",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0, 0, 0, 0.55)",
  })
  const panel = document.createElement("div")
  Object.assign(panel.style, {
    display: "flex",
    gap: "min(16px, 3vw)",
    alignItems: "center",
    padding: "min(14px, 3vh)",
    borderRadius: "16px",
    background: "rgba(26, 26, 26, 0.96)",
    border: "2px solid #555555",
    maxWidth: "calc(100vw - 24px)",
    maxHeight: "calc(100vh - 24px)",
    boxSizing: "border-box",
  })
  overlay.appendChild(panel)

  const previewSize = Math.round(Math.min(190, window.innerHeight * 0.5))
  const preview = canvasOf(previewSize)
  Object.assign(preview.style, {borderRadius: "12px", background: "#5a3a3a", flex: "none"})
  const left = document.createElement("div")
  Object.assign(left.style, {display: "flex", flexDirection: "column", alignItems: "center", gap: "10px"})
  const buttons = document.createElement("div")
  Object.assign(buttons.style, {display: "flex", gap: "12px"})
  const roundButton = (text: string, colour: string, name: string) => {
    const button = document.createElement("button")
    button.type = "button"
    button.textContent = text
    button.setAttribute("aria-label", name)
    Object.assign(button.style, {
      width: "48px",
      height: "48px",
      borderRadius: "50%",
      border: `2px solid ${colour}`,
      background: "#1a1a1a",
      color: colour,
      fontSize: "24px",
      lineHeight: "1",
      cursor: "pointer",
    })
    return button
  }
  const place = roundButton("✓", "#ffd700", "✓")
  const close = roundButton("✕", "#bbbbbb", "✕")
  buttons.append(close, place)
  left.append(preview, buttons)

  const rows = document.createElement("div")
  Object.assign(rows.style, {display: "flex", flexDirection: "column", gap: "min(10px, 2vh)"})
  panel.append(left, rows)

  const thumbSize = Math.round(Math.min(44, window.innerHeight * 0.1))
  const rowParts = layers.map(layer => {
    const row = document.createElement("div")
    Object.assign(row.style, {display: "flex", flexDirection: "column", gap: "6px"})
    const shapeRow = document.createElement("div")
    Object.assign(shapeRow.style, {display: "flex", gap: "6px"})
    const thumbs = Object.keys(shapes[layer]).map(shape => {
      const button = document.createElement("button")
      button.type = "button"
      button.setAttribute("aria-label", `${layer} ${shape}`)
      Object.assign(button.style, {
        padding: "2px",
        borderRadius: "10px",
        background: "#2a2a2a",
        cursor: "pointer",
        lineHeight: "0",
      })
      const canvas = canvasOf(thumbSize)
      button.appendChild(canvas)
      button.addEventListener("click", () => {
        design = {...design, [layer]: {...design[layer], shape}}
        render()
      })
      shapeRow.appendChild(button)
      return {shape, button, canvas}
    })
    const colourRow = document.createElement("div")
    Object.assign(colourRow.style, {display: "flex", gap: "6px"})
    const chips = colourNames.map(colour => {
      const chip = document.createElement("button")
      chip.type = "button"
      chip.setAttribute("aria-label", `${layer} ${colour}`)
      Object.assign(chip.style, {
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        background: hex(colour),
        cursor: "pointer",
        padding: "0",
      })
      chip.addEventListener("click", () => {
        design = {...design, [layer]: {...design[layer], colour}}
        render()
      })
      colourRow.appendChild(chip)
      return {colour, chip}
    })
    row.append(shapeRow, colourRow)
    rows.appendChild(row)
    return {layer, thumbs, chips}
  })

  const render = () => {
    drawLines(preview, designLines(design), 5)
    rowParts.forEach(({layer, thumbs, chips}) => {
      const {shape: picked, colour} = design[layer]
      thumbs.forEach(({shape, button, canvas}) => {
        // A shape left out shows as an empty box
        drawLines(canvas, shapes[layer][shape]().map(points => ({points, colour})), 3)
        button.style.border = `2px solid ${shape === picked ? "#ffd700" : "#555555"}`
      })
      chips.forEach(({colour: chipColour, chip}) => {
        chip.style.border = `3px solid ${chipColour === colour ? "#ffd700" : "#1a1a1a"}`
      })
    })
  }

  const hide = () => {
    overlay.style.display = "none"
  }
  close.addEventListener("click", hide)
  // A press on the dimmed scene round it closes it too
  overlay.addEventListener("click", e => {
    if (e.target === overlay) {
      hide()
    }
  })
  place.addEventListener("click", () => {
    hide()
    onPlace(design)
  })
  document.body.appendChild(overlay)
  render()

  return {
    show() {
      render()
      overlay.style.display = "flex"
    },
    hide,
    isShown: () => overlay.style.display !== "none",
    destroy() {
      overlay.remove()
    },
  }
}

export {createDesignPicker, designLines, layers, shapes}
export type {Design, Layer}
