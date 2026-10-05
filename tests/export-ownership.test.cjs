'use strict';
// Executes the real standalone functions with small synthetic PNGs and controlled
// asynchronous reads. This is source-level coverage, not a browser test.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { test: nodeTest } = require('node:test');
const test = (name,fn) => nodeTest(name,{timeout:2000},fn);
const assert = require('node:assert/strict');
let source = fs.readFileSync(process.env.ALBUM_HTML || path.join(__dirname, '../src/index.template.html'), 'utf8');
if(source.includes('id="self-extract-payload"')){const payload=source.match(/<script id="self-extract-payload" type="application\/octet-stream">([\s\S]*?)<\/script>/)[1];source=require('node:zlib').gunzipSync(Buffer.from(payload,'base64')).toString('utf8');}
const lines = source.split('\n');
const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM1sAAAAASUVORK5CYII=';
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
function item(id, name, chapter='') {
  const file = new Blob([Buffer.from(tinyPng,'base64')], {type:'image/png'}); file.name=name;
  return {id,file,outputBlob:file,thumbBlob:file,originalBytes:file.size,outputBytes:file.size,width:1,height:1,
    outputWidth:1,outputHeight:1,outputMime:'image/png',outputExt:'png',chapterTitle:chapter,comment:'Synthetic image',capturedAt:0,status:'ready'};
}
function harness() {
  const nodes=new Map(), urls=new Map(), revoked=[], downloads=[], toasts=[], errors=[], timers=[];
  function $(id) {
    if (!nodes.has(id)) nodes.set(id, {value:'',checked:false,disabled:false,textContent:'',dataset:{},style:{},open:false,src:'',listeners:{},
      classList:{add(){},remove(){},toggle(){}}, showModal(){ if (this.throwOnShow) throw Error('show failed'); this.open=true; },
      close(){this.open=false; this.emit('close');}, removeAttribute(name){this[name]='';}, setAttribute(){},
      addEventListener(name,fn){(this.listeners[name] ||= []).push(fn);},emit(name){for(const fn of this.listeners[name]||[])fn({target:this,preventDefault(){}});},
      querySelector(){return $('#child');},querySelectorAll(){return [];},append(){},focus(){} });
    return nodes.get(id);
  }
  $('#albumTitle').value='Synthetic album'; $('#outputFilename').value='my edited album.html'; $('#quality').value='82';
  $('#maxDimensionPreset').value='0'; $('#maxDimensionCustom').value='2560'; $('#showNames').checked=true;
  let block=null, readCount=0, nextUrl=0, confirm=null;
  const refresh=()=>{if(ctx.refreshViewerState)ctx.refreshViewerState();ctx.updateSummary();};
  const ctx=vm.createContext({Blob,Buffer,Map,Set,Date,Promise,console:{error(...v){errors.push(v)},warn(){}},
    items:[item(1,'Alpha.png','First'),item(2,'Beta.png','Second')], selectedIds:new Set(),collapsedChapters:new Set(),
    generation:0,converting:false,exportBusy:false,webpDirty:false,thumbnailQueueCount:0,viewerJob:null,completionPreviewSnapshot:null,viewerResultSnapshot:null,viewerStatus:'',albumImportJob:null,
    completionPreviewUrl:'',previewObjectUrl:'',chapterEditId:1,commentEditId:1,language:'en',nextId:3,pointerDrag:null,
    faviconChoice:'album',faviconCustomData:'',settingsKey:'test', $, getProcessingMode:()=>ctx.mode, mode:'original',
    currentFaviconData:()=>ctx.favicon, favicon:'data:image/svg+xml,%3Csvg/%3E', t:key=>key,
    renderAll:refresh,renderList:refresh,renderCard:refresh,renderFaviconPicker:refresh,updateJourneyUi(){},updateStatus(){},readyProcessingStatus:()=>'',
    writeStorage(){},syncDimensionUi(){},syncProcessingModeUi(){},renderAddedFeedback(){},navigateToPhase(){},
    closeCommentDialog(){},closeChapterDialog(){},AppToast:{show(v){toasts.push(v)}},
    AppConfirm:{ask:async()=> confirm ? confirm.promise : true},
    setTimeout(fn,delay){if(delay===0)return setTimeout(fn,0);timers.push(fn);return timers.length;},clearTimeout(){},
    URL:{createObjectURL(blob){const u='blob:test-'+(++nextUrl);urls.set(u,blob);return u;},revokeObjectURL(u){revoked.push(u);urls.delete(u);}},
    document:{querySelectorAll(){return [];},querySelector(){return {checked:false}},body:{append(){}},
      createElement(){return {href:'',download:'',click(){if(ctx.failClick)throw Error('click failed');downloads.push({blob:urls.get(this.href),name:this.download});},remove(){}}}},
    window:{addEventListener(name,fn){$('#window').addEventListener(name,fn)}},
    File:class extends Blob {constructor(parts,name,opts){super(parts,opts);this.name=name;}},
    decodeBase64Bytes:s=>Buffer.from(s,'base64'),
    blobBase64:async blob=>{readCount++;const gate=block;block=null;if(gate)await gate.promise;if(ctx.failRead)throw Error('read failed');return Buffer.from(await blob.arrayBuffer()).toString('base64');}
  });
  const names=['formatBytes','escapeHtml','safeJson','safeNameBase','viewerMeta','viewerHead','viewerTail','buildViewerBlob','estimatedHtmlBytes',
    'exportViewer','previewViewer','autoSortItems','splitChapterSegments','removeIdsPreservingChapters','removeItem','removeSelected','clearAll',
    'quoteGeneratedKeys','isWebpPending','sizeLevel','saveComment','deleteComment','saveChapter','deleteChapter','saveSettings','invalidateConversions',
    'revokeOutput','prepareOriginal','blobFromBase64','clampCustomDimension','importAlbumFile','revokeItemUrls',
    'setViewerStatus','viewerOptionsKey','captureViewerSnapshot','isViewerSnapshotCurrent','isViewerJobCurrent','closeCompletionPreview','invalidateViewerOutput',
    'refreshViewerState','runViewer'];
  for(const n of names) {const line=lines.find(l=>new RegExp('(?:async )?function '+n+'\\(').test(l));if(line)vm.runInContext(line.trim(),ctx);}
  // Run the actual settings and preview close/pagehide registrations.
  for(const marker of ["$('#autoSortSelect').addEventListener", "$('#convertButton').addEventListener", "window.addEventListener('beforeunload'"]){
    const line=lines.find(l=>l.trim().startsWith(marker)); if(line) {
      // Non-export actions are intentionally not exercised by these registrations.
      for(const n of ['openChapterDialog','updateCommentCounter','applyCardSize','convertAll','optimizeAndExport'])if(!ctx[n])ctx[n]=()=>{};
      vm.runInContext(line,ctx);
    }
  }
  return {ctx,$,urls,revoked,downloads,toasts,errors,timers,refresh,
    block(){block=deferred();return block;},confirm(){confirm=deferred();return confirm;},clearConfirm(){confirm=null;},readCount:()=>readCount};
}
const parse=async(h,blob)=>h.ctx.parseOneFileAlbumHtml(await blob.text());
const names=parsed=>Array.from(parsed.data,x=>x.n);
async function noPublication(h,pending,gate){gate.resolve();assert.equal(await pending,false);assert.equal(h.downloads.length,0);assert.equal(h.$('#completionPreviewDialog').open,false);assert.equal(h.ctx.exportBusy,false);assert(!h.toasts.some(x=>x.message.startsWith('generated')));}

