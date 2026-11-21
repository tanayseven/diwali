import {Container, Graphics, Sprite} from "pixi.js"
import {scenery} from "./background"
import type {Background} from "./background"
import type {Light, Lighting} from "./lighting"

// The road along the front of the street, joining the houses up: a paved footpath
// right below their porch steps, a kerb, the road with a dashed line down its middle,
// and a kerb on its far side. Street lamps stand on the footpath between the houses,
// and at either end, lighting the road and the porches beside them at night. It's only
// seen, never pressed, and lies under everything placed in the scene
const footpath = 16
const kerb = 3
const road = 84
const dash = {length: 26, gap: 20, width: 2.5}
const slab = 30
const colours = {
  footpath: 0x6a5e6c, joint: 0x564a58, kerb: 0x8a7e8c, road: 0x3e3946, line: 0xd8d0c0,
}
// The lamps: how tall and thick the post is, how far its arm reaches, how far and
// brightly it lights round the foot of the post and the road in front, how big the glow
// round its bulb is, and how strong the faint beam of light under it is
const lamp = {
  height: 180, post: 4.4, arm: 22, lightRadius: 200, lightStrength: 0.8, roadLight: 0.45,
  glowRadius: 30, beam: 0.16,
}

const createRoad = (background: Background, lighting: Lighting) => {
  const {houses} = background
  const top = Math.max(...houses.map(house => house.top + house.height))
  const left = scenery.left
  const width = scenery.right - scenery.left
  const ground = new Graphics()
  let y = top
  ground.rect(left, y, width, footpath).fill(colours.footpath)
  for (let x = left; x < left + width; x += slab) {
    ground.rect(x, y, 1, footpath).fill(colours.joint)
  }
  y += footpath
  ground.rect(left, y, width, kerb).fill(colours.kerb)
  y += kerb
  ground.rect(left, y, width, road).fill(colours.road)
  const middle = y + road / 2
  for (let x = left; x < left + width; x += dash.length + dash.gap) {
    ground.rect(x, middle - dash.width / 2, dash.length, dash.width).fill(colours.line)
  }
  y += road
  ground.rect(left, y, width, kerb).fill(colours.kerb)
  ground.eventMode = "none"
  // Under everything placed in the scene, and the night
  ground.zIndex = -1
  background.decorations.addChild(ground)

  // A lamp in each gap between the houses, and one past each end of the street
  const gaps = houses.slice(1).map((house, idx) => (houses[idx].left + houses[idx].width + house.left) / 2)
  const ends = [houses[0].left - 30, houses[houses.length - 1].left + houses[houses.length - 1].width + 30]
  const foot = top + footpath / 2
  const glows = new Container()
  glows.eventMode = "none"
  glows.zIndex = lighting.aboveNight
  background.decorations.addChild(glows)
  const ironwork = 0x2b2430
  const lights: Light[] = [...gaps, ...ends].flatMap(x => {
    const top = foot - lamp.height
    const head = {x: x + lamp.arm, y: top + 8}
    const half = lamp.post / 2
    const post = new Graphics()
      // A tapering post on a stepped base, with a band near its top
      .poly([x - half - 0.8, foot, x + half + 0.8, foot, x + half * 0.7, top, x - half * 0.7, top]).fill(ironwork)
      .rect(x - 5, foot - 8, 10, 8).fill(ironwork)
      .rect(x - 3.5, foot - 12, 7, 4).fill(ironwork)
      .rect(x - half - 0.6, top + 14, lamp.post + 1.2, 2.5).fill(ironwork)
      // Its arm curving out, and the lamp's hood over the bulb
      .moveTo(x, top + 3).quadraticCurveTo(x + lamp.arm * 0.5, top - 8, head.x, top)
      .stroke({color: ironwork, width: 3})
      .poly([head.x - 8, head.y - 8, head.x + 8, head.y - 8, head.x + 5, head.y + 1, head.x - 5, head.y + 1]).fill(ironwork)
      .rect(head.x - 1.2, top - 1, 2.4, head.y - top - 6).fill(ironwork)
    post.eventMode = "none"
    post.zIndex = foot
    const bulb = new Graphics().ellipse(head.x, head.y + 2, 4.5, 2.6).fill(0xfff6dc)
    // A faint beam of warm light spreading down from it onto the footpath and the road
    const beam = new Graphics()
      .poly([head.x - 4, head.y + 2, head.x + 4, head.y + 2, head.x + 46, foot + 36, head.x - 46, foot + 36])
      .fill({color: 0xffe2a8, alpha: lamp.beam})
    beam.blendMode = "add"
    const glow = new Sprite(lighting.glowTexture)
    glow.anchor.set(0.5)
    glow.tint = 0xffe2a8
    glow.blendMode = "add"
    glow.width = glow.height = lamp.glowRadius * 2
    glow.position.set(head.x, head.y + 2)
    glows.addChild(beam, glow, bulb)
    background.decorations.addChild(post)
    // Lighting most round the foot of the post, where it falls on the footpath, and a
    // pool of it on the road in front
    const light = lighting.addLight(0xffd9a0)
    light.shine({x: head.x, y: foot - 20}, lamp.lightRadius, lamp.lightStrength)
    const pool = lighting.addLight(0xffd9a0)
    pool.shine({x: head.x, y: foot + 40}, lamp.lightRadius * 0.6, lamp.roadLight)
    return [light, pool]
  })

  return {
    destroy() {
      lights.forEach(light => light.destroy())
      ground.destroy()
      glows.destroy({children: true})
    },
  }
}

export {createRoad}
