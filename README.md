# JS Pad: Vim-Enabled JavaScript & TypeScript Playground and Online Editor

**Live:** [sourav9063.github.io/jspad](https://sourav9063.github.io/jspad)

JS Pad is the first Vim-enabled JavaScript and TypeScript playground on the web. Powered by the same editor engine as VS Code, it runs entirely in your browser. No setup, no install, no account, just open and start writing JS or TS. A great CodePen alternative focused purely on JavaScript and TypeScript.

## Features

- **Vim mode** with full keybindings and relative line numbers, the first of its kind in a browser JS playground
- **TypeScript support** toggle TS mode on demand — compiler loads lazily, types and IntelliSense work instantly
- **VS Code editor** with syntax highlighting, autocomplete, and minimap
- **Live output panel** results appear as you type, no run button needed
- **console.log / warn / error** captured and color-coded in the output panel
- **Code formatting** via the Format button or `Shift+Alt+F`
- **Responsive layout** horizontal split on mobile, vertical on desktop
- **Resizable panels** drag the divider (with visible handle on mobile) to adjust editor/output split
- **Copy buttons** copy editor code or output to clipboard with one click
- **Markdown mode** toggle MD to write Markdown on the left and see a sanitized, rendered preview on the right; JS Pad suggests switching when pasted text looks like Markdown (or like JavaScript while in MD mode)
- **Share links** the address bar always holds your current code and mode, Brotli-compressed into the URL hash; copy it to share, nothing is uploaded
- **Auto-save** code and mode preferences persisted to localStorage across sessions
- **Pitch-black dark theme** easy on the eyes
- **Zero dependencies** no install, no build step, no account required

## Sharing and privacy

- The link is built in your browser and never sent to a server, but it contains your code. It ends up in your browser history (and synced history), so don't paste secrets such as API keys.
- Code from someone else's link opens **paused**: nothing runs until you click **Run** or edit it, and it isn't saved over your own code until then. Ctrl+Z brings back what you had before.
- Markdown links render right away, because Markdown is never executed. Images in a shared Markdown document load from wherever the author points them, which lets that server see your IP address.
- Very long code makes long links; the header shows the link length and turns yellow past about 2,000 characters, where some chat apps and browsers start to cut links off.

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
