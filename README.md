<!-- README.md - usage guide for Flash Note -->

# Flash Note

Flash Note is a Manifest V3 Chrome side panel extension built for instant note taking, highlight capture, and reminders.

## Features

- Side panel UI with real-time search, import/export, and dark-mode auto theme.
- Highlight capture from any page (mouseup or Alt+Shift+F) that instantly lands in your note list.
- Reminder shortcuts per note (+5m, +1h, Tomorrow) powered by `chrome.alarms` and notifications.

## Project structure

```
/flash-note/
├── manifest.json
├── background.js
├── sidepanel.html
├── flashnote.html
├── flashnote.js
├── content.js
├── icons/
└── README.md
```

## Development

1. Load the folder via **chrome://extensions** → **Load unpacked**.
2. Pin Flash Note and open the side panel to run the UI.
3. All data is stored locally using `chrome.storage.sync`.

- All data lives in `chrome.storage.sync`.
- Icons should live under `icons/` at 16/48/128 px.

