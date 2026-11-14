// The website's home page (home.html), only built for the website: its title's font,
// served from the site like the game's, not from a font service
import "@fontsource/jaini/400.css"

// The visitor's system, as the browser says, to suggest its download first. Nothing's
// sent anywhere: it's only read here, in the page
type System = "windows" | "macos" | "linux" | "android" | "ios"

type UserAgentData = {
  platform?: string
  getHighEntropyValues?: (hints: string[]) => Promise<{architecture?: string}>
}

const detect = (): System | undefined => {
  const agent = navigator.userAgent
  const platform = (navigator as Navigator & {userAgentData?: UserAgentData}).userAgentData?.platform ?? navigator.platform
  if (/android/i.test(agent)) {
    return "android"
  }
  // iPads ask for the desktop site, as a Mac with a touch screen, which Macs don't have
  if (/iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1)) {
    return "ios"
  }
  if (/Win/i.test(platform)) {
    return "windows"
  }
  if (/Mac/i.test(platform)) {
    return "macos"
  }
  // Not ChromeOS, which runs neither the Linux packages nor, as a rule, an APK
  if (/Linux/i.test(platform) && !/CrOS/.test(agent)) {
    return "linux"
  }
  return undefined
}

// Whether a Windows PC is Windows on Arm, which only Chromium-based browsers say
const isArm = async () => {
  const data = (navigator as Navigator & {userAgentData?: UserAgentData}).userAgentData
  try {
    return (await data?.getHighEntropyValues?.(["architecture"]))?.architecture === "arm"
  } catch {
    return false
  }
}

// What the visitor's using, after "For your"
const names: Record<System, string> = {
  windows: "Windows PC",
  macos: "Mac",
  linux: "Linux PC",
  android: "Android phone or tablet",
  ios: "iPhone or iPad",
}

// A file's link and size, as the page was built with them
const file = (asset: string) => ({
  href: document.querySelector<HTMLAnchorElement>(`[data-asset="${asset}"]`)?.href,
  size: document.querySelector(`[data-size="${asset}"]`)?.textContent ?? "",
})

// What to suggest: a button's words and where it goes, and a note under it
const suggestion = async (system: System) => {
  switch (system) {
    case "windows": {
      const arm = await isArm()
      const installer = file(arm ? "windows-arm64-setup" : "windows-x64-setup")
      return {label: "Download for Windows", href: installer.href, note: `The installer, for ${arm ? "Windows on Arm" : "x64 PCs"}${installer.size ? `, ${installer.size}` : ""}. Or pick another below.`}
    }
    case "macos": {
      const image = file("macos-dmg")
      return {label: "Download for macOS", href: image.href, note: `The disk image, for Apple silicon and Intel Macs${image.size ? `, ${image.size}` : ""}.`}
    }
    case "linux":
      return {label: "Download for Linux", href: "#linux", note: "Pick the package for your distribution below."}
    case "android": {
      const apk = file("android-apk")
      return {label: "Download for Android", href: apk.href, note: `The APK, for Android 7.0 or newer${apk.size ? `, ${apk.size}` : ""}.`}
    }
    case "ios":
      return {label: "Play in your browser", href: "/play", note: "There's no app for iPhones and iPads, but the game plays in Safari, held sideways."}
  }
}

const suggest = async () => {
  const system = detect()
  if (!system) {
    return
  }
  const {label, href, note} = await suggestion(system)
  if (!href) {
    return
  }
  document.getElementById(system === "ios" ? "browser" : system)?.classList.add("yours")
  const recommended = document.getElementById("recommended")
  const link = document.getElementById("recommended-link") as HTMLAnchorElement | null
  if (!recommended || !link) {
    return
  }
  document.getElementById("your-system")!.textContent = names[system]
  link.textContent = label
  link.href = href
  document.getElementById("recommended-note")!.textContent = note
  recommended.hidden = false
  // The button at the top too, straight to it
  const top = document.getElementById("download-button") as HTMLAnchorElement | null
  if (top && system !== "ios") {
    top.textContent = label
    top.href = href
  }
}

suggest()
