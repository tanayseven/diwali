import {Particle, ParticleContainer} from "pixi.js"

// What a particle layer draws. A layer draws, and sends to the graphics card, every
// particle in it every frame, spent or not, so instead of keeping every particle ever
// made in it, only the ones shown each frame are put in it: those still alive and on
// screen. Ones that have left the screen keep moving, so they're back where they should
// be if they come into view.
//
// What doesn't change from frame to frame (the texture, and whatever isn't listed in
// its dynamicProperties) must be the same for every particle in the layer. It's only
// sent when there are more particles than ever before, not whenever which particles
// are shown changes, which is nearly every frame
const createShownParticles = (layer: ParticleContainer) => {
  // The particles shown so far this frame
  let shown: Particle[] = []
  // The most there have been, which the unchanging part has been sent for
  let most = 0
  layer.particleChildren = []

  return {
    // Draws a particle this frame
    show(particle: Particle) {
      shown.push(particle)
    },
    // Puts the particles shown since last time in the layer, and starts on the next frame
    draw() {
      const drawn = layer.particleChildren as Particle[]
      layer.particleChildren = shown
      if (shown.length > most) {
        most = shown.length
        layer.update()
      }
      layer.visible = shown.length > 0
      // Last frame's list is free again, for the next
      shown = drawn
      shown.length = 0
    },
  }
}

export {createShownParticles}
