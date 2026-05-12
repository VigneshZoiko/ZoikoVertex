# ZoikoVertex

Governed, autonomous Digital Marketing Operating System.

## Quick Start

```bash
# Backend
cd backend
cp .env.example .env   # or use the existing .env
npm install
npm run dev            # starts on port 5005

# Frontend (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev            # starts on port 3000
```

Requires a running Supabase instance with migrations from `db_migrations/` applied.

## CI/CD Pipeline

### GitHub Actions
- **Workflow**: `.github/workflows/ci.yml`
- **Triggers**: Pull requests to `main` and `staging` branches
- **Jobs**:
  - `backend` — runs `npm ci`, `npm run build`, `npm run lint`
  - `frontend` — runs `npm ci`, `npm run build`, `npm run lint`
- **Secrets required**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Vercel
- Auto-deploys preview deployments for every PR
- Production deployment from `main` branch
