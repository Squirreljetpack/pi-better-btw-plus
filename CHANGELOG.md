# Changelog

## [1.8.0] - 2026-11-17

### Fixes

- Side chat no longer fails with `400 MissingSessionID` on providers that require a per-conversation routing header (OpenCode Go): the fork agent forwards the main lane's session id to the provider, matching the main lane's routing and shared-prefix caching.

## [1.7.4] - 2026-11-04

### Features

- Sync to pi 1.5.0: devDependencies bumped to `^1.5.0`; import surface re-verified against the new types.
- New integration test wires the real classifier into `runWithRetry`.

### Fixes

- Zhipu/Z.ai usage-limit errors (code 1308) no longer retry in the side chat.
- LiteLLM context-overflow failures no longer retry in the side chat.

### Docs-Chore

- Stale pi version stamps removed from comments; retry tables now match pi-ai 1.5.0 order exactly.
- Compatibility notes in README pin pi 1.5.0.
- Add ADR 0018 (pi 1.5.0 sync).
