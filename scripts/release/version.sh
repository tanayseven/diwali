#!/usr/bin/env bash
# Prints the Android version code for a date tag, YYYY.MM.DD or YYYY.MM.DD.N for the
# Nth release that day: the days since 1 January 2026 times 100, plus the release's
# number that day. android/app/build.gradle works it out the same way for RELEASE_TAG,
# so change both together
set -euo pipefail

tag=${1:?Usage: version.sh YYYY.MM.DD[.N]}
if [[ ! $tag =~ ^([0-9]{4})\.([0-9]{2})\.([0-9]{2})(\.([0-9]{1,2}))?$ ]]; then
  echo "Not a date tag like 2026.10.30, or 2026.10.30.2 for a second release that day: $tag" >&2
  exit 1
fi
day="${BASH_REMATCH[1]}-${BASH_REMATCH[2]}-${BASH_REMATCH[3]}"
number=$((10#${BASH_REMATCH[5]:-1}))
# Python's dates, as macOS's date and GNU date take different flags
days=$(python3 -c "import datetime, sys; print((datetime.date.fromisoformat(sys.argv[1]) - datetime.date(2026, 1, 1)).days)" "$day")
echo $((days * 100 + number))
