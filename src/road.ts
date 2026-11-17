import {Container, Graphics, Sprite} from "pixi.js"
import {scenery} from "./background"
import type {Background} from "./background"
import type {Light, Lighting} from "./lighting"

// The road along the front of the street, joining the houses up: a paved footpath
// right below their porch steps, a kerb, the road with a dashed line down its middle,
// and a kerb on its far side. Street lamps stand on the footpath between the houses,
// and at either end, lighting the road and the porches beside them at night. It's only
// seen, never pressed, and lies under everything placed in the scene
const footpath = 12
const kerb = 3
const road = 54
const dash = {length: 26, gap: 20, width: 2.5}
const slab = 30
const colours = {
  footpath: 0x6a5e6c, joint: 0x564a58, kerb: 0x8a7e8c, road: 0x3e3946, line: 0xd8d0c0,
}
// The lamps: how tall the post is, how far its arm reaches, and how far and brightly
// it lights round the foot of the post
const lamp = {height: 150, arm: 16, lightRadius: 150, lightStrength: 0.55, glowRadius: 14}

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
  const lights: Light[] = [...gaps, ...ends].map(x => {
    const head = {x: x + lamp.arm, y: foot - lamp.height + 6}
    const post = new Graphics()
      .rect(x - 1.6, foot - lamp.height, 3.2, lamp.height).fill(0x2b2430)
      .rect(x - 3, foot - 6, 6, 6).fill(0x2b2430)
      .moveTo(x, foot - lamp.height + 2).quadraticCurveTo(x + lamp.arm * 0.5, foot - lamp.height - 6, x + lamp.arm, foot - lamp.height)
      .stroke({color: 0x2b2430, width: 2.4})
      .poly([head.x - 5, head.y - 6, head.x + 5, head.y - 6, head.x + 3, head.y + 1, head.x - 3, head.y + 1]).fill(0x2b2430)
    post.eventMode = "none"
    post.zIndex = foot
    const bulb = new Graphics().ellipse(head.x, head.y + 1.5, 2.6, 1.6).fill(0xfff1c8)
    const glow = new Sprite(lighting.glowTexture)
    glow.anchor.set(0.5)
    glow.tint = 0xffe2a8
    glow.blendMode = "add"
    glow.width = glow.height = lamp.glowRadius * 2
    glow.position.set(head.x, head.y + 2)
    glows.addChild(glow, bulb)
    background.decorations.addChild(post)
    const light = lighting.addLight(0xffd9a0)
    // Lighting most round the foot of the post, where it falls on the road
    light.shine({x: head.x, y: foot - 20}, lamp.lightRadius, lamp.lightStrength)
    return light
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
