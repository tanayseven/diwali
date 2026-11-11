// Takes the screenshots F-Droid shows on the app's page, in fastlane/, by playing the
// built game in headless Chromium on a landscape phone's screen: diyas lit on the porch,
// fireworks going off, fairy lights hung on the house, and a rangoli drawn on the floor.
//
//   npm run build && node scripts/store/screenshots.mjs [out-dir]
//
// The positions below are where the rail's buttons, the bar's slots and the porch are on
// that screen, in CSS pixels, so a change to the layout needs them moved too
import {mkdirSync} from "node:fs"
import {chromium} from "playwright-core"
import {preview} from "vite"

const root = new URL("../../", import.meta.url).pathname
const out = process.argv[2] ?? `${root}fastlane/metadata/android/en-US/images/phoneScreenshots`
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
  await page.waitForTimeout(400)
  shots += 1
  await page.screenshot({path: `${out}/${shots}.png`})
}

mkdirSync(out, {recursive: true})
await page.goto(`http://localhost:${port}/`)
await page.getByRole("button", {name: "English"}).click()
// Past the warning and the advice on sound, each as soon as it's shown
for (const text of ["flashing and twinkling lights", "stereo sound system"]) {
  await page.getByText(text).waitFor()
  await page.waitForTimeout(900)
  await page.mouse.click(screen.width / 2, screen.height / 2)
}
await page.waitForTimeout(1500)

// Diyas along the porch, each with a wick and oil, lit with the match
// Round where the rangoli goes, in the middle of the porch
const diyas = [{x: 290, y: 234}, {x: 420, y: 198}, {x: 550, y: 234}]
await pickTool(rail.diyas)
for (const at of diyas) {
  await drag(slot(0), at)
  await drag(slot(1), at)
  await drag(slot(2), at)
  // The oil's poured before the next can go in
  await page.waitForTimeout(1600)
}
await page.mouse.move(slot(3).x, slot(3).y)
await page.mouse.down()
for (const at of diyas) {
  await page.mouse.move(at.x, at.y - 6, {steps: 12})
  await page.waitForTimeout(1300)
}
await page.mouse.up()
await page.waitForTimeout(800)
await shoot()

// An anar and a chakri lit beside them
await pickTool(rail.fireworks)
const anar = {x: 250, y: 250}
const chakri = {x: 620, y: 240}
await drag(slot(0), anar)
await drag(slot(2), chakri)
await page.mouse.move(slot(5).x, slot(5).y)
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

// A rangoli drawn on the floor: rings of petals round a centre
await pickTool(rail.rangoli)
const centre = {x: 420, y: 232}
const ring = async (colour, radius, petals, squash = 0.45) => {
  await page.mouse.click(slot(colour).x, slot(colour).y)
  for (let i = 0; i < petals; i++) {
    const angle = (i / petals) * Math.PI * 2
    const tip = {x: centre.x + Math.cos(angle) * radius, y: centre.y + Math.sin(angle) * radius * squash}
    await drag(centre, tip, {steps: 10})
  }
}
await ring(0, 62, 12)
await ring(1, 40, 8)
await ring(2, 18, 6)
await shoot()

await browser.close()
server.httpServer.close()
console.log(`${shots} screenshots in ${out}`)
