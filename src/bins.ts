import {Container, Graphics, PointData, Rectangle} from "pixi.js"
import {isInside} from "./background"
import type {Background} from "./background"
import {LL} from "./locale"
import {setOutline} from "./outline"
import {overlap, screenBox} from "./overlap"
import {addTooltip} from "./tooltip"

// A waste bin on each porch, for burnt-out fireworks: a ribbed green metal bin with a
// lid, standing near the front of the porch, this far in from its edge, in scene units,
// right of its middle by this share of the way to its right edge, and this big
const inFromFront = 18
const rightOfMiddle = 0.55
const size = {width: 24, height: 32}
const colours = {body: 0x5f9a72, rib: 0x3f7052, rim: 0x4a8060}
// The player's grows this much while a burnt-out firework's dragged over it
const targetGrowth = 1.15

const drawBin = () => {
  const {width, height} = size
  const bin = new Graphics()
    // Its body, a little narrower at its foot, with ribs down it
    .poly([-width / 2, -height, width / 2, -height, width * 0.4, 0, -width * 0.4, 0]).fill(colours.body)
  for (const x of [-0.25, 0, 0.25]) {
    bin.moveTo(x * width, -height + 3).lineTo(x * width * 0.85, -2)
  }
  bin.stroke({width: 1, color: colours.rib})
    // Its lid, overhanging a little, and the handle on top
    .roundRect(-width / 2 - 1.5, -height - 3, width + 3, 4, 1.5).fill(colours.rim)
    .roundRect(-3, -height - 6, 6, 3, 1).fill(colours.rim)
  return bin
}

// Where a porch's bin stands, by its foot's middle: near the front of its floor, a way
// right of its middle, or further in if that's off it, or the middle of the floor
const binSpot = (porch: PointData[], isOnFloor: (point: PointData) => boolean) => {
  const xs = porch.map(p => p.x)
  const middle = (Math.min(...xs) + Math.max(...xs)) / 2
  const x = middle + (Math.max(...xs) - middle) * rightOfMiddle
  const front = Math.max(...porch.map(p => p.y))
  for (let inFrom = inFromFront; inFrom < 80; inFrom += 8) {
    const spot = {x, y: front - inFrom}
    if (isOnFloor(spot)) {
      return spot
    }
  }
  return {x: porch.reduce((sum, p) => sum + p.x, 0) / porch.length, y: porch.reduce((sum, p) => sum + p.y, 0) / porch.length}
}

// A waste bin on every house's porch. The player clears burnt-out fireworks away by
// dragging them into theirs, and each family carries the ones they clear up to their own
const createBins = (background: Background) => {
  const bins = background.houses.map(({porch}) => {
    const at = binSpot(porch, point => isInside(point, porch))
    const bin = new Container()
    bin.addChild(drawBin())
    bin.position.copyFrom(at)
    bin.zIndex = at.y
    bin.eventMode = "none"
    background.decorations.addChild(bin)
    return {at, bin}
  })
  const home = bins[background.home()]
  // The player's says what it's for, when it's hovered over or held
  home.bin.eventMode = "static"
  home.bin.hitArea = new Rectangle(-size.width / 2 - 2, -size.height - 7, size.width + 4, size.height + 7)
  addTooltip(home.bin, () => ({title: LL.tooltip.bin.name(), lines: [LL.tooltip.bin.hint()]}))
  let targeted = false

  return {
    // Where each house's bin stands, by its foot, by the house's place along the street
    at: (idx: number) => bins[idx].at,
    // The player's bin, for its tooltip to be shown
    home: home.bin,
    // Whether something drawn in a box on screen is over the player's bin
    isOver: (box: Rectangle) => overlap(box, screenBox(home.bin)) > 0,
    // Grows and outlines the player's bin while something it takes is dragged over it
    setTargeted(on: boolean) {
      if (on !== targeted) {
        targeted = on
        home.bin.scale.set(on ? targetGrowth : 1)
        setOutline(home.bin, "selected", on)
      }
    },
  }
}

type Bins = ReturnType<typeof createBins>

export {createBins}
export type {Bins}
