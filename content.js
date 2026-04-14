/**
 * MetaHide Content Script
 * Hides/shows meta.ai sidebar menu items (New Chat, Search, Vibes, Create).
 */

const ITEM_KEYS = ['newchat', 'search', 'vibes', 'create'];

const DEFAULTS = {
  newchat: true,
  search: true,
  vibes: true,
  create: true
};

const LABELS = {
  newchat: /^new chat$/i,
  search: /^search$/i,
  vibes: /^vibes$/i,
  create: /^create$/i
};

let contextValid = true;

/**
 * Find and hide/show the four menu items based on prefs.
 */
function applyPreferences(prefs) {
  const clickables = document.querySelectorAll('a, button, [role="button"], [role="menuitem"], [role="link"]');
  for (const el of clickables) {
    const text = (el.textContent || '').trim();
    for (const [key, regex] of Object.entries(LABELS)) {
      if (regex.test(text)) {
        el.style.display = (prefs[key] === false) ? 'none' : '';
        break;
      }
    }
  }
}

/**
 * Load prefs and apply. Guards against invalidated extension context.
 */
function loadAndApply() {
  if (!contextValid) return;
  try {
    chrome.storage.sync.get(DEFAULTS, (prefs) => {
      if (chrome.runtime.lastError) return;
      applyPreferences(prefs);
    });
  } catch (e) {
    contextValid = false;
  }
}

// Apply on load + delayed retries for SPA render
loadAndApply();
setTimeout(loadAndApply, 1500);
setTimeout(loadAndApply, 4000);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!contextValid) return;
  if (message.type === 'prefsUpdated') {
    applyPreferences(message.prefs);
    sendResponse({ ok: true });
  }
});