test('normal export retains order, chapters, metadata, edited filename and exact PNG payloads',async()=>{
  const h=harness();assert.equal(await h.ctx.exportViewer(),true);const saved=h.downloads[0];
  assert.equal(saved.name,'my edited album.html');const album=await parse(h,saved.blob);
  assert.deepEqual(names(album),['Alpha.png','Beta.png']);assert.deepEqual(Array.from(album.data,x=>x.ch),['First','Second']);
  assert.equal(album.meta.title,'Synthetic album');assert.equal(album.meta.showNames,true);
  for(const image of album.data){assert.equal(image.b,tinyPng);assert.equal(image.t,tinyPng);assert.equal(image.m,'image/png');assert.equal(image.e,'png');assert.equal(image.w,1);assert.equal(image.h,1);}
  assert.equal(h.ctx.exportBusy,false);assert.equal(h.$('#exportButton').disabled,false);assert.equal(h.$('#exportStatus').textContent,'generated');
  for(const fn of h.timers)fn();assert.equal(h.urls.size,0);
});

const mutations={
  removal:h=>h.ctx.removeItem(1),
  sort:h=>{h.ctx.items.forEach(x=>x.chapterTitle='');h.ctx.autoSortItems('name-desc');},
  clear:h=>h.ctx.clearAll(),
  replacement:h=>{h.ctx.items=[item(3,'Gamma.png')];h.ctx.generation++;h.refresh();},
  comment:h=>{h.$('#commentInput').value='Changed';h.ctx.saveComment();},
  chapter:h=>{h.$('#chapterTitleInput').value='New chapter';h.$('#chapterStartSelect').value='1';h.ctx.saveChapter();},
  title:h=>{h.$('#albumTitle').value='Changed title';h.$('#albumTitle').emit('input');},
  filename:h=>{h.$('#outputFilename').value='changed';h.$('#outputFilename').emit('input');},
  viewerOption:h=>{h.$('#showNames').checked=false;h.$('#showNames').emit('change');},
  processingOption:h=>{h.$('#quality').value='90';h.ctx.invalidateConversions();},
  favicon:h=>{h.ctx.favicon='data:image/png;base64,changed';h.ctx.saveSettings();},
  language:h=>{h.ctx.language='ja';h.refresh();},
  payload:h=>{h.ctx.items[0].outputBlob=new Blob(['replacement']);h.refresh();}
};
for(const [name,mutate] of Object.entries(mutations))for(const action of ['exportViewer','previewViewer'])test(`${action} rejects ${name} during a full-image read`,async()=>{
  const h=harness(),gate=h.block(),work=h.ctx[action]();assert.equal(h.ctx.exportBusy,true);await mutate(h);await noPublication(h,work,gate);
  assert.notEqual(h.$('#exportStatus').textContent,'generated');
});

