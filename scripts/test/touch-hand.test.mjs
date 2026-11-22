// Plays the game in headless Chromium as a phone held sideways, with touch, and checks
// that a finger dragging something from any bar has a hand drawn holding it, and that a
// mouse doesn't. And that what's dragged only has to touch what it goes onto, and that
// either bar's matchstick lights diyas and fireworks alike. And that what's let go
// is put down where it's shown, above the finger, even with the finger over the bar, and
// a tap on a placed firework doesn't move it. And what's felt: a buzz for something
// that's put down, and a double one, and where it goes shown, for something let go
// where it can't go. And that a finger held on a rail button shows its tool's name, as
// there's no hovering on a touch screen. And that a string of fairy lights hung by a
// finger is held up by a hand. And that a kandil just made takes what's tapped in its
// bar. And that a ready-made rangoli design can be made and put
// down, and slid to where it's to go before it's let go. And that the settings, from the
// gear button, can turn the music off and reduce flashing, as the warning at the start can.
// And that the guided first run waits for each step, and can be skipped. And that, in the
// Android app, it's offered to rate it, gently.
// The game's muted from the moment it starts, so nothing's heard while it runs.
//
//   npm run test:e2e
//
// The hand is looked for by its skin's colours on the screen, in the square round the
// finger, a little up and to the left of it, where the palm is: what it holds is further
// up and to the left, out of the square.
// The positions below are where the rail's buttons and the bar's slots are on that
// screen, in CSS pixels, as in scripts/store/screenshots.mjs
import assert from "node:assert/strict"
import {after, before, test} from "node:test"
import {fileURLToPath} from "node:url"
import {chromium, devices} from "playwright-core"
import {createServer} from "vite"

const root = fileURLToPath(new URL("../../", import.meta.url))
const port = 4175

// A Pixel 7 held sideways, at the size the positions below are for
const screen = {width: 844, height: 390}
const phone = {...devices["Pixel 7 landscape"], viewport: screen, screen}
const rail = {diyas: 43, fireworks: 110, kandil: 177, decorate: 244, rangoli: 311}
const slot = index => ({x: 125 + 66 * index, y: 300})
const porch = {x: 450, y: 225}

// Saved before the game's scripts run, as a visitor who'd muted it last time, so it
// starts muted. Chromium's also told to play nothing, in case
const muted = {volume: 0.5, muted: true}

let server
let browser
let page
let touchscreen

// Free play, from the menu after the splashes, once it's faded in, as taps before then
// are taken to be meant for the splash before
const freePlay = async on => {
  const menu = on.getByRole("dialog", {name: "How will you celebrate?"})
  await menu.waitFor({timeout: 10000})
  await on.waitForFunction(() => getComputedStyle(document.querySelector("[aria-label='How will you celebrate?']")).opacity === "1")
  await menu.getByRole("button", {name: "Free play"}).tap()
  await menu.waitFor({state: "hidden", timeout: 20000})
}

before(async () => {
  server = await createServer({root, server: {port, strictPort: true}, logLevel: "error"})
  await server.listen()
  browser = await chromium.launch({
    // HEADFUL=1 shows the browser, to watch the tests play
    headless: !process.env.HEADFUL,
    args: ["--mute-audio"],
    ...process.env.PLAYWRIGHT_CHROMIUM ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM} : {},
  })
  const context = await browser.newContext(phone)
  await context.addInitScript(settings => {
    localStorage.setItem("diwali-audio", JSON.stringify(settings))
    // In the first house, without picking it, and without the guided first run, which
    // have a test of their own, in a game of their own
    if (!localStorage.getItem("diwali-house")) {
      localStorage.setItem("diwali-house", "deepaNiwas")
    }
    if (!localStorage.getItem("diwali-introduced-tools")) {
      localStorage.setItem("diwali-introduced-tools", JSON.stringify(["tour"]))
    }
  }, muted)
  // Every vibration asked for, kept to look at, in place of vibrating
  await context.addInitScript(() => {
    window.vibrations = []
    navigator.vibrate = pattern => {
      window.vibrations.push(pattern)
      return true
    }
  })
  page = await context.newPage()
  page.on("pageerror", error => console.error("Page error:", error.message))
  touchscreen = await context.newCDPSession(page)

  // Without the families on the porches, who'd wander into the parts of the screen
  // looked at, and starting close up on the porch, where the tests put things
  await page.goto(`http://localhost:${port}/?guests=off&start=porch`)
  await page.getByRole("button", {name: "English"}).tap()
  // Past the warning and the advice on sound, each as soon as it's shown
  for (const text of ["flashing and twinkling lights", "stereo sound system"]) {
    await page.getByText(text).waitFor({timeout: 60000})
    await page.waitForTimeout(900)
    await page.touchscreen.tap(screen.width / 2, screen.height / 2)
  }
  await freePlay(page)
  await page.waitForTimeout(2000)
})

