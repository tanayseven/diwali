# Diwali this year

A small [PixiJS](https://pixijs.com) web app about celebrating Diwali. It opens on a menu with four sections (Diyas, Fireworks, Craft Kandil and Decorate House), which don't do anything yet.

Live at: https://wish-diwali.tanay.tech/

[![PixiJS](https://img.shields.io/badge/PixiJS-8.22-E91E63?style=for-the-badge)](https://pixijs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![Node.js](https://img.shields.io/badge/Node.js-20.18.0-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![mise](https://img.shields.io/badge/mise-managed-1E1E2E?style=for-the-badge)](https://mise.jdx.dev)
[![Amazon S3](https://img.shields.io/badge/Amazon%20S3-FF9900?style=for-the-badge)](https://aws.amazon.com/s3/)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/tanayseven/diwali/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE.txt)
[![Website](https://img.shields.io/website?style=for-the-badge&url=https%3A%2F%2Fwish-diwali.tanay.tech&up_message=online&down_message=offline)](https://wish-diwali.tanay.tech)
[![Deploy to S3](https://github.com/tanayseven/diwali/actions/workflows/deploy.yml/badge.svg)](https://github.com/tanayseven/diwali/actions/workflows/deploy.yml)

## Folder structure

- `src` - source code for the [pixi.js](https://pixijs.com) app
  - `main.ts` - entry point, sets up the menu
  - `menu.ts` - the touch and keyboard friendly menu, with an animated diya on each side of the title
  - `app.ts` - creates the Pixi application
- `public` - static files copied as is into the build: `favicon.svg` and `sprites/diwali-diya-animated.svg`
- `dist` - build output, contains index.html, the bundled js and static assets

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

Every push to `main` runs the [Deploy to S3](.github/workflows/deploy.yml) GitHub Actions workflow. It builds the app and copies `dist/` to the `wish-diwali.tanay.tech` S3 bucket, which serves https://wish-diwali.tanay.tech/.
