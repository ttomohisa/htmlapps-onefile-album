const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { gunzipSync } = require('node:zlib');

const rejected = [
  "コメント・章の保存後は対応する操作へ、画像を外した後は近くの残った画像の操作へフォーカスを戻します。操作が表示されない場合や「すべて外す」の後は、表示中の現在のスマホタブを優先し、表示されなければ画像追加欄へ戻します。画面は切り替えません。",
  "After saving a comment or chapter, focus returns to its action; after removing an image, it moves to a nearby remaining image action. If unavailable, and after Clear, focus prefers the current visible mobile tab, then the image input, without changing screens.",
  "ヘルプを開いている間は背景ページをスクロールせず、ヘルプ内をスクロールできます。",
  "While Help is open, scroll within Help; the background page stays in place.",
  "生成ビューアはフル画像を全件同時に画像として展開しません。一覧は小さいサムネイル、1枚表示は現在画像の前後だけをBlob URL化します。",
  "The generated viewer does not expand every full image at once. The grid uses small thumbnails; the single-image viewer creates Blob URLs only around the current image.",
  "生成ビューアはフル画像を一度に全部デコードせず、現在画像の前後だけBlob URL化します。一覧は小さいサムネイルだけを使います。",
  "The generated viewer does not decode every full image at once. It uses small thumbnails for the grid and Blob URLs only around the current image."
];

test('help contains user guidance rather than implementation or layout audit prose', () => {
  const root = path.join(__dirname, '..');
  const files = ['src/index.template.html', 'dist/index.html', 'dist/index.self-extract.html',
    ...fs.readdirSync(root).filter(name => name.endsWith('.html'))];
  for (const file of files) {
    const filename = path.join(root, file);
    if (!fs.existsSync(filename)) continue;
    let html = fs.readFileSync(filename, 'utf8');
    const payload = html.match(/<script id="self-extract-payload"[^>]*>([\s\S]*?)<\/script>/);
    if (payload) html = gunzipSync(Buffer.from(payload[1].replace(/\s/g, ''), 'base64')).toString('utf8');
    for (const copy of rejected) assert.ok(!html.includes(copy), `${file}: remove internal-facing help copy: ${copy}`);
  }
});
