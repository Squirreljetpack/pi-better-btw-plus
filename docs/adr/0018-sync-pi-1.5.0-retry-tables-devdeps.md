# Sync to pi 1.5.0: retry tables re-synced (Zhipu 1308 + LiteLLM context overflow), devDeps bumped, version stamps dropped

The host pi moved 1.4.0 → 1.5.0 (npm latest, 2026-11-02), so this ADR records
the re-verification obligation from ADR 0009 and the sync pattern for the
1.5.0 series. pi 1.5.0 has **no breaking changes on this extension's import
surface** — the only Breaking Change touching extensions (tool argument
validation moving to pi-schema) does not affect the fork: `peek_main`'s schema
(`side-chat-overlay.ts`) is plain JSON Schema (`Type.Object`/`Optional`/
`Integer`/`Boolean`, with `Type` imported from the `typebox` package directly,
not from pi-ai), and the SDK typecheck gate exits 0 against 1.5.0 with zero
errors; the full suite (452 tests) passes against 1.5.0. The only
behavior-relevant drift is in pi-ai 1.5.0's `dist/utils/retry.js` /
`dist/utils/overflow.js`, where the transcribed classification tables gained
patterns under Fixed (semantic changes hiding in Fixed, per the sync
checklist). The sync diff is the smallest possible: two retry-table entries
transcribed verbatim, devDeps bumped, version stamps **deleted** (not
refreshed) in the two touched files.

## Decision

