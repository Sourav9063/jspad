// Opening a URL with a hash: the editor and output stay empty under a blurred cover until the link is applied.
async (page, t) => {
  const BROTLI_DELAY_MS = 2000;
  const FOREIGN_CODE = "console.log('foreign');";
  const covered = () => page.evaluate(() => document.documentElement.classList.contains("link-pending"));

  await t.reset({ jspad_mode: "js" });
  const foreignUrl = `${t.baseUrl}#${await t.encode("md", FOREIGN_CODE)}`;

  // Slow Brotli down so the editor is ready well before the link is decoded.
  await page.route(/brotli/, async (route) => {
    await page.waitForTimeout(BROTLI_DELAY_MS);
    await route.continue();
  });
  try {
    await page.goto("about:blank");
    await page.goto(foreignUrl, { waitUntil: "domcontentloaded" });
    t.expect("covered from the first paint", await covered(), true);
    await t.editorReady();
    t.expect("covered while the link is decoding", await covered(), true);
    t.expect("the output is hidden while covered", await page.evaluate(() => getComputedStyle(document.getElementById("output")).visibility), "hidden");
    t.expect("the cover blurs the page", await page.evaluate(() => getComputedStyle(document.getElementById("link-loading")).backdropFilter), "blur(4px)");
    t.expect("the editor is hidden while covered", await page.evaluate(() => getComputedStyle(document.getElementById("container")).visibility), "hidden");
    await t.waitForLanguage("markdown");
    await t.until(() => !document.documentElement.classList.contains("link-pending"));
    t.expect("uncovered with the link's code in place", await t.editorValue(), FOREIGN_CODE);
    await t.until(() => getComputedStyle(document.getElementById("link-loading")).display === "none");
  } finally {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }

  await page.reload();
  await t.until(() => !document.documentElement.classList.contains("link-pending"));
  t.expect("a reloaded link shows the saved code", await t.editorValue(), FOREIGN_CODE);

  const MY_CODE = "console.log('mine');";
  await page.evaluate((code) => { localStorage.setItem("jspad_code", code); localStorage.setItem("jspad_mode", "js"); }, MY_CODE);
  const damagedUrl = `${t.baseUrl}#2.AAAA`;
  await t.open(damagedUrl);
  await t.waitForNotice();
  await t.until(() => !document.documentElement.classList.contains("link-pending"));
  t.expect("a damaged link leaves the editor empty", await t.editorValue(), "");
  t.expect("a damaged link leaves the output empty", await page.evaluate(() => document.getElementById("output").textContent), "");
  t.expect("a damaged link keeps the saved code", await page.evaluate(() => localStorage.getItem("jspad_code")), MY_CODE);
  await page.click("#container .view-lines");
  await page.keyboard.press("Meta+z");
  t.expect("undo after a damaged link brings back the saved code", await t.editorValue(), MY_CODE);

  await page.evaluate(() => sessionStorage.clear());
  await t.open(damagedUrl);
  await t.waitForNotice();
  await page.click("#ts-mode-btn");
  await t.waitForLanguage("typescript");
  await page.click("#js-mode-btn");
  await t.waitForLanguage("javascript");
  t.expect("switching mode after a damaged link keeps the saved code", await t.editorValue(), MY_CODE);

  await t.open();
  t.expect("a plain visit is never covered", await covered(), false);
}
