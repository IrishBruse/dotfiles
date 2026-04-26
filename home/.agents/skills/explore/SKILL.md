---
name: explore
description: Use this skill to explore and understand an unfamiliar codebase. Trigger whenever the user asks to "explore", "understand", "get familiar with", "map out", or "give me an overview of" a codebase or project. Also trigger when the user asks questions like "how is this project structured?", "where does X happen?", or "what does this repo do?" — even if they don't say "explore" explicitly.
---

# Explore Skill

Quickly orient yourself in an unfamiliar codebase and produce a clear mental map for the user.

## Steps

### 1. Top-level layout
```bash
find . -maxdepth 2 \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/__pycache__/*' \
  -not -path '*/dist/*' \
  -not -path '*/.next/*'
```
Note the tech stack, main directories, and any obvious entrypoints (e.g. `main.*`, `index.*`, `app.*`, `server.*`).

### 2. Read key config & manifest files
Check whichever apply — read them, don't just list them:
- `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` — dependencies & scripts
- `README.md` — stated purpose & setup
- `Dockerfile` / `docker-compose.yml` — runtime shape
- `.env.example` — required environment variables

### 3. Trace the main entrypoint
Open the primary entrypoint file and follow imports/calls one level deep. Goal: understand what the program *does* when it starts.

### 4. Spot key patterns
Look for:
- **Routing** — where are routes/handlers defined?
- **Data layer** — ORM, raw SQL, API calls?
- **Config** — how is config loaded and passed around?
- **Tests** — where do they live, what framework?

Use targeted greps rather than reading every file:
```bash
grep -r "def main\|export default\|createApp\|FastAPI\|express()" --include="*.py" --include="*.ts" --include="*.js" -l
```

## Output format

Give the user a concise summary:
1. **What it is** — one sentence on purpose
2. **Stack** — language(s), frameworks, key deps
3. **Structure** — 3–6 bullet points on major directories/modules and their roles
4. **Entry flow** — how a request/run travels through the code
5. **Where to look next** — 2–3 specific files most worth reading for the user's actual goal

Keep the whole summary under ~300 words unless the user asks for more depth.

Write the output to `.context/exploration.md`