test('snapshot is immutable even if a caller mutates the live object without rendering',async()=>{
  const h=harness(),gate=h.block(),work=h.ctx.exportViewer();h.ctx.items.reverse();h.ctx.items[1].comment='Later';gate.resolve();assert.equal(await work,false);assert.equal(h.downloads.length,0);
});

test('a duplicate request cannot start while the first confirmation is pending',async()=>{
  const h=harness();h.ctx.items[0].outputBytes=300*1048576;const confirm=h.confirm();const work=h.ctx.exportViewer();
  assert.equal(h.ctx.exportBusy,true);assert.equal(await h.ctx.previewViewer(),false);assert.equal(await h.ctx.exportViewer(),false);
  confirm.resolve(false);assert.equal(await work,false);assert.equal(h.ctx.exportBusy,false);assert.equal(h.readCount(),0);
  h.clearConfirm();h.ctx.items[0].outputBytes=68;assert.equal(await h.ctx.exportViewer(),true);
});

test('editing during confirmation invalidates the approval and prevents original fallback mutations',async()=>{
  const h=harness();h.ctx.mode='webp';h.ctx.webpDirty=true;const confirm=h.confirm();const work=h.ctx.exportViewer();
  h.ctx.removeItem(1);confirm.resolve(true);assert.equal(await work,false);assert.deepEqual(Array.from(h.ctx.items,x=>x.file.name),['Beta.png']);assert.equal(h.downloads.length,0);
});

test('confirmed original fallback and later repeat export work',async()=>{
  const h=harness();h.ctx.mode='webp';h.ctx.webpDirty=true;
  assert.equal(await h.ctx.exportViewer(),true);assert.equal((await parse(h,h.downloads[0].blob)).data[0].b,tinyPng);
  assert.equal(await h.ctx.exportViewer(),true);assert.equal(h.downloads.length,2);
});

