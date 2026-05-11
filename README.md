# ZoikoVertex

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
