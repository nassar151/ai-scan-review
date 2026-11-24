# Design walkthrough

## 1. React UI


The UI runs in the browser. It's written in React (TypeScript). Vite turns it into JavaScript plus one index.html, and React builds the page's HTML in the browser.

Vite is the UI's build tool and development server. It does three things:
Runs the UI during development on localhost:5173, and updates the page instantly when you save a file.
Converts TypeScript and React (.ts/.tsx) into plain JavaScript the browser can run.
Forwards /api calls to the backend on localhost:4000 (the proxy).

Calls to /api/...: in development, Vite's proxy forwards them to the Express server on localhost:4000. The browser makes the call; Vite only passes it on.

Yes, that's the order:
POST /api/scans with { repoUrl }. The server creates the scan, replies 202 with the scan ID, and starts the pipeline in the background.
GET /api/scans/:id loads the scan's current state once, when the scan page opens.
/api/scans/:id/events (SSE): the page listens for live updates until the scan is completed or failed, then closes the connection.

SSE (Server-Sent Events) is a single HTTP connection that stays open, so the server can keep pushing messages to the browser. Data goes only from the server to the browser.
In this project:
UI: useScan.ts opens new EventSource('/api/scans/:id/events').
Server: scanEvents.ts keeps the response open. On every scan change it writes a message like data: {scan…}.
UI: each message writes the updated scan into the TanStack Query cache, so the page re-renders.
When it closes: the UI closes the connection once the scan is completed or failed. If the connection drops, the UI falls back to polling every 4 seconds.


** after servise start stages after each step its send sse with staus + rsult , last event is completed, final result 
===================================================================================================

## 2. Backend: from the request to the cloned repo

[scans.routes.ts](../server/src/scan-service/routes/scans.routes.ts) checks the URL, and `ScanService.create()` in [scanService.ts](../server/src/common/scans/scanService.ts) saves a `queued` scan to Postgres (../server/src/common/store/postgresScanStore.ts). The route replies `202` right away.
In the background, `ScanRunner.start()` in [scanRunner.ts](../server/src/scan-service/pipeline/scanRunner.ts) runs the stages from [stages.ts](../server/src/scan-service/pipeline/stages.ts) in order, and every stage update is pushed live to the UI (../server/src/scan-service/routes/scanEvents.ts).
Clone stage: [githubApi.ts](../server/src/scan-service/github/githubApi.ts) reads the repo size and default branch, and repos over the size limit are rejected.
Then [cloneRepo.ts](../server/src/scan-service/repo/cloneRepo.ts) runs `git clone --depth 1` into a temp folder. That folder is deleted when the scan ends.

** So the API is used to check the repo, and git is used to download the code.
**folder saved on temp file on disk and then deletd 
**scanEvents update ui by sse after wach stage
## 3. Backend: scan the code and the dependencies

Code scan: [semgrep.ts](../server/src/scan-service/scanners/semgrep/semgrep.ts) runs `semgrep --json` with `p/default` (security rules for all main languages), `p/secrets` (hard-coded keys) and a deeper security pack per language: JavaScript, TypeScript, Node.js, Express, Python, Java, Go, C#, PHP and Ruby. Semgrep only runs the rules that match each file's language. It returns the raw matches (file, line, rule, severity).


Dependency scan: [discoverDependencyFiles.ts](../server/src/scan-service/repo/discoverDependencyFiles.ts) finds the scanned repo's dependency files (`package-lock.json`, `go.mod`, `requirements.txt`, …) in the cloned folder.
[osv.ts](../server/src/scan-service/scanners/osv/osv.ts) runs `osv-scanner scan source` on those files and returns the vulnerable packages with their advisories.
Direct or indirect: [loadGraph.ts](../server/src/scan-service/deps/loadGraph.ts) picks a builder by file name. For npm, `buildNpmGraph` in [lockfileGraph.ts](../server/src/scan-service/deps/lockfileGraph.ts) builds the full parent graph from the lockfile, so each package gets its path (for example `express → body-parser → qs`).
For Go, Ruby, PHP, Java and Python, [manifestParsers.ts](../server/src/scan-service/deps/manifestParsers.ts) reads the packages the project declares, for example the lines without `// indirect` in `go.mod`. Packages on that list are direct and the rest are indirect. Other formats are marked unknown.
If one scanner fails, its error is recorded and the scan continues with the other one.


** command-line program installed on the machine and the server runs it as a child process, the same as typing the command in a terminal.
** Response: the tool prints JSON to stdout, which runCommand collects as text. JSON.parse(result.stdout) turns it into an object typed by semgrep.types.ts or osv.types.ts.
** Map: the code converts that JSON into our own Finding shape for the analysis stage.


===================================================================================================
## 4. Backend: analyze the findings

[analyze.ts](../server/src/common/analysis/analyze.ts) turns the raw scanner output into a short list of findings. It needs no AI and gives the same result every time.

Semgrep matches are grouped by weakness (CWE), so several rules on the same line become one finding (../server/src/common/analysis/codeFindings.ts).
OSV advisories are grouped into one finding per package version (../server/src/common/analysis/dependencyFindings.ts).