after(async () => {
  await browser?.close()
  await server?.close()
})

// A finger put down at one point and moved to another, left there until let go
const touchDown = async (from, to) => {
  const touch = (type, at) => touchscreen.send("Input.dispatchTouchEvent", {type, touchPoints: [at]})
  await touch("touchStart", from)
  for (let step = 1; step <= 12; step++) {
    await touch("touchMove", {x: from.x + (to.x - from.x) * step / 12, y: from.y + (to.y - from.y) * step / 12})
    await page.waitForTimeout(16)
  }
  await page.waitForTimeout(300)
}
const touchUp = async () => {
  await touchscreen.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []})
  await page.waitForTimeout(300)
}

// How many pixels in the square round a point, a little up and to the left of it, are
// the hand's skin
const handPixels = async at => {
  const shot = await page.screenshot({clip: {x: at.x - 55, y: at.y - 55, width: 70, height: 70}})
  return page.evaluate(async png => {
    const image = new Image()
    image.src = `data:image/png;base64,${png}`
    await image.decode()
    const canvas = document.createElement("canvas")
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext("2d")
    context.drawImage(image, 0, 0)
    const {data} = context.getImageData(0, 0, canvas.width, canvas.height)
    let count = 0
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
      if (r >= 150 && r <= 240 && r - g >= 25 && r - g <= 75 && g - b >= 20 && g - b <= 65) {
        count += 1
      }
    }
    return count / (canvas.width * canvas.height)
  }, shot.toString("base64"))
}
// More than this much of the square is skin when the hand's there, and less when it isn't
const shown = 0.1
const notShown = 0.02

test("starts muted, and stays muted", async () => {
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("diwali-audio")))
  assert.equal(saved.muted, true)
  await page.getByRole("button", {name: "Unmute music"}).waitFor()
})

test("the first visit shows how to zoom, in and then out", async () => {
  // Zoomed in, then out, the zoom out button saying what it does as it does, which can
  // take a while on a slow, busy machine
  await page.getByText("Zoom out", {exact: true}).waitFor({timeout: 20000})
  // And then it's done, with nothing over the scene
  await page.getByText("Zoom out", {exact: true}).waitFor({state: "hidden", timeout: 20000})
})

test("a diya dragged by a finger is held by a hand, which goes once it's let go", async () => {
  await page.touchscreen.tap(52, rail.diyas)
  await page.waitForTimeout(800)
  assert.ok(await handPixels(porch) < notShown, "nothing hand-coloured there before")
  await touchDown(slot(0), porch)
  const holding = await handPixels(porch)
  await touchUp()
  assert.ok(holding > shown, `the hand holds the diya (${holding.toFixed(3)} of the square)`)
  assert.ok(await handPixels(porch) < notShown, "the hand's gone once the diya's let go")
})

test("the match dragged by a finger is held by a hand", async () => {
  const at = {x: porch.x + 150, y: porch.y}
  await touchDown(slot(3), at)
  const holding = await handPixels(at)
  await touchUp()
  assert.ok(holding > shown, `the hand holds the match (${holding.toFixed(3)} of the square)`)
  assert.ok(await handPixels(at) < notShown, "the hand's gone once the match is put back")
})

test("a firework dragged by a finger is held by a hand", async () => {
  await page.touchscreen.tap(52, rail.fireworks)
  await page.waitForTimeout(800)
  const at = {x: porch.x - 150, y: porch.y}
  await touchDown(slot(0), at)
  const holding = await handPixels(at)
  await touchUp()
  assert.ok(holding > shown, `the hand holds the anar (${holding.toFixed(3)} of the square)`)
  assert.ok(await handPixels(at) < notShown, "the hand's gone once the anar's let go")
})

test("a mouse drag has no hand", async () => {
  const at = {x: porch.x + 150, y: porch.y + 20}
  await page.mouse.move(slot(1).x, slot(1).y)
  await page.mouse.down()
  await page.mouse.move(at.x, at.y, {steps: 12})
  await page.waitForTimeout(300)
  const holding = await handPixels(at)
  await page.mouse.up()
  assert.ok(holding < notShown, `no hand with a mouse (${holding.toFixed(3)} of the square)`)
})

