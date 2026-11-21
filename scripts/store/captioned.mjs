// Makes the store's screenshots from the game's own, in web/screenshots/ (taken by
// scripts/store/screenshots.mjs): each on a festive night-blue background, 1920 by 1080,
// with a caption above it saying what it shows. They're F-Droid's, in fastlane/, and
// Google Play's, which are uploaded by hand: given a folder, they're copied there too,
// with how to upload them, in UPLOADING.md beside them.
//
//   node scripts/store/captioned.mjs [export-dir]
//
// Google Play takes screenshots no more than twice as long one way as the other; the
// game's own, 1920 by 887, are just over, so they're framed at 16:9
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from "node:fs"
import {chromium} from "playwright-core"

const root = new URL("../../", import.meta.url).pathname
const shots = `${root}web/screenshots`
const out = `${root}fastlane/metadata/android/en-US/images/phoneScreenshots`
const exportDir = process.argv[2]
const size = {width: 1920, height: 1080}

// What each of the game's screenshots shows, in order
const captions = [
  {title: "Light diyas on your porch", line: "Fill each with a wick and oil, and light it with a match"},
  {title: "Set off Diwali fireworks", line: "Anars, chakris, laddis, sutli bombs and rockets"},
  {title: "Hang twinkling fairy lights", line: "Strings that sway in the evening breeze"},
  {title: "Draw a rangoli", line: "In coloured powder, by hand or from ready-made designs"},
  {title: "Craft akash kandils", line: "Paper, tails and a bulb, step by step"},
  {title: "Light up a whole street", line: "Six houses, with fireworks over the city"},
  {title: "Celebrate with the family", line: "They light diyas and set off fireworks too"},
]

const font = readFileSync(`${root}node_modules/@fontsource/jaini/files/jaini-latin-400-normal.woff2`).toString("base64")
const page = (shot, {title, line}) => `<!doctype html><html><head><style>
  @font-face {font-family: Jaini; src: url(data:font/woff2;base64,${font}) format("woff2");}
  html, body {margin: 0; width: ${size.width}px; height: ${size.height}px; overflow: hidden;}
  body {
    font-family: Jaini, sans-serif; color: #ffffff; text-align: center;
    background:
      radial-gradient(circle at 12% 18%, rgba(255, 200, 80, 0.28) 0 6px, transparent 7px),
      radial-gradient(circle at 86% 14%, rgba(255, 120, 160, 0.25) 0 8px, transparent 9px),
      radial-gradient(circle at 93% 70%, rgba(120, 180, 255, 0.22) 0 6px, transparent 7px),
      radial-gradient(circle at 5% 78%, rgba(255, 150, 60, 0.25) 0 9px, transparent 10px),
      radial-gradient(ellipse at 50% 120%, #6a2a12 0%, transparent 55%),
      linear-gradient(180deg, #0b1030 0%, #1a1448 55%, #2a1236 100%);
    display: flex; flex-direction: column; align-items: center;
  }
  h1 {margin: 40px 0 0; font-size: 96px; font-weight: normal; line-height: 1; color: #ffd700;
    text-shadow: 0 0 24px rgba(255, 190, 60, 0.55);}
  p {margin: 12px 0 30px; font-size: 44px; line-height: 1; color: #f3e6d0;}
  img {width: 1660px; height: auto; border-radius: 28px; border: 4px solid rgba(255, 215, 0, 0.7);
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(255, 170, 60, 0.25);}
</style></head><body>
  <h1>${title}</h1><p>${line}</p>
  <img src="data:image/png;base64,${readFileSync(shot).toString("base64")}">
</body></html>`

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM} : {})
const browserPage = await browser.newPage({viewport: size})
mkdirSync(out, {recursive: true})
for (const [idx, caption] of captions.entries()) {
  await browserPage.setContent(page(`${shots}/${idx + 1}.png`, caption))
  await browserPage.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map(image => image.decode()))
  })
  await browserPage.screenshot({path: `${out}/${idx + 1}.png`})
}
await browser.close()
console.log(`${captions.length} screenshots in ${out}`)

if (exportDir) {
  mkdirSync(exportDir, {recursive: true})
  captions.forEach((_, idx) => copyFileSync(`${out}/${idx + 1}.png`, `${exportDir}/${idx + 1}.png`))
  writeFileSync(`${exportDir}/UPLOADING.md`, `# Uploading these screenshots to Google Play

These are Diwali Celebration's phone screenshots for its Google Play listing, each
1920 by 1080, made by \`scripts/store/captioned.mjs\` in the game's repository. F-Droid
gets the same ones from \`fastlane/\` with each release, so they only need uploading to
Google Play, by hand:

1. Open [Google Play Console](https://play.google.com/console) and pick **Diwali Celebration**.
2. In the menu on the left, go to **Grow users** > **Store presence** > **Main store listing**.
   (On older layouts it's **Grow** > **Store presence** > **Main store listing**.)
3. Scroll down to **Graphics** > **Phone screenshots**.
4. Remove the old screenshots (hover over each, then the bin icon).
5. Drag in \`1.png\` to \`${captions.length}.png\` from this folder, in order. The first ones are shown
   first, so keep \`1.png\` first.
6. Optionally add the same ones under **7-inch tablet screenshots** and **10-inch tablet
   screenshots**, which take the same sizes, so the listing looks complete on tablets.
7. Click **Save** at the bottom of the page.
8. If the listing's changes need sending for review, go to **Publishing overview** and click
   **Send changes for review**. They're usually live within a few hours to a day.

What each shows:

${captions.map(({title, line}, idx) => `${idx + 1}. **${title}**: ${line}`).join("\n")}

To make them again after the game changes, from the repository:

\`\`\`sh
mise run generate:screenshots
node scripts/store/captioned.mjs ~/Photos/Diwali
\`\`\`
`)
  console.log(`Copied, with how to upload them, to ${exportDir}`)
}
