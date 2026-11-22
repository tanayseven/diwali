// Takes the game's screenshots, in web/screenshots/, by playing the
// built game in headless Chromium on a landscape phone's screen: diyas lit on the porch,
// fireworks going off, fairy lights hung on the house, a rangoli design on the floor, lit
// kandils hung from the house, and the whole street, zoomed out, then, played again with
// the families out on the porches, one celebrating by the diyas lit on its porch. The
// website's home page shows them as they are, and scripts/store/captioned.mjs frames
// them, with captions, for the stores.
//
//   npm run build && node scripts/store/screenshots.mjs [out-dir]
//
// The positions below are where the rail's buttons, the bar's slots and the porch are on
// that screen, in CSS pixels, so a change to the layout needs them moved too
import {mkdirSync} from "node:fs"
import {chromium} from "playwright-core"
import {preview} from "vite"

const root = new URL("../../", import.meta.url).pathname
const out = process.argv[2] ?? `${root}web/screenshots`
const port = 4174

// A 20:9 phone held sideways, 1920 pixels wide
const screen = {width: 844, height: 390, density: 1920 / 844}
// The rail's buttons down the left, top to bottom
const rail = {diyas: 43, fireworks: 110, kandil: 177, decorate: 244, rangoli: 311}
// The bar's slots along the bottom, left to right
const slot = index => ({x: 125 + 66 * index, y: 300})

const server = await preview({root, preview: {port, strictPort: true}, logLevel: "error"})
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM} : {})
const page = await browser.newPage({
  viewport: {width: screen.width, height: screen.height},
  deviceScaleFactor: screen.density,
})
page.on("pageerror", error => console.error("Page error:", error.message))
// As someone who's used every tool before and been shown how to zoom, so no tool's
// first step, nor how to zoom, nor the guided first run, nor how to make a kandil, is
// shown over the scene
await page.addInitScript(() => {
  localStorage.setItem("diwali-house", "deepaNiwas")
  localStorage.setItem("diwali-introduced-tools", JSON.stringify(["zoom", "tour", "diyas", "fireworks", "kandil", "kandil-shown", "decorate", "rangoli"]))
})

const drag = async (from, to, {hold = 0, steps = 12} = {}) => {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, {steps})
  await page.waitForTimeout(hold)
  await page.mouse.up()
  await page.waitForTimeout(150)
}
// Picks a tool from the rail, and waits for its bar to finish sliding in, as its slots
// can't be pressed until then: src/hud.ts waits 120 ms, then slides it in over 240 ms
const barShown = 600
const pickTool = async y => {
  await page.mouse.click(52, y)
  await page.waitForTimeout(barShown)
}
// Moves the mouse off everything, so no tooltip's showing, and takes the shot
let shots = 0
const shoot = async () => {
  await page.mouse.move(screen.width - 5, screen.height / 2)
  // And off the screen, as far as the game can tell, so nothing that follows the mouse,
  // like a design about to be put down or a bulb about to be hung, is in the shot
  await page.evaluate(() => document.querySelector("canvas").dispatchEvent(new PointerEvent("pointerleave", {pointerType: "mouse"})))
  await page.waitForTimeout(400)
  shots += 1
  await page.screenshot({path: `${out}/${shots}.png`})
}

mkdirSync(out, {recursive: true})
// Past the warning and the advice on sound, each as soon as it's shown
const pastSplashes = async () => {
  for (const text of ["flashing and twinkling lights", "stereo sound system"]) {
    await page.getByText(text).waitFor()
    await page.waitForTimeout(900)
    await page.mouse.click(screen.width / 2, screen.height / 2)
  }
  await page.waitForTimeout(1500)
}
// Starting close up on the porch, where it puts things, without the families, who'd
// wander in front of them
await page.goto(`http://localhost:${port}/?start=porch&guests=off`)
await page.getByRole("button", {name: "English"}).click()
await pastSplashes()

