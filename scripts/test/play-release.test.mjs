// Runs scripts/release/play-release.sh against a stand-in for Google's token endpoint
// and Play's API, with a throwaway service account key, and checks what it sends: a
// token request signed with the key, then an edit of its own for each track, putting
// the build on it, fully or as a staged rollout, and committing it. That a track Play
// refuses doesn't stop the others, and is named, with what Play said. And that a refused
// token stops it before Play's touched.
//
//   npm run test:e2e
import assert from "node:assert/strict"
import {spawn} from "node:child_process"
import {generateKeyPairSync, verify} from "node:crypto"
import {mkdtempSync, rmSync, writeFileSync} from "node:fs"
import {createServer} from "node:http"
import {tmpdir} from "node:os"
import {join} from "node:path"
import {fileURLToPath} from "node:url"
import {after, before, test} from "node:test"

const script = fileURLToPath(new URL("../release/play-release.sh", import.meta.url))
const pkg = "tech.tanay.diwali"
const api = `/androidpublisher/v3/applications/${pkg}`
const tag = "2026.11.12"
// What scripts/release/version.sh makes of that tag
const versionCode = "31501"
const notes = "• Show a hand holding what a finger drags\n• Quotes \"like these\" & ampersands\n"
const email = "ci@example.iam.gserviceaccount.com"
// What Play says of a track it won't take a release on
const refusal = "Precondition check failed."

const unbase64url = text => Buffer.from(text, "base64url")
const keyPair = () => generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {type: "spki", format: "pem"},
  privateKeyEncoding: {type: "pkcs8", format: "pem"},
})
// The service account's key, and another one Google doesn't know
const account = keyPair()
const stranger = keyPair()

// Every request the stand-in's had, in order, and the tracks it refuses releases on
let requests = []
let refused = new Set()
let edits = 0
const server = createServer((request, response) => {
  let body = ""
  request.on("data", chunk => body += chunk)
  request.on("end", () => {
    const reply = (status, json) => {
      response.writeHead(status, {"Content-Type": "application/json"})
      response.end(JSON.stringify(json))
    }
    if (request.url === "/token") {
      const form = new URLSearchParams(body)
      const [header, claims, signature] = form.get("assertion").split(".")
      const signed = verify("sha256", Buffer.from(`${header}.${claims}`), account.publicKey, unbase64url(signature))
      requests.push({
        token: true, grant: form.get("grant_type"), signed,
        header: JSON.parse(unbase64url(header)), claims: JSON.parse(unbase64url(claims)),
      })
      return signed ? reply(200, {access_token: "token-123"})
        : reply(400, {error: "invalid_grant", error_description: "Invalid JWT Signature."})
    }
    requests.push({method: request.method, url: request.url, auth: request.headers.authorization,
      body: body ? JSON.parse(body) : undefined})
    if (request.method === "POST" && request.url === `${api}/edits`) {
      edits += 1
      return reply(200, {id: `edit-${edits}`})
    }
    const track = request.url.match(/\/tracks\/(\w+)$/)?.[1]
    if (request.method === "PUT" && track) {
      return refused.has(track)
        ? reply(400, {error: {code: 400, message: refusal, status: "FAILED_PRECONDITION"}})
        : reply(200, JSON.parse(body))
    }
    if (request.method === "POST" && request.url.endsWith(":commit")) {
      return reply(200, {id: request.url.match(/edits\/([\w-]+):commit/)[1]})
    }
    reply(404, {error: {message: "not found"}})
  })
})

let base
let dir
let notesFile
before(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve))
  base = `http://127.0.0.1:${server.address().port}`
  dir = mkdtempSync(join(tmpdir(), "play-release-"))
  notesFile = join(dir, "whatsnew-en-US")
  writeFileSync(notesFile, notes)
})
after(() => {
  server.close()
  rmSync(dir, {recursive: true, force: true})
})

