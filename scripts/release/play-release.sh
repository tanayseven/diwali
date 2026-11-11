#!/usr/bin/env bash
# Releases a build already uploaded to Google Play on more of its tracks, without
# uploading it again: Play has it from the upload to internal testing. Run by
# android.yml after that upload.
#
#   PLAY_SERVICE_ACCOUNT_JSON='{...}' play-release.sh <package> <tag> <notes-file> <track>[:<fraction>]...
#
# A track on its own is released to everyone on it; with a fraction, such as
# production:0.2, it's a staged rollout to that share of its users. Each track is
# changed in an edit of its own, so one Play won't take, such as a testing track that
# isn't set up yet, doesn't stop the others: what Play said is printed for it, the rest
# go on, and it fails at the end, naming the tracks that didn't take it.
#
# Uses only openssl, curl and jq. The service account's key signs a token for Play's API,
# as Google's OAuth expects of a service account. PLAY_API overrides where Play's API
# is, for testing
set -euo pipefail

usage="Usage: play-release.sh <package> <tag> <notes-file> <track>[:<fraction>]..."
package=${1:?$usage}
tag=${2:?$usage}
notes_file=${3:?$usage}
shift 3
(( $# )) || { echo "$usage" >&2; exit 1; }
key=${PLAY_SERVICE_ACCOUNT_JSON:?PLAY_SERVICE_ACCOUNT_JSON must hold the service account key}
api=${PLAY_API:-https://androidpublisher.googleapis.com}/androidpublisher/v3/applications/$package
code=$("$(dirname "$0")/version.sh" "$tag")

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# Sends a request, leaving the response in $work/response. Fails, printing what was
# said, if it's refused
call() {
  local status
  if ! status=$(curl -sS -o "$work/response" -w '%{http_code}' "$@"); then
    echo "  Couldn't reach it" >&2
    return 1
  fi
  if (( status >= 300 )); then
    echo "  Refused, $status: $(jq -r '.error.message // .error_description // .error // .' "$work/response" 2>/dev/null \
      || cat "$work/response")" >&2
    return 1
  fi
}

# An access token for Play's API, from a JWT signed with the service account's key
base64url() {
  openssl base64 -A | tr '+/' '-_' | tr -d '='
}
jq -r .private_key <<< "$key" > "$work/key.pem"
token_uri=$(jq -r '.token_uri // "https://oauth2.googleapis.com/token"' <<< "$key")
now=$(date +%s)
header=$(printf '{"alg":"RS256","typ":"JWT"}' | base64url)
claims=$(jq -cn --arg iss "$(jq -r .client_email <<< "$key")" --arg aud "$token_uri" --argjson now "$now" \
  '{iss: $iss, scope: "https://www.googleapis.com/auth/androidpublisher", aud: $aud, iat: $now, exp: ($now + 600)}' \
  | base64url)
signature=$(printf '%s.%s' "$header" "$claims" | openssl dgst -sha256 -sign "$work/key.pem" | base64url)
rm "$work/key.pem"
echo "Getting a token for Play's API"
call "$token_uri" --data-urlencode "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \
  --data-urlencode "assertion=$header.$claims.$signature"
token=$(jq -r .access_token "$work/response")

play() {
  call -H "Authorization: Bearer $token" -H "Content-Type: application/json" "$@"
}

# Releases the build on one track, in an edit of its own, committed if Play takes it
release() {
  local track=$1 fraction=$2 release edit
  release=$(jq -cn --arg track "$track" --arg name "$tag" --arg code "$code" --arg fraction "$fraction" \
    --rawfile notes "$notes_file" \
    '{track: $track, releases: [{name: $name, versionCodes: [$code], releaseNotes: [{language: "en-US", text: $notes}]}
      + (if $fraction == "" then {status: "completed"} else {status: "inProgress", userFraction: ($fraction | tonumber)} end)]}')
  play -X POST "$api/edits" -d '{}' || return 1
  edit=$(jq -r .id "$work/response")
  play -X PUT "$api/edits/$edit/tracks/$track" -d "$release" || return 1
  play -X POST "$api/edits/$edit:commit" || return 1
}

failed=()
for spec in "$@"; do
  track=${spec%%:*}
  fraction=
  [[ $spec == *:* ]] && fraction=${spec#*:}
  echo "Releasing $tag ($code) on $track${fraction:+ for $fraction of users}"
  if release "$track" "$fraction"; then
    echo "  Released"
  else
    failed+=("$track")
  fi
done

if (( ${#failed[@]} )); then
  echo "Google Play didn't take $tag on: ${failed[*]}" >&2
  exit 1
fi
echo "Released $tag on every track: $*"
