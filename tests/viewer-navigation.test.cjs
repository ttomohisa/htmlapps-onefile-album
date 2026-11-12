'use strict';
// Execute the real generated-viewer script with synthetic images and controlled
// DOM events. This does not claim native browser/device gesture validation.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const path = require('node:path');
const input = process.env.ALBUM_HTML || path.join(__dirname, '../src/index.template.html');
let source = fs.readFileSync(input, 'utf8');
if(source.includes('id="self-extract-payload"')) source=require('node:zlib').gunzipSync(Buffer.from(source.match(/<script id="self-extract-payload" type="application\/octet-stream">([\s\S]*?)<\/script>/)[1],'base64')).toString('utf8');
const line = source.slice(source.indexOf('function viewerTail()'), source.indexOf('function viewerMeta()'));
const maker = vm.createContext({});
vm.runInContext(line, maker);
const tail = maker.viewerTail();
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM1sAAAAASUVORK5CYII=';
const fixture = ['Alpha.png','Beta.png','Gamma.png'].map((n,i) => ({n,w:1,h:1,m:'image/png',e:'png',b:png,t:png,c:i===1?'hidden':'match',ch:i===0?'Chapter A':i===2?'Chapter B':''}));
function harness(data=fixture, savedPreferences={}) {
  let persisted = {...savedPreferences};
  const nodes = new Map(), intervals = new Map(), timeouts = new Map(), urls = new Map(), downloads = [];
  let nextTimer = 0, nextUrl = 0;
  function node(id) {
    if(nodes.has(id)) return nodes.get(id);
    const classes = new Set();
    const n = {id, tagName:'DIV', value:'', checked:false, hidden:false, open:false, isContentEditable:false, textContent:'', innerHTML:'', dataset:{}, children:[], listeners:{},
      clientWidth:100,clientHeight:100,style:{setProperty(){}},
      classList:{add:x=>classes.add(x), remove:x=>classes.delete(x), contains:x=>classes.has(x), toggle(x,b){b ??= !classes.has(x); b?classes.add(x):classes.delete(x);}},
      addEventListener(type, fn){(this.listeners[type] ||= []).push(fn);},
      dispatch(type, props={}){const e = {type,target:this,pointerId:1,pointerType:'touch',button:0,clientX:0,clientY:0,preventDefault(){this.defaultPrevented=true;}, ...props}; for(const f of this.listeners[type]||[])f(e); return e;},
      append(x){this.children.push(x);},setAttribute(k,v){this[k]=v;},remove(){},focus(){document.activeElement=this;},contains(other){return this===other||this.children.some(x=>x.contains(other))},select(){},blur(){},
      closest(){return null;},showModal(){this.open=true;},close(){this.open=false;},setPointerCapture(){},releasePointerCapture(){},click(){downloads.push(this.download);}
    }; Object.defineProperty(n,'innerHTML',{get(){return this._html||'';},set(value){this._html=value;this.children=[];}}); nodes.set(id,n); return n;
  }
  const document = node('document');
  document.querySelector = node;
  document.querySelectorAll = selector => selector==='.thumb' ? node('#thumbs').children.filter(n=>n.className==='thumb') : [];
  document.createElement = tag=>{const n=node(`created-${nodes.size}`);n.tagName=tag.toUpperCase();return n;};
  document.documentElement = node('html');document.body=node('body');document.fullscreenElement=null;
  const ctx=vm.createContext({console,Blob,Buffer,Map,Set,Date,Intl,Uint8Array,
    atob:s=>Buffer.from(s,'base64').toString('binary'),document,window:node('window'),
    location:{pathname:'/synthetic-album.html'},localStorage:{getItem(){return JSON.stringify(persisted);},setItem(key,value){persisted=JSON.parse(value);}},
    fullscreenAutoHide:node('#fullscreenAutoHide'),
    URL:{createObjectURL(blob){const id='blob:synthetic-'+(++nextUrl);urls.set(id,blob);return id;},revokeObjectURL(id){urls.delete(id);}},
    requestAnimationFrame:fn=>fn(),setTimeout(fn){const id=++nextTimer;timeouts.set(id,fn);return id;},clearTimeout:id=>timeouts.delete(id),
    setInterval(fn){const id=++nextTimer;intervals.set(id,fn);return id;},clearInterval:id=>intervals.delete(id)
  });
  node('#albumLayout').clientWidth=1000;
  node('#actionsMenu').hidden=true;node('#searchPanel').hidden=true;for(const id of ['#zoomOut','#zoomIn','#searchToggle','#download','#settings','#info'])node('#actionsMenu').append(node(id));
  const js='const M='+JSON.stringify({title:'Synthetic probe',showNames:true,labels:{searchResults:'results',searchNoResults:'No matching images',play:'Play',pause:'Pause'}})+'; const D='+JSON.stringify(data).slice(0,-1)+tail.slice(0,tail.indexOf('</script>'));
  vm.runInContext(js,ctx);
  vm.runInContext('globalThis.inspect = () => ({i,scale,tx,ty,timer,pointerCount:pointers.size,pinch,single,visible:searchIndexes(),count:count.textContent,src:main.src,alt:main.alt,caption:caption.textContent,chapter:annotationChapter.textContent,comment:annotationComment.textContent}); globalThis.go = show;',ctx);
  return {ctx,node,document,urls,downloads,intervals,timeouts,preferences:()=>persisted,state:()=>JSON.parse(JSON.stringify(ctx.inspect())),
    key(key,props={}){return document.dispatch('keydown',{key,code:key===' '?'Space':key,target:node('body'),...props});},
    gesture(type,dx=-100,dy=0){const stage=node('#stage');stage.dispatch('pointerdown',{clientX:200,clientY:200});stage.dispatch('pointermove',{clientX:200+dx,clientY:200+dy});stage.dispatch(type,{clientX:200+dx,clientY:200+dy});},
    search(text){node('#searchInput').value=text;node('#searchInput').oninput();}
  };
}