test("a kandil's frame dragged by a finger is held by a hand", async () => {
  await page.touchscreen.tap(52, rail.kandil)
  await page.waitForTimeout(800)
  const at = {x: porch.x - 100, y: porch.y - 45}
  await touchDown(slot(0), at)
  const holding = await handPixels(at)
  await touchUp()
  assert.ok(holding > shown, `the hand holds the frame (${holding.toFixed(3)} of the square)`)
  assert.ok(await handPixels(at) < notShown, "the hand's gone once the frame's let go")
})

test("a kandil just made takes paper tapped in the bar, and says so when it can't take more", async () => {
  await page.evaluate(() => window.vibrations.length = 0)
  // The frame just put down is picked, so a tap on a paper wraps it
  await page.touchscreen.tap(slot(1).x, slot(1).y)
  await page.waitForTimeout(400)
  // Already wrapped, a second paper isn't taken, and that's felt
  await page.touchscreen.tap(slot(2).x, slot(2).y)
  await page.waitForTimeout(400)
  assert.deepEqual(await page.evaluate(() => window.vibrations), [20, [25, 60, 25]])
  // Until the kandil's tooltip, saying what it needs, has gone, as it can cover the rail
  await page.waitForTimeout(2800)
})

test("a string of fairy lights hung by a finger is held up by a hand, and hung", async () => {
  await page.touchscreen.tap(52, rail.decorate)
  await page.waitForTimeout(800)
  await page.evaluate(() => window.vibrations.length = 0)
  // Across the front of the house, above the porch, held up and to the left of the finger,
  // right of the kandil the tests before put down, so the finger doesn't pick that up
  const from = {x: porch.x + 40, y: 145}
  const to = {x: porch.x + 260, y: 135}
  await touchDown(from, to)
  const holding = await handPixels(to)
  await touchUp()
  assert.ok(holding > shown, `the hand holds the string's end (${holding.toFixed(3)} of the square)`)
  assert.ok(await handPixels(to) < notShown, "the hand's gone once the string's hung")
  assert.deepEqual(await page.evaluate(() => window.vibrations), [20], "hung, it's felt")
})

// Something dragged from a bar with the mouse, let go at a point
const mouseDrag = async (from, to, hold = 300) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, {steps: 12})
  await page.waitForTimeout(hold)
  await page.mouse.up()
  await page.waitForTimeout(300)
}
// How much of a part of the screen is blue
const bluePixels = async clip => {
  const shot = await page.screenshot({clip})
  return page.evaluate(async png => {
    const image = new Image()
    image.src = `data:image/png;base64,${png}`
    await image.decode()
    const canvas = document.createElement("canvas")
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext("2d")
    context.drawImage(image, 0, 0)
    const {data} = context.getImageData(0, 0, canvas.width, canvas.height)
    let count = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 2] > data[i] + 30 && data[i + 2] > data[i + 1] + 15) {
        count += 1
      }
    }
    return count / (canvas.width * canvas.height)
  }, shot.toString("base64"))
}
// That something placed's tooltip says something of it, from hovering over it with the
// mouse, again and again until it does, as on a slow machine pouring oil or striking the
// match takes longer than it should
const says = async (at, text) => {
  const said = page.getByText(text, {exact: true})
  const until = Date.now() + 20000
  for (;;) {
    await page.mouse.move(at.x - 60, at.y - 60)
    await page.mouse.move(at.x, at.y - 4, {steps: 4})
    try {
      await said.waitFor({timeout: 1500})
      break
    } catch (error) {
      if (Date.now() > until) {
        throw error
      }
    }
  }
  await page.mouse.move(at.x - 60, at.y - 60)
}
// Where a diya's put down, standing on the porch, away from what the tests before left
const diya = {x: porch.x + 70, y: porch.y - 10}

test("oil goes into a diya the bottle only touches, not just one under the pointer", async () => {
  await page.mouse.click(52, rail.diyas)
  await page.waitForTimeout(800)
  await mouseDrag(slot(0), diya)
  await mouseDrag(slot(1), diya)
  await says(diya, "Needs oil")
  // The pointer's above the bowl, clear of it, but the bottle reaches down onto it
  await mouseDrag(slot(2), {x: diya.x, y: diya.y - 22})
  await says(diya, "Ready to light with the matchstick")
})

test("the Fireworks bar's matchstick lights a diya", async () => {
  await page.mouse.click(52, rail.fireworks)
  await page.waitForTimeout(800)
  // Held there while it's struck, put to the wick, and catches, which takes a second,
  // or longer on a slow machine, whose frames are only counted up to a tenth of a second
  await mouseDrag(slot(6), {x: diya.x + 14, y: diya.y - 18}, 4000)
  await says(diya, "Lit")
})

