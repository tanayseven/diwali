# Diwali Celebration

See README.md for what the app does and how to run, build and deploy it.

## Releases

- Releases are tagged with their date, `YYYY.MM.DD` (for example `2026.10.30`). Never use semantic version tags like `v1.0.0`.
- A second release on the same day is `YYYY.MM.DD.2`, then `.3`, and so on. The first release of a day has no number.
- Tags are made automatically: `.github/workflows/nightly-tag.yml` runs at 11:30 PM IST (18:00 UTC) and tags `main` with the IST date, only if something that goes into the app differs from the newest date tag. Its `not_built` list names what doesn't count (docs, `.github`, `scripts`, `.idea`, `.gitignore`); add to it anything new that isn't built into the app, and everything else counts. It numbers the tag if the day already has one.
- A tag pushed from a workflow doesn't start other workflows, so the nightly workflow calls `.github/workflows/android.yml` and `.github/workflows/desktop.yml` itself. Both also run when a date tag is pushed by hand: one builds the Android APK, the other the Windows, macOS and Linux apps with Wails (`desktop/package.sh`), and both attach what they build to the same GitHub release for the tag, whichever gets there first creating it. Other tags don't trigger them.
- The Android version comes from the tag, through `RELEASE_TAG` in `android/app/build.gradle`: the version name is the tag, and the version code is `YYYYMMDD` times 100 plus the day's release number. The desktop apps take it from `RELEASE_TAG` too, in `desktop/package.sh`. Builds without a tag are versioned `dev`.

## Tools

- Every tool is pinned to an exact version in `mise.toml` and locked in `mise.lock`, which installs must match. After adding a tool or changing a version, run `mise lock` and commit both files. Keep new versions at least a week old (`minimum_release_age`).
- Generated files are made with `mise run generate` (or `generate:i18n`, `generate:icons`), not by hand.
