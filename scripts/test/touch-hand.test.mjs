// Plays the game in headless Chromium as a phone held sideways, with touch, and checks
// that a finger dragging something from any bar has a hand drawn holding it, and that a
// mouse doesn't. And that what's dragged only has to touch what it goes onto, and that
// either bar's matchstick lights diyas and fireworks alike. And that what's let go
// is put down where it's shown, above the finger, even with the finger over the bar, and
// a tap on a placed firework doesn't move it.
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
const rail = {diyas: 43, fireworks: 110, kandil: 177}
const slot = index => ({x: 125 + 66 * index, y: 300})
const porch = {x: 450, y: 225}

// Saved before the game's scripts run, as a visitor who'd muted it last time, so it
// starts muted. Chromium's also told to play nothing, in case
const muted = {volume: 0.5, muted: true}

let server
let browser
let page
let touchscreen

before(async () => {
  server = await createServer({root, server: {port, strictPort: true}, logLevel: "error"})
  await server.listen()
  browser = await chromium.launch({
    args: ["--mute-audio"],
    ...process.env.PLAYWRIGHT_CHROMIUM ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM} : {},
  })
  const context = await browser.newContext(phone)
  await context.addInitScript(settings => {
    localStorage.setItem("diwali-audio", JSON.stringify(settings))
  }, muted)
  page = await context.newPage()
  page.on("pageerror", error => console.error("Page error:", error.message))
  touchscreen = await context.newCDPSession(page)

  await page.goto(`http://localhost:${port}/`)
  await page.getByRole("button", {name: "English"}).tap()
  // Past the warning and the advice on sound, each as soon as it's shown
  for (const text of ["flashing and twinkling lights", "stereo sound system"]) {
    await page.getByText(text).waitFor({timeout: 60000})
    await page.waitForTimeout(900)
    await page.touchscreen.tap(screen.width / 2, screen.height / 2)
  }
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

// Something dragged from a bar with the mouse, let go at a point
const mouseDrag = async (from, to, hold = 300) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, {steps: 12})
  await page.waitForTimeout(hold)
  await page.mouse.up()
  await page.waitForTimeout(300)
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
  await mouseDrag(slot(5), {x: diya.x + 14, y: diya.y - 18}, 4000)
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