// Runs the script for some tracks with a key signed by a key pair, Play refusing some,
// and gives its exit code, its output, and the calls to Play's API
const release = ({privateKey = account.privateKey, tracks = ["alpha", "beta", "production:0.2"], refuse = []} = {}) =>
  new Promise(resolve => {
    requests = []
    refused = new Set(refuse)
    edits = 0
    const key = JSON.stringify({type: "service_account", client_email: email, private_key: privateKey,
      token_uri: `${base}/token`})
    const child = spawn("bash", [script, pkg, tag, notesFile, ...tracks], {
      env: {...process.env, PLAY_SERVICE_ACCOUNT_JSON: key, PLAY_API: base},
    })
    let output = ""
    child.stdout.on("data", chunk => output += chunk)
    child.stderr.on("data", chunk => output += chunk)
    child.on("close", code => resolve({code, output, calls: requests.filter(request => !request.token)}))
  })

// The calls that release the build on a track, in an edit of its own
const releasing = (edit, track, committed = true) => [
  `POST ${api}/edits`,
  `PUT ${api}/edits/${edit}/tracks/${track}`,
  ...committed ? [`POST ${api}/edits/${edit}:commit`] : [],
]
const releaseBody = (track, rollout) => ({
  track,
  releases: [{
    name: tag, versionCodes: [versionCode], releaseNotes: [{language: "en-US", text: notes}],
    ...rollout ? {status: "inProgress", userFraction: rollout} : {status: "completed"},
  }],
})

test("asks for a token signed with the service account's key, for Play's API", async () => {
  const {code, output} = await release()
  assert.equal(code, 0, output)
  const [token] = requests
  assert.equal(token.token, true)
  assert.equal(token.grant, "urn:ietf:params:oauth:grant-type:jwt-bearer")
  assert.equal(token.signed, true, "signed with the service account's key")
  assert.deepEqual(token.header, {alg: "RS256", typ: "JWT"})
  assert.equal(token.claims.iss, email)
  assert.equal(token.claims.aud, `${base}/token`)
  assert.equal(token.claims.scope, "https://www.googleapis.com/auth/androidpublisher")
  assert.ok(token.claims.exp > token.claims.iat)
  assert.equal(requests.filter(request => request.token).length, 1, "one token for every track")
})

test("releases the build on each track in an edit of its own: fully, or to a share of users", async () => {
  const {code, output, calls} = await release()
  assert.equal(code, 0, output)
  assert.deepEqual(calls.map(({method, url}) => `${method} ${url}`), [
    ...releasing("edit-1", "alpha"), ...releasing("edit-2", "beta"), ...releasing("edit-3", "production"),
  ])
  assert.ok(calls.every(call => call.auth === "Bearer token-123"), "every call carries the token")
  const bodies = calls.filter(call => call.method === "PUT").map(call => call.body)
  assert.deepEqual(bodies, [releaseBody("alpha"), releaseBody("beta"), releaseBody("production", 0.2)])
  assert.match(output, /Released 2026\.11\.12 on every track/)
})

test("goes on past a track Play refuses, and fails naming it, with what Play said", async () => {
  const {code, output, calls} = await release({refuse: ["beta"]})
  assert.notEqual(code, 0)
  assert.deepEqual(calls.map(({method, url}) => `${method} ${url}`), [
    ...releasing("edit-1", "alpha"), ...releasing("edit-2", "beta", false), ...releasing("edit-3", "production"),
  ])
  assert.match(output, new RegExp(`Refused, 400: ${refusal.replace(".", "\\.")}`))
  assert.match(output, /didn't take 2026\.11\.12 on: beta$/m)
})

test("stops before touching Play when the token's refused, saying why", async () => {
  const {code, output, calls} = await release({privateKey: stranger.privateKey})
  assert.notEqual(code, 0)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].signed, false)
  assert.deepEqual(calls, [])
  assert.match(output, /Invalid JWT Signature/)
})
