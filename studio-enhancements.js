(function(){
 let musicUrl=null,musicAudio=null,audioCtx=null,videoSource=null,musicSource=null,voiceGain=null,musicGain=null,highpass=null,presence=null,compressor=null,audioDest=null;
 let effectName='none';
 const byId=id=>document.getElementById(id);
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 function getMusic(){return byId('musicFile')?.files?.[0]||null;}
 function updatePreviewVolumes(){
  if(window.video)video.volume=(+byId('videoVolume')?.value||100)/100;
  if(musicAudio)musicAudio.volume=(+byId('musicVolume')?.value||65)/100;
 }
 function applyFilter(){
  if(!window.video)return;
  const filters={
   none:'none',warm:'sepia(.28) saturate(1.25) contrast(1.04)',
   cinema:'contrast(1.22) saturate(.82) brightness(.94)',
   mono:'grayscale(1) contrast(1.12)',
   vivid:'saturate(1.55) contrast(1.08)',
   vintage:'sepia(.42) contrast(.92) saturate(.82)'
  };
  window.video.style.filter=filters[effectName]||'none';
 }
 window.setVideoEffect=function(name,button){
  effectName=name;applyFilter();
  document.querySelectorAll('#create .panel .format').forEach(x=>{if(x.closest('.panel')?.querySelector('b')?.textContent.includes('Effets vidéo'))x.classList.remove('active')});
  button?.classList.add('active');
 };
 function setupAudioGraph(){
  if(audioCtx)return;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)throw new Error('Le navigateur ne prend pas en charge le traitement audio.');
  audioCtx=new AC();
  audioDest=audioCtx.createMediaStreamDestination();
  videoSource=audioCtx.createMediaElementSource(window.video);
  voiceGain=audioCtx.createGain();
  highpass=audioCtx.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=70;
  presence=audioCtx.createBiquadFilter();presence.type='peaking';presence.frequency.value=2800;presence.Q.value=1;presence.gain.value=0;
  compressor=audioCtx.createDynamicsCompressor();compressor.threshold.value=-24;compressor.knee.value=18;compressor.ratio.value=2.5;compressor.attack.value=.008;compressor.release.value=.18;
  videoSource.connect(voiceGain);voiceGain.connect(highpass);highpass.connect(presence);presence.connect(compressor);compressor.connect(audioDest);
  musicAudio=new Audio();musicAudio.preload='auto';musicAudio.loop=!!byId('musicLoop')?.checked;
  musicSource=audioCtx.createMediaElementSource(musicAudio);
  musicGain=audioCtx.createGain();musicSource.connect(musicGain);musicGain.connect(audioDest);
 }
 function updateVoiceProcessing(){
  if(!audioCtx)return;
  const noise=+(byId('noiseReduce')?.value||0),clarity=+(byId('voiceClarity')?.value||0),boost=+(byId('voiceBoost')?.value||0);
  highpass.frequency.setTargetAtTime(70+noise*1.1,audioCtx.currentTime,.05);
  presence.gain.setTargetAtTime(clarity*.07,audioCtx.currentTime,.05);
  voiceGain.gain.setTargetAtTime(Math.min(1.8,1+boost/125),audioCtx.currentTime,.05);
  compressor.threshold.setTargetAtTime(-24-noise*.12,audioCtx.currentTime,.05);
 }
 function setMusicGain(value,time=0){
  if(!musicGain||!audioCtx)return;
  const t=audioCtx.currentTime;
  musicGain.gain.cancelScheduledValues(t);
  musicGain.gain.setValueAtTime(clamp(value,0,1),t+time);
 }
 byId('musicFile')?.addEventListener('change',()=>{
  const file=getMusic();if(!file)return;
  if(musicUrl)URL.revokeObjectURL(musicUrl);
  musicUrl=URL.createObjectURL(file);
  byId('musicName').textContent=file.name+' · '+(file.size/1048576).toFixed(1)+' Mo';
  if(musicAudio)musicAudio.src=musicUrl;
 });
 ['musicVolume','videoVolume'].forEach(id=>byId(id)?.addEventListener('input',updatePreviewVolumes));
 ['noiseReduce','voiceClarity','voiceBoost'].forEach(id=>byId(id)?.addEventListener('input',updateVoiceProcessing));
 byId('musicLoop')?.addEventListener('change',e=>{if(musicAudio)musicAudio.loop=e.target.checked});
 byId('videoFade')?.addEventListener('input',e=>{if(window.video)window.video.style.opacity=String(1-(+e.target.value/100)*.65)});
 window.addEventListener('beforeunload',()=>{if(musicUrl)URL.revokeObjectURL(musicUrl)});
 window.exportVideo=async function(){
  if(!window.video?.src){byId('status').textContent='Choisis une vidéo.';return;}
  if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){byId('status').textContent='Export vidéo non pris en charge sur cet appareil.';return;}
  let rec=null,raf=0;
  try{
   const v=window.video,canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
   const dims={'9/16':[720,1280],'16/9':[1280,720],'1/1':[900,900],'4/5':[900,1125]}[window.ratio]||[720,1280];
   canvas.width=dims[0];canvas.height=dims[1];
   const start=Math.max(0,+byId('start').value||0),end=Math.min(v.duration||Infinity,+byId('end').value||v.duration);
   if(!(end>start))throw new Error('La durée de début et de fin est incorrecte.');
   setupAudioGraph();await audioCtx.resume();
   updateVoiceProcessing();
   const baseVideoVolume=(+byId('videoVolume').value||100)/100;
   voiceGain.gain.setValueAtTime(Math.min(1.8,baseVideoVolume*(1+(+byId('voiceBoost').value||0)/125)),audioCtx.currentTime);
   const music=getMusic(),musicLevel=(+byId('musicVolume').value||65)/100;
   musicAudio.loop=!!byId('musicLoop').checked;
   if(music&&musicUrl){musicAudio.src=musicUrl;musicAudio.currentTime=0;musicGain.gain.setValueAtTime(0,audioCtx.currentTime);}
   else musicGain.gain.setValueAtTime(0,audioCtx.currentTime);
   v.pause();v.currentTime=start;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('La vidéo ne se positionne pas correctement.')),8000);v.onseeked=()=>{clearTimeout(timer);resolve()};});
   const stream=canvas.captureStream(30);
   audioDest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
   const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(x=>MediaRecorder.isTypeSupported(x))||'';
   rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
   const chunks=[];rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
   const finished=new Promise(resolve=>rec.onstop=resolve);
   const inFade=byId('transitionIn').value==='fade'?1:0,outFade=byId('transitionOut').value==='fade'?1:0;
   const duration=end-start;
   const musicFadeIn=clamp(+byId('musicFadeIn').value||0,0,10),musicFadeOut=clamp(+byId('musicFadeOut').value||0,0,10);
   const musicTarget=musicLevel;
   if(music&&musicUrl){
    musicAudio.currentTime=0;
    musicAudio.play().catch(()=>{});
    const now=audioCtx.currentTime;
    musicGain.gain.cancelScheduledValues(now);musicGain.gain.setValueAtTime(musicFadeIn?0:musicTarget,now);
    if(musicFadeIn)musicGain.gain.linearRampToValueAtTime(musicTarget,now+musicFadeIn);
    if(musicFadeOut&&duration>musicFadeOut)musicGain.gain.setValueAtTime(musicTarget,now+duration-musicFadeOut),musicGain.gain.linearRampToValueAtTime(0,now+duration);
   }
   rec.start(250);byId('status').textContent='Export avec audio en cours…';
   const animation=byId('textAnimation').value;
   function draw(){
    const elapsed=v.currentTime-start,progress=clamp(elapsed/duration,0,1);
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
    const sc=Math.min(canvas.width/v.videoWidth,canvas.height/v.videoHeight),w=v.videoWidth*sc,h=v.videoHeight*sc;
    let opacity=1;if(inFade&&elapsed<1)opacity=Math.min(opacity,elapsed);if(outFade&&duration-elapsed<1)opacity=Math.min(opacity,duration-elapsed);
    const userFade=+(byId('videoFade').value||0);opacity*=1-userFade/100*.65;
    ctx.save();ctx.globalAlpha=clamp(opacity,0,1);ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate((window.rotation||0)*Math.PI/180);ctx.scale(window.mirrorOn?-1:1,1);
    ctx.filter=v.style.filter||'none';ctx.drawImage(v,-w/2,-h/2,w,h);ctx.restore();ctx.filter='none';
    if(window.textValue){
      let x=(window.editorTextX/100-.5)*canvas.width,y=(window.editorTextY/100-.5)*canvas.height,scale=1,alpha=1;
      if(animation==='fade')alpha=clamp(elapsed/.6,0,1);
      if(animation==='zoom')scale=.7+.3*clamp(elapsed/.6,0,1);
      if(animation==='slide')y+=40*(1-clamp(elapsed/.6,0,1));
      ctx.save();ctx.globalAlpha=alpha;ctx.translate(canvas.width/2+x,canvas.height/2+y);ctx.scale(scale,scale);
      ctx.font='900 '+(+(byId('font')?.value||42))+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=5;ctx.strokeStyle='#000';ctx.fillStyle='#fff';ctx.strokeText(window.textValue,0,0);ctx.fillText(window.textValue,0,0);ctx.restore();
    }
    byId('bar').style.width=(progress*100)+'%';
    if(v.currentTime>=end){v.pause();if(rec.state!=='inactive')rec.stop();return;}
    raf=requestAnimationFrame(draw);
   }
   v.volume=0;v.muted=true;await v.play();draw();
   await finished;cancelAnimationFrame(raf);musicAudio.pause();v.pause();v.muted=false;v.volume=baseVideoVolume;
   const blob=new Blob(chunks,{type:rec.mimeType||'video/webm'});
   if(!blob.size)throw new Error('Le fichier exporté est vide.');
   window.MALICUT_LAST_EXPORT={blob,name:'malikit-studio-export.webm'};
   const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='malikit-studio-export.webm';a.click();
   localStorage.setItem('malicut_exports',+(localStorage.getItem('malicut_exports')||0)+1);byId('exports').textContent=localStorage.getItem('malicut_exports');byId('status').textContent='Export terminé avec la piste audio.';
  }catch(e){if(rec&&rec.state!=='inactive')rec.stop();cancelAnimationFrame(raf);if(musicAudio)musicAudio.pause();if(window.video){window.video.muted=false;window.video.volume=(+byId('videoVolume')?.value||100)/100;}byId('status').textContent='Export impossible : '+(e.message||e);}
 };
})();