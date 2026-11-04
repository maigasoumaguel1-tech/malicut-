/* MaliCut Studio Pro — multi-media local editor (browser-based) */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const section = $('create');
  if (!section || !$('screen') || !$('video') || !$('file')) return;

  const state = { items: [], active: 0, camera: null, photoSeconds: 3, transition: 'fade', busy: false, voiceBlob: null, voiceUrl: null, recorder: null, look: 'none' };
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
      <p class="pro-note">Sélectionne une vignette pour la prévisualiser. Les médias sont traités localement sur cet appareil.</p>
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

  const imagePreview = document.createElement('img');
  imagePreview.id = 'mcImagePreview';
  imagePreview.alt = 'Aperçu de la photo sélectionnée';
  imagePreview.style.cssText = 'display:none;width:100%;height:100%;object-fit:contain;position:absolute;inset:0;background:#000;border-radius:13px';
  $('screen').appendChild(imagePreview);

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
    const scale = Math.min(w / sw, h / sh), dw = sw * scale, dh = sh * scale;
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
    $('mcVoiceStatus').textContent = 'Voix off importée : ' + file.name;
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
        $('mcPreviewVoice').disabled = false; $('mcRecordVoice').disabled = false; $('mcStopVoice').disabled = true;
      };
      state.recorder.start(); $('mcRecordVoice').disabled = true; $('mcStopVoice').disabled = false;
      $('mcVoiceStatus').textContent = 'Enregistrement en cours…';
    } catch(e) { $('mcVoiceStatus').textContent = 'Micro inaccessible : ' + (e.message || e); }
  };
  $('mcStopVoice').onclick = () => { if(state.recorder && state.recorder.state!=='inactive') state.recorder.stop(); };
  $('mcPreviewVoice').onclick = () => { voiceAudio.currentTime=0; voiceAudio.play(); };
  $('mcTransitionPro').onchange = e => { state.transition=e.target.value; };
  $('mcTimeline').addEventListener('click',e=>{
    const suggest=e.target.closest('[data-suggest]');
    if(suggest){ const input=$('text'); if(input){input.value=suggest.dataset.suggest; $('textModal').classList.add('open');} }
    const look=e.target.closest('[data-look]');
    if(look){state.look=look.dataset.look;setStatus('Effet sélectionné : '+look.textContent.trim());}
  });
  async function exportSequence() {
    if (state.busy) return;
    if (!state.items.length) { setStatus('Ajoute au moins une photo ou une vidéo.'); return; }
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { setStatus('Export vidéo non pris en charge par ce navigateur.'); return; }
    state.busy = true; stopCamera();
    const ratioText = document.querySelector('#create .formats .format.active')?.textContent?.trim() || '9:16';
    const dims = ratioText === '16:9' ? [1280,720] : ratioText === '1:1' ? [900,900] : ratioText === '4:5' ? [900,1125] : [720,1280];
    const canvas = document.createElement('canvas'); canvas.width = dims[0]; canvas.height = dims[1];
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    let audioContext = null, musicSource = null, musicGain = null, audioDestination = null;
    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm' });
    } catch (_) { recorder = new MediaRecorder(stream); }
    const chunks = [];
    const voicePlayback = state.voiceUrl ? new Audio(state.voiceUrl) : null;\n    if (musicAudio && window.AudioContext) {
      try {
        audioContext = new AudioContext();
        musicSource = audioContext.createMediaElementSource(musicAudio);
        musicGain = audioContext.createGain();
        audioDestination = audioContext.createMediaStreamDestination();
        musicSource.connect(musicGain); musicGain.connect(audioDestination);
        audioDestination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
      } catch (audioError) { console.warn('Audio export unavailable:', audioError); }
    }
    recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
    const stopped = new Promise(resolve => recorder.onstop = resolve);
    const transitionFrames = Math.max(1, Math.round(Math.max(.2,Math.min(2,Number($('mcTransitionDuration').value)||.6))*fps));
    const fps = 30;
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
      if(state.transition==='wipe'&&progress<transitionFrames/total){ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width*(1-progress*total/transitionFrames),canvas.height);}
      if(state.transition==='flash'&&progress<.08){ctx.fillStyle='rgba(255,255,255,'+(1-progress/.08)+')';ctx.fillRect(0,0,canvas.width,canvas.height);}
      if(state.transition==='glitch'&&progress<.15){ctx.fillStyle='rgba(0,220,255,.25)';ctx.fillRect(Math.random()*canvas.width,0,canvas.width*.8,canvas.height);ctx.fillStyle='rgba(255,0,100,.2)';ctx.fillRect(0,Math.random()*canvas.height,canvas.width,canvas.height*.08);}
      if(state.look==='flash'&&progress<.05){ctx.fillStyle='rgba(255,255,255,.45)';ctx.fillRect(0,0,canvas.width,canvas.height);}
      if(state.look==='rgb'){ctx.globalAlpha=.18;ctx.drawImage(canvas,5,0);ctx.drawImage(canvas,-5,0);ctx.globalAlpha=1;}
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
      setStatus('Préparation de la vidéo…'); recorder.start(250);
      if (musicAudio && musicGain && audioContext) {
        musicAudio.currentTime = 0; musicAudio.loop = $('musicLoop').checked;
        musicGain.gain.setValueAtTime(0, audioContext.currentTime);
        const fadeIn = Math.max(0, Number($('musicFadeIn').value) || 0);
        const volume = Math.max(0, Math.min(1, Number($('musicVolume').value) / 100));
        musicGain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + fadeIn);
        await audioContext.resume(); musicAudio.play().catch(() => {});\n        if(voicePlayback){const voiceSource=audioContext.createMediaElementSource(voicePlayback);const voiceGain=audioContext.createGain();voiceGain.gain.value=Math.max(0,Math.min(1.5,Number($('mcVoiceVolume').value)/100));voiceSource.connect(voiceGain);voiceGain.connect(audioDestination);voicePlayback.currentTime=0;voicePlayback.play().catch(()=>{});}
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
      window.MALICUT_LAST_EXPORT = { blob, name: 'malicut-studio-pro.webm' };
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'malicut-studio-pro.webm'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      localStorage.setItem('malicut_exports', +(localStorage.getItem('malicut_exports') || 0) + 1);
      if ($('exports')) $('exports').textContent = localStorage.getItem('malicut_exports');
      $('bar').style.width = '100%'; setStatus('Export terminé · vidéo WebM enregistrée.');
    } catch (e) {
      try { if (recorder.state !== 'inactive') recorder.stop(); } catch (_) {}
      await stopped.catch(() => {});
      setStatus('Export interrompu : ' + (e.message || e));
    } finally {
      if(voicePlayback)voicePlayback.pause();\n      stream.getTracks().forEach(t => t.stop());
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
