// Plays through the whole game in a Chromium window, as a phone held sideways (a Pixel
// 7, with touch), so the hand drawn holding whatever's dragged shows. Everything's laid
// out symmetrically about the house's front door: zoomed right in, ten diyas along the
// back of the porch, filled, lit with the matchstick and turned to face forward, left
// or right; out a little, four of each firework in two rows, lit one after another; out
// a little more, fairy lights across both wings and five kandils hung from the house, in
// three colourings; then the city zoomed out to, the volume slider and a photo. The
// window closes itself 30 s after it's done.
//
//   npm run demo [-- out-dir]
//
// SLOW stretches every wait and drag (1.25 by default, about as quickly as a person
// would, and 1 is as fast as it goes), HEADLESS=1 plays it without a window, and an
// out-dir saves a screenshot of each step. It exits with an error if the game logged
// any. It starts the dev server itself, on DEMO_PORT (4176 by default), and needs
// Playwright's Chromium (npx playwright-core install chromium), or another one in
// PLAYWRIGHT_CHROMIUM.
//
// Where things go is given in the scene's own units, as in src/background.ts, with the
// door at x 640, and put on screen wherever the camera's got to by asking the game, which
// says where a point in the scene is on screen when it's opened with ?camera. The rail's
// buttons and the bar's slots are where they are on that screen, in CSS pixels, as in
// scripts/store/screenshots.mjs, so a change to the layout needs them moved too
import {mkdirSync} from "node:fs"
import {fileURLToPath} from "node:url"
import {chromium, devices} from "playwright-core"
import {createServer} from "vite"

const root = fileURLToPath(new URL("../../", import.meta.url))
const out = process.argv[2]
const headless = process.env.HEADLESS === "1"
const slow = Number(process.env.SLOW ?? 1.25)
const port = Number(process.env.DEMO_PORT ?? 4176)

const screen = {width: 844, height: 390}
const phone = {...devices["Pixel 7 landscape"], viewport: screen, screen}
// The rail's buttons down the left, top to bottom
const rail = {diyas: 43, fireworks: 110, kandil: 177, decorate: 244, rangoli: 311}
// The bar's slots along the bottom, left to right
const slot = index => ({x: 125 + 66 * index, y: 300})
// The buttons down the right
const speaker = {x: 793, y: 52}
const zoomOut = {x: 793, y: 186}
const camera = {x: 793, y: 262}
// What's dragged by touch is shown this far up and to the left of the finger, as in
// src/touchMarker.ts, and is put down there
const lift = 64

if (out) {
  mkdirSync(out, {recursive: true})
}
const server = await createServer({root, server: {port, strictPort: true}, logLevel: "error"})
await server.listen()
const browser = await chromium.launch({
  headless,
  args: headless ? ["--mute-audio"] : ["--window-size=900,520"],
  ...process.env.PLAYWRIGHT_CHROMIUM ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM} : {},
})
const context = await browser.newContext(phone)
// Heard, but quietly
await context.addInitScript(() => {
  localStorage.setItem("diwali-audio", JSON.stringify({volume: 0.3, muted: false}))
})
const page = await context.newPage()
const errors = []
page.on("pageerror", error => errors.push(error.message))
page.on("console", message => message.type() === "error" && errors.push(message.text()))
const touchscreen = await context.newCDPSession(page)

// Where a point in the scene is on screen, and what's in the middle of the screen, as
// the game has them, wherever its camera's been zoomed or panned to
const onScreen = at => page.evaluate(point => window.diwaliCamera.toScreen(point), at)
const centre = () => page.evaluate(point => window.diwaliCamera.toScene(point), {x: screen.width / 2, y: screen.height / 2})

