// Posts to Discord when a run on main, or for a release, finishes: what it was, how it
// went, and for a release, how it went everywhere it's published. .github/workflows/
// notify.yml runs it as each of those workflows finishes. What the messages say is in
// messages.mjs; this works out what happened, from the run's jobs and their steps, by
// the names they have in the workflows. Rename a job or a step that's looked for below,
// and change it here too.
//
//   node scripts/notify/notify.mjs <run id>             posts about the run
//   node scripts/notify/notify.mjs --dry-run <run id>   prints what it'd post, instead
//   node scripts/notify/notify.mjs --preview            posts one of each kind, made up
//
// It reads the run with GH_TOKEN, from GITHUB_REPOSITORY, and posts to the webhook in
// CI_NOTIFY_WEBHOOK
import {render} from "./messages.mjs"

const dateTag = /\b\d{4}\.\d{2}\.\d{2}(?:\.\d+)?\b/

// Date tags in the order they were made: a day's first has no number, so it's the
// day's .1
const tagOrder = tag => {
  const [year, month, day, number = 1] = tag.split(".").map(Number)
  return ((year * 100 + month) * 100 + day) * 100 + number
}
const sortTags = tags => [...tags].sort((a, b) => tagOrder(a) - tagOrder(b))

// A job's own name, without the "caller / " that a job in a called workflow has
const baseOf = job => job.name.split(" / ").at(-1)
const jobsNamed = (jobs, name) => jobs.filter(job => baseOf(job) === name || baseOf(job).startsWith(`${name} (`))

// How one step of a job went: "success", "failure" (at failedAt), "blocked" (it didn't
// run, as something before it failed, at failedAt, or its job didn't run at all) or
// "skipped" (it was switched off). Without a step to look for, how the job went
const stepResult = (job, step) => {
  if (!job) {
    return undefined
  }
  if (job.conclusion === "skipped") {
    return {status: "blocked"}
  }
  const steps = job.steps ?? []
  const failedIdx = steps.findIndex(({conclusion}) => conclusion === "failure" || conclusion === "cancelled")
  const failedAt = failedIdx >= 0 ? steps[failedIdx].name : job.conclusion === "cancelled" ? "cancelled" : undefined
  const idx = step ? steps.findIndex(({name}) => step.test(name)) : -1
  if (idx < 0) {
    return job.conclusion === "success" ? {status: "success"} : {status: "failure", failedAt}
  }
  const {conclusion, name} = steps[idx]
  if (conclusion === "success") {
    return {status: "success"}
  }
  if (conclusion === "failure" || conclusion === "cancelled") {
    return {status: "failure", failedAt: name}
  }
  if (failedIdx >= 0 && failedIdx < idx) {
    return {status: "blocked", failedAt}
  }
  return job.conclusion === "success" ? {status: "skipped"} : {status: "failure", failedAt}
}

// One status for several: failed if any failed, waiting if any's waiting on something
// that failed, done if every one that ran worked, and switched off if none ran
const combine = statuses => {
  const ran = statuses.filter(Boolean)
  if (ran.includes("failure")) {
    return "failure"
  }
  if (ran.includes("blocked")) {
    return "blocked"
  }
  return ran.includes("success") ? "success" : "skipped"
}

