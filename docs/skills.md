# ZOIKOVERTEX: Skills & Operational Manual

This file contains common commands and procedures for managing the ZoikoVertex project.

## 1. Backend Development
*   **Start Dev Server**: `npm run dev` (inside `/backend`)
*   **Build**: `npm run build`
*   **Lint**: `npm run lint` (uses ESLint)

## 2. Database Management
*   **Migrations**: Apply SQL files from `db_migrations/` via the Supabase SQL Editor or CLI.

## 3. Git Workflow
1.  Check status: `git status`
2.  Add changes: `git add .`
3.  Commit: `git commit -m "type: description"`
4.  Push: `git push` (Ask user before running this)

## 4. Verification Steps
*   Always check `backend/package.json` after installing new packages.
*   Validate Zod schemas against the `docs/architecture/05_data_model.md`.
