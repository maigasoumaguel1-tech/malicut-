(function(){
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeId=v=>String(v||'').replace(/[^a-zA-Z0-9_-]/g,'');
const list=()=>window.MALICUT_COMMUNITY_VIDEOS||[];
const byId=id=>list().find(v=>v.id===id);
const style=document.createElement('style');
style.textContent='.video-social{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:10px;border-top:1px solid var(--line)}.video-social button{border:1px solid var(--line);background:var(--p2);color:var(--txt);border-radius:20px;padding:8px 10px;font-size:12px;font-weight:750}.video-social button.active{background:#fde8e8;color:#c5222b;border-color:#e6a0a4}.video-social .more{margin-left:auto;border-radius:50%;width:34px;height:34px;padding:0;font-size:18px}.video-comments{padding:0 10px 12px}.video-comments summary{cursor:pointer;font-size:12px;font-weight:800;color:var(--mut);padding:6px 0}.video-comment-list{display:grid;gap:7px;margin:8px 0}.video-comment{background:var(--p2);border-radius:10px;padding:8px 10px;font-size:12px}.video-comment small{color:var(--mut);display:block;margin-bottom:3px}.video-comment-form{display:flex;gap:6px}.video-comment-form input{min-width:0;padding:9px}.video-menu{position:relative}.video-menu-list{position:absolute;right:0;bottom:40px;z-index:20;min-width:190px;background:var(--p);border:1px solid var(--line);border-radius:13px;padding:6px;box-shadow:0 8px 28px #0003}.video-menu-list button{display:block;width:100%;text-align:left;border:0;border-radius:8px;padding:10px;background:transparent;color:var(--txt);font-size:13px}.cv-social{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.cv-social button{border:1px solid #ffffff88;background:#17130dcc;color:#fff;border-radius:20px;padding:8px 10px;font-size:12px;font-weight:800}.cv-social button.active{background:#7c242b}';
document.head.appendChild(style);
function actionBar(v,viewer){
 const id=safeId(v.id);
 return '<div class="'+(viewer?'cv-social':'video-social')+'"><button id="mlike-'+id+'" onclick="MaliCutSocial.like(\''+id+'\')">♡ J’aime <span id="mlikecount-'+id+'">'+(v.likeCount||0)+'</span></button><button onclick="MaliCutSocial.comments(\''+id+'\')">💬 Commenter <span id="mcommentcount-'+id+'">'+(v.commentCount||0)+'</span></button><button id="mrepost-'+id+'" onclick="MaliCutSocial.repost(\''+id+'\')">🔁 Republier <span id="mrepostcount-'+id+'">'+(v.repostCount||0)+'</span></button><button onclick="MaliCutSocial.transfer(\''+id+'\')">↗ Transférer</button>'+(viewer?'':'<div class="video-menu"><button class="more" onclick="MaliCutSocial.menu(\''+id+'\')">⋮</button><div id="vmenu-'+id+'" class="video-menu-list hidden"><button onclick="MaliCutSocial.copy(\''+id+'\')">🔗 Copier le lien</button><button onclick="MaliCutSocial.transfer(\''+id+'\')">↗ Transférer à un contact</button><button onclick="MaliCutSocial.download(\''+id+'\')">⬇ Télécharger</button><button onclick="MaliCutSocial.remove(\''+id+'\')">🗑 Supprimer ma vidéo</button></div></div>')+'</div>';
}
async function counters(id){
 const [l,c,r,ml,mr]=await Promise.all([
  sb.from('likes').select('*',{count:'exact',head:true}).eq('video_id',id),
  sb.from('comments').select('*',{count:'exact',head:true}).eq('video_id',id),
  sb.from('video_reposts').select('*',{count:'exact',head:true}).eq('video_id',id),
  user?sb.from('likes').select('video_id').eq('video_id',id).eq('user_id',user.id).maybeSingle():Promise.resolve({data:null}),
  user?sb.from('video_reposts').select('video_id').eq('video_id',id).eq('user_id',user.id).maybeSingle():Promise.resolve({data:null})
 ]);
 const values=[l.count||0,c.count||0,r.count||0];
 ['mlikecount-','mcommentcount-','mrepostcount-'].forEach((p,i)=>{const e=$(p+id);if(e)e.textContent=values[i];});
 const lb=$('mlike-'+id),rb=$('mrepost-'+id);if(lb)lb.classList.toggle('active',!!ml.data);if(rb)rb.classList.toggle('active',!!mr.data);
 const v=byId(id);if(v)Object.assign(v,{likeCount:values[0],commentCount:values[1],repostCount:values[2]});
}
async function requireUser(){if(!user){alert('Connecte-toi à MaliCut pour utiliser cette fonction.');return false;}return true;}
async function like(id){
 if(!await requireUser())return;
 const old=await sb.from('likes').select('video_id').eq('video_id',id).eq('user_id',user.id).maybeSingle();
 if(old.error){alert(old.error.message);return;}
 const res=old.data?await sb.from('likes').delete().eq('video_id',id).eq('user_id',user.id):await sb.from('likes').insert({video_id:id,user_id:user.id});
 if(res.error){alert('Action J’aime impossible : '+res.error.message);return;}await counters(id);
}
async function repost(id){
 if(!await requireUser())return;
 const old=await sb.from('video_reposts').select('id').eq('video_id',id).eq('user_id',user.id).maybeSingle();
 if(old.error){alert(old.error.message);return;}
 const res=old.data?await sb.from('video_reposts').delete().eq('video_id',id).eq('user_id',user.id):await sb.from('video_reposts').insert({video_id:id,user_id:user.id});
 if(res.error){alert('Republication impossible : '+res.error.message);return;}await counters(id);
}
async function comments(id){
 const v=byId(id);if(!v)return;
 let box=$('mcomments-'+id);
 if(box){box.classList.toggle('hidden');if(!box.classList.contains('hidden'))await loadComments(id);return;}
 box=document.createElement('div');box.id='mcomments-'+id;box.className='video-comments';
 box.innerHTML='<div id="mcommentlist-'+id+'" class="video-comment-list">Chargement…</div><div class="video-comment-form"><input id="mcommentinput-'+id+'" maxlength="1000" placeholder="Écrire un commentaire…"><button class="btn gold" onclick="MaliCutSocial.sendComment(\''+id+'\')">Envoyer</button></div>';
 const card=document.querySelector('[data-malic-video="'+id+'"]');if(card)card.appendChild(box);
 await loadComments(id);
}
async function loadComments(id){
 const target=$('mcommentlist-'+id);if(!target)return;
 const q=await sb.from('comments').select('id,user_id,content,created_at').eq('video_id',id).order('created_at',{ascending:true}).limit(50);
 if(q.error){target.textContent='Commentaires indisponibles : '+q.error.message;return;}
 const rows=q.data||[],ids=[...new Set(rows.map(x=>x.user_id).filter(Boolean))];
 const ps=ids.length?await sb.from('profiles').select('id,display_name,username').in('id',ids):{data:[]};
 const people=new Map((ps.data||[]).map(x=>[x.id,x]));
 target.innerHTML=rows.length?rows.map(x=>'<div class="video-comment"><small>'+esc(people.get(x.user_id)?.display_name||people.get(x.user_id)?.username||'Membre')+'</small>'+esc(x.content)+'</div>').join(''):'<div class="muted">Pas encore de commentaire.</div>';
}
async function sendComment(id){
 if(!await requireUser())return;
 const input=$('mcommentinput-'+id),content=input?.value.trim();if(!content)return;
 const res=await sb.from('comments').insert({video_id:id,user_id:user.id,content});
 if(res.error){alert('Commentaire non envoyé : '+res.error.message);return;}
 input.value='';await loadComments(id);await counters(id);
}
function menu(id){$('vmenu-'+id)?.classList.toggle('hidden');}
async function copy(id){
 const v=byId(id);if(!v)return;
 try{await navigator.clipboard.writeText(v.url);alert('Lien de la vidéo copié.');}
 catch(e){const t=document.createElement('textarea');t.value=v.url;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();alert('Lien copié.');}
}
async function download(id){
 const v=byId(id);if(!v)return;
 try{const res=await fetch(v.url);if(!res.ok)throw new Error();const blob=await res.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(v.title||'malicut-video').replace(/[^a-z0-9_-]/gi,'_')+'.mp4';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}
 catch(e){window.open(v.url,'_blank','noopener');}
}
async function remove(id){
 const v=byId(id);if(!v||!user||v.userId!==user.id){alert('Tu peux supprimer uniquement tes propres vidéos.');return;}
 if(!confirm('Supprimer définitivement cette vidéo ?'))return;
 const res=await sb.from('videos').delete().eq('id',id).eq('user_id',user.id);
 if(res.error){alert('Suppression impossible : '+res.error.message);return;}
 const marker='/object/public/videos/',p=v.url.indexOf(marker);
 if(p>=0){const path=decodeURIComponent(v.url.slice(p+marker.length).split('?')[0]);await sb.storage.from('videos').remove([path]);}
 await window.feed();if($('communityViewer')?.classList.contains('open'))window.closeCommunityViewer();
}
async function transfer(id){
 const v=byId(id);if(!v||!await requireUser())return;
 const handle=prompt('Nom d’utilisateur MaliCut du destinataire :');if(!handle)return;
 const found=await sb.from('profiles').select('id,username,display_name').eq('username',handle.trim().replace(/^@/,'').toLowerCase()).maybeSingle();
 if(found.error||!found.data){alert('Aucun membre trouvé avec cet identifiant.');return;}
 if(found.data.id===user.id){alert('Tu ne peux pas te transférer une vidéo à toi-même.');return;}
 const sent=await sb.from('direct_messages').insert({sender_id:user.id,recipient_id:found.data.id,message_type:'text',body:'🎬 '+(v.title||'Vidéo MaliCut')+'\n'+v.url});
 if(sent.error){alert('Transfert impossible : '+sent.error.message);return;}
 alert('Vidéo transférée à '+(found.data.display_name||found.data.username)+'.');
}
window.MaliCutSocial={like,repost,comments,sendComment,menu,copy,download,remove,transfer};
window.feed=async function(){
 const root=$('feed');if(!sb){root.innerHTML='<div class="notice">Connexion à Supabase en cours…</div>';return;}
 root.innerHTML='<div class="notice">Chargement des publications…</div>';
 const result=await sb.from('videos').select('id,user_id,title,description,video_url,thumbnail_url,views,created_at').eq('visibility','public').order('created_at',{ascending:false}).limit(25);
 if(result.error){root.innerHTML='<div class="notice">Impossible de charger les vidéos : '+esc(result.error.message)+'</div>';return;}
 const videos=result.data||[];if(!videos.length){root.innerHTML='<div class="notice">Aucune publication publique pour le moment.</div>';return;}
 const ids=[...new Set(videos.map(v=>v.user_id).filter(Boolean))];
 const ps=ids.length?await sb.from('profiles').select('id,display_name,username,role').in('id',ids):{data:[]};
 const people=new Map((ps.data||[]).map(p=>[p.id,p]));
 const stats=await Promise.all(videos.map(async v=>{
  const [l,c,r,ml,mr]=await Promise.all([
   sb.from('likes').select('*',{count:'exact',head:true}).eq('video_id',v.id),
   sb.from('comments').select('*',{count:'exact',head:true}).eq('video_id',v.id),
   sb.from('video_reposts').select('*',{count:'exact',head:true}).eq('video_id',v.id),
   user?sb.from('likes').select('video_id').eq('video_id',v.id).eq('user_id',user.id).maybeSingle():Promise.resolve({data:null}),
   user?sb.from('video_reposts').select('video_id').eq('video_id',v.id).eq('user_id',user.id).maybeSingle():Promise.resolve({data:null})
  ]);
  return {likeCount:l.count||0,commentCount:c.count||0,repostCount:r.count||0,liked:!!ml.data,reposted:!!mr.data};
 }));
 window.MALICUT_COMMUNITY_VIDEOS=videos.map((v,i)=>({...v,id:v.id,userId:v.user_id,url:v.video_url,title:v.title||'Vidéo MaliCut',description:v.description||'',...stats[i]}));
 root.innerHTML=videos.map((v,i)=>{
  const p=people.get(v.user_id)||{},role=(p.role==='admin'||p.role==='owner')?'owner':(p.role==='creator'||p.role==='moderator')?'creator':'user';
  const author=p.display_name||p.username||'Créateur MaliCut',url=/^https:\/\//i.test(v.video_url||'')?esc(v.video_url):'',poster=/^https:\/\//i.test(v.thumbnail_url||'')?esc(v.thumbnail_url):'';
  const date=v.created_at?new Date(v.created_at).toLocaleDateString('fr-FR'):'',st=stats[i],item={...v,...st};
  return '<article class="post" data-malic-video="'+v.id+'"><div class="posthead"><div><b>'+esc(v.title||'Vidéo MaliCut')+'</b><div class="muted">Par <span class="identity-name identity-'+role+'">'+esc(author)+'</span>'+(date?' · '+esc(date):'')+'</div></div><span class="muted">'+esc(v.views||0)+' vues</span></div><div class="postmedia">'+(url?'<video controls playsinline preload="metadata" src="'+url+'"'+(poster?' poster="'+poster+'"':'')+'></video><button class="community-open-viewer" onclick="openCommunityViewer('+i+')">⛶ Plein écran</button>':'<div class="notice">Vidéo indisponible</div>')+'</div><div class="postbody muted">'+esc(v.description||'')+'</div>'+actionBar(item,false)+'</article>';
 }).join('');
};
const oldShow=window.showCommunityVideo;
window.showCommunityVideo=function(){
 const items=list();if(!items.length)return;
 const i=Math.max(0,Math.min(window.communityVideoIndex||0,items.length-1)),v=items[i];
 const video=$('cvVideo');if(!video)return;
 video.pause();video.src=v.url;video.load();video.play().catch(()=>{});
 $('cvCount').textContent=(i+1)+' / '+items.length;$('cvTitle').textContent=v.title;$('cvDescription').textContent=v.description;
 let social=$('cvSocial');if(!social){social=document.createElement('div');social.id='cvSocial';social.className='cv-social';$('cvDescription').after(social);}
 social.innerHTML=actionBar(v,true);counters(v.id);
 video.onended=()=>window.stepCommunityVideo(1);
};
})();