test("a diya let go by a finger with it shown just above the bar goes onto the porch", async () => {
  await page.touchscreen.tap(52, rail.diyas)
  await page.waitForTimeout(800)
  // Shown on the porch, but with the finger, down and to the right of it, over the bar
  const shownAt = {x: porch.x + 170, y: porch.y + 22}
  await touchDown(slot(0), {x: shownAt.x + 64, y: shownAt.y + 64})
  await touchUp()
  await says(shownAt, "Needs a wick and oil")
})

test("a tap on a placed firework leaves it where it is", async () => {
  await page.touchscreen.tap(52, rail.fireworks)
  await page.waitForTimeout(800)
  // Low on the porch, so if a tap picked it up, it'd be put down on the porch further up
  const anar = {x: porch.x + 90, y: porch.y + 33}
  await mouseDrag(slot(0), anar)
  await page.touchscreen.tap(anar.x, anar.y - 6)
  await page.waitForTimeout(500)
  await says(anar, "Anar")
})

test("a finger held on a rail button shows the tool's name", async () => {
  const name = page.getByText("Craft Kandil", {exact: true})
  const button = {x: 52, y: rail.kandil}
  await touchscreen.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [button]})
  // Shown after a moment, which on a slow machine can be a while
  const shownWhileHeld = await name.waitFor({timeout: 5000}).then(() => true, () => false)
  await touchscreen.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []})
  assert.ok(shownWhileHeld, "the tool's name shows while the finger's held on its button")
})

test("a finger held on a placed diya shows what it is", async () => {
  const lit = page.getByText("Lit", {exact: true})
  const at = {x: diya.x, y: diya.y - 4}
  await touchscreen.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [at]})
  // Shown once it's been held a moment, which can take a while on a slow, busy machine
  const shownWhileHeld = await lit.waitFor({timeout: 10000}).then(() => true, () => false)
  await touchscreen.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []})
  assert.ok(shownWhileHeld, "the diya's tooltip shows while the finger's held on it")
})

// A diya put down and given a wick and oil by mouse, ready to light
const readyDiya = async at => {
  await page.mouse.click(52, rail.diyas)
  await page.waitForTimeout(800)
  await mouseDrag(slot(0), at)
  await mouseDrag(slot(1), at)
  await mouseDrag(slot(2), {x: at.x, y: at.y - 22})
  await says(at, "Ready to light with the matchstick")
}

test("a tap on the matchstick, then on a diya, lights it, and a tap on nothing puts the match away", async () => {
  const at = {x: porch.x - 40, y: porch.y - 10}
  await readyDiya(at)
  await page.touchscreen.tap(slot(3).x, slot(3).y)
  await page.waitForTimeout(300)
  // Held up from the slot by the hand, ready
  assert.ok(await handPixels({x: slot(3).x, y: slot(3).y}) > shown, "the match is in hand")
  await page.touchscreen.tap(at.x, at.y - 6)
  // Struck and caught, which takes a second, or longer on a slow machine
  await page.waitForTimeout(2500)
  // Still in hand, held to the diya by the stick, the hand reaching up from below right
  const hand = {x: at.x + 90, y: at.y + 55}
  assert.ok(await handPixels(hand) > shown, "the match is still in hand by the diya")
  // Up on the house, with nothing to light
  await page.touchscreen.tap(porch.x, 60)
  await page.waitForTimeout(300)
  assert.ok(await handPixels(hand) < notShown, "the match is put away")
  await says(at, "Lit")
})

test("taps on one diya after another, without waiting, light each of them in turn", async () => {
  const first = {x: porch.x - 170, y: porch.y - 30}
  const second = {x: porch.x + 210, y: porch.y - 30}
  await readyDiya(first)
  await readyDiya(second)
  await page.touchscreen.tap(slot(3).x, slot(3).y)
  await page.waitForTimeout(300)
  await page.touchscreen.tap(first.x, first.y - 6)
  await page.waitForTimeout(150)
  await page.touchscreen.tap(second.x, second.y - 6)
  // Then put away, once both have caught
  await page.waitForTimeout(150)
  await page.touchscreen.tap(porch.x, 60)
  await page.waitForTimeout(4000)
  await says(first, "Lit")
  await says(second, "Lit")
})

test("the match let go a moment after it's put to a diya still lights it", async () => {
  const at = {x: porch.x - 110, y: porch.y - 10}
  await readyDiya(at)
  await page.mouse.move(slot(3).x, slot(3).y)
  await page.mouse.down()
  await page.mouse.move(at.x + 14, at.y - 18, {steps: 12})
  // Let go as it's struck, long before it's caught
  await page.waitForTimeout(200)
  await page.mouse.up()
  await page.waitForTimeout(2500)
  await says(at, "Lit")
})

