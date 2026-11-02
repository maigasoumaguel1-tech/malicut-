(() => {
  const state = { channel:null, roomId:null, participantId:null, hostId:null, type:'audio', stream:null, peers:new Map(), candidates:new Map(), selected:new Set(), inviteSub:null, muted:false, cameraOff:false };
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const iceConfig = () => ({ iceServers: window.MALICUT_CONFIG && Array.isArray(window.MALICUT_CONFIG.iceServers) && window.MALICUT_CONFIG.iceServers.length ? window.MALICUT_CONFIG.iceServers : [{urls:'stun:stun.l.google.com:19302'}] });
  function notice(msg, error) { const n=$('callNotice'); if(n){n.textContent=msg;n.style.color=error?'#ff9b91':'';} }
  function panels(active) { if($('callActive')) $('callActive').classList.toggle('hidden',!active); if($('callSetup')) $('callSetup').classList.toggle('hidden',active); }
  function signedIn(){if(!window.sb||!window.user){notice('Connecte-toi à ton compte MaliCut pour utiliser les appels.',true);return false;}return true;}

  async function loadInvites(){
    if(!window.sb||!window.user||!$('incomingCalls')) return;
    const list=$('incomingCalls');
    const result=await window.sb.from('call_participants').select('id,room_id,created_at').eq('user_id',window.user.id).eq('status','invited').order('created_at',{ascending:false}).limit(10);
    if(result.error){list.innerHTML='<div class="notice">Impossible de charger les invitations.</div>';return;}
    if(!result.data||!result.data.length){list.innerHTML='<div class="notice">Aucun appel entrant.</div>';return;}
    const ids=[...new Set(result.data.map(x=>x.room_id))];
    const roomsResult=await window.sb.from('call_rooms').select('id,created_by,call_type,status').in('id',ids);
    const rooms=roomsResult.data||[];
    const roomMap=new Map(rooms.map(x=>[x.id,x]));
    const hosts=[...new Set(rooms.map(x=>x.created_by))];
    const prof=hosts.length?await window.sb.from('profiles').select('id,display_name,username').in('id',hosts):{data:[]};
    const people=new Map((prof.data||[]).map(x=>[x.id,x]));
    list.innerHTML=result.data.map(row=>{
      const room=roomMap.get(row.room_id); if(!room||room.status==='ended') return '';
      const host=people.get(room.created_by)||{};
      const name=host.display_name||host.username||'Un membre MaliCut';
      return '<div class="call-invite"><div><b>'+esc(name)+'</b><div class="muted">Appel '+(room.call_type==='video'?'vidéo':'audio')+'</div></div><div class="call-actions"><button class="btn green" onclick="acceptCall(\''+row.id+'\',\''+row.room_id+'\',\''+room.created_by+'\',\''+room.call_type+'\')">Accepter</button><button class="btn" onclick="declineCall(\''+row.id+'\')">Refuser</button></div></div>';
    }).join('')||'<div class="notice">Aucun appel entrant.</div>';
  }

  async function searchMembers(){
    if(!signedIn()) return;
    const raw=($('callSearch').value||'').trim();
    const term=raw.replace(/[,%()_*]/g,' ').replace(/\s+/g,' ').trim();
    if(term.length<2){$('callResults').innerHTML='<div class="notice">Saisis au moins deux caractères.</div>';return;}
    const r=await window.sb.from('profiles').select('id,display_name,username,avatar_url').neq('id',window.user.id).or('display_name.ilike.%'+term+'%,username.ilike.%'+term+'%').limit(12);
    if(r.error){$('callResults').innerHTML='<div class="notice">'+esc(r.error.message)+'</div>';return;}
    if(!r.data||!r.data.length){$('callResults').innerHTML='<div class="notice">Aucun membre trouvé.</div>';return;}
    $('callResults').innerHTML=r.data.map(m=>{
      const name=m.display_name||m.username||'Créateur MaliCut';
      return '<label class="call-person"><input type="checkbox" '+(state.selected.has(m.id)?'checked':'')+' onchange="toggleCallMember(\''+m.id+'\',this.checked)"><span class="call-avatar">'+esc(name.charAt(0).toUpperCase())+'</span><span class="call-person-name"><b>'+esc(name)+'</b><small>@'+esc(m.username||'createur')+'</small></span></label>';
    }).join('');
    updateCount();
  }
  function updateCount(){const n=state.selected.size;if($('selectedCallCount'))$('selectedCallCount').textContent=n+' membre'+(n>1?'s':'')+' sélectionné'+(n>1?'s':'');}
  window.toggleCallMember=(id,checked)=>{if(checked)state.selected.add(id);else state.selected.delete(id);updateCount();};
  window.searchCallMembers=searchMembers;

  async function media(type){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) throw new Error('Micro/caméra indisponible. Vérifie HTTPS et les autorisations du navigateur.');
    state.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:type==='video'?{facingMode:'user',width:{ideal:640},height:{ideal:480}}:false});
    if($('localCallVideo')){$('localCallVideo').srcObject=state.stream;$('localCallVideo').classList.toggle('hidden',type!=='video');}
  }

  async function roomChannel(id){
    if(state.channel) await window.sb.removeChannel(state.channel);
    const ch=window.sb.channel('malicut-call:'+id,{config:{private:true,broadcast:{ack:true,self:false}}});
    ch.on('broadcast',{event:'signal'},({payload})=>signal(payload))
      .on('broadcast',{event:'roster'},({payload})=>roster(payload))
      .on('broadcast',{event:'participant_joined'},async()=>{if(window.user.id===state.hostId)await sendRoster();})
      .on('broadcast',{event:'call_ended'},()=>cleanup('Cet appel est terminé.'));
    state.channel=ch;
    await new Promise((resolve,reject)=>ch.subscribe(status=>{if(status==='SUBSCRIBED')resolve();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')reject(new Error('Connexion Realtime impossible.'));}));
  }
  async function send(event,payload){if(state.channel){const r=await state.channel.send({type:'broadcast',event:event,payload:payload});if(r!=='ok')console.warn('MaliCut Realtime:',r);}}
  async function sendRoster(){
    const r=await window.sb.from('call_participants').select('user_id,status').eq('room_id',state.roomId).eq('status','joined');
    if(r.error){notice('Impossible de charger les participants.',true);return;}
    const ids=(r.data||[]).map(x=>x.user_id);
    const p=ids.length?await window.sb.from('profiles').select('id,display_name,username').in('id',ids):{data:[]};
    const names=Object.fromEntries((p.data||[]).map(x=>[x.id,x.display_name||x.username||'Membre MaliCut']));
    await send('roster',{members:ids.map(id=>({id:id,name:names[id]||'Membre MaliCut'}))});
  }

  function peer(id){
    if(state.peers.has(id))return state.peers.get(id);
    const pc=new RTCPeerConnection(iceConfig());
    if(state.stream)state.stream.getTracks().forEach(track=>pc.addTrack(track,state.stream));
    pc.onicecandidate=e=>{if(e.candidate)send('signal',{from:window.user.id,to:id,kind:'candidate',candidate:e.candidate});};
    pc.ontrack=e=>attachRemote(id,e.streams[0]);
    pc.onconnectionstatechange=()=>{const tile=document.querySelector('[data-peer="'+id+'"]');if(tile)tile.classList.toggle('call-disconnected',['failed','disconnected'].includes(pc.connectionState));};
    state.peers.set(id,pc);return pc;
  }
  function attachRemote(id,stream){
    let tile=document.querySelector('[data-peer="'+id+'"]');
    if(!tile){tile=document.createElement('div');tile.className='remote-call-tile';tile.dataset.peer=id;tile.innerHTML='<video autoplay playsinline></video><audio autoplay></audio><span class="remote-name">Membre MaliCut</span>';$('remoteCallTiles').appendChild(tile);}
    const v=tile.querySelector('video'),a=tile.querySelector('audio');
    if(state.type==='video'){v.srcObject=stream;v.classList.remove('hidden');a.classList.add('hidden');}
    else{a.srcObject=stream;v.classList.add('hidden');a.classList.remove('hidden');tile.classList.add('audio-only-tile');}
  }
  async function roster(payload){
    const members=payload&&payload.members||[];
    const others=members.filter(m=>m.id!==window.user.id);
    const p=others.length?await window.sb.from('profiles').select('id,display_name,username').in('id',others.map(x=>x.id)):{data:[]};
    const names=new Map((p.data||[]).map(x=>[x.id,x.display_name||x.username||'Membre MaliCut']));
    others.forEach(m=>{
      const pc=peer(m.id);
      const tile=document.querySelector('[data-peer="'+m.id+'"]');
      if(tile)tile.querySelector('.remote-name').textContent=names.get(m.id)||m.name||'Membre MaliCut';
      if(window.user.id.localeCompare(m.id)<0&&pc.signalingState==='stable'&&!pc.remoteDescription){
        pc.createOffer().then(o=>pc.setLocalDescription(o)).then(()=>send('signal',{from:window.user.id,to:m.id,kind:'description',description:pc.localDescription})).catch(e=>notice('Connexion impossible : '+e.message,true));
      }
    });
    notice('Connecté · '+members.length+' participant'+(members.length>1?'s':''));
  }
  async function signal(p){
    if(!p||p.to!==window.user.id||!p.from)return;
    const pc=peer(p.from);
    try{
      if(p.kind==='description'&&p.description){
        await pc.setRemoteDescription(p.description);
        if(p.description.type==='offer'){
          const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
          await send('signal',{from:window.user.id,to:p.from,kind:'description',description:pc.localDescription});
        }
        const q=state.candidates.get(p.from)||[];for(const c of q)await pc.addIceCandidate(c);state.candidates.delete(p.from);
      }else if(p.kind==='candidate'&&p.candidate){
        if(pc.remoteDescription)await pc.addIceCandidate(p.candidate);
        else{const q=state.candidates.get(p.from)||[];q.push(p.candidate);state.candidates.set(p.from,q);}
      }
    }catch(e){notice('Connexion avec un participant interrompue : '+e.message,true);}
  }
  async function activate(id,pid,host,type){
    state.roomId=id;state.participantId=pid;state.hostId=host;state.type=type;state.muted=false;state.cameraOff=false;
    $('callTypeLabel').textContent=type==='video'?'Appel vidéo':'Appel audio';
    $('callRoomLabel').textContent='Connexion sécurisée MaliCut';
    $('remoteCallTiles').innerHTML='';panels(true);
    await media(type);await roomChannel(id);
  }

  window.startMaliCutCall=async type=>{
    if(!signedIn())return;
    if(state.selected.size<1){notice('Sélectionne au moins un membre à appeler.',true);return;}
    if(state.selected.size>4){notice('Maximum 5 participants par appel sur cette version, toi compris.',true);return;}
    try{
      notice('Préparation de l’appel…');await media(type);
      const r=await window.sb.from('call_rooms').insert({created_by:window.user.id,call_type:type,status:'ringing'}).select('id').single();
      if(r.error)throw r.error;
      const rows=[{room_id:r.data.id,user_id:window.user.id,invited_by:window.user.id,status:'joined',joined_at:new Date().toISOString()}];
      [...state.selected].forEach(id=>rows.push({room_id:r.data.id,user_id:id,invited_by:window.user.id,status:'invited'}));
      const p=await window.sb.from('call_participants').insert(rows).select('id,user_id').eq('user_id',window.user.id).single();
      if(p.error){await window.sb.from('call_rooms').update({status:'ended',ended_at:new Date().toISOString()}).eq('id',r.data.id);throw p.error;}
      state.selected.clear();updateCount();
      await activate(r.data.id,p.data.id,window.user.id,type);
      await window.sb.from('call_rooms').update({status:'active',started_at:new Date().toISOString()}).eq('id',r.data.id);
      await sendRoster();notice('Appel lancé. En attente des autres membres…');
    }catch(e){await cleanup('Appel non démarré.');notice(e.message||'Impossible de lancer cet appel.',true);}
  };

  window.acceptCall=async(pid,rid,host,type)=>{
    if(!signedIn())return;
    try{
      const r=await window.sb.from('call_participants').update({status:'joined',joined_at:new Date().toISOString()}).eq('id',pid).eq('user_id',window.user.id);
      if(r.error)throw r.error;
      await activate(rid,pid,host,type);await send('participant_joined',{user_id:window.user.id});await loadInvites();
    }catch(e){await cleanup('Impossible de rejoindre cet appel.');notice(e.message||'Erreur lors de la connexion.',true);}
  };
  window.declineCall=async pid=>{
    if(!signedIn())return;
    const r=await window.sb.from('call_participants').update({status:'declined',left_at:new Date().toISOString()}).eq('id',pid).eq('user_id',window.user.id);
    if(r.error)notice(r.error.message,true);await loadInvites();
  };
  window.toggleCallMute=()=>{state.muted=!state.muted;state.stream&&state.stream.getAudioTracks().forEach(t=>t.enabled=!state.muted);$('muteCallBtn').textContent=state.muted?'Activer micro':'Couper micro';};
  window.toggleCallCamera=()=>{state.cameraOff=!state.cameraOff;state.stream&&state.stream.getVideoTracks().forEach(t=>t.enabled=!state.cameraOff);$('cameraCallBtn').textContent=state.cameraOff?'Activer caméra':'Couper caméra';};

  async function cleanup(message){
    if(state.channel&&window.sb){try{await window.sb.removeChannel(state.channel);}catch(_){}}
    state.channel=null;state.peers.forEach(pc=>{try{pc.close();}catch(_){}});state.peers.clear();state.candidates.clear();
    if(state.stream)state.stream.getTracks().forEach(t=>t.stop());state.stream=null;
    state.roomId=null;state.participantId=null;state.hostId=null;
    if($('localCallVideo'))$('localCallVideo').srcObject=null;
    if($('remoteCallTiles'))$('remoteCallTiles').innerHTML='';
    panels(false);if(message)notice(message);
  }
  window.endMaliCutCall=async()=>{
    if(!state.roomId||!window.sb||!window.user)return;
    const id=state.roomId,host=state.hostId===window.user.id;
    if(host){await send('call_ended',{room_id:id});await window.sb.from('call_rooms').update({status:'ended',ended_at:new Date().toISOString()}).eq('id',id);}
    else if(state.participantId){await window.sb.from('call_participants').update({status:'left',left_at:new Date().toISOString()}).eq('id',state.participantId).eq('user_id',window.user.id);await send('participant_joined',{user_id:window.user.id,left:true});}
    await cleanup(host?'Appel terminé.':'Tu as quitté l’appel.');
  };

  window.addEventListener('load',async()=>{
    for(let i=0;i<40&&!window.sb;i++)await new Promise(r=>setTimeout(r,250));
    if(!window.sb){notice('Configure Supabase pour activer les appels.');return;}
    const s=await window.sb.auth.getSession();window.user=s.data.session?s.data.session.user:(window.user||null);
    if(window.user){
      await loadInvites();
      state.inviteSub=window.sb.channel('malicut-invites:'+window.user.id)
        .on('postgres_changes',{event:'*',schema:'public',table:'call_participants',filter:'user_id=eq.'+window.user.id},()=>loadInvites()).subscribe();
      notice('Recherche un membre pour démarrer un appel audio ou vidéo.');
    }else notice('Connecte-toi à MaliCut pour lancer ou recevoir des appels.');
    window.sb.auth.onAuthStateChange(async(_event,session)=>{
      window.user=session?session.user:null;
      if(window.user){await loadInvites();if(!state.inviteSub)state.inviteSub=window.sb.channel('malicut-invites:'+window.user.id).on('postgres_changes',{event:'*',schema:'public',table:'call_participants',filter:'user_id=eq.'+window.user.id},()=>loadInvites()).subscribe();}
      else{if(state.inviteSub)await window.sb.removeChannel(state.inviteSub);state.inviteSub=null;await cleanup('Session fermée.');}
    });
  });
})();