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
- **Night scene:** a house under a starry sky, with strings of twinkling fairy lights hung across the top of the screen.
- **Diyas:** the camera zooms in on the house's porch, where night falls; it's lit only by the diyas once they're lit. Drag diyas from the inventory bar at the bottom to place them, pick them up again to move them, or drop them back on the bar. A back button (or Escape) returns at any point.
- **Fireworks:** the camera moves in on the house, not quite as close as for diyas, and night falls on the porch as it does for them. Drag anars (flowerpot fireworks) from the inventory bar onto the porch, then drag the matchstick onto one to light its fuse. It throws up a fountain of crackling sparks with trailing embers and smoke, lights up the porch around it, and sputters out after about 20 seconds. Burnt-out anars can be cleared away by dropping them on the bar.
- **Craft Kandil, Decorate House and Draw Rangoli:** each moves the camera in on the house like Fireworks. Their inventory bars are empty for now.
- **Background music:** two tracks play on a loop, starting on the first tap or key press as browsers require. The speaker button in the top-right corner mutes on click, and opens a volume slider on hover or a press and hold. The setting is remembered.
- **Landscape only:** in portrait mode (on a phone, or a desktop window taller than it is wide) it shows a notice asking to rotate the device instead.

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