test("a click on the matchstick takes it in hand, to light a diya by moving the mouse over it", async () => {
  const at = {x: porch.x + 20, y: porch.y - 35}
  await readyDiya(at)
  await page.mouse.click(slot(3).x, slot(3).y)
  // No button held, as it's carried
  await page.mouse.move(at.x + 14, at.y - 18, {steps: 12})
  // Held there till it's caught, which on a slow machine, whose frames are only counted
  // up to a tenth of a second, takes a good deal longer than a second, then put away
  await page.waitForTimeout(6000)
  await page.keyboard.press("Escape")
  await says(at, "Lit")
})

test("a diya let go off the porch goes back, buzzes, and its slot says where it goes", async () => {
  await page.touchscreen.tap(52, rail.diyas)
  await page.waitForTimeout(800)
  await page.evaluate(() => window.vibrations.length = 0)
  // Shown up in the sky, well off the porch
  await touchDown(slot(0), {x: porch.x + 64, y: 40 + 64})
  await touchUp()
  await page.getByText("An oil lamp. Drag one onto the porch", {exact: true}).waitFor({timeout: 3000})
  assert.deepEqual(await page.evaluate(() => window.vibrations), [[25, 60, 25]])
})

test("a diya put down on the porch by a finger is felt", async () => {
  await page.evaluate(() => window.vibrations.length = 0)
  // With the finger right of the bar
  const shownAt = {x: porch.x + 250, y: porch.y + 10}
  await touchDown(slot(0), {x: shownAt.x + 64, y: shownAt.y + 64})
  await touchUp()
  assert.deepEqual(await page.evaluate(() => window.vibrations), [12])
})

test("a ready-made rangoli design, mixed in its panel, is put down where the floor's tapped", async () => {
  await page.touchscreen.tap(52, rail.rangoli)
  await page.waitForTimeout(800)
  // Its bar's first slot, which shows the design picked, opens the panel
  await page.touchscreen.tap(slot(0).x, slot(0).y)
  const panel = page.getByRole("dialog", {name: "Draw Rangoli"})
  await panel.waitFor({timeout: 3000})
  await page.getByRole("button", {name: "centre star"}).tap()
  // Blue, which nothing else in the scene is, unlike leaves and petals blowing past
  await page.getByRole("button", {name: "ring blue"}).tap()
  await page.getByRole("button", {name: "✓"}).tap()
  await panel.waitFor({state: "hidden", timeout: 3000})
  // Well clear of what the tests before put on the porch
  const at = {x: porch.x - 200, y: porch.y + 25}
  const clip = {x: at.x - 50, y: at.y - 25, width: 100, height: 50}
  const before = await bluePixels(clip)
  await page.touchscreen.tap(at.x, at.y)
  await page.waitForTimeout(500)
  const after = await bluePixels(clip)
  assert.ok(after > before + 0.02, `the design's blue ring is on the floor there (${before.toFixed(3)} to ${after.toFixed(3)} of it blue)`)
})

test("a ready-made rangoli design is slid by a finger to where it's let go", async () => {
  // From a bare patch of floor, between what the tests before put down, to the right
  const from = {x: porch.x - 60, y: porch.y + 15}
  const to = {x: porch.x + 50, y: porch.y + 15}
  const clip = {x: to.x - 50, y: to.y - 25, width: 100, height: 50}
  const before = await bluePixels(clip)
  await touchDown(from, to)
  await touchUp()
  const after = await bluePixels(clip)
  assert.ok(after > before + 0.02, `the design's blue ring is on the floor where it was let go (${before.toFixed(3)} to ${after.toFixed(3)} of it blue)`)
})

test("the gear opens the settings, where the music's turned off, which is remembered", async () => {
  await page.getByRole("button", {name: "Settings"}).tap()
  const panel = page.getByRole("dialog", {name: "Settings"})
  await panel.waitFor({timeout: 3000})
  await page.getByRole("switch", {name: "Music"}).tap()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("diwali-audio")))
  assert.equal(saved.musicOn, false)
  // And flashing reduced, then back as it was
  await page.getByRole("switch", {name: "Reduce flashing"}).tap()
  assert.equal(await page.evaluate(() => localStorage.getItem("diwali-reduce-flashing")), "1")
  await page.getByRole("switch", {name: "Reduce flashing"}).tap()
  assert.equal(await page.evaluate(() => localStorage.getItem("diwali-reduce-flashing")), "0")
  await page.getByRole("button", {name: "Close"}).tap()
  await panel.waitFor({state: "hidden", timeout: 3000})
})

