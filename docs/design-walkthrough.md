# Design walkthrough

## 1. React UI

The UI lives in [web/src](../web/src) and is built with React 19, Bear UI components and Aerocraft `bear-*` classes. Vite renders it into `index.html`.
It talks to the backend only through `/api/*`. In development, Vite forwards these requests to the scan service on `localhost:4000` (../web/vite.config.ts). The UI never talks to the AI service.
Starting a scan sends `POST /api/scans` (../web/src/queries/useStartScan.ts → [scans.api.ts](../web/src/api/scans.api.ts)). The scan page then loads `GET /api/scans/:id` and listens to `/api/scans/:id/events` (SSE) for live progress (../web/src/queries/useScan.ts).
TanStack Query handles all of these calls, and the SSE events update its cache directly.

## 2. Backend: from the request to the cloned repo

[scans.routes.ts](../server/src/scan-service/routes/scans.routes.ts) checks the URL, and `ScanService.create()` in [scanService.ts](../server/src/common/scans/scanService.ts) saves a `queued` scan to MongoDB ([mongoScanStore.ts](../server/src/common/store/mongoScanStore.ts)). The route replies `202` right away with that scan.
In the background, `ScanRunner.start()` in [scanRunner.ts](../server/src/scan-service/pipeline/scanRunner.ts) runs the stages from [stages.ts](../server/src/scan-service/pipeline/stages.ts) in order (clone, code scan, dependency scan, analyze), and every stage update is pushed live to the UI (../server/src/scan-service/routes/scanEvents.ts).
Clone stage: [githubApi.ts](../server/src/scan-service/github/githubApi.ts) reads the repo size and default branch, and repos over the size limit are rejected.
Then [cloneRepo.ts](../server/src/scan-service/repo/cloneRepo.ts) runs `git clone --depth 1` into `server/data/repos/<scanId>/`, a folder the AI service can also read. The AI service deletes it when it finishes; the scan service deletes it if the scan fails earlier.

## 3. Backend: scan the code and the dependencies

Code scan: [semgrep.ts](../server/src/scan-service/scanners/semgrep/semgrep.ts) runs `semgrep --json` with `p/default` (security rules for all main languages), `p/secrets` (hard-coded keys) and a deeper security pack per language: JavaScript, TypeScript, Node.js, Express, Python, Java, Go, C#, PHP and Ruby. Semgrep only runs the rules that match each file's language. It returns the raw matches (file, line, rule, severity).
Dependency scan: [discoverDependencyFiles.ts](../server/src/scan-service/repo/discoverDependencyFiles.ts) finds the scanned repo's dependency files (`package-lock.json`, `go.mod`, `requirements.txt`, …) in the cloned folder.
[osv.ts](../server/src/scan-service/scanners/osv/osv.ts) runs `osv-scanner scan source` on those files and returns the vulnerable packages with their advisories.
Direct or indirect: [loadGraph.ts](../server/src/scan-service/deps/loadGraph.ts) picks a builder by file name. For npm, `buildNpmGraph` in [lockfileGraph.ts](../server/src/scan-service/deps/lockfileGraph.ts) builds the full parent graph from the lockfile, so each package gets its path (for example `express → body-parser → qs`).
For Go, Ruby, PHP, Java and Python, [manifestParsers.ts](../server/src/scan-service/deps/manifestParsers.ts) reads the packages the project declares, for example the lines without `// indirect` in `go.mod`. Packages on that list are direct and the rest are indirect. Other formats are marked unknown.
If one scanner fails, its error is recorded and the scan continues with the other one.

## 4. Backend: analyze the findings