const wait = ms => page.waitForTimeout(ms * slow)
const shot = async name => out && page.screenshot({path: `${out}/${name}.png`})
const step = name => console.log(new Date().toTimeString().slice(0, 8), name)
const touch = (type, at) => touchscreen.send("Input.dispatchTouchEvent", {type, touchPoints: at ? [at] : []})
const tap = async at => {
  await page.touchscreen.tap(at.x, at.y)
  await wait(400)
}
// A finger put down, moved to another point, held there a while, and lifted
const swipe = async (from, to, hold = 300) => {
  await touch("touchStart", from)
  await wait(150)
  const steps = Math.round(12 * slow)
  for (let i = 1; i <= steps; i++) {
    await touch("touchMove", {x: from.x + (to.x - from.x) * i / steps, y: from.y + (to.y - from.y) * i / steps})
    await page.waitForTimeout(20)
  }
  await wait(hold)
  await touch("touchEnd")
  await wait(300)
}
// Drags what's in a bar's slot so it's shown, and put down, at a point in the scene. The
// finger has to stay above the bar for it to go down there, not back on the bar
const put = async (index, at, hold) => {
  const shown = await onScreen(at)
  await swipe(slot(index), {x: shown.x + lift, y: shown.y + lift}, hold)
}
// Takes the match from a bar's slot and, without letting go, holds it to each of a run
// of things in the scene in turn, long enough for each to catch, as a fresh match is in
// hand as soon as one has
const lightEach = async (index, targets, hold = 1300) => {
  let from = slot(index)
  await touch("touchStart", from)
  await wait(150)
  for (const target of targets) {
    const shown = await onScreen(target)
    const to = {x: shown.x + lift, y: shown.y + lift}
    const steps = Math.round(8 * slow)
    for (let i = 1; i <= steps; i++) {
      await touch("touchMove", {x: from.x + (to.x - from.x) * i / steps, y: from.y + (to.y - from.y) * i / steps})
      await page.waitForTimeout(20)
    }
    await wait(hold)
    from = to
  }
  await touch("touchEnd")
  await wait(300)
}
// A point in the scene moved by a distance in scene units
const by = (at, dx, dy) => ({x: at.x + dx, y: at.y + dy})
// A finger drawn through points in the scene
const draw = async points => {
  const [first, ...rest] = await Promise.all(points.map(onScreen))
  await touch("touchStart", first)
  for (const point of rest) {
    await touch("touchMove", point)
    await page.waitForTimeout(12 * slow)
  }
  await touch("touchEnd")
  await wait(200)
}
// Zooms in (more than 0) or out by a number of presses of the zoom keys, about the
// middle of the screen, and waits for it to ease there
const zoom = async (presses, settle = 400 * slow) => {
  for (let i = 0; i < Math.abs(presses); i++) {
    await page.keyboard.press(presses > 0 ? "+" : "-")
    await page.waitForTimeout(60)
  }
  await page.waitForTimeout(settle)
}
// Pans by a distance on screen with the wheel, as a trackpad scrolls the scenery past
const scroll = async (dx, dy) => {
  await page.mouse.move(screen.width / 2, 20)
  await page.mouse.wheel(dx, dy)
}
// Pans so a point in the scene is in the middle of the screen, or as near as the camera
// goes, scrolling until it's there
const lookAt = async (x, y, settle = 600 * slow) => {
  for (let tries = 0; tries < 10; tries++) {
    const shown = await onScreen({x, y})
    const dx = shown.x - screen.width / 2
    const dy = shown.y - screen.height / 2
    if (Math.hypot(dx, dy) < 2) {
      break
    }
    await scroll(Math.max(-200, Math.min(200, dx)), Math.max(-200, Math.min(200, dy)))
    await page.waitForTimeout(100)
    // Stopped short by the edge of what the camera can see
    const moved = await onScreen({x, y})
    if (Math.hypot(moved.x - shown.x, moved.y - shown.y) < 0.5) {
      break
    }
  }
  await page.waitForTimeout(settle)
}

await page.goto(`http://localhost:${port}/?camera`)
await wait(1500)
step("Language picker")
await page.getByRole("button", {name: "English"}).tap()
// Past the warning and the advice on sound, once each has been seen
for (const text of ["flashing and twinkling lights", "stereo sound system"]) {
  await page.getByText(text).waitFor({timeout: 60000})
  await wait(1500)
  await tap({x: screen.width / 2, y: screen.height / 2})
}
await wait(2000)

// Pairs of points either side of the door, the nearest pair first
const mirrored = (offsets, y) => offsets.flatMap(offset => [{x: 640 - offset, y}, {x: 640 + offset, y}])

// Ten diyas along the back of the porch, five either side of the door, each half done
// zoomed right in. Each turned to face the door, forward, or away from it, mirrored
// either side: a lit diya faces right, then turns to face forward, then left
step("Zooming right in on the porch")
await tap({x: 52, y: rail.diyas})
await zoom(2)
const diyaOffsets = [48, 84, 120, 156, 192]
const facings = ["in", "forward", "out", "forward", "in"]
const turns = {left: {in: 0, forward: 1, out: 2}, right: {in: 2, forward: 1, out: 0}}
for (const side of ["left", "right"]) {
  const sign = side === "left" ? -1 : 1
  const diyas = diyaOffsets.map(offset => ({x: 640 + sign * offset, y: 588}))
  step(`Five diyas on the ${side}, with a wick and oil`)
  await lookAt(side === "left" ? 530 : 750, 596)
  for (const diya of diyas) {
    await put(0, diya, 400)
    await put(1, by(diya, 0, -4.6), 400)
    await put(2, by(diya, 0, -5.8), 600)
  }
  await wait(1200)
  await shot(`diyas-${side}`)
  step("Lighting them one after another with the matchstick")
  await lightEach(3, diyas.map(diya => by(diya, 4.6, -8)))
  await wait(600)
  step("Turning them")
  for (const [i, diya] of diyas.entries()) {
    for (let turn = 0; turn < turns[side][facings[i]]; turn++) {
      await tap(await onScreen(by(diya, 0, -2.3)))
      await wait(500)
    }
  }
  await wait(800)
  await shot(`diyas-${side}-turned`)
}