test("the first visit picks a house, then the guided first run waits for each step to be done, and Skip ends it", async () => {
  // A first visit of its own, muted
  const context = await browser.newContext(phone)
  await context.addInitScript(settings => localStorage.setItem("diwali-audio", JSON.stringify(settings)), muted)
  const first = await context.newPage()
  first.on("pageerror", error => console.error("Page error:", error.message))
  try {
    await first.goto(`http://localhost:${port}/?guests=off&start=porch`)
    await first.getByRole("button", {name: "English"}).tap()
    for (const text of ["flashing and twinkling lights", "stereo sound system"]) {
      await first.getByText(text).waitFor({timeout: 60000})
      await first.waitForTimeout(900)
      await first.touchscreen.tap(screen.width / 2, screen.height / 2)
    }
    // Then free play or a tournament, the tournament shown behind the trophy
    const menu = first.getByRole("dialog", {name: "How will you celebrate?"})
    await menu.waitFor({timeout: 10000})
    const tournament = menu.getByRole("button", {name: "Tournament"})
    assert.ok(await tournament.locator("img[src$='trophy.svg']").count() === 1, "the tournament's shown with the trophy")
    await freePlay(first)
    // Every house on the street to pick from, and the first picked, and remembered
    const picker = first.getByRole("dialog", {name: "Pick your house"})
    await picker.waitFor({timeout: 10000})
    assert.equal(await picker.getByRole("button").count(), 6)
    // Once it's faded in, as taps before then are taken to be meant for the screen before
    await first.waitForFunction(() => getComputedStyle(document.querySelector("[aria-label='Pick your house']")).opacity === "1")
    await first.waitForTimeout(500)
    await picker.getByRole("button", {name: "Deepa Niwas"}).tap()
    // Fading out can take a while on a slow, busy machine, as the tests' runner can be
    try {
      await picker.waitFor({state: "hidden", timeout: 20000})
    } catch (error) {
      const state = await first.evaluate(() => {
        const shown = document.querySelector("[aria-label='Pick your house']")
        return {
          house: localStorage.getItem("diwali-house"),
          opacity: shown ? getComputedStyle(shown).opacity : "gone",
          disabled: [...document.querySelectorAll("[aria-label='Pick your house'] button")].map(button => button.disabled),
        }
      })
      throw new Error(`the house picker didn't close: ${JSON.stringify(state)}`, {cause: error})
    }
    assert.equal(await first.evaluate(() => localStorage.getItem("diwali-house")), "deepaNiwas")
    // After how to zoom
    const card = first.getByRole("status")
    await first.getByText("1 / 5").waitFor({timeout: 30000})
    assert.match(await card.textContent(), /Drag a diya/)
    // A diya put on the porch is the first step done
    await first.mouse.move(slot(0).x, slot(0).y)
    await first.mouse.down()
    await first.mouse.move(porch.x, porch.y, {steps: 12})
    await first.mouse.up()
    await first.getByText("2 / 5").waitFor({timeout: 3000})
    await first.getByRole("button", {name: "Skip"}).tap()
    await card.waitFor({state: "hidden", timeout: 3000})
    const introduced = await first.evaluate(() => JSON.parse(localStorage.getItem("diwali-introduced-tools")))
    assert.ok(introduced.includes("tour"), "it's not shown again")
  } finally {
    await context.close()
  }
})

test("in the Android app, a kandil lit in a later session is followed, after a pause, by an offer to rate it", async () => {
  // A second session of its own, with every tool already seen, as the Android app's,
  // which ?rating stands in for here
  const context = await browser.newContext(phone)
  await context.addInitScript(settings => {
    localStorage.setItem("diwali-audio", JSON.stringify(settings))
    localStorage.setItem("diwali-introduced-tools", JSON.stringify(
      ["zoom", "tour", "diyas", "fireworks", "kandil", "kandil-shown", "decorate", "rangoli"]))
    localStorage.setItem("diwali-house", "deepaNiwas")
    if (!localStorage.getItem("diwali-rating")) {
      localStorage.setItem("diwali-rating", JSON.stringify({sessions: 1, askFrom: 2, never: false}))
    }
  }, muted)
  const app = await context.newPage()
  app.on("pageerror", error => console.error("Page error:", error.message))
  try {
    await app.goto(`http://localhost:${port}/?guests=off&start=porch&rating`)
    await app.getByRole("button", {name: "English"}).tap()
    for (const text of ["flashing and twinkling lights", "stereo sound system"]) {
      await app.getByText(text).waitFor({timeout: 60000})
      await app.waitForTimeout(900)
      await app.touchscreen.tap(screen.width / 2, screen.height / 2)
    }
    await freePlay(app)
    await app.waitForTimeout(1500)
    // Rated any time from the settings
    await app.getByRole("button", {name: "Settings"}).tap()
    await app.getByRole("button", {name: "Rate", exact: true}).waitFor({timeout: 3000})
    await app.getByRole("button", {name: "Close"}).tap()
    // A kandil hung from the house, given paper, tails and the bulb by tapping them
    await app.touchscreen.tap(52, rail.kandil)
    await app.waitForTimeout(800)
    await app.mouse.move(slot(0).x, slot(0).y)
    await app.mouse.down()
    await app.mouse.move(330, 110, {steps: 12})
    await app.mouse.up()
    for (const idx of [1, 5, 9]) {
      await app.waitForTimeout(300)
      await app.mouse.click(slot(idx).x, slot(idx).y)
    }
    const asked = app.getByRole("dialog", {name: "Rate the app"})
    await asked.waitFor({timeout: 15000})
    await app.getByRole("button", {name: "Not now"}).tap()
    await asked.waitFor({state: "hidden", timeout: 3000})
    const saved = await app.evaluate(() => JSON.parse(localStorage.getItem("diwali-rating")))
    assert.deepEqual(saved, {sessions: 2, askFrom: 5, never: false}, "asked again three sessions on")
  } finally {
    await context.close()
  }
})

