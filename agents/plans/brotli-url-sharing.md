# Plan: Share code via Brotli-compressed URL hash

Status: complete (implemented together with `markdown-mode.md`). Durable decisions live in
`agents/knowledge/share-links.md`. Kept as a record; don't resume.

## Implementation notes

- Shipped together with the Markdown plan, so the version-1 payload carries a `mode` string
  (`js` / `ts` / `md`) instead of a TS boolean. There were never any links in the TS-boolean format.
- Verified in Chrome only (via playwright attached to Chrome). Firefox and Safari round-trips were
  not tested; the codec uses no browser-specific APIs beyond WASM, `crypto.subtle` and `TextDecoder`.
- The checkpoint "the Network panel shows no request containing the hash" was not checked
  separately; nothing in the code sends the hash anywhere.

## Goal

JS Pad has no way to share code today; everything stays in localStorage (`index.html`).
Add shareable links that carry the editor content inside the URL hash, compressed with
Brotli quality 11 through a lazily loaded WASM library, so links work the same in every
browser, including Chrome, which has no native Brotli `CompressionStream`.

### Acceptance criteria

1. The URL hash always reflects the current code and JS/TS mode within about 500 ms of the last
   edit, so the address bar is a share link, and nothing is sent to any server.
2. Opening that link in Chrome, Firefox, or Safari restores the exact code (byte-identical,
   including non-ASCII and emoji) and the same JS/TS mode.
3. Brotli WASM never delays first paint or editor startup. On a visit without a hash it isn't
   requested before the `load` event. With a hash, local code shows first and the link is applied
   once decoded.
4. A malformed, truncated, oversized, or unknown-version hash, or a CDN failure, never blanks
   or corrupts the editor: the user's local code stays and a short visible notice explains that
   the link could not be read.
5. The hash format carries a version marker so a later format change can keep old links working.
6. Vim mode and panel size are not part of the link (personal preferences).
7. No service worker, manifest, or offline caching is added.
8. Code from a foreign link never runs, and is never persisted, until the user explicitly
   resumes (Run button, or a real typed edit). This includes reloads, other tabs and mode switches.

## Verified context

- No offline support today: no service worker or manifest, and the page depends on CDN
  scripts (Tailwind, Monaco, monaco-vim, TypeScript). Per the user, offline stays out of scope.
- No existing hash links, so backward compatibility with a previous format is not a concern.
  The version marker is only there for future changes.
- The added WASM (~1.0 MB raw, ~497 KB gzip) is small compared to the Monaco payload the page
  already loads from CDN.
- Measured gain on code is smaller than on prose: Brotli q11 beats the deflate baseline by
  about 9–11% on `test.js`, `test.ts` and the default snippet (around 20% on English prose).
- `brotli-wasm@3.0.1` `pkg.web/brotli_wasm.js` has no imports, and its default `init()` accepts
  WASM bytes. It exposes `compress(buf, { quality })` and a streaming `DecompressStream` that
  reports `total_out`. One-shot `decompress` has no output limit.
- Code runs from three places in `index.html`: the content-change handler, `applyTsMode`, and the
  unconditional startup run. The content-change handler and `applyTsMode` also write to localStorage.
- `loadTypeScript` drops the callback of a second caller while a load is in flight, and has no
  error path. `applyTsMode` replaces editor content with `setValue`, which clears the undo stack.
- Executed code runs via `new Function` in the `sourav9063.github.io` origin. That origin is
  shared with every other GitHub Pages project of this account. There is no CSP.

## Decisions

### From the user

- **D1: the hash updates automatically** 500 ms after typing stops, using `history.replaceState`
  so no history entries pile up. No Share button: the address bar is always the share link.
- **D2: shared code loads paused.** A banner says the code came from a link and that editing
  will run it, and offers Run. Live execution resumes on Run or on the first real edit.
- **D3: shared code is inserted as an undoable edit**, so Ctrl+Z restores the previous local
  code for the session. There's no "clear the hash" step, because under D1 the hash always
  mirrors the current code.

### Resolved in planning and review

- **Library and integrity:** pin `brotli-wasm` to an exact version on jsDelivr, and use the raw
  `pkg.web` files, never a rebundled `/+esm` build. Fetch the glue JS and the WASM, check both
  against pinned SHA-256 digests with `crypto.subtle`, import the glue from a blob URL, and pass
  the verified WASM bytes to `init()`. This gives SRI-equivalent integrity for a dynamic import.
  Add a timeout. Any failure goes to the criterion-4 notice, never an unhandled rejection.
- **Loading:** start the import after `load`, independent of Monaco readiness, or immediately
  when a hash is present. Decode only after the editor exists.
- **Hash format:** a fixed version prefix, then base64url (no padding) of Brotli q11 over a JSON
  payload of the code and the TS flag. Use base64url helpers built on `btoa`/`atob`.
