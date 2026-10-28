import {Application, Container, Graphics, PointData, Sprite, Texture} from "pixi.js"
import {Background, scenery, skylineUrls} from "./background"
import {Lighting} from "./lighting"
import {createSkylineLights} from "./skylineLights"

// The near skyline's lit windows are this colour; its far one's are all dark
const litColour = "#F2C96B"
// Lit windows glow through the night, a little less than fully. About half of them
// are lit to begin with, picked at random
const glowAlpha = 0.9
const litShare = 0.5
// Every 30 to 40 seconds a window somewhere in the city is switched off, or back on
// if it's already dark, fading over a moment
const switchEvery = {min: 30, max: 40}
const switchDuration = 0.4

type Rect = {x: number, y: number, width: number, height: number}

type Pane = Rect & {
  // The wall it's covered with once it's switched off
  wall: string
  lit: boolean
  // Whether it's fully in view where the skyline's slid to now
  shown: boolean
  // How far through switching it is, from 0 (as it was) to 1 (switched), if it is, and
  // its light and cover meanwhile, fading one into the other
  switching?: number
  glow?: Sprite
  cover?: Sprite
}

const random = (min: number, max: number) => min + (max - min) * Math.random()

// The numbers in an attribute, like a transform's or a path's
const numbersIn = (text: string) => (text.match(/-?\d*\.?\d+/g) ?? []).map(Number)

// Each rectangle in a path of rectangles, like "M20 14h7v10h-7z m14 0h7v10h-7z", with
// any transform of translate, scale, translate applied
const rectsIn = (path: SVGPathElement): Rect[] => {
  const [ax = 0, ay = 0, sx = 1, sy = 1, bx = 0, by = 0] = numbersIn(path.getAttribute("transform") ?? "")
  const place = (x: number, y: number) => ({x: ax + sx * (bx + x), y: ay + sy * (by + y)})
  const rects: Rect[] = []
  let x = 0
  let y = 0
  let start = {x: 0, y: 0}
  let corners: PointData[] = []
  const finish = () => {
    if (corners.length > 1) {
      const xs = corners.map(corner => corner.x)
      const ys = corners.map(corner => corner.y)
      const from = place(Math.min(...xs), Math.min(...ys))
      const to = place(Math.max(...xs), Math.max(...ys))
      rects.push({x: from.x, y: from.y, width: to.x - from.x, height: to.y - from.y})
    }
    corners = []
  }
  for (const [, command, values] of (path.getAttribute("d") ?? "").matchAll(/([MmLlHhVvZz])([^MmLlHhVvZz]*)/g)) {
    const [a = 0, b = 0] = numbersIn(values)
    if (command === "M" || command === "m") {
      finish()
      x = command === "M" ? a : x + a
      y = command === "M" ? b : y + b
      start = {x, y}
    } else if (command === "L" || command === "l") {
      x = command === "L" ? a : x + a
      y = command === "L" ? b : y + b
    } else if (command === "H" || command === "h") {
      x = command === "H" ? a : x + a
    } else if (command === "V" || command === "v") {
      y = command === "V" ? a : y + a
    } else {
      ({x, y} = start)
    }
    corners.push({x, y})
  }
  finish()
  return rects
}

