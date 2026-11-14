import {readFileSync} from "node:fs"
import type {Plugin} from "vite"

// The home page's download links go straight to each file of the newest release, with
// its size, and the release's version and date beside them. The deploy workflow saves
// the release, as `gh release view --json tagName,publishedAt,assets` gives it, to the
// file named by RELEASE_JSON. Without it, as when building locally, or for a file the
// release doesn't have, a link goes to the newest release's page on GitHub instead

const repository = "https://github.com/tanayseven/diwali"
const latest = `${repository}/releases/latest`

// Each file the home page links to, by its data-asset name, and how its name ends
const assets: Record<string, RegExp> = {
  "android-apk": /\.apk$/,
  "windows-x64-setup": /-windows-x64-setup\.exe$/,
  "windows-arm64-setup": /-windows-arm64-setup\.exe$/,
  "windows-x64-zip": /-windows-x64\.zip$/,
  "windows-arm64-zip": /-windows-arm64\.zip$/,
  "macos-dmg": /-macos\.dmg$/,
  "macos-zip": /-macos\.zip$/,
  "linux-deb": /\.deb$/,
  "linux-rpm": /\.rpm$/,
  "linux-arch": /\.pkg\.tar\.zst$/,
  "linux-tar": /-linux-x64\.tar\.gz$/,
}

type Release = {tagName: string, publishedAt: string, assets: {name: string, size: number}[]}

const readRelease = (): Release | undefined => {
  const path = process.env.RELEASE_JSON
  if (!path) {
    return undefined
  }
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Release
  } catch (error) {
    console.warn(`Couldn't read the release from ${path}, so the downloads link to its page:`, error)
    return undefined
  }
}

// In megabytes, to one decimal place
const sizeOf = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;")

const releaseLinks = (): Plugin => ({
  name: "release-links",
  transformIndexHtml: {
    order: "pre",
    handler(html, {filename}) {
      if (!filename.endsWith("home.html")) {
        return html
      }
      const release = readRelease()
      const found = (key: string) => release?.assets.find(asset => assets[key]?.test(asset.name))
      return html
        .replace(/data-asset="([\w-]+)" href="[^"]*"/g, (_, key: string) => {
          const asset = found(key)
          const href = asset && release
            ? `${repository}/releases/download/${encodeURIComponent(release.tagName)}/${encodeURIComponent(asset.name)}`
            : latest
          return `data-asset="${key}" href="${escape(href)}"`
        })
        .replace(/<span data-size="([\w-]+)"><\/span>/g, (_, key: string) => {
          const asset = found(key)
          return `<span data-size="${key}">${asset ? sizeOf(asset.size) : ""}</span>`
        })
        .replace(/<span data-release><\/span>/g, () => {
          if (!release) {
            return "<span data-release></span>"
          }
          const date = new Date(release.publishedAt).toLocaleDateString("en-GB", {day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata"})
          return `<span data-release>Version ${escape(release.tagName)}, released ${escape(date)}. </span>`
        })
    },
  },
})

export {assets, releaseLinks}
