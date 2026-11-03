(function(){
const $m=id=>document.getElementById(id);
let directory=[],selectedUser=null,channel=null,recorder=null,recordStream=null,recordChunks=[],recordTimeout=null,loading=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials=s=>(String(s||'?').trim().charAt(0)||'?').toUpperCase();
function setAuthUI(){
 const logged=!!window.user;
 $m('messagesAuthNotice')?.classList.toggle('hidden',logged);
 $m('messagesApp')?.classList.toggle('hidden',!logged);
 if(!logged){selectedUser=null;if(channel){window.sb.removeChannel(channel);channel=null;}return;}
}
async function loadDirectory(){
 if(!window.sb||!window.user)return;
 const box=$m('messageUsers');box.innerHTML='<div class="notice">Chargement…</div>';
 const r=await window.sb.from('profiles').select('id,username,display_name').neq('id',window.user.id).order('username',{ascending:true});
 if(r.error){box.innerHTML='<div class="notice">Impossible de charger les utilisateurs : '+esc(r.error.message)+'</div>';return;}
 directory=r.data||[];renderDirectory();
}
async function loadInbox(){
 if(!window.sb||!window.user)return;
 const box=$m('messageInbox');if(!box)return;
 box.innerHTML='<div class="notice">Chargement des conversations…</div>';
 const me=window.user.id;
 const r=await window.sb.from('direct_messages').select('id,sender_id,recipient_id,message_type,body,created_at,read_at').or('sender_id.eq.'+me+',recipient_id.eq.'+me).order('created_at',{ascending:false}).limit(300);
 if(r.error){box.innerHTML='<div class="notice">Boîte de réception indisponible : '+esc(r.error.message)+'</div>';return;}
 const latest=new Map();
 for(const m of (r.data||[])){
  const peer=m.sender_id===me?m.recipient_id:m.sender_id;
  if(!peer)continue;
  const item=latest.get(peer)||{peer,last:m,unread:0};
  if(m.recipient_id===me&&!m.read_at)item.unread++;
  latest.set(peer,item);
 }
 const ids=[...latest.keys()];
 if(!ids.length){box.innerHTML='<div class="message-empty">Aucune conversation pour le moment. Choisis un membre ci-dessous pour commencer.</div>';return;}
 const p=await window.sb.from('profiles').select('id,username,display_name,avatar_url').in('id',ids);
 if(p.error){box.innerHTML='<div class="notice">Les noms des correspondants ne sont pas disponibles : '+esc(p.error.message)+'</div>';return;}
 const people=new Map((p.data||[]).map(x=>[x.id,x]));
 const rows=[...latest.values()].map(x=>({...x,person:people.get(x.peer)||{id:x.peer,username:'membre',display_name:'Membre MaliCut'}}));
 rows.sort((x,y)=>new Date(y.last.created_at)-new Date(x.last.created_at));
 box.innerHTML=rows.map(x=>{
  const name=x.person.display_name||x.person.username||'Membre MaliCut';
  const preview=x.last.message_type==='audio'?'🎙️ Message vocal':(x.last.body||'Message');
  const time=new Date(x.last.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  return '<button class="message-user message-inbox-item" onclick="openMaliCutInboxConversation(\''+x.peer+'\')"><span class="message-avatar">'+esc(initials(name))+'</span><span class="message-inbox-copy"><b>'+esc(name)+'</b><small class="muted">'+esc(preview.slice(0,72))+' · '+esc(time)+'</small></span>'+(x.unread?'<span class="message-unread-count">'+x.unread+'</span>':'')+'</button>';
 }).join('');
}
window.openMaliCutInboxConversation=async function(id){
 let person=directory.find(p=>p.id===id);
 if(!person){
  const r=await window.sb.from('profiles').select('id,username,display_name,avatar_url').eq('id',id).maybeSingle();
  if(r.error||!r.data){$m('messageThreadHead').textContent='Ce correspondant est indisponible.';return;}
  person=r.data;directory.push(person);
 }
 await window.selectMaliKitConversation(id);
};
function renderDirectory(){
 const box=$m('messageUsers');if(!box)return;
 const q=($m('messageUserSearch')?.value||'').trim().toLowerCase();
 const rows=directory.filter(p=>(p.display_name||p.username||'').toLowerCase().includes(q)||(p.username||'').toLowerCase().includes(q));
 if(!rows.length){box.innerHTML='<div class="message-empty">Aucun autre utilisateur trouvé.</div>';return;}
 box.innerHTML=rows.map(p=>'<button class="message-user" onclick="selectMaliKitConversation(\''+p.id+'\')"><span class="message-avatar">'+esc(initials(p.display_name||p.username))+'</span><span><b>'+esc(p.display_name||p.username||'Utilisateur')+'</b><br><small class="muted">@'+esc(p.username||'membre')+'</small></span></button>').join('');
}
window.filterMessageUsers=renderDirectory;
window.selectMaliKitConversation=async function(id){
 if(!window.user)return;
 selectedUser=directory.find(p=>p.id===id);if(!selectedUser)return;
 $m('messageThreadHead').textContent=selectedUser.display_name||selectedUser.username||'Conversation';
 $m('messageText').disabled=false;$m('sendMessageButton').disabled=false;$m('recordVoiceButton').disabled=false;
 await loadThread();
};
async function loadThread(){
 if(!selectedUser||!window.user)return;
 const list=$m('messageList');list.innerHTML='<div class="message-empty">Chargement des messages…</div>';
 const me=window.user.id,other=selectedUser.id;
 const filter='and(sender_id.eq.'+me+',recipient_id.eq.'+other+'),and(sender_id.eq.'+other+',recipient_id.eq.'+me+')';
 const r=await window.sb.from('direct_messages').select('id,sender_id,recipient_id,message_type,body,audio_path,created_at,read_at').or(filter).order('created_at',{ascending:true}).limit(200);
 if(r.error){list.innerHTML='<div class="message-empty">Erreur de chargement : '+esc(r.error.message)+'</div>';return;}
 const rows=r.data||[];
 if(!rows.length){list.innerHTML='<div class="message-empty">Commence la conversation avec '+esc(selectedUser.display_name||selectedUser.username||'ce membre')+'.</div>';return;}
 list.innerHTML='';
 for(const m of rows){
  const mine=m.sender_id===me;let content='';
  if(m.message_type==='audio'){
   const signed=await window.sb.storage.from('message-audio').createSignedUrl(m.audio_path,3600);
   content=signed.error?'<span>Message vocal indisponible</span>':'<audio class="voice-player" controls preload="none" src="'+esc(signed.data.signedUrl)+'"></audio>';
  }else content='<div>'+esc(m.body)+'</div>';
  const time=new Date(m.created_at).toLocaleString('fr-FR',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'});
  list.insertAdjacentHTML('beforeend','<div class="message-bubble '+(mine?'mine':'')+'">'+content+'<div class="message-time">'+(mine?'Vous':'')+' · '+esc(time)+'</div></div>');
 }
 list.scrollTop=list.scrollHeight;
 const unread=rows.filter(m=>m.recipient_id===me&&!m.read_at).map(m=>m.id);
 if(unread.length)await window.sb.from('direct_messages').update({read_at:new Date().toISOString()}).in('id',unread);
 await updateUnreadDot();await loadInbox();
}
async function updateUnreadDot(){
 if(!window.sb||!window.user)return;
 const r=await window.sb.from('direct_messages').select('id',{count:'exact',head:true}).eq('recipient_id',window.user.id).is('read_at',null);
 $m('messageUnreadDot')?.classList.toggle('hidden',!r.count);
}
async function loadMaliKitMessages(){
 if(!window.sb){$m('messageUsers').innerHTML='<div class="notice">Connexion à la base indisponible.</div>';return;}
 setAuthUI();if(!window.user)return;
 await loadDirectory();await loadInbox();await updateUnreadDot();
 if(channel)window.sb.removeChannel(channel);
 channel=window.sb.channel('malikit-direct-messages-'+window.user.id)
  .on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages'},payload=>{
    const m=payload.new||{};
    if(m.sender_id===window.user.id||m.recipient_id===window.user.id){
      loadInbox();updateUnreadDot();
      if(selectedUser&&(m.sender_id===selectedUser.id||m.recipient_id===selectedUser.id))loadThread();
      if(m.recipient_id===window.user.id&&!selectedUser) $m('messageUnreadDot')?.classList.remove('hidden');
    }
  }).subscribe();
}
window.loadMaliKitMessages=loadMaliKitMessages;
window.sendTextMessage=async function(){
 if(!selectedUser||!window.user)return;
 const body=$m('messageText').value.trim();if(!body)return;
 $m('sendMessageButton').disabled=true;
 const r=await window.sb.from('direct_messages').insert({sender_id:window.user.id,recipient_id:selectedUser.id,message_type:'text',body});
 $m('sendMessageButton').disabled=false;
 if(r.error){$m('recordingStatus').textContent='Envoi impossible : '+r.error.message;return;}
 $m('messageText').value='';await loadThread();await loadInbox();
};
async function uploadVoice(blob,mime){
 if(!selectedUser||!window.user)return;
 if(blob.size>20*1024*1024){$m('recordingStatus').textContent='Le vocal dépasse la limite de 20 Mo.';return;}
 const ext=mime.includes('mp4')?'m4a':mime.includes('ogg')?'ogg':mime.includes('mpeg')?'mp3':'webm';
 const path=window.user.id+'/'+crypto.randomUUID()+'.'+ext;
 $m('recordingStatus').textContent='Envoi du message vocal…';
 const upload=await window.sb.storage.from('message-audio').upload(path,blob,{contentType:(mime||'audio/webm').split(';')[0],upsert:false});
 if(upload.error){$m('recordingStatus').textContent='Échec du téléversement audio : '+upload.error.message;return;}
 const row=await window.sb.from('direct_messages').insert({sender_id:window.user.id,recipient_id:selectedUser.id,message_type:'audio',audio_path:path});
 if(row.error){await window.sb.storage.from('message-audio').remove([path]);$m('recordingStatus').textContent='Le vocal a été téléversé, mais son envoi a échoué : '+row.error.message;return;}
 $m('recordingStatus').textContent='Message vocal envoyé.';await loadThread();
}
window.toggleVoiceRecording=async function(){
 if(recorder&&recorder.state==='recording'){recorder.stop();return;}
 if(!selectedUser||!window.user)return;
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){$m('recordingStatus').textContent='Cet appareil ou navigateur ne prend pas en charge l’enregistrement audio.';return;}
 try{
  recordStream=await navigator.mediaDevices.getUserMedia({audio:true});
  const types=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm'];
  const mime=types.find(t=>MediaRecorder.isTypeSupported(t))||'';
  recorder=new MediaRecorder(recordStream,mime?{mimeType:mime}:{});
  recordChunks=[];recorder.ondataavailable=e=>{if(e.data&&e.data.size)recordChunks.push(e.data);};
  recorder.onstop=async()=>{
    clearTimeout(recordTimeout);recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;
    const blob=new Blob(recordChunks,{type:recorder.mimeType||'audio/webm'});
    $m('recordVoiceButton').textContent='🎙️';$m('recordVoiceButton').classList.remove('recording');
    if(blob.size)await uploadVoice(blob,blob.type||'audio/webm');
    else $m('recordingStatus').textContent='Aucun son enregistré.';
  };
  recorder.start();$m('recordVoiceButton').textContent='⏹ Arrêter';$m('recordVoiceButton').classList.add('recording');$m('recordingStatus').textContent='Enregistrement en cours… Appuie sur Arrêter pour envoyer.';
  recordTimeout=setTimeout(()=>{if(recorder&&recorder.state==='recording')recorder.stop();},120000);
 }catch(e){recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;$m('recordingStatus').textContent='Accès au micro refusé ou indisponible : '+(e.message||e);}
};
window.addEventListener('keydown',e=>{if(e.target?.id==='messageText'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();window.sendTextMessage();}});
if(window.sb?.auth?.onAuthStateChange)window.sb.auth.onAuthStateChange((_event,session)=>{
 window.user=session?.user||null;
 if($m('messages')?.classList.contains('active'))loadMaliKitMessages();
});
})();
