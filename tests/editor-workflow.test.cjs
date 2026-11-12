'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),{test}=require('node:test');
let html=fs.readFileSync(process.env.ALBUM_HTML||path.join(__dirname,'../src/index.template.html'),'utf8');
const payload=html.match(/<script id="self-extract-payload"[^>]*>([\s\S]*?)<\/script>/);
if(payload)html=require('node:zlib').gunzipSync(Buffer.from(payload[1],'base64')).toString('utf8');
function harness(mobile=false,withOptimization=false){
 const nodes=new Map();
 function node(key){if(!nodes.has(key))nodes.set(key,{dataset:{},attrs:{},children:[],textContent:'',innerHTML:'',classList:{values:new Set(),add(x){this.values.add(x)},remove(x){this.values.delete(x)},toggle(x,on){if(on)this.add(x);else this.remove(x);return on},contains(x){return this.values.has(x)}},append(x){this.children.push(x)},querySelector(){return node(key+'-heading')},focus(){this.focused=true},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},getBoundingClientRect(){return{top:100}}});return nodes.get(key)}
 const stages=['add','optimize','arrange','album','export'];
 const panels=stages.map(p=>Object.assign(node('panel-'+p),{dataset:{mobilePagePanel:p}}));
 const tabs=stages.map(p=>Object.assign(node('tab-'+p),{dataset:{mobileTab:p}}));
 const journey=stages.map(p=>Object.assign(node('journey-'+p),{dataset:{journeyTarget:p}}));
 const body=node('body'),scrolls=[],listeners=new Map(),frames=[];
 const document={body,documentElement:{scrollHeight:600},querySelectorAll(q){return q==='[data-mobile-page-panel]'||q==='.mobile-page-panel'?panels:q==='[data-mobile-tab]'?tabs:q==='[data-journey-target]'?journey:[]},querySelector(q){if(q==='.app-header')return{offsetHeight:66};if(q.startsWith('[data-mobile-page-panel='))return panels.find(x=>q.includes('"'+x.dataset.mobilePagePanel+'"'));return node(q)},createElement(tag){return node('new-'+tag+'-'+Math.random())}};
 const ctx=vm.createContext({document,window:{scrollY:0,scrollTo:x=>scrolls.push(x),addEventListener(type,fn){listeners.set(type,fn)}},innerHeight:900,scrollY:0,requestAnimationFrame(fn){frames.push(fn);return frames.length},$:node,items:[],mobilePage:'add',mobilePageMedia:{matches:mobile},generation:0,albumImportJob:null,mode:'original',webpDirty:false,thumbnailQueueCount:0,thumbnailQueuePromise:Promise.resolve(),firstImageBatchPending:false,converting:false,viewerJob:null,t:x=>x,AppToast:{show(){}},invalidateViewerOutput(){},renderAll(){},updateStatus(){},readyProcessingStatus:()=>'',console});
 ctx.getProcessingMode=()=>ctx.mode;ctx.isWebpPending=()=>ctx.mode==='webp'&&ctx.webpDirty;
 ctx.addFiles=async files=>{ctx.items.push(...files);return files.length>0};
 for(const name of ['updateJourneyCurrent','setMobilePage','navigateToPhase','renderAddedFeedback','enqueueFiles']){
  const line=html.split('\n').find(x=>new RegExp(`function ${name}\\(`).test(x));assert.ok(line,name);vm.runInContext(line.trim(),ctx);
 }
 vm.runInContext(html.slice(html.indexOf('function openOptimizationAfterImport()'),html.indexOf('function enqueueFiles(')),ctx);
 if(withOptimization){const line=html.split('\n').find(x=>x.includes('async function continueFromOptimization('));assert.ok(line,'actual step 2 continuation exists');vm.runInContext(line.trim(),ctx);}
 const scrollSpy=html.split('\n').find(x=>x.includes('function syncJourneyFromScroll('));if(scrollSpy)vm.runInContext(scrollSpy.trim(),ctx);
 return{ctx,node,body,panels,tabs,journey,scrolls,fireScroll(){listeners.get('scroll')?.();while(frames.length)frames.shift()()}};
}
test('requested Japanese heading and lead survive translation initialization',()=>{
 const end=html.indexOf('      const $=');
 const ctx=vm.createContext({});vm.runInContext(html.slice(html.indexOf('      const translations='),end)+';globalThis.copy=translations.ja',ctx);
 assert.equal(ctx.copy.introTitle,'画像を1つの持ち運べるHTMLアルバムに');
 assert.equal(ctx.copy.lead,'複数画像をビューアごと1つの自己完結HTMLにまとめます');
});
test('desktop navigation selects exactly one work panel and exposes current step',()=>{
 const h=harness();h.ctx.navigateToPhase('export');
 assert.equal(h.body.dataset.mobilePage,'export');
 assert.deepEqual(h.panels.filter(p=>p.classList.contains('is-mobile-active')).map(p=>p.dataset.mobilePagePanel),['export']);
 assert.equal(h.journey.find(p=>p.dataset.journeyTarget==='export').attrs['aria-current'],'step');
 h.ctx.navigateToPhase('arrange');assert.equal(h.journey.find(p=>p.dataset.journeyTarget==='export').attrs['aria-current'],undefined);
});
test('loaded drop zone gets short translated copy and restores the full empty state',()=>{
 const h=harness();h.ctx.items=[{thumbUrl:'blob:synthetic'}];h.ctx.renderAddedFeedback();
 assert.ok(h.body.classList.contains('has-images'));
 assert.equal(h.node('#dropTitle').dataset.i18n,'addTitle');assert.equal(h.node('#dropTitle').textContent,'addTitle');
 h.ctx.items=[];h.ctx.renderAddedFeedback();
 assert.ok(!h.body.classList.contains('has-images'));assert.equal(h.node('#dropTitle').dataset.i18n,'dropTitle');
 assert.ok(!h.node('#dropzone').classList.contains('has-images'));
});
test('first completed batch opens step 2; subsequent additions preserve the chosen stage',async()=>{
 const h=harness();
 h.ctx.window.scrollY=15;
 h.node('#loadedPhotosPreview').getBoundingClientRect=()=>({top:280});
 await h.ctx.enqueueFiles([{thumbUrl:''}]);
 assert.equal(h.ctx.mobilePage,'optimize');
 assert.equal(h.scrolls.length,1);
 assert.equal(h.scrolls[0].top,223);
 h.ctx.setMobilePage('export');await h.ctx.enqueueFiles([{thumbUrl:''}]);assert.equal(h.ctx.mobilePage,'export');
 assert.equal(h.scrolls.length,1);
});
test('queued first additions open step 2 only when all preparation has finished',async()=>{
 const h=harness(true);const a=h.ctx.enqueueFiles([{thumbUrl:''}]),b=h.ctx.enqueueFiles([{thumbUrl:''}]);
 assert.equal(h.ctx.mobilePage,'add');await Promise.all([a,b]);assert.equal(h.ctx.thumbnailQueueCount,0);assert.equal(h.ctx.mobilePage,'optimize');
});
test('failed input and a deliberate stage change never trigger an automatic redirect',async()=>{
 const h=harness();h.ctx.addFiles=async()=>false;await h.ctx.enqueueFiles([{}]);assert.equal(h.ctx.mobilePage,'add');
 h.ctx.addFiles=async files=>{h.ctx.items.push(...files);h.ctx.setMobilePage('album',{scroll:false});return true};
 await h.ctx.enqueueFiles([{}]);assert.equal(h.ctx.mobilePage,'album');
});

