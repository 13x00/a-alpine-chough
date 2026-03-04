# a-alpine-chough

> Architecture governance for Cursor projects. Keep your codebase structured, clean, and free of drift — from day one.

---

## The Problem

When building with AI-assisted tools like Cursor, it's easy to iterate fast. Too fast. You refactor your component structure, try a new routing pattern, migrate your data layer. The problem? The old systems don't disappear. They linger — unused files, ghost components, redundant layers — and before long you're not sure what's actually running your app and what's left over from three iterations ago.

Cursor is great at building. It's not great at remembering what you decided last week.

**a-alpine-chough** fixes that by giving Cursor a persistent understanding of your architecture — and the tools to enforce it.

---

## What It Does

a-alpine-chough is an architecture governance package for Cursor projects. It installs a set of rule files into `.cursor/rules/` that teach Cursor your intended structure, naming conventions, import boundaries, and refactor protocols — so every AI-assisted change stays aligned with your architecture, not just the last thing you typed.

It also ships prompt commands you can run directly in Cursor chat to audit, clean, map, and migrate your codebase on demand.

---

## How It Works

```bash
npm install -g a-alpine-chough
aac init
```

This drops a set of `.mdc` rule files into `.cursor/rules/` and scaffolds an `aac.config.yml` in your project root. From that point on, Cursor loads your architecture rules automatically and understands commands like `/audit`, `/cleanup`, `/overview`, and `/migrate`.

No separate process. No background daemon. Just rules and a config file.

---

## Prompt Commands

Once initialized, these commands are available directly in Cursor chat:

| Command | What it does |
|---|---|
| `/audit` | Scans the codebase for architectural violations — wrong imports, raw colors, layout bugs, dead code — grouped by severity with file, line, and fix |
| `/cleanup` | Finds unused components, props, imports, and state variables |
| `/overview` | Maps your actual folder structure against your defined layers and reports coverage |
| `/migrate` | Generates a step-by-step migration plan when moving between systems, and saves it as a Cursor-readable plan file |

Commands trigger both when typed explicitly and when Cursor detects relevant context — e.g. suggesting `/audit` before a large refactor, or `/cleanup` when unused props are spotted.

---

## Rule Files

aac installs 5 rule files into `.cursor/rules/`:

| File | What it enforces |
|---|---|
| `architecture.mdc` | Layer model, folder structure, source-of-truth for styling decisions — always active |
| `imports.mdc` | Import direction boundaries, `@/` vs `./` usage, forbidden cross-layer imports |
| `styling.mdc` | No raw colors, token discipline, Figma → code mapping, inline style rules |
| `layout.mdc` | Viewport height, overflow ownership, flex shrink chain, scroll region rules |
| `migrations.mdc` | Refactor playbook, feature-flag protocol, verification checklist, dead code policy |

---

## Installation

```bash
npm install -g a-alpine-chough
```

This registers the `aac` command globally on your machine. Then in any project:

```bash
aac init
```

That's it. You'll use `aac` for everything from here on.

> **No global install?** You can also run it once with `npx a-alpine-chough init` — but installing globally gives you the short `aac` alias permanently.

`aac init` will:
- Ask for your project name and stack
- Copy rule files into `.cursor/rules/`
- Scaffold `aac.config.yml` as your architecture source of truth

---

## CLI Commands

aac also ships a CLI for use outside Cursor — in your terminal or CI pipeline:

| Command | Description |
|---|---|
| `aac init` | Initialize config and install rule files |
| `aac audit` | Run a full architecture audit |
| `aac cleanup` | Scan and flag redundant or unused code |
| `aac overview` | Generate a structure report |
| `aac migrate` | Start a guided migration between systems |

```bash
# short alias
aac audit

# CI-friendly — exits with code 1 on errors
aac audit --json
```

---

## `aac.config.yml`

The config file is the single source of truth for your intended architecture. The rule files and CLI both read from it.

```yaml
project: "my-app"
stack: "Next.js App Router"

layers:
  - components/ui
  - components/content
  - components/layout
  - hooks
  - lib
  - types

rules:
  no_cross_layer_imports: true
  enforce_naming_conventions: true
  no_raw_colors: true
  no_magic_numbers: true
  max_file_lines: 300
```

---

## Why "Alpine Chough"?

The alpine chough is a bird that thrives at altitude — in environments that are harsh, fast-changing, and unforgiving. It's agile, efficient, and doesn't carry dead weight.

That's what your codebase should be.

---

## Status

🚧 Early development. Feedback, ideas, and contributions very welcome.

---

## License

MIT