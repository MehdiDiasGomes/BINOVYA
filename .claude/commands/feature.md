---
description: Runs the full BINOVYA feature pipeline - implementation, styling, security and accessibility audits, final review and docs, all done by the project subagents while the main session orchestrates.
argument-hint: <feature description or TODO step number>
---

You are the orchestrator. Deliver this feature through the pipeline below:

**Feature:** $ARGUMENTS

Talk to the user in French. You only orchestrate: you never write or edit code, migrations, docs
or styles yourself. Subagents implement, style, audit, review and document; you brief them, pass
reports between them, run the read-only checks and talk to the user. Never let two agents that
write the same files run at the same time.

How to brief agents:

- **Review every code pass.** After each `implementer` or `ui-stylist` pass, launch a fresh
  `code-reviewer` on that pass's delta (files, intent, check outputs) before the next step, and
  send its findings to a fresh `implementer` (or `ui-stylist` for visual ones). Same cap as step 8:
  at most two re-runs per pass, then the open findings go to the user.

- **Launch fresh, never resume.** Every agent is a new one with a complete, self-contained brief
  (feature, decisions, files to read, previous findings quoted verbatim, check outputs): it starts
  with an empty context. Never resume an agent with `SendMessage`: resumed agents accumulate very
  long contexts.
- **Relay findings verbatim.** Paste each finding as the auditor wrote it (severity, file:line,
  problem, proposed fix), then add your decision. Never paraphrase a finding.
- **Formatting is automatic.** A project `PostToolUse` hook runs prettier on every file an agent
  writes, so nobody needs a pass just to format.

## 0. Skip check

If the change is under ~30 lines, adds no component, and touches neither `server/` nor
`supabase/` (i18n text, rename, one Tailwind class, doc typo): launch only `implementer` (or
`docs-writer` for a doc typo), and stop. Any change to `server/` or `supabase/`, even one line,
goes at least through `security-auditor` (step 4).

## 1. Framing

1. Read `docs/TODO.md`, find the matching step, and read the relevant sections of
   `docs/specs/booking-system.md` and `docs/specs/technical.md`.
2. Branch: one branch per TODO step, created from `dev`. If the previous step's branch is not
   merged into `dev`, stop and ask the user before branching. Never stack branches.
3. Tell the user in a few lines what you will build and which agents will run. Ask only if a
   business decision is missing from the specs.

## 2. Database (only if the schema changes)

1. Launch `db-migrator` with: the feature description, the TODO step, the spec sections, and
   what the code will need (tables, columns, policies, functions).
2. Show the user the migration file and ask them to apply it in the Supabase SQL Editor (copy it
   with `pbcopy < <file>`). Wait for their confirmation.
3. Verify it is applied with the check given in the agent's report before writing code that
   depends on it. Never claim it is applied without that check.

## 3. Implementation (`implementer`)

1. Launch `implementer` with: the feature description, the TODO step, the spec sections, the
   decisions taken with the user, the files to take as reference, and the db-migrator report if
   any (tables, columns, functions the code can rely on).
2. Read its report. If the verdict is ⚠️ or ⛔, relaunch it with what is missing, or ask the user
   if a business decision blocks it.
3. Build the change set: `git diff --name-only dev` plus `git ls-files --others
--exclude-standard`. This list is passed to every agent.
4. Keep the lint, typecheck and prettier outputs from its report: read-only agents cannot run
   commands. Re-run them yourself if you doubt the report.

## 4. Styling and security audit (in parallel)

In a single message, launch:

- `ui-stylist` (only if templates changed) with: the feature description, the `.vue` files of the
  change set, the pages to take as reference, and which elements appear, disappear or change
  state (conditional blocks, success screens, steps) so it can animate them.
- `security-auditor` (if the change set touches `server/`, `supabase/`, auth, payments or any
  user input handling) with: the feature description, the change set, the spec sections and the
  server files first. It only reads `server/` and `supabase/`, which `ui-stylist` never edits, so
  both can run at the same time.

When `ui-stylist` is done, re-run lint and typecheck on the files it touched, including
`app/constants/motion.ts` if it added a preset; errors go back to `implementer` (logic) or
`ui-stylist` (markup, classes). Keep its "À vérifier dans le navigateur" list for the handover:
animations are only validated by the user in a browser.

## 5. Accessibility and SEO audits (read-only, after styling, in parallel)

In a single message, once `ui-stylist` has finished, since both audit the final markup:

- `a11y-auditor` if the change set touches `.vue` files or `i18n/`. Give it: the feature
  description, the change set, the spec sections, and the `.vue` and `i18n/` files first.
- `seo-auditor` if the change set touches a public page (`app/pages/` outside `account/**`,
  `pro/**` and `login.vue`), a layout, `app.vue`, the meta texts in `i18n/`, `nuxt.config.ts` or
  `public/robots.txt`, or adds a page (public or private: a new private page must be `noindex`).
  Give it: the feature description, the change set and the pages concerned first.

## 6. Fixes (delegated)

- Launch a new `implementer` with every critical, high and medium finding of every audit in one
  message, quoted verbatim. List low findings for the user without fixing them unless trivial
  (those go to `implementer` too).
- Purely visual findings (contrast, focus ring) flagged for `ui-stylist`: relaunch it with those
  findings only, after `implementer` has finished.
- Each agent's "Hors périmètre" items: send code to `implementer`, schema to `db-migrator`, or
  keep them for the final summary.
- Get the checks of step 3 from the fixing agent's report.

## 7. Tests (`tester`)

1. Launch `tester` with: the feature description, the TODO step, the spec sections, the change
   set, and for each level what to prove:
   - unit: the new or changed pure functions and schemas (rules, edge values)
   - integration: the new or changed server routes and webhooks (status codes, `data.code`,
     database effects, signed Stripe events)
   - end-to-end: the critical visitor journeys only (pages, actions, expected messages and
     database states, including error and cancel paths)

   plus the decisions taken with the user and the "À vérifier dans le navigateur" lists of
   `implementer` and `ui-stylist`.

2. ⛔ (environment: secret mismatch, server to restart, live key): relay the manual action to the
   user, wait for confirmation, then launch a new `tester`.
3. ⚠️: launch a new `implementer` (or `ui-stylist` for visual items) with the failures quoted
   verbatim, then a new `tester` to re-run. Max 2 re-runs, then the failures go to the user.

## 8. Final review (loop, max 2 re-runs)

1. Launch `code-reviewer` with: the feature description, the change set, the check outputs, all
   previous reports including the e2e report, and the list of what you fixed. Tell it which pass
   this is.
2. If the verdict is ⛔ or ⚠️: launch a new `implementer` with the findings quoted verbatim, then a
   new `code-reviewer` with the previous review, the fixes and the pass number (pass 2, then 3).
3. After pass 3, if findings remain, stop the loop and present them to the user with your
   recommendation. Do not loop further.

## 9. Docs

Launch `docs-writer` with: the feature description, the change set, the final review report
(its "Pour docs-writer" section), and any manual step left for the user (env var, migration).

## 10. Handover

Do not commit. Give the user a table with one row per item marked ✅ or ❌:

| Étape | Agent | Résultat |
| ----- | ----- | -------- |

followed by: findings left open with their severity, manual actions for the user, the e2e result
table, a short numbered list of what `tester` could not prove automatically (animations from
ui-stylist, a pass with the system "reduce motion" setting on, screen reader), and the suggested
gitmoji commit message(s).
The user commits with `/ship`.
