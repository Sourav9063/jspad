# Share links

Owner: `index.html` (the codec script and the link handling in the main script).

## Format

- The URL hash is a version prefix, a dot, then base64url (no padding) of Brotli q11 over a JSON
  payload holding the mode (`js` / `ts` / `md`) and the code. Version `1` is the only version so far.
- The version exists so a later format change can keep old links working: add a new version, keep
  decoding the old one. Decode rejects unknown versions with a distinct error code.
- Brotli comes from `brotli-wasm` (WASM), not `CompressionStream`, because Chrome has no native
  Brotli compression. Measured gain over deflate: about 9–11% on code, about 20% on prose.
- Decoding is treated as untrusted input: length cap on the hash, streamed decompression with an
  output cap (defends against decompression bombs), fatal UTF-8, strict JSON shape, trailing input
  rejected. Every failure becomes a `ShareLinkError` with a stable code and a user-facing message.

## Third-party code integrity

- Lazily loaded libraries (brotli-wasm glue and WASM, marked, DOMPurify) are fetched from jsDelivr,
  checked against pinned SHA-256 digests, and imported from a blob URL. This is SRI for dynamic
  imports. Upgrading a library means recomputing its digest; a mismatch fails closed.
- marked and DOMPurify use their ESM builds on purpose: the UMD builds would register themselves with
  Monaco's AMD `define` instead of setting globals.
- Brotli loads after the `load` event (or right away when a hash is present), so it never delays
  first paint.

## Execution gate

- Code from a foreign link never runs and is never persisted until the user clicks Run or makes a
  real edit. Undo, redo and edits the page makes itself never count as consent.
- "Own" link: on load, the link's code equals the saved code for its mode; on `hashchange`, it equals
  the editor. Anything else is foreign. Reloading after another tab edited the same mode shows the
  banner on your own code; that is an accepted false positive (fails safe).
- Foreign code is inserted as an undoable edit so Ctrl+Z restores the user's code.
- The hash writer stays off while an incoming hash is being consumed, and while paused, so it can
  never overwrite an incoming link.
- Switching mode while paused discards the foreign code (the editor gets that mode's saved code), so
  it unpauses without running anything.
- Markdown links are never paused: Markdown is sanitized and never executed.

## Out of scope

No service worker, manifest or offline support (user decision). Vim mode and panel size are
personal preferences and are not part of links.
