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
  newchat: 'new chat',
  search: 'search',
  vibes: 'vibes',
  create: 'create'
};

let contextValid = true;

/**
 * Get direct text content of an element (ignoring child element text).
 */
function getDirectText(el) {
  return Array.from(el.childNodes)
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .map(n => n.textContent.trim())
    .join('')
    .toLowerCase();
}

/**
 * Walk up to find the nearest interactive/row-level parent to hide.
 */
function findRowParent(el) {
  let current = el;
  for (let i = 0; i < 6; i++) {
    if (!current.parentElement) break;
    current = current.parentElement;
    const tag = current.tagName.toLowerCase();
    const role = (current.getAttribute('role') || '').toLowerCase();
    if (tag === 'a' || tag === 'button' || tag === 'li' ||
        role === 'button' || role === 'menuitem' || role === 'link') {
      return current;
    }
  }
  return null;
}

/**
 * Find and hide/show the four menu items based on prefs.
 * Scans all elements for direct text matches, then hides the
 * nearest interactive parent (the full row).
 */
function applyPreferences(prefs) {
  const found = {};
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const directText = getDirectText(node);
    if (!directText) continue;

    for (const [key, label] of Object.entries(LABELS)) {
      if (found[key]) continue;
      if (directText === label) {
        // Find the row-level parent to hide (a, button, li, etc.)
        const row = findRowParent(node) || node;
        row.style.display = (prefs[key] === false) ? 'none' : '';
        found[key] = true;
        break;
      }
    }

    // Stop early if all found
    if (Object.keys(found).length === ITEM_KEYS.length) break;
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
