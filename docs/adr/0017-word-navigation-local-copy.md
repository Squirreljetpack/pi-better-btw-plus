# Word navigation copied locally instead of deep-importing pi-tui internals

While smoke-testing extension loading through Pi's package loader (after
adding a `peerDependencies`-driven reinstall, per the sync checklist), the
fork failed at startup:

```text
Cannot find module '@earendil-works/pi-tui/dist/word-navigation.js'
```

`srcs/editor-selection.ts` imported pi-tui's word navigation via a deep
subpath. The loader resolves host packages through aliases that map only the
bare package specifier (`@earendil-works/pi-tui` → `dist/index.js`), and its
jiti alias matcher rewrites any subpath import to a path nested under that
entry file (`…/dist/index.js/dist/word-navigation.js`), which does not exist.
Managed installs also run with `--omit=peer`, so a local copy is never
installed either. The package entry (`dist/index.d.ts`) does not export word
navigation, so there is no public import to switch to.

## Supersession

Contradicts ADR 0009's rejected "Reimplement word navigation locally" option
(duplicates the editor's paste-marker merging; two copies drift): the
loader-alias evidence above removes the deep import as an option entirely, so
a local copy is no longer a choice but the only path, and the parity suite
(`test/word-navigation.test.ts`) turns the drift risk into a CI-enforced
re-verify obligation.

## Decision

- **Behaviorally mirror pi-tui's word navigation into
  `srcs/word-navigation.ts`** (`findWordBackward`, `findWordForward`,
  `WordNavigationOptions`): the algorithm comes from
  `dist/word-navigation.js`, with the `wordSegmenter` / `PUNCTUATION_REGEX` /
  `isWhitespaceChar` helpers inlined from `utils.js`; import the local module
  from `editor-selection.ts`. Runtime word-selection semantics are unchanged.
- **Keep the devDep import in tests**: `test/word-navigation.test.ts` diffs
  the local mirror against `@earendil-works/pi-tui/dist/word-navigation.js`
  (devDep, resolvable in the dev tree) — 36 fixed boundary cases plus a
  seeded 500-text × 3-cursor × 3-option-set fuzz (9,100 assertions). A drift
  on the pi-tui side fails CI instead of silently diverging.
- **Re-verify obligation**: every pi sync bumps the devDep; the parity suite
  must stay green against the new pi-tui version, and if pi-tui ever exports
  word navigation from the entry, swap the local mirror for the public export
  (the parity suite keeps guarding behavior either way).
- The change is scoped to the extension; Pi's loader and `pi-tui` are
  untouched.

## Status

Adopted; release pending (v1.7.3) — ported from
datspike/pi-better-btw-plus#1, author Elesin Alexey.
