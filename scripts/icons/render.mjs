// Renders the Android app's icon and splash sources in assets/ from the site's diya
// (public/favicon.svg), in Chromium so its gradients and glow come out as in a browser,
// and the store icon and feature graphic F-Droid shows, in fastlane/.
// Then `npx capacitor-assets generate --android` makes every size of them, which also
// reformats android/app/src/main/AndroidManifest.xml; put that back with git afterwards
import {readFileSync} from "node:fs"
import {chromium} from "playwright-core"

const root = new URL("../../", import.meta.url).pathname
// Framed wider than the favicon, centred on the diya rather than its flame, and so its
// glow fades out before the edge instead of being cut off by the favicon's own frame
const svg = readFileSync(`${root}public/favicon.svg`, "utf8")
  .replace(/viewBox="[^"]*" width="[^"]*" height="[^"]*"/, `viewBox="-40 -23 460 460" width="460" height="460"`)
// The night the app opens on
const background = "#000000"
// The game's own font and gold, for the app's name on the feature graphic
const jaini = readFileSync(`${root}node_modules/@fontsource/jaini/files/jaini-latin-400-normal.woff2`).toString("base64")
const gold = "#ffd700"
const store = `${root}fastlane/metadata/android/en-US/images`

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM} : {})
// A square of this size with the diya over this share of it, or a rectangle with the
// diya over that share of its height and, beside it, the app's name
const render = async (path, size, share, fill, {width = size, name = ""} = {}) => {
  const page = await browser.newPage({viewport: {width, height: size}})
  const diya = Math.round(size * share)
  const title = name && `<style>@font-face{font-family:Jaini;src:url(data:font/woff2;base64,${jaini})}</style>
    <span style="font:${Math.round(size * 0.19)}px Jaini;color:${gold};white-space:nowrap">${name}</span>`
  await page.setContent(`<body style="margin:0;width:${width}px;height:${size}px;display:flex;align-items:center;justify-content:center;gap:${Math.round(size * 0.04)}px;background:${fill}">${svg}${title}</body>`)
  await page.evaluate(() => document.fonts.ready)
  // Its flame flickers and its glow pulses, so it's stopped at the start, at rest,
  // to come out the same every time
  await page.evaluate(diya => {
    const drawing = document.querySelector("svg")
    drawing.style.width = drawing.style.height = `${diya}px`
    drawing.pauseAnimations()
    drawing.setCurrentTime(0)
  }, diya)
  await page.screenshot({path, omitBackground: fill === "transparent"})
  await page.close()
}
// For Android before 8, which shows it as it is
await render(`${root}assets/icon-only.png`, 1024, 1.05, background)
// The generator draws the foreground in the 72dp an adaptive icon shows, whose middle
// 92% (the 66dp safe zone) is all every launcher's mask keeps, so the diya stays inside it
await render(`${root}assets/icon-foreground.png`, 1024, 1.2, "transparent")
await render(`${root}assets/icon-background.png`, 1024, 0, background)
await render(`${root}assets/splash.png`, 2732, 0.36, background)
await render(`${root}assets/splash-dark.png`, 2732, 0.36, background)
// The store's icon, the same as the launcher's before Android 8, and the banner over
// the app's page
await render(`${store}/icon.png`, 512, 1.05, background)
await render(`${store}/featureGraphic.png`, 500, 0.7, background, {width: 1024, name: "Diwali Celebration"})
await browser.close()
