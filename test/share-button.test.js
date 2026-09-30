// The Share button is the only thing that writes the URL; editing never does.
async (page, t) => {
  const LONG_LINK_LENGTH = 2000;
  const PLAIN_VISIT_SETTLE_MS = 1000;

  await t.reset({ jspad_code: "console.log('mine');", jspad_mode: "js" });
  await t.open();
  await t.typeAtEnd(" // a");
  await page.waitForTimeout(PLAIN_VISIT_SETTLE_MS);
  t.expect("typing leaves the URL alone", await t.hash(), "");
  t.expect("a plain visit never loads Brotli", await page.evaluate(() =>
    performance.getEntriesByType("resource").some((entry) => entry.name.includes("brotli"))), false);

  const historyLength = await page.evaluate(() => history.length);
  const link = await t.share();
  t.expect("Share puts the link in the address bar", await page.evaluate(() => location.href), link);
  t.expect("Share replaces the history entry", await page.evaluate(() => history.length), historyLength);
  t.expect("the link holds the editor code", await page.evaluate((hash) => decodeShareHash(hash), link.slice(link.indexOf("#") + 1)),
    { mode: "js", code: "console.log('mine'); // a" });
  await t.until(() => document.getElementById("share-btn").textContent.trim() === "Copied!");
  await page.hover("#share-btn");
  // Waits out the color transition; times out (and fails) if hover:text-white wins.
  await t.until(() => getComputedStyle(document.getElementById("share-btn")).color === "rgb(74, 222, 128)");
  t.expect("no notice for a short link", await t.notice(), null);

  await t.typeAtEnd(" // b");
  t.expect("editing after Share keeps the old link", await page.evaluate(() => location.href), link);
  await t.pressSave();
  await page.reload();
  await t.editorReady();
  await page.waitForTimeout(PLAIN_VISIT_SETTLE_MS);
  t.expect("reloading the tab keeps later saved edits over its own link", await t.editorValue(), "console.log('mine'); // a // b");
  t.expect("reloading the tab shows no banner", await t.bannerShown(), false);

  await page.evaluate(() => { navigator.clipboard.write = async () => { throw new Error("denied"); }; });
  await page.click("#share-btn");
  await t.waitForNotice();
  t.expect("a failed copy says where the link is", await t.notice(),
    "Couldn't copy the link to the clipboard. Copy it from the address bar instead.");
  t.expect("a failed copy still updates the address bar", await page.evaluate(async () =>
    (await decodeShareHash(location.hash.slice(1))).code), "console.log('mine'); // a // b");
  await page.click("#notice-dismiss-btn");

  await page.evaluate(() => monaco.editor.getEditors()[ 0 ].setValue(
    Array.from({ length: 400 }, (_, i) => `- item ${i} ${Math.random().toString(36)}`).join("\n")));
  const longLink = await t.share();
  t.expect("the long link is over the warning length", longLink.length > LONG_LINK_LENGTH, true);
  await t.waitForNotice();
  t.expect("a long link warns", /long/i.test(await t.notice()), true);
}
