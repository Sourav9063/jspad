// Lazily loaded libraries failing to load: a notice, no half-switched mode, and a working retry.
async (page, t) => {
  const PLAIN_VISIT_SETTLE_MS = 1500;
  const lazyLibraries = /typescript|marked|dompurify|brotli|github-markdown/;

  await t.reset({ jspad_mode: "js" });
  await page.route(lazyLibraries, (route) => route.abort());
  try {
    await t.open();
    await page.waitForTimeout(PLAIN_VISIT_SETTLE_MS);
    t.expect("a plain visit needs none of them", await t.notice(), null);

    await page.click("#share-btn");
    await t.waitForNotice();
    t.expect("Share explains the failure", /couldn't load/i.test(await t.notice()), true);
    await t.until(() => document.getElementById("share-btn").textContent.trim() === "Share");
    await page.click("#notice-dismiss-btn");

    for (const [ button, language ] of [ [ "#ts-toggle-btn", "typescript" ], [ "#md-toggle-btn", "markdown" ] ]) {
      await page.click(button);
      await t.waitForNotice();
      t.expect(`${language} failure stays in JS`, await t.language(), "javascript");
      await page.click("#notice-dismiss-btn");
    }
  } finally {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }

  await page.click("#md-toggle-btn");
  await t.waitForLanguage("markdown");
  await t.until(() => !document.getElementById("preview").classList.contains("hidden"));
}
