/* MaliCut Studio Pro — multi-media local editor (browser-based) */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const section = $('create');
  if (!section || !$('screen') || !$('video') || !$('file')) return;

  const state = { items: [], active: 0, camera: null, photoSeconds: 3, transition: 'fade', busy: false, voiceBlob: null, voiceUrl: null, recorder: null, look: 'none', overlayItems: [], activeTrack: 'video', quality: '720', lastExportUrl: null, fitMode: 'cover' };
  const originalFile = $('file');
  originalFile.accept = 'video/*,image/*';
  originalFile.multiple = true;
  originalFile.setAttribute('aria-label', 'Importer des photos et vidéos');

  const style = document.createElement('style');
  style.textContent = `
    #mcProStudio{display:grid;gap:12px;margin:12px 0}
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
    @media(min-width:700px){#mcProStudio .pro-actions{grid-template-columns:repeat(4,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'mcProStudio';
  panel.innerHTML = `
    <div class="panel">
      <div class="pro-head"><b>✦ MaliCut Studio Pro</b><span class="pro-badge">Éditeur multimédia</span></div>
      <p class="pro-note">Assemble des photos et des vidéos dans un même projet, capture une photo avec la caméra et ajoute des transitions entre les séquences.</p>
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
      <div class="pro-timeline" id="mcTimeline"><div class="notice" style="width:100%">Importe une photo ou une vidéo pour commencer.</div></div>
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
        <option value="glitch">Glitch numérique</option><option value="none">Aucune</option>
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
  panel.after(creative);

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
    <div class="pro-actions" id="mcShareActions" style="opacity:.55">
      <button class="btn" data-share="tiktok" disabled>TikTok</button><button class="btn" data-share="snapchat" disabled>Snapchat</button>
      <button class="btn" data-share="whatsapp" disabled>WhatsApp</button><button class="btn" data-share="instagram" disabled>Instagram</button>
      <button class="btn" data-share="youtube" disabled>YouTube</button>
    </div>
    <p class="pro-note" id="mcShareNote">Les options de partage seront activées après un export réussi. La disponibilité dépend des applications installées et des capacités Android.</p>
  `;
  creative.after(qualityPanel);
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
    fitTools.addEventListener('click', e => { const b=e.target.closest('[data-fit]'); if(!b)return; state.fitMode=b.dataset.fit; fitTools.querySelectorAll('[data-fit]').forEach(x=>{x.classList.toggle('gold',x===b);x.classList.toggle('gold',x===b);}); applyFitMode(); });
  }
  function applyFitMode() {
    const value=state.fitMode==='cover'?'cover':'contain';
    imagePreview.style.objectFit=value; $('video').style.objectFit=value;
    const buttons=formatPanel?.querySelectorAll('[data-fit]')||[];
    buttons.forEach(b=>{b.classList.toggle('gold',b.dataset.fit===state.fitMode);});
  }
  function applyStageFormat(value) {
    const normalized=String(value||'9/16').replace(':','/');
    $('screen').style.aspectRatio=normalized;
    $('screen').style.width='100%';
    $('screen').style.maxHeight='56vh';
    applyFitMode();
  }
  formatPanel?.querySelectorAll('.formats .format').forEach(b=>b.addEventListener('click',()=>{
    const label=b.textContent.trim();
    if (/^(9:16|16:9|1:1|4:5|4:3|3:4|2:3)$/.test(label)) applyStageFormat(label);
  }));
  applyFitMode();

  function setStatus(message) { const el = $('status'); if (el) el.textContent = message; }
  function stopCamera() {
    if (state.camera) state.camera.getTracks().forEach(t => t.stop());
    state.camera = null;
    $('mcCameraBox').classList.add('hidden');
    $('mcCameraVideo').srcObject = null;
  }
  function makeItem(file, url) {
    return { file, url, type: file.type.startsWith('image/') ? 'image' : 'video', name: file.name || (file.type.startsWith('image/') ? 'Photo capturée' : 'Vidéo'), duration: 3 };
  }
  function addFiles(files) {
    const accepted = [...files].filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!accepted.length) { setStatus('Choisis des photos ou des vidéos compatibles.'); return; }
    accepted.forEach(f => state.items.push(makeItem(f, URL.createObjectURL(f))));
    state.active = Math.max(0, state.items.length - accepted.length);
    renderTimeline();
    previewActive();
    renderLanes();
    setStatus(accepted.length + ' média ajouté(s) au projet.');
  }
  function renderTimeline() {
    $('mcCount').textContent = state.items.length + ' média' + (state.items.length > 1 ? 's' : '');
    const target = $('mcTimeline');
    if (!state.items.length) { target.innerHTML = '<div class="notice" style="width:100%">Importe une photo ou une vidéo pour commencer.</div>'; return; }
    target.innerHTML = state.items.map((item, i) => `
      <div class="pro-item ${i === state.active ? 'active' : ''}" data-index="${i}">
        <img src="${item.type === 'image' ? item.url : ''}" alt="" ${item.type === 'video' ? 'style="display:none"' : ''}>
        ${item.type === 'video' ? '<div style="height:72px;display:grid;place-items:center;background:#111;border-radius:7px;font-size:26px">▶</div>' : ''}
        <small>${String(i + 1).padStart(2, '0')} · ${item.name.replace(/[<>&"]/g, '')}</small>
        <button data-action="select" data-index="${i}">Ouvrir</button>
        <button data-action="remove" data-index="${i}">×</button>
      </div>`).join('');
    target.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      const i = Number(btn.dataset.index);
      if (btn.dataset.action === 'remove') {
        URL.revokeObjectURL(state.items[i].url);
        state.items.splice(i, 1); state.active = Math.max(0, Math.min(state.active, state.items.length - 1));
        renderTimeline(); previewActive();
      } else { state.active = i; renderTimeline(); previewActive(); }
    }));
  }
  function previewActive() {
    const item = state.items[state.active];
    if (!item) { imagePreview.style.display = 'none'; $('video').pause(); $('video').removeAttribute('src'); $('video').load(); return; }
    if (item.type === 'image') {
      $('video').pause(); $('video').removeAttribute('src'); $('video').load();
      imagePreview.src = item.url; imagePreview.style.display = 'block';
      $('media').textContent = item.name + ' · Photo';
    } else {
      imagePreview.style.display = 'none';
      $('video').src = item.url; $('video').load();
      $('video').onloadedmetadata = () => { $('media').textContent = item.name + ' · ' + ($('video').duration || 0).toFixed(1) + ' s'; };
    }
  }
  originalFile.onchange = () => { addFiles(originalFile.files); originalFile.value = ''; };
  $('mcImport').onclick = () => originalFile.click();
  $('mcAddPhoto').onclick = () => {
    const picker = document.createElement('input'); picker.type = 'file'; picker.accept = 'image/*'; picker.multiple = true;
    picker.onchange = () => addFiles(picker.files); picker.click();
  };
  $('mcClear').onclick = () => {
    state.items.forEach(x => URL.revokeObjectURL(x.url)); state.items = []; state.active = 0;
    renderTimeline(); previewActive(); setStatus('Nouveau projet prêt.');
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
  $('mcTransition').onchange = e => { state.transition = e.target.value; };

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
    const [moved] = state.items.splice(draggedIndex, 1);
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
  $('mcTransitionPro').onchange = e => { state.transition=e.target.value; };
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
    if (state.busy) return;
    if (!state.items.length) { setStatus('Ajoute au moins une photo ou une vidéo.'); return; }
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { setStatus('Export vidéo non pris en charge par ce navigateur.'); return; }
    state.busy = true; stopCamera();
    const ratioPanel = [...section.querySelectorAll('.panel')].find(p => /^Format$/i.test(p.querySelector('b')?.textContent?.trim() || ''));
    const ratioText = ratioPanel?.querySelector('.formats .format.active')?.textContent?.trim() || '9:16';
    const longEdge = Number(state.quality)||720;
    const ratios = {'9:16':[9,16],'16:9':[16,9],'1:1':[1,1],'4:5':[4,5],'4:3':[4,3],'3:4':[3,4],'2:3':[2,3]};
    const pair = ratios[ratioText] || ratios['9:16'];
    const dims = pair[0] >= pair[1] ? [longEdge,Math.round(longEdge*pair[1]/pair[0])] : [Math.round(longEdge*pair[0]/pair[1]),longEdge];
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
    let overlaySources = [];
    const fps = 30;
    const transitionFrames = Math.max(1, Math.round(Math.max(.2,Math.min(2,Number($('mcTransitionDuration').value)||.6))*fps));
    const fadeFrames = state.transition === 'fade' ? transitionFrames : 0;
    const drawFrame = (source, alpha=1, frame=0, total=1) => {
      const progress=Math.max(0,Math.min(1,frame/Math.max(1,total)));
      ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.save();
      if(state.transition==='zoom' && progress<transitionFrames/total){const z=1+(.16*(1-progress*total/transitionFrames));ctx.translate(canvas.width/2,canvas.height/2);ctx.scale(z,z);ctx.translate(-canvas.width/2,-canvas.height/2);}
      if(state.transition==='slide' && progress<transitionFrames/total){ctx.translate(canvas.width*(1-progress*total/transitionFrames),0);}
      if(state.transition==='spin' && progress<transitionFrames/total){ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate((1-progress*total/transitionFrames)*.12);ctx.translate(-canvas.width/2,-canvas.height/2);}
      if(state.transition==='blur' && progress<transitionFrames/total)ctx.filter='blur('+Math.round(12*(1-progress*total/transitionFrames))+'px)';
      fit(ctx,source,canvas.width,canvas.height, state.transition==='flash'&&progress<.08?0.35:alpha);
      ctx.filter='none';ctx.restore();
      overlaySources.forEach((overlay,overlayIndex)=>{ctx.save();ctx.globalAlpha=.92;const scale=Math.min(canvas.width/overlay.naturalWidth,canvas.height/overlay.naturalHeight);const w=overlay.naturalWidth*scale,h=overlay.naturalHeight*scale;ctx.drawImage(overlay,(canvas.width-w)/2,(canvas.height-h)/2,w,h);ctx.restore();});
      if(state.transition==='wipe'&&progress<transitionFrames/total){ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width*(1-progress*total/transitionFrames),canvas.height);}
      if(state.transition==='flash'&&progress<.08){ctx.fillStyle='rgba(255,255,255,'+(1-progress/.08)+')';ctx.fillRect(0,0,canvas.width,canvas.height);}
      if(state.transition==='glitch'&&progress<.15){ctx.fillStyle='rgba(0,220,255,.25)';ctx.fillRect(Math.random()*canvas.width,0,canvas.width*.8,canvas.height);ctx.fillStyle='rgba(255,0,100,.2)';ctx.fillRect(0,Math.random()*canvas.height,canvas.width,canvas.height*.08);}
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
          duration = state.photoSeconds;
        } else {
          source = document.createElement('video'); source.src = item.url; source.muted = true; source.playsInline = true; source.preload = 'auto';
          source.load();
          if (source.readyState < 2) await waitEvent(source, 'loadeddata');
          duration = Math.max(.2, source.duration || 1);
          source.currentTime = 0;
        }
        const frames = Math.max(1, Math.ceil(duration * fps));
        if (item.type === 'video') await source.play();
        for (let frame = 0; frame < frames; frame++) {
          if (item.type === 'video' && source.ended) break;
          const alpha = fadeFrames && frame < fadeFrames && index > 0 ? frame / fadeFrames : 1;
          drawFrame(source, alpha, frame, frames);
          $('bar').style.width = Math.round(((index + frame/frames) / state.items.length) * 100) + '%';
          setStatus('Export · média ' + (index + 1) + '/' + state.items.length);
          await new Promise(resolve => setTimeout(resolve, 1000/fps));
        }
        if (item.type === 'video') source.pause();
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
      $('bar').style.width = '100%'; setStatus('Export terminé · '+state.quality+'p · vidéo WebM enregistrée.');
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
  window.MaliCutStudioPro = { addFiles, getProject: () => state.items.map(x => ({ name:x.name, type:x.type })), export:exportSequence };
})();