// Four of each firework in two rows across the porch, two of each either side of the
// door, mirrored, then lit a kind at a time
step("Fireworks, zoomed out a little: four of each, in two rows")
await tap({x: 52, y: rail.fireworks})
await zoom(-4)
await lookAt(640, 645)
// In the bar's order: anar, laddi, chakri, sutli bomb and rocket, each from the door out
const rows = {back: 610, front: 632}
const fireworkOffsets = {anar: 100, laddi: 280, chakri: 220, sutli: 160, rocket: 40}
const kinds = ["anar", "laddi", "chakri", "sutli", "rocket"]
const fireworks = Object.fromEntries(kinds.map(kind => [kind, [
  ...mirrored([fireworkOffsets[kind]], rows.back),
  ...mirrored([fireworkOffsets[kind]], rows.front),
]]))
for (const [index, kind] of kinds.entries()) {
  for (const at of fireworks[kind]) {
    await put(index, at, 300)
  }
}
await wait(500)
await shot("fireworks")
step("What to do next")
await page.locator('button:text-is("?"):visible').first().tap()
await wait(2500)
await shot("hint")
await tap({x: screen.width / 2, y: 40})
const fuseOf = at => by(at, 2.3, -8)
// Left to right along the back row, then right to left along the front
const inTurn = ([backLeft, backRight, frontLeft, frontRight]) => [backLeft, backRight, frontRight, frontLeft]
for (const [kind, name, after] of [["anar", "Anars", 1500], ["laddi", "Laddis", 1500], ["chakri", "Chakris", 2500], ["sutli", "Sutli bombs", 5000]]) {
  step(name)
  await lightEach(5, inTurn(fireworks[kind]).map(fuseOf))
  await wait(after)
  await shot(kind)
}
step("Rockets, then up to the sky to see them burst")
// Each bursts high over the roof a couple of seconds after it's caught, so the pan up to
// the sky isn't slowed, to be there in time
await lightEach(5, inTurn(fireworks.rocket).map(fuseOf))
await lookAt(640, 330, 0)
await page.waitForTimeout(800)
await shot("rockets")
await wait(3000)
await lookAt(640, 560)

// Fairy lights across the front of each wing, and five kandils hung from the house: one
// in the middle over the door, a pair from the porch roof and a pair from the wings,
// each pair coloured alike
step("Fairy lights, mixed, across the front of each wing, zoomed out a little more")
// Moved before the tool's picked, as a press on the house would hang a string
await zoom(-1)
await lookAt(640, 560)
await tap({x: 52, y: rail.decorate})
await tap(slot(6))
const line = (from, to) => Array.from({length: 5}, (_, i) => ({x: from + (to - from) * i / 4, y: 472}))
await draw(line(280, 480))
await wait(1200)
await draw(line(1000, 800))
await wait(2000)
await shot("fairy-lights")

step("Five kandils, hung from the house")
await tap({x: 52, y: rail.kandil})
// Where each is held by the top of its string, and its paper and tails
const kandils = [
  {at: {x: 640, y: 490}, paper: 4, tails: 8},
  ...mirrored([70], 520).map(at => ({at, paper: 1, tails: 7})),
  ...mirrored([290], 495).map(at => ({at, paper: 3, tails: 5})),
]
for (const {at} of kandils) {
  await put(0, at, 400)
  await wait(800)
}
await wait(800)
for (const {at, paper, tails} of kandils) {
  await put(paper, by(at, 0, 17), 400)
  await wait(400)
  await put(tails, by(at, 0, 23), 400)
  await wait(400)
  await put(9, by(at, 0, 17), 400)
  await wait(800)
}
await wait(1000)
await shot("kandils")

step("The whole scene, with the bar hidden")
await page.keyboard.press("h")
await wait(600)
for (let i = 0; i < 3; i++) {
  await tap(zoomOut)
}
await wait(5000)
await shot("city")
await zoom(1)
step("Panning")
// Across the ground in front of the porch, where there's nothing to pick up
await swipe({x: 650, y: 350}, {x: 450, y: 330}, 300)
await wait(1500)
await page.keyboard.press("h")
await wait(600)

step("Volume, by pressing and holding the speaker")
await touch("touchStart", speaker)
await wait(1500)
await touch("touchEnd")
await wait(2000)
await shot("volume")
await tap({x: screen.width / 2, y: 40})
step("Photo")
await tap(camera)
await wait(3000)

if (!headless) {
  step("Done: the window closes in 30 s")
  await page.waitForTimeout(30000)
}
// Whatever went wrong while it played
if (errors.length) {
  console.error("The game logged errors:\n" + errors.join("\n"))
  process.exitCode = 1
}
await browser.close()
await server.close()
