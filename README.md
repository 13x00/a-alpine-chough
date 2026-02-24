## a-alpine-chough

> Keep your codebase clean, structured, and free of architectural drift — from day one.

---

## The Problem

When building with AI-assisted tools like Cursor, it's easy to iterate fast. Too fast. You start with JSON files for your data layer, then migrate to Postgres. You refactor your component structure halfway through. You try a new routing pattern.

The problem? The old systems don't disappear. They linger — unused files, redundant fallbacks, ghost data layers — and before long you're not sure what's actually running your app and what's just sitting there from three iterations ago.

Cursor is great at building. It's not great at cleaning up after itself.

**a-alpine-chough** is built to fix that.

---

## What It Does

a-alpine-chough is an architecture governance package for Cursor projects. It combines a system prompt loaded at the start of your project, CLI commands you can run at any point to audit and clean your codebase, a single source of truth for your intended architecture, and migration helpers for safely transitioning between systems.

---

## Key Features

**🧹 Cleanup** — Scans your project for redundant code, unused imports, deprecated data layers, and structural leftovers from previous iterations.

**🗺️ Architecture Audit** — Compares your actual file and dependency structure against your defined architecture and shows you where things have drifted.

**📊 Structure Overview** — Generates a human-readable report of your project's current architecture so you always know what you're working with.

**🔄 Migration Helper** — When transitioning from one system to another (e.g. JSON → Postgres), tracks what's been migrated, what's still live on the old system, and when it's safe to remove the old layer.

**📋 System Prompt & Rules** — A battle-tested Cursor system prompt and a set of architectural rules you can extend.

---

## Installation

```bash
npm install a-alpine-chough
```

---

## Getting Started

**1. Initialize in your project**
```bash
npx aac init
```

**2. Define your architecture** in `alpine.config.ts`

**3. Run your first audit**
```bash
aac audit
```

---

## Commands

| Command | Description |
|--------|-------------|
| `aac init` | Initialize config and install system prompt |
| `aac audit` | Run a full architecture audit |
| `aac cleanup` | Scan and flag redundant or unused code |
| `aac overview` | Generate a structure report |
| `aac migrate` | Start a guided migration between systems |

---

## Why "Alpine Chough"?

The alpine chough is a bird that thrives at altitude — in environments that are harsh, fast-changing, and unforgiving. It's agile, efficient, and doesn't carry dead weight. That's what your codebase should be.

---

## Status

🚧 Early development. Contributions, ideas, and feedback very welcome.

---

## License

MIT

---
