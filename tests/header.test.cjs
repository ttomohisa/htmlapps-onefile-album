'use strict';
// Execute the production translation, language initialization and click handler.
// Non-header rendering is a controlled boundary; real browser QA is separate.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { gunzipSync } = require('node:zlib');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const root = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'app.config.json'), 'utf8'));
let source = fs.readFileSync(process.env.ALBUM_HTML || path.join(root, 'src/index.template.html'), 'utf8');
const payload = source.match(/<script id="self-extract-payload"[^>]*>([\s\S]*?)<\/script>/);
if (payload) source = gunzipSync(Buffer.from(payload[1], 'base64')).toString('utf8');
const lines = source.split('\n');
function boot(browserLanguage, storage = new Map()) {
  const nodes = new Map();
  function $(id) {
    if (!nodes.has(id)) nodes.set(id, { textContent: '', dataset: {}, attrs: {}, title: '', listeners: {},
      setAttribute(key, value) { this.attrs[key] = value; },
      getAttribute(key) { return this.attrs[key]; },
      addEventListener(type, fn) { this.listeners[type] = fn; }
    });
    return nodes.get(id);
  }
  const privacy = $('#privacy'); privacy.dataset.i18n = 'localBadge';
  const document = { documentElement: {}, querySelectorAll: selector => selector === '[data-i18n]' ? [privacy] : [] };
  const context = vm.createContext({ $, document, navigator: { language: browserLanguage }, APP_CONFIG: config,
    BUILD_MANIFEST: {}, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    items: [], loadSettings() {}, syncProcessingModeUi() {}, renderAll() {}, renderFaviconPicker() {}, updateStatus() {},
    updateSummary() {}, setMobilePage() {}, updateMobileImageCount() {}
  });
  const translations = source.slice(source.indexOf('      const translations='), source.indexOf('      const $='));
  vm.runInContext(translations, context);
  for (const name of ['readStorage', 'detectLanguage', 't', 'applyLanguage']) {
    const definition = lines.find(line => line.includes(`function ${name}(`));
    assert.ok(definition, `${name} production function exists`);
    vm.runInContext(definition, context);
  }
  vm.runInContext(lines.find(line => line.includes('let language=readStorage(')), context);
  vm.runInContext(lines.find(line => line.trim().startsWith("$('#languageButton').addEventListener")), context);
  vm.runInContext(lines.find(line => line.trim().startsWith("loadSettings();$('#versionBadge')")), context);
  return { $, document, storage };
}
for (const initialLanguage of ['ja', 'en']) test(`${initialLanguage}: header target language, hints, privacy and config version persist across repeated clicks and reload`, () => {
  const app = boot(initialLanguage), button = app.$('#languageButton');
  for (let count = 0; count < 4; count++) {
    const language = count % 2 ? (initialLanguage === 'ja' ? 'en' : 'ja') : initialLanguage;
    const hint = language === 'ja' ? '英語に切り替え' : 'Switch to Japanese';
    assert.equal(button.textContent, language === 'ja' ? 'EN' : 'JA');
    assert.equal(button.getAttribute('aria-label'), hint);
    assert.equal(button.title, hint);
    assert.equal(app.document.documentElement.lang, language);
    assert.equal(app.$('#privacy').textContent, language === 'ja' ? '完全ローカル処理' : 'Fully local processing');
    assert.equal(app.$('#versionBadge').textContent, `v${config.version}`);
    button.listeners.click();
  }
  button.listeners.click();
  const restored = boot(initialLanguage, app.storage);
  assert.equal(restored.document.documentElement.lang, initialLanguage === 'ja' ? 'en' : 'ja');
  assert.equal(restored.$('#languageButton').textContent, initialLanguage === 'ja' ? 'JA' : 'EN');
});
test('initial Japanese header has canonical version and localized target hint', () => {
  assert.equal(source.match(/id="versionBadge">([^<]+)</)[1], `v${config.version}`);
  const button = source.match(/<button[^>]*id="languageButton"[^>]*>[^<]*<\/button>/)[0];
  assert.match(button, />EN<\/button>/);
  assert.match(button, /aria-label="英語に切り替え"/);
  assert.match(button, /title="英語に切り替え"/);
});
