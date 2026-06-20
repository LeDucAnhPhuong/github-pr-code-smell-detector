# Data contract — what each view may show

Source of truth: `prisma/schema.prisma` + the `src/lib/db/*` query functions.
**Rule for Claude Design: do not render any field not listed here. No new
columns, metrics, filters, charts, or features.** Toolbars (search/sort/filter/
paginate) act on the already-fetched rows only.

---

## Dashboard — `getDashboardStats`, `getRecentAnalyses`, `getHighSeverityFindings`, `getRepositories`

**Metric cards (exactly these 4, no trend/delta — API returns plain numbers):**
- `repoCount` — Connected repositories
- `openPRCount` — Open pull requests
- `findingsThisWeek` — Findings this week
- `quotaPercent` (+ `analysisUsed` / `analysisQuota`) — Quota used

**Recent PR analyses table** (`getRecentAnalyses` → each row):
- `pullRequest.prNumber`, `pullRequest.title`
- `pullRequest.repository.fullName`
- `status` (PENDING | RUNNING | COMPLETED | FAILED)
- findings count = `findings.length`; high = findings where `severity === "error"`
- `createdAt` (rendered as "x ago")

**High severity findings list** (`getHighSeverityFindings`, severity=error, status=OPEN):
- `ruleName`, `prAnalysis.pullRequest.repository.fullName`

**Subscription usage:** `analysisUsed` / `analysisQuota`, `quotaPercent`.

---

## Repositories — `getRepositories`

Each repo row (real fields only):
- `fullName` (+ `isPrivate` → "Private" tag)
- `language` (nullable → "—")
- open PR count = `pullRequests.length`
- `defaultBranch`
- `updatedAt` ("x ago")
- Status: "Connected" (a repo in this list is connected — not a stored field)

**Toolbar (client-side over fetched rows):**
- Global search → matches `fullName`
- Faceted filter "Language" → distinct `language` values present
- Faceted filter "Visibility" → Public / Private (`isPrivate`)
- Sort: `fullName`, open PRs, `updatedAt`

---

## Findings — `getFindings(prAnalysisId)` (rule incl. category.name, framework.name)

Each finding row:
- `severity` (error|warning|info → High|Medium|Low)
- `ruleName` (and `ruleId` available)
- `rule.category.name`, `rule.framework.name`
- `filePath`, `lineStart` (and `lineEnd`, `columnStart` if needed)
- `message`, `suggestion`
- `status` (OPEN | REVIEWED | IGNORED)

**Toolbar — backed by `getFindings` filters (`severity`, `ruleId`, `filePath` contains):**
- Global search → `filePath` / `ruleName` (client-side over fetched rows)
- Facet "Severity" → High / Medium / Low
- Facet "Category" → distinct `rule.category.name`
- Facet "Status" → Open / Reviewed / Ignored
- Sort matches API order: severity, filePath, lineStart

Finding detail (`getFinding`): `ruleName`, `ruleId`, severity, `rule.description`,
`rule.whyItMatters`, `filePath`+`lineStart`, `message`, `suggestion`, and PR
context. The PR `githubUrl` exists → "View on GitHub" is real.

---

## Pull requests (per repo) — `PullRequest`

Real fields: `prNumber`, `title`, `state` (OPEN|MERGED|CLOSED), `author`,
`sourceBranch`, `targetBranch`, `commitSha`, `githubUrl`, `createdAt`, `updatedAt`,
+ related `analyses`. (No screen built yet; same rules apply if added.)

---

## Things that do NOT exist — never render

- Trend arrows / % change on metrics, sparklines, time-series charts.
- "Assignee", "labels", "reviewers", comment counts on findings/PRs.
- Severity colours anywhere except the SeverityBadge tokens.
- Any date/field not in the schema above.