const pointer=(h,type,id,x,y=100)=>h.node('#stage').dispatch(type,{pointerId:id,clientX:x,clientY:y});
const verifyImage=(h,index,count)=>{
  assert.equal(h.state().i,index);assert.equal(h.state().alt,fixture[index].n);
  assert.equal(h.state().caption,fixture[index].n);assert.equal(h.state().comment,fixture[index].c);
  assert.equal(h.state().count,count);assert(h.urls.has(h.state().src));
  const active=h.node('#thumbs').children.filter(n=>n.className==='thumb'&&n.classList.contains('active'));
  assert.equal(active.length,1);assert.equal(active[0].dataset.index,String(index));
};
test('Home and End select the first and last album images with viewer metadata',()=>{
  const h=harness();h.ctx.go(1);
  assert.equal(h.key('Home').defaultPrevented,true);verifyImage(h,0,'1 / 3');
  assert.equal(h.key('End').defaultPrevented,true);verifyImage(h,2,'3 / 3');
  assert.equal(h.state().chapter,'Chapter B');
});
test('Home and End stay inside noncontiguous search results and reset zoom only on a move',()=>{
  const h=harness();h.search('match');assert.deepEqual(h.state().visible,[0,2]);h.key('+');
  h.key('End');verifyImage(h,2,'2 / 2');assert.equal(h.state().scale,1);
  h.key('+');h.key('Home');verifyImage(h,0,'1 / 2');assert.equal(h.state().scale,1);
});
for(const key of ['Home','End'])test(key+' preserves zoom and URLs when already at its boundary',()=>{
  const h=harness();h.ctx.go(key==='Home'?0:2);h.key('+');const before=h.state(),urlCount=h.urls.size;
  assert.equal(h.key(key).defaultPrevented,true);assert.deepEqual(h.state(),before);assert.equal(h.urls.size,urlCount);
});
test('boundary keys with no search results do not consume the key or reset the displayed image',()=>{
  const h=harness();h.ctx.go(1);h.search('missing');h.key('+');const before=h.state();
  for(const key of ['Home','End']) {assert.notEqual(h.key(key).defaultPrevented,true);assert.deepEqual(h.state(),before);}
});
test('one matching image and a one-image album retain their view for boundary keys',()=>{
  for(const h of [harness(),harness([fixture[0]])]){
    if(h.state().visible.length>1)h.search('Beta');h.key('+');const before=h.state();
    for(const key of ['Home','End']) {assert.equal(h.key(key).defaultPrevented,true);assert.deepEqual(h.state(),before);}
  }
});
const guarded={
  ctrl:{ctrlKey:true},meta:{metaKey:true},alt:{altKey:true},shift:{shiftKey:true},composition:{isComposing:true},legacyComposition:{keyCode:229},
  input:{target:{tagName:'INPUT'}},textarea:{target:{tagName:'TEXTAREA'}},select:{target:{tagName:'SELECT'}},
  editable:{target:{tagName:'DIV',isContentEditable:true}},editableChild:{target:{tagName:'SPAN',isContentEditable:true}}
};
for(const [name,props] of Object.entries(guarded))test('boundary shortcuts ignore '+name,()=>{
  const h=harness();h.ctx.go(1);h.key('+');const before=h.state();
  for(const key of ['Home','End']){assert.notEqual(h.key(key,props).defaultPrevented,true);assert.deepEqual(h.state(),before);}
});
test('already handled boundary keys remain unchanged',()=>{
  const h=harness();h.ctx.go(1);const before=h.state();
  for(const key of ['Home','End']){h.key(key,{defaultPrevented:true});assert.deepEqual(h.state(),before);}
});
for(const dialog of ['#settingsDialog','#infoDialog'])test('boundary shortcuts ignore '+dialog,()=>{
  const h=harness();h.ctx.go(1);h.node(dialog).open=true;
  for(const key of ['Home','End']){assert.notEqual(h.key(key).defaultPrevented,true);assert.equal(h.state().i,1);}
});
test('manual boundary navigation retains the running slideshow timer and non-loop stopping',()=>{
  const h=harness();h.search('match');h.key(' ');const timer=h.state().timer;
  h.key('End');assert.equal(h.state().i,2);assert.equal(h.state().timer,timer);
  h.intervals.get(timer)();assert.equal(h.state().i,0);
  h.node('#loopSlideshow').checked=false;h.node('#loopSlideshow').onchange();h.key('End');
  assert.equal(h.state().timer,timer);h.intervals.get(timer)();assert.equal(h.state().timer,0);assert.equal(h.state().i,2);
});
for(const dx of [-100,100])test('cancelled '+(dx<0?'next':'previous')+' swipe cleans pointers without navigation',()=>{
  const h=harness();h.ctx.go(1);h.gesture('pointercancel',dx);assert.equal(h.state().i,1);
  assert.equal(h.state().pointerCount,0);assert.equal(h.state().pinch,null);assert.equal(h.state().single,null);
});
test('cancelled filtered swipe never navigates but a subsequent completed swipe does',()=>{
  const h=harness();h.search('match');h.gesture('pointercancel');assert.equal(h.state().i,0);
  h.gesture('pointerup');assert.equal(h.state().i,2);h.gesture('pointerup',100);assert.equal(h.state().i,0);
});
for(const [name,dx,dy] of [['short',-20,0],['vertical',-100,200]])test(name+' completed and cancelled gestures do not navigate',()=>{
  const h=harness();h.gesture('pointercancel',dx,dy);h.gesture('pointerup',dx,dy);assert.equal(h.state().i,0);
});
test('cancelled zoomed pan retains the image and a fresh pointer can pan',()=>{
  const h=harness();h.key('+');h.gesture('pointercancel');assert.equal(h.state().i,0);assert.equal(h.state().scale,1.25);
  pointer(h,'pointerdown',2,100);pointer(h,'pointermove',2,110);assert.equal(h.state().tx,-2.5);
  pointer(h,'pointerup',2,110);assert.equal(h.state().pointerCount,0);
});
test('cancelling one pinch pointer resets the remaining swipe baseline',()=>{
  const h=harness();pointer(h,'pointerdown',1,200);pointer(h,'pointerdown',2,300);
  pointer(h,'pointermove',1,100);pointer(h,'pointermove',2,200);
  pointer(h,'pointercancel',2,200);assert.equal(h.state().i,0);assert.equal(h.state().pinch,null);
  assert.equal(h.state().single.startX,100);assert.equal(h.state().single.startTx,h.state().tx);
  pointer(h,'pointerup',1,100);assert.equal(h.state().i,0);assert.equal(h.state().pointerCount,0);
});
test('cancelling a pinch resets geometry before the two remaining pointers move',()=>{
  const h=harness();pointer(h,'pointerdown',1,100);pointer(h,'pointerdown',2,200);pointer(h,'pointerdown',3,300);
  pointer(h,'pointercancel',1,100);assert.equal(h.state().pinch,null);const scale=h.state().scale;
  pointer(h,'pointermove',2,200);assert.equal(h.state().scale,scale);
  pointer(h,'pointermove',3,350);assert.equal(h.state().scale,1.5);
  pointer(h,'pointercancel',2,200);pointer(h,'pointercancel',3,350);
  assert.equal(h.state().pointerCount,0);assert.equal(h.state().single,null);assert.equal(h.state().pinch,null);assert.equal(h.state().i,0);
});
test('normal completed swipes still wrap and respect search',()=>{
  const h=harness();h.gesture('pointerup',100);assert.equal(h.state().i,2);h.gesture('pointerup');assert.equal(h.state().i,0);
  h.key('ArrowRight');assert.equal(h.state().i,1);h.key('ArrowLeft');assert.equal(h.state().i,0);
});
for(const language of ['en','ja'])test('generated '+language+' viewer info explains boundary navigation',()=>{
  const ctx=vm.createContext({language,Date,$:()=>({value:'',checked:true}),getProcessingMode:()=> 'original',currentFaviconData:()=> '',
    escapeHtml:value=>String(value),safeJson:JSON.stringify});
  for(const name of ['viewerHead','viewerMeta'])vm.runInContext(source.split('\n').find(x=>x.includes('function '+name+'(')),ctx);
  const meta=ctx.viewerMeta(),head=ctx.viewerHead(meta);
  assert.equal(meta.formatVersion,1);assert.match(head,/Home/);assert.match(head,/End/);
  assert.match(head,language==='en'?/first.*last.*search results/:/先頭.*末尾.*検索結果/);
});

