/* MaliCut Global Studio shell — responsive single-window workspace */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const create = $('create');
 if (!create || $('mcGlobalStudio')) return;
 const style = document.createElement('style');
 style.textContent = `
 #mcGlobalStudio{position:fixed;inset:0;z-index:100001;background:rgba(10,10,9,.88);backdrop-filter:blur(12px);display:none;align-items:center;justify-content:center;padding:clamp(0px,2vw,24px);color:var(--txt)}
 #mcGlobalStudio.open{display:flex}
 #mcGlobalStudio .gs-window{width:min(1440px,100%);height:min(900px,100%);aspect-ratio:16/9;min-height:0;background:var(--bg);border:1px solid var(--gold);border-radius:18px;box-shadow:0 24px 90px #0009;overflow:hidden;display:grid;grid-template-rows:58px minmax(0,1fr)}
 #mcGlobalStudio .gs-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 18px;border-bottom:1px solid var(--line);background:var(--p)}
 #mcGlobalStudio .gs-brand{font-weight:950;letter-spacing:.2px}
 #mcGlobalStudio .gs-brand em{font-style:normal;color:var(--gold)}
 #mcGlobalStudio .gs-body{display:grid;grid-template-columns:220px minmax(0,1fr);min-height:0}
 #mcGlobalStudio .gs-side{padding:14px 10px;border-right:1px solid var(--line);background:var(--p);display:flex;flex-direction:column;gap:6px;overflow:auto}
 #mcGlobalStudio .gs-nav{display:flex;align-items:center;gap:10px;text-align:left;padding:10px;border:1px solid transparent;border-radius:10px;color:var(--txt);font-size:13px}
 #mcGlobalStudio .gs-nav .gs-ico{width:28px;height:28px;display:grid;place-items:center;border-radius:8px;background:var(--p2);font-size:16px;flex:none}
 #mcGlobalStudio .gs-nav.active{border-color:var(--gold);background:var(--p2)}
 #mcGlobalStudio .gs-main{min-width:0;min-height:0;overflow:auto;padding:16px}
 #mcGlobalStudio .gs-home{max-width:1000px;margin:4px auto}
 #mcGlobalStudio .gs-home h2{font-size:clamp(22px,3vw,34px);margin:4px 0}
 #mcGlobalStudio .gs-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:22px}
 #mcGlobalStudio .gs-tile{min-height:116px;border:1px solid var(--line);border-radius:14px;background:var(--p);color:var(--txt);display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:8px;padding:15px;text-align:left}
 #mcGlobalStudio .gs-tile:hover{border-color:var(--gold);background:var(--p2)}
 #mcGlobalStudio .gs-tile .gs-ico{font-size:23px}
 #mcGlobalStudio .gs-tile b{font-size:13px}
 #mcGlobalStudio .gs-tile small{font-size:10px;color:var(--mut)}
 #mcGlobalStudio .gs-work{display:none}
 #mcGlobalStudio .gs-work.active{display:block}
 #mcGlobalStudio .gs-workhead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}
 #mcGlobalStudio .gs-stage{display:grid;grid-template-columns:minmax(220px,.85fr) minmax(300px,1.4fr);gap:14px;align-items:start}
 #mcGlobalStudio .gs-preview{position:sticky;top:0;min-width:0}
 #mcGlobalStudio .gs-preview .screen{max-height:48vh;aspect-ratio:16/9}
 #mcGlobalStudio .gs-panels{min-width:0}
 #mcGlobalStudio .gs-panels>.panel{margin:0 0 10px}
 #mcGlobalStudio .gs-panels>.panel.gs-hidden{display:none!important}
 #mcGlobalStudio .gs-back{border:1px solid var(--line);border-radius:10px;padding:8px 11px;background:var(--p2);color:var(--txt)}
 #mcGlobalStudio .gs-mobile-tabs{display:none}
 #mcGlobalStudio .gs-main .head{display:none!important}
 #mcGlobalStudio .gs-main .preview{margin:0 0 10px}
 #mcGlobalStudio .gs-main .editor-toolbar{flex-wrap:wrap}
 #mcGlobalStudio .gs-main .tools{overflow:visible}
 #mcGlobalStudio .gs-main .panel{color:var(--txt)}
 #mcGlobalStudio .gs-main .pro-actions button{font-size:12px}
 @media(max-width:760px){
  #mcGlobalStudio{padding:0}
  #mcGlobalStudio .gs-window{width:100%;height:100dvh;max-height:100dvh;aspect-ratio:auto;border-radius:0;border:0;grid-template-rows:52px minmax(0,1fr)}
  #mcGlobalStudio .gs-body{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}
  #mcGlobalStudio .gs-side{display:none}
  #mcGlobalStudio .gs-main{padding:10px}
  #mcGlobalStudio .gs-tiles{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px}
  #mcGlobalStudio .gs-tile{min-height:90px;padding:11px}
  #mcGlobalStudio .gs-mobile-tabs{display:flex;gap:6px;overflow:auto;padding:8px 0;position:sticky;top:-10px;background:var(--bg);z-index:4}
  #mcGlobalStudio .gs-mobile-tabs button{white-space:nowrap;border:1px solid var(--line);border-radius:20px;padding:7px 10px;background:var(--p);color:var(--txt);font-size:11px}
  #mcGlobalStudio .gs-mobile-tabs button.active{border-color:var(--gold);background:var(--p2)}
  #mcGlobalStudio .gs-stage{grid-template-columns:1fr}
  #mcGlobalStudio .gs-preview{position:relative}
  #mcGlobalStudio .gs-preview .screen{max-height:34vh;aspect-ratio:9/16}
  #mcGlobalStudio .gs-window .gs-top{padding:0 12px}
 }
 `;
 document.head.appendChild(style);
 const overlay=document.createElement('div'); overlay.id='mcGlobalStudio';
 overlay.innerHTML=`
  <div class="gs-window" role="dialog" aria-modal="true" aria-label="MaliCut Global Studio">
   <header class="gs-top"><div class="gs-brand">Mali<em>Cut</em> · Global Studio</div><div style="display:flex;gap:8px;align-items:center"><span class="muted" style="font-size:10px">Espace de création</span><button class="gs-back" id="gsClose">✕ Fermer</button></div></header>
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
     <section class="gs-home" id="gsHome"><h2>Bienvenue dans ta maison de création</h2><p class="muted">Tous tes espaces professionnels, réunis dans une seule fenêtre.</p><div class="gs-tiles">
      <button class="gs-tile" data-studio="video"><span class="gs-ico">▣</span><b>Montage vidéo</b><small>Timeline et médias</small></button>
      <button class="gs-tile" data-studio="photo"><span class="gs-ico">▧</span><b>Studio photo</b><small>Importer et composer</small></button>
      <button class="gs-tile" data-studio="audio"><span class="gs-ico">♫</span><b>Studio audio</b><small>Musique et mixage</small></button>
      <button class="gs-tile" data-studio="voice"><span class="gs-ico">🎙</span><b>Voix off</b><small>Enregistrer et importer</small></button>
      <button class="gs-tile" data-studio="text"><span class="gs-ico">T</span><b>Textes & titres</b><small>Styles et animations</small></button>
      <button class="gs-tile" data-studio="effects"><span class="gs-ico">✧</span><b>Effets & transitions</b><small>Filtres et rendu</small></button>
      <button class="gs-tile" data-studio="export"><span class="gs-ico">⇧</span><b>Export & partage</b><small>HD, 2K, 4K selon droits</small></button>
      <button class="gs-tile" data-studio="video"><span class="gs-ico">▤</span><b>Montage multipiste</b><small>Vidéo, audio, superpositions</small></button>
     </div></section>
     <section class="gs-work" id="gsWork"><div class="gs-workhead"><div><b id="gsWorkTitle">Montage vidéo</b><div class="muted" style="font-size:11px">Espace de travail intégré</div></div><button class="gs-back" id="gsHomeBtn">⌂ Tous les studios</button></div><div class="gs-stage"><div class="gs-preview" id="gsPreview"></div><div class="gs-panels" id="gsPanels"></div></div></section>
    </main>
   </div>
  </div>`;
 document.body.appendChild(overlay);
 const main=overlay.querySelector('#gsPanels'), preview=overlay.querySelector('#gsPreview');
 const all=[...create.children];
 all.forEach(el=>{if(el.classList.contains('head'))return; if(el.id==='mcProStudio'||el.id==='mcCreativeTools'||el.id==='mcExportQuality')return;});
 const head=create.querySelector(':scope > .head'); if(head)head.style.display='none';
 const direct=[...create.children].filter(el=>el!==head);
 const previewNode=direct.find(el=>el.classList.contains('preview'));
 const toolbar=direct.find(el=>el.classList.contains('editor-toolbar'));
 if(previewNode)preview.appendChild(previewNode);
 if(toolbar)preview.appendChild(toolbar);
 const studioNodes=direct.filter(el=>el!==previewNode&&el!==toolbar);
 // Studio Pro injects its three sections before this script runs.
 studioNodes.forEach(el=>{
   el.classList.add('gs-panel');
   const id=el.id||'';
   let group='video';
   if(id==='audioStudio')group='audio';
   else if(id==='effectsPanel'||id==='stickersPanel'||id==='adjust')group='effects';
   else if(id==='aiMediaPanel')group='photo';
   else if(id==='mcCreativeTools')group='voice';
   else if(id==='mcExportQuality'||el.textContent.includes('Export')||el.querySelector('#bar'))group='export';
   else if(id==='mcProStudio')group='video';
   el.dataset.gsGroup=group;
   main.appendChild(el);
 });
 // Split the mixed creative panel into reachable sub-studios using its existing controls.
 const creative=$('mcCreativeTools');
 if(creative){creative.dataset.gsGroup='voice';}
 const groups={
  video:['video'],photo:['photo'],audio:['audio'],voice:['voice'],text:['voice'],effects:['effects'],export:['export']
 };
 const titles={video:'Montage vidéo & multipiste',photo:'Studio photo',audio:'Studio audio',voice:'Studio voix off',text:'Textes & titres',effects:'Effets & transitions',export:'Exportation & partage'};
 function showStudio(key){
  overlay.querySelectorAll('[data-studio]').forEach(b=>b.classList.toggle('active',b.dataset.studio===key));
  const home=$('gsHome'),work=$('gsWork');
  if(key==='home'){home.style.display='block';work.classList.remove('active');return;}
  home.style.display='none';work.classList.add('active');$('gsWorkTitle').textContent=titles[key]||'Studio';
  const allowed=groups[key]||[key];
  [...main.children].forEach(el=>{
   let show=allowed.includes(el.dataset.gsGroup);
   if(key==='voice'&&el.id==='mcCreativeTools')show=true;
   if(key==='text'&&el.id==='mcCreativeTools')show=true;
   if(key==='photo'&&el.id==='mcProStudio')show=true;
   el.classList.toggle('gs-hidden',!show);
  });
  if(key==='photo'){$('gsWorkTitle').textContent='Studio photo & médias';}
  if(key==='text'){$('gsWorkTitle').textContent='Textes, titres & animations';}
  if(key==='voice'){$('gsWorkTitle').textContent='Studio audio & voix off';}
 }
 overlay.addEventListener('click',e=>{
  const btn=e.target.closest('[data-studio]');if(btn)showStudio(btn.dataset.studio);
 });
 $('gsHomeBtn').addEventListener('click',()=>showStudio('home'));
 $('gsClose').addEventListener('click',()=>{if(typeof window.openPage==='function')window.openPage('home');overlay.classList.remove('open');});
 const observer=new MutationObserver(()=>{
  const active=create.classList.contains('active');
  overlay.classList.toggle('open',active);
  if(active)showStudio('home');
 });
 observer.observe(create,{attributes:true,attributeFilter:['class']});
 // Provide a single visible Studio Pro entry on the existing Create tab.
 const createNav=[...document.querySelectorAll('.nav')].find(n=>(n.textContent||'').toLowerCase().includes('créer'));
 if(createNav){createNav.setAttribute('aria-label','Ouvrir MaliCut Global Studio');}
 window.MaliCutGlobalStudio={open:()=>{overlay.classList.add('open');showStudio('home');},close:()=>overlay.classList.remove('open'),show:showStudio};
})();