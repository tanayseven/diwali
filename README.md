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
- **Side rail:** round buttons down the left pick a tool: Diyas, Fireworks, Craft Kandil, Decorate House and Draw Rangoli (or press `1` to `5`). Each tool has its own inventory bar along the bottom; everything placed stays in the scene and can be picked up again whichever tool is picked. The eye beside the bar (or `H`) hides it to see more of the scene.
- **Diyas:** drag diyas from the bar onto the porch, put a wick and oil in them, and light them with the matchstick. Pick them up again to move them, or drop them back on the bar.
- **Fireworks:** drag anars (flowerpot fireworks), laddis (strings of firecrackers) and chakris (ground spinners) onto the porch, then drag the matchstick onto one to light its fuse. An anar throws up a fountain of crackling sparks with trailing embers, smoke and a roar, lights up the porch around it, and sputters out after about 20 seconds. A laddi's crackers go off one after another, each with a flash of light, sparks, shreds of paper and smoke. A chakri spins up in a ring of flame and skitters about the floor for anywhere from 6 to 18 seconds, throwing sparks all round and lighting the porch as it goes. Burnt-out ones can be cleared away by dropping them on the bar.
- **Decorate House:** pick a colour of fairy lights (or mixed), then drag from one point on the house to another to hang a string between them. The bulbs twinkle and light up the house around them. Strings can be dragged to move them, or onto the bar to take them down.
- **Draw Rangoli:** pick a colour of powder and draw on the porch floor, rub parts out with the eraser, or clear it all.
- **Craft Kandil:** its bar is empty for now.
- **Tooltips:** hovering over things with a mouse says what they are and what to do with them.
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

## Deployment

Every push to `main` runs the [Deploy to S3](.github/workflows/deploy.yml) GitHub Actions workflow. It builds the app and copies `dist/` to the `diwali.tanay.tech` S3 bucket, which serves https://diwali.tanay.tech/.
