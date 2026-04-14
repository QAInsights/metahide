# Privacy Policy — MetaHide

**Last updated:** April 14, 2026

## Overview

MetaHide is a Chrome extension that toggles the visibility of sidebar menu items on [meta.ai](https://meta.ai). It is designed to do one thing only — hide or show sidebar items based on your preferences.

## Data Collection

MetaHide **does not collect, transmit, or share any data**. Specifically:

- **No personal information** is collected.
- **No browsing history** is recorded or transmitted.
- **No analytics or telemetry** is sent to any server.
- **No cookies** are created or read.
- **No network requests** are made by the extension.

## Data Storage

MetaHide stores your toggle preferences (which sidebar items are visible or hidden) using Chrome's `chrome.storage.sync` API. This data:

- Contains only boolean on/off values for each menu item (New Chat, Search, Vibes, Create).
- Is stored locally in your browser profile.
- Syncs across your Chrome instances **only** if you are signed into Chrome with sync enabled. This is a built-in Chrome feature and no data is sent to MetaHide servers.
- Can be cleared at any time by uninstalling the extension or clearing extension data.

## Permissions

| Permission | Why it's needed |
|---|---|
| `storage` | Save your toggle preferences locally. |
| `activeTab` | Send toggle changes to the active meta.ai tab so they apply immediately. |
| Host access to `meta.ai` | Run the content script that hides/shows sidebar items on meta.ai pages. |

No other permissions are requested. MetaHide cannot access any other websites.

## Third Parties

MetaHide does not integrate with, send data to, or receive data from any third-party services.

## Open Source

MetaHide is open source. You can inspect the full source code at:
[https://github.com/QAInsights/metahide](https://github.com/QAInsights/metahide)

## Changes to This Policy

If this policy is updated, the changes will be reflected in this document with an updated date. No retroactive changes will be made.

## Contact

If you have questions about this privacy policy, contact:
[https://qainsights.com](https://qainsights.com)
