/* MaliCut Studio Pro — multi-media local editor (browser-based) */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const section = $('create');
  if (!section || !$('screen') || !$('video') || !$('file')) return;

  const state = { items: [], active: 0, camera: null, photoSeconds: 3, transition: 'fade', busy: false };
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
    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm' });
    } catch (_) { recorder = new MediaRecorder(stream); }
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
    const stopped = new Promise(resolve => recorder.onstop = resolve);
    const fadeFrames = state.transition === 'fade' ? 15 : 0;
    const fps = 30;
    const drawFrame = (source, alpha=1) => {
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,canvas.width,canvas.height);
      fit(ctx, source, canvas.width, canvas.height, alpha);
      const caption = $('textLayer')?.textContent || '';
      if (caption) {
        ctx.globalAlpha = alpha; ctx.font = '900 52px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.fillStyle = '#fff';
        ctx.strokeText(caption, canvas.width/2, canvas.height*.78); ctx.fillText(caption, canvas.width/2, canvas.height*.78); ctx.globalAlpha = 1;
      }
    };
    try {
      setStatus('Préparation de la vidéo…'); recorder.start(250);
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
          drawFrame(source, alpha);
          $('bar').style.width = Math.round(((index + frame/frames) / state.items.length) * 100) + '%';
          setStatus('Export · média ' + (index + 1) + '/' + state.items.length);
          await new Promise(resolve => setTimeout(resolve, 1000/fps));
        }
        if (item.type === 'video') source.pause();
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
      stream.getTracks().forEach(t => t.stop()); state.busy = false;
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
