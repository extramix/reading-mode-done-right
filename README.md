# Reading Mode Done Right

A Kindle-like reading mode for documentation and article pages. Toggle it on/off in the same tab and tune typography, width, colors, and code styling.

## Load the extension

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder.

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
