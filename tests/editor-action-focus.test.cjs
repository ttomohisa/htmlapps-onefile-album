'use strict';
// Actual editor handlers + native-dialog lifecycle simulation. Geometry is tested
// in the browser separately; renders replace card controls as production does.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');
let source = fs.readFileSync(process.env.ALBUM_HTML || path.join(__dirname,'../src/index.template.html'),'utf8');
const payload = source.match(/<script id="self-extract-payload"[^>]*>([\s\S]*?)<\/script>/);
if (payload) source = require('node:zlib').gunzipSync(Buffer.from(payload[1],'base64')).toString('utf8');
const lines = source.split('\n');
const comment = id => `[data-item-id="${id}"] [data-action="comment"]`;
const remove = id => `[data-item-id="${id}"] [data-action="remove"]`;
const chapter = id => `[data-chapter-item-id="${id}"] [data-action="edit"]`;
function harness() {
  const nodes = new Map(), toasts = [], timers = [], renderHooks = [];
  let document;
  class Element {
    constructor(key,parent=null) { Object.assign(this,{key,parent,isConnected:true,hidden:false,disabled:false,visibility:'visible',open:false,value:'',textContent:'',listeners:{},dataset:{},focusCalls:[]}); }
    contains(node) { for (;node;node=node.parent) if (node===this) return true; return false; }
    getClientRects() { for(let n=this;n;n=n.parent) if(!n.isConnected||n.hidden||(n.key.endsWith('Dialog')&&!n.open)) return []; return [{}]; }
    closest(selector) { for(let n=this;n;n=n.parent) if((selector.includes('[hidden]')&&n.hidden)||(selector.includes('[inert]')&&n.inert)) return n; return null; }
    focus(options) { if(this.isConnected&&!this.disabled&&this.getClientRects().length&&this.visibility!=='hidden') { document.activeElement=this; this.focusCalls.push(options); } }
    showModal() { this.restore=document.activeElement;this.open=true; document.activeElement=this; }
    close() { this.open=false;if(this.restore?.isConnected)this.restore.focus();else document.activeElement=document.body; }
    addEventListener(type,fn) { (this.listeners[type] ||= []).push(fn); }
    emit(type,extra={}) { const event={target:this,preventDefault(){},stopPropagation(){},...extra};for(const fn of this.listeners[type]||[])fn(event); }
    getBoundingClientRect() { return {left:0,right:100,top:0,bottom:100}; }
    classList={toggle(){}};
  }
  const $ = key => { if(!nodes.has(key)) nodes.set(key,new Element(key)); return nodes.get(key); };
  document = {body:$('BODY'),documentElement:$('HTML'),activeElement:null,
    querySelector(selector) { if(selector==='dialog:modal'||selector==='dialog[open]')return [...nodes.values()].find(x=>x.open&&x.key.endsWith('Dialog'))||null;return nodes.get(selector)||null; },
    querySelectorAll(){return [];} };
  document.activeElement=document.body;
  for(const name of ['comment','chapter']) {
    const dialog=$(`#${name}Dialog`);
    for(const suffix of ['Input','SaveButton','CancelButton','DialogClose']) $(`#${name}${suffix}`).parent=dialog;
  }
  $('#chapterTitleInput').parent=$('#chapterDialog');
  $('#clearAllButton');$('#fileInput');$('[data-mobile-tab][aria-current="page"]').hidden=true;
  const items=[1,2,3].map(id=>({id,file:{name:`Synthetic-${id}.png`},chapterTitle:id===1?'First':id===3?'Last':'',comment:`Comment ${id}`,outputBlob:{id},thumbBlob:{id}}));
  function rebuild(onlyId) {
    for(const [key,node] of [...nodes]) if(key.startsWith('[data-item-id=')||key.startsWith('[data-chapter-item-id=')) {
      if(onlyId!==undefined&&!key.startsWith(`[data-item-id="${onlyId}"]`))continue;
      node.isConnected=false;if(document.activeElement===node)document.activeElement=document.body;nodes.delete(key);
    }
    for(const item of ctx.items) {
      if(onlyId===undefined||onlyId===item.id)for(const action of [comment,remove])$(action(item.id));
      if(onlyId===undefined&&item.chapterTitle)$(chapter(item.id));
    }
    $('#clearAllButton').disabled=!ctx.items.length;$('#clearAllButton').hidden=!ctx.items.length;
    for(const hook of renderHooks.splice(0))hook();
  }
  const ctx=vm.createContext({document,HTMLElement:Element,getComputedStyle:node=>({visibility:node.visibility}),$,items,
    selectedIds:new Set([1]),collapsedChapters:new Set([3]),generation:0,chapterEditId:0,commentEditId:0,
    t:key=>key,renderAll:()=>rebuild(),renderList:()=>rebuild(),renderCard:id=>rebuild(id),refreshViewerState(){},
    updateStatus(){},readyProcessingStatus:()=>'',populateChapterStartSelect(id){$('#chapterStartSelect').value=String(id);},updateCommentCounter(){},
    AppToast:{show(value){toasts.push(value);}},window:{},setTimeout(fn){timers.push(fn);},requestAnimationFrame(fn){timers.push(fn);},
    autoSortItems(){},applyCardSize(){},saveSettings(){},syncProcessingModeUi(){},invalidateConversions(){},removeSelected(){},setCustomFavicon(){}
  });
  for(const name of ['captureEditorFocus','visibleEditorFocusTarget','restoreEditorFocus','splitChapterSegments','removeIdsPreservingChapters','openCommentDialog','closeCommentDialog','saveComment','deleteComment','openChapterDialog','closeChapterDialog','saveChapter','deleteChapter','removeItem','clearAll']) {
    const line=lines.find(line=>new RegExp(`(?:async )?function ${name}\\(`).test(line));if(line)vm.runInContext(line.trim(),ctx);
  }
  vm.runInContext(lines.find(line=>line.includes('const AppConfirm=(()=>')),ctx);
  vm.runInContext(lines.find(line=>line.trim().startsWith("$('#autoSortSelect').addEventListener")),ctx);
  rebuild();
  return {ctx,$,document,toasts,nodes,afterRender(fn){renderHooks.push(fn);},flush(){while(timers.length)timers.shift()();},
    editComment(id=1){$(comment(id)).focus();ctx.openCommentDialog(id);this.flush();$('#commentInput').value='  Saved comment  ';},
    editChapter(id=1){$(chapter(id)).focus();ctx.openChapterDialog(id);this.flush();$('#chapterTitleInput').value='  Saved chapter  ';},
    async clear(accept=true){$('#clearAllButton').focus();const work=ctx.clearAll();this.flush();$(accept?'#appConfirmOk':'#appConfirmCancel').emit('click');await work;},
    focusKey(){return document.activeElement.key;},data(){return Array.from(ctx.items,x=>({id:x.id,comment:x.comment,chapterTitle:x.chapterTitle,file:x.file,outputBlob:x.outputBlob,thumbBlob:x.thumbBlob}));}
  };
}

