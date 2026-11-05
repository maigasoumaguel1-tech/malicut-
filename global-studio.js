/* MALICUT Studio — new CapCut/Canva-inspired editing workspace */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const create = $('create');
 if (!create || $('mcGlobalStudio')) return;

 const style = document.createElement('style');
 style.textContent = `
 #mcGlobalStudio{position:fixed;inset:0;z-index:100001;background:#080d12;color:#eef4f8;display:none;align-items:stretch;justify-content:center;padding:0;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif}
 #mcGlobalStudio.open{display:flex}
 #mcGlobalStudio .gs-window{width:100%;height:100%;min-height:0;background:#0b1118;display:grid;grid-template-rows:58px minmax(0,1fr);overflow:hidden}
 #mcGlobalStudio .gs-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 18px;border-bottom:1px solid #243343;background:#101923}
 #mcGlobalStudio .gs-brand{font-size:17px;font-weight:950;letter-spacing:.2px;color:#f5f8fb}
 #mcGlobalStudio .gs-brand em{font-style:normal;color:#65d6bd}
 #mcGlobalStudio .gs-top-right{display:flex;align-items:center;gap:10px}
 #mcGlobalStudio .gs-top-note{font-size:10px;color:#91a3b4}
 #mcGlobalStudio .gs-back{border:1px solid #34485b;border-radius:10px;padding:8px 12px;background:#1b2a39;color:#edf5fb;font-weight:700}
 #mcGlobalStudio .gs-body{display:grid;grid-template-columns:190px minmax(0,1fr);min-height:0}
 #mcGlobalStudio .gs-side{padding:14px 10px;border-right:1px solid #243343;background:#101923;display:flex;flex-direction:column;gap:6px;overflow:auto}
 #mcGlobalStudio .gs-nav{display:flex;align-items:center;gap:10px;text-align:left;padding:10px;border:1px solid transparent;border-radius:10px;color:#c6d2dc;font-size:13px;background:transparent}
 #mcGlobalStudio .gs-nav .gs-ico{width:29px;height:29px;display:grid;place-items:center;border-radius:9px;background:#1b2a39;color:#71d9c3;font-size:16px;flex:none}
 #mcGlobalStudio .gs-nav.active{border-color:#347d76;background:#17302f;color:#fff}
 #mcGlobalStudio .gs-main{min-width:0;min-height:0;overflow:auto;padding:14px;background:#0b1118}
 #mcGlobalStudio .gs-mobile-tabs{display:none}
 #mcGlobalStudio .gs-home{max-width:1050px;margin:12px auto}
 #mcGlobalStudio .gs-home h2{font-size:clamp(23px,3vw,36px);margin:4px 0;color:#f5f8fb}
 #mcGlobalStudio .gs-home p{color:#91a3b4}
 #mcGlobalStudio .gs-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:22px}
 #mcGlobalStudio .gs-tile{min-height:122px;border:1px solid #263849;border-radius:16px;background:linear-gradient(145deg,#172432,#101923);color:#f3f7fa;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:8px;padding:16px;text-align:left}
 #mcGlobalStudio .gs-tile:active,#mcGlobalStudio .gs-tile:hover{border-color:#65d6bd;background:#17302f}
 #mcGlobalStudio .gs-tile .gs-ico{font-size:24px;color:#65d6bd}
 #mcGlobalStudio .gs-tile b{font-size:13px}
 #mcGlobalStudio .gs-tile small{font-size:10px;color:#9eb0bf}
 #mcGlobalStudio .gs-work{display:none;min-height:100%}
 #mcGlobalStudio .gs-work.active{display:block}
 #mcGlobalStudio .gs-workhead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:0 0 12px}
 #mcGlobalStudio .gs-workhead b{font-size:15px;color:#f2f7fb}
 #mcGlobalStudio .gs-workhead .muted{color:#8fa2b3;font-size:10px}
 #mcGlobalStudio .gs-stage{min-width:0}
 #mcGlobalStudio .gs-panels{min-width:0}
 #mcGlobalStudio .gs-panels>.panel{margin:0 0 10px}
 #mcGlobalStudio .gs-panels>.panel.gs-hidden,#mcGlobalStudio .gs-panels>.gs-panel.gs-hidden{display:none!important}

 /* Unified editing desk: media bin + canvas + horizontal timeline */
 #mcGlobalStudio #mcProStudio{display:grid!important;grid-template-columns:minmax(205px,.72fr) minmax(0,1.7fr);grid-template-areas:"media preview" "media tools" "timelineHead timelineHead" "timeline timeline" "inspector inspector" "range range" "trackHead trackHead" "trackTools trackTools" "tracks tracks" "note note";gap:10px;align-items:start;margin:0!important}
 #mcGlobalStudio #mcProStudio>.gs-media-bin{grid-area:media;margin:0!important;background:#111d28;border:1px solid #263b4e;border-radius:15px;padding:12px;color:#edf4f8}
 #mcGlobalStudio #mcProStudio>.gs-media-bin .pro-head{align-items:center}
 #mcGlobalStudio #mcProStudio>.gs-media-bin .pro-head b{font-size:14px}
 #mcGlobalStudio #mcProStudio>.gs-media-bin .pro-note{color:#91a6b7}
 #mcGlobalStudio #mcProStudio>.gs-media-bin .pro-actions{grid-template-columns:1fr 1fr;gap:7px}
 #mcGlobalStudio #mcProStudio>.gs-media-bin .btn{background:#1b2d3c;border:1px solid #3b566c;color:#eef6fa;border-radius:10px;font-size:11px;padding:10px 7px}
 #mcGlobalStudio #mcProStudio>.gs-media-bin .btn.gold{background:#65d6bd;border-color:#65d6bd;color:#09221f}
 #mcGlobalStudio #mcProStudio>.gs-media-bin input[type=file]{display:block!important;max-width:100%;color:#c5d4df;font-size:11px;background:#0b151e;border:1px solid #34495c;border-radius:9px;padding:8px}
 #mcGlobalStudio #mcProStudio>.gs-preview-canvas{grid-area:preview;min-width:0;display:flex;justify-content:center;align-items:center;background:radial-gradient(ellipse at center,#1a2b3a 0,#0a1119 72%);border:1px solid #263849;border-radius:15px;padding:12px;min-height:330px}
 #mcGlobalStudio #mcProStudio>.gs-preview-canvas .preview{width:100%;display:flex;justify-content:center;margin:0!important;background:transparent;border:0;padding:0}
 #mcGlobalStudio #mcProStudio>.gs-preview-canvas .screen{max-height:54vh!important;max-width:100%;border:1px solid #40586d;border-radius:10px;box-shadow:0 12px 35px #0008}
 #mcGlobalStudio #mcProStudio>.gs-edit-tools{grid-area:tools;display:flex;gap:7px;overflow-x:auto;overflow-y:hidden;padding:8px;background:#111d28;border:1px solid #263849;border-radius:13px;scrollbar-width:thin}
 #mcGlobalStudio #mcProStudio>.gs-edit-tools .tool{flex:0 0 auto;min-width:68px;border:1px solid #34495c;border-radius:10px;background:#1a2a38;color:#e8f1f7;padding:8px;font-size:10px}
 #mcGlobalStudio #mcProStudio>.gs-edit-tools .tool b{color:#65d6bd}
 #mcGlobalStudio #mcProStudio>.gs-timeline-content{display:contents!important}
 #mcGlobalStudio #mcProStudio .gs-timeline-heading{grid-area:timelineHead;margin:4px 0 0!important;color:#eef5fa}
 #mcGlobalStudio #mcProStudio .gs-timeline-heading b{font-size:13px}
 #mcGlobalStudio #mcProStudio .mc-timeline-shell{grid-area:timeline;width:100%;min-width:0;border:1px solid #30475b!important;border-radius:14px!important;background:#07111b!important;overflow:hidden}
 #mcGlobalStudio #mcProStudio .mc-timeline-top{background:#142536!important;color:#dceaf4!important}
 #mcGlobalStudio #mcProStudio #mcTimeline{min-height:128px!important;width:100%!important;max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important;display:flex!important;flex-flow:row nowrap!important;touch-action:pan-x pan-y!important;-webkit-overflow-scrolling:touch;background-color:#07111b!important}
 #mcGlobalStudio #mcProStudio .mc-clip-inspector{grid-area:inspector;background:#111d28;border:1px solid #263849;border-radius:12px;padding:10px}
 #mcGlobalStudio #mcProStudio .range{grid-area:range;background:#111d28;border:1px solid #263849;border-radius:12px;padding:10px;margin:0}
 #mcGlobalStudio #mcProStudio .gs-track-heading{grid-area:trackHead;margin:4px 0 0!important;color:#edf5fa}
 #mcGlobalStudio #mcProStudio .gs-track-actions{grid-area:trackTools;display:flex;flex-wrap:wrap;gap:7px}
 #mcGlobalStudio #mcProStudio .gs-track-actions button{background:#1b2d3c;color:#edf5fa;border:1px solid #3b566c;border-radius:9px}
 #mcGlobalStudio #mcProStudio .mc-lanes{grid-area:tracks;display:grid;gap:7px;margin:0}
 #mcGlobalStudio #mcProStudio .mc-lane{background:#0d1924;border-color:#30475b}
 #mcGlobalStudio #mcProStudio .mc-lane-head{color:#dce8f0}
 #mcGlobalStudio #mcProStudio .mc-lane-clips{min-height:40px;overflow-x:auto;flex-wrap:nowrap}
 #mcGlobalStudio #mcProStudio .mc-lane-clip{background:#1b3b48;color:#dff9f5}
 #mcGlobalStudio #mcProStudio .gs-track-note{grid-area:note;color:#91a6b7}
 #mcGlobalStudio #mcProStudio .mc-playback-controls{background:#122231;border-color:#30475b}
 #mcGlobalStudio #mcProStudio .mc-playback-controls button{background:#1b3447;border-color:#45647d}
 #mcGlobalStudio #mcProStudio .mc-playback-controls #mcPlayToggle{background:#65d6bd;color:#09221f}
 #mcGlobalStudio .gs-panels>.gs-panel{background:#111d28;border-color:#263849;color:#eef4f8}
 #mcGlobalStudio .gs-panels>.gs-panel input,#mcGlobalStudio .gs-panels>.gs-panel select,#mcGlobalStudio .gs-panels>.gs-panel textarea{background:#0b151e;color:#edf4f8;border-color:#34495c}
 @media(min-width:1050px){
  #mcGlobalStudio #mcProStudio{grid-template-columns:minmax(220px,.7fr) minmax(360px,1.6fr);gap:12px}
  #mcGlobalStudio #mcProStudio>.gs-preview-canvas{min-height:440px}
 }
 @media(max-width:760px){
  #mcGlobalStudio .gs-window{grid-template-rows:52px minmax(0,1fr)}
  #mcGlobalStudio .gs-body{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr)}
  #mcGlobalStudio .gs-side{display:none}
  #mcGlobalStudio .gs-main{padding:8px 8px calc(12px + env(safe-area-inset-bottom))}
  #mcGlobalStudio .gs-mobile-tabs{display:flex;gap:6px;overflow-x:auto;padding:5px 0 9px;position:sticky;top:-8px;background:#0b1118;z-index:10;scrollbar-width:none}
  #mcGlobalStudio .gs-mobile-tabs button{white-space:nowrap;border:1px solid #304457;border-radius:20px;padding:8px 11px;background:#142231;color:#dce8f0;font-size:11px}
  #mcGlobalStudio .gs-mobile-tabs button.active{border-color:#65d6bd;background:#173b3a;color:#fff}
  #mcGlobalStudio .gs-tiles{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px}
  #mcGlobalStudio .gs-tile{min-height:88px;padding:11px}
  #mcGlobalStudio .gs-workhead{margin:2px 0 8px}
  #mcGlobalStudio #mcProStudio{grid-template-columns:minmax(0,1fr);grid-template-areas:"preview" "tools" "media" "timelineHead" "timeline" "inspector" "range" "trackHead" "trackTools" "tracks" "note";gap:8px}
  #mcGlobalStudio #mcProStudio>.gs-preview-canvas{min-height:0;padding:8px}
  #mcGlobalStudio #mcProStudio>.gs-preview-canvas .screen{max-height:35vh!important}
  #mcGlobalStudio #mcProStudio>.gs-media-bin{padding:9px}
  #mcGlobalStudio #mcProStudio>.gs-media-bin .pro-note{display:none}
  #mcGlobalStudio #mcProStudio>.gs-media-bin .pro-actions{grid-template-columns:repeat(4,minmax(0,1fr))}
  #mcGlobalStudio #mcProStudio>.gs-media-bin .btn{font-size:10px;padding:9px 4px;min-height:40px}
  #mcGlobalStudio #mcProStudio .mc-timeline-shell{border-radius:11px!important}
  #mcGlobalStudio #mcProStudio #mcTimeline{min-height:116px!important;padding:26px 8px 10px!important}
  #mcGlobalStudio #mcProStudio .mc-clip-inspector{grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;padding:8px}
  #mcGlobalStudio #mcProStudio .mc-clip-inspector button,#mcGlobalStudio #mcProStudio .mc-clip-inspector select{font-size:10px;min-height:38px}
  #mcGlobalStudio #mcProStudio .mc-lane{padding:7px}
  #mcGlobalStudio #mcProStudio .mc-lane-head{font-size:10px}
  #mcGlobalStudio #mcProStudio .mc-lane-clips{min-height:32px}
  #mcGlobalStudio #mcProStudio .gs-track-note{display:none}
  #mcGlobalStudio .gs-top{padding:0 10px}
  #mcGlobalStudio .gs-top-note{display:none}
  #mcGlobalStudio .gs-brand{font-size:15px}
 }
 @media(max-width:380px){
  #mcGlobalStudio #mcProStudio>.gs-media-bin .pro-actions{grid-template-columns:repeat(2,minmax(0,1fr))}
  #mcGlobalStudio #mcProStudio .mc-playback-controls{gap:5px;padding:8px}
  #mcGlobalStudio #mcProStudio .mc-playback-controls button{padding:7px 8px;font-size:10px}
 }
 `;
 document.head.appendChild(style);

 const overlay=document.createElement('div');
 overlay.id='mcGlobalStudio';
 overlay.innerHTML=`
  <div class="gs-window" role="dialog" aria-modal="true" aria-label="MALICUT Studio">
   <header class="gs-top">
    <div class="gs-brand">MALICUT <em>STUDIO</em></div>
    <div class="gs-top-right"><span class="gs-top-note">Espace de création professionnel</span><button class="gs-back" id="gsClose">✕ Fermer</button></div>
   </header>
   <div class="gs-body">
    <nav class="gs-side" id="gsSide">
     <button class="gs-nav active" data-studio="home"><span class="gs-ico">⌂</span>Accueil studio</button>
     <button class="gs-nav" data-studio="video"><span class="gs-ico">▣</span>Montage vidéo</button>
     <button class="gs-nav" data-studio="photo"><span class="gs-ico">▧</span>Studio photo</button>
     <button class="gs-nav" data-studio="audio"><span class="gs-ico">♫</span>Studio audio</button>
     <button class="gs-nav" data-studio="voice"><span class="gs-ico">🎙</span>Voix off</button>
     <button class="gs-nav" data-studio="text"><span class="gs-ico">T</span>Textes & titres</button>
     <button class="gs-nav" data-studio="effects"><span class="gs-ico">✧</span>Effets & transitions</button>
     <button class="gs-nav" data-studio="export"><span class="gs-ico">⇧</span>Export & partage</button>
    </nav>
    <main class="gs-main">
     <div class="gs-mobile-tabs" id="gsMobileTabs">
      <button class="active" data-studio="home">Accueil</button><button data-studio="video">Vidéo</button><button data-studio="photo">Photo</button><button data-studio="audio">Audio</button><button data-studio="voice">Voix</button><button data-studio="text">Texte</button><button data-studio="effects">Effets</button><button data-studio="export">Export</button>
     </div>
     <section class="gs-home" id="gsHome">
      <h2>Ton espace de création</h2><p>Un atelier unique pour monter, retoucher et préparer tes contenus.</p>
      <div class="gs-tiles">
       <button class="gs-tile" data-studio="video"><span class="gs-ico">▣</span><b>Montage vidéo</b><small>Clips, pistes et timeline</small></button>
       <button class="gs-tile" data-studio="photo"><span class="gs-ico">▧</span><b>Studio photo</b><small>Importer et composer</small></button>
       <button class="gs-tile" data-studio="audio"><span class="gs-ico">♫</span><b>Studio audio</b><small>Musique et mixage</small></button>
       <button class="gs-tile" data-studio="voice"><span class="gs-ico">🎙</span><b>Voix off</b><small>Enregistrer et importer</small></button>
       <button class="gs-tile" data-studio="text"><span class="gs-ico">T</span><b>Textes & titres</b><small>Styles et animations</small></button>
       <button class="gs-tile" data-studio="effects"><span class="gs-ico">✧</span><b>Effets & transitions</b><small>Filtres et réglages</small></button>
       <button class="gs-tile" data-studio="export"><span class="gs-ico">⇧</span><b>Export & partage</b><small>Formats et qualité</small></button>
       <button class="gs-tile" data-studio="video"><span class="gs-ico">▤</span><b>Montage multipiste</b><small>Vidéo, audio et superpositions</small></button>
      </div>
     </section>
     <section class="gs-work" id="gsWork">
      <div class="gs-workhead"><div><b id="gsWorkTitle">Montage vidéo</b><div class="muted">Espace de travail intégré</div></div><button class="gs-back" id="gsHomeBtn">⌂ Studios</button></div>
      <div class="gs-stage"><div class="gs-panels" id="gsPanels"></div></div>
     </section>
    </main>
   </div>
  </div>`;
 document.body.appendChild(overlay);

 const main=overlay.querySelector('#gsPanels');
 const head=create.querySelector(':scope > .head');
 if(head)head.style.display='none';
 const direct=[...create.children].filter(el=>el!==head);
 const previewNode=direct.find(el=>el.classList.contains('preview'));
 const toolbar=direct.find(el=>el.classList.contains('editor-toolbar'));
 const studioNodes=direct.filter(el=>el!==previewNode&&el!==toolbar);

 studioNodes.forEach(el=>{
  el.classList.add('gs-panel');
  const id=el.id||'';
  let group='video';
  if(id==='audioStudio')group='audio';
  else if(id==='effectsPanel'||id==='stickersPanel'||id==='adjust')group='effects';
  else if(id==='aiMediaPanel')group='photo';
  else if(id==='mcCreativeTools')group='voice';
  else if(id==='mcTextStudio')group='text';
  else if(id==='mcExportQuality'||el.textContent.includes('Export')||el.querySelector('#bar')||(el.querySelector('#title')&&el.querySelector('#desc')))group='export';
  else if(id==='mcProStudio')group='video';
  el.dataset.gsGroup=group;
  main.appendChild(el);
 });

 // Move the existing editor engine into a new responsive editing desk.
 // The media picker, preview, and editing controls stay in the same DOM so
 // the existing import, playback, timeline, and export handlers remain wired.
 const pro=$('mcProStudio');
 if(pro&&previewNode&&toolbar){
  previewNode.classList.add('gs-preview-canvas');
  toolbar.classList.add('gs-edit-tools');
  pro.appendChild(previewNode);
  pro.appendChild(toolbar);
  const panels=[...pro.querySelectorAll(':scope > .panel')];
  const mediaPanel=panels[0];
  const timelinePanel=panels[1];
  if(mediaPanel)mediaPanel.classList.add('gs-media-bin');
  if(timelinePanel){
   timelinePanel.classList.add('gs-timeline-content');
   const children=[...timelinePanel.children];
   const timelineHeading=children.find(el=>el.classList.contains('pro-head'));
   const timelineShell=timelinePanel.querySelector('.mc-timeline-shell');
   const inspector=timelinePanel.querySelector('.mc-clip-inspector');
   const range=timelinePanel.querySelector('.range');
   const lanes=timelinePanel.querySelector('.mc-lanes');
   const trackHeading=children.find(el=>el.classList.contains('pro-head')&&el!==timelineHeading);
   const trackActions=children.find(el=>el.classList.contains('pro-actions')&&el.querySelector('#mcSelectVideoTrack'));
   const note=children.find(el=>el.classList.contains('pro-note'));
   if(timelineHeading)timelineHeading.classList.add('gs-timeline-heading');
   if(timelineShell)timelineShell.classList.add('gs-timeline-shell');
   if(trackHeading)trackHeading.classList.add('gs-track-heading');
   if(trackActions)trackActions.classList.add('gs-track-actions');
   if(note)note.classList.add('gs-track-note');
   // Grid placement is applied to the original elements, not clones.
   if(inspector)inspector.classList.add('gs-clip-inspector');
   if(lanes)lanes.classList.add('gs-track-lanes');
  }
 }

 const creative=$('mcCreativeTools');
 if(creative)creative.dataset.gsGroup='voice';
 const groups={video:['video'],photo:['photo'],audio:['audio'],voice:['voice'],text:['text'],effects:['effects'],export:['export']};
 const titles={video:'Montage vidéo',photo:'Studio photo & création visuelle',audio:'Studio audio & mixage',voice:'Voix off',text:'Textes & titres',effects:'Effets & transitions',export:'Exportation & partage'};

 function showStudio(key){
  overlay.querySelectorAll('[data-studio]').forEach(b=>b.classList.toggle('active',b.dataset.studio===key));
  const home=$('gsHome'),work=$('gsWork');
  if(key==='home'){home.style.display='block';work.classList.remove('active');return;}
  home.style.display='none';work.classList.add('active');
  $('gsWorkTitle').textContent=titles[key]||'Studio';
  const allowed=groups[key]||[key];
  [...main.children].forEach(el=>{
   let show=allowed.includes(el.dataset.gsGroup);
   if(key==='photo'&&el.id==='mcProStudio')show=true;
   el.classList.toggle('gs-hidden',!show);
  });
  if(key==='photo'){
   $('gsWorkTitle').textContent='Studio photo & création visuelle';
   const ai=$('aiMediaPanel');
   if(ai)ai.classList.remove('gs-hidden');
  }
 }
 overlay.addEventListener('click',e=>{
  const btn=e.target.closest('[data-studio]');
  if(btn)showStudio(btn.dataset.studio);
 });
 $('gsHomeBtn').addEventListener('click',()=>showStudio('home'));
 $('gsClose').addEventListener('click',()=>{
  if(typeof window.openPage==='function')window.openPage('home');
  overlay.classList.remove('open');
 });
 const observer=new MutationObserver(()=>{
  const active=create.classList.contains('active');
  overlay.classList.toggle('open',active);
  if(active)showStudio('home');
 });
 observer.observe(create,{attributes:true,attributeFilter:['class']});
 const createNav=[...document.querySelectorAll('.nav')].find(n=>(n.textContent||'').toLowerCase().includes('créer'));
 if(createNav)createNav.setAttribute('aria-label','Ouvrir MALICUT Studio');
 window.MaliCutGlobalStudio={open:()=>{overlay.classList.add('open');showStudio('home');},close:()=>overlay.classList.remove('open'),show:showStudio};
})();