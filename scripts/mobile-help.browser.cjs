'use strict';
// Run against the official generated files in the unprivileged PR build job.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const buildSelector = '#buildInfoDetails';

async function main() {
  const results = path.resolve(__dirname, '..', 'test-results', 'mobile-help');
  fs.mkdirSync(results, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const file of ['dist/index.html', 'dist/index.self-extract.html', 'onefile-album.html']) {
      for (const language of ['ja', 'en']) {
        for (const [width, height] of [[1360, 900], [681, 568], [680, 568], [360, 640], [320, 568], [393, 252]]) {
          const context = await browser.newContext({ viewport: { width, height }, locale: language, reducedMotion: 'reduce' });
          const page = await context.newPage();
          const errors = [], requests = [];
          page.on('pageerror', error => errors.push(error.message));
          page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
          page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
          const label = `${file} ${language} ${width}x${height}`;
          try {
            await page.goto(pathToFileURL(path.resolve(__dirname, '..', file)).href);
            await page.locator('#helpButton').waitFor();
            if (await page.locator('html').getAttribute('lang') !== language) await page.locator('#languageButton').click();
            assert.equal(await page.locator('[data-i18n="localBadge"]').textContent(), language === 'en' ? 'Fully local processing' : '完全ローカル処理', label);
            assert.ok(await page.locator('.local-badge').evaluate(el => {
              const box = el.getBoundingClientRect();
              const range = document.createRange();
              range.selectNodeContents(el.querySelector('[data-i18n="localBadge"]'));
              return box.left >= 0 && box.right <= innerWidth && el.scrollWidth <= el.clientWidth + 1
                && [...range.getClientRects()].every(rect => rect.left >= box.left - 1 && rect.right <= box.right + 1 && rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1);
            }), label + ': badge text fits');
            assert.equal(await page.locator('main #buildVersion').count(), 0, label);
            assert.equal(await page.locator('footer').isVisible(), width > 680, label);
            assert.equal(await page.locator('.mobile-tabbar').isVisible(), width <= 680, label + ': functional navigation preserved');

            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), label + ': page width');

            await page.locator('#helpButton').click();
            const body = page.locator('#helpDialog .dialog-body');
            assert.ok(await body.evaluate(el => el.lastElementChild.contains(document.querySelector('#buildVersion'))), label + ': build is final body child');
            assert.equal(await page.locator(buildSelector).count(), 1, label);
            assert.equal(await page.locator(buildSelector).isVisible(), width > 680, label);
            for (const id of ['buildVersion', 'builtAt', 'dependencyCount']) assert.equal(await page.locator('#' + id).count(), 1, label);

            if (width > 680) {
              const summary = page.locator(buildSelector).locator('summary');
              await summary.focus();
              await page.keyboard.press('Enter');
              assert.equal(await page.locator(buildSelector).getAttribute('open'), '', label);
              assert.notEqual(await page.locator('#buildVersion').innerText(), '—', label);
              assert.notEqual(await page.locator('#builtAt').innerText(), '—', label);
            }
            await body.evaluate(el => { el.scrollTop = el.scrollHeight; });
            const finalItem = page.locator(width <= 680 ? '[data-i18n="helpLimit3"]' : '#dependencyCount');
            const finalBox = await finalItem.evaluate(el => {
              const text = el.firstChild, range = document.createRange();
              range.setStart(text, text.textContent.length - 1); range.setEnd(text, text.textContent.length);
              const r = range.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height };
            }), bodyBox = await body.boundingBox();
            console.log('GEOMETRY ' + label + ' ' + JSON.stringify({ finalBox, bodyBox, viewportHeight: height }));
            assert.ok(finalBox && bodyBox && finalBox.y >= 0 && finalBox.y + finalBox.height <= height && finalBox.y >= bodyBox.y - 1 && finalBox.y + finalBox.height <= bodyBox.y + bodyBox.height + 1, label + ': final Help item reachable');
            assert.ok(await body.evaluate(el => el.scrollWidth <= el.clientWidth + 1), label + ': Help width');
            const headerBox = await page.locator('#helpDialog .dialog-header').boundingBox();
            assert.ok(headerBox && headerBox.x >= 0 && headerBox.x + headerBox.width <= width && headerBox.y >= 0 && headerBox.y + headerBox.height <= height, label + ': header visible');
            if (file === 'dist/index.html' && [1360, 320].includes(width)) {
              await page.screenshot({ path: path.join(results, `help-${language}-${width}.png`) });
            }
            const dialogBox = await page.locator('#helpDialog').boundingBox();
            assert.ok(finalBox.y >= dialogBox.y - 1 && finalBox.y + finalBox.height <= dialogBox.y + dialogBox.height + 1, label + ': final item inside dialog');
            assert.ok(dialogBox.y > 1, label + ': top coordinate is genuine backdrop');
            const beforeScroll = await page.evaluate(() => scrollY);
            await page.mouse.move(2, 1);
            await page.mouse.wheel(0, 400);
            await page.waitForTimeout(100);
            assert.equal(await page.evaluate(() => scrollY), beforeScroll, label + ': background locked');
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('#helpDialog').isVisible(), false, label + ': Escape');
            await page.locator('#helpButton').click();
            await page.locator('#closeHelpButton').click();
            assert.equal(await page.locator('#helpDialog').isVisible(), false, label + ': reopen and Close');
            await page.locator('#helpButton').click();
            await page.mouse.click(2, 1);
            assert.equal(await page.locator('#helpDialog').isVisible(), false, label + ': backdrop');
            // Original synthetic canvas image only; no private file or external request.
            if (language === 'en' && width === 1360 && file.startsWith('dist/')) {
              const png = await page.evaluate(() => {
                const c = document.createElement('canvas'); c.width = 3; c.height = 2;
                const g = c.getContext('2d'); g.fillStyle = '#16624f'; g.fillRect(0, 0, 3, 2);
                return c.toDataURL('image/png').split(',')[1];
              });
              await page.setInputFiles('#fileInput', { name:'synthetic-layout.png', mimeType:'image/png', buffer:Buffer.from(png, 'base64') });
              await page.waitForFunction(() => !document.querySelector('#exportButton').disabled);
              assert.equal(await page.locator('#imageGrid img').count(), 1, label + ': image imported');
              await page.locator('#outputFilename').fill('mobile-help-album');
              await page.locator('#outputFilename').blur();
              const pending = page.waitForEvent('download'); await page.locator('#exportButton').click();
              const download = await pending;
              assert.equal(download.suggestedFilename(), 'mobile-help-album.html');
              const output = fs.readFileSync(await download.path(), 'utf8');
              assert.ok(output.includes('onefile-album-viewer:') && output.includes(png), label + ': original image embedded');
              const viewerPath = path.join(results, 'synthetic-viewer.html'); fs.writeFileSync(viewerPath, output);
              const viewer = await context.newPage();
              viewer.on('pageerror', error => errors.push(error.message));
              viewer.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
              await viewer.goto(pathToFileURL(viewerPath).href);
              await viewer.waitForFunction(() => [...document.images].some(image => image.complete && image.naturalWidth === 3 && image.naturalHeight === 2));
              await viewer.close(); fs.unlinkSync(viewerPath);
            }
            assert.deepEqual(errors, [], label + ': console errors');
            assert.deepEqual(requests, [], label + ': external runtime requests');
            console.log('PASS ' + label);
          } catch (error) {
            await page.screenshot({ path: path.join(results, `failure-${file.replace(/[^a-z0-9]/gi, '-')}-${language}-${width}x${height}.png`) }).catch(() => {});
            throw error;
          } finally {
            await context.close();
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