test('stage actions move keyboard focus into the newly selected work area',()=>{for(const mobile of [false,true]){const h=harness(mobile);h.ctx.navigateToPhase('export');assert.equal(h.node('panel-export-heading').attrs.tabindex,'-1');assert.equal(h.node('panel-export-heading').focused,true)}});

test('desktop scrolling cannot change the selected stage, including short pages at the document bottom',()=>{const h=harness();h.ctx.setMobilePage('arrange');h.fireScroll();assert.equal(h.ctx.mobilePage,'arrange');assert.equal(h.journey.find(x=>x.attrs['aria-current']==='step').dataset.journeyTarget,'arrange');assert.deepEqual(h.panels.filter(x=>x.classList.contains('phase-current')).map(x=>x.dataset.mobilePagePanel),['arrange'])});

test('step 2 keeps originals without conversion and continues to step 3',async()=>{
 const h=harness(false,true);h.ctx.setMobilePage('optimize');h.ctx.items=[{status:'ready',outputBlob:{},thumbBlob:{}}];
 let conversions=0;h.ctx.convertAll=async()=>{conversions++;return true};
 assert.equal(await h.ctx.continueFromOptimization(),true);assert.equal(conversions,0);assert.equal(h.ctx.mobilePage,'arrange');
});
test('step 2 waits for successful optimization before continuing',async()=>{
 const h=harness(true,true);h.ctx.setMobilePage('optimize');h.ctx.mode='webp';h.ctx.webpDirty=true;h.ctx.items=[{status:'ready',outputBlob:{},thumbBlob:{}}];
 let finish;h.ctx.convertAll=async()=>{h.ctx.generation++;await new Promise(r=>finish=r);h.ctx.webpDirty=false;return true};
 const pending=h.ctx.continueFromOptimization();assert.equal(h.ctx.mobilePage,'optimize');finish();
 assert.equal(await pending,true);assert.equal(h.ctx.mobilePage,'arrange');
});
test('failed conversion, source replacement and explicit stage changes keep step 2 from redirecting',async()=>{
 for(const reason of ['failed','replaced','navigated']){
  const h=harness(false,true);h.ctx.setMobilePage('optimize');h.ctx.mode='webp';h.ctx.webpDirty=true;h.ctx.items=[{status:'ready',outputBlob:{},thumbBlob:{}}];
  h.ctx.convertAll=async()=>{h.ctx.generation++;if(reason==='replaced'){h.ctx.items=[];h.ctx.generation++}if(reason==='navigated')h.ctx.setMobilePage('add');return reason!=='failed'};
  assert.equal(await h.ctx.continueFromOptimization(),false);assert.equal(h.ctx.mobilePage,reason==='navigated'?'add':'optimize');
 }
});
test('step 2 cannot continue during thumbnail preparation or an album replacement',async()=>{
 const h=harness(false,true);h.ctx.setMobilePage('optimize');h.ctx.items=[{status:'ready',outputBlob:{},thumbBlob:{}}];
 h.ctx.thumbnailQueueCount=1;assert.equal(await h.ctx.continueFromOptimization(),false);assert.equal(h.ctx.mobilePage,'optimize');
 h.ctx.thumbnailQueueCount=0;h.ctx.albumImportJob={};assert.equal(await h.ctx.continueFromOptimization(),false);
});

