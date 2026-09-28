// Shared by every test file; run.sh inlines it, because playwright-cli run-code takes a single function.
(page, { baseUrl, failures }) => {
  const WAIT_MS = 30_000;

  const t = {
    baseUrl,

    expect(label, actual, expected) {
      const actualJson = JSON.stringify(actual);
      const expectedJson = JSON.stringify(expected);
      if (actualJson !== expectedJson) failures.push(`${label}: expected ${expectedJson}, got ${actualJson}`);
    },

    until: (predicate, arg) => page.waitForFunction(predicate, arg, { timeout: WAIT_MS }),

    // Goes through about:blank so opening a link from the same page is a real load, not just a hashchange.
    async open(url = baseUrl) {
      await page.goto("about:blank");
      await page.goto(url);
      await t.editorReady();
    },

    editorReady: () => t.until(() => window.monaco && monaco.editor.getModels().length > 0),

    async reset(storage = {}) {
      await t.open();
      await page.evaluate((entries) => {
        localStorage.clear();
        sessionStorage.clear();
        for (const [ key, value ] of Object.entries(entries)) localStorage.setItem(key, value);
      }, storage);
    },

    editorValue: () => page.evaluate(() => monaco.editor.getModels()[ 0 ].getValue()),
    language: () => page.evaluate(() => monaco.editor.getModels()[ 0 ].getLanguageId()),
    waitForLanguage: (id) => t.until((id) => monaco.editor.getModels()[ 0 ].getLanguageId() === id, id),
    hash: () => page.evaluate(() => location.hash),

    bannerShown: () => page.evaluate(() => !document.getElementById("shared-banner").classList.contains("hidden")),
    waitForBanner: () => t.until(() => !document.getElementById("shared-banner").classList.contains("hidden")),
    notice: () => page.evaluate(() => document.getElementById("notice").classList.contains("hidden")
      ? null
      : document.getElementById("notice-text").textContent),
    waitForNotice: () => t.until(() => !document.getElementById("notice").classList.contains("hidden")),
    suggestion: () => page.evaluate(() => document.getElementById("mode-suggestion").classList.contains("hidden")
      ? null
      : document.getElementById("mode-suggestion-btn").textContent.trim()),

    encode: (mode, code) => page.evaluate((payload) => encodeShareHash(payload), { mode, code }),

    async typeAtEnd(text) {
      await page.click("#container .view-lines");
      await page.keyboard.press("Control+End");
      await page.keyboard.type(text);
    },

    // Dispatches a real paste event so Monaco and the page's paste listeners both see it.
    paste: (text, { replaceAll = true } = {}) => page.evaluate(({ text, replaceAll }) => {
      const editor = monaco.editor.getEditors()[ 0 ];
      editor.focus();
      if (replaceAll) editor.setSelection(editor.getModel().getFullModelRange());
      const data = new DataTransfer();
      data.setData("text/plain", text);
      document.querySelector("#container textarea")
        .dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    }, { text, replaceAll }),

    // Replaces the clipboard with a recorder so tests never overwrite the real clipboard.
    stubClipboard: () => page.evaluate(() => {
      window.__clipboardTexts = [];
      navigator.clipboard.write = async (items) => {
        window.__clipboardTexts.push(await (await items[ 0 ].getType("text/plain")).text());
      };
      navigator.clipboard.writeText = async (text) => { window.__clipboardTexts.push(text); };
    }),
    clipboardTexts: () => page.evaluate(() => window.__clipboardTexts),

    async share() {
      await t.stubClipboard();
      await page.click("#share-btn");
      await t.until(() => window.__clipboardTexts.length > 0);
      return page.evaluate(() => window.__clipboardTexts[ 0 ]);
    },
  };
  return t;
}
