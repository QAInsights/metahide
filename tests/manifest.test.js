/**
 * Manifest validation tests.
 * Ensures manifest.json meets Chrome Web Store requirements.
 */

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'manifest.json');
let manifest;

beforeAll(() => {
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  manifest = JSON.parse(raw);
});

describe('manifest.json', () => {
  test('should be valid JSON', () => {
    expect(manifest).toBeDefined();
    expect(typeof manifest).toBe('object');
  });

  test('should use Manifest V3', () => {
    expect(manifest.manifest_version).toBe(3);
  });

  test('should have a name', () => {
    expect(typeof manifest.name).toBe('string');
    expect(manifest.name.length).toBeGreaterThan(0);
    expect(manifest.name.length).toBeLessThanOrEqual(45);
  });

  test('should have a description', () => {
    expect(typeof manifest.description).toBe('string');
    expect(manifest.description.length).toBeGreaterThan(0);
    expect(manifest.description.length).toBeLessThanOrEqual(132);
  });

  test('should have a valid version string', () => {
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('should declare only required permissions', () => {
    const allowed = ['storage', 'activeTab', 'tabs'];
    for (const perm of manifest.permissions) {
      expect(allowed).toContain(perm);
    }
  });

  test('should have host_permissions limited to meta.ai', () => {
    expect(manifest.host_permissions).toBeDefined();
    for (const pattern of manifest.host_permissions) {
      expect(pattern).toMatch(/meta\.ai/);
    }
  });

  test('should have a default_popup defined', () => {
    expect(manifest.action).toBeDefined();
    expect(manifest.action.default_popup).toBe('popup.html');
  });

  test('should reference icon files that exist', () => {
    const sizes = ['16', '48', '128'];
    for (const size of sizes) {
      const iconPath = manifest.icons[size];
      expect(iconPath).toBeDefined();
      const fullPath = path.join(__dirname, '..', iconPath);
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });

  test('should have content_scripts targeting meta.ai', () => {
    expect(manifest.content_scripts).toBeDefined();
    expect(manifest.content_scripts.length).toBeGreaterThan(0);
    const cs = manifest.content_scripts[0];
    expect(cs.js).toContain('content.js');
    for (const match of cs.matches) {
      expect(match).toMatch(/meta\.ai/);
    }
  });

  test('should set run_at to document_idle', () => {
    expect(manifest.content_scripts[0].run_at).toBe('document_idle');
  });

  test('should not request dangerous permissions', () => {
    const dangerous = [
      'debugger', 'declarativeNetRequest', 'downloads',
      'history', 'management', 'nativeMessaging',
      'pageCapture', 'privacy', 'proxy', 'webNavigation',
      'webRequest', 'webRequestBlocking'
    ];
    for (const perm of dangerous) {
      expect(manifest.permissions).not.toContain(perm);
    }
  });

  test('should not contain background scripts (not needed)', () => {
    expect(manifest.background).toBeUndefined();
  });

  test('should not contain externally_connectable', () => {
    expect(manifest.externally_connectable).toBeUndefined();
  });

  test('should not contain content_security_policy overrides', () => {
    expect(manifest.content_security_policy).toBeUndefined();
  });
});
