# ZoikoVertex: Skills & Operational Manual

Common commands and procedures for the ZoikoVertex project. This file is the Claude Code operational reference.

---

## 1. Backend Development

- **Start dev server**: `cd backend && npm run dev` (runs on `http://localhost:5005`)
- **Build**: `cd backend && npm run build`
- **Lint**: `cd backend && npm run lint`

## 2. Frontend Development

- **Start dev server**: `cd frontend && npm run dev` (runs on `http://localhost:3000`)
- **Build**: `cd frontend && npm run build`

## 3. Database Management

- **Migrations**: Apply SQL files from `db_migrations/` via the Supabase SQL Editor or CLI
- **Schema spec**: `docs/project_docs/ZoikoVertex_Canonical_Data_Model_Database_Architecture.docx`

## 4. Architecture Reference

All authoritative architecture specifications live in `docs/project_docs/` as `.docx` files. Extracted plaintext versions are in `docs/project_docs/extracted/`.

Key docs:
- `Z Vertex_Tech_Architecture_Master_Blueprint.docx` — system overview, tech stack, three-plane model
- `ZoikoVertex_Domain_Bounded_Context.docx` — 9 domains and interaction rules
- `ZoikoVertex _API_Architecture.docx` — API layers and contracts
- `ZoikoVertex_Canonical_Data_Model_Database_Architecture.docx` — data model and schema
- `ZoikoVertex_Agent_Operating_Contract.docx` — agent rules and execution constraints

## 5. Git Workflow

1. Check status: `git status`
2. Create branch: `git checkout -b your-name/what-youre-doing`
3. Add changes: `git add <specific-files>`
4. Commit: `git commit -m "type: description"`
5. Push: `git push origin <branch>` — **ask before pushing to shared branches**

See `docs/rules.md` for full git and collaboration rules.

## 6. Verification Checklist

- Always check `backend/package.json` after installing new packages
- Validate Zod schemas against `docs/project_docs/ZoikoVertex_Canonical_Data_Model_Database_Architecture.docx`
- Confirm any new agent logic follows `docs/project_docs/ZoikoVertex_Agent_Operating_Contract.docx`
- No domain may mutate another domain's database tables directly