test('an old read finishing cannot release or overwrite a newer request',async()=>{
  const h=harness(),oldGate=h.block(),old=h.ctx.exportViewer();h.ctx.removeItem(1);
  const newGate=h.block(),newer=h.ctx.previewViewer();assert.equal(h.readCount(),2);assert.equal(h.ctx.exportBusy,true);oldGate.resolve();assert.equal(await old,false);
  assert.equal(h.ctx.exportBusy,true);assert.equal(h.$('#previewViewerButton').disabled,true);newGate.resolve();assert.equal(await newer,true);
  assert.deepEqual(names(await parse(h,h.urls.get(h.ctx.completionPreviewUrl))),['Beta.png']);
});

test('preview close, reset, and editing revoke URLs and clear frames before another preview',async()=>{
  const h=harness();assert.equal(await h.ctx.previewViewer(),true);const first=h.ctx.completionPreviewUrl;
  h.$('#completionPreviewDialog').close();assert(h.revoked.includes(first));assert.equal(h.$('#completionPreviewFrame').src,'');
  assert.equal(await h.ctx.previewViewer(),true);const second=h.ctx.completionPreviewUrl;h.ctx.removeItem(1);
  assert.equal(h.$('#completionPreviewDialog').open,false);assert(h.revoked.includes(second));assert.equal(h.ctx.completionPreviewUrl,'');
  assert.equal(await h.ctx.previewViewer(),true);assert.deepEqual(names(await parse(h,h.urls.get(h.ctx.completionPreviewUrl))),['Beta.png']);
});

test('read errors remain visible, release the busy state, and allow retry',async()=>{
  const h=harness();h.ctx.failRead=true;assert.equal(await h.ctx.exportViewer(),false);assert.equal(h.ctx.exportBusy,false);
  assert(h.$('#exportStatus').textContent);assert.equal(h.urls.size,0);h.ctx.failRead=false;assert.equal(await h.ctx.exportViewer(),true);
});

test('failed download click releases its temporary object URL and allows retry',async()=>{
  const h=harness();h.ctx.failClick=true;assert.equal(await h.ctx.exportViewer(),false);assert.equal(h.urls.size,0);assert.equal(h.ctx.exportBusy,false);
  h.ctx.failClick=false;assert.equal(await h.ctx.exportViewer(),true);
});

test('failed preview opening clears its URL and frame',async()=>{
  const h=harness();h.$('#completionPreviewDialog').throwOnShow=true;assert.equal(await h.ctx.previewViewer(),false);
  assert.equal(h.urls.size,0);assert.equal(h.ctx.completionPreviewUrl,'');assert.equal(h.$('#completionPreviewFrame').src,'');
  h.$('#completionPreviewDialog').throwOnShow=false;assert.equal(await h.ctx.previewViewer(),true);
});

test('pagehide invalidates pending publication and an existing preview',async()=>{
  const h=harness(),gate=h.block(),work=h.ctx.previewViewer();h.$('#window').emit('pagehide');await noPublication(h,work,gate);
  assert.equal(await h.ctx.previewViewer(),true);h.$('#window').emit('pagehide');assert.equal(h.ctx.completionPreviewUrl,'');assert.equal(h.urls.size,0);
});

for(const action of ['exportViewer','previewViewer'])test(`${action} stops as soon as a replacement album starts reading`,async()=>{
  const h=harness(),gate=h.block(),work=h.ctx[action](),replacement=deferred();
  const importing=h.ctx.importAlbumFile({name:'replacement.html',text:()=>replacement.promise});
  await noPublication(h,work,gate);replacement.resolve('not an album');await importing;
});

test('normal preview matches export and import round-trips the preserved PNGs',async()=>{
  const h=harness();assert.equal(await h.ctx.exportViewer(),true);const saved=h.downloads[0];assert.equal(await h.ctx.previewViewer(),true);
  const exported=await parse(h,saved.blob),previewed=await parse(h,h.urls.get(h.ctx.completionPreviewUrl));
  assert.deepEqual(JSON.parse(JSON.stringify(exported.data)),JSON.parse(JSON.stringify(previewed.data)));
  await h.ctx.importAlbumFile({name:'round-trip.html',text:()=>saved.blob.text()});assert.equal(h.errors.length,0);
  assert.equal(h.ctx.completionPreviewUrl,'');assert.deepEqual(Array.from(h.ctx.items,x=>x.file.name),['Alpha.png','Beta.png']);
  assert.equal(await h.ctx.exportViewer(),true);const roundTrip=await parse(h,h.downloads[1].blob);assert.equal(roundTrip.data[0].b,tinyPng);assert.equal(roundTrip.data[1].b,tinyPng);
});

