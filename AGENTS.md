# AGENTS.md

Working repo of `pi-better-btw-plus`, a fork of pi-better-btw (side-chat overlay extension). Upstream: `yceachan/ea-pi-extensions` (the `packages/pi-better-btw` package in the monorepo, preserved with full history via subtree split).

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues via the `gh` CLI (remote: `origin` → `hu3rror/pi-better-btw-plus`). See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles mapped to GitHub labels, all defaults (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` at the repo root + `docs/adr/`. See `docs/agents/domain.md`.

## Development

- Typecheck: `bun run typecheck`
- Test: `bun run test`
- Package layout: `srcs/` (extension source), `prompts/` (prompt pack texts), `config.json` (bundle default config), `test/` (bun unit tests)

### Releases

Releases go through the **Trusted Publisher (OIDC) direct flow** (`.github/workflows/publish.yml`, zero token): pushing a `v*` tag triggers CI (`bun install --frozen-lockfile` → `bun run test` → tag↔version check → `npm publish --provenance`); **tag push means release — fully automatic, no human 2FA gate**.

The agent is responsible for bumping the version, committing, creating an annotated tag (`git tag -a vX.Y.Z -m "vX.Y.Z"`, must match the package.json version), and pushing (`git push origin main` + `git push origin refs/tags/vX.Y.Z`, restricted operations require per-round authorization).

**Release gate**: none — CI publishes directly via OIDC; roll back errors with `npm unpublish <version>` (within 72 hours, requires local login; past that, `npm deprecate`). Prerequisite: npmjs.com's Trusted Publisher Allowed actions must allow `npm publish` (stage-only will 403).

**Release notes**: the GitHub Release is written by the agent after publishing — organized into Features / Fixes / Docs-Chore (created manually with `gh release create`), not just the workflow's `--generate-notes` comparison link; the workflow does not auto-create Releases.

Republishing the same version is rejected (semver unique index); bump to a new version.

### Changelog

`CHANGELOG.md` at the repo root ships in the npm package (listed in `files`). Every release adds a new top section `## [x.y.z] - YYYY-MM-DD` matching the released version, with `###` subsections (Features / Fixes / Docs-Chore). pi's extension changelog parser (`dist/utils/changelog.js`) splits on `##` only, so `###` never starts a new entry, and it shows the entries newer than the version recorded when the extension was installed; a fresh install records the version and shows nothing.
