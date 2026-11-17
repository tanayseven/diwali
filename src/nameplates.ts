import {Container, Graphics, Text} from "pixi.js"
import {fontFamily} from "./app"
import type {Background} from "./background"
import type {Lighting} from "./lighting"
import {LL} from "./locale"

// A wooden plaque over each house's front door with the house's name on it in gold,
// written in the game's language. It's lit by the lamp over the door, so it reads at
// night, and only seen, never pressed
const plaqueHeight = 15
const padding = 6
// The text's drawn this big, and scaled down to fit, so it stays sharp up close
const drawnSize = 72
const gap = 10

const createNameplates = (background: Background, lighting: Lighting) => {
  const layer = new Container()
  layer.eventMode = "none"
  layer.zIndex = lighting.aboveNight
  background.decorations.addChild(layer)
  background.houses.forEach(({name, door}) => {
    const text = new Text({
      text: LL.houses[name](),
      style: {fontFamily, fontSize: drawnSize, fill: 0xf2c96a},
      resolution: 2,
    })
    text.anchor.set(0.5)
    text.scale.set((plaqueHeight - 4) / drawnSize)
    const width = text.width + padding * 2
    const plaque = new Graphics()
      .roundRect(-width / 2, -plaqueHeight / 2, width, plaqueHeight, 3)
      .fill(0x3f2618)
      .stroke({width: 1, color: 0xb07a2a})
    const holder = new Container()
    holder.addChild(plaque, text)
    holder.position.set((door.left + door.right) / 2, door.top - gap - plaqueHeight / 2)
    // A little dimmer than full, as it's lit only by the lamp
    holder.alpha = 0.92
    layer.addChild(holder)
  })
  return {
    destroy() {
      layer.destroy({children: true})
    },
  }
}

export {createNameplates}
