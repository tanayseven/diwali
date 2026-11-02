#!/usr/bin/env bash
# Builds the desktop app for one platform and packages it, into desktop/dist/:
#
#   desktop/package.sh linux     # a .tar.gz, and .deb, .rpm and Arch Linux packages
#   desktop/package.sh windows   # an installer, and a portable .zip for x64 and for Arm
#   desktop/package.sh macos     # a .dmg, and the .app in a .zip, for Intel and Apple silicon
#
# Each is built on its own platform, as desktop.yml does: macOS apps can only be built on
# a Mac, and the Windows installer needs NSIS. RELEASE_TAG versions it, as it does the
# Android app; without one it's versioned dev. Run from anywhere, with the tools from
# mise.toml (Go, Wails, nfpm) on the path
set -euo pipefail

platform=${1:?Pass linux, windows or macos}
root=$(cd "$(dirname "$0")/.." && pwd)
desktop="$root/desktop"
out="$desktop/dist"
name=diwali-celebration

# The version is the tag, as it is the Android app's: 2026.10.30, or 2026.10.30.2 for a
# day's second release. Windows and macOS want it as numbers, so that's 2026.10.30.0 or
# 2026.10.30.2, without leading zeros
tag=${RELEASE_TAG:-}
if [[ -n $tag ]]; then
  if [[ ! $tag =~ ^([0-9]{4})\.([0-9]{2})\.([0-9]{2})(\.([0-9]+))?$ ]]; then
    echo "RELEASE_TAG must be a date tag, YYYY.MM.DD or YYYY.MM.DD.N, not $tag" >&2
    exit 1
  fi
  version=$tag
  numeric="${BASH_REMATCH[1]}.$((10#${BASH_REMATCH[2]})).$((10#${BASH_REMATCH[3]})).${BASH_REMATCH[5]:-0}"
else
  version=dev
  numeric=0.0.0.0
fi

# The game, built into the app
(cd "$root" && npm run build:desktop)

# Wails takes the version from wails.json, which is put back as it was afterwards
cp "$desktop/wails.json" "$desktop/wails.json.orig"
trap 'mv "$desktop/wails.json.orig" "$desktop/wails.json"' EXIT
node -e '
  const fs = require("fs")
  const config = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
  config.info.productVersion = process.argv[2]
  fs.writeFileSync(process.argv[1], JSON.stringify(config, null, 2) + "\n")
' "$desktop/wails.json" "$numeric"

rm -rf "$out"
mkdir -p "$out"
cd "$desktop"
# Already built above, so Wails doesn't build the game again
build() {
  wails build -s -clean -trimpath -ldflags "-s -w" "$@"
}
# A folder zipped up, with whichever of zip or 7-Zip the platform has
zipUp() {
  local archive=$1 folder=$2
  if command -v zip >/dev/null; then
    (cd "$(dirname "$folder")" && zip -qr "$archive" "$(basename "$folder")")
  else
    (cd "$(dirname "$folder")" && 7z a -tzip -bd "$archive" "$(basename "$folder")" >/dev/null)
  fi
}

case $platform in
  linux)
    # Against WebKitGTK 4.1, which current distributions have instead of 4.0
    build -platform linux/amd64 -tags webkit2_41
    # A plain archive to run from anywhere, and packages for each family of distribution
    portable="$out/$name-$version-linux-x64"
    mkdir -p "$portable"
    cp build/bin/$name "$portable/"
    cp packaging/$name.desktop "$portable/"
    cp build/appicon.png "$portable/$name.png"
    cp "$root/LICENSE.txt" "$portable/"
    tar -czf "$portable.tar.gz" -C "$out" "$(basename "$portable")"
    rm -rf "$portable"
    for packager in deb rpm archlinux; do
      (cd "$root" && VERSION=$version nfpm package --config desktop/packaging/nfpm.yaml --packager $packager --target "$out/")
    done
    ;;
  windows)
    # For x64 and Arm PCs, in one installer that installs whichever the PC is, and each
    # on its own to run without installing
    build -platform windows/amd64,windows/arm64 -nsis
    cp build/bin/$name-*-installer.exe "$out/$name-$version-windows-setup.exe" 2>/dev/null \
      || cp build/bin/*installer*.exe "$out/$name-$version-windows-setup.exe"
    for arch in amd64 arm64; do
      label=$([[ $arch == amd64 ]] && echo x64 || echo arm64)
      portable="$out/$name-$version-windows-$label"
      mkdir -p "$portable"
      cp build/bin/$name-$arch.exe "$portable/$name.exe"
      cp "$root/LICENSE.txt" "$portable/"
      zipUp "$portable.zip" "$portable"
      rm -rf "$portable"
    done
    ;;
  macos)
    # One app for Intel Macs and Apple silicon both
    build -platform darwin/universal
    app="build/bin/Diwali Celebration.app"
    ditto -c -k --keepParent "$app" "$out/$name-$version-macos.zip"
    # A disk image to drag it from into Applications
    image=$(mktemp -d)
    cp -R "$app" "$image/"
    ln -s /Applications "$image/Applications"
    hdiutil create -volname "Diwali Celebration" -srcfolder "$image" -ov -format UDZO "$out/$name-$version-macos.dmg"
    rm -rf "$image"
    ;;
  *)
    echo "Pass linux, windows or macos, not $platform" >&2
    exit 1
    ;;
esac

ls -l "$out"
