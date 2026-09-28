// Markdown mode: sanitized GitHub-style preview, task lists, highlighted code blocks with copy buttons.
async (page, t) => {
  const SETTLE_MS = 1500;
  const HOVER_FADE_MS = 300;
  const OUTPUT_BACKGROUND = "rgb(0, 0, 0)";
  const document_ = [
    "# Title", "", "Inline `code` and a [link](https://example.com).", "",
    "- [x] done", "- [ ] todo", "", "- bullet", "",
    "```js", "const x = 1; // comment", "console.log(`hi ${x}`);", "```", "",
    "```", "plain block", "  indented", "```", "",
    "```python", "def f():", "    return 42", "```", "",
    "<input type=\"text\" name=\"pw\" value=\"steal\">",
  ].join("\n");

  await t.reset({ jspad_mode: "md", jspad_md_code: document_ });
  await t.open();
  await t.until(() => document.querySelectorAll("#preview [data-copy-code]").length === 3);
  await page.waitForTimeout(SETTLE_MS);

  t.expect("preview UI", await page.evaluate(() => ({
    formatDisabled: document.getElementById("format-btn").disabled,
    outputHidden: document.getElementById("output").classList.contains("hidden"),
  })), { formatDisabled: true, outputHidden: true });
  t.expect("GitHub styling", await page.evaluate(() => {
    const preview = document.getElementById("preview");
    return {
      background: getComputedStyle(preview).backgroundColor,
      bullet: getComputedStyle(preview.querySelector("ul:not(.contains-task-list)")).listStyleType,
      inputs: [ ...preview.querySelectorAll("input") ].map((input) => `${input.type}:${input.checked}:${input.disabled}`),
      taskItems: preview.querySelectorAll("li.task-list-item").length,
      highlightedJs: preview.querySelector("pre").querySelectorAll("span[class^=mtk]").length > 0,
    };
  }), { background: OUTPUT_BACKGROUND, bullet: "disc", inputs: [ "checkbox:true:true", "checkbox:false:true" ], taskItems: 2, highlightedJs: true });

  const copyButtonOpacity = () => page.evaluate(() => getComputedStyle(document.querySelector("#preview [data-copy-code]")).opacity);
  t.expect("copy button hidden until hover", await copyButtonOpacity(), "0");
  await page.hover("#preview pre >> nth=0");
  await page.waitForTimeout(HOVER_FADE_MS);
  t.expect("copy button shows on hover", await copyButtonOpacity(), "1");

  await t.stubClipboard();
  for (const button of await page.$$("#preview [data-copy-code]")) {
    await button.hover();
    await button.click();
  }
  await t.until(() => window.__clipboardTexts.length === 3);
  t.expect("copy buttons copy the source", await t.clipboardTexts(), [
    "const x = 1; // comment\nconsole.log(`hi ${x}`);",
    "plain block\n  indented",
    "def f():\n    return 42",
  ]);

  let dialogs = 0;
  const onDialog = (dialog) => { dialogs++; dialog.dismiss(); };
  page.on("dialog", onDialog);
  try {
    const hostile = [
      "# Evil",
      "<script>window.__xss++;alert(1)</script>",
      "<img src=x onerror=\"window.__xss++;alert(2)\">",
      "[x](javascript:window.__xss++;alert(3))",
      "<form action=\"https://evil.example\"><input name=a><button>go</button></form>",
      "<style>body{display:none}</style>",
      "<div style=\"position:fixed;inset:0;background:red\">overlay</div>",
      "<iframe src=\"javascript:alert(4)\"></iframe>",
      "<a href=\"https://example.com\">ext</a>",
      "<svg><script>alert(5)</script></svg>",
      "<details open ontoggle=\"window.__xss++\">d</details>",
    ].join("\n\n");
    await page.evaluate(() => { window.__xss = 0; });
    await t.open(`${t.baseUrl}#${await t.encode("md", hostile)}`);
    await t.until(() => document.querySelector("#preview h1")?.textContent === "Evil");
    await page.waitForTimeout(SETTLE_MS);
    t.expect("hostile Markdown is sanitized", await page.evaluate(() => {
      const preview = document.getElementById("preview");
      return {
        ran: window.__xss ?? 0,
        forbidden: [ ...preview.querySelectorAll("script,style,form,input,button:not([data-copy-code]),iframe,[style],[onerror],[ontoggle]") ].map((element) => element.outerHTML),
        links: [ ...preview.querySelectorAll("a") ].map((link) => [ link.getAttribute("href"), link.target, link.rel ]),
        bodyHidden: getComputedStyle(document.body).display === "none",
      };
    }), {
      ran: 0,
      forbidden: [],
      links: [ [ null, "_blank", "noopener noreferrer" ], [ "https://example.com", "_blank", "noopener noreferrer" ] ],
      bodyHidden: false,
    });
    t.expect("hostile Markdown opens no dialogs", dialogs, 0);
  } finally {
    page.off("dialog", onDialog);
  }

  await page.click("#js-mode-btn");
  await t.waitForLanguage("javascript");
  t.expect("leaving MD mode", await page.evaluate(() => ({
    formatDisabled: document.getElementById("format-btn").disabled,
    previewHidden: document.getElementById("preview").classList.contains("hidden"),
  })), { formatDisabled: false, previewHidden: true });
}
