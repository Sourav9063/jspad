# JS Pad: Vim-Enabled JavaScript & TypeScript Playground and Online Editor

**Live:** [sourav9063.github.io/jspad](https://sourav9063.github.io/jspad)

JS Pad is the first Vim-enabled JavaScript and TypeScript playground on the web. Powered by the same editor engine as VS Code, it runs entirely in your browser. No setup, no install, no account, just open and start writing JS or TS. A great CodePen alternative focused purely on JavaScript and TypeScript.

## Features

- **Vim mode** with full keybindings and relative line numbers, the first of its kind in a browser JS playground
- **TypeScript support** pick TS from the JS / TS / MD buttons — compiler loads lazily, types and IntelliSense work instantly
- **VS Code editor** with syntax highlighting, autocomplete, and minimap
- **Live output panel** results appear as you type, no run button needed
- **console.log / warn / error** captured and color-coded in the output panel
- **Code formatting** via the Format button or `Shift+Alt+F`
- **Responsive layout** horizontal split on mobile, vertical on desktop
- **Resizable panels** drag the divider (with visible handle on mobile) to adjust editor/output split
- **Copy buttons** copy editor code or output to clipboard with one click
- **Markdown mode** pick MD to write Markdown on the left and see a sanitized, GitHub-style preview on the right, with syntax-highlighted code blocks and a copy button on each; JS Pad suggests switching when pasted text looks like Markdown (or like JavaScript while in MD mode)
- **Share links** the Share button copies a link holding your code and mode, Brotli-compressed into the URL hash, and puts it in the address bar; nothing is uploaded. Editing never changes the URL; click Share again to update it
- **Save** click Save, press Ctrl/Cmd+S or use Vim's `:w` to keep your code in localStorage; Save lights up whenever there are unsaved changes, and JS Pad asks before switching mode or leaving would lose them. Mode preferences save automatically
- **Pitch-black dark theme** easy on the eyes
- **Zero dependencies** no install, no build step, no account required

## Sharing and privacy

- The link is built in your browser and never sent to a server, but it contains your code. Anyone you send it to, and their browser history, gets the code, so don't share code containing secrets such as API keys.
- Code from someone else's link opens **paused**: nothing runs until you click **Run** or edit it. Opening a link never touches your saved code; it's only replaced if you click **Save**. Ctrl+Z brings back what you had before. The link stays in the address bar; reloading re-opens it until you save, and after that the tab keeps your saved code instead.
- Markdown links render right away, because Markdown is never executed. Images in a shared Markdown document load from wherever the author points them, which lets that server see your IP address.
- Very long code makes long links. If a copied link is over about 2,000 characters, JS Pad warns you, because some chat apps and email clients cut such links off.

## Tests

Browser tests live in `test/` and run in a headless browser through `playwright-cli` (`npm install -g @playwright/cli`). Run all of them, or pass specific files:

```sh
test/run.sh
test/run.sh test/share-button.test.js
```

The runner serves the repo on `127.0.0.1:5601` (override with `JSPAD_TEST_PORT`), needs `python3` and `node`, and needs network access to the CDNs the page loads.

To test a deployed copy instead, set `JSPAD_TEST_URL`:

```sh
JSPAD_TEST_URL=https://sourav9063.github.io/jspad/ test/run.sh
```

## Use cases

- Quick JS/TS scratchpad for testing ideas with Vim keybindings
- Learn JavaScript or TypeScript without any local setup
- Debug small snippets on the fly
- CodePen alternative for pure JavaScript and TypeScript experiments
- Instant JS/TS REPL in your browser

<img width="1470" height="837" alt="Screenshot 2026-05-20 at 4 18 41 PM" src="https://github.com/user-attachments/assets/21609de4-58af-45dc-83c3-b77ee237f1ad" />

<img width="1470" height="837" alt="Screenshot 2026-05-20 at 4 18 41 PM" src="https://github.com/user-attachments/assets/9be7e09d-1a36-4df7-9856-a8c4ca1f75a6" />

## Keywords

vim javascript playground, vim typescript playground, vim online editor, vim js editor, vim ts editor, vim mode browser, vim keybindings online, js pad, jspad, javascript playground, typescript playground, online javascript editor, online typescript editor, typescript browser repl, vscode editor online, vs code editor online, js web editor, javascript web editor, typescript web editor, js scratchpad, typescript scratchpad, run javascript online, run typescript online, browser javascript editor, js repl, typescript repl, javascript repl, code sandbox, online code editor, codepen alternative, online js compiler, online ts compiler, javascript runner, typescript runner, js ide online, typescript ide online
