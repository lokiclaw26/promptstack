# PromptStack

## Overview
PromptStack is a prompt version control tool for AI power users. It lets you save, version, compare, and optimize your prompts through a web GUI or CLI.

## Project Architecture
- **Language**: TypeScript (Node.js)
- **Type**: Web application (Express backend + vanilla frontend) with optional CLI
- **Web Entry Point**: `src/server.ts` (compiled to `dist/server.js`)
- **CLI Entry Point**: `src/cli.ts` (compiled to `dist/cli.js`)
- **Build**: `npm run build` (runs `tsc`)
- **Dev**: `npm run dev` (starts web server via `tsx`)
- **CLI Dev**: `npm run cli` (runs CLI via `tsx`)
- **Data Storage**: JSON file at `~/.promptstack/prompts.json`
- **Port**: 5000 (web GUI)

## Structure
```
src/
  server.ts       - Express API server serving the web GUI
  cli.ts          - CLI command definitions using Commander.js
  promptstack.ts  - Core PromptStack class with CRUD and versioning logic
public/
  index.html      - Web GUI HTML
  styles.css      - Web GUI styles (dark theme)
  app.js          - Web GUI frontend JavaScript
dist/             - Compiled JavaScript output
```

## Key Dependencies
- `express` - Web server
- `commander` - CLI framework
- `chalk` - Terminal styling
- `uuid` - ID generation
- `diff` - Text diff comparison

## API Endpoints
- `GET /api/prompts` - List all prompts
- `POST /api/prompts` - Create a prompt
- `GET /api/prompts/:id` - Get a prompt
- `DELETE /api/prompts/:id` - Delete a prompt
- `POST /api/prompts/:id/versions` - Add a version
- `POST /api/prompts/:id/versions/:v/rate` - Rate a version
- `GET /api/prompts/:id/compare/:v1/:v2` - Compare versions
- `GET /api/search?q=query` - Search prompts
- `GET /api/stats` - Get statistics

## Deployment
- Target: autoscale
- Build: `npm run build`
- Run: `node dist/server.js`
