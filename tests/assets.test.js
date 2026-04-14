/**
 * Asset validation tests.
 * Ensures all required files exist and meet Chrome Web Store requirements.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

describe('required files', () => {
  const requiredFiles = [
    'manifest.json',
    'content.js',
    'popup.html',
    'popup.js',
    'styles.css',
    'icons/icon16.png',
    'icons/icon48.png',
    'icons/icon128.png'
  ];

  test.each(requiredFiles)('%s should exist', (file) => {
    expect(fs.existsSync(path.join(root, file))).toBe(true);
  });
});

describe('icon files', () => {
  test('icon files should be valid PNGs (magic bytes)', () => {
    const sizes = [16, 48, 128];
    const pngMagic = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    for (const size of sizes) {
      const iconPath = path.join(root, 'icons', `icon${size}.png`);
      const buf = fs.readFileSync(iconPath);
      expect(buf.length).toBeGreaterThan(8);
      expect(buf.subarray(0, 8).equals(pngMagic)).toBe(true);
    }
  });

  test('icon files should not be empty', () => {
    const sizes = [16, 48, 128];
    for (const size of sizes) {
      const iconPath = path.join(root, 'icons', `icon${size}.png`);
      const stats = fs.statSync(iconPath);
      expect(stats.size).toBeGreaterThan(50);
    }
  });
});

describe('popup.html', () => {
  test('should be valid HTML with DOCTYPE', () => {
    const html = fs.readFileSync(path.join(root, 'popup.html'), 'utf-8');
    expect(html).toMatch(/<!DOCTYPE html>/i);
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  test('should not contain inline scripts (CSP compliance)', () => {
    const html = fs.readFileSync(path.join(root, 'popup.html'), 'utf-8');
    // Should not have onclick, onload, or inline <script> content
    expect(html).not.toMatch(/\son\w+\s*=/i);
    // Script tags should only reference external files
    const scriptTags = html.match(/<script[^>]*>/g) || [];
    for (const tag of scriptTags) {
      expect(tag).toContain('src=');
    }
  });

  test('should not use eval or unsafe constructs', () => {
    const js = fs.readFileSync(path.join(root, 'popup.js'), 'utf-8');
    expect(js).not.toMatch(/\beval\s*\(/);
    expect(js).not.toMatch(/new\s+Function\s*\(/);
    expect(js).not.toMatch(/innerHTML\s*=/);
  });
});

describe('content.js', () => {
  test('should not use eval or unsafe constructs', () => {
    const js = fs.readFileSync(path.join(root, 'content.js'), 'utf-8');
    expect(js).not.toMatch(/\beval\s*\(/);
    expect(js).not.toMatch(/new\s+Function\s*\(/);
    expect(js).not.toMatch(/innerHTML\s*=/);
    expect(js).not.toMatch(/document\.write\s*\(/);
  });

  test('should not make external network requests', () => {
    const js = fs.readFileSync(path.join(root, 'content.js'), 'utf-8');
    expect(js).not.toMatch(/\bfetch\s*\(/);
    expect(js).not.toMatch(/XMLHttpRequest/);
    expect(js).not.toMatch(/\.ajax\s*\(/);
  });

  test('should not access sensitive APIs', () => {
    const js = fs.readFileSync(path.join(root, 'content.js'), 'utf-8');
    expect(js).not.toMatch(/chrome\.cookies/);
    expect(js).not.toMatch(/chrome\.history/);
    expect(js).not.toMatch(/chrome\.downloads/);
    expect(js).not.toMatch(/chrome\.webRequest/);
  });
});