// Each assertion fails if its production handler omits restoration after render.
test('Comment Save restores the rebuilt corresponding action and preserves image data',()=>{
  const h=harness(),before=h.data();h.editComment();h.$('#commentSaveButton').emit('click');
  assert.equal(h.focusKey(),comment(1));assert.equal(h.ctx.items[0].comment,'Saved comment');
  assert.deepEqual(h.data().map(x=>({...x,comment:before.find(y=>y.id===x.id).comment})),before);
  assert.ok(h.$(comment(1)).focusCalls.length);assert.equal(h.$(comment(1)).focusCalls.at(-1),undefined,'native focus must reveal an offscreen rebuilt action');
});
test('Chapter Edit Save restores the rebuilt action at its new starting image',()=>{
  const h=harness(),before=h.data();h.editChapter();h.$('#chapterStartSelect').value='2';h.$('#chapterSaveButton').emit('click');
  assert.equal(h.focusKey(),chapter(2));assert.equal(h.ctx.items[0].chapterTitle,'');assert.equal(h.ctx.items[1].chapterTitle,'Saved chapter');
  assert.deepEqual(h.data().map(x=>({...x,chapterTitle:before.find(y=>y.id===x.id).chapterTitle})),before);
});
test('Remove focuses the next surviving image action and Undo preserves exact order and chapters',()=>{
  const h=harness(),before=h.data();h.$(remove(1)).focus();h.ctx.removeItem(1);
  assert.equal(h.focusKey(),remove(2));assert.deepEqual(Array.from(h.ctx.items,x=>x.id),[2,3]);assert.equal(h.ctx.items[0].chapterTitle,'First');
  assert.equal(h.toasts.at(-1).duration,5000);h.toasts.at(-1).onAction();assert.deepEqual(h.data(),before);
});
test('Remove of the last card focuses the preceding surviving image action',()=>{
  const h=harness();h.$(remove(3)).focus();h.ctx.removeItem(3);assert.equal(h.focusKey(),remove(2));
});
test('Clear focuses the visible file input and keeps its five-second Undo data semantics',async()=>{
  const h=harness(),before=h.data();await h.clear();assert.equal(h.focusKey(),'#fileInput');assert.equal(h.$('#fileInput').focusCalls.at(-1),undefined,'native focus must reveal an offscreen file input');assert.equal(h.ctx.items.length,0);
  assert.equal(h.toasts.at(-1).duration,5000);h.toasts.at(-1).onAction();assert.deepEqual(h.data(),before);
});
for(const action of ['comment','chapter','remove','clear'])test(`${action} uses the current mobile tab when its preferred targets are hidden`,async()=>{
  const h=harness();h.$('#fileInput').hidden=true;h.$('[data-mobile-tab][aria-current="page"]').hidden=false;
  const hide=()=>{for(const [key,node] of h.nodes)if(key.startsWith('[data-item-id=')||key.startsWith('[data-chapter-item-id='))node.hidden=true;};
  if(action==='comment')h.editComment();if(action==='chapter')h.editChapter();if(action==='remove')h.$(remove(1)).focus();
  h.afterRender(hide);
  if(action==='comment')h.ctx.saveComment();if(action==='chapter')h.ctx.saveChapter();if(action==='remove')h.ctx.removeItem(1);if(action==='clear')await h.clear();
  assert.equal(h.focusKey(),'[data-mobile-tab][aria-current="page"]');
});
for(const reason of ['hidden','disconnected','disabled','visibility'])test(`restoration skips ${reason} candidates`,()=>{
  const h=harness();h.editComment();h.afterRender(()=>{const node=h.$(comment(1));if(reason==='visibility')node.visibility='hidden';else if(reason==='disconnected')node.isConnected=false;else node[reason]=true;});
  h.ctx.saveComment();assert.equal(h.focusKey(),'#fileInput');
});
for(const action of ['comment','chapter','remove','clear'])for(const takeover of ['modal','focus'])test(`${action} does not steal a newer ${takeover} owner`,async()=>{
  const h=harness();if(action==='comment')h.editComment();if(action==='chapter')h.editChapter();if(action==='remove')h.$(remove(1)).focus();
  h.afterRender(()=>takeover==='modal'?h.$('#newDialog').showModal():h.$('#newControl').focus());
  if(action==='comment')h.ctx.saveComment();if(action==='chapter')h.ctx.saveChapter();if(action==='remove')h.ctx.removeItem(1);if(action==='clear')await h.clear();
  assert.equal(h.focusKey(),takeover==='modal'?'#newDialog':'#newControl');
});
test('a programmatic mutation does not capture an unrelated focus owner',()=>{
  const h=harness();h.$('#newControl').focus();h.ctx.removeItem(1);assert.equal(h.focusKey(),'#newControl');
});
test('Clear approval after a newer modal opens keeps that modal focused',async()=>{
  const h=harness();h.$('#clearAllButton').focus();const work=h.ctx.clearAll();h.flush();h.$('#appConfirmOk').emit('click');h.$('#newDialog').showModal();await work;assert.equal(h.focusKey(),'#newDialog');
});
test('missing items and invalid chapter titles remain no-ops',async()=>{
  const h=harness(),before=h.data();h.$('#newControl').focus();h.ctx.commentEditId=99;h.ctx.saveComment();h.ctx.removeItem(99);
  h.ctx.chapterEditId=1;h.$('#chapterTitleInput').value=' ';h.$('#chapterStartSelect').value='1';h.ctx.saveChapter();
  assert.equal(h.focusKey(),'#newControl');assert.deepEqual(h.data(),before);assert.equal(h.toasts.length,0);
});
for(const kind of ['comment','chapter'])for(const close of ['cancel','escape'])test(`${kind} ${close} retains native trigger restoration without data changes`,()=>{
  const h=harness(),before=h.data();if(kind==='comment')h.editComment();else h.editChapter();
  h.$(close==='escape'?`#${kind}Dialog`:`#${kind}CancelButton`).emit(close==='escape'?'cancel':'click');
  assert.equal(h.focusKey(),kind==='comment'?comment(1):chapter(1));assert.deepEqual(h.data(),before);assert.equal(h.toasts.length,0);
});
test('Clear cancellation retains its trigger and leaves all data untouched',async()=>{
  const h=harness(),before=h.data();await h.clear(false);assert.equal(h.focusKey(),'#clearAllButton');assert.deepEqual(h.data(),before);assert.equal(h.toasts.length,0);
});
test('missing visible fallback is a safe no-op',()=>{
  const h=harness();h.ctx.items=h.ctx.items.slice(0,1);h.$('#fileInput').hidden=true;h.$(remove(1)).focus();assert.doesNotThrow(()=>h.ctx.removeItem(1));assert.equal(h.focusKey(),'BODY');
});

