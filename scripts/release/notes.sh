#!/usr/bin/env bash
# Prints what's new in a release, for Google Play and F-Droid: the subjects of the
# commits since the date tag before it, as bullets, cut at whole lines to the 500
# characters both allow. The tag needn't exist yet: then it's what's on HEAD
set -euo pipefail

tag=${1:?Usage: notes.sh YYYY.MM.DD[.N]}
date_tags() {
  git tag --list | grep -E '^[0-9]{4}\.[0-9]{2}\.[0-9]{2}(\.[0-9]{1,2})?$' || true
}
previous=$({ date_tags; echo "$tag"; } | sort -u -t. -k1,1n -k2,2n -k3,3n -k4,4n \
  | grep -B1 -Fx "$tag" | grep -vFx "$tag" || true)
if git rev-parse -q --verify "refs/tags/$tag" > /dev/null; then
  until=$tag
else
  until=HEAD
fi
if [ -n "$previous" ]; then
  range=("$previous..$until")
else
  range=(-n 10 "$until")
fi
# Release commits only carry the version, so they're left out
notes=$(git log --no-merges --format='• %s' "${range[@]}" | { grep -v '^• Release [0-9.]*$' || true; } \
  | awk '{ if (n + length($0) + 1 > 500) exit; print; n += length($0) + 1 }')
echo "${notes:-Nightly build $tag}"
