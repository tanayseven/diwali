// Made-up runs, with the jobs and steps the real workflows have, for
// `node scripts/notify/notify.mjs --preview` to post one of each kind of message, and for
// scripts/test/notify.test.mjs to check what's made of them

const runUrl = "https://github.com/tanayseven/diwali/actions/runs/1"

const run = (name, conclusion, extra = {}) => ({
  name,
  conclusion,
  html_url: runUrl,
  display_title: name,
  head_branch: "main",
  head_sha: "5fead3d2c8b41f0e9a7d6c5b4a3f2e1d0c9b8a7f",
  head_commit: {message: "Merge pull request #66 from tanayseven/greeting-mode\n\nGreeting mode", author: {name: "Tanay PrabhuDesai"}},
  run_started_at: "2026-11-27T18:00:05Z",
  updated_at: "2026-11-27T18:24:40Z",
  repository: {full_name: "tanayseven/diwali"},
  ...extra,
})

// A job, its steps all done unless they're named in outcomes
const job = (name, steps, outcomes = {}, conclusion) => {
  const made = steps.map(step => ({name: step, conclusion: outcomes[step] ?? "success"}))
  // After a step fails, the rest are skipped, as GitHub does
  const failed = made.findIndex(({conclusion}) => conclusion === "failure")
  if (failed >= 0) {
    made.slice(failed + 1).forEach(step => step.conclusion = outcomes[step.name] ?? "skipped")
  }
  return {name, conclusion: conclusion ?? (failed >= 0 ? "failure" : "success"), steps: made}
}

const androidSteps = [
  "Checkout the tag", "Setup tools with mise", "Install dependencies", "Build the APK",
  "Build the app bundle for Google Play", "Attach the APK and the app bundle to a release for the tag",
  "Write the notes for Google Play", "Publish the app bundle to Google Play's internal testing",
  "Release it on Google Play's closed testing",
]
const buildSteps = ["Checkout the tag, or the branch it's run on", "Setup tools with mise", "Install dependencies", "Build and package the app", "Keep the packages for the release"]
const releaseSteps = ["Gather every platform's packages", "Attach the packages to a release for the tag"]
const itchSteps = ["Without an itch.io API key, there's nothing to do", "Checkout the tag", "Build the game for itch.io", "Download the release's files", "Install butler", "Push it to itch.io"]
const deploySteps = ["Checkout code", "Setup tools with mise", "Install dependencies", "Find the newest release", "Build project", "Configure AWS Credentials OIDC login", "Deploy to S3"]

const nightly = ({android = {}, windows = {}, itch = {"Without an itch.io API key, there's nothing to do": "skipped"}, deploy = {}} = {}) => [
  job("tag", ["Checkout code with its tags", "Tag main with the date, if the app's changed"]),
  job("android / android", androidSteps, android),
  job("desktop / build (macos, macos-latest)", buildSteps),
  job("desktop / build (windows, windows-latest)", buildSteps, windows),
  job("desktop / build (linux, ubuntu-24.04)", buildSteps),
  job("desktop / release", releaseSteps, {}, Object.values(windows).includes("failure") ? "skipped" : undefined),
  job("itch / itch", itchSteps, itch),
  job("website / deploy", deploySteps, deploy),
]

const release = {tag: "2026.11.27", previousTag: "2026.11.26", since: 3}

export const samples = {
  "a release that went out everywhere": {
    ...release,
    run: run("Nightly release tag", "success"),
    jobs: nightly(),
  },
  "a release Google Play refused, without an itch.io key": {
    ...release,
    run: run("Nightly release tag", "failure"),
    jobs: nightly({
      android: {"Release it on Google Play's closed testing": "failure"},
      itch: {"Without an itch.io API key, there's nothing to do": "success", ...Object.fromEntries(itchSteps.slice(1).map(step => [step, "skipped"]))},
    }),
  },
  "a release whose Windows build failed": {
    ...release,
    run: run("Nightly release tag", "failure"),
    jobs: nightly({windows: {"Build and package the app": "failure"}}),
  },
  "the website deployed from a merge to main": {
    run: run("Deploy to S3", "success", {updated_at: "2026-11-27T18:01:47Z"}),
    jobs: [job("deploy", deploySteps)],
  },
  "a website deploy that failed": {
    run: run("Deploy to S3", "failure", {updated_at: "2026-11-27T18:01:03Z"}),
    jobs: [job("deploy", deploySteps, {"Deploy to S3": "failure"})],
  },
  "a nightly with nothing new to release": {
    previousTag: "2026.11.26",
    run: run("Nightly release tag", "success", {updated_at: "2026-11-27T18:00:21Z"}),
    jobs: [
      job("tag", ["Checkout code with its tags", "Tag main with the date, if the app's changed"]),
      ...["android", "desktop", "itch", "website"].map(name => ({name, conclusion: "skipped", steps: []})),
    ],
  },
}
