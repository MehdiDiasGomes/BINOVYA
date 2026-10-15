---
description: Runs the full BINOVYA feature pipeline - implementation by the main session, then styling, security and accessibility audits, final review and docs, through the project subagents.
argument-hint: <feature description or TODO step number>
---

You are the orchestrator. Deliver this feature through the pipeline below:

**Feature:** $ARGUMENTS

Talk to the user in French. You implement the code yourself; subagents style, audit, review and
document. Never let two agents that write files run at the same time.

## 0. Skip check

If the change is under ~30 lines, adds no component, and touches neither `server/` nor
`supabase/` (i18n text, rename, one Tailwind class, doc typo): do it directly, run the checks of
step 3, and stop. Any change to `server/` or `supabase/`, even one line, goes at least through
step 5 with `security-auditor`.

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

## 3. Implementation (you)

1. Write the code following `CLAUDE.md`: logic, templates, i18n keys in FR and EN, server
   routes, Zod schemas shared between `app/utils/*Validation.ts` and `server/utils/*Schemas.ts`.
2. Build the change set: `git diff --name-only dev` plus `git ls-files --others
--exclude-standard`. This list is passed to every agent.
3. Run `bun run lint`, `bunx nuxi typecheck` and `bunx prettier --check <change set>`. Fix every
   error in the change set. Keep the outputs: read-only agents cannot run commands.

## 4. Styling and motion (only if templates changed)

Launch `ui-stylist` alone with: the feature description, the `.vue` files of the change set, the
pages to take as reference, and which elements appear, disappear or change state (conditional
blocks, success screens, steps) so it can animate them. Re-run lint, typecheck and prettier on the
files it touched, including `app/constants/motion.ts` if it added a preset. Keep its "À vérifier
dans le navigateur" list for the handover: animations are only validated by the user in a browser.

## 5. Audits (in parallel, read-only)

In a single message, launch the agents that apply:

- `security-auditor` if the change set touches `server/`, `supabase/`, auth, payments or any
  user input handling
- `a11y-auditor` if the change set touches `.vue` files or `i18n/`

Give each: the feature description, the change set, the spec sections, and for the auditor the
files relevant to its area first.

## 6. Fixes (you)

- Fix every critical, high and medium finding. List low findings for the user without fixing
  them unless trivial.
- Purely visual findings (contrast, focus ring) flagged for `ui-stylist`: relaunch it with those
  findings only.
- Each agent's "Hors périmètre" items: handle them yourself if they are code, or keep them for
  the final summary.
- Re-run the checks of step 3.

## 7. Final review (loop, max 2 re-runs)

1. Launch `code-reviewer` with: the feature description, the change set, the check outputs, all
   previous reports, and the list of what you fixed. Tell it which pass this is.
2. If the verdict is ⛔ or ⚠️: fix, re-run the checks, relaunch the review (pass 2, then pass 3).
3. After pass 3, if findings remain, stop the loop and present them to the user with your
   recommendation. Do not loop further.

## 8. Docs

Launch `docs-writer` with: the feature description, the change set, the final review report
(its "Pour docs-writer" section), and any manual step left for the user (env var, migration).

## 9. Handover

Do not commit. Give the user a table with one row per item marked ✅ or ❌:

| Étape | Agent | Résultat |
| ----- | ----- | -------- |

followed by: findings left open with their severity, manual actions for the user, a numbered
browser test list (pages, actions, expected result, including the animations from ui-stylist and
a pass with the system "reduce motion" setting on), and the suggested gitmoji commit message(s).
The user commits with `/ship`.
