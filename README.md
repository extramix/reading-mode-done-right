# Reading Mode Done Right

<img width="2530" height="1282" alt="image" src="https://github.com/user-attachments/assets/dcb73818-0746-49cb-9a96-266e5b2e4724" />


> Disclaimer: This project was built with help from Codex.
## Why?
I built this out of frustration. Some documentation pages just don’t care about reading experience.

Imagine opening AWS docs on a 27-inch screen. You go full screen to focus, and what do you get? Paragraphs stretching left to right with a line height that feels uncomfortable. Sure, they have focus mode, but those settings don’t stick. Go to the next page and you’re making the same adjustments all over again.

Article-saving tools don’t solve this either. Sometimes I just want to read right there, right now, without saving anything.

Also, even though people (me included) now rely on LLMs when they can’t find what they’re looking for, I still think keeping context in your own brain matters.


## Load the extension

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the latest JavaScript from TypeScript:
   ```bash
   npm run build
   ```
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select this folder.

## Use it

1. Visit a docs/article page.
2. Click the extension icon to toggle reading mode.
3. Open **Settings** to adjust fonts, width, colors, and code styling.
4. Use **Comfort / Focus / Dense** presets for one-click readability tuning.
5. Select text and click **Highlight** (or press `H`) to save a highlight.
6. Double-click a highlight to remove it.

## Notes

- Settings are stored in Chrome sync storage.
- Code blocks include a copy button and basic syntax highlighting.
- Toolbar now shows reading progress and estimated reading time.
- The reader scroll is synchronized to the underlying page scroll position.
- Highlights are stored per page URL.
- Clicking links in reader mode opens them in a new tab and auto-opens reader mode at the top.
- Images stay within paragraph width by default; click any image to open a full-size preview modal.
- Toggle shortcut is configurable in reader settings (`Ctrl+R` default on macOS).

## Development

- TypeScript source lives in `src/content.ts` and `src/background.ts`.
- Compiled extension entry files are generated to `dist/content.js` and `dist/background.js`.
- `manifest.json` loads scripts from `dist/`.
- Run checks/build:
  ```bash
  npm run typecheck
  npm run build
  ```
