# Plan: Markdown mode with rendered preview

Status: complete. Durable decisions live in `agents/knowledge/editor-modes.md` and
`agents/knowledge/share-links.md`. Kept as a record; don't resume.

## Implementation notes (deviations from this plan)

- D1 and D2 took the recommended options, (a) and (a), when the user asked to implement both plans.
- No version 2: both plans shipped together, so version 1 already carries the mode string, and no
  old-format links exist to stay compatible with.
- marked and DOMPurify load as ESM through the same SHA-256-verified blob import as brotli-wasm,
  not as SRI classic scripts, because their UMD builds register with Monaco's AMD `define`.
- Detection also triggers when a paste replaces the whole document (select-all, paste), which is
  effectively a paste into an empty editor.
- Accepting a suggestion after a paste restores the text as pasted, undoing Monaco's
  `formatOnPaste` re-indentation in JS/TS mode.
- This plan was not independently reviewed before implementation.
- Verified in Chrome only; Firefox and Safari were not tested.

## Goal

Add a third editor mode, Markdown, next to JS and TS. The left side is Monaco with Markdown
highlighting; the right side shows the rendered, sanitized document instead of console output.
Sharing reuses the Brotli URL-hash pipeline unchanged except for the payload's mode field.
The app also suggests switching to Markdown when the text clearly is Markdown.

### Acceptance criteria

1. An MD toggle switches the editor to Markdown. The output panel renders the document live as
   you type, styled for the dark theme. JS, TS and MD are mutually exclusive modes, and each keeps
   its own saved code.
2. Rendered output never executes script and never alters the page outside the preview.
   Script tags, event-handler attributes, `javascript:` URLs, forms, `<style>` and inline styles are
   all removed. Links open in a new tab with no opener.
3. Markdown links round-trip through the URL hash (code and mode byte-identical) in Chrome,
   Firefox and Safari. Links created before this change (JS/TS format) still open correctly.
