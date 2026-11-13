// Runs scripts/release/itch.sh against a release made of stand-in files, with a stand-in
// butler first on the path that only records what it's asked to push, and checks each
// kind of build goes to its own itch.io channel, as itch.io expects it, labelled with the
// tag. That a build missing from the release, or one butler fails to push, fails it,
// after pushing the rest, and with
// no release at all, the browser game still goes. And that a tag older than the newest
// isn't pushed over it.
//
//   npm run test:e2e
import assert from "node:assert/strict"
import {execFileSync, spawn} from "node:child_process"
import {chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {join} from "node:path"
import {fileURLToPath} from "node:url"
import {after, before, test} from "node:test"

const script = fileURLToPath(new URL("../release/itch.sh", import.meta.url))
const tag = "2026.11.12"
const name = "diwali-celebration"
const game = "tanayseven/diwali-celebration"

// The release's files, as android.yml and desktop.yml name them, each with what's in it
const releaseFiles = {
  [`${name}-${tag}-windows-x64.zip`]: "zip",
  [`${name}-${tag}-windows-arm64.zip`]: "zip",
  [`${name}-${tag}-windows-x64-setup.exe`]: "exe",
  [`${name}-${tag}-windows-arm64-setup.exe`]: "exe",
  [`${name}-${tag}-macos.zip`]: "zip",
  [`${name}-${tag}-macos.dmg`]: "dmg",
  [`${name}_${tag}-1_amd64.deb`]: "deb",
  [`${name}-${tag}-1.x86_64.rpm`]: "rpm",
  [`${name}-${tag}-1-x86_64.pkg.tar.zst`]: "zst",
  [`diwali-${tag}.apk`]: "apk",
  // Files that aren't for itch.io
  [`diwali-${tag}.aab`]: "aab",
}
// Every channel, and what it's sent: the files in the folder pushed
const expected = {
  html5: ["assets/index.js", "index.html"],
  "windows-x64": [`${name}-${tag}-windows-x64.zip`],
  "windows-x64-installer": [`${name}-${tag}-windows-x64-setup.exe`],
  "windows-arm64": [`${name}-${tag}-windows-arm64.zip`],
  "windows-arm64-installer": [`${name}-${tag}-windows-arm64-setup.exe`],
  mac: [`${name}-${tag}-macos.zip`],
  "mac-dmg": [`${name}-${tag}-macos.dmg`],
  "linux-x64": [`${name}-${tag}-linux-x64/${name}`, `${name}-${tag}-linux-x64/${name}.desktop`],
  "linux-deb": [`${name}_${tag}-1_amd64.deb`],
  "linux-rpm": [`${name}-${tag}-1.x86_64.rpm`],
  "linux-arch": [`${name}-${tag}-1-x86_64.pkg.tar.zst`],
  android: [`diwali-${tag}.apk`],
}

let dir
let release
let web
let bin
let log
before(() => {
  dir = mkdtempSync(join(tmpdir(), "itch-"))
  release = join(dir, "release")
  web = join(dir, "web")
  bin = join(dir, "bin")
  log = join(dir, "butler.log")
  for (const folder of [release, join(web, "assets"), bin]) {
    mkdirSync(folder, {recursive: true})
  }
  for (const [file, content] of Object.entries(releaseFiles)) {
    writeFileSync(join(release, file), content)
  }
  // The portable Linux app, as package.sh makes it: a folder in a .tar.gz
  const portable = join(dir, `${name}-${tag}-linux-x64`)
  mkdirSync(portable)
  writeFileSync(join(portable, name), "binary")
  writeFileSync(join(portable, `${name}.desktop`), "[Desktop Entry]")
  execFileSync("tar", ["-czf", join(release, `${name}-${tag}-linux-x64.tar.gz`), "-C", dir, `${name}-${tag}-linux-x64`])
  writeFileSync(join(web, "index.html"), "<!DOCTYPE html>")
  writeFileSync(join(web, "assets", "index.js"), "")
  // Records each push: its arguments, and the files in the folder pushed. It fails a
  // push to the channel in BUTLER_FAILS, after recording it, as butler does mid-push
  const butler = join(bin, "butler")
  writeFileSync(butler, `#!/usr/bin/env bash
files=$(cd "$2" && find . -type f | sed 's|^\\./||' | sort | paste -sd, -)
printf '%s\\t%s\\t%s\\n' "$*" "$1" "$files" >> "${log}"
if [[ -n \${BUTLER_FAILS:-} && $3 == *:\$BUTLER_FAILS ]]; then
  echo "checking for differences: not a directory" >&2
  exit 1
fi
`)
  chmodSync(butler, 0o755)
})
after(() => rmSync(dir, {recursive: true, force: true}))

// Runs the script, and gives its exit code, its output and what it pushed, by channel
const push = ({releaseDir = release, newest = tag, fails = ""} = {}) => new Promise(resolve => {
  rmSync(log, {force: true})
  const child = spawn("bash", [script, tag, releaseDir, web], {
    env: {...process.env, PATH: `${bin}:${process.env.PATH}`, ITCH_NEWEST_TAG: newest, BUTLER_FAILS: fails},
  })
  let output = ""
  child.stdout.on("data", chunk => output += chunk)
  child.stderr.on("data", chunk => output += chunk)
  child.on("close", code => {
    let lines = []
    try {
      lines = readFileSync(log, "utf8").trim().split("\n")
    } catch {
      // Nothing was pushed
    }
    const pushes = Object.fromEntries(lines.map(line => {
      const [args, , files] = line.split("\t")
      const [command, , target, ...flags] = args.split(" ")
      return [target.split(":")[1], {command, target, flags, files: files.split(",")}]
    }))
    resolve({code, output, pushes})
  })
})

test("pushes every kind of build to its own channel, labelled with the tag", async () => {
  const {code, output, pushes} = await push()
  assert.equal(code, 0, output)
  assert.deepEqual(Object.keys(pushes).sort(), Object.keys(expected).sort())
  for (const [channel, files] of Object.entries(expected)) {
    const pushed = pushes[channel]
    assert.equal(pushed.command, "push")
    assert.equal(pushed.target, `${game}:${channel}`)
    // Only the browser game is skipped when it's unchanged; every other build is named
    // with the tag, so is never unchanged, and butler's check breaks on a .zip
    assert.deepEqual(pushed.flags, ["--userversion", tag, ...channel === "html5" ? ["--if-changed"] : []])
    assert.deepEqual(pushed.files, files, `what's pushed to ${channel}`)
  }
})

test("fails when a build's missing from the release, after pushing the rest", async () => {
  const apk = join(release, `diwali-${tag}.apk`)
  rmSync(apk)
  try {
    const {code, output, pushes} = await push()
    assert.notEqual(code, 0)
    assert.match(output, new RegExp(`diwali-${tag}\\.apk \\(android\\)`))
    assert.equal(pushes.android, undefined)
    assert.equal(Object.keys(pushes).length, Object.keys(expected).length - 1)
  } finally {
    writeFileSync(apk, "apk")
  }
})

test("goes on past a channel butler fails to push, and fails naming it", async () => {
  const {code, output, pushes} = await push({fails: "windows-x64"})
  assert.notEqual(code, 0)
  // Tried, and every channel after it still pushed
  assert.deepEqual(Object.keys(pushes).sort(), Object.keys(expected).sort())
  assert.match(output, /butler couldn't push these channels to itch\.io: windows-x64$/m)
  assert.doesNotMatch(output, /Pushed .* to every channel/)
})

test("pushes the browser game when there's no release at all, and lists every build missing", async () => {
  const empty = join(dir, "empty")
  mkdirSync(empty, {recursive: true})
  const {code, output, pushes} = await push({releaseDir: empty})
  assert.notEqual(code, 0)
  assert.deepEqual(Object.keys(pushes), ["html5"])
  for (const channel of Object.keys(expected).filter(channel => channel !== "html5")) {
    assert.match(output, new RegExp(`\\(${channel}\\)`), `${channel} listed as missing`)
  }
})

test("doesn't push a tag older than the newest over it", async () => {
  for (const newer of ["2026.11.13", `${tag}.2`]) {
    const {code, output, pushes} = await push({newest: newer})
    assert.equal(code, 0, output)
    assert.deepEqual(pushes, {}, `nothing pushed with ${newer} out`)
    assert.match(output, new RegExp(`${newer.replaceAll(".", "\\.")} is`))
  }
})