// Each desktop platform's name, in the order they're listed
const platformNames = {windows: "Windows", macos: "macOS", linux: "Linux"}
const platformOrder = job => {
  const idx = Object.keys(platformNames).indexOf(job.name.match(/build \((\w+)/)?.[1])
  return idx < 0 ? Infinity : idx
}

// Where a release went, from the jobs of whichever run built or published it
const targetsOf = jobs => {
  const targets = []
  const [android] = jobsNamed(jobs, "android")
  const builds = jobsNamed(jobs, "build").sort((a, b) => platformOrder(a) - platformOrder(b))
  const [desktopRelease] = jobsNamed(jobs, "release")

  // The GitHub release: the APK and bundle, and each desktop platform's packages
  const parts = []
  if (android) {
    const result = stepResult(android, /attach .*release/i)
    // Anything before the attaching that failed, the build itself, failed this too
    parts.push({name: "Android", ...result, status: result.status === "blocked" && result.failedAt ? "failure" : result.status})
  }
  builds.forEach(build => {
    const platform = build.name.match(/build \((\w+)/)?.[1]
    const built = stepResult(build, /build and package/i)
    const attached = desktopRelease ? stepResult(desktopRelease, /attach .*release/i) : undefined
    const failedAt = built.status === "failure" || built.failedAt ? built.failedAt : attached?.failedAt
    const status = built.status === "failure" || (built.status === "blocked" && built.failedAt)
      ? "failure"
      : built.status === "blocked" ? "blocked" : attached?.status ?? built.status
    parts.push({name: platformNames[platform] ?? platform, status, failedAt})
  })
  if (parts.length > 0) {
    targets.push({key: "github", status: combine(parts.map(({status}) => status)), parts})
  }

  // Google Play: published to internal testing, then released on closed testing
  if (android) {
    const internal = stepResult(android, /internal testing/i)
    const closed = stepResult(android, /closed testing/i)
    const playParts = [{name: "internal testing", ...internal}, {name: "closed testing", ...closed}]
    let status = combine(playParts.map(part => part.status))
    // Not reached because the build before it failed, rather than failing itself
    if (status === "blocked" || (status === "failure" && !playParts.some(part => part.status === "failure"))) {
      status = "blocked"
    }
    const failedAt = playParts.find(part => part.status === "failure")?.failedAt
    targets.push({key: "play", status, parts: playParts, failedAt, reason: status === "skipped" ? "PLAY_SERVICE_ACCOUNT_JSON" : undefined})
  }

  // itch.io, unless there's no API key to push it with
  const [itch] = jobsNamed(jobs, "itch")
  if (itch) {
    const noKey = itch.steps?.find(({name}) => /without an itch\.io api key/i.test(name))
    const result = noKey?.conclusion === "success" ? {status: "skipped"} : stepResult(itch, /push it to itch/i)
    targets.push({key: "itch", ...result, reason: result.status === "skipped" ? "BUTLER_API_KEY" : undefined})
  }

  // The website, its download links pointed at the release
  const [deploy] = jobsNamed(jobs, "deploy")
  if (deploy) {
    targets.push({key: "s3", ...stepResult(deploy, /^deploy to s3$/i)})
  }
  return targets
}

// How a run went overall, from where it went
const overall = (targets, conclusion) => {
  const statuses = targets.map(({status}) => status)
  const bad = statuses.some(status => status === "failure" || status === "blocked") || (conclusion !== "success" && conclusion !== "skipped")
  if (!bad) {
    return "success"
  }
  return statuses.includes("success") ? "partial" : "failure"
}

const firstLine = text => (text ?? "").split("\n")[0]

// What happened in a run, for messages.mjs to say: see its top for what's in it
const summarise = ({run, jobs, tag, previousTag, since, serverUrl = "https://github.com"}) => {
  const summary = {
    workflow: run.name,
    runUrl: run.html_url,
    finishedAt: run.updated_at,
    minutes: (Date.parse(run.updated_at) - Date.parse(run.run_started_at)) / 60000,
    branch: run.head_branch,
    commit: {
      sha: run.head_sha,
      title: firstLine(run.head_commit?.message) || run.display_title,
      author: run.head_commit?.author?.name ?? run.actor?.login ?? "",
    },
    tag,
    previousTag,
    since,
    releaseUrl: tag ? `${serverUrl}/${run.repository?.full_name ?? process.env.GITHUB_REPOSITORY}/releases/tag/${tag}` : undefined,
  }
  const targets = targetsOf(jobs)

  if (run.name === "Deploy to S3") {
    return {...summary, kind: "deploy", targets, status: overall(targets, run.conclusion)}
  }
  if (run.name === "Nightly release tag") {
    const [tagging] = jobsNamed(jobs, "tag")
    const tagged = stepResult(tagging)
    if (tagged?.status === "success" && targets.every(({status}) => status === "blocked")) {
      return {...summary, kind: "none", targets: [], status: "success", tag: undefined}
    }
    if (tagged && tagged.status !== "success") {
      return {...summary, kind: "release", tag: tag ?? "tonight's", targets, status: "failure", failedAt: tagged.failedAt}
    }
  }
  if (run.name === "Desktop build" && !tag) {
    const failedAt = jobs.map(job => stepResult(job)).find(result => result?.status === "failure")?.failedAt
    return {...summary, kind: "build", targets: [], status: run.conclusion === "success" ? "success" : "failure", failedAt}
  }
  return {...summary, kind: "release", tag: tag ?? "(no tag)", targets, status: overall(targets, run.conclusion)}
}

// Reads from GitHub's API, as the workflow's token allows
const github = (token, repo, apiUrl = "https://api.github.com") => async path => {
  const response = await fetch(`${apiUrl}/repos/${repo}/${path}`, {
    headers: {authorization: `Bearer ${token}`, accept: "application/vnd.github+json"},
  })
  if (!response.ok) {
    throw new Error(`GitHub said ${response.status} to ${path}`)
  }
  return response.json()
}

// The run, its jobs, and the release it's for, if it's for one, with the one before it
const gather = async (api, runId) => {
  const run = await api(`actions/runs/${runId}`)
  const {jobs} = await api(`actions/runs/${runId}/jobs?per_page=100&filter=latest`)
  const refs = await api("git/matching-refs/tags/")
  const tags = sortTags(refs.map(({ref}) => ref.replace("refs/tags/", "")).filter(name => new RegExp(`^${dateTag.source}$`).test(name)))
  // A run for a tag has it in its name (run-name, in the workflow) or is on it. The
  // nightly's is the newest, if this run made it: on a commit of its own, made since it
  // started
  let tag = run.display_title?.match(dateTag)?.[0] ?? run.head_branch?.match(dateTag)?.[0]
  if (!tag && run.name === "Nightly release tag" && tags.length > 0) {
    const newest = tags.at(-1)
    const {commit} = await api(`commits/${newest}`)
    if (commit.message.startsWith(`Release ${newest}`) && Date.parse(commit.committer.date) >= Date.parse(run.run_started_at) - 60_000) {
      tag = newest
    }
  }
  const previousTag = tag ? tags.filter(other => tagOrder(other) < tagOrder(tag)).at(-1) : tags.at(-1)
  let since
  if (tag && previousTag && tags.includes(tag)) {
    // Not counting the commits that each release is made on
    const {commits} = await api(`compare/${previousTag}...${tag}`)
    since = commits.filter(({commit}) => !/^Release \d{4}\./.test(commit.message)).length
  }
  return {run, jobs, tag, previousTag, since}
}

// Posts a message, waiting and trying again if Discord says it's posting too fast. The
// webhook's address is never printed, as anyone with it can post to the channel
const post = async (webhook, message) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${webhook}?wait=true`, {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify(message),
    })
    if (response.ok) {
      return
    }
    if (response.status === 429) {
      const {retry_after: wait = 1} = await response.json().catch(() => ({}))
      await new Promise(resolve => setTimeout(resolve, wait * 1000))
      continue
    }
    throw new Error(`Discord said ${response.status}: ${await response.text()}`)
  }
  throw new Error("Discord kept saying it's posting too fast")
}

const main = async args => {
  const webhook = process.env.CI_NOTIFY_WEBHOOK
  if (args[0] === "--preview") {
    if (!webhook) {
      throw new Error("Set CI_NOTIFY_WEBHOOK to post the previews")
    }
    const {samples} = await import("./samples.mjs")
    for (const [name, sample] of Object.entries(samples)) {
      const message = render(summarise(sample))
      if (message) {
        message.content = `**Preview:** ${name}${message.content ? ` ${message.content}` : ""}`
        await post(webhook, message)
      }
    }
    return
  }
  const dryRun = args[0] === "--dry-run"
  const runId = dryRun ? args[1] : args[0]
  if (!runId) {
    throw new Error("Which run? Give its id")
  }
  const api = github(process.env.GH_TOKEN, process.env.GITHUB_REPOSITORY, process.env.GITHUB_API_URL)
  const summary = summarise({...await gather(api, runId), serverUrl: process.env.GITHUB_SERVER_URL})
  const message = render(summary)
  if (dryRun) {
    console.log(JSON.stringify({summary, message}, null, 2))
    return
  }
  if (!message) {
    console.log(`Nothing to post for a ${summary.kind} that went ${summary.status}`)
    return
  }
  if (!webhook) {
    throw new Error("No CI_NOTIFY_WEBHOOK to post to")
  }
  await post(webhook, message)
  console.log(`Posted: ${message.embeds[0].title}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message)
    process.exit(1)
  })
}

export {sortTags, summarise}
