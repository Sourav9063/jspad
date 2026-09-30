// Code is saved only by Save, Ctrl/Cmd+S or Vim's :w. Save is enabled exactly when there are unsaved changes,
// and leaving or switching mode with unsaved changes asks first.
async (page, t) => {
  const MY_CODE = "console.log('mine');";

  await t.reset({ jspad_code: MY_CODE, jspad_md_code: "# saved md", jspad_mode: "js" });
  await t.open();
  t.expect("Save starts disabled", await t.saveEnabled(), false);

  await t.typeAtEnd(" // a");
  t.expect("an edit enables Save", await t.saveEnabled(), true);
  t.expect("typing doesn't save", await t.savedCode(), MY_CODE);

  await page.click("#save-btn");
  t.expect("Save saves", await t.savedCode(), `${MY_CODE} // a`);
  t.expect("Save is disabled after saving", await t.saveEnabled(), false);

  await t.typeAtEnd(" // b");
  await t.pressSave();
  t.expect("Ctrl+S saves", await t.savedCode(), `${MY_CODE} // a // b`);
  t.expect("Ctrl+S disables Save", await t.saveEnabled(), false);

  await t.typeAtEnd("!");
  await page.keyboard.press("Backspace");
  t.expect("undoing a change by hand disables Save again", await t.saveEnabled(), false);

  await t.typeAtEnd(" // c");
  t.dialogAnswer = false;
  t.dialogs.length = 0;
  await page.click("#md-mode-btn");
  t.expect("switching mode with unsaved changes asks", t.dialogs, [ "confirm" ]);
  t.expect("declining keeps the mode and the edits", [ await t.language(), await t.editorValue() ], [ "javascript", `${MY_CODE} // a // b // c` ]);

  t.dialogAnswer = true;
  await page.click("#md-mode-btn");
  await t.waitForLanguage("markdown");
  t.expect("accepting switches without saving", await t.savedCode(), `${MY_CODE} // a // b`);
  t.expect("the new mode shows its saved code", await t.editorValue(), "# saved md");
  t.expect("Save is disabled in the new mode", await t.saveEnabled(), false);

  t.dialogs.length = 0;
  await page.click("#js-mode-btn");
  await t.waitForLanguage("javascript");
  t.expect("switching mode without changes doesn't ask", t.dialogs, []);

  await t.typeAtEnd(" // d");
  await page.reload();
  await t.editorReady();
  t.expect("leaving with unsaved changes asks", t.dialogs, [ "beforeunload" ]);
  t.expect("unsaved changes are gone after leaving", await t.editorValue(), `${MY_CODE} // a // b`);

  await t.until(() => window.MonacoVim);
  await page.click("#vim-toggle-btn");
  await page.click("#container .view-lines");
  await page.keyboard.press("Escape");
  await page.keyboard.type("o// vim");
  await page.keyboard.press("Escape");
  await page.keyboard.type(":w");
  await page.keyboard.press("Enter");
  t.expect("Vim's :w saves", await t.savedCode(), `${MY_CODE} // a // b\n// vim`);
  await page.click("#vim-toggle-btn");
}
