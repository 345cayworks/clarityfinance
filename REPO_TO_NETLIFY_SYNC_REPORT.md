# GitHub ↔ Netlify Sync Review

Date (UTC): 2026-04-26

## Scope reviewed
- Local git branch/remotes visibility.
- Build configuration parity between repository scripts and Netlify build settings.
- Ability to verify deploy linkage to GitHub `main`.

## Current findings
- Local repository has **no configured git remotes**, so GitHub branch/PR sync cannot be validated from this environment.
- Only one local branch is present: `work`.
- `netlify.toml` build command is `npm run build`, and `package.json` defines `build` as `next build` (configuration is aligned).
- A local production-equivalent build check cannot complete yet because dependencies are not installed (`next: not found`).

## Sync status
Overall status: **Not verifiable from this container**.

Why:
1. No GitHub remote means no fetch/compare against `main`.
2. No Netlify site link metadata/API session means no deploy-to-commit confirmation.

## Recommended verification sequence (outside this container or after credentials are added)
1. Configure remote and fetch:
   - `git remote add origin <repo-url>` (if missing)
   - `git fetch origin`
2. Confirm branch parity:
   - `git rev-parse work`
   - `git rev-parse origin/main`
   - `git log --oneline --left-right origin/main...work`
3. Confirm Netlify site linkage + production source branch:
   - Netlify UI → **Site configuration → Build & deploy → Continuous deployment**
   - Verify production branch is `main` and latest production deploy references the expected commit SHA.
4. Run local validation before pushing:
   - `npm install`
   - `npm run build`

## Evidence collected in this run
- `git remote -v` returned no remotes.
- `git branch --all` returned only `work`.
- `npm run build` failed with `sh: 1: next: not found`.
- `netlify.toml` and `package.json` build settings are consistent.
