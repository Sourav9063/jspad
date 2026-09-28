// The JS / TS / MD buttons pick a mode; exactly one is pressed, and picking the current mode does nothing.
async (page, t) => {
  const pressed = () => page.evaluate(() => [ "js", "ts", "md" ]
    .filter((mode) => document.getElementById(`${mode}-mode-btn`).getAttribute("aria-pressed") === "true"));

  await t.reset({ jspad_code: "console.log('js');", jspad_ts_code: "const n: number = 1;", jspad_mode: "js" });
  await t.open();
  t.expect("JS is pressed on load", await pressed(), [ "js" ]);

  await page.click("#ts-mode-btn");
  await t.waitForLanguage("typescript");
  t.expect("TS is pressed", await pressed(), [ "ts" ]);
  t.expect("TS shows its saved code", await t.editorValue(), "const n: number = 1;");

  await page.click("#ts-mode-btn");
  t.expect("picking TS again stays in TS", [ await t.language(), await pressed() ], [ "typescript", [ "ts" ] ]);

  await page.click("#md-mode-btn");
  await t.waitForLanguage("markdown");
  t.expect("MD is pressed", await pressed(), [ "md" ]);

  await page.click("#js-mode-btn");
  await t.waitForLanguage("javascript");
  t.expect("JS is pressed again", await pressed(), [ "js" ]);
  t.expect("JS shows its saved code", await t.editorValue(), "console.log('js');");
}
