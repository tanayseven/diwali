# Diwali Celebration

A small [PixiJS](https://pixijs.com) web app about celebrating Diwali.

Live at: https://diwali.tanay.tech/, and the game itself at https://diwali.tanay.tech/play

[![PixiJS](https://img.shields.io/badge/PixiJS-8.22-E91E63?style=flat)](https://pixijs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vite.dev)
[![Node.js](https://img.shields.io/badge/Node.js-20.18.0-5FA04E?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![mise](https://img.shields.io/badge/mise-managed-1E1E2E?style=flat)](https://mise.jdx.dev)
[![Amazon S3](https://img.shields.io/badge/Amazon%20S3-FF9900?style=flat)](https://aws.amazon.com/s3/)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=flat&logo=githubactions&logoColor=white)](https://github.com/tanayseven/diwali/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat)](LICENSE.txt)
[![Website](https://img.shields.io/website?style=flat&url=https%3A%2F%2Fdiwali.tanay.tech&up_message=online&down_message=offline)](https://diwali.tanay.tech)
[![Deploy to S3](https://github.com/tanayseven/diwali/actions/workflows/deploy.yml/badge.svg)](https://github.com/tanayseven/diwali/actions/workflows/deploy.yml)
[![Tests](https://github.com/tanayseven/diwali/actions/workflows/test.yml/badge.svg)](https://github.com/tanayseven/diwali/actions/workflows/test.yml)
[![Nightly release tag](https://github.com/tanayseven/diwali/actions/workflows/nightly-tag.yml/badge.svg)](https://github.com/tanayseven/diwali/actions/workflows/nightly-tag.yml)

[![Latest release](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.github.com%2Frepos%2Ftanayseven%2Fdiwali%2Freleases%2Flatest&query=%24.tag_name&label=latest%20release&color=FFD700&style=flat&logo=github)](https://github.com/tanayseven/diwali/releases/latest)
[![itch.io](https://img.shields.io/badge/itch.io-play%20in%20browser-FA5C5C?style=flat&logo=itchdotio&logoColor=white)](https://tanayseven.itch.io/diwali-celebration)
[![Last commit](https://img.shields.io/github/last-commit/tanayseven/diwali?style=flat)](https://github.com/tanayseven/diwali/commits/main)

[![Android](https://img.shields.io/badge/Android-3DDC84?style=flat&logo=android&logoColor=white)](https://github.com/tanayseven/diwali/releases/latest)
[![Windows](https://img.shields.io/badge/Windows-0078D4?style=flat)](https://github.com/tanayseven/diwali/releases/latest)
[![macOS](https://img.shields.io/badge/macOS-000000?style=flat&logo=apple&logoColor=white)](https://github.com/tanayseven/diwali/releases/latest)
[![Linux](https://img.shields.io/badge/Linux-FCC624?style=flat&logo=linux&logoColor=black)](https://github.com/tanayseven/diwali/releases/latest)
[![Web](https://img.shields.io/badge/Web-browser-4285F4?style=flat)](https://diwali.tanay.tech/play)

[![Capacitor](https://img.shields.io/badge/Capacitor-7-119EFF?style=flat&logo=capacitor&logoColor=white)](https://capacitorjs.com)
[![Matter.js](https://img.shields.io/badge/Matter.js-0.20-4B5562?style=flat)](https://brm.io/matter-js/)
[![Wails](https://img.shields.io/badge/Wails-2.17-DF0000?style=flat&logo=wails&logoColor=white)](https://wails.io)
[![Go](https://img.shields.io/badge/Go-1.27-00ADD8?style=flat&logo=go&logoColor=white)](https://go.dev)
[![Playwright](https://img.shields.io/badge/Playwright-1.56-2EAD33?style=flat)](https://playwright.dev)

## What's in it

- **Language:** it opens by asking which language to use, from Assamese, Bengali, Dogri, English, Gujarati, Hindi, Hinglish, Kannada, Kashmiri, Konkani, Maithili, Malayalam, Manipuri (in Meetei Mayek), Marathi, Odia, Punjabi, Sanskrit, Santali (in Ol Chiki), Sindhi, Tamil, Telugu and Urdu. Each is listed in its own script with its English name, in alphabetical order. It's only asked on the first visit: after that, the language picked is used straight away, and the globe button beside the speaker, labelled with the language's own name, opens the picker again. Picking another there starts the game again in it. The browser's language is highlighted, or the one in use, so Enter picks it.
- **Loading screen:** a progress bar while the images and the start of the music load.
- **Photosensitivity warning:** the app has flashing and twinkling lights, so it opens with a warning for people with photosensitive epilepsy. It fades out after a few seconds, or straight away on a tap or key press.
- **Sound:** then a pair of headphones and a note to use headphones or a stereo sound system, as every sound is heard from where it is in the scene, to the left or right. A firework going off out of sight, off screen along the street, is heard muffled and quieter, as if from round a corner, more so the further off it is, and clearer as it's panned back into view. It fades out the same way.
- **One night scene:** after the warning it goes straight to a house on Diwali night, its porch lit only by what's lit on it, seen whole, zoomed all the way out, with the road in front of it. Drag the scenery to pan around, and zoom with the + and − buttons, the `+` and `-` keys, a trackpad pinch (or Ctrl and the wheel), or a two-finger pinch on touch screens.
- **The street:** the house, Deepa Niwas, stands in a street of six, one after another, each with its name on a wooden plaque over its door, written in the language picked. To its left are Lakshmi Sadan, two storeys over a row of shops, and Thulasi Mana, a Kerala house under sloping roofs of red tiles; to its right Sai Krupa, a modern duplex with a slatted panel and a car porch, Ganesh Kunj, a white house with an arched verandah, and Anand Villa, a modern house with a sloping roof and wooden windows. Pan along the street to see them all. A wide road runs along the front of them all, joining them up: a paved footpath right below their porch steps, kerbs, and a dashed line down its middle, with tall street lamps on the footpath between the houses, each with a bright bulb under its hood, a beam of warm light spreading down from it onto the road, and a pool of light on the road below, lighting it and the porches beside them. The night's lit only by what's lit, all along it.
- **Your house:** the first time, after the splashes, every house on the street is shown, drawn and named, to pick the player's own, which the camera then starts on. It's the only one they can decorate: diyas, fireworks and rangoli only go on its porch, kandils on its porch or hung from its eaves, and fairy lights on it, and nothing on the other houses can be picked up, lit or moved. The others are the neighbours', already decorated for Diwali: a string of fairy lights along each of their eaves, all of a colour or mixed, a lit kandil or two hung from the longest, and a rangoli in the middle of their porch, made up for each, the same every time. The house picked is remembered, and the settings have Your house, which starts the game again to pick another.
- **Fireworks over the city:** every few seconds shells rise from between the skyline's buildings and burst just above them, in violet, gold, red, green, blue or pink, shedding gold glitter as they fade. Each is heard a second later as a soft, muffled bang.
- **Lights on the skyline:** every one of the city's buildings is strung with tiny fairy lights, as curtains down their fronts, outlines or swags along their tops, fading on and off in chases, cascades and twinkles.
- **Wind:** a light breeze blows over the porch, now and then picking up into a gentle gust that sweeps across from one side and dies away, and sometimes turning round. Leaves and marigold, rose and jasmine petals drift past the house on it, a few at a time and more in a gust. It carries the porch fireworks' smoke and scraps of paper along and their sparks a little, swings the fairy lights' strings and tilts their bulbs, and leans the hung kandils over.
- **Guided first run:** the first time, after how to zoom, a card at the top of the screen walks through the game a step at a time, waiting for each to be done: a diya dragged onto the porch, a wick and the oil put in it and it lit with the matchstick, the fireworks picked from the rail, and an anar put down and lit. What to use is outlined, and while the player's idle a drawn hand shows how, dragging it from the bar to where it goes. The last step points out the kandil, fairy lights and rangoli tools. Skip ends it at any point, and it can be gone through again from the settings (Walkthrough, Show again). It takes the place of the diyas' and fireworks' first-step tooltips; the other tools still show theirs, and the kandil its demonstration, the first time they're picked.
- **Settings:** a gear button in the top right corner, beside the language and the speaker, opens the settings: whether the music plays, how loud the music and the sound effects each are, a skip to the next track, and the language. They're remembered on the device. The speaker button still mutes everything at once, and holding it (or hovering with a mouse) sets the overall volume. The language button shows the name of the language in use, in itself, beside its globe, so it's clear where to change it.
- **Rating the app (Android app only):** the settings have a Rate the app row, which opens the app's page in whichever store's installed, Google Play or F-Droid (`market://details?id=tech.tanay.diwali`), with no library or internet permission needed. Now and then a small card asks too, gently: never in the first session, only once a kandil's been lit or a rangoli design put down, and only after a few seconds with nothing pressed and nothing else showing. Rate opens the store's page, Not now asks again three sessions later, and Don't ask again doesn't. It's never shown on the website or the desktop apps. In the dev server, `?rating` stands in for the Android app, as the tests use it.
- **Reduce flashing:** a switch on the photosensitivity warning shown at the start, and in the settings, for people sensitive to flashing light. With it on, the screen doesn't flash with a bang, the light of a laddi's crackers, a sutli bomb or a rocket's burst peaks at 40% as bright and dies away four times as slowly, so a laddi glows steadily rather than strobing, and the bursts over the city flash a quarter as brightly. It's remembered on the device, and until it's set, it's on if the device asks for reduced motion. Measured on a laddi going off, the screen's biggest change in brightness from one moment to the next drops from about 20 to under 2 (out of 255).
- **Side rail:** round buttons down the left pick a tool: Diyas, Fireworks, Craft Kandil, Decorate House and Draw Rangoli (or press `1` to `5`). Each tool has its own inventory bar along the bottom; everything placed stays in the scene and can be picked up again whichever tool is picked. The eye beside the bar (or `H`) hides it to see more of the scene.
- **Diyas:** drag diyas from the bar onto the porch, put a wick and oil in them, and light them with the matchstick. Tap a lit diya to turn it, from facing one side to facing the front to facing the other side. Drag them to move them, or drop them back on the bar: a diya, lit or not, goes back on the bar empty, along with its wick. They only go on the porch floor: one let go anywhere else goes back where it came from.
- **Matchstick:** drag it out of the bar of the Diyas or the Fireworks, either one, and hold it so it touches a diya ready to light or an unlit firework: it's struck, moved to put its head to the diya's wick or the firework's fuse, and flares and catches as a ring round it fills. Once it's full, that one catches and a fresh match is in hand straight away to drag on to the next, while the one that lit it is left behind to burn down and go out. Moved off before then, it goes back to the pointer and the ring keeps what it's filled; let go while something's catching, it stays there till it's lit, and otherwise letting go puts it back on the bar. Or tap the matchstick, rather than dragging it, to take it in hand till it's put away: with a mouse it's carried about without holding a button, to hold it to things the same way, and a tap or click on something ready to light puts it to that and lights it, which is how it's done on a touch screen. A tap on nothing to light, on the matchstick again, or Escape puts it away, while dragging the scene about doesn't; picking anything else from the bar does too. Taps on one thing after another, without waiting for each to catch, light each in turn. While it's in hand, everything ready to light, on either bar, is outlined, and the **?** badges are hidden, so they don't take taps meant for what's under them. Taken with nothing ready to light, it says what it lights instead, with a double buzz where the device can vibrate.
- **Fireworks:** drag anars (flowerpot fireworks), laddis (strings of firecrackers), chakris (ground spinners), sutli bombs (firecrackers wound tight in twine) and rockets (stood in empty bottles) onto the porch, then light their fuses with the matchstick. An anar throws up a fountain of crackling sparks with trailing embers, smoke and a roar, lights up the porch around it, and sputters out after about 20 seconds. A laddi's crackers go off one after another, each with a flash of light, sparks, shreds of paper and smoke. A chakri spins up in a ring of flame and skitters about the floor for anywhere from 6 to 18 seconds, throwing sparks all round and lighting the porch as it goes. A sutli bomb's wick fizzes down for a few seconds, then it goes off with a deep boom, a big flash, a burst of sparks, scraps of green twine and red and yellow paper, and a cloud of smoke. A rocket's fuse fizzes into its tube, then it whooshes up out of its bottle trailing a shower of sparks and smoke, and pops into a ball of coloured stars; the empty bottle stays behind. A rocket the player lights (not one a guest does) is followed up into the sky by the camera, which waits a moment on its burst and then eases back to where it was; a pan or zoom while it's following leaves the camera where it's got to. Like diyas, they only go on the porch floor, going back where they came from if let go anywhere else. Burnt-out ones are cleared away by dragging them into the waste bin, a ribbed green metal bin standing near the front of each porch, right of its middle, which grows and lights up while one's over it; they no longer go on the bar, and dropped anywhere else they go back where they were, while the bin's tooltip says where they go.
- **Decorate House:** pick a colour of fairy lights (or mixed), then drag from one point on the house to another to hang a string between them. While the tool's in use, a lit bulb of the colour picked (each colour in turn for mixed) is held at the mouse, lighting up the house round it, bright where a string could start and faint where it can't, and at the end of a string as it's hung; on a touch screen it's held by the drawn hand, above and to the left of the finger, so the finger doesn't hide where it'll go. A string's ends catch on an eave they're dragged close to, so it hangs neatly along it. Each string is a rope, simulated with [Matter.js](https://brm.io/matter-js/), that sags under its weight and swings in the wind. The bulbs twinkle and light up the house around them. Strings can be dragged to move them, or onto the bar to take them down.
- **Draw Rangoli:** rangolis are made from ready-made designs, not drawn by hand. The bar's first slot shows the design picked, and a tap on it opens a panel to make another, mixing and matching one from three layers: a centre (a dot, a flower, a star or a spiral), a ring round it (petals, dots, waves or a lotus) and a border (two rings, scallops, a zigzag or dots), each of them, or none, in any colour of powder, with a preview of it as it is. One's picked from the start, so a tap on a porch's floor puts it down there straight away, lying flat in powder, and again with each tap after. Where it'll go is shown first, as a faint copy of it: following the mouse, or under a finger pressed on the floor, which can slide it about before letting go to put it down there. The porch floors it can go on are outlined, pulsing gently, while the tool's in use, and brightly for a moment when it's picked and while the mouse is off them. Clear asks first, as that can't be undone: one tap turns it to "Clear?" and says what it does, and a second within 3 seconds clears it.
- **Craft Kandil:** make akash kandils (paper lanterns) and hang them on the house. Drag a bamboo frame from the bar onto the porch to make it there, or onto the house to hang it by a string from the eave above. Then drag paper onto it to wrap it, in red, orange, blue or mixed colours, then tails to hang below it, in green, red, gold or mixed, and finally the bulb to light it. Lit, it glows and lights up what's around it in its paper's colour. Hung ones hang as pendulums on their strings, also simulated with Matter.js, swinging as they're hung and swaying in the wind. Made or not, one can be dragged between the porch and the house, or back onto the bar to put its frame back on the stack. Making one is guided step by step. The bar's slots are grouped under numbered badges: 1 the frame, 2 the paper, 3 the tails and 4 the bulb. A step's slots are faded while no kandil needs them, and its badge pulses while one does. While a frame's dragged, the eaves it can hang from and the porch floors are outlined, the eave it'd hang from brighter. Paper, tails or the bulb dropped within 60 px of a kandil ready for them go onto it, a dotted line showing which, so they needn't touch it. A kandil can also be tapped to pick it, and is picked as it's made or given something; a tap on a paper, tails or bulb slot then gives it that, with no dragging. After each step, what it needs next floats up above it for a moment. Dropped on a kandil that isn't ready for it, or tapped in for one, it's refused, and that kandil's own tooltip says what it needs. The first time the tool's picked, a drawn hand shows how: a frame dragged up from the bar to hang from an eave, then red paper onto it. Any press or key ends it.
- **The families on the porches:** a family celebrating Diwali comes and goes through each house's open front door. At Deepa Niwas, there's a grandfather in a kurta, a stole and a dhoti, with his grandson dressed just like him at his side, a woman in a sari, a young man in a kurta and pyjamas, and a girl in a lehenga. Each walks, and moves their arms, head and body, in their own way and at their own pace, and does something different each time: they stroll about the porch, stop to look round, chat with one another, go over to admire a lit diya or kandil, and go back in for a while. The grandson follows his grandfather in and out. They turn to watch a firework's fuse being lit, backing off if they're too close, then cheer, clap or point as it goes off, and flinch at a bang, while the children cheer. They look up and point at a kandil as it's lit, and go over to a diya as it's lit to fold their hands to it. The player's own family leaves the decorating to the player, putting nothing down themselves; but if the player leaves a firework unlit on the porch for 30 seconds, a grown-up goes over with a match, crouches to light it and hurries back. The neighbours decorate their own: now and then one comes out with a lit diya, lighting their way, and bends to put it down on their porch floor, in pairs either side of the door, the same way out from it, the front row first, from the middle outwards, so their diyas are laid out symmetrically, and never on their rangoli. A grown-up sometimes comes out with a firework instead, puts it down well clear of everyone, crouches to light it with a match and hurries back as its fuse catches, while the children leave the lighting to them. A while after a firework burns out on a porch, a grown-up from that house goes over, picks up what's left of it and carries it to their waste bin, bending to drop it in. When a rocket goes up, everyone along that part of the street tips their head back to watch it climb, then looks up at its burst, cheering or clapping. They never go near a firework that's alight: a few times a second they look round, hurry away from one too near them, as a chakri skitters about, and stop short of one in their way to watch it instead. Each other house has a family of its own, of grandparents, perhaps, parents and children, made up for it, the same each time, in their own outfits and looks: saris, salwar kameez, lehengas, dhotis, kurtas and pyjamas with or without a Nehru jacket, shirts and trousers, and turbans, beards, glasses, plaits and buns, in skin tones from fair to dark. They walk with a real stride, their knees bending as each leg swings through and their arms swinging with the other leg. They're lit only by what's lit on the porch, and walk behind or in front of what's on the floor by how near they are. They walk round what's on the floor rather than over it, diyas, fireworks, kandils standing there, plant pots, the waste bin and rangolis alike, and never stand on a rangoli. Someone standing in front of a lit diya hides its glow behind them, while it still glows round them and lights them up. Taps go through them to whatever's behind.
- **Dropping onto things:** a wick, the oil bottle, the matchstick, or a kandil's paper, tails or bulb only has to touch what it goes onto, not be dragged right over it. Touching more than one, it goes onto the one it overlaps most, which grows and is outlined to show it.
- **Dragging by touch:** on touch screens, whatever's dragged from a bar or picked up from the scene (a diya, wick, oil bottle, firework, the matchstick, or a kandil, its paper, tails or bulb) is shown a little above and to the left of the finger, so the finger doesn't hide it, held there by a drawn hand reaching up from the finger, pinching it between thumb and forefinger (the match by its stick, clear of its head). It's put down where it's shown, and only goes back on the bar if it's shown over the bar, so it can be put down on the porch just above the bar with the finger still on it; a tap on a slot that doesn't drag anything out puts it straight back. Placed things are only picked up once they're dragged a little, so a tap on one doesn't move it. While a rangoli's being placed or a string of lights is hung or moved, a second finger, to pinch, stops it rather than placing or pulling it too.
- **Feedback:** where the device can vibrate, as phones can in the browser and the Android app, it's felt as well as seen: a tap as something's put down, a little more for a wick or oil in a diya, paper or tails on a kandil, or a string hung, more again for something lit, and a double buzz for something that can't go where it was let go. Each firework has its own as it goes off: an anar's fountain roaring up, a tick for each of a laddi's crackers, a chakri whirling up to speed, a sutli bomb's deep boom, and a rocket's whoosh and burst. Something that goes back from where it was let go also shows the tooltip of the slot it came from for a moment, saying where it goes, such as a diya onto the porch or tails onto a kandil wrapped in paper.
- **Tooltips:** hovering over things with a mouse says what they are and what to do with them. On a touch screen, holding a finger still on something for a moment does the same, above the finger, until the next tap; moving the finger, as to drag something out, puts it away.
- **First steps:** the first time the scene's shown, two fingertips over it spread apart as the camera zooms in, with the zoom in button saying what it does, then pinch together as it zooms back out, with the zoom out button, to show how to zoom; any tap ends it early. Then, and the first time each tool's used, the first thing on its bar is pointed out, with what to do with it, such as dragging a diya onto the porch, until the next tap. After that, picking a tool from the rail shows its name beside its button for a moment. Which tools have been shown is remembered on the device.
- **Hints:** whatever's placed and still to be finished, such as an unlit diya or firework or a kandil still to be made, is faintly outlined and has a **?** badge. Hovering over the badge, or tapping it on a touch screen, says what to do next. On a touch screen it's bigger, for a finger. The outline is left out of photos.
- **Photos:** the camera button under the zoom buttons takes a photo of the scene, without the bars and buttons, with https://diwali.tanay.tech printed in its corner. In the Android app, and where the browser can share files, as on most phones, it opens the share sheet to send it to any app; in the desktop apps it's saved where it's picked in a save dialog; otherwise it downloads it.
- **Background music:** two tracks play on a loop, starting on the first tap or key press as browsers require. It dips while sound effects play. The speaker button in the top-right corner mutes on click, and opens a volume slider on hover or a press and hold. The setting is remembered.
- **Privacy policy:** at https://diwali.tanay.tech/privacy (`privacy.html`, built as a page of its own), linked from the footer as app stores require. The footer, crediting who made it, is only shown along the bottom of the warning and sound splashes, and fades away as the scene comes in. The Android app shows the copy bundled with it, over the game in a frame with a Close button, so the game carries on underneath. The game collects nothing; it only remembers the language and music settings, and which tools' first steps have been shown, on the device.
- **Home page, on the website only:** https://diwali.tanay.tech/ opens on a home page (`home.html`) with screenshots, what's in the game, and a downloads section, which links to the game at `/play`. The downloads section suggests the download for the visitor's system, worked out in the page from what the browser says and sent nowhere (the installer for Windows, on Arm too where the browser says so, the disk image for a Mac, the APK for Android, and the game in the browser for an iPhone or iPad), and marks its platform. Below that is every file of the newest release, by platform, with its size: Windows installers and portable .zips for x64 and Arm, the macOS disk image and .zip, the Linux .deb, .rpm, Arch package and .tar.gz, and the Android APK. Each links straight to its file, as the deploy workflow gives the build the newest release's files (`RELEASE_JSON`, read by `scripts/web/release-links.ts`); without them, as when building locally, they link to the releases page. Only the website's build (`npm run build:web`) has it. The Android and desktop apps open straight into the game, with all its images, sounds and fonts inside them, and load nothing over the internet. The Android app doesn't even have the internet permission, so it can't: it shows the privacy policy bundled with it, and its other links open in the browser.
- **Landscape only:** in portrait mode (on a phone, or a desktop window taller than it is wide) it shows a notice asking to rotate the device instead.

The side rail's icons are from [SVG Repo](https://www.svgrepo.com).

All text is set in [Jaini](https://fonts.google.com/specimen/Jaini), with [Baloo](https://github.com/EkType/Baloo2) for Kannada, Telugu, Malayalam, Tamil, Bengali, Assamese, Gujarati, Odia and Punjabi, and [Noto](https://fonts.google.com/noto) for Urdu, Sindhi and Kashmiri (Naskh), Manipuri (Meetei Mayek) and Santali (Ol Chiki). The fonts are bundled with the app from [Fontsource](https://fontsource.org), so nothing is loaded from elsewhere and the Android app works offline.

## Development

Every tool it's built, released and deployed with (Node, Java, `gh` and the AWS CLI) is managed with [mise](https://mise.jdx.dev), at exact versions in `mise.toml`:

```sh
$ mise install
$ npm ci
```

Their downloads are locked in `mise.lock`, by URL and checksum for Linux and Apple silicon Macs, and installs fail if they don't match it. mise checks every signature and provenance their publishers provide on every install, only takes versions that have been out a week, and won't use asdf or vfox plugins, which run their own code. After changing a version in `mise.toml`,

```sh
$ mise lock
```

records it, and both files are committed. The AWS CLI is the only one without a checksum, as AWS doesn't publish them. CI also runs mise in paranoid mode, which can only be turned on from outside the project; to use it locally too, set `MISE_PARANOID=1` in your shell.

```sh
$ mise run generate
```

regenerates everything made from the sources: the translation functions in `src/i18n/` (`mise run generate:i18n`) and the Android app's icons (`mise run generate:icons`, see [Android](#android)).

```sh
$ npm run dev
```

will start a dev server at http://localhost:5173

```sh
$ npm run check
```

will type check the code with `tsc`

```sh
$ npm run test:e2e
```

will play the game in headless Chromium as a phone held sideways (a Pixel 7, with touch) and check that a finger dragging a diya, the match, a firework or a kandil's frame has a hand drawn holding it, and a mouse doesn't; that oil goes into a diya the bottle only touches; that the Fireworks bar's match lights a diya; that a diya let go by a finger with it shown just above the bar goes onto the porch; that a tap on a placed firework doesn't move it; and that the matchstick lights a diya tapped after it's tapped, carried by a mouse after a click, or let go a moment after it's put to it. It starts the dev server itself, and the game is muted from the start, so nothing is heard. It needs Playwright's Chromium (`npx playwright-core install chromium`), or another one in `PLAYWRIGHT_CHROMIUM`. It also runs `scripts/release/play-release.sh` against a local stand-in for Google's token endpoint and Play's API, with a throwaway key, checking the signed token, the release it makes on each track, that a track Play refuses doesn't stop the others, and that a refused token stops it, and `scripts/release/itch.sh` with a stand-in for butler, checking each build goes to its own itch.io channel, and a missing one, or one butler fails to push, fails it after the rest are pushed. The tests are in `scripts/test/`. The [Tests](.github/workflows/test.yml) workflow runs them on every pull request.

```sh
$ npm run demo
```

will play through the whole game in a Chromium window, as a phone held sideways with touch, so the hand holding whatever's dragged can be seen. Everything's laid out symmetrically about the front door, at a zoom to suit it: zoomed right in, ten diyas along the back of the porch, filled, lit one after another with the matchstick, and turned to face forward, left or right; out a little, four of each firework in two rows, lit a kind at a time; out a little more, fairy lights across both wings and five kandils hung from the house in three colourings; then the city zoomed out to, the volume slider and a photo. Its sound is on, quietly. It takes a few minutes, and closes its window 30 seconds after it's done. `SLOW` sets how slowly it goes (1.25 by default, about as quickly as a person would, and 1 as fast as it can), `HEADLESS=1` plays it without a window, and `npm run demo -- <dir>` saves a screenshot of each step there. It fails if the game logs an error. It's in `scripts/demo/play.mjs`, and needs Chromium as the tests do.

## Build

```sh
$ npm run build
```

will build the app into `dist/`, and

```sh
$ npm run preview
```

will serve that build locally.

## Android

The app is wrapped for Android with [Capacitor](https://capacitorjs.com) 7 (the newest that runs on Node 20), in `android/`. It always runs in landscape, turning between either way round with the device but never into portrait, on tablets and foldables too, and it can't be put in split screen. It has no internet permission: the manifest removes it, so no plugin can add it back. Its only permission is to vibrate, for the feedback below. It needs the Android SDK, with `ANDROID_HOME` pointing at it, and JDK 21, which mise installs.

```sh
$ npm run android:build
```

will build the web app, copy it into the Android project, and build a debug APK at `android/app/build/outputs/apk/debug/app-debug.apk`.

```sh
$ npm run android:run
```

will do the same and run it on a connected device or an emulator. After changing only the web app, `npm run android:sync` copies the new build across without building the APK.

```sh
$ RELEASE_TAG=2026.11.04 ANDROID_UPLOAD_KEYSTORE=path/to/upload-keystore.jks ANDROID_UPLOAD_KEYSTORE_PASSWORD=... npm run android:bundle
```

will build the release app bundle for Google Play at `android/app/build/outputs/bundle/release/app-release.aab`, versioned by the tag and signed with the upload key, which is kept out of the repository. The key's alias is `upload` unless `ANDROID_UPLOAD_KEY_ALIAS` says otherwise, and its password is the keystore's unless `ANDROID_UPLOAD_KEY_PASSWORD` is set.

### Google Play

Each nightly bundle is released on Google Play's testing tracks, once the `PLAY_SERVICE_ACCOUNT_JSON` secret is set; until then those steps are skipped. It's uploaded once, to **internal** testing, which isn't reviewed, so its testers get it within minutes. Then `scripts/release/play-release.sh` releases the same build through Play's API, without uploading it again, to everyone on **closed** (`alpha`) testing. Google reviews it first, so it reaches people after the review.

**Open** (`beta`) testing and **production** are left out for now. Play refuses both with "Precondition check failed" until a new personal account's closed test has run long enough (12 testers for 14 days) and Google gives it access. Once it does, add `beta production:0.2` back after `alpha` in `.github/workflows/android.yml`: that releases to everyone on open testing, and to production as a **staged rollout to 20%** of users. Each track is changed on its own, so one Play won't take a release on, such as a testing track that isn't set up yet, doesn't stop the others: the run fails, and its log says which track and what Play said.

The script is run from the workflow's own commit, not the tag's, so a fix to it applies to a tag built again. The [Android build](.github/workflows/android.yml) can be run by hand for a tag from the Actions tab: that builds it again, attaches it to its release, and publishes it, as long as Play doesn't have its version code yet. Its "what's new" notes are the release's changelog, the commits since the release before it. To give it to everyone, increase the rollout to 100% in Play Console, under Production; or halt it there if something's wrong. A newer release replaces one still rolling out, so with releases most nights, the rest of the users only get a release once it's rolled out to everyone. The tracks, and the production rollout's share, are the arguments to `play-release.sh` in `.github/workflows/android.yml`.

It needs setting up once:

1. In [Play Console](https://play.google.com/console), create the app `tech.tanay.diwali`, and fill in its store listing, content rating, data safety and target audience, with the privacy policy at https://diwali.tanay.tech/privacy. Use Play App Signing, with the upload key above.
2. Upload the first bundle by hand to internal testing, as Google Play's API can't make an app's first upload: the `.aab` from the latest GitHub release. Add the testers' email addresses and roll it out.
3. In [Google Cloud](https://console.cloud.google.com), enable the Google Play Android Developer API in a project, and create a service account there with a JSON key.
4. In Play Console's Users and permissions, invite the service account's email address, with permission to release to production and to testing tracks, for this app only.
5. Save the key as the secret, and delete the file:

```sh
$ gh secret set PLAY_SERVICE_ACCOUNT_JSON < key.json
```

Google Play refuses a version code it already has, so a tag rebuilt by hand fails to publish; a fix goes out as a new tag, such as the same day's `.2`.

### F-Droid

[F-Droid](https://f-droid.org) builds the app itself, from the source at each date tag, and signs it with its own key, so it can't be updated from the Play or GitHub versions, or the other way round, without reinstalling. It finds new tags on its own once a day, and a build reaches the store a day or two later.

It reads the version from the tagged source, as it can't work it out from the tag. So the nightly workflow puts each tag on a commit of its own, `Release <tag>`, which writes the version into `android/version.properties` and what's new into `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`. Those are only ever written there. Google Play's notes are taken from the same changelog.

The store's text, icon, banner and screenshots are in `fastlane/metadata/android/en-US/`. The icon and banner are made with the app's icons (`mise run generate:icons`), and the screenshots by playing the built game (`mise run generate:screenshots`): `scripts/store/screenshots.mjs` takes the game's own, in `web/screenshots/`, which the website's home page shows as they are, then `scripts/store/captioned.mjs` frames each at 1920 by 1080 on a festive background with a caption above saying what it shows, for the stores. Google Play takes screenshots no more than twice as long one way as the other, which the game's own, at 1920 by 887, are just over. F-Droid gets the captioned ones from `fastlane/` with each release; Google Play's are uploaded by hand in Play Console. `node scripts/store/captioned.mjs <folder>` also copies them to a folder, with `UPLOADING.md` beside them saying how. F-Droid's build recipe, sent to its [fdroiddata](https://gitlab.com/fdroid/fdroiddata) repository, is kept in `fdroid/tech.tanay.diwali.yml`.

```sh
$ cd android && ./gradlew -q :app:printVersion
```

prints the version a build gets: the one in `version.properties`, or `RELEASE_TAG`'s when that's set.

The recipe builds the web app with Node, then deletes Node and all of `node_modules` but the Android code of Capacitor and its plugins (`@capacitor/android`, `filesystem` and `share`), which Gradle builds from source there. F-Droid's scanner refuses the prebuilt binaries the rest of `node_modules` has.

Only tags made since the release commit was added carry `version.properties`, so the recipe's build has to be one of those: before sending it to fdroiddata, set its `versionName`, `versionCode` and `commit`, and `CurrentVersion` and `CurrentVersionCode`, to the newest such tag, its code from `scripts/release/version.sh <tag>`. After that, F-Droid adds new tags itself.

The app's icon and launch screen are the site's diya (`public/favicon.svg`) on black. Their sources in `assets/` are rendered from it, with its flame at rest, by

```sh
$ mise run generate:icons
```

which then makes every size Android needs into `android/app/src/main/res/`, puts back `AndroidManifest.xml`, which the generator reformats without changing, and copies the icon to `desktop/build/appicon.png` for the desktop apps.

## Desktop

The app is wrapped for Windows, macOS and Linux with [Wails](https://wails.io) 2, in `desktop/`: a small Go program (`main.go`, `app.go`) that shows the game, built into it, in a window of its own, through the system's web view (WebView2 on Windows, WebKit on macOS and WebKitGTK 4.1 on Linux). In the desktop apps, photos are saved where they're picked in a save dialog. Go, Wails and [nfpm](https://nfpm.goreleaser.com) come from mise. Each platform's app is built and packaged on that platform, into `desktop/dist/`:

```sh
$ desktop/package.sh linux     # a .tar.gz, and .deb, .rpm and Arch Linux packages
$ desktop/package.sh windows   # an installer for x64 and Arm PCs, and a portable .zip for each
$ desktop/package.sh macos     # a .dmg, and the .app in a .zip, for Intel and Apple silicon both
```

Building on Linux needs GTK 3 and WebKitGTK 4.1 (`libgtk-3-dev` and `libwebkit2gtk-4.1-dev` on Debian and Ubuntu); the Windows installer needs [NSIS](https://nsis.sourceforge.io); and macOS apps can only be built on a Mac. Set `RELEASE_TAG` to a date tag to version them by it; otherwise they're versioned `dev`. The macOS app is signed and notarized when the [Desktop build](.github/workflows/desktop.yml) workflow has these GitHub secrets, all of which take an [Apple Developer Program](https://developer.apple.com/programs/) membership:

| Secret | What it is |
| --- | --- |
| `APPLE_CERTIFICATE` | The Developer ID Application certificate and its private key, exported from Keychain Access as a `.p12`, as base64 (`base64 -i certificate.p12`) |
| `APPLE_CERTIFICATE_PASSWORD` | The password the `.p12` was exported with |
| `APPLE_SIGNING_IDENTITY` | The certificate's name, as `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID` | The Apple Account the membership's under |
| `APPLE_TEAM_ID` | The membership's ten-character Team ID |
| `APPLE_APP_PASSWORD` | An [app-specific password](https://support.apple.com/102654) for that Apple Account |

`desktop/package.sh` takes the last four from the environment too, with the certificate in the login keychain. Without them, the app's signed ad hoc, which macOS doesn't trust, so the first time it's opened macOS blocks it: open it once, then in System Settings → Privacy & Security, choose Open Anyway. Or take it out of quarantine with `xattr -dr com.apple.quarantine "/Applications/Diwali Celebration.app"`.

## itch.io

Each release is also on itch.io, at https://tanayseven.itch.io/diwali-celebration, in every form it takes, each in a channel of its own, from which itch.io tells its platform:

| Channel | What |
|---|---|
| `html5` | The game, to play in the browser on the game's page |
| `windows-x64`, `windows-arm64` | The Windows app, portable, for x64 and Arm PCs |
| `windows-x64-installer`, `windows-arm64-installer` | Its installers |
| `mac` | The macOS app |
| `mac-dmg` | Its disk image |
| `linux-x64` | The Linux app, portable |
| `linux-deb`, `linux-rpm`, `linux-arch` | Its packages, for Debian and Ubuntu, Fedora, and Arch Linux |
| `android` | The Android app's APK |

The nightly workflow runs the [itch.io release](.github/workflows/itch.yml) workflow once the Android and desktop builds have attached their files to the tag's GitHub release. It downloads them, builds the game for the browser (`npm run build:itch`, into `dist-itch/`), and pushes everything with [butler](https://itch.io/docs/butler/), itch.io's command-line tool, through `scripts/release/itch.sh`, labelled with the tag. The browser game isn't pushed again if it hasn't changed; every other build is named with its tag, so it always has. Only the newest release is pushed: one run goes at a time, and a tag older than the newest date tag isn't pushed over it. If a build is missing from the release, or butler fails to push one, the rest are still pushed and the run fails, listing it; with no GitHub release at all, the browser game still goes. butler isn't in mise's registry, so the workflow fetches it at an exact version and checks it against its checksum. For a tag pushed by hand, run the workflow from the Actions tab once its Android and desktop builds are done.

The browser build refers to everything relative to its page, and leaves out `index.html`'s `<base href="/">` and the source maps, as itch.io serves the game from a folder of its own and limits it to 1,000 files.

It needs setting up once:

1. Create an API key in itch.io's [settings](https://itch.io/user/settings/api-keys), and save it as the secret:

```sh
$ gh secret set BUTLER_API_KEY
```

2. After the first release has been pushed, edit the game on itch.io:
   - Set its kind of project to **HTML**, and tick **This file will be played in the browser** on the `html5` upload.
   - Under Embed options, set the viewport to 1280 × 720, and tick **Mobile friendly**, with **Landscape** orientation, and **Fullscreen button**.
   - Untick **Click to launch in fullscreen** if it's ticked, so it plays on the page.

## Deployment

Every push to `main` runs the [Deploy to S3](.github/workflows/deploy.yml) GitHub Actions workflow, and so does the nightly release, once its apps are built, so the home page's downloads link to them. It builds the website (`npm run build:web`: the game, with the home page) and copies `dist/` to the `diwali.tanay.tech` S3 bucket, which serves the home page at https://diwali.tanay.tech/, the game at `/play` and the privacy policy at `/privacy`.

Releases are tagged with the date they're made, as `YYYY.MM.DD`, and not with semantic versions. A second release on the same day adds its number, as `YYYY.MM.DD.2`, then `.3` and so on.

Every night at 11:30 PM IST, the [Nightly release tag](.github/workflows/nightly-tag.yml) workflow tags `main` with the day's date, but only if something that goes into the app has changed since the newest date tag. Changes only to the docs (`README.md`, `CLAUDE.md`, `LICENSE.txt`), the CI workflows, the benchmark in `scripts/` or the editor settings aren't released. It then runs the [Android build](.github/workflows/android.yml) and [Desktop build](.github/workflows/desktop.yml) workflows for the tag, which build the Android app and the Windows, macOS and Linux apps versioned by the tag, and attach the APK, the Google Play app bundle (when the upload key is in the secrets, see [Android](#android)) and the desktop packages to a GitHub release for it. The nightly workflow can be run by hand from the Actions tab too, and pushing a date tag yourself also starts both builds:

```sh
$ git tag $(date +%Y.%m.%d)
$ git push origin $(date +%Y.%m.%d)
```

The app's version name is the tag, and its version code is the number of days since 1 January 2026 times 100, plus the release's number that day (`2026.10.30.2` is `30202`), which keeps it far below Google Play's limit of 2,100,000,000, so every release installs over the one before. Tags of any other shape don't start the workflow.

The Desktop build can also be run by hand from the Actions tab with a date tag, to build and release that tag's desktop apps again; without one, it builds the branch it's run on, versioned `dev`, and keeps the packages with the run to try them out.