test('removing the only image focuses the visible file input',()=>{
  const h=harness();h.ctx.items=h.ctx.items.slice(0,1);h.$(remove(1)).focus();h.ctx.removeItem(1);assert.equal(h.focusKey(),'#fileInput');
});
test('Remove skips a hidden next action and finds another surviving image',()=>{
  const h=harness();h.$(remove(1)).focus();h.afterRender(()=>h.$(remove(2)).hidden=true);h.ctx.removeItem(1);assert.equal(h.focusKey(),remove(3));
});
for(const kind of ['comment','chapter'])test(`${kind} Save tolerates a disconnected original dialog trigger`,()=>{
  const h=harness();if(kind==='comment')h.editComment();else h.editChapter();
  h.$(kind==='comment'?comment(1):chapter(1)).isConnected=false;
  h.ctx[kind==='comment'?'saveComment':'saveChapter']();assert.equal(h.focusKey(),kind==='comment'?comment(1):chapter(1));
});
for(const property of ['hidden','inert'])test(`restoration skips a target in a ${property} ancestor`,()=>{
  const h=harness();h.editComment();h.afterRender(()=>{h.$(comment(1)).parent=h.$('#unavailableGroup');h.$('#unavailableGroup')[property]=true;});h.ctx.saveComment();assert.equal(h.focusKey(),'#fileInput');
});
test('Chapter Add Save preserves its still-visible initiating control',()=>{
  const h=harness();h.$('#addChapterButton').focus();h.ctx.openChapterDialog();h.flush();h.$('#chapterTitleInput').value='New chapter';h.ctx.saveChapter();assert.equal(h.focusKey(),'#addChapterButton');
});
test('a newer card owner at Clear approval is not claimed by the old action',async()=>{
  const h=harness();h.$('#clearAllButton').focus();const work=h.ctx.clearAll();h.flush();h.$('#appConfirmOk').emit('click');h.$(comment(2)).focus();await work;assert.equal(h.focusKey(),'BODY');assert.equal(h.$('#fileInput').focusCalls.length,0);
});
test('empty Clear is a no-op and does not open confirmation',async()=>{
  const h=harness();h.ctx.items=[];h.$('#newControl').focus();await h.ctx.clearAll();assert.equal(h.focusKey(),'#newControl');assert.equal(h.$('#appConfirmDialog').open,false);assert.equal(h.toasts.length,0);
});
test('Clear Escape retains its trigger and data',async()=>{
  const h=harness(),before=h.data();h.$('#clearAllButton').focus();const work=h.ctx.clearAll();h.flush();h.$('#appConfirmDialog').emit('cancel');await work;assert.equal(h.focusKey(),'#clearAllButton');assert.deepEqual(h.data(),before);
});

