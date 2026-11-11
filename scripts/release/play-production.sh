#!/usr/bin/env bash
# Releases a build already uploaded to Google Play to its production track, as a staged
# rollout to a share of users, without uploading it again: Play has it from the upload
# to the testing tracks. Run by android.yml after that upload.
#
#   PLAY_SERVICE_ACCOUNT_JSON='{...}' play-production.sh <package> <tag> <notes-file> <user-fraction>
#
# Uses only openssl, curl and jq. The service account's key signs a token for Play's API,
# as Google's OAuth expects of a service account, and the release is made in an edit of
# its own, committed at the end. PLAY_API overrides where Play's API is, for testing
set -euo pipefail

package=${1:?Usage: play-production.sh <package> <tag> <notes-file> <user-fraction>}
tag=${2:?Usage: play-production.sh <package> <tag> <notes-file> <user-fraction>}
notes_file=${3:?Usage: play-production.sh <package> <tag> <notes-file> <user-fraction>}
fraction=${4:?Usage: play-production.sh <package> <tag> <notes-file> <user-fraction>}
key=${PLAY_SERVICE_ACCOUNT_JSON:?PLAY_SERVICE_ACCOUNT_JSON must hold the service account key}
api=${PLAY_API:-https://androidpublisher.googleapis.com}/androidpublisher/v3/applications/$package
code=$("$(dirname "$0")/version.sh" "$tag")

# An access token for Play's API, from a JWT signed with the service account's key
base64url() {
  openssl base64 -A | tr '+/' '-_' | tr -d '='
}
private_key=$(mktemp)
trap 'rm -f "$private_key"' EXIT
jq -r .private_key <<< "$key" > "$private_key"
token_uri=$(jq -r '.token_uri // "https://oauth2.googleapis.com/token"' <<< "$key")
now=$(date +%s)
header=$(printf '{"alg":"RS256","typ":"JWT"}' | base64url)
claims=$(jq -cn --arg iss "$(jq -r .client_email <<< "$key")" --arg aud "$token_uri" --argjson now "$now" \
  '{iss: $iss, scope: "https://www.googleapis.com/auth/androidpublisher", aud: $aud, iat: $now, exp: ($now + 600)}' \
  | base64url)
signature=$(printf '%s.%s' "$header" "$claims" | openssl dgst -sha256 -sign "$private_key" | base64url)
token=$(curl -fsS "$token_uri" \
  --data-urlencode "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \
  --data-urlencode "assertion=$header.$claims.$signature" | jq -r .access_token)

play() {
  curl -fsS -H "Authorization: Bearer $token" -H "Content-Type: application/json" "$@"
}

edit=$(play -X POST "$api/edits" -d '{}' | jq -r .id)
release=$(jq -cn --arg name "$tag" --arg code "$code" --argjson fraction "$fraction" --rawfile notes "$notes_file" \
  '{track: "production", releases: [{name: $name, versionCodes: [$code], status: "inProgress",
    userFraction: $fraction, releaseNotes: [{language: "en-US", text: $notes}]}]}')
play -X PUT "$api/edits/$edit/tracks/production" -d "$release" > /dev/null
committed=$(play -X POST "$api/edits/$edit:commit" | jq -r .id)
echo "Released $tag ($code) to production for $fraction of users, in edit $committed"