- **`retry.js` mirror gains the Zhipu/Z.ai usage-limit pattern, verbatim**
  from pi-ai 1.5.0 `dist/utils/retry.js` (#11537): added
  `'"code"\\s*:\\s*"?1308(?![0-9])'` to the non-retryable table (last entry,
  same position as upstream). This is a **behavior-affecting addition**: the
  extension previously classified Zhipu/Z.ai `1308` (plan usage limit,
  reported as HTTP 429, resets after hours not seconds) as a transient 429 and
  retried it 3× with backoff; it now ends the turn immediately with the final
  error, matching the main session (ADR 0013/0015's parity rationale).
- **`overflow.js` mirror gains the LiteLLM pre-call overflow wording,
  verbatim**: added `/context window exceeded/i` to `OVERFLOW_PATTERNS`
  (right after the generic maximum-context-length wording, same position as
  upstream; #11492, `litellm.ContextWindowExceededError`). **Behavior-
  affecting**: such errors now classify as context overflow (no retry; shown
  as a final error, compaction is the main session's job) instead of a
  retryable generic failure.
- **Seams re-verified against the 1.5.0 dist** (the ADR 0009 upgrade
  obligation):
  - pi-tui `dist/word-navigation.js`, `dist/tui.js` (`resolveOverlayLayout`
    L861 in both 1.4.0 and 1.5.0; `parseSizeValue` L81): **byte-identical** —
    the fork's word-navigation transcription (ADR 0017) and `resolveOverlayLayout`
    mirror need no change.
  - pi-tui `dist/tui-alt-screen.js`: `TERMINAL_WORD_SELECTION_JOINERS` gained
    `+ \ ~ _ .` (iTerm2's default word-char set, #10980) and
    `shouldDeferViewportInputToOverlay` became `shouldDeferViewportInput` with
    a `capturesViewportInput` component hook. **Neither is mirrored** by the
    fork: overlay/editor double-click word bounds resolve through the
    `word-navigation` tokenizer (`findWordBackward`/`findWordForward`), not
    the joiners, and the fork implements its own viewport-input routing.
  - pi-tui `dist/keys.js`, `dist/utils.js`: only add Kitty F1–F12 handling
    (mouse parser identical) and new helpers (`extractAnsiCodes`,
    `isWhitespaceToken`, `replaceControlCharacters`); the fork's mouse parser
    transcription and inlined `isWhitespaceChar`/`PUNCTUATION_REGEX` are
    unchanged. The #11377 control-character sanitization fix reaches the fork
    via its `stripTerminalSequences` import (runtime, no code change).
  - pi-coding-agent `dist/core/sdk.js`: only an import change and an
    insertion after L288 (`markRuntimeStreamFunction`, #11520). The
    `injectProviderRetry` `??`-fallback chain is unchanged
    (`buildRequestOptions` L194-203, `streamFn` L261-262, `identity` L205).
    #11520's marker is an internal, non-exported symbol applied to pi's own
    session agent; the fork's side-chat agent is not on that path — flagged to
    watch, not adopted.
  - pi-ai `dist/compat.js`/exports: `Type`/`Static`/`TSchema`/typebox-helpers
    no longer re-exported from the top level (moved behind the compat entry);
    the fork imports `clampThinkingLevel` from `pi-ai/compat` and `Type` from
    the `typebox` package — both resolve unchanged. New exports
    (`streaming-json`, `StringEnum`), pi-tui's `getSelectPageIndex` /
    `replaceControlCharacters`: additive, unused by the fork.
- **devDependencies bumped** `^1.4.0` → `^1.5.0` for all four
  `@earendil-works/pi-*` packages; `bun run typecheck` is green against 1.5.0
  and the full suite passes (452 tests, +3 fixture expectations). Import
  surface re-verified: top-level entries, `pi-ai/compat`, and the deep import
  `pi-tui/dist/word-navigation.js` all resolve against 1.5.0.
- **Version stamps deleted, not refreshed** (in `srcs/retry.ts` and
  `srcs/provider-retry.ts`): per the user-level AGENTS.md rule (§2 编码与验证) that version
  numbers and upstream-sync-state comments are deleted, never updated. The
  ADR trail (docs/adr/) is the record of each re-sync; the retry.ts header now
  points at `docs/adr/` instead of a hardcoded ADR range. Provenance that
  stays true (issue numbers, provider names, source file names) is kept.
  Stale stamps elsewhere (`srcs/index.ts`, `srcs/overlay-layout.ts`,
  `srcs/config.ts`, `srcs/side-chat-overlay.ts`, `test/retry.test.ts`) were
  reported by this sync and cleaned in the follow-up cleanup commit. The same
  cleanup removed the remaining 1.3.0 notes (`srcs/clipboard-read.ts`,
  `test/config.test.ts`, `test/overlay-layout.test.ts`, `test/retry.test.ts`).

## Considered options

- **Skip the two new patterns (keep the 1.4.0 tables)** (rejected): the
  fork's tables must match pi verbatim ("照抄语义，不发明私有协议"); both
  additions are pi 1.5.0 deliberate fixes (#11537, #11492) and the fork's
  retry decision would otherwise diverge from the main session's.
- **Import `isContextOverflow`/`isRetryableAssistantError` from pi-ai instead
  of the transcribed tables** (rejected, same as ADRs 0010/0016): the fork's
  D9 seam keeps the retry engine pi-runtime-free, driven by fakes in tests;
  importing would re-couple the engine to pi-ai's `AssistantMessage` shape.
  The transcription remains the design; this sync only re-syncs the tables.
- **Refresh the version stamps to 1.5.0** (rejected): AGENTS.md deletes
  version/sync-state comments; a refreshed stamp would go stale again at the
  next sync and add no information the ADR trail does not already carry.
- **Adopt injected `keyHint()`/`keyText()` render-context functions** (not
  adopted): new in 1.5.0, they would make the overlay's shortcut hints reflect
  pi's keybindings when the extension resolves its own pi-tui copy. The peer
  dependency is `*`, so older pi versions lack the injected functions and a
  fallback branch would be required; watch.
- **Adopt extension-update changelog (`pi.changelogPath`)** (not adopted): the
  package ships no CHANGELOG.md; change records live in GitHub Releases.
- **Adopt `markRuntimeStreamFunction` semantics (#11520)** (not adopted): the
  symbol is internal to pi-coding-agent (not exported from the index) and
  targets pi's own session agent, not the fork's.

## Consequences

- `test/retry.test.ts` fixtures gained the Zhipu 1308 wording (string and
  numeric `code` forms) in the non-retryable list and the LiteLLM
  `ContextWindowExceededError` wording in the overflow list; the full suite
  stays green (452 pass) and `bun run typecheck` is green against 1.5.0.
- README.md / README.zh-CN.md compatibility notes now pin pi 1.5.0.
- Runtime behavior change (adopted): Zhipu/Z.ai 1308 and LiteLLM
  context-overflow failures no longer retry in the side chat's turn loop;
  they surface as final errors like the main session's. Verified at the
  `classifyRetryable` unit level (spot-check + fixtures); end-to-end behavior
  in a live session `[NEEDS MANUAL VERIFICATION]`.