[analyze.ts](../server/src/common/analysis/analyze.ts) turns the raw scanner output into a short list of findings. It needs no AI and gives the same result every time.
Semgrep matches are grouped by weakness (CWE), so several rules on the same line become one finding (../server/src/common/analysis/codeFindings.ts). OSV advisories are grouped into one finding per package version (../server/src/common/analysis/dependencyFindings.ts).
Each finding gets a severity, a risk score from 0 to 100, a priority and fix advice (../server/src/common/analysis/scoring.ts, [cvss.ts](../server/src/common/analysis/cvss.ts)). The whole scan gets a grade, a headline and a ranked list of next actions (../server/src/common/analysis/nextActions.ts). All scores and thresholds are in [analysis.consts.ts](../server/src/common/analysis/analysis.consts.ts).

**Fields copied from the scanners:** `description`, `locations` (file, line, snippet; secrets masked), `cwe`, `owasp`, `ruleIds`, `references`, the rule's `confidence`, and for dependencies the package name, version, advisories, CVSS vector and fixed versions.

**Fields calculated by the backend:**

| Field | How it is calculated |
|---|---|
| `id` | SHA-1 hash of the group key |
| `type` | Secret rule → secret, else code/dependency |
| `title` | Vulnerability class, rule message, or advisory |
| `riskScore` | Base per scanner severity (Semgrep level raised/lowered by impact, or CVSS×10 for packages) + factors |
| `severity` | From the final risk score, CVSS bands ×10: 90+ critical, 70–89 high, 40–69 medium, 20–39 low |
| `severityReason` | Text built from CVSS or rule levels, plus a note when the score moved the severity |
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

## 5. AI service: the agent re-checks each finding

This step runs in its own process, the AI service ([ai-service/index.ts](../server/src/ai-service/index.ts), port 4001). `InvestigationRunner` in [investigationRunner.ts](../server/src/ai-service/service/investigationRunner.ts) reads the analyzed findings from MongoDB and the clone from `server/data/repos/<scanId>/`, runs the agent, saves the final result and deletes the clone.

Connection: [llmClient.ts](../server/src/ai-service/llm/llmClient.ts) creates an OpenAI SDK client that points at GroqCloud (`baseURL` and key from `.env`, presets in [llm.consts.ts](../server/src/ai-service/llm/llm.consts.ts)), model `openai/gpt-oss-120b`.

Prompt: the persona and the rules are `INVESTIGATOR_PROMPT` in [investigation.consts.ts](../server/src/ai-service/investigation/investigation.consts.ts). The tool definitions are in [agentTools.consts.ts](../server/src/ai-service/investigation/agentTools.consts.ts). [compactFinding.ts](../server/src/ai-service/investigation/compactFinding.ts) trims each finding to the fields the model needs.

Send: [investigator.ts](../server/src/ai-service/investigation/investigator.ts) runs [investigateFinding.ts](../server/src/ai-service/investigation/investigateFinding.ts) for every finding (up to 6 at a time). Each turn, [chatAgentStep.ts](../server/src/ai-service/investigation/chatAgentStep.ts) 

**sends the system prompt, the finding and the tools `search_code`, `read_file` and `list_files`, which run locally on the cloned repo (../server/src/ai-service/investigation/repoTools.ts, up to 8 turns).

**Receive: a final JSON answer checked against [investigation.schema.ts](../server/src/ai-service/investigation/investigation.schema.ts) (../server/src/ai-service/llm/structuredCompletion.ts): reachability, data flow (each step with a real example value, shown in the UI as one attack path from the attacker to the sink), a new rating (severity, risk score, reason), false positive, confidence, verdict, attack scenario, evidence and an optional code fix.

**Use: [applyInvestigation.ts](../server/src/ai-service/investigation/applyInvestigation.ts) first verifies the evidence against the real repo (files, lines, searches). Only verified answers can change the severity or mark a false positive, and every change needs a reason: a new risk score is rejected unless the agent says why it moved (`riskScoreReason`, shown in the UI as "Risk score 94 → 80: …"). The scan summary is then recalculated with `summarizeFindings` in [analyze.ts](../server/src/common/analysis/analyze.ts).

## 6. Two services: how they connect and why