// Lights in the windows of the city on the skyline, which glow through the night. Now
// and then one of them in view is switched off, or back on. The skyline slides behind
// the hills and the house as the camera pans, so a window only glows while they leave
// it fully in view, or it'd be drawn over them; otherwise it shows as drawn
const createSkyline = async (app: Application, background: Background, lighting: Lighting) => {
  // The glows go over the night, laid out like the skyline itself. All of them are one
  // shape, as are all the covers, redrawn only once a window's switched, which is much
  // quicker to draw than hundreds of little sprites. A window switching has its own
  // light and cover while it fades
  const glows = new Container()
  glows.position.copyFrom(background.skyline.position)
  glows.scale.copyFrom(background.skyline.scale)
  glows.zIndex = lighting.aboveNight
  glows.eventMode = "none"
  background.decorations.addChild(glows)
  const covers = new Container()
  background.skyline.addChild(covers)
  const glowShapes = new Graphics()
  const coverShapes = new Graphics()
  glows.addChild(glowShapes)
  covers.addChild(coverShapes)

  const svg = new DOMParser().parseFromString(await (await fetch(skylineUrls.near)).text(), "image/svg+xml")
  // Fairy lights on most of its buildings, in front of their windows
  const fairyLights = createSkylineLights(app, background, lighting, svg)
  const panes: Pane[] = []
  svg.querySelectorAll('g[data-name="Building"]').forEach(building => {
    const [left = 0, top = 0] = numbersIn(building.getAttribute("transform") ?? "")
    // The building's wall, and the darker side in shade, by where they are in it
    const walls = [...building.querySelectorAll('rect[data-name="Body"], rect[data-name="Shade"]')].map(rect => ({
      x: Number(rect.getAttribute("x")), y: Number(rect.getAttribute("y")),
      width: Number(rect.getAttribute("width")), height: Number(rect.getAttribute("height")),
      fill: rect.getAttribute("fill") ?? "#000000",
    }))
    building.querySelectorAll<SVGPathElement>(`path[data-name="Windows"][fill="${litColour}"]`).forEach(path => {
      rectsIn(path).forEach(rect => {
        const middle = {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2}
        // The last wall drawn that it's in is the one it's on
        const wall = walls.filter(wall => middle.x >= wall.x && middle.x <= wall.x + wall.width
          && middle.y >= wall.y && middle.y <= wall.y + wall.height).pop()
        if (wall) {
          panes.push({
            x: left + rect.x, y: top + rect.y, width: rect.width, height: rect.height,
            wall: wall.fill, lit: Math.random() < litShare, shown: false,
          })
        }
      })
    })
  })

  // Every window that isn't switching, lit and in view or covered. Covers are on the
  // skyline itself, behind the hills and the house, so they're drawn wherever it is
  const redraw = () => {
    glowShapes.clear()
    coverShapes.clear()
    panes.forEach(pane => {
      if (pane.switching !== undefined) {
        return
      }
      if (!pane.lit) {
        coverShapes.rect(pane.x, pane.y, pane.width, pane.height).fill(pane.wall)
      } else if (pane.shown) {
        glowShapes.rect(pane.x, pane.y, pane.width, pane.height).fill({color: litColour, alpha: glowAlpha})
      }
    })
  }

  const rectSprite = (pane: Pane, colour: string, layer: Container) => {
    const sprite = new Sprite(Texture.WHITE)
    sprite.tint = colour
    sprite.position.set(pane.x, pane.y)
    sprite.width = pane.width
    sprite.height = pane.height
    layer.addChild(sprite)
    return sprite
  }

  // Whether a window can be seen right now: within the scenery, as the skyline slides
  // beyond its edges, and not behind the hills or the house
  const inView = (pane: Pane) => [
    {x: pane.x, y: pane.y}, {x: pane.x + pane.width, y: pane.y}, {x: pane.x, y: pane.y + pane.height},
    {x: pane.x + pane.width, y: pane.y + pane.height},
  ].map(background.fromSkyline).every(corner =>
    corner.x >= scenery.left && corner.x <= scenery.right && !background.hidesSkyline(corner))

  // Which windows are in view, worked out again whenever the skyline's slid, redrawing
  // the glows if any have come into view or gone out of it
  let slidTo: number | undefined
  const reveal = () => {
    if (background.skyline.x === slidTo) {
      return
    }
    slidTo = background.skyline.x
    let changed = false
    panes.forEach(pane => {
      const shown = inView(pane)
      changed ||= shown !== pane.shown
      pane.shown = shown
    })
    if (changed) {
      redraw()
    }
  }
  reveal()
  redraw()

  let nextSwitch = random(switchEvery.min, switchEvery.max)
  const switching: Pane[] = []
  const tick = () => {
    const dt = app.ticker.deltaMS / 1000
    // Over the skyline's near layer, wherever it's slid to
    glows.position.copyFrom(background.skyline.position)
    reveal()
    nextSwitch -= dt
    if (nextSwitch <= 0) {
      nextSwitch = random(switchEvery.min, switchEvery.max)
      const candidates = panes.filter(pane => pane.switching === undefined && pane.shown)
      const pane = candidates[Math.floor(Math.random() * candidates.length)]
      if (pane) {
        pane.switching = 0
        pane.glow = rectSprite(pane, litColour, glows)
        pane.cover = rectSprite(pane, pane.wall, covers)
        switching.push(pane)
        redraw()
      }
    }
    for (let idx = switching.length - 1; idx >= 0; idx--) {
      const pane = switching[idx]
      pane.switching = Math.min(1, pane.switching! + dt / switchDuration)
      // How lit it is now: going from lit to dark, or back
      const lit = pane.lit ? 1 - pane.switching : pane.switching
      pane.glow!.alpha = glowAlpha * lit
      pane.glow!.visible = pane.shown
      pane.cover!.alpha = 1 - lit
      if (pane.switching === 1) {
        pane.lit = !pane.lit
        pane.switching = undefined
        pane.glow!.destroy()
        pane.cover!.destroy()
        pane.glow = pane.cover = undefined
        switching.splice(idx, 1)
        redraw()
      }
    }
  }
  app.ticker.add(tick)

  return {
    // How many windows there are to glow and switch
    paneCount: panes.length,
    destroy() {
      app.ticker.remove(tick)
      fairyLights.destroy()
      glows.destroy({children: true})
      covers.destroy({children: true})
    },
  }
}

export {createSkyline}
