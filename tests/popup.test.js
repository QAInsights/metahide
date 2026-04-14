/**
 * Popup script unit tests.
 * Tests toggle state management with mock Chrome APIs.
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// --- Chrome API mock ---
const storageSyncData = {};
let tabsQueryResult = [];

global.chrome = {
  storage: {
    sync: {
      get: jest.fn((defaults, callback) => {
        callback({ ...defaults, ...storageSyncData });
      }),
      set: jest.fn((data, callback) => {
        Object.assign(storageSyncData, data);
        if (callback) callback();
      })
    }
  },
  tabs: {
    query: jest.fn((opts, callback) => callback(tabsQueryResult)),
    sendMessage: jest.fn(() => Promise.resolve())
  },
  runtime: {
    lastError: null
  }
};

// --- Setup popup HTML ---
function loadPopupHtml() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'popup.html'), 'utf-8');
  // Strip the <script> tag so we can load popup.js manually after DOM setup
  document.documentElement.innerHTML = html.replace(/<script.*<\/script>/g, '');
}

// --- Tests ---

describe('popup.html', () => {
  beforeAll(() => {
    loadPopupHtml();
  });

  test('should have toggle checkboxes for all 4 items', () => {
    const keys = ['newchat', 'search', 'vibes', 'create'];
    for (const key of keys) {
      const el = document.getElementById(`toggle-${key}`);
      expect(el).not.toBeNull();
      expect(el.type).toBe('checkbox');
    }
  });

  test('should have all toggles checked by default', () => {
    const keys = ['newchat', 'search', 'vibes', 'create'];
    for (const key of keys) {
      const el = document.getElementById(`toggle-${key}`);
      expect(el.checked).toBe(true);
    }
  });

  test('should not have pinned or history toggles', () => {
    expect(document.getElementById('toggle-pinned')).toBeNull();
    expect(document.getElementById('toggle-history')).toBeNull();
  });

  test('should have footer with 3 links', () => {
    const footer = document.querySelector('.footer');
    expect(footer).not.toBeNull();
    const links = footer.querySelectorAll('a');
    expect(links.length).toBe(3);
  });

  test('should have About link to qainsights.com', () => {
    const link = document.querySelector('.footer a[title="About"]');
    expect(link).not.toBeNull();
    expect(link.href).toContain('qainsights.com');
    expect(link.target).toBe('_blank');
  });

  test('should have GitHub link', () => {
    const link = document.querySelector('.footer a[title="GitHub"]');
    expect(link).not.toBeNull();
    expect(link.href).toContain('github.com/QAInsights/metahide');
    expect(link.target).toBe('_blank');
  });

  test('should have Donate link', () => {
    const link = document.querySelector('.footer a[title="Donate"]');
    expect(link).not.toBeNull();
    expect(link.href).toContain('buymeacoffee.com/qainsights');
    expect(link.target).toBe('_blank');
  });

  test('should have proper HTML structure with header', () => {
    expect(document.querySelector('.header h1').textContent).toBe('MetaHide');
  });

  test('should have toggle labels matching item names', () => {
    const labels = document.querySelectorAll('.toggle-label');
    const expected = ['New Chat', 'Search', 'Vibes', 'Create'];
    expect(labels.length).toBe(expected.length);
    labels.forEach((label, i) => {
      expect(label.textContent).toBe(expected[i]);
    });
  });
});

describe('popup.js logic', () => {
  let popupExports;

  beforeEach(() => {
    loadPopupHtml();
    Object.keys(storageSyncData).forEach(k => delete storageSyncData[k]);
    chrome.storage.sync.get.mockClear();
    chrome.storage.sync.set.mockClear();
    chrome.tabs.query.mockClear();
    chrome.tabs.sendMessage.mockClear();

    // Load popup.js
    jest.resetModules();
    popupExports = require('../popup.js');

    // Trigger DOMContentLoaded
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  test('loadPreferences should read from chrome.storage.sync', () => {
    expect(chrome.storage.sync.get).toHaveBeenCalled();
  });

  test('loadPreferences should set toggle states from stored prefs', () => {
    storageSyncData.newchat = false;
    storageSyncData.search = false;

    chrome.storage.sync.get.mockClear();
    popupExports.loadPreferences();

    const nc = document.getElementById('toggle-newchat');
    const sr = document.getElementById('toggle-search');
    expect(nc.checked).toBe(false);
    expect(sr.checked).toBe(false);
  });

  test('getCurrentPrefs should reflect checkbox states', () => {
    document.getElementById('toggle-newchat').checked = false;
    document.getElementById('toggle-vibes').checked = false;
    const prefs = popupExports.getCurrentPrefs();
    expect(prefs.newchat).toBe(false);
    expect(prefs.search).toBe(true);
    expect(prefs.vibes).toBe(false);
    expect(prefs.create).toBe(true);
  });

  test('saveAndNotify should save prefs to storage', () => {
    document.getElementById('toggle-search').checked = false;
    popupExports.saveAndNotify();
    expect(chrome.storage.sync.set).toHaveBeenCalled();
    const savedData = chrome.storage.sync.set.mock.calls[0][0];
    expect(savedData.search).toBe(false);
  });

  test('saveAndNotify should send message to meta.ai tab', () => {
    tabsQueryResult = [{ id: 42, url: 'https://www.meta.ai/chat' }];
    popupExports.saveAndNotify();
    expect(chrome.tabs.query).toHaveBeenCalled();
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ type: 'prefsUpdated' })
    );
  });

  test('saveAndNotify should not send message to non-meta.ai tab', () => {
    tabsQueryResult = [{ id: 99, url: 'https://www.google.com' }];
    popupExports.saveAndNotify();
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });

  test('toggle change should trigger saveAndNotify', () => {
    const toggle = document.getElementById('toggle-create');
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    expect(chrome.storage.sync.set).toHaveBeenCalled();
  });
});
