import {Application, ColorMatrix, ColorMatrixFilter, Container, Graphics, PointData, RenderTexture, Sprite, Texture, UPDATE_PRIORITY} from "pixi.js"
import {createBackground, groundBelow, sceneHeight, sceneWidth, scenery} from "./background"
import {outlineAboveNight} from "./outline"

type Background = ReturnType<typeof createBackground>

// At night the porch is dark, so whatever's lit in it shows. The light is drawn into a
// small map of the scene, multiplied over it: the night's colour where it's dark, and
// warmer and brighter around each light
const nightColour = 0x4a5280
const lightMapScale = 4

// A soft round spot of light, fading out from the middle as the given stops say
const radialTexture = (size: number, stops: [number, number][]) => {
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext("2d")!
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  stops.forEach(([at, alpha]) => gradient.addColorStop(at, `rgba(255, 255, 255, ${alpha})`))
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  return Texture.from(canvas)
}

// The house is drawn as it looks by night, so the night shouldn't darken it again.
// Its colours are brightened by as much as the night darkens them, so where nothing's
// lit it shows just as drawn and where something is it's lit as brightly as anything
// else. What's too bright to brighten that far, like its lit windows, is made up for by
// a copy of just the shortfall, added on above the night. Both are drawn once, on the
// graphics card, from the house as drawn
const undoNight = (app: Application, house: Sprite) => {
  const night = [nightColour >> 16, (nightColour >> 8) & 0xff, nightColour & 0xff].map(level => level / 255)
  const drawn = house.texture
  const redraw = (matrix: ColorMatrix) => {
    const copy = new Sprite(drawn)
    const filter = new ColorMatrixFilter()
    filter.matrix = matrix
    copy.filters = [filter]
    const texture = app.renderer.generateTexture({target: copy, resolution: drawn.source.resolution, antialias: false})
    copy.destroy()
    filter.destroy()
    return texture
  }
  const [r, g, b] = night
  // Brightened, which the screen keeps to full brightness at most
  house.texture = redraw([1 / r, 0, 0, 0, 0, 0, 1 / g, 0, 0, 0, 0, 0, 1 / b, 0, 0, 0, 0, 0, 1, 0])
  // And whatever's left over above the night's colour
  const shortfall = new Sprite(redraw([1, 0, 0, 0, -r, 0, 1, 0, 0, -g, 0, 0, 1, 0, -b, 0, 0, 0, 1, 0]))
  drawn.destroy(true)
  shortfall.anchor.copyFrom(house.anchor)
  shortfall.scale.copyFrom(house.scale)
  shortfall.position.copyFrom(house.position)
  shortfall.blendMode = "add"
  shortfall.eventMode = "none"
  return shortfall
}

// The night over the scene, with lights that can be added to it. setNight sets how
// dark it is, from 0 (as by day) to 1. It's drawn above everything placed in the scene
// up to zIndex sceneHeight, so things drawn above that, like sparks, aren't darkened
const createLighting = (app: Application, background: Background) => {
  // Shared with whatever wants a glow of the same shape
  const glowTexture = radialTexture(128, [[0, 1], [0.2, 0.6], [0.45, 0.25], [0.7, 0.08], [1, 0]])
  const lightMap = RenderTexture.create({width: sceneWidth / lightMapScale, height: sceneHeight / lightMapScale})
  const lightScene = new Container()
  lightScene.addChild(new Graphics().rect(0, 0, lightMap.width, lightMap.height).fill(nightColour))
  const shade = new Sprite(lightMap)
  shade.scale.set(lightMapScale)
  shade.blendMode = "multiply"
  shade.eventMode = "none"
  shade.visible = false
  shade.zIndex = sceneHeight + 1
  // The sky and the ground carrying on past the scene's sides and below it are just as
  // dark, and nothing there is lit
  const shadeAround = new Graphics()
    .rect(scenery.left, 0, -scenery.left, sceneHeight)
    .rect(sceneWidth, 0, scenery.right - sceneWidth, sceneHeight)
    .rect(scenery.left, sceneHeight, scenery.right - scenery.left, groundBelow)
    .fill(nightColour)
  shadeAround.blendMode = "multiply"
  shadeAround.eventMode = "none"
  shadeAround.visible = false
  shadeAround.zIndex = sceneHeight + 1
  background.decorations.sortableChildren = true
  background.decorations.addChild(shade, shadeAround)
  const houseShortfall = undoNight(app, background.house)
  houseShortfall.visible = false
  houseShortfall.zIndex = sceneHeight + 1
  background.decorations.addChild(houseShortfall)
  // Outlines of things in the scene, over everything there so the night never dims them
  const outlines = new Container()
  outlines.zIndex = sceneHeight + 20
  outlines.eventMode = "none"
  background.decorations.addChild(outlines)
  outlineAboveNight(app, background.decorations, outlines)

  // Drawn after everything else has moved its lights this frame
  const render = () => {
    if (shade.visible) {
      app.renderer.render({container: lightScene, target: lightMap, clear: true})
    }
  }
  app.ticker.add(render, undefined, UPDATE_PRIORITY.LOW)

  return {
    glowTexture,
    // The zIndex above the night, for things that shine through it
    aboveNight: sceneHeight + 2,
    // A light of a colour, off until it's shone somewhere
    addLight(colour: number) {
      const light = new Sprite(glowTexture)
      light.anchor.set(0.5)
      light.tint = colour
      light.blendMode = "add"
      light.visible = false
      lightScene.addChild(light)
      return {
        // Lights up to a radius around a point in the scene, at a strength from 0 to 1
        shine(at: PointData, radius: number, strength: number) {
          light.visible = strength > 0
          light.position.set(at.x / lightMapScale, at.y / lightMapScale)
          light.width = light.height = radius * 2 / lightMapScale
          light.alpha = Math.min(1, strength)
        },
        off() {
          light.visible = false
        },
        destroy() {
          light.destroy()
        },
      }
    },
    setNight(value: number) {
      shade.alpha = shadeAround.alpha = value
      shade.visible = shadeAround.visible = value > 0
      houseShortfall.alpha = value
      houseShortfall.visible = value > 0
    },
  }
}

type Lighting = ReturnType<typeof createLighting>
type Light = ReturnType<Lighting["addLight"]>

export {createLighting, radialTexture}
export type {Light, Lighting}
