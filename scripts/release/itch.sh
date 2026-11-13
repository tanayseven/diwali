#!/usr/bin/env bash
# Pushes a release to itch.io with butler, in every form itch.io takes: the game to play
# in the browser, the desktop apps for Windows, macOS and Linux, both portable and as
# installers and packages, and the Android app. Run by itch.yml, for each date tag.
#
#   itch.sh <tag> <release-dir> <web-dir>
#
# <release-dir> holds the GitHub release's files for the tag, and <web-dir> the game built
# for the browser with relative paths, as itch.io serves it from a folder of its own.
# butler must be on the path, logged in with BUTLER_API_KEY. ITCH_GAME overrides the game.
#
# Each goes to a channel of its own, which itch.io tells the platform from by its name.
# Everything there is gets pushed, even past one butler fails on; anything missing from
# the release, or that butler couldn't push, is listed at the end, and fails it, so a
# build that didn't make it is noticed.
#
# The channels only ever hold the newest release: a tag older than the newest date tag
# on GitHub isn't pushed, so a slow run for an older one can't replace a newer one that
# got there first. itch.yml runs one at a time, so a newer one waits for an older one.
# ITCH_NEWEST_TAG gives the newest, instead of asking GitHub, for testing
set -euo pipefail

tag=${1:?Usage: itch.sh <tag> <release-dir> <web-dir>}
release=${2:?Usage: itch.sh <tag> <release-dir> <web-dir>}
web=${3:?Usage: itch.sh <tag> <release-dir> <web-dir>}
game=${ITCH_GAME:-tanayseven/diwali-celebration}
name=diwali-celebration

# Sorted by date, then the day's release number, as the nightly workflow sorts them.
# If GitHub can't be asked, nothing's pushed, rather than risk replacing a newer one
newest=${ITCH_NEWEST_TAG:-}
if [[ -z $newest ]]; then
  newest=$(git ls-remote --tags --refs origin | sed 's|.*refs/tags/||' \
    | grep -E '^[0-9]{4}\.[0-9]{2}\.[0-9]{2}(\.[0-9]{1,2})?$' | sort -t. -k1,1n -k2,2n -k3,3n -k4,4n | tail -n 1)
fi
if [[ $tag != "$newest" ]]; then
  echo "$tag isn't the newest release, $newest is, so it isn't pushed over it"
  exit 0
fi

missing=()
failed=()
staging=$(mktemp -d)
trap 'rm -rf "$staging"' EXIT

# Pushes a folder, or a .zip, to a channel, labelled with the tag, with any more of
# butler's options. If butler fails, the channel's noted and the rest still go
push() {
  local src=$1 channel=$2
  shift 2
  echo "Pushing $(basename "$src") to $game:$channel"
  butler push "$src" "$game:$channel" --userversion "$tag" "$@" || failed+=("$channel")
}
# Pushes one file of the release as it is, from a folder of its own, as butler pushes
# folders. A folder holding just a .zip would be unzipped, which is wanted for the apps
pushFile() {
  local file=$release/$1 channel=$2
  if [[ ! -f $file ]]; then
    missing+=("$1 ($channel)")
    return
  fi
  mkdir -p "$staging/$channel"
  cp "$file" "$staging/$channel/"
  push "$staging/$channel" "$channel"
}

# The game in the browser, unless it's no different. Only it can be: every other build's
# files are named with the tag, and butler's check for a change breaks on a channel
# that's a .zip, looking for the last build's folder inside the new .zip
if [[ -f $web/index.html ]]; then
  push "$web" html5 --if-changed
else
  missing+=("$web/index.html (html5)")
fi

# Windows, portable and with an installer, for x64 and Arm PCs
for arch in x64 arm64; do
  pushFile "$name-$tag-windows-$arch.zip" "windows-$arch"
  pushFile "$name-$tag-windows-$arch-setup.exe" "windows-$arch-installer"
done

# macOS: the app, and the disk image to drag it from
pushFile "$name-$tag-macos.zip" mac
pushFile "$name-$tag-macos.dmg" mac-dmg

# Linux: the portable app, unpacked, as butler only takes folders and .zips, and the
# packages for each family of distribution
portable=$release/$name-$tag-linux-x64.tar.gz
if [[ -f $portable ]]; then
  mkdir -p "$staging/linux-x64"
  tar -xzf "$portable" -C "$staging/linux-x64"
  push "$staging/linux-x64" linux-x64
else
  missing+=("$(basename "$portable") (linux-x64)")
fi
pushFile "${name}_$tag-1_amd64.deb" linux-deb
pushFile "$name-$tag-1.x86_64.rpm" linux-rpm
pushFile "$name-$tag-1-x86_64.pkg.tar.zst" linux-arch

# Android
pushFile "diwali-$tag.apk" android

if (( ${#missing[@]} )); then
  echo "Not in the release, so not pushed to itch.io:" >&2
  printf '  %s\n' "${missing[@]}" >&2
fi
if (( ${#failed[@]} )); then
  echo "butler couldn't push these channels to itch.io: ${failed[*]}" >&2
fi
if (( ${#missing[@]} || ${#failed[@]} )); then
  exit 1
fi
echo "Pushed $tag to every channel of $game"
