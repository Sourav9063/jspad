# Editor modes and Markdown

Owner: `index.html` (main script).

## Mode model

- One `mode` value (`js` / `ts` / `md`) replaces the old TS boolean. Each mode has its own
  localStorage key, so switching swaps in that mode's saved code. The TS and MD buttons are two
  toggles over the one mode; clicking the active one returns to JS.
- The legacy TS flag key is still read once to migrate users who had TS mode on.
- Mode dependencies (TypeScript compiler, Markdown renderer) load on first use through shared
  in-flight promises; a failure shows a notice and resets so the next click retries.
- A newer mode switch supersedes an older one still waiting on its dependency load.

## Markdown rendering and sanitization

- marked (GFM) renders, then DOMPurify sanitizes into a DOM fragment for the preview. Forms,
  inputs, buttons, `style`, `iframe` and inline `style` attributes are forbidden on top of the
  DOMPurify HTML profile, so shared Markdown can't overlay or restyle the page or phish with forms.
  Links are forced to `target=_blank rel="noopener noreferrer"`.
- The preview uses GitHub's own stylesheet (`github-markdown-css`, dark), loaded through the same
  digest-checked fetch as the scripts, plus a few overrides in `index.html` for browser defaults
  that Tailwind's reset removes (list markers, inline images) and a black background to match the
  output panel (user decision).
- GFM task-list checkboxes are emitted by a custom marked renderer as data-attribute markers and
  rebuilt as disabled checkboxes after sanitizing, so the sanitizer can keep forbidding every
  `<input>`.
- Code blocks get a hover copy button (always visible on touch screens) and Monaco's `colorize`
  highlighting for any language Monaco knows, matched by id, alias or file extension. Copy uses the
  source text, not the highlighted DOM. Highlight results are cached because the preview re-renders
  on every keystroke. GitHub's stylesheet hides `<br>` inside code, so line breaks are newlines.
- Rejected: rendering into a sandboxed iframe. Stronger isolation, but the stylesheet and the copy
  buttons would have to live inside it, and the forbid list already covers the threats.
- Remote images are allowed (user decision); the README tells users this exposes their IP to the
  image host.

## Detection

- Suggest only, never auto-switch (user decision). A header chip offers the switch.
- Triggers: a paste of 200+ characters, a paste into an empty editor, a paste that replaced the whole
  document, or 3 seconds idle outside MD mode.
- Valid code never triggers a suggestion: JS is checked by compiling with `new Function` (never
  called); TS by transpiler syntax diagnostics, because TS isn't valid JS. Otherwise at least two
  distinct line-start Markdown signals are needed; `#!` and `#private` never count.
- Reverse: pasting valid JS with no Markdown signals in MD mode suggests JS.
- Accepting after a paste keeps the text in the new mode and restores the old mode's saved code to
  its pre-paste value. It also undoes Monaco's `formatOnPaste` re-indentation, which mangles
  Markdown pasted into JS mode.
- The pre-paste snapshot is captured in a document-level capture listener: Monaco stops the paste
  event before it reaches the editor container's capture phase.
