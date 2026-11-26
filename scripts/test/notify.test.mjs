// Checks what scripts/notify/notify.mjs makes of runs like the real workflows' (the
// made-up ones in scripts/notify/samples.mjs), and what messages.mjs posts for them: a
// release's every destination, with what failed and what was skipped, a deploy from
// main, and nothing at all for a nightly with nothing new. And that the date tags are
// put in the order they were made, and that a commit's message can't ping anyone.
//
//   npm run test:e2e
import assert from "node:assert/strict"
import {test} from "node:test"
import {render, settings} from "../notify/messages.mjs"
import {sortTags, summarise} from "../notify/notify.mjs"
import {samples} from "../notify/samples.mjs"

const statusesOf = summary => Object.fromEntries(summary.targets.map(({key, status}) => [key, status]))

test("a release that went out everywhere says so, for every destination", () => {
  const summary = summarise(samples["a release that went out everywhere"])
  assert.equal(summary.kind, "release")
  assert.equal(summary.status, "success")
  assert.deepEqual(statusesOf(summary), {github: "success", play: "success", itch: "success", s3: "success"})
  const [embed] = render(summary).embeds
  assert.equal(embed.title, "🚀 Release 2026.11.27 · all published")
  assert.match(embed.description, /3 commits since 2026\.11\.26/)
  assert.equal(embed.fields[0].value, "Android ✓ · Windows ✓ · macOS ✓ · Linux ✓")
})

test("a release Play refused is partly published, with itch.io skipped for its missing key", () => {
  const summary = summarise(samples["a release Google Play refused, without an itch.io key"])
  assert.equal(summary.status, "partial")
  assert.deepEqual(statusesOf(summary), {github: "success", play: "failure", itch: "skipped", s3: "success"})
  const [embed] = render(summary).embeds
  assert.match(embed.title, /published with problems/)
  const play = embed.fields.find(({name}) => name.includes("Google Play"))
  assert.equal(play.value, "Failed at: Release it on Google Play's closed testing")
  assert.match(embed.fields.find(({name}) => name.includes("itch.io")).value, /BUTLER_API_KEY/)
})

test("a desktop build that failed fails the GitHub release, naming the platform and step", () => {
  const summary = summarise(samples["a release whose Windows build failed"])
  const github = summary.targets.find(({key}) => key === "github")
  assert.equal(github.status, "failure")
  assert.deepEqual(github.parts.map(({name, status}) => `${name} ${status}`), ["Android success", "Windows failure", "macOS blocked", "Linux blocked"])
  const [embed] = render(summary).embeds
  assert.match(embed.fields[0].value, /Windows ✗ at Build and package the app/)
})

test("a deploy from main says whether the website's up to date, or where it failed", () => {
  const deployed = render(summarise(samples["the website deployed from a merge to main"])).embeds[0]
  assert.equal(deployed.title, "✅ main · Website deployed")
  assert.match(deployed.description, /Merge pull request #66/)
  const failed = render(summarise(samples["a website deploy that failed"])).embeds[0]
  assert.equal(failed.title, "❌ main · Website deploy failed")
  assert.match(failed.description, /Failed at: Deploy to S3/)
})

test("a nightly with nothing new posts nothing, unless it's asked to", () => {
  const summary = summarise(samples["a nightly with nothing new to release"])
  assert.equal(summary.kind, "none")
  assert.equal(render(summary), undefined)
  settings.postNoRelease = true
  try {
    assert.equal(render(summary).embeds[0].title, "🌙 No release tonight")
  } finally {
    settings.postNoRelease = false
  }
})

test("only failures are posted when successes are switched off, mentioning who's set", () => {
  settings.postSuccess = false
  settings.mentionOnFailure = "<@123456789>"
  try {
    assert.equal(render(summarise(samples["a release that went out everywhere"])), undefined)
    const message = render(summarise(samples["a website deploy that failed"]))
    assert.equal(message.content, "<@123456789>")
    assert.deepEqual(message.allowed_mentions, {parse: [], users: ["123456789"], roles: []})
  } finally {
    settings.postSuccess = true
    settings.mentionOnFailure = ""
  }
})

test("a commit's message can't ping anyone", () => {
  const sample = samples["the website deployed from a merge to main"]
  const message = render(summarise({...sample, run: {...sample.run, head_commit: {message: "@everyone <@42> look", author: {name: "x"}}}}))
  assert.equal(message.content, undefined)
  assert.deepEqual(message.allowed_mentions, {parse: [], users: [], roles: []})
})

test("every message fits in Discord's limits", () => {
  for (const sample of Object.values(samples)) {
    const message = render(summarise(sample))
    for (const embed of message?.embeds ?? []) {
      assert.ok(embed.title.length <= 256)
      assert.ok((embed.description ?? "").length <= 4096)
      for (const {name, value} of embed.fields ?? []) {
        assert.ok(name.length <= 256 && value.length > 0 && value.length <= 1024)
      }
    }
  }
})

test("date tags are in the order they were made, a day's first before its .2", () => {
  assert.deepEqual(sortTags(["2026.11.24.2", "2026.11.24", "2026.11.24.10", "2026.11.23"]), ["2026.11.23", "2026.11.24", "2026.11.24.2", "2026.11.24.10"])
})