4. Opening a foreign Markdown link renders it immediately, with no execution pause, because nothing
   runs. It is still inserted as an undoable edit (the sharing plan's D3).
5. Markdown libraries load only when MD mode is first used, with integrity checks. A load failure
   shows a notice and never leaves the toggle stuck.
6. The Format button is disabled in MD mode, since Monaco has no Markdown formatter.
7. Detection behaves per D1: it never switches or suggests while you're typing valid code, and never
   uses a single `#` as a signal.
8. No service worker or offline caching is added (same as the sharing plan).

## Context to re-verify at start

This plan assumes the end state of the sharing plan. Re-check these against `index.html` before task 1:

- The mode model: after the sharing plan it is still a two-way TS flag, with the `paused` gate in
  `runCode` and the persistence gate.
- The hash payload is version 1 with the code and a TS boolean, and decode rejects anything else.
- `loadTypeScript` is promise-based with an error path. Reuse the same pattern for the Markdown libraries.
- Switching modes swaps the editor contents to that mode's saved code.

## Decisions (resolved in planning)

- **Mode model:** replace the TS boolean with one `mode` value (`js` / `ts` / `md`) and a third
  localStorage key. The TS and MD buttons become two toggles over one mode. Clicking the active one
  returns to JS.
- **Link format:** bump the payload to version 2, carrying the code and the mode string. Decode still
  accepts version 1 and maps its TS flag to `ts` or `js`. This is what the sharing plan's version
  marker is for. Strict validation carries over: the mode must be one of the three strings.
- **Rendering:** `marked` for Markdown to HTML (GitHub-flavored), then `DOMPurify` with forms, `style`,
  `iframe` and inline `style` attributes forbidden. Also add a hook that forces
  `target="_blank" rel="noopener noreferrer"` on links. Render on each content change; no debounce
  unless measuring shows lag.
- **Library loading:** pinned versions from jsDelivr as classic scripts with `integrity` and
  `crossorigin` attributes (SRI), loaded together on first MD use.
- **Styling:** switch the Tailwind CDN script to include the Typography plugin, and use
  `prose prose-invert` on the preview container.
- **Execution in MD mode:** `runCode` is never called for MD, so the sharing plan's `paused` gate
  doesn't apply. Foreign MD links skip the banner.
- **Output panel:** in MD mode the copy-output button copies the rendered text, the same as today.
- **Rejected alternative:** rendering into a sandboxed iframe. It is stronger isolation, but Tailwind
  Typography would have to be injected into the iframe, and DOMPurify with the forbid list already
  covers criterion 2.

## Open decisions (block implementation)

- **D1: How does detection act?**
  (a) Suggest only. A header chip, "Looks like Markdown — switch?", appears after a large paste or
  a paste into an empty editor. It also appears after the editor has been invalid for a few seconds
  and shows at least two strong Markdown signals. One click switches the language and keeps the text.
  **Recommended.**
  (b) Auto-switch on paste, with an "Undo switch" chip.
  (c) No detection, manual toggle only.
- **D2: Remote images in foreign Markdown.** Images load from the author's server, which reveals the
  viewer's IP address.
  (a) Allow them and note this in the README. **Recommended.**
  (b) Block remote images in foreign links until the user clicks "Load images".

## Detection design (applies if D1 is a or b)

- **Validity gate:**
  - In JS mode, the text is "code" if `new Function(text)` compiles. This compiles only and never runs.
  - In TS mode, it is "code" if the TypeScript transpiler (already loaded) reports no syntax errors.
    TS isn't valid JS, so the JS check alone would misfire.
  - If the text is valid code, never suggest.
- **Markdown signals**, counted only at the start of a line:
  - an ATX heading (`#` followed by a space)
  - a code fence
  - list markers
  - a blockquote
  - a table row

  Inline `[text](url)` links also count. Two or more distinct signals are required. `#!` and `#name`
  (private fields) are never signals.
- **Reverse suggestion:** in MD mode, pasting text that is valid JS and has no Markdown signals
  suggests switching to JS.
- **Keep-text switch:** a separate operation from the toggle's content swap. It moves the current
  text to the target mode's key. When triggered by a paste, it restores the source mode's key to the
  snapshot taken just before that paste, so pasting Markdown doesn't overwrite your saved JS.
- A dismissed chip stays hidden until the next paste. Links never trigger detection, since they carry their mode.

## Risks

- DOMPurify's default allow-list can change between versions. Pin the version, and cover the forbid
  list with the task 3 checkpoint.
- The Tailwind Play CDN is not meant for production, but the page already depends on it. Adding the
  plugin doesn't change that risk.
- `new Function` compilation of very large text on paste could be slow. Only check on paste and after
  typing pauses, never on every keystroke.

## Tasks

1. **Three-way mode model.** Replace the TS flag with `mode` in storage, the toggles, mode switching,
   `runCode` gating and the hash writer. Add payload version 2 while still decoding version 1.
   There's no Markdown rendering yet.
   Checkpoint: JS and TS behave exactly as before, including every sharing-plan checkpoint in task 4.
   A version-1 link from before the change opens correctly. A version-2 link round-trips.
2. **MD mode and preview.** The MD toggle, SRI-loaded `marked` and DOMPurify with a notice on
   failure, Tailwind Typography, the rendered output panel, and Format disabled in MD mode.
   Checkpoint: criteria 1, 5 and 6 pass; headings, lists, tables, code fences and links render styled.
3. **Sanitization and foreign links.** The DOMPurify forbid list and link hook; foreign MD links skip
   the pause but stay undoable.
   Checkpoint: a Markdown link containing each of the following renders inertly, and no alert
   fires in any browser:
   - `<script>`
   - `<img onerror>`
   - `[x](javascript:alert(1))`
   - `<form>`
   - `<style>body{display:none}</style>`
   - `<div style="position:fixed;inset:0">`
   - `<iframe>`

   Criteria 3 and 4 also pass.
4. **Detection (per D1).** Validity gate, signals, chip, reverse suggestion, and the keep-text switch
   with the paste snapshot.
   Checkpoint:
   - Pasting the README into JS mode suggests MD; accepting keeps the text and leaves the saved JS
     unchanged.
   - Typing half-finished JS never shows the chip.
   - TS code with type annotations never shows the chip.
   - A JS file containing a Markdown template string never shows the chip.
   - Pasting JS into MD mode suggests JS.
5. **Docs.** Add Markdown mode (and the image note if D2 is a) to the README; record the mode model,
   version-2 format and sanitization decisions in `agents/knowledge/`.
   Checkpoint: the README describes the feature, and the knowledge entry names the owner
   (`index.html`) without restating code.
