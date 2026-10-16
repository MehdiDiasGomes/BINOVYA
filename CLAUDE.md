# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Nuxt 4 application using Tailwind CSS v4 with the shadcn-nuxt component library. The project follows a clean code architecture with strict linting and formatting rules.

## Development Commands

```bash
# Install dependencies (uses bun by default based on bun.lock)
bun install

# Development server (runs on http://localhost:3000)
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Linting
bun run lint              # Check for errors
bun run lint:fix          # Auto-fix errors

# Formatting
bun run format            # Format all files
bun run format:check      # Check formatting without changes

# Tests (integration and e2e start their own test server on port 3001 and their own
# `stripe listen`; `bun run dev` may keep running, any other `stripe listen` must be stopped)
bun run test:unit         # Vitest, pure logic, no server
bun run test:integration  # Vitest, server routes, signed Stripe webhooks, one test per mail template
bun run test:e2e          # Playwright, real Chromium and Stripe Checkout in test mode
bun run test              # All three, in that order
```

## Project Structure

```
app/
├── app.vue                    # Main application entry point
├── assets/css/tailwind.css   # Tailwind v4 CSS with custom theme
├── lib/utils.ts              # Utility functions (cn helper for class merging)
├── components/ui/            # shadcn-nuxt UI components (ignored by ESLint)
├── utils/                    # Shared utility functions (create once, reuse everywhere)
└── types/                    # Complex reusable TypeScript types and interfaces
```

## Code Style & Standards

### ESLint Configuration

The project enforces strict code quality standards through ESLint with multiple plugins:

#### Function Style

- **ALWAYS use arrow functions**: `func-style: 'expression'` and `prefer-arrow-callback: 'error'` are enforced
- Use `arrow-body-style: 'as-needed'` (implicit returns when possible)

#### Vue Component Rules

- **Script blocks must use TypeScript**: `vue/block-lang` enforces `lang="ts"`
- **Block order**: `<template>` → `<script>` → `<style>`
- **Component naming**: PascalCase in templates (`vue/component-name-in-template-casing`)
- **Event naming**: camelCase (`vue/custom-event-name-casing`)
- **Macro order**: `defineProps` before `defineEmits`
- Props require default values and explicit types
- Max 3 attributes per line for single-line elements, 1 for multiline

#### TypeScript Standards

- **No `any` types**: `@typescript-eslint/no-explicit-any: 'error'`
- **Naming conventions**:
  - Variables: camelCase, UPPER_CASE, or PascalCase
  - Functions: camelCase or PascalCase
  - Types/Interfaces: PascalCase
  - **NO "I" prefix for interfaces** (enforced via custom regex)
- Unused vars must start with `_`
- **Strict typing required**: Type everything explicitly (refs, consts, params, functions)
- **Type organization**: Complex reusable types must be defined in `/app/types`

#### Documentation & Comments

- **No inline comments**: Code should be self-explanatory
- **TSDoc for complex functions only**: Use concise and clear English documentation
- **Example**:

```typescript
/**
 * Validates user authentication token and refreshes if expired.
 * @param token - JWT authentication token
 * @returns Validated or refreshed token
 */
const validateToken = (token: string): Promise<string> => {
  // Implementation
}
```

#### Code Quality Limits

- Max 350 lines per file (excluding blanks/comments)
- Max 3 function parameters
- Max nesting depth: 4
- Max nested callbacks: 3
- Complexity threshold: 15

#### Accessibility (a11y) - CRITICAL REQUIREMENT

- **MANDATORY**: All code must comply with a11y standards - NO EXCEPTIONS
- Enforces `vuejs-accessibility` plugin rules
- All interactive elements must have proper ARIA attributes
- Images require meaningful alt text
- Forms require proper labels and error messages
- Keyboard navigation must work for all interactive elements
- Color contrast must meet WCAG AA standards minimum
- Screen reader compatibility is required
- Focus states must be clearly visible
- **IMPORTANT**: All a11y text (ARIA labels, alt text, form labels) must use i18n for multi-language support

#### Promises & Async

- Must handle promise rejections
- Warns on await in loops

#### Import Organization

Auto-sorted in this order:

1. Built-in modules
2. External dependencies
3. Internal modules
4. Parent/sibling imports
5. Index imports
6. Object imports
7. Type imports

With alphabetical sorting and newlines between groups.

### Prettier Configuration

- No semicolons
- Single quotes
- 2-space indentation
- Trailing commas (always-multiline)
- Max line width: 100
- Arrow function parens: avoid
- LF line endings

### File naming

Each folder keeps one convention; a new file follows the files already next to it.

| Where                                                                                               | Convention                   | Example                                     |
| --------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------- |
| `app/components/`                                                                                   | PascalCase                   | `AccountPhotos.vue`                         |
| `app/pages/`                                                                                        | kebab-case                   | `bio-waste-shelters.vue`                    |
| `app/composables/`, `app/utils/`, `app/constants/`, `app/types/`, `app/templates/`, `server/utils/` | camelCase                    | `useLoginForm.ts`, `loginLink.ts`           |
| `server/api/`                                                                                       | kebab-case + method          | `deletion-request.post.ts`                  |
| `scripts/`, `tests/`, `docs/`, `.claude/`                                                           | kebab-case                   | `test-run.ts`, `login-link.test.ts`         |
| `supabase/migrations/`                                                                              | `<timestamp>_snake_case.sql` | `20261016000000_customer_area_profiles.sql` |

Tests are grouped by level, then by domain: `tests/{unit,integration,e2e}/<domain>/`, shared
helpers in `tests/support/`.

## Styling Architecture

### Tailwind CSS v4

- Uses `@tailwindcss/vite` plugin
- Global CSS file: `app/assets/css/tailwind.css`
- **Custom dark mode variant**: `@custom-variant dark (&:is(.dark *))`
- **Design tokens**: Uses CSS custom properties with `@theme inline`
- **Color system**: OKLCH color space for better perceptual uniformity
- **Animations**: `tw-animate-css` library included

### shadcn-nuxt Components

- Component directory: `@/components/ui`
- No prefix (configured as empty string)
- UI components are **excluded from ESLint** via `ignores: ['app/components/ui/**']`
- Use the `cn()` utility from `app/lib/utils.ts` for conditional class merging

## Key Technical Details

### Nuxt Configuration

- Compatibility date: 2025-07-15
- DevTools enabled
- Modules: `shadcn-nuxt`, `@nuxt/eslint`, `@nuxt/image`, `@nuxtjs/i18n`, `@nuxt/fonts`,
  `motion-v/nuxt`, `@nuxtjs/supabase`
- Tailwind integrated via Vite plugin (not Nuxt module)

### Package Manager

- Uses Bun (evidenced by `bun.lock` in git status)
- When installing packages, use `bun add` or `bun add -d`

### Internationalization

- **Multi-language support**: Always use i18n for all user-facing text
- Never hardcode strings in components or pages
- All text content must be translatable

### Git Workflow

- `main`: production, `dev`: integration branch
- One branch per step of `docs/TODO.md` (e.g. `feat/booking-quote`), created from `dev`
- Merge the finished branch into `dev` (`--no-ff`) before creating the next step's branch, never
  stack branches
- Commits follow gitmoji, see `docs/CONTRIBUTING.md`

## Important Patterns

### Accessibility First (a11y) - CRITICAL

**This is a mandatory requirement - all features must be accessible:**

- Test all interactive elements with keyboard navigation (Tab, Enter, Space, Arrow keys)
- Verify screen reader compatibility using semantic HTML
- Ensure proper heading hierarchy (h1 → h2 → h3, no skipping levels)
- Provide text alternatives for all non-text content
- Use ARIA labels when semantic HTML is insufficient
- Maintain sufficient color contrast ratios
- Never rely on color alone to convey information
- Ensure all form inputs have associated labels
- Provide clear error messages and validation feedback
- **All a11y text must be translatable**: ARIA labels, alt text, form labels, error messages must all use i18n

**If accessibility cannot be guaranteed, the feature is not complete.**

### Utility Functions

- **Create once, reuse everywhere**: All utility functions must be defined in `/app/utils`
- **Avoid duplication**: Never recreate the same utility function in multiple files
- **Proper typing**: All utility functions must have explicit type annotations

