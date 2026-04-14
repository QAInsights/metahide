# MetaHide

A minimal Chrome extension that lets you toggle visibility of meta.ai sidebar menu items.

## Features

- Toggle individual sidebar items: **New Chat**, **Search**, **Vibes**, **Create**, **History**
- Preferences persist across sessions via Chrome sync storage
- Works with meta.ai's SPA - re-applies on dynamic re-renders

## Installation (Developer Mode)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `metahide` folder
6. Navigate to [meta.ai](https://meta.ai) - click the extension icon to toggle sidebar items

## Usage

Click the MetaHide icon in the Chrome toolbar to open the popup. Toggle each sidebar item on or off. Changes apply immediately.

## Project Structure

```
metahide/
├── manifest.json     Manifest V3 configuration
├── content.js        Content script injected into meta.ai
├── popup.html        Extension popup UI
├── popup.js          Popup logic and storage management
├── styles.css        Popup styling
└── icons/            Extension icons
```

## Links

- [About](https://qainsights.com)
- [GitHub](https://github.com/QAInsights/metahide)
- [Donate](https://buymeacoffee.com/qainsights)
