# Folder structure

- `src` - source code for your kaplay project
- `www` - distribution folder, contains your index.html, built js bundle and static assets


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

will build your js files into `www/main.js`

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
