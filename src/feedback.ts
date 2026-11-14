// What happens, felt as well as seen, as the device vibrating: a tap for something put
// down, a little more for a step done, a double buzz for something that can't go where
// it was let go, and a pattern of its own for each firework going off. Only where the
// browser can vibrate, as phones' browsers and the Android app can; elsewhere, nothing.
// Patterns are in ms, buzzing and pausing in turn
type Pattern = number | number[]

const vibrate = (pattern: Pattern) => {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Not allowed here, such as in a frame
  }
}

const haptics = {
  // A diya, firework or kandil put down where it was let go
  placed: () => vibrate(12),
  // A wick or oil in a diya, paper or tails on a kandil, a string of lights hung
  done: () => vibrate(20),
  // Something lit, with the match or a kandil's bulb
  lit: () => vibrate(30),
  // Something that couldn't go where it was let go, and went back
  refused: () => vibrate([25, 60, 25]),
  // An anar catching, roaring into its fountain
  anar: () => vibrate([40, 30, 25, 30, 20, 30, 15, 30, 10]),
  // Each of a laddi's crackers going off, one after another
  cracker: () => vibrate(18),
  // A chakri catching and whirling up to speed
  chakri: () => vibrate([15, 25, 18, 20, 22, 15, 26, 10, 30]),
  // A sutli bomb's deep boom
  sutli: () => vibrate([160, 40, 70]),
  // A rocket whooshing up out of its bottle
  rocketLaunch: () => vibrate(45),
  // A rocket popping into a ball of stars
  rocketBurst: () => vibrate([70, 30, 30]),
}

// How long the tooltip of where something should go shows, once it's gone back from
// where it was let go, saying where it does go, in ms
const refusalShown = 2500

export {haptics, refusalShown}
