// What the CI notifications say, and how they look in Discord. Everything that can be
// changed is in this file: the wording, the emoji, the colours, what's posted and who's
// mentioned. notify.mjs works out what happened in a run and hands it to render() below
// as a summary:
//
//   kind     "release", a date tag's builds and where they went; "deploy", the website
//            deployed from a merge to main; "build", a desktop build tried out without a
//            tag; or "none", a nightly that found nothing new to release
//   status   "success", "partial" (some went out, some didn't) or "failure"
//   tag      the release's date tag, such as 2026.11.27, and previousTag, the one before
//   since    how many commits are in it since previousTag, if it's known
//   commit   {sha, title, author} of what was built
//   targets  where a release went, in order, each {key, status, parts, failedAt, reason}:
//            key is "github", "play", "itch" or "s3"; status is "success", "failure",
//            "skipped" (switched off, for want of the secret named in reason) or "blocked"
//            (it didn't run, as something before it failed); failedAt is the step that
//            failed; and parts, for GitHub and Play, are each platform or track, {name,
//            status, failedAt}
//   failedAt for a nightly that couldn't make its tag, the step that failed
//   minutes  how long the run took
//   runUrl, releaseUrl, workflow
//
// Run `node scripts/notify/notify.mjs --preview` with CI_NOTIFY_WEBHOOK set to post one
// of each kind of message, to see what a change looks like

export const settings = {
  // The name and picture the messages are posted under
  username: "Diwali CI",
  // The app's icon, as F-Droid shows it
  avatarUrl: "https://raw.githubusercontent.com/tanayseven/diwali/main/fastlane/metadata/android/en-US/images/icon.png",
  // Whether to post when everything worked, or only when something didn't
  postSuccess: true,
  // Whether to post when the nightly found nothing new, so made no release
  postNoRelease: false,
  // Who to mention when something fails or only partly works, as Discord writes them:
  // "<@user id>", "<@&role id>", or "@here". Empty mentions nobody
  mentionOnFailure: "",
}

// The colour down the side of each message
const colours = {success: 0x2ecc71, partial: 0xf1c40f, failure: 0xe74c3c, none: 0x95a5a6}

// Each status's mark, before a destination's name
const marks = {success: "✅", failure: "❌", skipped: "⏭️", blocked: "⏳"}

// Each destination's name, in the order they're listed
const targetNames = {
  github: "GitHub release",
  play: "Google Play",
  itch: "itch.io",
  s3: "Website (S3)",
}

// The release's title, by how it went
const releaseHeadings = {
  success: tag => `🚀 Release ${tag} · all published`,
  partial: tag => `⚠️ Release ${tag} · published with problems`,
  failure: tag => `❌ Release ${tag} · failed`,
}

const deployHeadings = {
  success: () => "✅ main · Website deployed",
  failure: () => "❌ main · Website deploy failed",
}

const buildHeadings = {
  success: branch => `🧪 Desktop build of ${branch} · built`,
  failure: branch => `❌ Desktop build of ${branch} · failed`,
}

// Each platform's or track's mark, after its name. A platform's "blocked" when it built,
// but wasn't attached to the release, as another platform's build failed
const partMarks = {success: "✓", failure: "✗", skipped: "–", blocked: "not attached"}
const listParts = parts => parts
  .map(({name, status, failedAt}) => status === "failure" && failedAt ? `${name} ✗ at ${failedAt}` : `${name} ${partMarks[status]}`)
  .join(" · ")

// The line under each destination
const describeTarget = ({key, status, parts = [], failedAt, reason}, summary) => {
  if (status === "skipped") {
    return reason ? `Skipped: ${reason} isn't set` : "Skipped"
  }
  if (status === "blocked") {
    return failedAt ? `Didn't run: it failed before, at ${failedAt}` : "Didn't run: something before it failed"
  }
  if (key === "github") {
    return listParts(parts)
  }
  if (status === "failure") {
    return `Failed at: ${failedAt ?? "a step that didn't say"}`
  }
  if (key === "play") {
    return listParts(parts)
  }
  if (key === "itch") {
    return "Browser game and every download pushed"
  }
  if (key === "s3") {
    return summary.kind === "release" ? `Download links now point to ${summary.tag}` : "diwali.tanay.tech is up to date"
  }
  return "Done"
}

const duration = minutes => minutes < 1 ? "under a minute" : `${Math.round(minutes)}m`
const shortSha = sha => sha.slice(0, 7)

// The message for a summary, as Discord's webhook takes it, or nothing to post nothing
export const render = summary => {
  const failed = summary.status !== "success"
  if (!failed && !settings.postSuccess) {
    return undefined
  }
  if (summary.kind === "none" && !settings.postNoRelease) {
    return undefined
  }
  const embed = {
    color: colours[summary.kind === "none" ? "none" : summary.status],
    url: summary.runUrl,
    footer: {text: summary.workflow},
    timestamp: summary.finishedAt,
  }
  const runLink = `[View run](${summary.runUrl})`

  if (summary.kind === "release") {
    embed.title = releaseHeadings[summary.status](summary.tag)
    embed.url = summary.releaseUrl ?? summary.runUrl
    const since = summary.previousTag && summary.since !== undefined
      ? ` · ${summary.since} commit${summary.since === 1 ? "" : "s"} since ${summary.previousTag}`
      : ""
    embed.description = [
      `From \`${shortSha(summary.commit.sha)}\` on main${since} · ${duration(summary.minutes)}`,
      summary.failedAt ? `Couldn't tag main: failed at ${summary.failedAt}` : "",
    ].filter(Boolean).join("\n")
    embed.fields = [
      ...summary.targets.map(target => ({
        name: `${marks[target.status]} ${targetNames[target.key]}`,
        value: describeTarget(target, summary),
      })),
      {name: "​", value: summary.releaseUrl ? `[Release notes](${summary.releaseUrl}) · ${runLink}` : runLink},
    ]
  } else if (summary.kind === "deploy") {
    embed.title = deployHeadings[failed ? "failure" : "success"]()
    const s3 = summary.targets.find(({key}) => key === "s3")
    embed.description = [
      summary.commit.title,
      `\`${shortSha(summary.commit.sha)}\` · ${summary.commit.author} · ${duration(summary.minutes)}`,
      s3 ? describeTarget(s3, summary) : "",
      runLink,
    ].filter(Boolean).join("\n")
  } else if (summary.kind === "build") {
    embed.title = buildHeadings[failed ? "failure" : "success"](summary.branch)
    embed.description = [summary.failedAt ? `Failed at: ${summary.failedAt}` : "Packages kept with the run, to try out", runLink].join("\n")
  } else {
    embed.title = "🌙 No release tonight"
    embed.description = `Nothing that goes into the app has changed${summary.previousTag ? ` since ${summary.previousTag}` : ""}.\n${runLink}`
  }

  const mention = failed && summary.kind !== "none" ? settings.mentionOnFailure : ""
  return {
    username: settings.username,
    avatar_url: settings.avatarUrl,
    content: mention || undefined,
    // Only what's in mentionOnFailure pings anyone, never a name in a commit message
    allowed_mentions: {parse: mention === "@here" ? ["everyone"] : [], users: idsOf(mention, "@"), roles: idsOf(mention, "@&")},
    embeds: [embed],
  }
}

const idsOf = (mention, prefix) =>
  [...mention.matchAll(new RegExp(`<${prefix}(\\d+)>`, "g"))].map(([, id]) => id)