test('Help omits internal layout and focus audit prose',()=>{
  const help=source.split('APP:HELP:BEGIN')[1].split('APP:HELP:END')[0];
  assert.doesNotMatch(help,/data-i18n="helpActionFocus"/);
  assert.doesNotMatch(source,/helpActionFocus:'コメント・章の保存後は/);
  assert.doesNotMatch(source,/helpActionFocus:'After saving a comment or chapter,/);
});

// A rendered file input can still be covered by the sticky header on a short
// mobile viewport. The persistent selected tab is the mobile fallback first.
for(const action of ['comment','chapter','remove','clear'])test(`${action} prefers a visible current mobile tab even when the file input is rendered`,async()=>{
  const h=harness();h.$('[data-mobile-tab][aria-current="page"]').hidden=false;
  if(action==='comment')h.editComment();if(action==='chapter')h.editChapter();if(action==='remove')h.$(remove(1)).focus();
  h.afterRender(()=>{for(const [key,node] of h.nodes)if(key.startsWith('[data-item-id=')||key.startsWith('[data-chapter-item-id='))node.hidden=true;});
  if(action==='comment')h.ctx.saveComment();if(action==='chapter')h.ctx.saveChapter();if(action==='remove')h.ctx.removeItem(1);if(action==='clear')await h.clear();
  assert.equal(h.focusKey(),'[data-mobile-tab][aria-current="page"]');
  assert.equal(h.$('#fileInput').focusCalls.length,0,'the rendered file input must not take focus before the visible mobile tab');
});