Each finding gets a severity, a risk score from 0 to 100, a priority and fix advice (../server/src/common/analysis/scoring.ts, [cvss.ts](../server/src/common/analysis/cvss.ts)). The whole scan gets a grade, a headline and a ranked list of next actions (../server/src/common/analysis/nextActions.ts). All scores and thresholds are in [analysis.consts.ts](../server/src/common/analysis/analysis.consts.ts).

**Fields copied from the scanners:** `description`, `locations` (file, line, snippet; secrets masked), `cwe`, `owasp`, `ruleIds`, `references`, the rule's `confidence`, 
and for dependencies the package name, version, advisories, CVSS vector and fixed versions.

**Fields calculated by the backend:**

| Field | How it is calculated |
|---|---|
| `id` | SHA-1 hash of the group key |
| `type` | Secret rule → secret, else code/dependency |
| `title` | Vulnerability class, rule message, or advisory |
| `severity` (code) | Semgrep level, raised/lowered by impact |
| `severity` (dependency) | CVSS 3 score, else database rating |
| `severityReason` | Text built from CVSS or rule levels |
| `riskScore` | Base per severity (or CVSS×10) + factors |
| `riskFactors` (code) | Test/docs only −30, high likelihood +5, low likelihood −5, high-confidence rule +5, low-confidence rule −10, in 5+ places +5, live credential +5 |
| `riskFactors` (dependency) | Dev only −35, direct +5, indirect −5, remote without login +5, 3+ advisories +5 |
| `priority` | Score ≥70 fix now, ≥45 fix soon, else monitor |
| `occurrences` | Count of unique file:line locations; 5+ adds a +5 risk factor (code only) |
| `effort` | Location count, or upgrade type for deps |
| `fixAvailable` | Every advisory has a fixed version |
| `fixedVersion` / `upgradeType` | Highest fixed version; major, minor or patch |
| `recommendedAction` / `fixSteps` | CWE remediation table, or upgrade/pin steps per ecosystem |
| `whyItMatters` | Rule message, or production/dev exposure sentence |
| Scan `grade` | F critical fix-now … A only monitor |
| Scan `riskScore` | Highest finding risk score |
| Scan `nextActions` | Same fixes merged, ranked by priority |

## 5. Backend: AI agent re-checks each finding

Connection: [llmClient.ts](../server/src/ai-service/llm/llmClient.ts) creates an OpenAI SDK client that points at GroqCloud (`baseURL` and key from `.env`, presets in [llm.consts.ts](../server/src/ai-service/llm/llm.consts.ts)), model `openai/gpt-oss-120b`.

Prompt: the persona and the rules are `INVESTIGATOR_PROMPT` in [investigation.consts.ts](../server/src/ai-service/investigation/investigation.consts.ts). The tool definitions are in [agentTools.consts.ts](../server/src/ai-service/investigation/agentTools.consts.ts). [compactFinding.ts](../server/src/ai-service/investigation/compactFinding.ts) trims each finding to the fields the model needs.

Send: [investigator.ts](../server/src/ai-service/investigation/investigator.ts) runs [investigateFinding.ts](../server/src/ai-service/investigation/investigateFinding.ts) for every finding (up to 6 at a time). Each turn, [chatAgentStep.ts](../server/src/ai-service/investigation/chatAgentStep.ts) 

**sends the system prompt, the finding and the tools `search_code`, `read_file` and `list_files`, which run locally on the cloned repo (../server/src/ai-service/investigation/repoTools.ts, up to 8 turns).

**Receive: a final JSON answer checked against [investigation.schema.ts](../server/src/ai-service/investigation/investigation.schema.ts) (../server/src/ai-service/llm/structuredCompletion.ts): reachability, data flow (each step with a real example value, shown in the UI as one attack path from the attacker to the sink), a new rating (severity, risk score, reason), false positive, confidence, verdict, attack scenario, evidence and an optional code fix.

**Use: [applyInvestigation.ts](../server/src/ai-service/investigation/applyInvestigation.ts) first verifies the evidence against the real repo (files, lines, searches). Only verified answers can change the severity or mark a false positive. The scan summary is then recalculated with `summarizeFindings` in [analyze.ts](../server/src/common/analysis/analyze.ts).



## 6. database sqlite

**Update: we moved to Postgres.** SQLite is a file, so both services had to run on the same machine. Postgres is its own server on port 5432 (`DATABASE_URL`), so the scan service, the AI service and the database can each run on a different machine, and two writers are handled properly. Same 3 tables; the nested parts are `JSONB` columns. All SQL is in `postgresScanStore.ts` behind the `ScanStore` interface. Tests run on PGlite (Postgres inside Node), so they need no server. See section 7 of [design-walkthrough.md](design-walkthrough.md).

My notes from before the move:

we can use postgress that have column with json type 
but its need service sqlite its file on the disk of the service 

"The data is relational: each scan has one result and many findings, all linked by scanId, and the UI just reads them by that ID. The structure is stable, so I don't need NoSQL's flexible schema, and the write load is small. The results are written once when the scan finishes, so I don't need NoSQL's write scaling either."

One precision in case he asks: during the scan, the scans row is updated a few times for status and stage progress. The result and the findings are written only once, at the end.

we have 3 tables 
scan 
resul 
findings 

 On top of that it has real transactions, so a crash can't corrupt a scan, and it updates single rows instead of rewriting a whole JSON file