test('generation cannot start while thumbnails or conversion are pending',async()=>{
  const h=harness();h.ctx.thumbnailQueueCount=1;assert.equal(await h.ctx.exportViewer(),false);assert.equal(await h.ctx.previewViewer(),false);
  h.ctx.thumbnailQueueCount=0;h.ctx.converting=true;assert.equal(await h.ctx.exportViewer(),false);assert.equal(await h.ctx.previewViewer(),false);assert.equal(h.readCount(),0);
});

test('replacement reading keeps fresh export and preview attempts disabled until it settles',async()=>{
  const h=harness(),replacement=deferred();const work=h.ctx.importAlbumFile({name:'replacement.html',text:()=>replacement.promise});
  assert.equal(h.$('#exportButton').disabled,true);assert.equal(h.$('#previewViewerButton').disabled,true);
  assert.equal(await h.ctx.exportViewer(),false);assert.equal(await h.ctx.previewViewer(),false);
  replacement.resolve('invalid album');await work;assert.equal(h.$('#exportButton').disabled,false);assert.equal(await h.ctx.exportViewer(),true);
});

test('an older import cannot release the pending guard or replace a newer album',async()=>{
  const h=harness();await h.ctx.exportViewer();const original=await h.downloads[0].blob.text();const a=deferred(),b=deferred();
  const first=h.ctx.importAlbumFile({name:'older.html',text:()=>a.promise});const second=h.ctx.importAlbumFile({name:'newer.html',text:()=>b.promise});
  a.resolve(original);await first;assert.equal(h.$('#exportButton').disabled,true);assert.equal(await h.ctx.exportViewer(),false);
  b.resolve(original.replaceAll('Synthetic album','Newer album'));await second;assert.equal(h.$('#albumTitle').value,'Newer album');assert.equal(h.$('#exportButton').disabled,false);
});

test('clear while replacement is reading prevents its late result from repopulating the editor',async()=>{
  const h=harness();await h.ctx.exportViewer();const saved=await h.downloads[0].blob.text(),replacement=deferred();
  const work=h.ctx.importAlbumFile({name:'replacement.html',text:()=>replacement.promise});await h.ctx.clearAll();replacement.resolve(saved);await work;
  assert.equal(h.ctx.items.length,0);assert.equal(await h.ctx.exportViewer(),false);
});

test('ordinary filename sorting still exports every image exactly once in sorted order',async()=>{
  const h=harness();h.ctx.items.forEach(x=>x.chapterTitle='');h.ctx.autoSortItems('name-desc');
  assert.equal(await h.ctx.exportViewer(),true);assert.deepEqual(names(await parse(h,h.downloads[0].blob)),['Beta.png','Alpha.png']);
});

test('pending WebP preview is rejected without starting a transaction',async()=>{
  const h=harness();h.ctx.mode='webp';h.ctx.webpDirty=true;assert.equal(await h.ctx.previewViewer(),false);
  assert.equal(h.ctx.exportBusy,false);assert.equal(h.readCount(),0);assert.equal(h.toasts.at(-1).message,'previewPending');
});

test('an obsolete read failure cannot replace the success message of a newer export',async()=>{
  const h=harness(),gate=h.block(),old=h.ctx.exportViewer();h.ctx.removeItem(1);assert.equal(await h.ctx.exportViewer(),true);
  gate.reject(Error('obsolete read failed'));assert.equal(await old,false);assert.equal(h.$('#exportStatus').textContent,'generated');assert.equal(h.downloads.length,1);assert.equal(h.errors.length,0);
});

test('pagehide also rejects a replacement import that finishes later',async()=>{
  const h=harness();await h.ctx.exportViewer();const original=await h.downloads[0].blob.text(),gate=deferred();
  const work=h.ctx.importAlbumFile({name:'later.html',text:()=>gate.promise});h.$('#window').emit('pagehide');gate.resolve(original.replaceAll('Synthetic album','Late album'));await work;
  assert.equal(h.$('#albumTitle').value,'Synthetic album');assert.equal(h.ctx.albumImportJob,null);
});
