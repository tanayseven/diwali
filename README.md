# Diwali this year

Live at: https://wish-diwali.tanay.tech/

[![PixiJS](https://img.shields.io/badge/PixiJS-8.22-E91E63?style=for-the-badge)](https://pixijs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![Node.js](https://img.shields.io/badge/Node.js-20.18.0-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![mise](https://img.shields.io/badge/mise-managed-1E1E2E?style=for-the-badge)](https://mise.jdx.dev)
[![Amazon S3](https://img.shields.io/badge/Amazon%20S3-FF9900?style=for-the-badge)](https://aws.amazon.com/s3/)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/tanayseven/diwali-ecard/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE.txt)
[![Website](https://img.shields.io/website?style=for-the-badge&url=https%3A%2F%2Fwish-diwali.tanay.tech&up_message=online&down_message=offline)](https://wish-diwali.tanay.tech)
[![Deploy to S3](https://github.com/tanayseven/diwali-ecard/actions/workflows/deploy.yml/badge.svg)](https://github.com/tanayseven/diwali-ecard/actions/workflows/deploy.yml)

## Folder structure

- `src` - source code for the [pixi.js](https://pixijs.com) app
- `public` - static assets (sprites)
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

will start a dev server at http://localhost:8000

## Distribution

```sh
$ npm run build
```

will build the app into `dist/`

```sh
$ npm run bundle
```

will build your game and package into a .zip file, you can upload to your server or itch.io / newground etc.

## TODO

- [ ] Refactor the dialog box
- [ ] Add proper states for entering details
- [ ] Keep a button for copy link to clipboard
- [ ] Introduce button [Create your own Greeting]
- [ ] Add Diya lighting animation with particle effects
- [ ] Add fireworks particle effects
- [ ] Add sound effects for fireworks
