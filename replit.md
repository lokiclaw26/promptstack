# PromptStack

## Overview
PromptStack is a CLI tool for prompt version control, designed for AI power users. It lets you save, version, compare, and optimize your prompts from the command line.

## Project Architecture
- **Language**: TypeScript (Node.js)
- **Type**: CLI application (no frontend/backend server)
- **Entry Point**: `src/cli.ts` (compiled to `dist/cli.js`)
- **Build**: `npm run build` (runs `tsc`)
- **Dev**: `npm run dev` (runs via `tsx`)
- **Data Storage**: JSON file at `~/.promptstack/prompts.json`

## Structure
```
src/
  cli.ts          - CLI command definitions using Commander.js
  promptstack.ts  - Core PromptStack class with CRUD and versioning logic
dist/             - Compiled JavaScript output
```

## Key Dependencies
- `commander` - CLI framework
- `chalk` - Terminal styling
- `uuid` - ID generation
- `diff` - Text diff comparison

## Usage
Run `promptstack --help` for available commands:
- `create <name>` - Create a new prompt
- `list` - List all prompts
- `show <id>` - Show prompt details
- `version <id>` - Add a new version
- `diff <id> <v1> <v2>` - Compare versions
- `rate <id> <ver> <rating>` - Rate a version
- `search <query>` - Search prompts
- `stats` - Show statistics
- `delete <id>` - Delete a prompt
