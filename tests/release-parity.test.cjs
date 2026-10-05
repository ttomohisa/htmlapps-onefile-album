'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const zlib=require('node:zlib');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('src/index.template.html');
const readable=read('dist/index.html');
const published=read('onefile-album.html');
const wrapper=read('dist/index.self-extract.html');
const payload=wrapper.match(/<script id="self-extract-payload" type="application\/octet-stream">([\s\S]*?)<\/script>/)[1];
const restored=zlib.gunzipSync(Buffer.from(payload,'base64')).toString('utf8');
const runtime=html=>html.slice(html.indexOf('      const translations='));
test('tracked root and gzip payload match the official readable build byte-for-byte',()=>{
  assert.equal(published,readable);assert.equal(restored,readable);
});
test('all release variants carry the current editable application runtime',()=>{
  for(const html of [readable,published,restored])assert.equal(runtime(html),runtime(source));
});
test('all executable inline scripts parse without launching a browser',()=>{
  for(const [name,html] of [['source',source],['readable',readable],['root',published],['restored',restored],['loader',wrapper]]){
    let count=0;
    for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if(/type=["'](?:application\/json|application\/octet-stream)["']/.test(match[1]))continue;
      new vm.Script(match[2],{filename:name+'-'+(++count)});
    }
    assert(count>0);
  }
});
