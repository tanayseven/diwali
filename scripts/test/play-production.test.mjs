// Runs scripts/release/play-production.sh against a stand-in for Google's token endpoint
// and Play's API, with a throwaway service account key, and checks what it sends: a
// token request signed with the key, then an edit putting the build on production as a
// staged rollout, committed. And that a refused token stops it before Play's touched.
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

const script = fileURLToPath(new URL("../release/play-production.sh", import.meta.url))
const pkg = "tech.tanay.diwali"
const tag = "2026.11.12"
// What scripts/release/version.sh makes of that tag
const versionCode = "31501"
const notes = "• Show a hand holding what a finger drags\n• Quotes \"like these\" & ampersands\n"
const email = "ci@example.iam.gserviceaccount.com"

const unbase64url = text => Buffer.from(text, "base64url")
const keyPair = () => generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {type: "spki", format: "pem"},
  privateKeyEncoding: {type: "pkcs8", format: "pem"},
})
// The service account's key, and another one Google doesn't know
const account = keyPair()
const stranger = keyPair()

// Every request the stand-in's had, in order
let requests = []
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
      return signed ? reply(200, {access_token: "token-123"}) : reply(400, {error: "invalid_grant"})
    }
    requests.push({method: request.method, url: request.url, auth: request.headers.authorization,
      body: body ? JSON.parse(body) : undefined})
    if (request.method === "POST" && request.url.endsWith("/edits")) {
      return reply(200, {id: "edit-42"})
    }
    if (request.method === "PUT" && request.url.endsWith("/tracks/production")) {
      return reply(200, JSON.parse(body))
    }
    if (request.method === "POST" && request.url.endsWith(":commit")) {
      return reply(200, {id: "edit-42"})
    }
    reply(404, {error: "not found"})
  })
})

let base
let dir
let notesFile
before(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve))
  base = `http://127.0.0.1:${server.address().port}`
  dir = mkdtempSync(join(tmpdir(), "play-production-"))
  notesFile = join(dir, "whatsnew-en-US")
  writeFileSync(notesFile, notes)
})
after(() => {
  server.close()
  rmSync(dir, {recursive: true, force: true})
})

// Runs the script with a key signed by a key pair, and gives its exit code and output
const release = privateKey => new Promise(resolve => {
  requests = []
  const key = JSON.stringify({type: "service_account", client_email: email, private_key: privateKey,
    token_uri: `${base}/token`})
  const child = spawn("bash", [script, pkg, tag, notesFile, "0.2"], {
    env: {...process.env, PLAY_SERVICE_ACCOUNT_JSON: key, PLAY_API: base},
  })
  let output = ""
  child.stdout.on("data", chunk => output += chunk)
  child.stderr.on("data", chunk => output += chunk)
  child.on("close", code => resolve({code, output}))
})

test("asks for a token signed with the service account's key, for Play's API", async () => {
  const {code, output} = await release(account.privateKey)
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
})

test("releases the build to production for a share of users, in an edit it commits", async () => {
  const {code, output} = await release(account.privateKey)
  assert.equal(code, 0, output)
  const api = `/androidpublisher/v3/applications/${pkg}`
  const calls = requests.filter(request => !request.token)
  assert.deepEqual(calls.map(({method, url}) => `${method} ${url}`), [
    `POST ${api}/edits`,
    `PUT ${api}/edits/edit-42/tracks/production`,
    `POST ${api}/edits/edit-42:commit`,
  ])
  assert.ok(calls.every(call => call.auth === "Bearer token-123"), "every call carries the token")
  assert.deepEqual(calls[1].body, {
    track: "production",
    releases: [{
      name: tag, versionCodes: [versionCode], status: "inProgress", userFraction: 0.2,
      releaseNotes: [{language: "en-US", text: notes}],
    }],
  })
  assert.match(output, new RegExp(`Released ${tag} \\(${versionCode}\\) to production`))
})

test("stops before touching Play when the token's refused", async () => {
  const {code} = await release(stranger.privateKey)
  assert.notEqual(code, 0)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].signed, false)
})
