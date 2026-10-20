# Folder structure

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