test("a tournament round counts down, scores what's put up, ranks every house, and goes back to free play", async () => {
  const context = await browser.newContext(phone)
  await context.addInitScript(settings => {
    localStorage.setItem("diwali-audio", JSON.stringify(settings))
    localStorage.setItem("diwali-house", "deepaNiwas")
    localStorage.setItem("diwali-introduced-tools", JSON.stringify(["tour", "rangoli"]))
  }, muted)
  const round = await context.newPage()
  round.on("pageerror", error => console.error("Page error:", error.message))
  try {
    // A short round, long enough to light an anar on a slow machine
    await round.goto(`http://localhost:${port}/?guests=off&start=porch&round=30`)
    await round.getByRole("button", {name: "English"}).tap()
    for (const text of ["flashing and twinkling lights", "stereo sound system"]) {
      await round.getByText(text).waitFor({timeout: 60000})
      await round.waitForTimeout(900)
      await round.touchscreen.tap(screen.width / 2, screen.height / 2)
    }
    const menu = round.getByRole("dialog", {name: "How will you celebrate?"})
    await menu.waitFor({timeout: 10000})
    await round.waitForFunction(() => getComputedStyle(document.querySelector("[aria-label='How will you celebrate?']")).opacity === "1")
    await menu.getByRole("button", {name: "Tournament"}).tap()
    // The time left and the player's points, at the top
    const hud = round.getByRole("status")
    await hud.waitFor({timeout: 30000})
    assert.match(await hud.innerText(), /You 0/)
    // Once it's started, a rangoli put down scores, picked from its panel and put down
    // with a tap, as it can be without a drag on a slow machine
    await round.getByText("Go!").waitFor({timeout: 30000})
    await round.touchscreen.tap(52, rail.rangoli)
    await round.waitForTimeout(800)
    await round.touchscreen.tap(slot(0).x, slot(0).y)
    const panel = round.getByRole("dialog", {name: "Draw Rangoli"})
    await panel.waitFor({timeout: 5000})
    await round.getByRole("button", {name: "centre star"}).tap()
    await round.getByRole("button", {name: "✓"}).tap()
    await panel.waitFor({state: "hidden", timeout: 5000})
    await round.touchscreen.tap(porch.x, porch.y + 20)
    await round.waitForFunction(() => /You 40/.test(document.querySelector("[role=status]")?.textContent ?? ""), undefined, {timeout: 15000})
    // Then every house, ranked, with the player's among them
    const results = round.getByRole("dialog", {name: "Results"})
    await results.waitFor({timeout: 60000})
    assert.equal(await results.getByRole("listitem").count(), 6)
    assert.match(await results.innerText(), /Deepa Niwas \(You\)\s+40/)
    assert.equal(await hud.count(), 0, "the round's time and points are gone")
    await round.waitForFunction(() => getComputedStyle(document.querySelector("[aria-label='Results']")).opacity === "1")
    await results.getByRole("button", {name: "Free play"}).tap()
    await results.waitFor({state: "hidden", timeout: 5000})
  } finally {
    await context.close()
  }
})

