---
id: TASK-654
title: Add a live Markdown-only web viewer
status: In Progress
assignee:
  - '@alfred'
created_date: '2026-11-12T06:39:00Z'
updated_date: '2026-11-12T06:52:00Z'
labels: []
dependencies: []
references:
  - src/cli.ts
  - src/viewers/web/map-session.ts
  - src/viewers/web/server.ts
  - src/groma-filesystem.ts
modified_files:
  - .core-cycle/config.json
  - test-bun/web-startup.test.ts
  - src/groma-filesystem.ts
  - src/architecture-reader.ts
  - src/architecture-watch.ts
  - src/viewers/web/runtime.ts
  - src/viewers/web/map-session.ts
  - src/viewers/web/server.ts
  - src/viewers/web/payload.ts
  - src/viewers/web/page.ts
  - test-bun/markdown-viewer.test.ts
  - src/cli.ts
  - src/viewers/web/source/control.ts
  - src/viewers/web/render.ts
  - src/viewers/web/organisms/details.ts
  - src/viewers/web/organisms/code-lists.ts
  - src/viewers/web/revision/control.ts
  - README.md
  - docs/viewers/web/index.md
ordinal: 706000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A remote machine produces architecture Markdown with the existing scan --watch command. Users synchronize that bundle separately and need a client that only visualizes it. Initial scan and transport remain user responsibilities.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 groma --viewer <bundle> --port <port> opens the existing C4 web renderer from a valid direct bundle path without source or Git.
- [x] #2 Viewer performs no scanner, plugin setup, work-source, Git or source reads, including through API requests; normal modes remain unchanged.
- [x] #3 Viewer makes no bundle writes and offers no authoring, source or history actions.
- [x] #4 Markdown create/change/rename/delete updates the open map through the existing live delivery; invalid updates retain the last good map with status and recover on the next valid change.
- [x] #5 Startup and shutdown do not lose updates or leave watchers running; invalid initial bundles fail clearly without setup.
- [ ] #6 README and web guide explain producer/viewer usage and limitations; focused tests, browser verification and repository checks pass.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Acceptance criteria have objective verification evidence.
- [ ] #2 Relevant checks pass and changes remain task-scoped.
- [x] #3 Public contracts or documentation are updated when behavior changes.
- [x] #4 Implementation Plan reflects the final approach; correction history and verification are recorded in Implementation Notes.
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
L2 context brief: existing readOnly map skips scanner but retains repository endpoints; reuse live renderer/SSE, empty work source, and architecture parser. Add direct read-only filesystem input rather than a parallel parser. Keep OKF/C4 semantics unchanged. TDD: first add fixture-based startup/isolation test to existing Bun coverage (missing explicit viewer currently fails); then live update/lifecycle and UI capabilities coverage. Existing missing-plugin test covers only readOnly fallback, not isolation. Unit verify direct input does not create locks, integration verify hostile copied config cannot launch services, browser verify navigation and refresh. Finish full check, cold simplicity and full-context reviews required by repo, plus approved CoRe standard/adversary sequence until same-state approval. One final commit on feature branch; no intermediate commits.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
TDD evidence: direct bundle startup initially returned setup HTML instead of JSON; CLI initially unknown --viewer; read-only write initially resolved; startup event delivered during a 350ms initial-load pause was lost; source shared-link initialized a source file; invalid update lacked viewerError. All focused cases now green. 18 focused integration/regression tests pass across markdown-viewer, web-startup, web-export, web-revisions and editing. Typecheck passes. Real Chromium: C4 map and navigation visible; history/add absent, no source/code/plugin/history requests; project title updates without reload; invalid project retains last-good map and shows error; valid replacement clears error. Full check initial result: Node26/26, Bun916 pass64 skip32 fail; one feature read-only failure fixed, 22 JDK failures,6 SwiftParser failures,3 Node CA mode failures. Rerun with NODE_USE_SYSTEM_CA=0 underway. No trust validation disabled. Cold simplicity review underway; CoRe standard/adversarial and repository full-context review pending.

Cold simplicity review: pass after strengthening source-control test with a real component/code references and explicit zero-request counters; renamed initializingMap/watchMapChanges for ownership clarity. Browser additionally verified create, rename+title change and removal of an independent actor reflected live without reload. Full check rerun with NODE_USE_SYSTEM_CA=0: 922 Bun passed,64 skipped,28 failed; remaining failures match unavailable Java/Swift toolchains. No architecture files changed. Standard CoRe review round1 pending.

CoRe standard round1 R1-1 fixed: strengthened test CodeReference now includes required scanner field.

Self specification/quality review: CLI->server setup bypass->existing map session->direct bundle parser/annotation/layout->watcher/SSE->existing renderer traced. Source, Git, scanner and work services bypassed; mutation methods reject; UI source references remain non-clickable; invalid reload retains last-good; startup race regression covered. Browser create/change/rename/delete and recovery verified. Code/typecheck/focused coverage pass; full-suite completion remains blocked on missing Java/Swift toolchains (AC6 not complete). Adversarial CoRe round2 approved same code after independently running12focused tests; standard round3 targeted R1-1 verification pending. No speculative follow-ups added.

CoRe complete: adversary round2 and standard round3 both approve the identical code state; standard independently reran typecheck and source isolation test. No changes between approvals. Final context-aware complexity review pending; original transcript exceeded fork limit so reviewer received all user decisions and relevant implementation/review context explicitly.

Final context-aware complexity review approved with no findings, using supplied relevant decisions because full transcript fork exceeded runtime limit. Implementation and same-state CoRe reviews complete. AC6 and full DoD remain open: full repository check cannot pass locally without Java JDK and SwiftParser toolchain; 28 unrelated scanner/toolchain failures. No failing feature tests remain. Deliver reviewed feature branch while leaving task In Progress for full-suite validation.
<!-- SECTION:NOTES:END -->
