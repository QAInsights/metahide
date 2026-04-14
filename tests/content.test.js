/**
 * Content script unit tests.
 * Tests DOM manipulation logic with a mock Chrome API.
 * @jest-environment jsdom
 */

// --- Chrome API mock ---
const storageSyncData = {};
const messageListeners = [];

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
  runtime: {
    lastError: null,
    onMessage: {
      addListener: jest.fn((fn) => messageListeners.push(fn))
    }
  }
};

// Prevent auto-execution side effects by stubbing setTimeout
const origSetTimeout = global.setTimeout;
global.setTimeout = jest.fn((fn, ms) => {});

// Load content script and extract exports
const contentExports = require('../content.js');
const { getDirectText, findRowParent, applyPreferences, loadAndApply, _resetContext } = contentExports;

// Restore setTimeout
global.setTimeout = origSetTimeout;

// --- Helpers ---

function buildSidebar() {
  document.body.innerHTML = `
    <nav>
      <a href="/new"><span>New chat</span></a>
      <a href="/search"><span>Search</span></a>
      <a href="/vibes"><span>Vibes</span></a>
      <a href="/create"><span>Create</span></a>
    </nav>
  `;
}

function getLinks() {
  return {
    newchat: document.querySelector('a[href="/new"]'),
    search: document.querySelector('a[href="/search"]'),
    vibes: document.querySelector('a[href="/vibes"]'),
    create: document.querySelector('a[href="/create"]')
  };
}

// --- Tests ---

describe('content.js', () => {
  beforeEach(() => {
    buildSidebar();
    _resetContext();
    Object.keys(storageSyncData).forEach(k => delete storageSyncData[k]);
    chrome.storage.sync.get.mockClear();
  });

  describe('applyPreferences', () => {
    test('should hide items when prefs are false', () => {
      applyPreferences({ newchat: false, search: false, vibes: true, create: true });
      const links = getLinks();
      expect(links.newchat.style.display).toBe('none');
      expect(links.search.style.display).toBe('none');
      expect(links.vibes.style.display).toBe('');
      expect(links.create.style.display).toBe('');
    });

    test('should show all items when all prefs are true', () => {
      applyPreferences({ newchat: true, search: true, vibes: true, create: true });
      const links = getLinks();
      expect(links.newchat.style.display).toBe('');
      expect(links.search.style.display).toBe('');
      expect(links.vibes.style.display).toBe('');
      expect(links.create.style.display).toBe('');
    });

    test('should hide all items when all prefs are false', () => {
      applyPreferences({ newchat: false, search: false, vibes: false, create: false });
      const links = getLinks();
      expect(links.newchat.style.display).toBe('none');
      expect(links.search.style.display).toBe('none');
      expect(links.vibes.style.display).toBe('none');
      expect(links.create.style.display).toBe('none');
    });

    test('should restore hidden items when prefs change back to true', () => {
      applyPreferences({ newchat: false, search: false, vibes: false, create: false });
      applyPreferences({ newchat: true, search: true, vibes: true, create: true });
      const links = getLinks();
      expect(links.newchat.style.display).toBe('');
      expect(links.search.style.display).toBe('');
    });

    test('should not throw when sidebar is empty', () => {
      document.body.innerHTML = '';
      expect(() => {
        applyPreferences({ newchat: false, search: false, vibes: false, create: false });
      }).not.toThrow();
    });

    test('should handle partial prefs gracefully', () => {
      applyPreferences({ newchat: false });
      const links = getLinks();
      expect(links.newchat.style.display).toBe('none');
    });
  });

  describe('getDirectText', () => {
    test('should return only direct text node content', () => {
      const el = document.createElement('span');
      el.innerHTML = 'New chat<span>Ctrl+O</span>';
      expect(getDirectText(el)).toBe('new chat');
    });

    test('should return empty string for element with no text nodes', () => {
      const el = document.createElement('div');
      el.innerHTML = '<span>child only</span>';
      expect(getDirectText(el)).toBe('');
    });
  });

  describe('findRowParent', () => {
    test('should find nearest anchor parent', () => {
      const a = document.createElement('a');
      const span = document.createElement('span');
      const inner = document.createElement('span');
      span.appendChild(inner);
      a.appendChild(span);
      document.body.appendChild(a);
      expect(findRowParent(inner)).toBe(a);
    });

    test('should find nearest button parent', () => {
      const btn = document.createElement('button');
      const span = document.createElement('span');
      btn.appendChild(span);
      document.body.appendChild(btn);
      expect(findRowParent(span)).toBe(btn);
    });

    test('should find parent with role=menuitem', () => {
      const div = document.createElement('div');
      div.setAttribute('role', 'menuitem');
      const span = document.createElement('span');
      div.appendChild(span);
      document.body.appendChild(div);
      expect(findRowParent(span)).toBe(div);
    });

    test('should return null when no interactive parent exists', () => {
      const div = document.createElement('div');
      const span = document.createElement('span');
      div.appendChild(span);
      document.body.appendChild(div);
      expect(findRowParent(span)).toBeNull();
    });
  });

  describe('loadAndApply', () => {
    test('should call chrome.storage.sync.get', () => {
      loadAndApply();
      expect(chrome.storage.sync.get).toHaveBeenCalled();
    });

    test('should not throw when chrome.storage.sync.get throws', () => {
      chrome.storage.sync.get.mockImplementationOnce(() => { throw new Error('context invalidated'); });
      expect(() => loadAndApply()).not.toThrow();
    });
  });

  describe('message listener', () => {
    test('should register a message listener', () => {
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
      expect(messageListeners.length).toBeGreaterThan(0);
    });

    test('should apply prefs on prefsUpdated message', () => {
      buildSidebar();
      const sendResponse = jest.fn();
      const listener = messageListeners[0];
      listener(
        { type: 'prefsUpdated', prefs: { newchat: false, search: true, vibes: true, create: true } },
        {},
        sendResponse
      );
      const links = getLinks();
      expect(links.newchat.style.display).toBe('none');
      expect(sendResponse).toHaveBeenCalledWith({ ok: true });
    });

    test('should ignore non-prefsUpdated messages', () => {
      const sendResponse = jest.fn();
      const listener = messageListeners[0];
      listener({ type: 'otherMessage' }, {}, sendResponse);
      expect(sendResponse).not.toHaveBeenCalled();
    });
  });
});
