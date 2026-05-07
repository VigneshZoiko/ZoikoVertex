# ZoikoVertex — Rules & Collaboration Contract
> These are not suggestions. These are the rules every developer on this team follows.
> If you break these rules, you risk corrupting the codebase, breaking someone else's work, or pushing untested code to production.

---

## Table of Contents
1. [The Golden Rules (Non-Negotiable)](#1-the-golden-rules-non-negotiable)
2. [Git Basics — Start Here If You're New](#2-git-basics--start-here-if-youre-new)
3. [Branch Rules](#3-branch-rules)
4. [Commit Rules](#4-commit-rules)
5. [Pull Request Rules](#5-pull-request-rules)
6. [Code Quality Rules](#6-code-quality-rules)
7. [What "Production Ready" Means](#7-what-production-ready-means)
8. [Environment & Secrets Rules](#8-environment--secrets-rules)
9. [Communication Rules](#9-communication-rules)
10. [What To Do When Something Breaks](#10-what-to-do-when-something-breaks)

---

## 1. The Golden Rules (Non-Negotiable)

These apply to every developer, every time, no exceptions.

```
❌ Never push directly to main
❌ Never push directly to main
❌ Never push directly to main
```

**And:**

```
❌ Never commit secrets, API keys, or .env files
❌ Never merge your own PR without reviewing it
❌ Never push code you haven't tested yourself
❌ Never silently change another developer's domain without telling them
✅ Always work on a branch
✅ Always open a PR and request a review
✅ Always test before you push
```

---

## 2. Git Basics — Start Here If You're New

> This section is for Naresh and Harsha (and anyone who hasn't collaborated on GitHub before).

### What is Git?
Git tracks changes to your code over time. Every time you "commit", you save a snapshot of your work. GitHub is where we all share those snapshots.

### What is a branch?
Think of `main` as the live, working version of the product. A **branch** is your own personal copy of the code where you can make changes safely, without affecting anyone else — until you're ready.

### The workflow in plain English:

**1. Before starting any work — pull the latest code**
```bash
git checkout main
git pull origin main
```
This makes sure you're starting from the most recent version.

**2. Create your own branch**
```bash
git checkout -b your-name/what-youre-doing
# Example:
git checkout -b harsha/decision-engine-scoring
```

**3. Make your changes, then save them**
```bash
git add .
git commit -m "feat: add confidence scoring to decision engine"
```

**4. Push your branch to GitHub**
```bash
git push origin harsha/decision-engine-scoring
```

**5. Open a Pull Request on GitHub**
- Go to github.com → your repo
- Click "Compare & pull request"
- Write what you did and why
- Request a review from Team

**6. Wait for review and approval before merging**

> If you're unsure about any of these steps, ask Team before guessing. One wrong `git push --force` can delete someone else's work.

---

## 3. Branch Rules

### Branch naming format:
```
your-name/short-description-of-what-youre-doing
```

**Examples:**
```
Team/auth-middleware
vignesh/dashboard-campaign-view
naresh/agent-registration-api
harsha/decision-scoring-v1
```

### Protected branches:
| Branch | Rules |
|---|---|
| `main` | No direct pushes. Ever. PRs only. Requires 1 approval. |
| `staging` | PRs only. Can be merged by Team after testing. |

### Branch lifecycle:
- Create a branch for every piece of work
- Delete the branch after it's merged (GitHub does this automatically if you enable it)
- Do not let branches sit open for more than 1 week without progress — communicate if blocked

---

## 4. Commit Rules

### Format:
```
type: short description of what you did
```

### Types:
| Type | When to use |
|---|---|
| `feat` | Adding new functionality |
| `fix` | Fixing a bug |
| `refactor` | Reorganising code without changing behaviour |
| `test` | Adding or updating tests |
| `docs` | Updating documentation |
| `chore` | Config, setup, tooling changes |

**Good commits:**
```
feat: add governance gate to execution flow
fix: resolve null org_id in workspace query
refactor: extract decision scoring into separate module
docs: update agent contract spec in AGENTS.md
```

**Bad commits:**
```
update
fix stuff
wip
asdfgh
changes
```

> Every commit should explain *what* you did in plain English. If someone reads the commit history 3 months from now, they should understand what happened.

### One thing per commit:
Don't bundle 5 different changes into one commit. Smaller, focused commits are easier to review and easier to roll back if something breaks.

---

## 5. Pull Request Rules

### Before opening a PR, check:
- [ ] My code works locally (I tested it)
- [ ] I haven't broken any existing functionality
- [ ] I haven't hardcoded any secrets or API keys
- [ ] My branch is up to date with `main` (run `git pull origin main`)
- [ ] My commit messages follow the format above

### PR description — always include:
1. **What did you build/fix?** (1-2 sentences)
2. **Why?** (what problem does it solve)
3. **How to test it** (what should the reviewer try)
4. **Any risks or things to watch out for**

### Review rules:
- Every PR needs at least **1 review** before merging
- AI engineers (Naresh, Harsha) → Team reviews
- Frontend/backend (Vignesh) → Team reviews
- Team's own PRs → Vignesh reviews (or any available team member)
- Do not approve a PR you haven't actually read

### Merge rules:
- Only merge after approval
- Use **"Squash and merge"** to keep the history clean (GitHub will show this as an option)
- Delete the branch after merging

---

## 6. Code Quality Rules

### General:
- No commented-out code in PRs (delete it or use a `// TODO:` with your name)
- No `console.log` left in production code (use the logger)
- No `any` types in TypeScript without a comment explaining why
- Functions should do one thing
- If a file is getting long (over 300 lines), it probably needs to be split

### Domain rules (from the architecture):
- No domain may directly mutate another domain's database tables
- All cross-domain communication goes through APIs or events
- Execution only happens after `decision_status = APPROVED` and `governance_status = PASSED`
- No agent or service bypasses the governance gate — ever

### AI-generated code:
- Do not copy-paste AI-generated code without reading and understanding it
- AI code must be tested the same way hand-written code is
- If AI generated something you don't understand, ask before merging
- See `AGENTS.md` for the full AI collaboration protocol

---

## 7. What "Production Ready" Means

Before anything goes to `main`, it must be:

| Requirement | Checked by |
|---|---|
| Works locally without errors | You |
| Tested (manual or automated) | You |
| Reviewed and approved by someone else | Reviewer |
| No hardcoded secrets | You + Reviewer |
| Follows domain boundaries (no cross-domain mutations) | You + Reviewer |
| Commit messages are clean | You |
| No debug logs left in | You |
| Matches the API contract spec (for API changes) | Team |

> **When in doubt — don't merge. Ask first.**

---

## 8. Environment & Secrets Rules

```
❌ Never commit .env files
❌ Never put API keys, passwords, or tokens in code
❌ Never share secrets in chat (Slack, WhatsApp, etc.) — use a secure vault or ask team
```

### How environment variables work:
- `.env.example` — committed to the repo, shows the *shape* of config (no real values)
- `.env.local` — your local copy with real values, **never committed**
- `.env.staging` and `.env.production` — managed by team only

### The `.gitignore` already excludes:
```
.env
.env.local
.env.staging
.env.production
node_modules/
```

> If you accidentally commit a secret: **tell team immediately.** Don't try to hide it with another commit. The secret must be rotated (changed) right away.

---

## 9. Communication Rules

- If you're blocked on something for more than **2 hours**, tell the team — don't suffer in silence
- If you're changing something that touches another developer's domain, **tell them first**
- If you find a bug in someone else's code, **open an issue or tell them** — don't silently fix it without letting them know
- If you disagree with an architectural decision in the locked docs, **raise it with ** — don't silently do it your own way

---

## 10. What To Do When Something Breaks

### In your local environment:
1. Check your `.env.local` is correct
2. Pull the latest `main` — someone might have fixed it already
3. Run `docker-compose down && docker-compose up -d` to restart services
4. If still broken — ask Team, don't spend 4 hours guessing

### In staging or production:
1. **Ping Team immediately** — don't try to fix production yourself without visibility
2. Do not push a "quick fix" directly to `main` — still go through a branch and PR, even in an emergency
3. Document what broke and what you think caused it

---

*Last updated: May 2026 By Minit*