test('desktop steps 3 and 4 expose their forward action without relying on the mobile tab bar',()=>{
 const base=html.match(/\.mobile-phase-next\{([^}]*)\}/)[1];assert.doesNotMatch(base,/\bdisplay:none\b/);
 for(const id of ['goAlbumButton','goExportStepButton'])assert.ok(html.includes('id="'+id+'"'));
});

test('imported-photo proof remains separate from step-1 navigation feedback',()=>{
 const proof=html.indexOf('id="loadedPhotosPreview"'),feedback=html.indexOf('id="addedFeedback"');
 assert.ok(proof>0&&proof<feedback,'persistent photo proof exists before the step-specific feedback');
 assert.doesNotMatch(html,/<div class="added-thumbs" id="addedThumbs" aria-hidden="true"/);
});
test('step 2 and later steps show real labeled thumbnail previews and preparation placeholders',()=>{
 const h=harness();const opened=[];h.ctx.openImagePreview=id=>opened.push(id);
 h.ctx.items=[{id:1,file:{name:'A.jpg'},thumbUrl:'blob:a'},{id:2,file:{name:'B.png'},thumbUrl:'blob:b'},{id:3,file:{name:'C.webp'},thumbUrl:''}];
 h.ctx.setMobilePage('optimize');h.ctx.renderAddedFeedback();
 assert.equal(h.node('#loadedPhotosPreview').hidden,false);
 const buttons=h.node('#addedThumbs').children;assert.equal(buttons.length,3);
 assert.equal(buttons[0].children[0].src,'blob:a');assert.equal(buttons[0].children[0].alt,'A.jpg');
 buttons[1].onclick();assert.deepEqual(opened,[2]);
 assert.equal(buttons[2].disabled,true,'a preparing image is named but cannot open an invalid preview');
 assert.ok(buttons[2].children.some(x=>x.textContent==='C.webp'));
 h.ctx.items=[];h.ctx.renderAddedFeedback();assert.equal(h.node('#loadedPhotosPreview').hidden,true);
});