// Diyas along the porch, each with a wick and oil, lit with the match
// Round where the rangoli goes, in the middle of the porch
const diyas = [{x: 290, y: 234}, {x: 420, y: 198}, {x: 550, y: 234}]
const lightDiyas = async spots => {
  for (const at of spots) {
    await drag(slot(0), at)
    await drag(slot(1), at)
    await drag(slot(2), at)
    // The oil's poured before the next can go in
    await page.waitForTimeout(1600)
  }
  await page.mouse.move(slot(3).x, slot(3).y)
  await page.mouse.down()
  for (const at of spots) {
    await page.mouse.move(at.x, at.y - 6, {steps: 12})
    await page.waitForTimeout(1300)
  }
  await page.mouse.up()
  await page.waitForTimeout(800)
}
await pickTool(rail.diyas)
await lightDiyas(diyas)
await shoot()

// An anar and a chakri lit beside them
await pickTool(rail.fireworks)
const anar = {x: 250, y: 250}
const chakri = {x: 620, y: 240}
await drag(slot(0), anar)
await drag(slot(2), chakri)
await page.mouse.move(slot(6).x, slot(6).y)
await page.mouse.down()
for (const at of [anar, chakri]) {
  await page.mouse.move(at.x, at.y - 4, {steps: 12})
  await page.waitForTimeout(1300)
}
await page.mouse.up()
await page.waitForTimeout(3500)
await shoot()

// Strings of fairy lights hung across the house
await pickTool(rail.decorate)
await page.mouse.click(slot(0).x, slot(0).y)
await drag({x: 200, y: 60}, {x: 420, y: 70}, {steps: 20})
await drag({x: 440, y: 70}, {x: 660, y: 60}, {steps: 20})
await page.waitForTimeout(1500)
await shoot()

// A rangoli on the floor, made in its panel: a star in the middle of a ring of petals and
// a scalloped border, put down in the middle of the porch
await pickTool(rail.rangoli)
await page.mouse.click(slot(0).x, slot(0).y)
const panel = page.getByRole("dialog", {name: "Draw Rangoli"})
await panel.waitFor()
for (const choice of ["centre star", "centre yellow", "ring petals", "ring red", "border scallops", "border orange"]) {
  await page.getByRole("button", {name: choice}).click()
}
await page.getByRole("button", {name: "✓"}).click()
await panel.waitFor({state: "hidden"})
await page.mouse.click(420, 232)
await shoot()

// Kandils hung from the house, each made by tapping a paper, tails and the bulb, as one
// just hung is picked to take what's tapped next
await pickTool(rail.kandil)
const kandils = [{at: {x: 150, y: 95}, paper: 1, tails: 5}, {at: {x: 690, y: 95}, paper: 3, tails: 7}, {at: {x: 560, y: 110}, paper: 4, tails: 8}]
for (const {at, paper, tails} of kandils) {
  await drag(slot(0), at, {steps: 16})
  for (const idx of [paper, tails, 9]) {
    await page.mouse.click(slot(idx).x, slot(idx).y)
    await page.waitForTimeout(250)
  }
}
// Long enough for what each needed next to have floated away
await page.waitForTimeout(3000)
await shoot()

// The whole street, zoomed right out, with the house lit up in the middle of it
for (let i = 0; i < 8; i++) {
  await page.keyboard.press("-")
  await page.waitForTimeout(300)
}
// With the bar hidden, so it doesn't cover the porch, and shown again after
await page.keyboard.press("h")
await page.waitForTimeout(1500)
await shoot()
await page.keyboard.press("h")

// Played again with the families out on the porches: diyas lit on this one, then the
// porch left to its family for a while, to light more of their own and celebrate
await page.goto(`http://localhost:${port}/?start=porch`)
await pastSplashes()
await pickTool(rail.diyas)
await lightDiyas(diyas)
await page.waitForTimeout(45000)
await shoot()

await browser.close()
server.httpServer.close()
console.log(`${shots} screenshots in ${out}`)
