// Opening share links: someone else's code is paused, the hash stays in the URL, reloads don't clobber edits.
async (page, t) => {
  const SETTLE_MS = 1500;
  const MY_CODE = "console.log('mine');";
  const FOREIGN_CODE = "window.__foreignRuns = (window.__foreignRuns || 0) + 1;\nconsole.log('FOREIGN');";
  const state = () => page.evaluate(() => ({
    runs: window.__foreignRuns ?? 0,
    banner: !document.getElementById("shared-banner").classList.contains("hidden"),
    editorHasForeign: monaco.editor.getModels()[ 0 ].getValue().includes("__foreignRuns"),
    savedHasForeign: (localStorage.getItem("jspad_code") || "").includes("__foreignRuns"),
  }));

  await t.reset({ jspad_code: MY_CODE, jspad_mode: "js" });
  const foreignHash = await t.encode("js", FOREIGN_CODE);
  const foreignUrl = `${t.baseUrl}#${foreignHash}`;

  await t.open(foreignUrl);
  await t.waitForBanner();
  await page.waitForTimeout(SETTLE_MS);
  t.expect("foreign link opens paused", await state(), { runs: 0, banner: true, editorHasForeign: true, savedHasForeign: false });
  t.expect("foreign link keeps its hash", await page.evaluate(() => location.href), foreignUrl);

  const otherTab = await page.context().newPage();
  try {
    await otherTab.goto(t.baseUrl);
    await otherTab.waitForFunction(() => window.monaco && monaco.editor.getModels().length > 0, null, { timeout: 30_000 });
    t.expect("a new tab keeps my code", await otherTab.evaluate(() => monaco.editor.getModels()[ 0 ].getValue()), MY_CODE);
  } finally {
    await otherTab.close();
  }

  await page.reload();
  await t.editorReady();
  await t.waitForBanner();
  t.expect("reloading while paused stays paused", await state(), { runs: 0, banner: true, editorHasForeign: true, savedHasForeign: false });

  await page.click("#container .view-lines");
  await page.keyboard.press("Meta+z");
  t.expect("undo brings back my code", await t.editorValue(), MY_CODE);
  await page.keyboard.press("Meta+Shift+z");
  const afterRedo = await state();
  t.expect("undo and redo never run foreign code", [ afterRedo.runs, afterRedo.editorHasForeign, afterRedo.savedHasForeign ], [ 0, true, false ]);

  await page.click("#run-shared-btn");
  await t.until(() => window.__foreignRuns === 1);
  t.expect("Run runs and saves it", await state(), { runs: 1, banner: false, editorHasForeign: true, savedHasForeign: true });
  t.expect("Run keeps the hash", await page.evaluate(() => location.href), foreignUrl);

  await t.typeAtEnd(" // edited");
  await page.reload();
  await t.editorReady();
  await page.waitForTimeout(SETTLE_MS);
  t.expect("reload after edits keeps the edits", (await t.editorValue()).endsWith(" // edited"), true);
  t.expect("reload after edits shows no banner", await t.bannerShown(), false);

  const ownHash = await t.encode("js", await t.editorValue());
  await page.evaluate(() => sessionStorage.clear());
  await t.open(`${t.baseUrl}#${ownHash}`);
  await page.waitForTimeout(SETTLE_MS);
  t.expect("my own link isn't paused", await t.bannerShown(), false);
  t.expect("my own link keeps its hash", await t.hash(), `#${ownHash}`);

  const hashchangeHash = await t.encode("js", "window.__hashchangeRuns = 1;");
  await page.evaluate((hash) => { location.hash = hash; }, hashchangeHash);
  await t.waitForBanner();
  t.expect("a link opened in the same tab is paused", await page.evaluate(() => window.__hashchangeRuns ?? 0), 0);

  await page.click("#ts-toggle-btn");
  await t.waitForLanguage("typescript");
  await page.waitForTimeout(SETTLE_MS);
  t.expect("switching mode while paused unpauses", await t.bannerShown(), false);
  t.expect("switching mode while paused runs nothing", await page.evaluate(() => window.__hashchangeRuns ?? 0), 0);
  await page.click("#ts-toggle-btn");
  await t.waitForLanguage("javascript");

  const tsCode = "const n: number = 42;\nconsole.log('ts-link', n);";
  await t.open(`${t.baseUrl}#${await t.encode("ts", tsCode)}`);
  await t.waitForBanner();
  t.expect("a TS link switches to TS", [ await t.language(), await t.editorValue() ], [ "typescript", tsCode ]);
  await page.click("#run-shared-btn");

  await t.open(`${t.baseUrl}#${await t.encode("js", "console.log('js-link');")}`);
  await t.waitForBanner();
  t.expect("a JS link switches back from TS", await t.language(), "javascript");
  await page.click("#run-shared-btn");
  await t.until(() => document.getElementById("output").innerText.includes("js-link"));

  const beforeDamaged = await t.editorValue();
  await t.open(`${t.baseUrl}#1.garbage`);
  await t.waitForNotice();
  t.expect("a damaged link says so", await t.notice(), "This link is damaged or incomplete, so it couldn't be opened.");
  t.expect("a damaged link keeps my code", await t.editorValue(), beforeDamaged);
  t.expect("a damaged link keeps its hash", await t.hash(), "#1.garbage");
  await page.reload();
  await t.editorReady();
  await page.waitForTimeout(SETTLE_MS);
  t.expect("reloading a damaged link doesn't repeat the notice", await t.notice(), null);

  const mdHash = await t.encode("md", "# Shared\n\n- a");
  await t.open(`${t.baseUrl}#${mdHash}`);
  await t.until(() => document.querySelector("#preview h1")?.textContent === "Shared");
  t.expect("a Markdown link is never paused", await t.bannerShown(), false);
  t.expect("a Markdown link keeps its hash", await t.hash(), `#${mdHash}`);

  const hashBeforeVim = await t.hash();
  await page.click("#vim-toggle-btn");
  t.expect("Vim isn't part of the link", await t.hash(), hashBeforeVim);
  await page.click("#vim-toggle-btn");
  t.expect("no service worker", await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0);
}
