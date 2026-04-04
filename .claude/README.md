# .claude — AI Agent Configuration for AltFlex AEGIS v3.0

This directory contains Claude Code agent configuration, rules, commands, and skills for the AltFlex AEGIS project.

## Directory Structure

```
.claude/
├── commands/              ← Core Agent Functions (slash commands)
│   ├── deploy.md          ← Deployment orchestration command
│   ├── fix-issue.md       ← Issue diagnosis and fix command
│   └── review.md          ← Code review command
├── rules/                 ← Mandatory AI Rules (always enforced)
│   ├── api-conventions.md ← API design standards
│   ├── code-style.md      ← Code formatting and style rules
│   ├── database.md        ← Database conventions and migrations
│   ├── error-handling.md  ← Error handling patterns
│   ├── git-workflow.md    ← Git branching and commit conventions
│   ├── project-structure.md ← Monorepo and hexagonal architecture rules
│   ├── security.md        ← Security best practices
│   └── testing.md         ← Testing standards and requirements
├── skills/                ← Specialized Agent Capabilities
│   ├── deploy/            ← Deployment skill
│   │   └── SKILL.md
│   └── security-review/   ← Security review skill
│       └── SKILL.md
├── settings.json          ← Agent settings
├── settings.local.json    ← Local settings (gitignored)
├── CLAUDE.md              ← Root agent configuration
├── CLAUDE.local.md        ← Local overrides (gitignored)
└── README.md              ← This file
```

## How It Works

### Commands (`commands/`)

Core agent functions invoked as slash commands. These are action-oriented — deploy, fix, review.

### Rules (`rules/`)

Mandatory coding standards enforced on every interaction. The agent must follow these rules when writing or reviewing code for this project.

### Skills (`skills/`)

Specialized multi-step capabilities. Each skill has a `SKILL.md` with detailed instructions for complex workflows like deployment or security auditing.

### Settings

- `settings.json` — Shared agent configuration (committed)
- `settings.local.json` — Local overrides for developer-specific preferences (gitignored)

## Relationship to .gemini

The `.gemini/` directory contains equivalent configurations for Google Gemini agents with 8 role-based skills. The `.claude/` directory follows Claude Code's conventions with commands, rules, and skills organized according to the AI Agent Project Rules Board pattern.
