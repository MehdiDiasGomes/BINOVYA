# Contributing Guide

Thank you for your interest in contributing to BINOVYA! This document will guide you through the contribution process.

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (package manager)
- Node.js 18+ (for compatibility)
- Git

## 🎨 Code Conventions

### Code Style

- Use TypeScript for logic files
- Follow Vue 3 Composition API conventions
- Use Tailwind CSS for styling
- Format your code before committing

### Vue Component Structure

Block order is enforced by ESLint (`vue/block-order`): `<template>` → `<script>` → `<style>`.

```vue
<template>
  <!-- Template -->
</template>

<script setup lang="ts">
// Imports
// Composables
// Reactive data
// Functions
</script>
```

Styling is done with Tailwind classes only, so a `<style>` block should not be needed.

## 📝 Commit Conventions (Gitmoji)

This project uses [gitmoji](https://gitmoji.dev/) for commit messages. Here are the main gitmojis used:

### Main Gitmojis

| Gitmoji | Code                      | Description                           |
| ------- | ------------------------- | ------------------------------------- |
| ✨      | `:sparkles:`              | New feature                           |
| 🐛      | `:bug:`                   | Bug fix                               |
| 📝      | `:memo:`                  | Documentation                         |
| 🎨      | `:art:`                   | Improve structure/format of code      |
| ⚡️      | `:zap:`                   | Performance improvements              |
| 🔥      | `:fire:`                  | Remove code or files                  |
| 💄      | `:lipstick:`              | Add/update UI/styles                  |
| ♻️      | `:recycle:`               | Refactoring                           |
| ✅      | `:white_check_mark:`      | Add/update tests                      |
| 🔒️      | `:lock:`                  | Fix security issues                   |
| 🚀      | `:rocket:`                | Deployment                            |
| 🔧      | `:wrench:`                | Configuration files changes           |
| 🌐      | `:globe_with_meridians:`  | Internationalization and localization |
| 💚      | `:green_heart:`           | Fix CI build                          |
| 📦️      | `:package:`               | Add/update dependencies               |
| 🏗️      | `:building_construction:` | Architectural changes                 |

### Commit Message Format

```
<gitmoji> <type>: <short description>

<optional detailed description>

<optional footer>
```

**Examples:**

```
✨ feat: add online booking system

🐛 fix: correct total price calculation in cart

📝 docs: update README with installation instructions

💄 style: improve home page design
```

### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Style changes (UI/CSS)
- `refactor`: Code refactoring
- `test`: Add or modify tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `build`: Build system changes

## 🔀 Pull Request Process

1. **Create a branch** from `dev`, one branch per step of `docs/TODO.md`:

```bash
git checkout dev
git checkout -b feat/my-new-feature
# or
git checkout -b fix/bug-fix
```

2. **Make your changes** following the conventions above

3. **Commit your changes** with gitmoji:

```bash
git add .
git commit -m "✨ feat: add product page"
```

4. **Push to your fork**:

```bash
git push origin feat/my-new-feature
```

5. **Open a Pull Request** targeting `dev` with:
   - A clear title with gitmoji
   - A detailed description of changes
   - Screenshots if relevant (UI changes)
   - Reference to related issues

### Pull Request Template

```markdown
## 📋 Description

[Describe your changes]

## 🎯 Type of Change

- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 💄 UI/style changes
- [ ] 📝 Documentation
- [ ] ♻️ Refactoring

## ✅ Checklist

- [ ] My code follows the project conventions
- [ ] I have tested my changes
- [ ] I have updated documentation if necessary
- [ ] My commits use gitmoji

## 📸 Screenshots (if applicable)

[Add screenshots]
```

## 🧪 Testing

Before submitting your PR:

1. Check linting, formatting and types:

```bash
bun run lint
bun run format:check
bunx nuxi typecheck
```

> Known issue: `bunx nuxi typecheck` currently fails on some machines (`npx` pulls vue-tsc 3.3.13
> with TypeScript 7) and 5 type errors already exist. A `typecheck` script with `vue-tsc` as a
> devDependency is planned, see `docs/TODO.md` (step 11).

Automated tests (`bun run test:unit`, `test:integration`, `test:e2e`) are run once per feature,
meaning a whole TODO step and its branch, at the end and before merging into `dev`, not after
each lot or change. Code reviews still follow every pass.

2. Verify the application builds correctly:

```bash
bun run build
```

3. Test locally:

```bash
bun run preview
```

## 📚 Useful Resources

- [Nuxt 4 Documentation](https://nuxt.com/docs)
- [Vue 3 Documentation](https://vuejs.org/)
- [Tailwind CSS 4 Documentation](https://tailwindcss.com/)
- [Gitmoji Guide](https://gitmoji.dev/)

## 💬 Questions?

If you have any questions, feel free to:

- Open an issue
- Contact the project maintainers

Thank you for your contribution! 🙏