test("in a tournament round, the street button shows three houses at a time, slid along by the arrows, a tap on a neighbour looks at it, and what it puts up is said", async () => {
  const context = await browser.newContext(phone)
  await context.addInitScript(settings => {
    localStorage.setItem("diwali-audio", JSON.stringify(settings))
    localStorage.setItem("diwali-house", "deepaNiwas")
  }, muted)
  const round = await context.newPage()
  round.on("pageerror", error => console.error("Page error:", error.message))
  try {
    await round.goto(`http://localhost:${port}/?guests=off&start=porch&round=20&camera`)
    await round.getByRole("button", {name: "English"}).tap()
    for (const text of ["flashing and twinkling lights", "stereo sound system"]) {
      await round.getByText(text).waitFor({timeout: 60000})
      await round.waitForTimeout(900)
      await round.touchscreen.tap(screen.width / 2, screen.height / 2)
    }
    const menu = round.getByRole("dialog", {name: "How will you celebrate?"})
    await menu.waitFor({timeout: 10000})
    await round.waitForFunction(() => getComputedStyle(document.querySelector("[aria-label='How will you celebrate?']")).opacity === "1")
    await menu.getByRole("button", {name: "Tournament"}).tap()
    await round.getByText("Go!").waitFor({timeout: 30000})
    const street = round.getByRole("button", {name: "Show the whole street"})
    await street.tap()
    await round.waitForTimeout(1500)
    assert.equal(await street.getAttribute("aria-pressed"), "true")
    // Which houses are wholly on screen, from side to side and roof to ground
    const onScreen = () => round.evaluate(() => window.diwaliCamera.houses().map(({left, top, right, bottom}) => {
      const from = window.diwaliCamera.toScreen({x: left, y: top})
      const to = window.diwaliCamera.toScreen({x: right, y: bottom})
      return from.x >= 0 && from.y >= 0 && to.x <= innerWidth && to.y <= innerHeight
    }))
    // Deepa Niwas, third along, with a neighbour either side
    assert.deepEqual(await onScreen(), [false, true, true, true, false, false])
    // Then a house along to the right
    await round.getByRole("button", {name: "Houses to the right"}).tap()
    await round.waitForTimeout(1500)
    assert.deepEqual(await onScreen(), [false, false, true, true, true, false])
    // A neighbour's decorating is said under the round's pill, as it's done
    await round.waitForFunction(() => [...document.querySelectorAll("[aria-live=polite]")]
      .some(line => / \+\d+$/.test(line.textContent ?? "")), undefined, {timeout: 15000})
    // A tap on the house furthest right of them looks at it, out of the street
    const last = await round.evaluate(() => {
      const {left, right, bottom} = window.diwaliCamera.houses()[4]
      return window.diwaliCamera.toScreen({x: (left + right) / 2, y: bottom - 60})
    })
    await round.touchscreen.tap(last.x, last.y)
    await round.waitForTimeout(1500)
    assert.equal(await street.getAttribute("aria-pressed"), "false")
    const middle = await round.evaluate(() => {
      const {left, right} = window.diwaliCamera.houses()[4]
      return window.diwaliCamera.toScreen({x: (left + right) / 2, y: 0}).x
    })
    assert.ok(Math.abs(middle - screen.width / 2) < screen.width / 4, `the house tapped is in the middle, at ${middle}`)
  } finally {
    await context.close()
  }
})

// Last, as it starts the game again
test("the language picked is used again next time, and the globe button picks another, which it starts again in", async () => {
  await page.reload()
  // Straight to the warning, in English, with no picker, and a switch on it to reduce
  // flashing, which doesn't skip it
  await page.getByText("flashing and twinkling lights", {exact: false}).waitFor({timeout: 60000})
  await page.waitForTimeout(900)
  await page.getByRole("switch", {name: "Reduce flashing"}).tap()
  await page.waitForTimeout(300)
  assert.ok(await page.getByText("flashing and twinkling lights", {exact: false}).isVisible(), "the warning's still shown")
  assert.equal(await page.evaluate(() => localStorage.getItem("diwali-reduce-flashing")), "1")
  assert.equal(await page.getByRole("dialog", {name: "Choose a language"}).count(), 0)
  for (const text of ["flashing and twinkling lights", "stereo sound system"]) {
    await page.getByText(text).waitFor({timeout: 60000})
    await page.waitForTimeout(900)
    await page.touchscreen.tap(screen.width / 2, screen.height / 2)
  }
  await freePlay(page)
  const globe = page.getByRole("button", {name: "English", exact: true})
  await globe.waitFor({timeout: 10000})
  await globe.tap()
  await page.getByRole("dialog", {name: "Choose a language"}).waitFor({timeout: 5000})
  // Another, and the game starts again in it, with only what was in the URL before
  await page.getByRole("button", {name: /हिन्दी/}).tap()
  await page.waitForFunction(() => document.documentElement.lang === "hi", undefined, {timeout: 60000})
  assert.equal(new URL(page.url()).search, "?guests=off&start=porch")
  assert.equal(await page.getByRole("dialog", {name: "Choose a language"}).count(), 0)
})
