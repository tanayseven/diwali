# Diwali this year

A small [PixiJS](https://pixijs.com) web app about celebrating Diwali.

Live at: https://diwali.tanay.tech/

[![PixiJS](https://img.shields.io/badge/PixiJS-8.22-E91E63?style=for-the-badge)](https://pixijs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![Node.js](https://img.shields.io/badge/Node.js-20.18.0-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![mise](https://img.shields.io/badge/mise-managed-1E1E2E?style=for-the-badge)](https://mise.jdx.dev)
[![Amazon S3](https://img.shields.io/badge/Amazon%20S3-FF9900?style=for-the-badge)](https://aws.amazon.com/s3/)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/tanayseven/diwali/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE.txt)
[![Website](https://img.shields.io/website?style=for-the-badge&url=https%3A%2F%2Fdiwali.tanay.tech&up_message=online&down_message=offline)](https://diwali.tanay.tech)
[![Deploy to S3](https://github.com/tanayseven/diwali/actions/workflows/deploy.yml/badge.svg)](https://github.com/tanayseven/diwali/actions/workflows/deploy.yml)

## What's in it

- **Loading screen:** a progress bar while the images and the start of the music load.
- **Photosensitivity warning:** the app has flashing and twinkling lights, so it opens with a warning for people with photosensitive epilepsy. It fades out after a few seconds, or straight away on a tap or key press.
- **One night scene:** after the warning it goes straight to a house on Diwali night, its porch lit only by what's lit on it. Drag the scenery to pan around, and zoom with the + and − buttons, the `+` and `-` keys, a trackpad pinch (or Ctrl and the wheel), or a two-finger pinch on touch screens.
- **Fireworks over the city:** every few seconds shells rise from between the skyline's buildings and burst just above them, in violet, gold, red, green, blue or pink, shedding gold glitter as they fade. Each is heard a second later as a soft, muffled bang.
- **Lights on the skyline:** every one of the city's buildings is strung with tiny fairy lights, as curtains down their fronts, outlines or swags along their tops, fading on and off in chases, cascades and twinkles.
- **Side rail:** round buttons down the left pick a tool: Diyas, Fireworks, Craft Kandil, Decorate House and Draw Rangoli (or press `1` to `5`). Each tool has its own inventory bar along the bottom; everything placed stays in the scene and can be picked up again whichever tool is picked. The eye beside the bar (or `H`) hides it to see more of the scene.
- **Diyas:** drag diyas from the bar onto the porch, put a wick and oil in them, and light them with the matchstick. Tap a lit diya to turn it, from facing one side to facing the front to facing the other side. Drag them to move them, or drop them back on the bar.
- **Matchstick:** drag it out of the bar of the Diyas or the Fireworks and hold it over a diya's wick or a firework's fuse: it's struck, flaring and catching as a ring round it fills. Once it's full, that one catches and a fresh match is in hand straight away to drag on to the next, while the one that lit it is left behind to burn down and go out. Moved off before then, the ring keeps what it's filled; it only empties when the match is let go, which puts it back on the bar. A tap on the scene puts it away, as does picking anything else from the bar.
- **Fireworks:** drag anars (flowerpot fireworks), laddis (strings of firecrackers), chakris (ground spinners), sutli bombs (firecrackers wound tight in twine) and rockets (stood in empty bottles) onto the porch, then light their fuses with the matchstick. An anar throws up a fountain of crackling sparks with trailing embers, smoke and a roar, lights up the porch around it, and sputters out after about 20 seconds. A laddi's crackers go off one after another, each with a flash of light, sparks, shreds of paper and smoke. A chakri spins up in a ring of flame and skitters about the floor for anywhere from 6 to 18 seconds, throwing sparks all round and lighting the porch as it goes. A sutli bomb's wick fizzes down for a few seconds, then it goes off with a deep boom, a big flash, a burst of sparks, scraps of green twine and red and yellow paper, and a cloud of smoke. A rocket's fuse fizzes into its tube, then it whooshes up out of its bottle trailing a shower of sparks and smoke, and pops into a ball of coloured stars; the empty bottle stays behind. Burnt-out ones can be cleared away by dropping them on the bar.
- **Decorate House:** pick a colour of fairy lights (or mixed), then drag from one point on the house to another to hang a string between them. The bulbs twinkle and light up the house around them. Strings can be dragged to move them, or onto the bar to take them down.
- **Draw Rangoli:** pick a colour of powder and draw on the porch floor, rub parts out with the eraser, or clear it all.
- **Craft Kandil:** its bar is empty for now.
- **Tooltips:** hovering over things with a mouse says what they are and what to do with them.
- **Photos:** the camera button under the zoom buttons takes a photo of the scene, without the bars and buttons, with https://diwali.tanay.tech printed in its corner. Where the browser can share files, as on most phones, it opens the share sheet to send it to any app; otherwise it downloads it.
- **Background music:** two tracks play on a loop, starting on the first tap or key press as browsers require. It dips while sound effects play. The speaker button in the top-right corner mutes on click, and opens a volume slider on hover or a press and hold. The setting is remembered.
- **Landscape only:** in portrait mode (on a phone, or a desktop window taller than it is wide) it shows a notice asking to rotate the device instead.

The side rail's icons are from [SVG Repo](https://www.svgrepo.com).

All text is set in [Jaini](https://fonts.google.com/specimen/Jaini), loaded from Google Fonts.

## Development

Tool versions are managed with [mise](https://mise.jdx.dev) (see `mise.toml`):

```sh
$ mise install
$ npm install
```

```sh
$ npm run dev
```

will start a dev server at http://localhost:5173

```sh
$ npm run check
```

will type check the code with `tsc`

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

The app is wrapped for Android with [Capacitor](https://capacitorjs.com) 7 (the newest that runs on Node 20), in `android/`. It always runs in landscape, turning between either way round with the device but never into portrait, on tablets and foldables too, and it can't be put in split screen. It needs the Android SDK, with `ANDROID_HOME` pointing at it, and JDK 21.

```sh
$ npm run android:build
```

will build the web app, copy it into the Android project, and build a debug APK at `android/app/build/outputs/apk/debug/app-debug.apk`.

```sh
$ npm run android:run
```

will do the same and run it on a connected device or an emulator. After changing only the web app, `npm run android:sync` copies the new build across without building the APK.

## Deployment

Every push to `main` runs the [Deploy to S3](.github/workflows/deploy.yml) GitHub Actions workflow. It builds the app and copies `dist/` to the `diwali.tanay.tech` S3 bucket, which serves https://diwali.tanay.tech/.

Releases are tagged with the date they're made, as `YYYY.MM.DD`, and not with semantic versions. A second release on the same day adds its number, as `YYYY.MM.DD.2`, then `.3` and so on.

Every night at 11:30 PM IST, the [Nightly release tag](.github/workflows/nightly-tag.yml) workflow tags `main` with the day's date, but only if something that goes into the app has changed since the newest date tag. Changes only to the docs (`README.md`, `CLAUDE.md`, `LICENSE.txt`), the CI workflows, the benchmark in `scripts/` or the editor settings aren't released. It then runs the [Android build](.github/workflows/android.yml) workflow for the tag, which builds the Android app versioned by the tag and attaches the APK to a GitHub release for it. The nightly workflow can be run by hand from the Actions tab too, and pushing a date tag yourself also starts the Android build:

```sh
$ git tag $(date +%Y.%m.%d)
$ git push origin $(date +%Y.%m.%d)
```

The app's version name is the tag, and its version code is the date followed by the release's number that day (`2026.10.30.2` is `2026103002`), so every release installs over the one before. Tags of any other shape don't start the workflow.
