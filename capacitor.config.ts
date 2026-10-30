import type {CapacitorConfig} from "@capacitor/cli"

// The Android app wraps the built web app in dist/
const config: CapacitorConfig = {
  appId: "tech.tanay.diwali",
  appName: "Diwali this year",
  webDir: "dist",
}

export default config