- **Decode hardening, in order:**
  - Reject hashes above a length cap, an unknown prefix, or characters outside `[A-Za-z0-9_-]`.
  - Decode base64 inside try/catch.
  - Stream-decompress and abort once output passes a cap (about 1 MB); require the stream to finish.
  - Decode UTF-8 with `fatal: true`.
  - Parse JSON strictly: `code` must be a string and `ts` a boolean, and anything else is rejected.
- **Execution gate:** a single `paused` flag checked at the top of `runCode`, so all three call
  sites respect it. Programmatic changes (the link insert, `setValue` in the mode switch) run
  under a guard so they are neither "first edits" nor resume triggers. Edits flagged as undo,
  redo or flush in Monaco's change event never resume. Toggling TS mode while paused doesn't
  resume.
- **Persistence gate:** while paused, nothing is written to localStorage. That covers the
  content-change handler and the mode-switch save of the outgoing mode. D3's undo lives in
  memory, so it still works. Persistence starts on resume.
- **Own vs foreign link:**
  - On load, a hash is "own" if its code exactly equals the saved localStorage code for its mode.
    When nothing is saved for that mode, compare against that mode's default snippet.
  - On `hashchange`, compare against the current editor value instead.
  - Use exact string comparison (no trimming), with `getValue()` on both sides.
  - Anything else is foreign.
  - Known safe-failure case: after another tab edits the same mode, reloading this tab shows the
    banner on your own code. This is expected.
- **Hash writer ordering:** the D1 writer stays disabled until the initial hash, or a pending
  `hashchange`, has been consumed, so it can't overwrite an incoming link. While paused, the hash
  keeps the foreign link unchanged. Wrap `replaceState` in try/catch, because Safari throttles it.
- **TS loading:** make `loadTypeScript` promise-based, with a shared in-flight promise and an
  error path that restores the button. When a hash is present, the link decides the mode, and
  the startup restore of saved TS mode is skipped. The D3 insert happens only after the mode is
  settled, so the mode switch's `setValue` can't wipe the undo point.
- **Length indicator:** a small URL-length indicator in the editor header turns to a warning
  color above about 2,000 characters. It never blocks anything.

## Risks

- A CDN outage or blocked CDN means links can't be encoded or opened. This is handled by the criterion-4 notice.
- Upgrading `brotli-wasm` means recomputing both pinned digests. A mismatch fails closed.
- The code now also lives in the URL, so it lands in browser history and synced history. Pasted
  secrets (API keys) leak there. Document this in the README.
- Resume-on-first-edit (D2) means one deliberate keystroke runs foreign code. The banner copy
  must say so.

## Review

Independent review done (fresh-context reviewer agent). All critical and important findings are
adopted above. The minor findings are in the checkpoints.

## Tasks

1. **Codec (inline in `index.html`).** Integrity-checked lazy loader, base64url helpers, encode,
   and a hardened decode.
   Checkpoint (DevTools console):
   - ASCII, emoji, empty and 50 KB inputs round-trip byte-identically.
   - Each of these rejects cleanly without throwing to the page: a truncated hash, garbage, an
     unknown version, invalid UTF-8, JSON with wrong types, an over-long hash, and a small payload
     that decompresses past the cap.
   - A tampered digest makes loading fail closed.
2. **Execution and persistence gates.** Add the `paused` flag in `runCode`, the programmatic-change
   guard, the persistence gate, and the promise-based `loadTypeScript`. There's no link UI yet.
   Checkpoint: with `paused` set from the console, typing, TS toggling, and startup never
   execute and never write localStorage. Clearing the flag restores current behavior exactly.
   The TS toggle recovers from a blocked TypeScript CDN.
3. **Deferred loading and the auto-update hash (D1).** Idle or immediate import, the gated
   writer, and the length indicator.
   Checkpoint:
   - A plain visit makes no WASM request before `load`.
   - Typing updates the hash with no new history entries.
   - The Network panel shows no request containing the hash.
   - A URL copied from Chrome opens with identical code and mode in Firefox and Safari.
   - No service worker is registered (criterion 7).
4. **Open-link flow (D2, D3, own-vs-foreign).** Decode on load and on `hashchange`, settle the
   mode, insert as an undoable edit, pause, show the banner, and show the failure notice.
   Checkpoint (all three browsers):
   - Reloading your own page shows no banner.
   - A foreign link shows the banner and doesn't run until Run or a typed edit.
   - Ctrl+Z restores the previous code, and undo/redo never resumes.
   - Reloading after a foreign open still shows the banner, and localStorage is unchanged.
   - A new tab with no hash doesn't show the foreign code.
   - `hashchange` in an open tab takes the foreign path.
   - A TS link opened in JS mode, and the reverse, both work.
   - A link opened while TypeScript is still loading lands in the right mode with undo intact.
   - Criteria 2, 4, 6 and 8 hold.
5. **Docs.** Add sharing and the browser-history caveat to the README. Record the durable format,
   integrity and execution-gate decisions in `agents/knowledge/`.
   Checkpoint: the README describes the feature, and the knowledge entry names the owner
   (`index.html`) without restating code.