test('generated toolbar shows three labeled controls and puts secondary actions in a hidden menu',()=>{
 const ctx=vm.createContext({language:'en',escapeHtml:x=>String(x??''),safeJson:JSON.stringify});vm.runInContext(source.split('\n').find(x=>x.trim().startsWith('function viewerHead(')),ctx);
 const page=ctx.viewerHead({title:'Album',favicon:'data:image/svg+xml,',labels:{play:'Play',pause:'Pause',more:'More',fullscreen:'Fullscreen'}});
 const top=page.match(/<header class="top">([\s\S]*?)<\/header>/)[1];
 assert.deepEqual([...top.matchAll(/<button[^>]*id="([^"]+)"/g)].map(x=>x[1]),['play','full','more']);
 for(const text of ['Play','Fullscreen','More'])assert.ok(top.includes('>'+text+'<'));
 assert.match(page,/<div[^>]*id="actionsMenu"[^>]*hidden/);
 for(const id of ['zoomOut','zoomIn','searchToggle','download','settings','info'])assert.ok(page.includes('id="'+id+'"'));
});
test('More opens secondary actions and Escape restores focus without navigating images',()=>{
 const h=harness();h.node('#more').onclick();assert.equal(h.node('#actionsMenu').hidden,false);assert.equal(h.node('#more')['aria-expanded'],'true');
 const before=h.state().i;h.key('End');assert.equal(h.state().i,before);
 h.key('Escape');assert.equal(h.node('#actionsMenu').hidden,true);assert.equal(h.document.activeElement,h.node('#more'));
});
test('menu actions retain zoom, search, download, settings and info behavior',()=>{
 const h=harness();h.node('#more').onclick();h.node('#zoomIn').onclick();assert.equal(h.state().scale,1.25);
 h.node('#searchToggle').onclick();assert.equal(h.node('#actionsMenu').hidden,true);assert.equal(h.node('#searchPanel').hidden,false);
 h.node('#more').onclick();h.node('#download').onclick();assert.equal(h.downloads.length,1);assert.equal(h.node('#actionsMenu').hidden,true);
 for(const [action,dialog] of [['#settings','#settingsDialog'],['#info','#infoDialog']]){h.node('#more').onclick();h.node(action).onclick();assert.equal(h.node('#actionsMenu').hidden,true);assert.equal(h.node(dialog).open,true);h.node(dialog).open=false;}
});
test('play button describes its current action and outside click/resize dismiss More',()=>{
 const h=harness();assert.equal(h.node('#playLabel').textContent,'Play');h.node('#play').onclick();assert.equal(h.node('#playLabel').textContent,'Pause');assert.equal(h.node('#play')['aria-pressed'],'true');
 h.node('#play').onclick();assert.equal(h.node('#playLabel').textContent,'Play');
 h.node('#more').onclick();h.document.dispatch('click',{target:h.node('body')});assert.equal(h.node('#actionsMenu').hidden,true);
 h.node('#more').onclick();h.node('window').dispatch('resize');assert.equal(h.node('#actionsMenu').hidden,true);
});

test('Space on a focused toolbar button keeps native button activation and does not start slideshow',()=>{
 const h=harness();for(const id of ['#more','#full','#play']){
  const target=h.node(id);target.tagName='BUTTON';const event=h.key(' ',{target});
  assert.notEqual(event.defaultPrevented,true);assert.equal(h.state().timer,0);
 }
 h.node('#more').onclick();assert.equal(h.node('#actionsMenu').hidden,false);
});

test('Ctrl + wheel zooms at the pointer while regular scrolling stays available', () => {
  const h = harness();
  const stage = h.node('#stage');
  const image = h.node('#main');
  image.getBoundingClientRect = () => ({left: 0, top: 0, width: 100, height: 100});

  const regular = stage.dispatch('wheel', {deltaY: -100, deltaMode: 0});
  assert.notEqual(regular.defaultPrevented, true);
  assert.equal(h.state().scale, 1);

  const zoomIn = stage.dispatch('wheel', {ctrlKey: true, deltaY: -100, deltaMode: 0, clientX: 60, clientY: 50});
  assert.equal(zoomIn.defaultPrevented, true);
  const {scale, tx, ty} = h.state();
  assert.ok(scale > 1);
  assert.ok(Math.abs(tx - 10 * (1 - scale)) < 1e-9);
  assert.equal(ty, 0);
  stage.dispatch('wheel', {ctrlKey: true, deltaY: 100, deltaMode: 0, clientX: 60, clientY: 50});
  assert.ok(h.state().scale < scale);
  assert.equal(h.state().i, 0);
});

test('sidebar width can be dragged and adjusted by keyboard, with viewport limits', () => {
  const h = harness(fixture, {sidebarWidth: 300});
  const handle = h.node('#sidebarResize');
  const width = () => Number(handle['aria-valuenow']);
  assert.equal(width(), 300);

  handle.dispatch('pointerdown', {clientX: 700});
  handle.dispatch('pointermove', {clientX: 650});
  assert.equal(width(), 350);
  handle.dispatch('pointerup', {clientX: 650});
  assert.equal(h.preferences().sidebarWidth, 350);
  handle.dispatch('pointermove', {clientX: 500});
  assert.equal(width(), 350);

  const right = handle.dispatch('keydown', {key: 'ArrowRight'});
  assert.equal(right.defaultPrevented, true);
  assert.equal(width(), 334);
  handle.dispatch('keydown', {key: 'End'});
  assert.equal(width(), 500);
  h.node('#albumLayout').clientWidth = 800;
  h.node('window').dispatch('resize');
  assert.equal(width(), 400);
  handle.dispatch('keydown', {key: 'Home'});
  assert.equal(width(), 180);
  handle.dispatch('pointerdown', {clientX: 620});
  handle.dispatch('pointermove', {clientX: 590});
  handle.dispatch('pointercancel', {clientX: 590});
  handle.dispatch('pointermove', {clientX: 550});
  assert.equal(width(), 210);
  assert.equal(handle.classList.contains('is-dragging'), false);
});

test('toolbar slider sets zoom and reflects keyboard zoom and image changes', () => {
  const h = harness();
  const slider = h.node('#zoomRange');
  assert.equal(slider.value, '100');
  slider.value = '225';
  slider.dispatch('input');
  assert.equal(h.state().scale, 2.25);
  assert.equal(h.node('#zoomValue').textContent, '225%');
  h.key('-');
  assert.equal(slider.value, '200');
  h.ctx.go(1);
  assert.equal(slider.value, '100');
});

test('blurred background follows the current image and can be turned off', () => {
  const photos = fixture.map((item, index) => ({...item, t: 'thumbnail-' + index}));
  const h = harness(photos, {background: 'blur'});
  const backdrop = h.node('#stageBackdrop');
  assert.equal(backdrop.hidden, false);
  assert.match(backdrop.src, /thumbnail-0$/);
  h.ctx.go(1);
  assert.match(backdrop.src, /thumbnail-1$/);
  const select = h.node('#viewerBackground');
  select.value = 'dark';
  select.onchange();
  assert.equal(backdrop.hidden, true);
  assert.equal(h.preferences().background, 'dark');
});

test('settings close on a backdrop click and stay open on clicks inside', () => {
  const h = harness();
  const dialog = h.node('#settingsDialog');
  dialog.getBoundingClientRect = () => ({left: 100, right: 400, top: 100, bottom: 600});
  h.node('#settings').onclick();
  dialog.dispatch('click', {clientX: 120, clientY: 110});
  assert.equal(dialog.open, true);
  dialog.dispatch('click', {clientX: 60, clientY: 110});
  assert.equal(dialog.open, false);
});

test('a cached album keeps its image URLs and stops playback when leaving the page', () => {
  const h = harness();
  h.key(' ');
  const imageUrl = h.state().src;
  h.node('window').dispatch('pagehide', {persisted: true});
  assert.equal(h.state().timer, 0);
  assert.ok(h.urls.has(imageUrl));
  h.ctx.go(0);
  assert.ok(h.urls.has(h.state().src));
  h.node('window').dispatch('pagehide', {persisted: false});
  assert.equal(h.urls.size, 0);
});