### Class Name Merging

Always use the `cn()` utility for conditional classes:

```typescript
import { cn } from '@/lib/utils'

cn('base-class', condition && 'conditional-class', className)
```

### Component Structure

Vue SFCs must follow this pattern:

```vue
<template>
  <!-- Template content -->
</template>

<script setup lang="ts">
// TypeScript only
// defineProps before defineEmits
</script>

<style>
<!-- Optional styles -->
</style>
```

### Auto-imports

Nuxt provides auto-imports for composables, components, and utilities. ESLint is configured to allow unresolved imports for this reason (`import/no-unresolved: 'off'`).

## Agent Workflow

The main session is the orchestrator only: it never writes code, migrations, docs or styles. It
briefs the subagents in `.claude/agents/`, passes reports between them and talks to the user.
Full pipeline: `/feature <description>` (`.claude/commands/feature.md`).

| Agent              | Model  | Writes                                                                                                                  | Runs when                                     |
| ------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `db-migrator`      | sonnet | new `supabase/migrations/*.sql`, `database.types.ts`                                                                    | the schema changes, before implementation     |
| `implementer`      | opus   | logic, components, server routes, Zod schemas, i18n, config; runs lint, typecheck, prettier                             | every code change, and every code fix         |
| `ui-stylist`       | sonnet | Tailwind classes, markup and motion-v animations in `app/pages`, `app/components`; presets in `app/constants/motion.ts` | templates changed, after implementation       |
| `security-auditor` | opus   | nothing (read-only)                                                                                                     | `server/`, `supabase/`, auth, payments, input |
| `a11y-auditor`     | sonnet | nothing (read-only)                                                                                                     | `.vue` or `i18n/` changed                     |
| `tester`           | sonnet | unit (`tests/unit/`), integration (`tests/integration/`), Playwright E2E (`tests/e2e/`); runs them, checks the DB       | after fixes, before the final review          |
| `code-reviewer`    | opus   | nothing (read-only)                                                                                                     | always, last before commit                    |
| `docs-writer`      | sonnet | `docs/` only                                                                                                            | end of feature                                |

Rules:

- Order: db-migrator → implementer → ui-stylist ∥ security-auditor → a11y-auditor → fixes →
  tester → code-reviewer → docs-writer. Two writers never run together; a read-only agent may
  run next to a writer when it reads files that writer does not touch (security-auditor reads
  `server/` and `supabase/`, ui-stylist edits `.vue`).
- Every agent is launched fresh with a complete, self-contained brief (never resumed with
  `SendMessage`): resumed agents accumulate very long contexts. Findings are relayed verbatim.
- Tools: `ui-stylist` uses the `frontend-design` and `ui-ux-pro-max` skills
  (`.claude/skills/ui-ux-pro-max/`, guidance only, BINOVYA tokens win). `implementer` and
  `code-reviewer` check current Nuxt 4 APIs and deprecations with the Nuxt MCP (`.mcp.json`,
  documentation and changelog tools only). Mockups to follow live in `docs/design/`.
- Test pyramid: many unit tests, some integration tests, few end-to-end tests. Unit and
  integration run in CI; E2E through the real Stripe page stays local, before merging to `main`.
- tester only uses Stripe test keys, never sends real mail (the test server writes mails to
  `.mail-outbox/test-run/`), never passes a key on a command line, and deletes only the rows it created
  (`e2e+…@binovya.test`). It never edits application code or `.env*`.
- A project `PostToolUse` hook (`.claude/settings.json`) runs prettier on every written file.
- implementer fixes critical, high and medium findings; visual findings go back to
  ui-stylist. The review is re-run at most twice, then open findings go to the user.
- Read-only agents cannot run commands: the orchestrator passes them the change set
  (`git diff --name-only dev` + untracked files) and the lint, typecheck and format output
  from implementer's report.
- Migrations are applied by the user in the Supabase SQL Editor and verified before dependent
  code is written. Nothing is committed automatically.
- Small changes still go through implementer: skip the rest of the pipeline for changes under
  ~30 lines with no new component and no `server/` or `supabase/` change. Any `server/` or `supabase/` change still goes through security-auditor.
