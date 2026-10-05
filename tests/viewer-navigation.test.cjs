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
const line = source.split('\n').find(x => x.trim().startsWith('function viewerTail()'));
const maker = vm.createContext({});
vm.runInContext(line, maker);
const tail = maker.viewerTail();
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM1sAAAAASUVORK5CYII=';
const fixture = ['Alpha.png','Beta.png','Gamma.png'].map((n,i) => ({n,w:1,h:1,m:'image/png',e:'png',b:png,t:png,c:i===1?'hidden':'match',ch:i===0?'Chapter A':i===2?'Chapter B':''}));
function harness(data=fixture) {
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
      append(x){this.children.push(x);},setAttribute(k,v){this[k]=v;},remove(){},focus(){},select(){},blur(){},
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
    location:{pathname:'/synthetic-album.html'},localStorage:{getItem(){return null;},setItem(){}},
    fullscreenAutoHide:node('#fullscreenAutoHide'),
    URL:{createObjectURL(blob){const id='blob:synthetic-'+(++nextUrl);urls.set(id,blob);return id;},revokeObjectURL(id){urls.delete(id);}},
    requestAnimationFrame:fn=>fn(),setTimeout(fn){const id=++nextTimer;timeouts.set(id,fn);return id;},clearTimeout:id=>timeouts.delete(id),
    setInterval(fn){const id=++nextTimer;intervals.set(id,fn);return id;},clearInterval:id=>intervals.delete(id)
  });
  const js='const M='+JSON.stringify({title:'Synthetic probe',showNames:true,labels:{searchResults:'results',searchNoResults:'No matching images'}})+'; const D='+JSON.stringify(data).slice(0,-1)+tail.slice(0,tail.indexOf('</script>'));
  vm.runInContext(js,ctx);
  vm.runInContext('globalThis.inspect = () => ({i,scale,tx,ty,timer,pointerCount:pointers.size,pinch,single,visible:searchIndexes(),count:count.textContent,src:main.src,alt:main.alt,caption:caption.textContent,chapter:annotationChapter.textContent,comment:annotationComment.textContent}); globalThis.go = show;',ctx);
  return {ctx,node,document,urls,downloads,intervals,timeouts,state:()=>JSON.parse(JSON.stringify(ctx.inspect())),
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
