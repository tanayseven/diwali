# Diwali Celebration

A small [PixiJS](https://pixijs.com) web app about celebrating Diwali.

Live at: https://diwali.tanay.tech/, and the game itself at https://diwali.tanay.tech/play

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

- **Language:** it opens by asking which language to use, from Assamese, Bengali, Dogri, English, Gujarati, Hindi, Hinglish, Kannada, Kashmiri, Konkani, Maithili, Malayalam, Manipuri (in Meetei Mayek), Marathi, Odia, Punjabi, Sanskrit, Santali (in Ol Chiki), Sindhi, Tamil, Telugu and Urdu. Each is listed in its own script with its English name, in alphabetical order. The one picked last time, else the browser's, is highlighted, so Enter picks it.
- **Loading screen:** a progress bar while the images and the start of the music load.
- **Photosensitivity warning:** the app has flashing and twinkling lights, so it opens with a warning for people with photosensitive epilepsy. It fades out after a few seconds, or straight away on a tap or key press.
- **Sound:** then a pair of headphones and a note to use headphones or a stereo sound system, as every sound is heard from where it is in the scene, to the left or right. It fades out the same way.
- **One night scene:** after the warning it goes straight to a house on Diwali night, its porch lit only by what's lit on it. Drag the scenery to pan around, and zoom with the + and − buttons, the `+` and `-` keys, a trackpad pinch (or Ctrl and the wheel), or a two-finger pinch on touch screens.
- **Fireworks over the city:** every few seconds shells rise from between the skyline's buildings and burst just above them, in violet, gold, red, green, blue or pink, shedding gold glitter as they fade. Each is heard a second later as a soft, muffled bang.
- **Lights on the skyline:** every one of the city's buildings is strung with tiny fairy lights, as curtains down their fronts, outlines or swags along their tops, fading on and off in chases, cascades and twinkles.
- **Wind:** a light breeze blows over the porch, now and then picking up into a gentle gust that sweeps across from one side and dies away, and sometimes turning round. Leaves and marigold, rose and jasmine petals drift past the house on it, a few at a time and more in a gust. It carries the porch fireworks' smoke and scraps of paper along and their sparks a little, swings the fairy lights' strings and tilts their bulbs, and leans the hung kandils over.
- **Side rail:** round buttons down the left pick a tool: Diyas, Fireworks, Craft Kandil, Decorate House and Draw Rangoli (or press `1` to `5`). Each tool has its own inventory bar along the bottom; everything placed stays in the scene and can be picked up again whichever tool is picked. The eye beside the bar (or `H`) hides it to see more of the scene.
- **Diyas:** drag diyas from the bar onto the porch, put a wick and oil in them, and light them with the matchstick. Tap a lit diya to turn it, from facing one side to facing the front to facing the other side. Drag them to move them, or drop them back on the bar: a diya, lit or not, goes back on the bar empty, along with its wick.
- **Matchstick:** drag it out of the bar of the Diyas or the Fireworks and hold it over a diya's wick or a firework's fuse: it's struck, flaring and catching as a ring round it fills. Once it's full, that one catches and a fresh match is in hand straight away to drag on to the next, while the one that lit it is left behind to burn down and go out. Moved off before then, the ring keeps what it's filled; it only empties when the match is let go, which puts it back on the bar. A tap on the scene puts it away, as does picking anything else from the bar.
- **Fireworks:** drag anars (flowerpot fireworks), laddis (strings of firecrackers), chakris (ground spinners), sutli bombs (firecrackers wound tight in twine) and rockets (stood in empty bottles) onto the porch, then light their fuses with the matchstick. An anar throws up a fountain of crackling sparks with trailing embers, smoke and a roar, lights up the porch around it, and sputters out after about 20 seconds. A laddi's crackers go off one after another, each with a flash of light, sparks, shreds of paper and smoke. A chakri spins up in a ring of flame and skitters about the floor for anywhere from 6 to 18 seconds, throwing sparks all round and lighting the porch as it goes. A sutli bomb's wick fizzes down for a few seconds, then it goes off with a deep boom, a big flash, a burst of sparks, scraps of green twine and red and yellow paper, and a cloud of smoke. A rocket's fuse fizzes into its tube, then it whooshes up out of its bottle trailing a shower of sparks and smoke, and pops into a ball of coloured stars; the empty bottle stays behind. Burnt-out ones can be cleared away by dropping them on the bar.
- **Decorate House:** pick a colour of fairy lights (or mixed), then drag from one point on the house to another to hang a string between them. Each string is a rope, simulated with [Matter.js](https://brm.io/matter-js/), that sags under its weight and swings in the wind. The bulbs twinkle and light up the house around them. Strings can be dragged to move them, or onto the bar to take them down.
- **Draw Rangoli:** pick a colour of powder and draw on the porch floor, rub parts out with the eraser, or clear it all.
- **Craft Kandil:** make akash kandils (paper lanterns) and hang them on the house. Drag a bamboo frame from the bar onto the porch to make it there, or onto the house to hang it by a string from the eave above. Then drag paper onto it to wrap it, in red, orange, blue or mixed colours, then tails to hang below it, in green, red, gold or mixed, and finally the bulb to light it. Lit, it glows and lights up what's around it in its paper's colour. Hung ones hang as pendulums on their strings, also simulated with Matter.js, swinging as they're hung and swaying in the wind. Made or not, one can be dragged between the porch and the house, or back onto the bar to put its frame back on the stack.
- **Dragging by touch:** on touch screens, a diya, wick, oil bottle, firework or the matchstick being dragged is shown a little above and to the left of the finger, which is marked by a circle, so the finger doesn't hide it. It's put down, or held to a wick or a fuse, where it's shown.
- **Tooltips:** hovering over things with a mouse says what they are and what to do with them.
- **Hints:** whatever's placed and still to be finished, such as an unlit diya or firework or a kandil still to be made, is faintly outlined and has a **?** badge. Hovering over the badge, or tapping it on a touch screen, says what to do next. The outline is left out of photos.
- **Photos:** the camera button under the zoom buttons takes a photo of the scene, without the bars and buttons, with https://diwali.tanay.tech printed in its corner. In the Android app, and where the browser can share files, as on most phones, it opens the share sheet to send it to any app; in the desktop apps it's saved where it's picked in a save dialog; otherwise it downloads it.
- **Background music:** two tracks play on a loop, starting on the first tap or key press as browsers require. It dips while sound effects play. The speaker button in the top-right corner mutes on click, and opens a volume slider on hover or a press and hold. The setting is remembered.
- **Privacy policy:** at https://diwali.tanay.tech/privacy (`privacy.html`, built as a page of its own), linked from the footer as app stores require. The Android app shows the copy bundled with it, over the game in a frame with a Close button, so nothing in the scene is lost. The game collects nothing; it only remembers the language and music settings on the device.
- **Home page, on the website only:** https://diwali.tanay.tech/ opens on a home page (`home.html`) with screenshots, what's in the game, and where to download the apps, which links to the game at `/play`. Only the website's build (`npm run build:web`) has it. The Android and desktop apps open straight into the game, with all its images, sounds and fonts inside them, and load nothing over the internet. The Android app doesn't even have the internet permission, so it can't: it shows the privacy policy bundled with it, and its other links open in the browser.
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

The app is wrapped for Android with [Capacitor](https://capacitorjs.com) 7 (the newest that runs on Node 20), in `android/`. It always runs in landscape, turning between either way round with the device but never into portrait, on tablets and foldables too, and it can't be put in split screen. It has no internet permission: the manifest removes it, so no plugin can add it back. It needs the Android SDK, with `ANDROID_HOME` pointing at it, and JDK 21, which mise installs.

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

Each nightly bundle is published to Google Play's **internal testing** track, for the testers there, once the `PLAY_SERVICE_ACCOUNT_JSON` secret is set; until then that step is skipped. Its "what's new" notes are the commits since the release before it. Production releases are made by hand: in Play Console, promote a build from internal testing.

It needs setting up once:

1. In [Play Console](https://play.google.com/console), create the app `tech.tanay.diwali`, and fill in its store listing, content rating, data safety and target audience, with the privacy policy at https://diwali.tanay.tech/privacy. Use Play App Signing, with the upload key above.
2. Upload the first bundle by hand to internal testing, as Google Play's API can't make an app's first upload: the `.aab` from the latest GitHub release. Add the testers' email addresses and roll it out.
3. In [Google Cloud](https://console.cloud.google.com), enable the Google Play Android Developer API in a project, and create a service account there with a JSON key.
4. In Play Console's Users and permissions, invite the service account's email address, with permission to release to testing tracks for this app only.
5. Save the key as the secret, and delete the file:

```sh
$ gh secret set PLAY_SERVICE_ACCOUNT_JSON < key.json
```

Google Play refuses a version code it already has, so a tag rebuilt by hand fails to publish; a fix goes out as a new tag, such as the same day's `.2`.

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

## Deployment

Every push to `main` runs the [Deploy to S3](.github/workflows/deploy.yml) GitHub Actions workflow. It builds the website (`npm run build:web`: the game, with the home page) and copies `dist/` to the `diwali.tanay.tech` S3 bucket, which serves the home page at https://diwali.tanay.tech/, the game at `/play` and the privacy policy at `/privacy`.

Releases are tagged with the date they're made, as `YYYY.MM.DD`, and not with semantic versions. A second release on the same day adds its number, as `YYYY.MM.DD.2`, then `.3` and so on.

Every night at 11:30 PM IST, the [Nightly release tag](.github/workflows/nightly-tag.yml) workflow tags `main` with the day's date, but only if something that goes into the app has changed since the newest date tag. Changes only to the docs (`README.md`, `CLAUDE.md`, `LICENSE.txt`), the CI workflows, the benchmark in `scripts/` or the editor settings aren't released. It then runs the [Android build](.github/workflows/android.yml) and [Desktop build](.github/workflows/desktop.yml) workflows for the tag, which build the Android app and the Windows, macOS and Linux apps versioned by the tag, and attach the APK, the Google Play app bundle (when the upload key is in the secrets, see [Android](#android)) and the desktop packages to a GitHub release for it. The nightly workflow can be run by hand from the Actions tab too, and pushing a date tag yourself also starts both builds:

```sh
$ git tag $(date +%Y.%m.%d)
$ git push origin $(date +%Y.%m.%d)
```

The app's version name is the tag, and its version code is the number of days since 1 January 2026 times 100, plus the release's number that day (`2026.10.30.2` is `30202`), which keeps it far below Google Play's limit of 2,100,000,000, so every release installs over the one before. Tags of any other shape don't start the workflow.

The Desktop build can also be run by hand from the Actions tab with a date tag, to build and release that tag's desktop apps again; without one, it builds the branch it's run on, versioned `dev`, and keeps the packages with the run to try them out.
