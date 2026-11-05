/* MaliCut Studio Pro — multi-media local editor (browser-based) */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const section = $('create');
  if (!section || !$('screen') || !$('video') || !$('file')) return;

  const state = { items: [], active: 0, camera: null, photoSeconds: 3, transition: 'fade', busy: false, voiceBlob: null, voiceUrl: null, recorder: null, look: 'none', overlayItems: [], activeTrack: 'video', quality: '720', lastExportUrl: null, fitMode: 'cover', projectRatio: '9/16', player: { playing:false,index:0,offset:0,baseOffset:0,startedAt:0,raf:0,token:0 } };
  const originalFile = $('file');
  originalFile.accept = 'video/*,image/*';
  originalFile.multiple = true;
  originalFile.setAttribute('multiple','multiple');
  originalFile.accept = 'image/*,video/*';
  originalFile.setAttribute('aria-label', 'Importer plusieurs photos et vidéos');

  const style = document.createElement('style');
  style.textContent = `
    #mcProStudio{display:grid;gap:12px;margin:12px 0}
    #mcProStudio .pro-timeline{display:flex;align-items:stretch;gap:7px;overflow-x:auto;overscroll-behavior-x:contain;padding:12px 4px 16px;scroll-snap-type:x proximity}
    #mcProStudio .mc-ruler{position:sticky;left:0;flex:0 0 100%;font:10px monospace;color:var(--mut);padding:3px 0}
    #mcProStudio .mc-clip{scroll-snap-align:start;display:flex;flex-direction:column;gap:5px}
    #mcProStudio .mc-clip img,#mcProStudio .mc-video-thumb{height:62px;object-fit:cover;border-radius:6px;background:#171713}
    #mcProStudio .mc-video-thumb{display:grid;place-items:center;color:#fff;font-weight:800}
    #mcProStudio .mc-clip-meta{font-size:10px;color:var(--mut)}
    #mcProStudio .mc-clip-actions{display:grid;grid-template-columns:1fr 1fr;gap:4px}
    #mcProStudio .mc-clip-actions button{font-size:10px;padding:6px 3px;border:1px solid var(--line);border-radius:6px;background:var(--p2);color:var(--txt)}
    #mcProStudio .mc-duration{font-size:10px;color:var(--mut);display:block}
    #mcProStudio .mc-duration input{padding:0;margin:3px 0;accent-color:var(--gold)}
    #mcProStudio .mc-duration select{font-size:11px;padding:5px;margin-top:3px}
    #mcProStudio .mc-cut-marker{align-self:center;flex:0 0 28px;writing-mode:vertical-rl;font-size:9px;color:var(--gold);text-align:center}
    #mcProStudio .pro-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
    #mcProStudio .pro-badge{font-size:10px;border:1px solid #bd9140;border-radius:20px;padding:5px 9px;color:inherit}
    #mcProStudio .pro-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    #mcProStudio .pro-actions button,#mcProStudio .pro-item button{min-height:42px}
    #mcProStudio .pro-timeline{display:flex;gap:8px;overflow:auto;padding:4px 1px}
    #mcProStudio .pro-item{min-width:108px;max-width:108px;border:1px solid var(--line);border-radius:12px;padding:6px;background:var(--p);position:relative}
    #mcProStudio .pro-item.active{outline:2px solid var(--gold)}
    #mcProStudio .pro-item img{width:100%;height:72px;object-fit:cover;border-radius:7px;background:#111}
    #mcProStudio .pro-item small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:5px 0}
    #mcProStudio .pro-item button{font-size:11px;padding:4px 7px;border:1px solid var(--line);border-radius:7px}
    #mcProStudio .pro-stage{position:relative}
    #mcProStudio video,#mcProStudio canvas{max-width:100%}
    #mcProStudio .pro-camera{width:100%;max-height:45vh;background:#080808;border-radius:12px}
    #mcProStudio .pro-note{font-size:11px;color:var(--mut);line-height:1.45}
    #mcProStudio .mc-lanes{display:grid;gap:7px;margin-top:10px}
    #mcProStudio .mc-lane{border:1px solid var(--line);border-radius:10px;padding:8px;background:#09130e}
    #mcProStudio .mc-lane-head{display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-bottom:6px}
    #mcProStudio .mc-lane-clips{display:flex;gap:6px;min-height:34px;overflow:auto}
    #mcProStudio .mc-lane-clip{padding:7px 9px;border-radius:7px;background:#20392a;font-size:10px;white-space:nowrap}
    #mcProStudio .mc-lane.selected{border-color:var(--gold)}
    #mcProStudio .mc-quality{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
    #mcProStudio .mc-quality button{border:1px solid var(--line);border-radius:9px;padding:9px 4px;background:var(--p2);font-size:11px}
    #mcProStudio .mc-quality button.active{border-color:var(--gold);color:var(--gold)}
    /* MaliCut horizontal editing timeline */
    #mcProStudio .mc-timeline-shell{width:100%;min-width:0;border:1px solid var(--line);border-radius:13px;background:#050b07;overflow:hidden}
    #mcProStudio .mc-timeline-top{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;background:#101d15;font-size:11px}
    #mcProStudio .mc-timeline-top input{width:92px;padding:0;accent-color:var(--gold)}
    #mcProStudio #mcTimeline{display:flex!important;flex-flow:row nowrap!important;align-items:stretch!important;width:100%!important;max-width:100%!important;min-height:116px;overflow-x:auto!important;overflow-y:hidden!important;box-sizing:border-box;padding:10px!important;gap:3px!important;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;overscroll-behavior-x:contain;background:#050b07;scrollbar-width:thin}
    #mcProStudio #mcTimeline .mc-ruler{display:flex!important;position:absolute;left:10px;top:5px;z-index:2;pointer-events:none}
    #mcProStudio #mcTimeline .mc-clip{position:relative;min-width:0;gap:3px}
    #mcProStudio #mcTimeline .pro-item.mc-clip{display:flex!important;flex:0 0 auto!important;flex-direction:column!important;width:var(--mc-clip-width,92px)!important;min-width:var(--mc-clip-width,92px)!important;max-width:none!important;box-sizing:border-box;padding:4px!important;border:1px solid #35513f;border-radius:7px;overflow:hidden;background:#14231a}
    #mcProStudio #mcTimeline .pro-item.mc-clip.active{border:2px solid var(--gold);outline:none}
    #mcProStudio #mcTimeline .mc-clip img,#mcProStudio #mcTimeline .mc-video-thumb{display:block!important;width:100%!important;height:48px!important;max-width:none!important;object-fit:cover;border-radius:4px}
    #mcProStudio #mcTimeline .pro-item small{font-size:9px;margin:1px 0}
    #mcProStudio #mcTimeline .mc-clip-meta{font-size:8px}
    #mcProStudio #mcTimeline .mc-clip-actions,#mcProStudio #mcTimeline .mc-duration{display:none!important}
    #mcProStudio #mcTimeline .mc-cut-marker{flex:0 0 15px;min-height:76px;writing-mode:vertical-rl;font-size:8px;opacity:.8}
    #mcProStudio .mc-clip-inspector{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:9px}
    #mcProStudio .mc-clip-inspector button,#mcProStudio .mc-clip-inspector select{min-width:0;padding:8px 4px;font-size:10px;border:1px solid var(--line);border-radius:8px;background:var(--p2);color:var(--txt)}
    #mcProStudio .mc-clip-inspector label{grid-column:1/-1;font-size:10px;color:var(--mut)}
    #mcProStudio .mc-clip-inspector input{padding:0;margin-top:6px;accent-color:var(--gold)}
    #mcProStudio .mc-clip-inspector .mc-inspector-name{grid-column:1/-1;font-size:11px;color:var(--gold)}
    #mcProStudio .mc-timeline-empty{padding:18px;color:var(--mut);font-size:11px}
    #mcProStudio #mcTimeline .mc-clip{position:relative;touch-action:pan-x pan-y;user-select:none;-webkit-user-select:none;cursor:grab}
    #mcProStudio #mcTimeline .mc-clip.mc-longpress{border-color:#9be6ff;box-shadow:0 0 0 3px #72d8ff44}
    #mcProStudio #mcTimeline .mc-clip.mc-dragging{opacity:.78;z-index:5;box-shadow:0 8px 22px #0008}
    #mcProStudio #mcTimeline .mc-trim-handle{position:absolute;top:0;bottom:0;width:13px;z-index:4;background:#e7bd4e;border:1px solid #fff8;touch-action:none;cursor:ew-resize}
    #mcProStudio #mcTimeline .mc-trim-handle.start{left:0;border-radius:6px 0 0 6px}
    #mcProStudio #mcTimeline .mc-trim-handle.end{right:0;border-radius:0 6px 6px 0}
    #mcProStudio #mcTimeline .mc-trim-handle:after{content:"";position:absolute;left:5px;top:42%;height:16%;border-left:2px solid #172219}

    @keyframes mcSequenceFade{from{opacity:0}to{opacity:1}}
    @keyframes mcSequenceZoom{from{opacity:.25;transform:scale(1.13)}to{opacity:1;transform:scale(1)}}
    @keyframes mcSequenceSlide{from{opacity:.2;transform:translateX(35px)}to{opacity:1;transform:translateX(0)}}
    @keyframes mcSequenceWipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
    @keyframes mcSequenceFlash{0%{opacity:.15;filter:brightness(3)}100%{opacity:1;filter:brightness(1)}}
    @keyframes mcSequenceBlur{from{opacity:.3;filter:blur(12px)}to{opacity:1;filter:blur(0)}}
    @keyframes mcSequenceSpin{from{opacity:.2;transform:rotate(8deg) scale(.82)}to{opacity:1;transform:rotate(0) scale(1)}}
    @keyframes mcSequenceGlitch{0%{transform:translateX(-5px);filter:hue-rotate(70deg)}40%{transform:translateX(5px);filter:hue-rotate(-70deg)}100%{transform:none;filter:none}}
    #mcProStudio .mc-playback-controls{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:9px 10px;background:#0b160f;border-top:1px solid var(--line)}
    #mcProStudio .mc-playback-controls button{border:1px solid #52685a;border-radius:9px;background:#18271d;color:#fff;padding:8px 12px;font-weight:800;font-size:12px}
    #mcProStudio .mc-playback-controls #mcPlayToggle{background:#f4f4f0;color:#172018;border-color:#fff;min-width:104px}
    #mcProStudio .mc-timecode{font:11px ui-monospace,monospace;color:#e8eee9;margin-left:auto}
    #mcProStudio #mcTimeline{position:relative!important}
    #mcProStudio .mc-transition-slot{position:relative;display:flex;flex:0 0 28px;align-items:center;justify-content:center;min-width:28px}
    #mcProStudio .mc-transition-button{width:25px;height:25px;border-radius:50%;border:1px solid #fff;background:#f7f7f3;color:#172018;font-size:16px;font-weight:900;line-height:1;padding:0;box-shadow:0 1px 5px #0008}
    #mcProStudio .mc-transition-select{position:absolute;z-index:20;top:31px;left:50%;transform:translateX(-50%);width:118px;padding:6px;border:1px solid #fff;border-radius:8px;background:#17251b;color:#fff;font-size:10px}
    #mcProStudio .mc-transition-select[hidden]{display:none}
    #mcProStudio .mc-history-controls{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
    #mcProStudio .mc-history-controls button{padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--p2);color:var(--txt)}
    #mcProStudio .mc-test-overlay{position:absolute;z-index:8;left:50%;top:50%;transform:translate(-50%,-50%);max-width:90%;padding:8px 12px;color:white;font-size:clamp(18px,5vw,38px);font-weight:900;text-align:center;text-shadow:0 2px 8px #000;background:#0003;border-radius:8px;pointer-events:none;white-space:pre-wrap;overflow-wrap:anywhere}
    #mcProStudio .mc-timeline-shell{border:1px solid #344b5d;border-radius:18px;background:linear-gradient(145deg,#07111d,#0b1824 55%,#101d2b);box-shadow:0 12px 34px #0005}
    #mcProStudio .mc-timeline-top{background:linear-gradient(90deg,#14283b,#172b3b);color:#dbeafe;padding:11px 13px;font-weight:800;letter-spacing:.04em}
    #mcProStudio #mcTimeline{min-height:158px;padding:30px 12px 14px!important;gap:6px!important;background-color:#07111d;background-image:repeating-linear-gradient(90deg,transparent 0,transparent 41px,#ffffff0b 42px);scroll-behavior:auto;overscroll-behavior-x:contain}
    #mcProStudio #mcTimeline .pro-item.mc-clip{border:1px solid #41617a;border-radius:11px;background:linear-gradient(160deg,#1c3448,#102333);box-shadow:0 4px 12px #0004;transition:border-color .12s,box-shadow .12s,opacity .12s}
    #mcProStudio #mcTimeline .pro-item.mc-clip.active{border:2px solid #70d6ff;box-shadow:0 0 0 2px #70d6ff33,0 8px 20px #0007}
    #mcProStudio #mcTimeline .mc-clip img,#mcProStudio #mcTimeline .mc-video-thumb{height:76px!important;border-radius:7px}
    #mcProStudio #mcTimeline .pro-item small{font-size:10px;color:#f3f8ff}
    #mcProStudio #mcTimeline .mc-clip-meta{font-size:9px;color:#a9c3d8}
    #mcProStudio #mcTimeline .mc-trim-handle{width:16px;background:linear-gradient(#9ce8ff,#48a9d5);border-color:#d9f5ff}
    #mcProStudio .mc-playback-controls{background:#101f2d;border-top:1px solid #30475a;padding:11px 13px}
    #mcProStudio .mc-playback-controls button{border-color:#45647d;background:#1a3246;min-height:42px}
    #mcProStudio .mc-playback-controls #mcPlayToggle{background:linear-gradient(135deg,#e5f7ff,#91d7f5);color:#102638;border:0}
    #mcProStudio .mc-transition-button{width:30px;height:30px;border:2px solid #b7edff;background:linear-gradient(145deg,#fff,#dff6ff);color:#0c2433;box-shadow:0 0 0 4px #5dc9f533,0 4px 12px #0008}
    #mcProStudio .mc-transition-select{top:36px;width:150px;background:#102638;border-color:#78c9ec;font-size:12px}
    #mcProStudio .mc-history-controls button{min-height:38px;border-color:#45647d;background:#13283a;color:#eaf7ff}
    #mcProStudio .mc-clip-inspector{background:#0d1b28;border:1px solid #30485b;border-radius:13px;padding:10px}
    #mcProStudio #mcTimelineRuler{position:absolute;z-index:3;left:0;top:3px;height:22px;pointer-events:none}
    #mcProStudio .mc-ruler-tick{position:absolute;top:0;height:18px;border-left:1px solid #7e9cb2;color:#9db9cc;font:9px ui-monospace,monospace;padding-left:3px}
    #mcProStudio .mc-text-studio{display:grid;gap:10px}
    #mcProStudio .mc-text-studio .mc-text-tools{display:grid;grid-template-columns:1fr;gap:8px}
    #mcProStudio .mc-text-studio input,#mcProStudio .mc-text-studio select{min-height:42px}
    #mcProStudio .mc-text-style-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    #mcProStudio .mc-text-style-grid label{display:grid;gap:5px;font-size:11px;color:var(--mut)}
    @keyframes mcTextPop{from{opacity:0;transform:translate(-50%,-50%) scale(.3)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
    @keyframes mcTextRise{from{opacity:0;transform:translate(-50%,30%)}to{opacity:1;transform:translate(-50%,-50%)}}
    @keyframes mcTextBounce{0%{transform:translate(-50%,-50%) scale(.4)}60%{transform:translate(-50%,-50%) scale(1.15)}100%{transform:translate(-50%,-50%) scale(1)}}
    @keyframes mcTextNeon{0%,100%{text-shadow:0 0 6px #fff,0 0 18px #24e5a1}50%{text-shadow:0 0 2px #fff,0 0 30px #24e5a1}}
    @keyframes mcTextGlitch{0%,100%{transform:translate(-50%,-50%)}25%{transform:translate(-48%,-50%)}50%{transform:translate(-52%,-50%)}}
    @keyframes mcTextType{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
    #mcProStudio .mc-timeline-playhead{position:absolute;z-index:9;top:4px;bottom:4px;left:10px;width:2px;background:#fff;box-shadow:0 0 0 1px #e7bd4e,0 0 8px #fff;pointer-events:none}
    #mcProStudio .mc-timeline-playhead:before{content:"";position:absolute;top:0;left:-4px;width:10px;height:10px;border-radius:50%;background:#fff;border:1px solid #d8b75b}
    @media(min-width:700px){#mcProStudio .mc-clip-inspector{grid-template-columns:repeat(6,minmax(0,1fr))}}
    @media(min-width:700px){#mcProStudio .pro-actions{grid-template-columns:repeat(4,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'mcProStudio';
  panel.innerHTML = `
    <div class="panel">
      <div class="pro-head"><b>✦ MaliCut Studio Pro</b><span class="pro-badge">Éditeur multimédia</span></div>
      <p class="pro-note">Assemble des photos et des vidéos dans un même projet, capture une photo avec la caméra et ajoute des transitions entre les séquences.</p>
      <input id="mcMediaPicker" type="file" accept="image/*,video/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.mp4,.m4v,.mov,.webm,.mkv,.3gp" multiple hidden>
      <div class="pro-actions">
        <button class="btn gold" id="mcImport">＋ Importer médias</button>
        <button class="btn" id="mcCamera">▣ Prendre une photo</button>
        <button class="btn" id="mcAddPhoto">＋ Ajouter une image</button>
        <button class="btn" id="mcClear">↺ Nouveau projet</button>
      </div>
      <div id="mcCameraBox" class="hidden" style="margin-top:10px">
        <video id="mcCameraVideo" class="pro-camera" autoplay playsinline muted></video>
        <div class="pro-actions" style="margin-top:8px"><button class="btn gold" id="mcCapture">● Capturer</button><button class="btn" id="mcStopCamera">Fermer caméra</button></div>
      </div>
    </div>
    <div class="panel">
      <div class="pro-head"><b>Timeline du projet</b><span class="muted" id="mcCount">0 média</span></div>
      <div class="mc-timeline-shell">
        <div class="mc-timeline-top"><span>◷ TEMPS · PISTE PRINCIPALE</span><label>Zoom <input id="mcTimelineZoom" type="range" min="70" max="180" value="100"></label></div>
        <div class="pro-timeline" id="mcTimeline"><div class="mc-timeline-empty">＋ Importe tes photos et vidéos pour commencer.</div></div>
        <div class="mc-playback-controls"><button type="button" id="mcPlayToggle">▶ Lecture</button><button type="button" id="mcStopPlayback">■ Arrêt</button><button type="button" id="mcAddClip">＋ Ajouter un clip</button><span class="mc-timecode" id="mcTimecode">00:00 / 00:00</span></div><div class="mc-history-controls"><button type="button" id="mcUndo" disabled>↶ Revenir en arrière</button><button type="button" id="mcRedo" disabled>↷ Rétablir</button></div>
      </div>
      <div class="mc-clip-inspector" id="mcClipInspector">
        <div class="mc-inspector-name" id="mcInspectorName">Sélectionne un clip dans la timeline</div>
      </div>
      <div class="range">
        <label class="muted">Durée des photos (secondes)<input id="mcPhotoDuration" type="number" min="1" max="30" step="1" value="3"></label>
        <label class="muted">Transition entre médias<select id="mcTransition"><option value="fade">Fondu enchaîné</option><option value="cut">Coupe directe</option></select></label>
      </div>
      <div class="pro-head" style="margin-top:12px"><b>Timeline multipiste</b><span class="pro-badge">4 couches</span></div>
      <div class="pro-actions">
        <button class="btn" id="mcSelectVideoTrack">＋ Piste vidéo</button>
        <button class="btn" id="mcSelectOverlayTrack">＋ Superposition</button>
        <button class="btn" id="mcSelectAudioTrack">＋ Piste audio</button>
        <button class="btn" id="mcSelectTextTrack">＋ Piste texte</button>
      </div>
      <div class="mc-lanes" id="mcLanes">
        <div class="mc-lane selected" data-track="video"><div class="mc-lane-head"><b>V1 · Vidéo principale</b><span id="mcVideoLaneCount">0 clip</span></div><div class="mc-lane-clips" id="mcVideoLane"></div></div>
        <div class="mc-lane" data-track="overlay"><div class="mc-lane-head"><b>V2 · Superpositions photo</b><span id="mcOverlayLaneCount">0 clip</span></div><div class="mc-lane-clips" id="mcOverlayLane"></div></div>
        <div class="mc-lane" data-track="audio"><div class="mc-lane-head"><b>A1 · Musique / voix off</b><span id="mcAudioLaneCount">0 piste</span></div><div class="mc-lane-clips" id="mcAudioLane"></div></div>
        <div class="mc-lane" data-track="text"><div class="mc-lane-head"><b>T1 · Titres et sous-titres</b><span>Texte animé</span></div><div class="mc-lane-clips"><span class="mc-lane-clip">Calque texte</span></div></div>
      </div>
      <p class="pro-note">Choisis une piste avant d'importer : les photos de V2 sont superposées au montage principal. Les pistes audio et texte restent séparées.</p>
    </div>`;
  const header = section.querySelector('.head');
  header ? header.after(panel) : section.prepend(panel);

  const creative = document.createElement('div');
  creative.className = 'panel';
  creative.id = 'mcCreativeTools';
  creative.innerHTML = `
    <div class="pro-head"><b>✦ Création avancée & IA</b><span class="pro-badge">Outils créatifs</span></div>
    <div class="pro-actions" style="margin-top:9px">
      <label class="btn" style="display:grid;place-items:center">🎙️ Voix off<input id="mcVoiceFile" type="file" accept="audio/*" hidden></label>
      <button class="btn" id="mcRecordVoice">● Enregistrer voix</button>
      <button class="btn" id="mcStopVoice" disabled>■ Arrêter</button>
      <button class="btn" id="mcPreviewVoice" disabled>▶ Écouter voix</button>
    </div>
    <div class="pro-note" id="mcVoiceStatus">Enregistre une narration au micro ou importe un fichier audio de voix off.</div>
    <div class="range">
      <label class="muted">Volume voix off <input id="mcVoiceVolume" type="range" min="0" max="150" value="100"></label>
      <label class="muted">Volume musique <input id="mcMusicVolume" type="range" min="0" max="100" value="65"></label>
    </div>
    <div class="range">
      <label class="muted">Transition vidéo<select id="mcTransitionPro">
        <option value="fade">Fondu cinéma</option><option value="cut">Coupe nette</option>
        <option value="zoom">Zoom dynamique</option><option value="slide">Glissement latéral</option>
        <option value="wipe">Balayage</option><option value="flash">Flash blanc</option>
        <option value="blur">Flou progressif</option><option value="spin">Rotation</option>
        <option value="glitch">Glitch numérique</option><option value="push">Push latéral</option><option value="circle">Ouverture circulaire</option><option value="vertical">Rideau vertical</option><option value="diagonal">Balayage diagonal</option><option value="dissolve">Dissolution</option><option value="rotate3d">Rotation 3D</option><option value="stretch">Étirement</option><option value="none">Aucune</option>
      </select></label>
      <label class="muted">Durée transition (s)<input id="mcTransitionDuration" type="number" min=".2" max="2" step=".1" value=".6"></label>
    </div>
    <div class="range">
      <label class="muted">Texte animé<select id="mcTextMotion">
        <option value="fade">Fondu doux</option><option value="type">Machine à écrire</option>
        <option value="pop">Pop dynamique</option><option value="rise">Montée élégante</option>
        <option value="bounce">Rebond</option><option value="neon">Néon</option>
        <option value="glitch">Glitch</option><option value="none">Statique</option>
      </select></label>
      <label class="muted">Style de texte<select id="mcTextStyle">
        <option value="bold">Creator Bold</option><option value="neon">Neon Glow</option>
        <option value="cinema">Cinéma</option><option value="subtitle">Sous-titre clean</option>
        <option value="gradient">Dégradé premium</option><option value="outline">Contour fort</option>
      </select></label>
    </div>
    <div class="pro-actions">
      <button class="btn" data-suggest="Titre puissant">Titre puissant</button>
      <button class="btn" data-suggest="Sous-titre minimal">Sous-titre minimal</button>
      <button class="btn" data-suggest="Citation cinématique">Citation cinéma</button>
      <button class="btn" data-suggest="Hook TikTok">Hook social</button>
    </div>
    <div class="pro-head" style="margin-top:10px"><b>Effets créateurs</b></div>
    <div class="pro-actions">
      <button class="btn" data-look="shake">Caméra dynamique</button>
      <button class="btn" data-look="pulse">Pulse / Beat</button>
      <button class="btn" data-look="flash">Flash cut</button>
      <button class="btn" data-look="rgb">RGB split</button>
      <button class="btn" data-look="vignette">Vignette cinéma</button>
      <button class="btn" data-look="soft">Glow doux</button>
    </div>
    <p class="pro-note">Les effets sont des préréglages visuels originaux. Les effets corporels avancés de type AR/face tracking nécessitent un moteur dédié et ne sont pas simulés ici.</p>
  `;
  creative.insertAdjacentHTML('beforeend','<div class="pro-head" style="margin-top:12px"><b>Texte animé dans la vidéo</b><span class="pro-badge">Standard + PRO</span></div><div class="mc-text-tools"><input id="mcOverlayText" type="text" maxlength="90" placeholder="Écris ton texte ici"><select id="mcOverlayMotion"><option value="fade">Fondu · Standard</option><option value="pop">Pop · Standard</option><option value="rise">Montée · Standard</option><option value="bounce">Rebond · Standard</option><option value="type">Machine à écrire · Standard</option><option value="neon">Néon · Standard</option><option value="glitch">Glitch · Standard</option><option value="zoom">Zoom · Standard</option><option value="parallax">Parallaxe · PRO</option><option value="kenburns">Ken Burns · PRO</option><option value="3d">Perspective 3D · PRO</option><option value="elastic">Élastique · PRO</option><option value="whip">Whip · PRO</option><option value="mosaic">Mosaïque · PRO</option><option value="spark">Étincelles · PRO</option><option value="wave">Vague · PRO</option></select><button type="button" class="btn gold" id="mcAddOverlayText">＋ Ajouter le texte</button><button type="button" class="btn" id="mcRemoveOverlayText">Retirer le texte</button></div><p class="pro-note">Le texte ajouté sera visible dans l’aperçu et intégré à l’export vidéo.</p>');
  panel.after(creative);
  let overlayText='',overlayMotion='fade';
  let overlaySettings={position:'center',size:6.5,color:'#ffffff',background:'none'};
  let textLayer=$('screen').querySelector('.mc-test-overlay');
  function renderOverlayText(){
    if(!overlayText){textLayer?.remove();textLayer=null;return;}
    if(!textLayer){textLayer=document.createElement('div');textLayer.className='mc-test-overlay';$('screen').appendChild(textLayer);}
    textLayer.textContent=overlayText;
    textLayer.style.left='50%';textLayer.style.top=overlaySettings.position==='top'?'16%':overlaySettings.position==='bottom'?'84%':'50%';
    textLayer.style.transform='translate(-50%,-50%)';textLayer.style.fontSize='clamp(18px,'+overlaySettings.size+'vw,64px)';
    textLayer.style.color=overlaySettings.color;textLayer.style.background=overlaySettings.background==='dark'?'#07111ddd':overlaySettings.background==='soft'?'#07111d88':'transparent';
    const style=$('mcTextStyle')?.value||'bold';textLayer.style.fontFamily=style==='cinema'?'Georgia,serif':'system-ui,sans-serif';
    textLayer.style.fontWeight=style==='subtitle'?'600':'900';textLayer.style.fontStyle=style==='cinema'?'italic':'normal';
    textLayer.style.textShadow=style==='neon'?'0 0 8px '+overlaySettings.color+',0 0 22px '+overlaySettings.color:'0 2px 10px #000';
    textLayer.style.webkitTextStroke=style==='outline'?'1px #111':'0';
    textLayer.style.animation=({fade:'mcSequenceFade',pop:'mcTextPop',rise:'mcTextRise',bounce:'mcTextBounce',type:'mcTextType',neon:'mcTextNeon',glitch:'mcTextGlitch',zoom:'mcSequenceZoom',parallax:'mcSequenceSlide',kenburns:'mcSequenceZoom','3d':'mcSequenceSpin',elastic:'mcTextBounce',whip:'mcSequenceSlide',mosaic:'mcTextGlitch',spark:'mcTextNeon',wave:'mcTextRise'})[overlayMotion]+' .8s ease both';
  }
  ['mcOverlayPosition','mcOverlaySize','mcOverlayColor','mcOverlayBackground','mcTextStyle'].forEach(id=>$(id)?.addEventListener('input',()=>{
    overlaySettings.position=$('mcOverlayPosition').value;overlaySettings.size=Number($('mcOverlaySize').value)||6.5;overlaySettings.color=$('mcOverlayColor').value;overlaySettings.background=$('mcOverlayBackground').value;renderOverlayText();
  }));
  $('mcOverlayPosition').onchange=()=>{overlaySettings.position=$('mcOverlayPosition').value;renderOverlayText();};
  $('mcOverlayBackground').onchange=()=>{overlaySettings.background=$('mcOverlayBackground').value;renderOverlayText();};
  $('mcAddOverlayText').onclick=()=>{const value=$('mcOverlayText').value.trim();if(!value){setStatus('Écris un texte avant de l’ajouter.');return;}const motion=$('mcOverlayMotion').value;const pro=['parallax','kenburns','3d','elastic','whip','mosaic','spark','wave'];if(pro.includes(motion)&&window.MALICUT_IS_PRO!==true){setStatus('Cette animation est réservée à MaliCut Pro.');return;}overlayText=value;overlayMotion=motion;renderOverlayText();setStatus('Texte animé ajouté à la vidéo.');};
  $('mcRemoveOverlayText').onclick=()=>{overlayText='';renderOverlayText();setStatus('Texte retiré de l’aperçu.');};

  const qualityPanel=document.createElement('div');
  qualityPanel.className='panel';
  qualityPanel.id='mcExportQuality';
  qualityPanel.innerHTML=`
    <div class="pro-head"><b>Qualité d'export</b><span class="pro-badge">HD · 4K Pro</span></div>
    <div class="mc-quality">
      <button data-quality="720" class="active">720p</button>
      <button data-quality="1080">1080p</button>
      <button data-quality="1440">2K <small>PRO</small></button>
      <button data-quality="2160">4K <small>PRO</small></button>
    </div>
    <p class="pro-note" id="mcQualityNote">720p · Export HD standard. 1080p disponible également.</p>
    <div class="pro-head" style="margin-top:12px"><b>Partager après export</b></div>
    <label class="pro-note" style="display:flex;gap:9px;align-items:flex-start;margin:8px 0"><input id="mcAutoPublish" type="checkbox" style="width:auto;min-width:18px;margin-top:2px"> <span><b>Publier automatiquement mes prochains exports dans la communauté MaliCut</b><br>Activé uniquement avec ton accord. Tu peux désactiver ce réglage à tout moment.</span></label>
    <div class="pro-actions" id="mcShareActions" style="opacity:.55">
      <button class="btn" data-share="tiktok" disabled>TikTok</button><button class="btn" data-share="snapchat" disabled>Snapchat</button>
      <button class="btn" data-share="whatsapp" disabled>WhatsApp</button><button class="btn" data-share="instagram" disabled>Instagram</button>
      <button class="btn" data-share="youtube" disabled>YouTube</button><button class="btn gold" data-share="malicut" disabled>Communauté MaliCut</button>
    </div>
    <p class="pro-note" id="mcShareNote">Les options de partage seront activées après un export réussi. La disponibilité dépend des applications installées et des capacités Android.</p>
  `;
  creative.after(qualityPanel);
  const textStudio=document.createElement('div');
  textStudio.className='panel mc-text-studio';
  textStudio.id='mcTextStudio';
  textStudio.innerHTML='<div class="pro-head"><b>Texte & titres professionnels</b><span class="pro-badge">Studio texte</span></div><p class="pro-note">Crée un titre, règle son style, sa position et son animation, puis vérifie le résultat dans l’aperçu et dans l’export.</p><div class="mc-text-style-grid"><label>Position<select id="mcOverlayPosition"><option value="center">Centre</option><option value="top">Haut</option><option value="bottom">Bas</option></select></label><label>Taille du texte<input id="mcOverlaySize" type="range" min="3" max="11" step=".5" value="6.5"></label><label>Couleur du texte<input id="mcOverlayColor" type="color" value="#ffffff"></label><label>Fond du texte<select id="mcOverlayBackground"><option value="none">Sans fond</option><option value="dark">Fond sombre</option><option value="soft">Fond transparent</option></select></label></div>';
  const overlayTools=creative.querySelector('.mc-text-tools');
  const textMotionRange=[...creative.querySelectorAll('.range')].find(el=>el.querySelector('#mcTextMotion'));
  if(overlayTools)textStudio.appendChild(overlayTools);
  if(textMotionRange)textStudio.appendChild(textMotionRange);
  qualityPanel.after(textStudio);
  const autoPublish=$('mcAutoPublish');
  autoPublish.checked=localStorage.getItem('malicut_auto_publish')==='true';
  autoPublish.addEventListener('change',()=>localStorage.setItem('malicut_auto_publish',String(autoPublish.checked)));
  const imagePreview = document.createElement('img');
  imagePreview.id = 'mcImagePreview';
  imagePreview.alt = 'Aperçu de la photo sélectionnée';
  imagePreview.style.cssText = 'display:none;width:100%;height:100%;object-fit:cover;position:absolute;inset:0;background:#000;border-radius:13px';
  $('screen').appendChild(imagePreview);
  const formatPanel = [...section.querySelectorAll('.panel')].find(p => /^Format$/i.test(p.querySelector('b')?.textContent?.trim() || ''));
  const formatGrid = formatPanel?.querySelector('.formats');
  if (formatGrid) {
    [['4/3','4:3'],['3/4','3:4'],['2/3','2:3']].forEach(([ratio,label]) => {
      if ([...formatGrid.querySelectorAll('.format')].some(b => b.textContent.trim() === label)) return;
      const button = document.createElement('button'); button.type='button'; button.className='format'; button.textContent=label;
      button.addEventListener('click', () => { if (typeof window.ratioSet === 'function') window.ratioSet(ratio,button); applyStageFormat(ratio); });
      formatGrid.appendChild(button);
    });
    const fitTools = document.createElement('div'); fitTools.className='range'; fitTools.style.marginTop='10px';
    fitTools.innerHTML='<button type="button" class="btn gold" data-fit="cover">Remplir le cadre</button><button type="button" class="btn" data-fit="contain">Afficher l’image entière</button>';
    formatPanel.appendChild(fitTools);
    fitTools.addEventListener('click', e => { const b=e.target.closest('[data-fit]'); if(!b)return; state.fitMode=b.dataset.fit; fitTools.querySelectorAll('[data-fit]').forEach(x=>x.classList.toggle('gold',x===b)); applyFitMode(); });
  }
  function applyFitMode() {
    const value=state.fitMode==='cover'?'cover':'contain';
    imagePreview.style.objectFit=value; $('video').style.objectFit=value;
    const buttons=formatPanel?.querySelectorAll('[data-fit]')||[];
    buttons.forEach(b=>{b.classList.toggle('gold',b.dataset.fit===state.fitMode);});
  }
  function applyStageFormat(value) {
    const normalized=String(value||'9/16').replace(':','/');
    state.projectRatio=normalized;
    const parts=normalized.split('/').map(Number);
    const ratio=parts[0]>0&&parts[1]>0?parts[0]/parts[1]:9/16;
    const holder=$('screen').parentElement;
    const maxWidth=Math.max(160,holder.clientWidth);
    const maxHeight=Math.max(180,Math.min(window.innerHeight*.56,560));
    const width=Math.min(maxWidth,maxHeight*ratio);
    const height=width/ratio;
    holder.style.display='flex';holder.style.justifyContent='center';
    $('screen').style.aspectRatio=normalized;
    $('screen').style.width=Math.round(width)+'px';
    $('screen').style.height=Math.round(height)+'px';
    $('screen').style.maxHeight='none';
    applyFitMode();
  }
  formatPanel?.querySelectorAll('.formats .format').forEach(b=>b.addEventListener('click',()=>{
    const label=b.textContent.trim();
    if (/^(9:16|16:9|1:1|4:5|4:3|3:4|2:3)$/.test(label)) applyStageFormat(label);
  }));
  applyStageFormat(formatPanel?.querySelector('.formats .format.active')?.textContent?.trim() || '9:16');
  window.addEventListener('resize',()=>applyStageFormat(state.projectRatio));

  function setStatus(message) { const el = $('status'); if (el) el.textContent = message; }
  function stopCamera() {
    if (state.camera) state.camera.getTracks().forEach(t => t.stop());
    state.camera = null;
    $('mcCameraBox').classList.add('hidden');
    $('mcCameraVideo').srcObject = null;
  }
  function detectMediaKind(file) {
    const mime=String(file && file.type || '').toLowerCase();
    const name=String(file && file.name || '').toLowerCase();
    if(mime.startsWith('image/')) return 'image';
    if(mime.startsWith('video/')) return 'video';
    if(/\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|tiff?)$/i.test(name)) return 'image';
    if(/\.(mp4|m4v|mov|webm|mkv|3gp|mpeg|mpg|avi)$/i.test(name)) return 'video';
    return '';
  }
  function makeItem(file, url) {
    const kind=detectMediaKind(file);
    return { file, url, type:kind || 'video', name:file.name||(kind==='image'?'Photo importée':'Vidéo importée'), duration:kind==='image'?state.photoSeconds:3, durationAuto:kind!=='image', trimStart:0, transitionBefore:null };
  }
  function addFiles(files) {
    const accepted=Array.from(files||[]).filter(f=>{const t=String(f?.type||'').toLowerCase(),n=String(f?.name||'').toLowerCase();return t.startsWith('image/')||t.startsWith('video/')||/\.(jpe?g|png|webp|gif|bmp|avif|heic|heif|tif?f|mp4|m4v|mov|webm|mkv|3gp|mpeg|mpg|avi)$/i.test(n);});
    if(!accepted.length){setStatus('Choisis des photos ou des vidéos compatibles.');return;}
    pauseSequence();pushHistory();
    const first=state.items.length;
    let imported=0;
    accepted.forEach(file=>{
      let objectUrl;
      try { objectUrl=URL.createObjectURL(file); }
      catch(error) { console.warn('[MaliCut Studio] Could not create media URL:', file && file.name, error); return; }
      const item=makeItem(file,objectUrl);state.items.push(item);imported++;
      if(item.type==='video'){
        const probe=document.createElement('video');probe.preload='metadata';probe.src=item.url;
        probe.onloadedmetadata=()=>{
          if(item.durationAuto&&Number.isFinite(probe.duration)&&probe.duration>0){item.duration=Math.max(.5,probe.duration-(Number(item.trimStart)||0));item.durationAuto=false;renderTimeline();renderLanes();}
          probe.removeAttribute('src');probe.load();
        };
        probe.onerror=()=>{item.durationAuto=false;};
      }
    });
    if(!imported){setStatus('Les fichiers ont été sélectionnés, mais le navigateur ne peut pas les ouvrir. Essaie un fichier JPG, PNG ou MP4.');return;}
    state.active=first;state.player.index=first;state.player.offset=0;renderTimeline();previewActive();renderLanes();
    setStatus(imported+' média ajouté(s) à la piste principale · '+state.items.length+' clip(s) au total.');
  }
  let timelineZoom=1;
  const history={undo:[],redo:[]};
  function snapshotProject(){return {items:state.items.map(item=>({...item})),active:state.active};}
  function updateHistoryButtons(){const u=$('mcUndo'),r=$('mcRedo');if(u)u.disabled=!history.undo.length;if(r)r.disabled=!history.redo.length;}
  function pushHistory(){history.undo.push(snapshotProject());if(history.undo.length>60)history.undo.shift();history.redo=[];updateHistoryButtons();}
  function restoreHistory(source,target){if(!source.length)return;target.push(snapshotProject());const snap=source.pop();state.items=snap.items.map(item=>({...item}));state.active=Math.max(0,Math.min(snap.active,state.items.length-1));pauseSequence();state.player.index=state.active;state.player.offset=0;renderTimeline();previewActive();renderLanes();updateHistoryButtons();setStatus('Modification restaurée.');}
  $('mcUndo').onclick=()=>restoreHistory(history.undo,history.redo);
  $('mcRedo').onclick=()=>restoreHistory(history.redo,history.undo);
  function renderTimeline() {
    $('mcCount').textContent = state.items.length + ' média' + (state.items.length > 1 ? 's' : '');
    const target = $('mcTimeline');
    if (!state.items.length) {
      target.innerHTML = '<div class="mc-timeline-empty">＋ Importe tes photos et vidéos pour commencer.</div>';
      $('mcClipInspector').innerHTML='<div class="mc-inspector-name">Aucun clip sélectionné</div>';
      renderLanes(); return;
    }
    const total=state.items.reduce((n,x)=>n+(Number(x.duration)||3),0);
    target.innerHTML = state.items.map((item,i)=>{
      const seconds=Math.max(.5,Number(item.duration)||3),width=Math.max(96,Math.min(360,seconds*42))*timelineZoom;
      const transition=state.items[i+1]?.transitionBefore?.type||'none';
      const clip='<div class="pro-item mc-clip '+(i===state.active?'active':'')+'" data-index="'+i+'" style="--mc-clip-width:'+width+'px" draggable="true">'+
        '<i class="mc-trim-handle start" data-trim="start" aria-label="Début du clip"></i><i class="mc-trim-handle end" data-trim="end" aria-label="Fin du clip"></i>'+
        (item.type==='image'?'<img src="'+item.url+'" alt="">':'<div class="mc-video-thumb">▶ VIDÉO</div>')+
        '<small>'+(i+1)+'. '+String(item.name).replace(/[<>&"]/g,'')+'</small><div class="mc-clip-meta">'+seconds.toFixed(1)+' s · '+(item.type==='image'?'PHOTO':'VIDÉO')+'</div></div>';
      const marker=i<state.items.length-1?'<div class="mc-transition-slot" data-boundary="'+(i+1)+'"><button type="button" class="mc-transition-button" aria-label="Transition entre les clips '+(i+1)+' et '+(i+2)+'">'+(transition==='none'?'✧':'✓')+'</button><select class="mc-transition-select" data-transition-index="'+(i+1)+'" hidden><option value="none">Sans transition</option><option value="fade">Fondu</option><option value="zoom">Zoom</option><option value="slide">Glissement</option><option value="wipe">Balayage</option><option value="flash">Flash blanc</option><option value="blur">Flou</option><option value="spin">Rotation</option><option value="glitch">Glitch</option><option value="push">Push latéral</option><option value="circle">Ouverture circulaire</option><option value="vertical">Rideau vertical</option><option value="diagonal">Balayage diagonal</option><option value="dissolve">Dissolution</option><option value="rotate3d">Rotation 3D</option><option value="stretch">Étirement</option></select></div>':'';
      return clip+marker;
    }).join('');
    const ruler=document.createElement('div');ruler.id='mcTimelineRuler';ruler.style.width=Math.max(target.clientWidth,total*42*timelineZoom+state.items.length*34+24)+'px';
    const tickStep=total>45?5:total>18?2:1;
    for(let sec=0;sec<=total;sec+=tickStep){const tick=document.createElement('span');tick.className='mc-ruler-tick';tick.style.left=(sec*42*timelineZoom)+'px';tick.textContent=formatTime(sec);ruler.appendChild(tick);}
    target.appendChild(ruler);
    const playhead=document.createElement('div');playhead.className='mc-timeline-playhead';playhead.id='mcTimelinePlayhead';target.appendChild(playhead);
    target.querySelectorAll('.mc-transition-slot').forEach(slot=>{
      const button=slot.querySelector('.mc-transition-button'),select=slot.querySelector('.mc-transition-select');
      const boundary=Number(slot.dataset.boundary),next=state.items[boundary];
      if(next?.transitionBefore?.type)select.value=next.transitionBefore.type;
      button.addEventListener('click',()=>{select.hidden=!select.hidden;});
      select.addEventListener('change',()=>{
        pushHistory();if(select.value==='none')next.transitionBefore=null;
        else next.transitionBefore={type:select.value,duration:Math.max(.2,Math.min(2,Number($('mcTransitionDuration').value)||.6))};
        button.textContent=select.value==='none'?'✧':'✓';select.hidden=true;
        setStatus(select.value==='none'?'Transition retirée.':'Transition ajoutée entre les clips '+boundary+' et '+(boundary+1)+'.');
      });
    });
    target.querySelectorAll('.mc-clip').forEach(clip=>{
      let gesture=null;
      clip.addEventListener('pointerdown',e=>{
        const i=Number(clip.dataset.index),edge=e.target.closest('[data-trim]')?.dataset.trim||null;
        if(e.pointerType==='mouse'&&e.button!==0)return;
        gesture={id:e.pointerId,index:i,edge,x:e.clientX,originalDuration:Number(state.items[i].duration)||3,originalStart:Number(state.items[i].trimStart)||0,moved:false,reorder:e.pointerType==='mouse'||!!edge,timer:null};
        if(edge){clip.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation();}
        else if(e.pointerType==='mouse'){clip.setPointerCapture(e.pointerId);}
        else{gesture.timer=setTimeout(()=>{if(gesture&&gesture.id===e.pointerId){gesture.reorder=true;clip.setPointerCapture(e.pointerId);clip.classList.add('mc-longpress');}},260);}
      });
      clip.addEventListener('pointermove',e=>{
        if(!gesture||gesture.id!==e.pointerId)return;
        const dx=e.clientX-gesture.x;
        if(!gesture.edge&&!gesture.reorder){if(Math.abs(dx)>7&&gesture.timer){clearTimeout(gesture.timer);gesture.timer=null;}return;}
        if(gesture.edge){
          e.preventDefault();
          const delta=dx/(42*timelineZoom);
          const item=state.items[gesture.index];
          if(gesture.edge==='end'){if(!gesture.saved){pushHistory();gesture.saved=true;}item.duration=Math.max(.5,Math.min(30,gesture.originalDuration+delta));item.durationAuto=false;}
          else if(item.type==='video'){
            const shift=Math.max(-gesture.originalStart,Math.min(gesture.originalDuration-.5,delta));
            if(!gesture.saved){pushHistory();gesture.saved=true;}item.trimStart=gesture.originalStart+shift;item.duration=Math.max(.5,gesture.originalDuration-shift);item.durationAuto=false;
          }
          const width=Math.max(96,Math.min(360,item.duration*42))*timelineZoom;
          clip.style.width=width+'px';clip.style.minWidth=width+'px';clip.style.setProperty('--mc-clip-width',width+'px');
          const meta=clip.querySelector('.mc-clip-meta');if(meta)meta.textContent=item.duration.toFixed(1)+' s';
          const durationLabel=$('mcInspectorDuration');if(durationLabel&&state.active===gesture.index)durationLabel.textContent=item.duration.toFixed(1)+' s';
          renderLanes();return;
        }
        if(Math.abs(dx)>6){gesture.moved=true;clip.classList.add('mc-dragging');clip.style.transform='translateX('+dx+'px)';const lane=$('mcTimeline'),rect=lane.getBoundingClientRect();if(e.clientX>rect.right-42)lane.scrollLeft+=20;else if(e.clientX<rect.left+42)lane.scrollLeft-=20;}
      });
      const finishGesture=e=>{
        if(!gesture||gesture.id!==e.pointerId)return;
        const g=gesture;gesture=null;if(g.timer)clearTimeout(g.timer);clip.classList.remove('mc-dragging','mc-longpress');clip.style.transform='';
        if(g.moved&&!g.edge){
          pushHistory();clip.dataset.suppressClick='1';
          const timeline=$('mcTimeline'),tiles=[...timeline.querySelectorAll('.mc-clip')];
          const under=document.elementFromPoint(e.clientX,e.clientY)?.closest('#mcTimeline .mc-clip');
          let to=under?Number(under.dataset.index):tiles.findIndex(tile=>e.clientX<tile.getBoundingClientRect().left+tile.getBoundingClientRect().width/2);
          if(to<0)to=state.items.length-1;
          const from=g.index;
          if(Number.isInteger(to)&&to!==from){const moved=state.items.splice(from,1)[0];state.items.splice(to,0,moved);state.active=to;state.player.index=to;state.player.offset=0;renderTimeline();previewActive();renderLanes();}
        } else if(g.edge){renderTimeline();}
      };
      clip.addEventListener('pointerup',finishGesture);
      clip.addEventListener('pointercancel',finishGesture);
      clip.addEventListener('click',e=>{
        if(clip.dataset.suppressClick==='1'){clip.dataset.suppressClick='0';e.preventDefault();return;}
        pauseSequence();state.active=Number(clip.dataset.index);state.player.index=state.active;state.player.offset=0;previewActive();renderTimeline();updateTimelinePlayhead();
      });
      clip.addEventListener('dragstart',e=>{
        e.dataTransfer.setData('text/plain',clip.dataset.index);
        e.dataTransfer.effectAllowed='move';
      });
      clip.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';});
      clip.addEventListener('drop',e=>{
        e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain')),to=Number(clip.dataset.index);
        if(!Number.isInteger(from)||from===to||!state.items[from])return;
        const moved=state.items.splice(from,1)[0];state.items.splice(to,0,moved);
        state.active=to;state.player.index=to;state.player.offset=0;renderTimeline();previewActive();renderLanes();
      });
    });
    const selected=state.items[state.active];
    const inspector=$('mcClipInspector');
    inspector.innerHTML='<div class="mc-inspector-name">CLIP '+(state.active+1)+' · '+String(selected.name).replace(/[<>&"]/g,'')+'</div>'+
      '<button data-inspect="split">✂ Scinder</button><button data-inspect="duplicate">＋ Dupliquer</button><button data-inspect="delete">Supprimer</button><button data-inspect="effectReset">Effet zéro</button>'+
      '<label>Durée du clip · <b id="mcInspectorDuration">'+(Number(selected.duration)||3).toFixed(1)+' s</b><input id="mcInspectorDurationRange" type="range" min="1" max="30" step=".5" value="'+(Number(selected.duration)||3)+'"></label>'+
      '<label>Effet du clip <select id="mcInspectorEffect"><option value="none">Aucun effet</option><option value="fade">Fondu</option><option value="zoom">Zoom</option><option value="flash">Flash</option><option value="vignette">Cinéma</option></select></label>'+
      '<label>Animation du clip <select id="mcInspectorAnimation"><option value="none">Aucune</option><option value="fade">Fondu doux · Standard</option><option value="zoom">Zoom lent · Standard</option><option value="rise">Montée · Standard</option><option value="slide">Glissement · Standard</option><option value="bounce">Rebond · Standard</option><option value="pulse">Pulse · Standard</option><option value="blur">Flou · Standard</option><option value="rotate">Rotation · Standard</option><option value="parallax">Parallaxe · PRO</option><option value="kenburns">Ken Burns · PRO</option><option value="3d">Perspective 3D · PRO</option><option value="elastic">Élastique · PRO</option><option value="glitch">Glitch · PRO</option><option value="neon">Néon · PRO</option><option value="whip">Whip · PRO</option><option value="mosaic">Mosaïque · PRO</option></select></label>';
    const effect=$('mcInspectorEffect');effect.value=selected.effect||'none';
    effect.onchange=()=>{pushHistory();selected.effect=effect.value;setStatus('Effet enregistré sur le clip '+(state.active+1)+'.');};
    const animation=$('mcInspectorAnimation');animation.value=selected.animation||'none';
    animation.onchange=()=>{const pro=['parallax','kenburns','3d','elastic','glitch','neon','whip','mosaic'];if(pro.includes(animation.value)&&window.MALICUT_IS_PRO!==true){animation.value=selected.animation||'none';setStatus('Cette animation est réservée à MaliCut Pro.');return;}pushHistory();selected.animation=animation.value;setStatus('Animation enregistrée sur le clip '+(state.active+1)+'.');};
    let durationHistorySaved=false;
    $('mcInspectorDurationRange').oninput=e=>{
      if(!durationHistorySaved){pushHistory();durationHistorySaved=true;}
      selected.duration=Number(e.target.value);selected.durationAuto=false;
      $('mcInspectorDuration').textContent=selected.duration.toFixed(1)+' s';
      const clip=target.querySelector('.mc-clip.active');
      if(clip){const width=Math.max(96,Math.min(360,selected.duration*42))*timelineZoom;clip.style.width=width+'px';clip.style.minWidth=width+'px';clip.style.setProperty('--mc-clip-width',width+'px');}
      renderLanes();
    };
    inspector.querySelectorAll('[data-inspect]').forEach(btn=>btn.onclick=()=>{
      const action=btn.dataset.inspect;
      if(action==='delete'){pushHistory();pauseSequence();state.items.splice(state.active,1);state.active=Math.max(0,Math.min(state.active,state.items.length-1));state.player.index=state.active;state.player.offset=0;}
      if(action==='duplicate'){pushHistory();state.items.splice(state.active+1,0,{...selected,transitionBefore:null});state.active++;state.player.index=state.active;state.player.offset=0;}
      if(action==='split'){pushHistory();pauseSequence();const half=Math.max(.5,(Number(selected.duration)||3)/2);const second={...selected,duration:half,durationAuto:false,transitionBefore:null};if(selected.type==='video')second.trimStart=(Number(selected.trimStart)||0)+half;selected.duration=half;selected.durationAuto=false;state.items.splice(state.active+1,0,second);state.active++;state.player.index=state.active;state.player.offset=0;}
      if(action==='effectReset'){pushHistory();selected.effect='none';}
      renderTimeline();previewActive();renderLanes();
    });
    const zoom=$('mcTimelineZoom');
    if(zoom){zoom.value=String(Math.round(timelineZoom*100));zoom.oninput=()=>{timelineZoom=Number(zoom.value)/100;renderTimeline();};}
    updateTimelinePlayhead();
  }
  function formatTime(seconds){const n=Math.max(0,Math.floor(seconds||0));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
  function clipDuration(item){return Math.max(.1,Number(item?.duration)||(item?.type==='image'?state.photoSeconds:3));}
  function sequenceDuration(){return state.items.reduce((sum,item)=>sum+clipDuration(item),0);}
  function updateTimelinePlayhead(){
    const marker=$('mcTimelinePlayhead'),target=$('mcTimeline'),player=state.player,item=state.items[player.index];
    if(!item){if(marker)marker.style.left='10px';if($('mcTimecode'))$('mcTimecode').textContent='00:00 / '+formatTime(sequenceDuration());return;}
    const clip=target?.querySelector('.mc-clip[data-index="'+player.index+'"]');if(!marker||!clip)return;
    const local=player.playing&&item.type==='video'?Math.max(0,($('video').currentTime||0)-(Number(item.trimStart)||0)):player.offset;
    marker.style.left=(clip.offsetLeft+Math.min(1,Math.max(0,local/clipDuration(item)))*clip.offsetWidth)+'px';
    if(player.playing){const markerX=clip.offsetLeft+Math.min(1,Math.max(0,local/clipDuration(item)))*clip.offsetWidth;const viewLeft=target.scrollLeft,viewRight=viewLeft+target.clientWidth;if(markerX>viewRight-54)target.scrollLeft=Math.min(target.scrollWidth-target.clientWidth,markerX-target.clientWidth+72);else if(markerX<viewLeft+18)target.scrollLeft=Math.max(0,markerX-18);}
    let before=0;for(let i=0;i<player.index;i++)before+=clipDuration(state.items[i]);
    $('mcTimecode').textContent=formatTime(before+local)+' / '+formatTime(sequenceDuration());
  }
  function updatePlaybackButtons(){const b=$('mcPlayToggle');if(b)b.textContent=state.player.playing?'Ⅱ Pause':'▶ Lecture';}
  async function activatePlaybackClip(index,offset,token){
    const player=state.player,item=state.items[index];if(!item||token!==player.token)return false;
    player.index=index;player.offset=Math.max(0,Math.min(clipDuration(item),offset||0));player.baseOffset=player.offset;
    state.active=index;renderTimeline();renderLanes();
    const video=$('video');
    if(item.type==='video'){
      imagePreview.style.display='none';video.style.display='block';
      if(video.src!==item.url){video.pause();video.src=item.url;video.load();}
      $('media').textContent=item.name+' · Vidéo';
      if(video.readyState<1)await new Promise(resolve=>{
        if(video.readyState>=1){resolve();return;}
        video.addEventListener('loadedmetadata',resolve,{once:true});
        video.addEventListener('error',resolve,{once:true});
      });
      if(token!==player.token)return false;
      const start=Math.max(0,Number(item.trimStart)||0);
      video.currentTime=Math.min(Math.max(0,(video.duration||start+clipDuration(item))-.05),start+player.offset);
      try{await video.play();}catch(error){setStatus('Lecture impossible : '+(error.message||error));pauseSequence();return false;}
    }else{
      video.pause();video.style.display='none';imagePreview.src=item.url;imagePreview.style.display='block';
    }
    player.startedAt=performance.now();
    const transition=item.transitionBefore?.type||'none',stage=$('screen');
    const animationNames={fade:'mcSequenceFade',zoom:'mcSequenceZoom',slide:'mcSequenceSlide',wipe:'mcSequenceWipe',flash:'mcSequenceFlash',blur:'mcSequenceBlur',spin:'mcSequenceSpin',glitch:'mcSequenceGlitch',rise:'mcSequenceSlide',bounce:'mcTextBounce',pulse:'mcTextNeon',rotate:'mcSequenceSpin',parallax:'mcSequenceSlide',kenburns:'mcSequenceZoom','3d':'mcSequenceSpin',elastic:'mcTextBounce',neon:'mcTextNeon',whip:'mcSequenceSlide',mosaic:'mcTextGlitch',push:'mcSequenceSlide',circle:'mcSequenceWipe',vertical:'mcSequenceWipe',diagonal:'mcSequenceWipe',dissolve:'mcSequenceFade',rotate3d:'mcSequenceSpin',stretch:'mcSequenceZoom',spark:'mcTextNeon',wave:'mcTextRise'};
    const previewAnimation=animationNames[item.animation]||animationNames[transition];
    if(previewAnimation){stage.style.animation='none';void stage.offsetWidth;stage.style.animation=previewAnimation+' '+Math.round((Number(item.transitionBefore?.duration)||.8)*1000)+'ms ease both';}
    const clip=$('mcTimeline').querySelector('.mc-clip[data-index="'+index+'"]');
    if(clip&&index>0)$('mcTimeline').scrollTo({left:Math.max(0,clip.offsetLeft-18),behavior:'smooth'});
    updatePlaybackButtons();updateTimelinePlayhead();return true;
  }
  function pauseSequence(){
    const player=state.player,item=state.items[player.index];
    if(player.playing){
      if(item?.type==='video')player.offset=Math.max(0,($('video').currentTime||0)-(Number(item.trimStart)||0));
      else if(item)player.offset=Math.min(clipDuration(item),player.baseOffset+(performance.now()-player.startedAt)/1000);
    }
    player.playing=false;player.token++;if(player.raf)cancelAnimationFrame(player.raf);player.raf=0;
    $('video').pause();updatePlaybackButtons();updateTimelinePlayhead();
  }
  function stopSequence(){
    const player=state.player;player.token++;player.playing=false;player.index=Math.max(0,state.active);player.offset=0;player.baseOffset=0;
    if(player.raf)cancelAnimationFrame(player.raf);player.raf=0;$('video').pause();updatePlaybackButtons();updateTimelinePlayhead();
  }
  async function playbackTick(){
    const player=state.player;if(!player.playing)return;
    const item=state.items[player.index];if(!item){pauseSequence();return;}
    if(item.type==='video')player.offset=$('video').ended?clipDuration(item):Math.max(0,($('video').currentTime||0)-(Number(item.trimStart)||0));
    else player.offset=Math.min(clipDuration(item),player.baseOffset+(performance.now()-player.startedAt)/1000);
    if(player.offset>=clipDuration(item)-.025){
      $('video').pause();
      if(player.index>=state.items.length-1){player.offset=clipDuration(item);player.playing=false;updatePlaybackButtons();updateTimelinePlayhead();return;}
      const token=player.token;
      if(await activatePlaybackClip(player.index+1,0,token)&&player.playing)player.raf=requestAnimationFrame(playbackTick);
      return;
    }
    updateTimelinePlayhead();player.raf=requestAnimationFrame(playbackTick);
  }
  async function startSequence(){
    const player=state.player;if(!state.items.length){setStatus('Ajoute au moins une photo ou une vidéo.');return;}
    if(player.playing){pauseSequence();return;}
    player.playing=true;player.token++;const token=player.token;
    const ready=await activatePlaybackClip(player.index,player.offset,token);
    if(ready&&player.playing&&token===player.token)player.raf=requestAnimationFrame(playbackTick);
  }
  $('mcPlayToggle').onclick=startSequence;
  $('mcStopPlayback').onclick=()=>{stopSequence();state.player.index=0;state.active=0;state.player.offset=0;previewActive();renderTimeline();updateTimelinePlayhead();};
  $('video').controls=false;
  function previewActive() {
    const item = state.items[state.active];
    if (!item) { imagePreview.style.display = 'none'; $('video').pause(); $('video').removeAttribute('src'); $('video').load(); return; }
    if (item.type === 'image') {
      $('video').pause(); $('video').style.display='block';$('video').removeAttribute('src'); $('video').load();
      imagePreview.onload=()=>setStatus('Image chargée dans l’aperçu et la timeline : '+item.name);
      imagePreview.onerror=()=>setStatus('Image importée, mais format non affichable. Essaie JPG, PNG ou WEBP.');
      imagePreview.src = item.url; imagePreview.style.display = 'block';
      $('media').textContent = item.name + ' · Photo';
    } else {
      imagePreview.style.display = 'none';$('video').style.display='block';
      $('video').src = item.url; $('video').load();
      $('video').onloadedmetadata = () => { $('media').textContent = item.name + ' · ' + ($('video').duration || 0).toFixed(1) + ' s'; };
    }
  }
  // Use one canonical file input for the whole editor. Two independent pickers
  // caused Android's chooser result to be delivered to a different input than
  // the one the user had opened, leaving the timeline empty.
  originalFile.onchange = null;
  originalFile.multiple = true;
  originalFile.accept = 'image/*,video/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.heic,.heif,.tif,.tiff,.mp4,.m4v,.mov,.webm,.mkv,.3gp,.mpeg,.mpg,.avi';
  originalFile.setAttribute('aria-label', 'Importer des photos et vidéos dans le studio');
  originalFile.addEventListener('change', e => {
    e.stopImmediatePropagation();
    const chosen = Array.from(e.currentTarget.files || []);
    if (!chosen.length) {
      setStatus('Aucun fichier reçu. Sélectionne une photo ou une vidéo puis réessaie.');
      return;
    }
    try {
      addFiles(chosen);
    } catch (error) {
      console.error('[MaliCut Studio] Import error:', error);
      setStatus('Importation impossible : ' + (error && error.message ? error.message : 'erreur de lecture du fichier') + '. Réessaie avec JPG, PNG ou MP4.');
    } finally {
      e.currentTarget.value = '';
    }
  }, true);
  function openStudioPicker(){
    try {
      originalFile.value = '';
      originalFile.click();
    } catch (error) {
      setStatus('Ouverture des fichiers impossible : ' + (error.message || error));
    }
  }
  $('mcImport').onclick=openStudioPicker;
  $('mcAddClip').onclick=openStudioPicker;
  $('mcAddPhoto').onclick=openStudioPicker;
  $('mcClear').onclick=()=>{
    if(state.items.length)pushHistory();stopSequence();state.items=[];state.active=0;state.player.index=0;state.player.offset=0;
    renderTimeline();previewActive();setStatus('Nouveau projet prêt.');
  };
  $('mcCamera').onclick = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Caméra non prise en charge par ce navigateur.');
      state.camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      $('mcCameraVideo').srcObject = state.camera; $('mcCameraBox').classList.remove('hidden');
    } catch (e) { setStatus('Caméra inaccessible : ' + (e.message || e)); }
  };
  $('mcStopCamera').onclick = stopCamera;
  $('mcCapture').onclick = () => {
    const v = $('mcCameraVideo');
    if (!v.videoWidth) { setStatus('La caméra n’est pas encore prête.'); return; }
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob(blob => {
      if (!blob) { setStatus('Impossible de capturer cette photo.'); return; }
      const file = new File([blob], 'malicut-photo-' + Date.now() + '.jpg', { type: 'image/jpeg' });
      addFiles([file]); stopCamera();
    }, 'image/jpeg', .92);
  };
  $('mcPhotoDuration').onchange = e => { state.photoSeconds = Math.max(1, Math.min(30, Number(e.target.value) || 3)); };
  $('mcTransition').onchange=e=>{
    pushHistory();state.transition=e.target.value;
    state.items.forEach((item,index)=>{if(index>0)item.transitionBefore=e.target.value==='cut'?null:{type:e.target.value,duration:.6};});
    renderTimeline();setStatus('Transition appliquée entre les clips du montage.');
  };

  async function waitEvent(el, event) {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Délai de chargement dépassé.')), 15000);
      el.addEventListener(event, () => { clearTimeout(timer); resolve(); }, { once: true });
      el.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Média impossible à lire.')); }, { once: true });
    });
  }
  function fit(ctx, source, w, h, alpha = 1) {
    const sw = source.videoWidth || source.naturalWidth || source.width;
    const sh = source.videoHeight || source.naturalHeight || source.height;
    if (!sw || !sh) return;
    const scale = state.fitMode === 'cover' ? Math.max(w / sw, h / sh) : Math.min(w / sw, h / sh);
    const dw = sw * scale, dh = sh * scale;
    ctx.globalAlpha = alpha; ctx.drawImage(source, (w - dw) / 2, (h - dh) / 2, dw, dh); ctx.globalAlpha = 1;
  }
  let musicUrl = null;
  let musicAudio = null;
  $('musicFile').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    musicUrl = URL.createObjectURL(file);
    musicAudio = new Audio(musicUrl);
    musicAudio.loop = $('musicLoop').checked;
    $('musicName').textContent = file.name;
    setStatus('Piste audio ajoutée au projet.');
  });
  $('musicLoop').addEventListener('change', e => { if (musicAudio) musicAudio.loop = e.target.checked; });

  // Drag and drop clips to reorder the local editing timeline.
  let draggedIndex = null;
  $('mcTimeline').addEventListener('dragstart', e => {
    const tile = e.target.closest('.pro-item');
    if (!tile) return;
    draggedIndex = Number(tile.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
  });
  $('mcTimeline').addEventListener('dragover', e => {
    if (e.target.closest('.pro-item')) e.preventDefault();
  });
  $('mcTimeline').addEventListener('drop', e => {
    const tile = e.target.closest('.pro-item');
    if (!tile || draggedIndex === null) return;
    e.preventDefault();
    const targetIndex = Number(tile.dataset.index);
    pushHistory();const [moved] = state.items.splice(draggedIndex, 1);
    state.items.splice(targetIndex, 0, moved);
    state.active = targetIndex;
    draggedIndex = null;
    renderTimeline(); previewActive();
  });
  const originalRenderTimeline = renderTimeline;
  renderTimeline = function() {
    originalRenderTimeline();
    $('mcTimeline').querySelectorAll('.pro-item').forEach(tile => { tile.draggable = true; });
  };

  const voiceAudio = new Audio();
  $('mcVoiceFile').onchange = e => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    if (state.voiceUrl) URL.revokeObjectURL(state.voiceUrl);
    state.voiceUrl = URL.createObjectURL(file); state.voiceBlob = file; voiceAudio.src = state.voiceUrl;
    $('mcVoiceStatus').textContent = 'Voix off importée : ' + file.name; renderLanes();
    $('mcPreviewVoice').disabled = false;
  };
  $('mcRecordVoice').onclick = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const chunks = []; state.recorder = new MediaRecorder(stream);
      state.recorder.ondataavailable = e => { if(e.data.size) chunks.push(e.data); };
      state.recorder.onstop = () => {
        state.voiceBlob = new Blob(chunks,{type:state.recorder.mimeType || 'audio/webm'});
        if(state.voiceUrl) URL.revokeObjectURL(state.voiceUrl);
        state.voiceUrl = URL.createObjectURL(state.voiceBlob); voiceAudio.src = state.voiceUrl;
        stream.getTracks().forEach(t=>t.stop());
        $('mcVoiceStatus').textContent = 'Voix off enregistrée et prête pour le montage.';
        $('mcPreviewVoice').disabled = false; $('mcRecordVoice').disabled = false; $('mcStopVoice').disabled = true; renderLanes();
      };
      state.recorder.start(); $('mcRecordVoice').disabled = true; $('mcStopVoice').disabled = false;
      $('mcVoiceStatus').textContent = 'Enregistrement en cours…';
    } catch(e) { $('mcVoiceStatus').textContent = 'Micro inaccessible : ' + (e.message || e); }
  };
  $('mcStopVoice').onclick = () => { if(state.recorder && state.recorder.state!=='inactive') state.recorder.stop(); };
  $('mcPreviewVoice').onclick = () => { voiceAudio.currentTime=0; voiceAudio.play(); };
  $('mcTransitionPro').onchange=e=>{
    pushHistory();state.transition=e.target.value;
    state.items.forEach((item,index)=>{if(index>0)item.transitionBefore=e.target.value==='none'||e.target.value==='cut'?null:{type:e.target.value,duration:Math.max(.2,Math.min(2,Number($('mcTransitionDuration').value)||.6))};});
    renderTimeline();setStatus('Transition '+e.target.options[e.target.selectedIndex].text+' appliquée aux jonctions du montage.');
  };
  $('mcCreativeTools').addEventListener('click',e=>{
    const suggest=e.target.closest('[data-suggest]');
    if(suggest){ const input=$('text'); if(input){input.value=suggest.dataset.suggest; $('textModal').classList.add('open');} }
    const look=e.target.closest('[data-look]');
    if(look){state.look=look.dataset.look;setStatus('Effet sélectionné : '+look.textContent.trim());}
  });
  function renderLanes(){
    $('mcVideoLane').innerHTML=state.items.map((x,i)=>'<span class="mc-lane-clip">'+(i+1)+'. '+(x.type==='image'?'Photo':'Vidéo')+'</span>').join('')||'<span class="pro-note">Importer les médias principaux</span>';
    $('mcOverlayLane').innerHTML=state.overlayItems.map((x,i)=>'<span class="mc-lane-clip">'+(i+1)+'. '+x.name.replace(/[<>&"]/g,'')+'</span>').join('')||'<span class="pro-note">Aucune superposition</span>';
    $('mcAudioLane').innerHTML=(musicAudio?'<span class="mc-lane-clip">♫ Musique</span>':'')+(state.voiceUrl?'<span class="mc-lane-clip">🎙 Voix off</span>':'')||'<span class="pro-note">Ajouter musique ou voix</span>';
    $('mcVideoLaneCount').textContent=state.items.length+' clip(s)';
    $('mcOverlayLaneCount').textContent=state.overlayItems.length+' clip(s)';
    $('mcAudioLaneCount').textContent=(Number(!!musicAudio)+Number(!!state.voiceUrl))+' piste(s)';
    document.querySelectorAll('#mcLanes .mc-lane').forEach(el=>el.classList.toggle('selected',el.dataset.track===state.activeTrack));
  }
  ['mcSelectVideoTrack','mcSelectOverlayTrack','mcSelectAudioTrack','mcSelectTextTrack'].forEach((id,i)=>$(id).onclick=()=>{
    state.activeTrack=['video','overlay','audio','text'][i];renderLanes();
    if(state.activeTrack==='overlay'){const picker=document.createElement('input');picker.type='file';picker.accept='image/*';picker.multiple=true;picker.onchange=()=>{[...picker.files].forEach(file=>state.overlayItems.push({file,url:URL.createObjectURL(file),name:file.name||'Superposition'}));renderLanes();setStatus('Superposition(s) ajoutée(s) à la piste V2.');};picker.click();}
    if(state.activeTrack==='audio')$('mcVoiceFile').click();
    if(state.activeTrack==='text')$('textModal')?.classList.add('open');
  });
  document.querySelectorAll('#mcExportQuality [data-quality]').forEach(btn=>btn.onclick=()=>{
    const q=btn.dataset.quality;
    const isPro=window.MALICUT_IS_PRO===true;
    if((q==='1440'||q==='2160')&&!isPro){$('mcQualityNote').textContent='La qualité '+(q==='1440'?'2K':'4K')+' est réservée à MaliCut Pro. Active ton offre Pro pour y accéder.';setStatus('Résolution '+q+'p réservée à MaliCut Pro.');return;}
    state.quality=q;document.querySelectorAll('#mcExportQuality [data-quality]').forEach(b=>b.classList.toggle('active',b===btn));
    $('mcQualityNote').textContent=q==='2160'?'4K UHD · MaliCut Pro':q==='1440'?'2K QHD · MaliCut Pro':q+'p · Export standard';
  });
  $('mcShareActions').addEventListener('click',async e=>{
    const btn=e.target.closest('[data-share]');if(!btn||!window.MALICUT_LAST_EXPORT)return;
    const target=btn.dataset.share,blob=window.MALICUT_LAST_EXPORT.blob;
    if(target==='malicut'){if(typeof window.publish==='function')await window.publish();else $('mcShareNote').textContent='La publication communautaire n’est pas disponible pour le moment.';return;}
    const file=new File([blob],window.MALICUT_LAST_EXPORT.name,{type:blob.type||'video/webm'});
    try{
      if(navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share){await navigator.share({files:[file],title:'Ma vidéo MaliCut',text:'Créé avec MaliCut'});return;}
    }catch(err){if(err.name==='AbortError')return;}
    const urls={tiktok:'https://www.tiktok.com/upload',snapchat:'https://web.snapchat.com/',whatsapp:'https://wa.me/',instagram:'https://www.instagram.com/',youtube:'https://www.youtube.com/upload'};
    $('mcShareNote').textContent='Ouvre '+target+' pour continuer. Si le partage de fichier est indisponible, joins la vidéo enregistrée depuis ton appareil.';
    window.open(urls[target],'_blank','noopener');
  });
  function enableShare(blob){
    window.MALICUT_LAST_EXPORT={blob,name:'malicut-studio-pro.webm'};
    $('mcShareActions').style.opacity='1';
    $('mcShareActions').querySelectorAll('button').forEach(b=>b.disabled=false);
    $('mcShareNote').textContent='Vidéo prête. Choisis une plateforme : Android proposera les applications compatibles si elles acceptent ce format.';
  }
  async function exportSequence() {
    if(state.busy)return;
    pauseSequence();
    if (!state.items.length) { setStatus('Ajoute au moins une photo ou une vidéo.'); return; }
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { setStatus('Export vidéo non pris en charge par ce navigateur.'); return; }
    state.busy = true; stopCamera();
    const ratioPanel = [...section.querySelectorAll('.panel')].find(p => /^Format$/i.test(p.querySelector('b')?.textContent?.trim() || ''));
    const ratioText = ratioPanel?.querySelector('.formats .format.active')?.textContent?.trim() || '9:16';
    const longEdge = Number(state.quality)||720;
    const ratios = {'9:16':[9,16],'16:9':[16,9],'1:1':[1,1],'4:5':[4,5],'4:3':[4,3],'3:4':[3,4],'2:3':[2,3]};
    const pair = ratios[ratioText] || ratios['9:16'];
    const dims = [Math.round(longEdge*pair[0]/pair[1]),longEdge];
    const canvas = document.createElement('canvas'); canvas.width = dims[0]; canvas.height = dims[1];
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    let audioContext = null, musicSource = null, musicGain = null, audioDestination = null;
    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm', videoBitsPerSecond: state.quality==='2160'?35000000:state.quality==='1440'?20000000:state.quality==='1080'?10000000:5000000 });
    } catch (_) { recorder = new MediaRecorder(stream); }
    const chunks = [];
    const voicePlayback = state.voiceUrl ? new Audio(state.voiceUrl) : null;
    if ((musicAudio || voicePlayback) && window.AudioContext) {
      try {
        audioContext = new AudioContext();
        audioDestination = audioContext.createMediaStreamDestination();
        if(musicAudio){ musicSource = audioContext.createMediaElementSource(musicAudio); musicGain = audioContext.createGain(); musicSource.connect(musicGain); musicGain.connect(audioDestination); }
        audioDestination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
      } catch (audioError) { console.warn('Audio export unavailable:', audioError); }
    }
    recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
    const stopped = new Promise(resolve => recorder.onstop = resolve);
    let overlaySources=[],previousFrame=null;
    const fps = 30;
    const drawFrame=(source,alpha=1,frame=0,total=1,transition='cut',transitionFrames=0,animation='none')=>{
      const progress=Math.max(0,Math.min(1,frame/Math.max(1,total)));
      ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
      if(transition==='fade'&&previousFrame&&frame<transitionFrames)ctx.drawImage(previousFrame,0,0,canvas.width,canvas.height);
      ctx.save();
      if(transition==='zoom' && progress<transitionFrames/total){const z=1+(.16*(1-progress*total/transitionFrames));ctx.translate(canvas.width/2,canvas.height/2);ctx.scale(z,z);ctx.translate(-canvas.width/2,-canvas.height/2);}
      if(transition==='slide' && progress<transitionFrames/total){ctx.translate(canvas.width*(1-progress*total/transitionFrames),0);}
      if(transition==='spin' && progress<transitionFrames/total){ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate((1-progress*total/transitionFrames)*.12);ctx.translate(-canvas.width/2,-canvas.height/2);}
      if(transition==='blur'&&progress<transitionFrames/total)ctx.filter='blur('+Math.round(12*(1-progress*total/transitionFrames))+'px)';
      if(animation==='zoom'||animation==='kenburns'||animation==='parallax'){const z=1+.12*progress;ctx.translate(canvas.width/2,canvas.height/2);ctx.scale(z,z);ctx.translate(-canvas.width/2,-canvas.height/2);}
      if(animation==='rise'||animation==='whip')ctx.translate(0,canvas.height*.12*(1-progress));
      if(animation==='slide')ctx.translate(canvas.width*.12*(1-progress),0);
      if(animation==='rotate'||animation==='3d') {ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate((1-progress)*.08);ctx.translate(-canvas.width/2,-canvas.height/2);}
      if(animation==='bounce'||animation==='elastic'){const z=.92+.08*Math.min(1,progress*4);ctx.translate(canvas.width/2,canvas.height/2);ctx.scale(z,z);ctx.translate(-canvas.width/2,-canvas.height/2);}
      if(animation==='blur')ctx.filter='blur('+Math.round(8*(1-progress))+'px)';
      if(animation==='glitch'||animation==='mosaic')ctx.filter='contrast('+(1.25-.25*progress)+') saturate(1.4)';
      fit(ctx,source,canvas.width,canvas.height,transition==='flash'&&progress<.08?0.35:alpha);
      if(progress<transitionFrames/total){
        const q=Math.max(0,Math.min(1,progress*total/Math.max(1,transitionFrames)));
        if(transition==='circle'){ctx.globalCompositeOperation='destination-in';ctx.beginPath();ctx.arc(canvas.width/2,canvas.height/2,Math.max(canvas.width,canvas.height)*q,0,Math.PI*2);ctx.fill();}
        if(transition==='vertical'){ctx.fillStyle='#050505';ctx.fillRect(0,0,canvas.width,canvas.height*(1-q));}
        if(transition==='diagonal'){ctx.fillStyle='#050505';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(canvas.width*(1-q),0);ctx.lineTo(0,canvas.height*(1-q));ctx.closePath();ctx.fill();}
        if(transition==='dissolve'){ctx.globalAlpha=1-q;ctx.fillStyle='#050505';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalAlpha=1;}
        if(transition==='push'){ctx.globalAlpha=1-q;ctx.fillStyle='#050505';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalAlpha=1;}
        if(transition==='rotate3d'){ctx.globalAlpha=Math.max(.15,q);ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalAlpha=1;}
        if(transition==='stretch'){ctx.globalAlpha=Math.max(.2,q);ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalAlpha=1;}
      }
      ctx.filter='none';ctx.globalCompositeOperation='source-over';ctx.restore();
      overlaySources.forEach((overlay,overlayIndex)=>{ctx.save();ctx.globalAlpha=.92;const scale=Math.min(canvas.width/overlay.naturalWidth,canvas.height/overlay.naturalHeight);const w=overlay.naturalWidth*scale,h=overlay.naturalHeight*scale;ctx.drawImage(overlay,(canvas.width-w)/2,(canvas.height-h)/2,w,h);ctx.restore();});
      if(transition==='wipe'&&progress<transitionFrames/total){ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width*(1-progress*total/transitionFrames),canvas.height);}
      if(transition==='flash'&&progress<.08){ctx.fillStyle='rgba(255,255,255,'+(1-progress/.08)+')';ctx.fillRect(0,0,canvas.width,canvas.height);}
      if(transition==='glitch'&&progress<.15){ctx.fillStyle='rgba(0,220,255,.25)';ctx.fillRect(Math.random()*canvas.width,0,canvas.width*.8,canvas.height);ctx.fillStyle='rgba(255,0,100,.2)';ctx.fillRect(0,Math.random()*canvas.height,canvas.width,canvas.height*.08);}
      if(state.look==='shake'){ctx.save();ctx.globalAlpha=.25;ctx.fillStyle='#fff';ctx.fillRect(Math.sin(frame*1.7)*8,Math.cos(frame*2.1)*8,canvas.width,canvas.height);ctx.restore();}
      if(state.look==='pulse'){const p=1+Math.sin(frame*.45)*.012;ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.scale(p,p);ctx.translate(-canvas.width/2,-canvas.height/2);ctx.restore();}
      if(state.look==='soft'){ctx.fillStyle='rgba(255,230,245,.06)';ctx.fillRect(0,0,canvas.width,canvas.height);}
      if(state.look==='flash'&&progress<.05){ctx.fillStyle='rgba(255,255,255,.45)';ctx.fillRect(0,0,canvas.width,canvas.height);}
      if(state.look==='rgb'){ctx.fillStyle='rgba(0,220,255,.08)';ctx.fillRect(0,0,canvas.width,canvas.height);}
      if(state.look==='vignette'){const g=ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.width*.15,canvas.width/2,canvas.height/2,canvas.width*.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.55)');ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);}
      const caption=$('textLayer')?.textContent||'';
      if(caption){
        const motion=$('mcTextMotion').value,style=$('mcTextStyle').value;
        let a=1,scale=1,y=canvas.height*.78;
        if(motion==='fade')a=Math.min(1,progress*5);
        if(motion==='pop'){scale=.65+Math.min(.35,progress*2);}
        if(motion==='rise')y+=Math.max(0,1-progress*5)*90;
        if(motion==='bounce')y+=Math.sin(progress*18)*Math.max(0,1-progress*4)*24;
        ctx.save();ctx.globalAlpha=a;ctx.translate(canvas.width/2,y);ctx.scale(scale,scale);
        ctx.font=(style==='subtitle'?'600 38px':'900 54px')+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.lineWidth=style==='outline'?9:5;ctx.strokeStyle='#000';ctx.fillStyle=style==='gradient'?'#f7d56b':style==='neon'?'#8df7ff':style==='cinema'?'#f4d7a1':'#fff';
        if(style==='neon'){ctx.shadowColor='#00eaff';ctx.shadowBlur=24;}
        if(style==='cinema')ctx.font='italic 700 48px Georgia';
        const shown=motion==='type'?caption.slice(0,Math.max(1,Math.floor(caption.length*progress*2))):caption;
        ctx.strokeText(shown,0,0);ctx.fillText(shown,0,0);ctx.restore();
      }
    };
    try {
      overlaySources = await Promise.all(state.overlayItems.map(item=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Une image de superposition est illisible.'));img.src=item.url;})));
      setStatus('Préparation de la vidéo…'); recorder.start(250);
      if (audioContext && audioDestination) {
        await audioContext.resume();
        if(musicAudio && musicGain){
          musicAudio.currentTime=0; musicAudio.loop=$('musicLoop').checked;
          musicGain.gain.setValueAtTime(0,audioContext.currentTime);
          const fadeIn=Math.max(0,Number($('musicFadeIn').value)||0);
          const volume=Math.max(0,Math.min(1,Number($('mcMusicVolume').value)/100));
          musicGain.gain.linearRampToValueAtTime(volume,audioContext.currentTime+fadeIn);
          musicAudio.play().catch(()=>{});
        }
        if(voicePlayback){
          const voiceSource=audioContext.createMediaElementSource(voicePlayback);
          const voiceGain=audioContext.createGain();
          voiceGain.gain.value=Math.max(0,Math.min(1.5,Number($('mcVoiceVolume').value)/100));
          voiceSource.connect(voiceGain);voiceGain.connect(audioDestination);
          voicePlayback.currentTime=0;voicePlayback.play().catch(()=>{});
        }
      }
      for (let index = 0; index < state.items.length; index++) {
        const item = state.items[index];
        let source, duration;
        if (item.type === 'image') {
          source = new Image(); source.src = item.url;
          if (!source.complete) await waitEvent(source, 'load');
          duration = Math.max(.5, Number(item.duration)||state.photoSeconds);
        } else {
          source = document.createElement('video'); source.src = item.url; source.muted = true; source.playsInline = true; source.preload = 'auto';
          source.load();
          if (source.readyState < 2) await waitEvent(source, 'loadeddata');
          const inPoint=Math.max(0,Math.min((source.duration||1)-.2,Number(item.trimStart)||0));
          duration = Math.min(Math.max(.2,(source.duration||1)-inPoint),Math.max(.2,Number(item.duration)||source.duration||1));
          if(inPoint>0.01){const seeked=new Promise(resolve=>source.addEventListener('seeked',resolve,{once:true}));source.currentTime=inPoint;await seeked;}else source.currentTime=0;
        }
        const frames=Math.max(1,Math.ceil(duration*fps));
        const transition=item.transitionBefore?.type||'cut';
        const transitionFrames=index>0?Math.max(1,Math.round(Math.max(.2,Math.min(2,Number(item.transitionBefore?.duration)||Number($('mcTransitionDuration').value)||.6))*fps)):0;
        if(item.type==='video')await source.play();
        for(let frame=0;frame<frames;frame++){
          if(item.type==='video'&&source.ended)break;
          const alpha=transition==='fade'&&frame<transitionFrames&&index>0?frame/transitionFrames:1;
          drawFrame(source,alpha,frame,frames,transition,transitionFrames,item.animation||'none');
          if(overlayText){ctx.save();const p=frame/Math.max(1,frames-1);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=(($('mcTextStyle')?.value==='cinema'?'italic 700 ':'bold ')+Math.round(canvas.width*(overlaySettings.size/100))+'px '+($('mcTextStyle')?.value==='cinema'?'Georgia':'sans-serif'));ctx.lineWidth=Math.max(2,canvas.width*.004);ctx.strokeStyle='rgba(0,0,0,.8)';ctx.fillStyle=overlaySettings.color;let shown=overlayText;if(overlayMotion==='type')shown=overlayText.slice(0,Math.max(1,Math.ceil(overlayText.length*p)));if(overlayMotion==='pop'||overlayMotion==='bounce'||overlayMotion==='zoom'||overlayMotion==='elastic')ctx.translate(canvas.width/2,canvas.height/2),ctx.scale(.35+.65*Math.min(1,p*2),.35+.65*Math.min(1,p*2)),ctx.translate(-canvas.width/2,-canvas.height/2);if(overlayMotion==='rise')ctx.translate(0,canvas.height*(.18*(1-p)));if(overlayMotion==='neon'||overlayMotion==='spark')ctx.shadowColor='#27e5a3',ctx.shadowBlur=8+Math.sin(p*30)*8;if(overlayMotion==='glitch'&&Math.floor(p*24)%3===0)ctx.translate(Math.sin(frame*19)*4,0);const words=shown.split(' ');let line='',lines=[];for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>canvas.width*.86&&line){lines.push(line);line=word;}else line=test;}if(line)lines.push(line);const lineH=canvas.width*.078,baseY=overlaySettings.position==='top'?canvas.height*.18:overlaySettings.position==='bottom'?canvas.height*.82:canvas.height/2,startY=baseY-(lines.length-1)*lineH/2;if(overlaySettings.background!=='none'){ctx.fillStyle=overlaySettings.background==='dark'?'rgba(7,17,29,.86)':'rgba(7,17,29,.42)';const maxWidth=Math.min(canvas.width*.9,Math.max(...lines.map(t=>ctx.measureText(t).width))+32);ctx.fillRect((canvas.width-maxWidth)/2,startY-lineH*.55,maxWidth,lines.length*lineH+lineH*.1);}lines.forEach((txt,j)=>{ctx.strokeText(txt,canvas.width/2,startY+j*lineH);ctx.fillText(txt,canvas.width/2,startY+j*lineH);});ctx.restore();}
          $('bar').style.width = Math.round(((index + frame/frames) / state.items.length) * 100) + '%';
          setStatus('Export · média ' + (index + 1) + '/' + state.items.length);
          await new Promise(resolve => setTimeout(resolve, 1000/fps));
        }
        if(item.type==='video')source.pause();
        previousFrame=document.createElement('canvas');previousFrame.width=canvas.width;previousFrame.height=canvas.height;
        previousFrame.getContext('2d').drawImage(canvas,0,0);
      }
      if (musicAudio && musicGain && audioContext) {
        const fadeOut = Math.max(0, Number($('musicFadeOut').value) || 0);
        musicGain.gain.cancelScheduledValues(audioContext.currentTime);
        musicGain.gain.setValueAtTime(musicGain.gain.value, audioContext.currentTime);
        musicGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeOut);
        if (fadeOut) await new Promise(resolve => setTimeout(resolve, fadeOut * 1000));
        musicAudio.pause();
      }
      recorder.stop(); await stopped;
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      if (!blob.size) throw new Error('Le fichier exporté est vide.');
      enableShare(blob);
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'malicut-studio-pro.webm'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      localStorage.setItem('malicut_exports', +(localStorage.getItem('malicut_exports') || 0) + 1);
      if ($('exports')) $('exports').textContent = localStorage.getItem('malicut_exports');
      $('bar').style.width = '100%'; setStatus('Export terminé · '+state.quality+'p · vidéo prête à partager.');
      window.MaliCutGlobalStudio?.show('export');
      if(autoPublish.checked&&typeof window.publish==='function'){setStatus('Export terminé · publication dans la communauté MaliCut…');await window.publish();}
    } catch (e) {
      try { if (recorder.state !== 'inactive') recorder.stop(); } catch (_) {}
      await stopped.catch(() => {});
      setStatus('Export interrompu : ' + (e.message || e));
    } finally {
      if(voicePlayback)voicePlayback.pause();
      stream.getTracks().forEach(t => t.stop());
      if (audioContext) await audioContext.close().catch(() => {});
      state.busy = false;
    }
  }
  const oldExport = window.exportVideo;
  window.exportVideo = exportSequence;
  const exportButton = section.querySelector('button[onclick="exportVideo()"]');
  if (exportButton) exportButton.textContent = '⬇ Exporter le montage complet';
  window.addEventListener('beforeunload', stopCamera);
  renderTimeline();
  window.MaliCutStudioPro={addFiles,play:startSequence,pause:pauseSequence,stop:stopSequence,getProject:()=>state.items.map(x=>({name:x.name,type:x.type,duration:x.duration,transitionBefore:x.transitionBefore})),export:exportSequence};
})();
