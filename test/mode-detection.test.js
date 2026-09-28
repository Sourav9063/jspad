// Suggesting a mode switch for pasted or typed text; valid code never triggers it.
async (page, t) => {
  // Idle detection fires after 3 s; waiting a little longer proves a suggestion did or didn't appear.
  const PAST_IDLE_DETECTION_MS = 3600;
  const PASTE_SETTLE_MS = 500;
  const SAVED_JS = "console.log('saved-js');";
  const SUGGEST_MARKDOWN = "Looks like Markdown, switch?";
  const SUGGEST_JAVASCRIPT = "Looks like JavaScript, switch?";
  const markdown = [
    "# JS Pad", "",
    "JS Pad is a Vim-enabled JavaScript and TypeScript playground that runs in your browser.", "",
    "## Features", "",
    "- **Vim mode** with full keybindings",
    "- **TypeScript support** loaded on demand",
    "- **Live output** as you type", "",
    "> No setup, no install, no account.", "",
  ].join("\n");

  await t.reset({ jspad_code: SAVED_JS, jspad_mode: "js" });
  await t.open();

  await t.paste(markdown);
  await page.waitForTimeout(PASTE_SETTLE_MS);
  t.expect("Markdown pasted into JS suggests Markdown", await t.suggestion(), SUGGEST_MARKDOWN);
  await page.click("#mode-suggestion-btn");
  await t.waitForLanguage("markdown");
  await t.until(() => document.querySelector("#preview h1")?.textContent === "JS Pad");
  t.expect("accepting keeps the pasted text unformatted", await t.editorValue(), markdown);
  t.expect("accepting restores the saved JS", await page.evaluate(() => localStorage.getItem("jspad_code")), SAVED_JS);

  const jsSnippet = "const items = [1, 2, 3];\nconst doubled = items.map((n) => n * 2);\nconsole.log(doubled);";
  await t.paste(jsSnippet);
  await page.waitForTimeout(PASTE_SETTLE_MS);
  t.expect("JS pasted into Markdown suggests JS", await t.suggestion(), SUGGEST_JAVASCRIPT);
  await page.click("#mode-suggestion-btn");
  await t.waitForLanguage("javascript");
  t.expect("accepting keeps the JS", await t.editorValue(), jsSnippet);
  t.expect("accepting restores the saved Markdown", await page.evaluate(() => localStorage.getItem("jspad_md_code")), markdown);
  await t.until(() => document.getElementById("output").innerText.includes("2"));

  await page.evaluate(() => { const editor = monaco.editor.getEditors()[ 0 ]; editor.setValue(""); editor.focus(); });
  await page.keyboard.type("function hello(name) {\n- list item\nconst x = [\n# not heading");
  await page.waitForTimeout(PAST_IDLE_DETECTION_MS);
  t.expect("half-typed JS gets no suggestion", await t.suggestion(), null);

  const jsWithMarkdownString = "var doc = `\n# Title\n\n- one\n- two\n`;\nconsole.log(doc.length);\n".repeat(8);
  await t.paste(jsWithMarkdownString);
  await page.waitForTimeout(PAST_IDLE_DETECTION_MS);
  t.expect("JS holding Markdown in a string gets no suggestion", await t.suggestion(), null);

  await page.click("#ts-mode-btn");
  await t.waitForLanguage("typescript");
  const tsCode = "interface Row { id: number; name: string }\n// # heading-like comment\n// - list-like comment\nconst rows: Row[] = [{ id: 1, name: 'a' }];\nfunction pick<T>(xs: T[]): T | undefined { return xs[0]; }\nconsole.log(pick(rows));\n".repeat(4);
  await t.paste(tsCode);
  await page.waitForTimeout(PAST_IDLE_DETECTION_MS);
  t.expect("TS with type annotations gets no suggestion", await t.suggestion(), null);
  await page.click("#js-mode-btn");
  await t.waitForLanguage("javascript");

  await page.click("#md-mode-btn");
  await t.waitForLanguage("markdown");
  await t.paste(markdown);
  await page.waitForTimeout(PASTE_SETTLE_MS);
  t.expect("Markdown pasted in MD mode stays exact", await t.editorValue(), markdown);
  t.expect("Markdown pasted in MD mode gets no suggestion", await t.suggestion(), null);

  await page.click("#js-mode-btn");
  await t.waitForLanguage("javascript");
  await t.paste(markdown);
  await page.waitForTimeout(PASTE_SETTLE_MS);
  await page.click("#mode-suggestion-dismiss-btn");
  await page.waitForTimeout(PAST_IDLE_DETECTION_MS);
  t.expect("a dismissed suggestion stays dismissed", await t.suggestion(), null);
}
