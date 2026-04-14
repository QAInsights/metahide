/**
 * MetaHide Popup Script
 * Manages toggle state and communicates with the content script.
 */

const ITEM_KEYS = ['newchat', 'search', 'vibes', 'create'];

const DEFAULTS = {
  newchat: true,
  search: true,
  vibes: true,
  create: true
};

/**
 * Load saved preferences and set toggle states.
 */
function loadPreferences() {
  chrome.storage.sync.get(DEFAULTS, (prefs) => {
    for (const key of ITEM_KEYS) {
      const toggle = document.getElementById(`toggle-${key}`);
      if (toggle) {
        toggle.checked = prefs[key] !== false;
      }
    }
  });
}

/**
 * Read current toggle states from the UI.
 */
function getCurrentPrefs() {
  const prefs = {};
  for (const key of ITEM_KEYS) {
    const toggle = document.getElementById(`toggle-${key}`);
    prefs[key] = toggle ? toggle.checked : true;
  }
  return prefs;
}

/**
 * Save preferences and notify the active meta.ai tab.
 */
function saveAndNotify() {
  const prefs = getCurrentPrefs();

  chrome.storage.sync.set(prefs, () => {
    // Send message to the active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('meta.ai')) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'prefsUpdated',
          prefs: prefs
        }).catch(() => {
          // Content script may not be ready; preferences will load on next page visit
        });
      }
    });
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadPreferences();

  // Attach change listeners to all toggles
  for (const key of ITEM_KEYS) {
    const toggle = document.getElementById(`toggle-${key}`);
    if (toggle) {
      toggle.addEventListener('change', saveAndNotify);
    }
  }
});
