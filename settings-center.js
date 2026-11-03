/* MaliCut Studio — Centre de paramètres */
(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const defaults={privateProfile:false,allowComments:true,allowMessages:true,allowAIProcessing:false,autoplay:true,dataSaver:false,marketing:false};
  const serverKeys={privateProfile:'private_profile',allowComments:'allow_comments',allowMessages:'allow_messages',allowAIProcessing:'allow_ai_processing'};
  let serverPreferences={};
  const readPrefs=()=>{let local={};try{local=JSON.parse(localStorage.getItem('malicut_settings')||'{}')||{}}catch{}return {...defaults,...local,...serverPreferences}};
  const savePrefs=p=>localStorage.setItem('malicut_settings',JSON.stringify(p));
  const css=`
  #settings .settings-layout{display:grid;grid-template-columns:1fr;gap:12px}
  #settings .settings-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  #settings .settings-group{display:flex;align-items:center;gap:9px;text-align:left;padding:12px;border:1px solid #e0c992;border-radius:13px;background:#fff;color:#302719;min-height:66px}
  #settings .settings-group.active{border-color:#c99b3c;background:#fff8e9;box-shadow:inset 0 0 0 1px #c99b3c}
  #settings .settings-group .sg-icon{font-size:21px}
  #settings .settings-group b{display:block;font-size:13px}
  #settings .settings-group small{display:block;color:#776b57;font-size:10px;margin-top:2px}
  #settings .settings-detail{background:#fff;border:1px solid #e0c992;border-radius:16px;padding:14px;color:#302719}
  #settings .settings-detail h3{margin:0 0 5px;font-size:18px}
  #settings .settings-detail .setting-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #f0e7d5}
  #settings .settings-detail .setting-row:last-child{border-bottom:0}
  #settings .settings-detail .setting-row small{display:block;color:#776b57;font-size:11px;margin-top:3px}
  #settings .settings-detail input[type=checkbox]{width:20px;height:20px;accent-color:#c99b3c;flex:none}
  #settings .settings-detail select,#settings .settings-detail input[type=email]{background:#fff;color:#302719;border:1px solid #dfc58f;border-radius:10px;padding:9px;max-width:170px}
  #settings .settings-status{font-size:12px;color:#477653;margin-top:10px;min-height:18px}
  @media(min-width:560px){#settings .settings-layout{grid-template-columns:190px 1fr}#settings .settings-groups{grid-template-columns:1fr}}
  `;
  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
  const groups=[
    ['account','👤','Compte','Identifiants et statut'],
    ['profile','🪪','Profil','Nom et présentation'],
    ['security','🔐','Connexion et sécurité','Accès et mot de passe'],
    ['permissions','📱','Droits de l’application','Caméra, micro et notifications'],
    ['privacy','🛡️','Confidentialité','Visibilité et interactions'],
    ['notifications','🔔','Notifications','Alertes et préférences'],
    ['preferences','🌐','Préférences','Langue et lecture vidéo'],
    ['storage','🗂️','Stockage et données','Économie de données'],
    ['about','ℹ️','Informations','Version et conditions'],
    ['help','🎧','Assistance','Aide et signalement']
  ];
  let active='account';
  function row(label,desc,control){return '<div class="setting-row"><div><b>'+label+'</b><small>'+desc+'</small></div>'+control+'</div>'}
  function toggle(key,label,desc){const p=readPrefs();return row(label,desc,'<input type="checkbox" '+(p[key]?'checked':'')+' onchange="MaliCutSettings.toggle(\''+key+'\',this.checked)">')}
  function detail(id){
    const p=readPrefs(),mail=window.user?.email||'Non connecté';
    const pages={
      account:['Compte','Gère les informations liées à ton compte MaliCut.',row('Adresse e-mail',esc(mail),'')+row('État du compte',window.user?'Connecté':'Session non ouverte','')+row('Identifiant utilisateur',esc(window.user?.id||'—'),'')+(window.user?row('Session','Ton compte est actif sur cet appareil.','<button class="btn" onclick="signOutMaliCut()">Se déconnecter</button>'):row('Accès au compte','Connecte-toi ou crée ton compte MaliCut.','<button class="btn gold" onclick="MaliCutSettings.openLogin()">Se connecter / créer un compte</button>'))],
      profile:['Profil','Modifie les informations visibles sur ton profil.',row('Nom affiché','Ton nom public sur MaliCut','<button class="btn" onclick="openPage(\'profile\')">Modifier le profil</button>')+row('Identifiant','Ton nom d’utilisateur','<button class="btn" onclick="openPage(\'profile\')">Modifier</button>')],
      security:['Connexion et sécurité','Options de connexion disponibles actuellement.',row('Session','Gérer la session de cet appareil',window.user?'<button class="btn" onclick="signOutMaliCut()">Se déconnecter</button>':'<button class="btn gold" onclick="openPage(\'profile\')">Se connecter</button>')+row('Mot de passe oublié','Recevoir un lien de réinitialisation par e-mail','<button class="btn" onclick="MaliCutSettings.resetPassword()">Réinitialiser</button>')+row('Connexion Google / Apple','Disponibilité selon les fournisseurs activés dans Supabase','<button class="btn" onclick="openPage(\'profile\')">Voir les options</button>')],
      permissions:['Droits de l’application','Les autorisations sont demandées par le navigateur au moment où une fonction en a besoin.',row('Caméra et microphone','Tester la demande d’autorisation','<button class="btn" onclick="MaliCutSettings.mediaPermission()">Tester</button>')+row('Notifications','Autoriser les notifications du navigateur','<button class="btn" onclick="MaliCutSettings.notificationPermission()">Autoriser</button>')+row('Photos et vidéos','L’accès est demandé lors de l’importation depuis ton appareil','<span class="muted">Géré par Android / navigateur</span>')],
      privacy:['Confidentialité','Ces réglages sont enregistrés sur ton compte et appliqués par les règles de sécurité de la base de données.',toggle('privateProfile','Profil privé','Seuls toi et tes abonnés approuvés peuvent consulter ton profil.')+toggle('allowComments','Autoriser les commentaires','Empêche les autres comptes de commenter tes vidéos.')+toggle('allowMessages','Autoriser les messages','Empêche les autres comptes de t’envoyer de nouveaux messages.')+toggle('allowAIProcessing','Autoriser le traitement IA externe','Autorise l’envoi des messages que tu saisis volontairement à ChatGPT ou Gemini.')],
      notifications:['Notifications','Choisis les préférences de notification.',toggle('marketing','Actualités et nouveautés','Préférence mémorisée localement ; l’envoi de notifications produit n’est pas encore activé.')+row('Permission du navigateur','État actuel : '+(('Notification' in window)?Notification.permission:'Non pris en charge'),'<button class="btn" onclick="MaliCutSettings.notificationPermission()">Gérer</button>')],
      preferences:['Préférences','Personnalise l’expérience MaliCut.',row('Langue','Choisis la langue de l’application','<select onchange="setAppLanguage(this.value)"><option value="fr" '+(localStorage.getItem('malicut_language')!=='en'&&localStorage.getItem('malicut_language')!=='bm'?'selected':'')+'>Français</option><option value="bm" '+(localStorage.getItem('malicut_language')==='bm'?'selected':'')+'>Bamanankan</option><option value="en" '+(localStorage.getItem('malicut_language')==='en'?'selected':'')+'>English</option></select>')+toggle('autoplay','Lecture automatique','Préférence enregistrée sur cet appareil.')],
      storage:['Stockage et données','Contrôle quelques préférences locales de consommation.',toggle('dataSaver','Économiseur de données','Désactive la lecture automatique comme préférence locale.')+row('Données locales','Les préférences MaliCut sont conservées sur cet appareil.','<button class="btn" onclick="MaliCutSettings.clearPrefs()">Effacer les préférences</button>')],
      about:['Informations','À propos de MaliCut Studio.',row('Application','MaliCut Studio · Version web','')+row('Identité','🇲🇱 Leader Maiga Mindset','')+row('Conditions et confidentialité','Documents officiels à publier par le projet','<span class="muted">Non configurés</span>')],
      help:['Assistance','Besoin d’aide ou envie de signaler un problème ?',row('Centre d’aide','Consulte les informations disponibles dans l’application','<button class="btn" onclick="alert(\'Centre d’aide en préparation.\')">Ouvrir</button>')+row('Signaler un problème','Prépare un message à l’équipe MaliCut','<button class="btn gold" onclick="MaliCutSettings.support()">Contacter</button>')+row('Conseil','Ajoute une description claire et, si possible, une capture d’écran.','')]
    };
    const d=pages[id]||pages.account;
    return '<div class="settings-detail"><h3>'+d[0]+'</h3><p class="muted">'+d[1]+'</p>'+d[2]+'<div id="settingsStatus" class="settings-status"></div></div>';
  }
  function render(){
    const s=document.getElementById('settings');if(!s)return;
    s.innerHTML='<div class="head"><div><h2>Paramètres</h2><span class="muted">Centre de contrôle MaliCut Studio</span></div><span>⚙️</span></div><div class="settings-layout"><div class="settings-groups">'+groups.map(g=>'<button class="settings-group '+(g[0]===active?'active':'')+'" onclick="MaliCutSettings.open(\''+g[0]+'\')"><span class="sg-icon">'+g[1]+'</span><span><b>'+g[2]+'</b><small>'+g[3]+'</small></span></button>').join('')+'</div><div id="settingsDetail">'+detail(active)+'</div></div>';
  }
  window.MaliCutSettings={
    open(id){active=id;render()},
    openLogin(){openPage('profile');document.getElementById('callEmail')?.focus();},
    async toggle(key,value){
      if(serverKeys[key]){
        if(!window.sb||!window.user){const s=document.getElementById('settingsStatus');if(s)s.textContent='Connecte-toi pour enregistrer ce réglage sur ton compte.';render();return;}
        const payload={user_id:window.user.id,[serverKeys[key]]:!!value,updated_at:new Date().toISOString()};
        const result=await window.sb.from('account_preferences').upsert(payload,{onConflict:'user_id'});
        if(result.error){const s=document.getElementById('settingsStatus');if(s)s.textContent='Enregistrement refusé : '+result.error.message;render();return;}
        serverPreferences[key]=!!value;
        const s=document.getElementById('settingsStatus');if(s)s.textContent='Réglage de confidentialité enregistré sur ton compte.';
        return;
      }
      const p=readPrefs();p[key]=value;if(key==='dataSaver'&&value)p.autoplay=false;savePrefs(p);
      const s=document.getElementById('settingsStatus');if(s)s.textContent='Préférence enregistrée sur cet appareil.';
    },
    async refresh(){
      if(!window.sb||!window.user){serverPreferences={};if(active==='privacy')render();return;}
      const r=await window.sb.from('account_preferences').select('private_profile,allow_comments,allow_messages,allow_ai_processing').eq('user_id',window.user.id).maybeSingle();
      if(r.error){const s=document.getElementById('settingsStatus');if(s)s.textContent='Impossible de charger les réglages de confidentialité.';return;}
      const d=r.data||{};
      serverPreferences={privateProfile:d.private_profile??false,allowComments:d.allow_comments??true,allowMessages:d.allow_messages??true,allowAIProcessing:d.allow_ai_processing??false};
      if(active==='privacy')render();
    },
    async resetPassword(){if(!window.sb){alert('Le service de compte MaliCut n’est pas encore prêt.');return}const typed=document.getElementById('callEmail')?.value?.trim()||'';const email=window.user?.email||typed||prompt('Saisis l’adresse e-mail de ton compte MaliCut :');if(!email){alert('Adresse e-mail nécessaire pour envoyer le lien.');return}const r=await window.sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin});alert(r.error?'Erreur : '+r.error.message:'Si cette adresse correspond à un compte, un lien de récupération vient d’être envoyé. Vérifie ta boîte e-mail.')},
    async mediaPermission(){if(!navigator.mediaDevices?.getUserMedia){alert('Cette fonction nécessite un navigateur compatible et une connexion sécurisée.');return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:true});stream.getTracks().forEach(t=>t.stop());alert('Caméra et microphone autorisés.')}catch(e){alert('Autorisation non accordée : '+(e.message||e))}},
    async notificationPermission(){if(!('Notification' in window)){alert('Notifications non prises en charge par ce navigateur.');return}const p=await Notification.requestPermission();alert('État des notifications : '+p)},
    clearPrefs(){if(confirm('Effacer les préférences locales MaliCut ?')){localStorage.removeItem('malicut_settings');render()}},
    support(){const body='ASSISTANCE MALICUT STUDIO\n\nProblème rencontré :\n\nAppareil : '+navigator.userAgent+'\nCompte : '+(window.user?.email||'non connecté');if(navigator.clipboard?.writeText){navigator.clipboard.writeText(body).then(()=>alert('Le modèle de signalement a été copié. Colle-le dans ton canal de contact MaliCut habituel.')).catch(()=>prompt('Copie ce signalement :',body))}else{prompt('Copie ce signalement :',body)}}
  };
  document.querySelector('.top-actions')?.insertAdjacentHTML('beforeend','<button class="top-action" onclick="openPage(\'settings\')" aria-label="Paramètres" title="Paramètres">⚙️</button>');
  const profile=document.getElementById('profile');
  const hero=profile?.querySelector('.hero');
  if(hero&&!document.getElementById('profileSettingsButton'))hero.insertAdjacentHTML('beforeend','<button id="profileSettingsButton" class="btn gold full" style="margin-top:12px" onclick="openPage(\'settings\')">⚙️ Ouvrir les paramètres</button>');
  render();
  window.addEventListener('load',async()=>{
    for(let i=0;i<40&&!window.sb;i++)await new Promise(resolve=>setTimeout(resolve,250));
    if(!window.sb)return;
    await window.MaliCutSettings.refresh();
    window.sb.auth.onAuthStateChange(async()=>{await window.MaliCutSettings.refresh()});
  });
})();
