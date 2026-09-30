# Share links

Owner: `index.html` (the codec script and the link handling in the main script).

## Format

- The URL hash is a version prefix, a dot, then base64url (no padding) of Brotli q11 over the payload.
  Current version: `2`.
- Payload (v2): a one-character mode tag (`j` = js, `t` = ts, `m` = md) followed by the raw UTF-8
  code. No JSON: its keys and escaping roughly doubled the link length for short snippets.
- Links are made only in the current version, but every older version stays decodable: add a parser
  to `SHARE_PAYLOAD_PARSERS`, never remove one. Version `1` is a JSON payload `{"mode","code"}`.
  A version newer than the page fails with a distinct `unsupported-version` code that asks the user
  to reload; an unknown older one (e.g. `0`) fails as damaged.
- Brotli comes from `brotli-wasm` (WASM), not `CompressionStream`, because Chrome has no native
  Brotli compression. Measured gain over deflate: about 9–11% on code, about 20% on prose.
- Decoding is treated as untrusted input: length cap on the hash, streamed decompression with an
  output cap (defends against decompression bombs), fatal UTF-8, known mode tag (strict JSON shape for v1), trailing input
  rejected. Every failure becomes a `ShareLinkError` with a stable code and a user-facing message.

## Third-party code integrity

- Lazily loaded libraries (brotli-wasm glue and WASM, marked, DOMPurify) are fetched from jsDelivr,
  checked against pinned SHA-256 digests, and imported from a blob URL. This is SRI for dynamic
  imports. Upgrading a library means recomputing its digest; a mismatch fails closed.
- marked and DOMPurify use their ESM builds on purpose: the UMD builds would register themselves with
  Monaco's AMD `define` instead of setting globals.
- Brotli loads only when needed: on the first Share click, or right away when the page opens with a
  hash. Plain visits never download it.
- Any URL with a hash loads behind a blurred "Opening shared link..." cover. An inline `<head>` script
  adds `link-pending` (editor, output and preview `invisible`) and `link-cover` (cover shown) to `<html>`
  before the body is parsed; the elements react through Tailwind arbitrary variants
  (`[.link-pending_&]:invisible`). When the load-time link handling finishes (applied, own, settled, or
  failed), `link-pending` goes, the cover fades its blur and opacity out, then `link-cover` goes. An
  unsettled link starts decoding in the first script, in parallel with Monaco loading.

## Execution gate

- Code from a foreign link never runs until the user clicks Run or makes a real edit. Undo, redo and
  edits the page makes itself never count as consent. Opening a link never saves: its code, run or
  not, reaches localStorage only through Save (see editor-modes.md, Saving).
- "Own" link: on load, the link's code equals the saved code for its mode; on `hashchange`, it equals
  the editor. Anything else is foreign. Reloading after another tab edited the same mode shows the
  banner on your own code; that is an accepted false positive (fails safe).
- Foreign code is inserted as an undoable edit so Ctrl+Z restores the user's code.
- Links are made on demand by the Share button, which copies them to the clipboard and replaces the
  address bar URL with them (no new history entry), even if the copy fails. Edits never touch the
  URL (user decision), so it can be older than the editor until the next Share. An earlier design rewrote the hash 500 ms after every edit; it was dropped
  because the address bar kept going stale against saved code and fighting incoming links.
- Share copies via a promise-backed `ClipboardItem`, so the click's user activation still counts
  while the WASM loads and compresses; `writeText` is the fallback.
- The hash stays in the address bar after a link is opened (user decision). Once it is settled (own
  link, damaged, saved, or just shared), it is recorded per tab in sessionStorage, and a reload with
  that same hash is ignored, so the stale link doesn't overwrite newer edits or repeat the
  damaged-link notice. A link that isn't saved yet (paused, run, or Markdown) isn't recorded, so a
  reload re-opens it (paused again). A new tab or a different hash is applied normally.
- Switching mode while paused discards the foreign code (the editor gets that mode's saved code), so
  it unpauses without running anything.
- Markdown links are never paused: Markdown is sanitized and never executed.

## Out of scope

No service worker, manifest or offline support (user decision). Vim mode and panel size are
personal preferences and are not part of links.