**Folders.** The code is split the same way: `server/src/scan-service/`, `server/src/ai-service/`, and `server/src/common/` for what both use (database, store, scan state, analysis, config). `common/` never imports from a service, and the services never import from each other, so either one could later move to its own package or repo.

**How.** After analysis, the scan service saves the result to MongoDB and calls `POST localhost:4001/investigations` with `{ scanId }` ([aiServiceClient.ts](../server/src/scan-service/pipeline/aiServiceClient.ts)). The AI service answers `202` with no body right away ([aiApp.ts](../server/src/ai-service/service/aiApp.ts)) and works in the background. Each time it saves a change, it calls `POST localhost:4000/internal/scans/:id/changed` with no body ([scanChangeNotifier.ts](../server/src/ai-service/service/scanChangeNotifier.ts)); the scan service reads the scan from MongoDB, pushes it to the UI over SSE and answers `204` ([internal.routes.ts](../server/src/scan-service/routes/internal.routes.ts)). While the scan runs it reads only the scan document's status and stages, so each progress event is about 1 KB (status and stages, e.g. "AI checked 3 of 7"); the result and findings are read and sent once, when the status is `completed` ([scanService.ts](../server/src/common/scans/scanService.ts) `refresh`, [scanEvents.ts](../server/src/scan-service/routes/scanEvents.ts)). The UI still talks only to port 4000: one public API and one ordered stream, while the AI service stays on localhost.

**Shared.** Both services connect to the same MongoDB server (`MONGODB_URL`, default `127.0.0.1:27017/ai_scan_review`) and read the same `server/data/repos/` folder. Only IDs travel over HTTP; the data is read from MongoDB and disk.

**Why we moved.** The AI step is the slow, rate-limited part (minutes per scan, LLM limits), while clone, scan and analyze are fast and CPU-bound. As separate services they can be restarted, scaled and limited on their own, and if the AI service is down, scans still finish with the scanner ratings and the message "AI service unavailable".

**Next step for production.** With pods on different machines: re-clone the same commit SHA (or S3) instead of the shared folder, and a job queue (BullMQ or RabbitMQ) instead of direct HTTP, for retries when a service crashes. MongoDB change streams could replace the "changed" HTTP call.

## 7. Database: MongoDB

**Collections.** `scans` (one document per scan: status and stages, updated after every step, plus a `result` object with the grade, summary and next actions, missing until the analysis finishes) and `findings` (one document per finding, with its `scanId`, a result `version` and its `position`). Progress reads and writes only the status and stages. Both services create the indexes at startup; creating an existing index does nothing, so they never race ([database.consts.ts](../server/src/common/db/database.consts.ts), [database.ts](../server/src/common/db/database.ts)).

**Code.** All database code is in [mongoScanStore.ts](../server/src/common/store/mongoScanStore.ts), behind the `ScanStore` interface. `save` writes the new findings under a fresh version, then switches the scan to that version in one update, then deletes the old versions, so a reader sees either the old result or the new one, never a mix, without needing a transaction. The store is async, so `ScanService` runs the changes to one scan one after another: a progress update can never overwrite a newer change. Progress updates use `getState` and `saveState`, which touch only the scan's own fields; the result and findings are written only when a new result arrives (handoff and completion), and are read and sent to the UI only once the scan has finished.

**Why MongoDB.** SQLite is a file, so both services had to run on the same machine; a database server on its own port (27017) lets the scan service, the AI service and the database each run on a different machine. Findings are flexible documents, so new fields (like the AI investigation) need no schema change, and one finding per document keeps cross-repo questions a single indexed query, e.g. `db.findings.distinct("scanId", { "dependency.advisories.cveIds": "CVE-2021-23337" })`.

**Tests.** They start a real MongoDB in memory once per run (mongodb-memory-server), and each test gets its own fresh database, so `npm test` needs no database server ([mongoGlobalSetup.ts](../server/test/support/mongoGlobalSetup.ts), [testDatabase.ts](../server/test/support/testDatabase.ts)).
