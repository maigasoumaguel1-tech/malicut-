/* MaliCut Studio — assistants IA OpenAI + Gemini */
(function(){
 const css = "#aiAssistant .ai-provider{display:flex;gap:8px;flex-wrap:wrap}#aiAssistant .ai-provider button{flex:1;min-width:120px}#aiAssistant .ai-provider button.active{border-color:#b68a35;background:#fff4d6;color:#6d4a12}#aiAssistant .ai-chat{display:flex;flex-direction:column;gap:9px;min-height:220px;max-height:48vh;overflow:auto;padding:10px;background:#f7f5ef;border:1px solid #d8d0bf;border-radius:14px}#aiAssistant .ai-msg{max-width:92%;padding:10px 12px;border-radius:13px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.45}#aiAssistant .ai-msg.user{align-self:flex-end;background:#e9dfc8;color:#292217}#aiAssistant .ai-msg.assistant{align-self:flex-start;background:#fff;border:1px solid #e0d5bf;color:#252018}#aiAssistant textarea{min-height:82px;background:#fff;color:#171713}#aiAssistant .ai-status{font-size:12px;min-height:18px;color:#716b5f}";
 const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
 let provider='openai',history=[],busy=false;
 const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function status(s){const el=document.getElementById('aiStatus');if(el)el.textContent=s}
 function draw(){const el=document.getElementById('aiChat');if(!el)return;el.innerHTML=history.map(m=>'<div class="ai-msg '+(m.role==='user'?'user':'assistant')+'">'+esc(m.content)+'</div>').join('');el.scrollTop=el.scrollHeight}
 function choose(p){provider=p;document.querySelectorAll('#aiAssistant [data-ai-provider]').forEach(b=>b.classList.toggle('active',b.dataset.aiProvider===p));status(p==='openai'?'Assistant ChatGPT sélectionné.':'Assistant Gemini sélectionné.')}
 async function send(){
  if(busy)return;
  const input=document.getElementById('aiPrompt'),message=(input?.value||'').trim();if(!message)return;
  if(!window.sb){status('Connexion au compte indisponible.');return}
  const session=await sb.auth.getSession();const token=session.data?.session?.access_token;
  if(!token){status('Connecte-toi à ton compte MaliCut pour utiliser les assistants.');return}
  history.push({role:'user',content:message});input.value='';draw();busy=true;status('Réponse en cours…');
  try{
   const res=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({provider,history:history.slice(-10)})});
   const data=await res.json().catch(()=>({}));
   if(!res.ok)throw new Error(data.error||'Le service IA est temporairement indisponible.');
   history.push({role:'assistant',content:data.reply||'Aucune réponse reçue.'});draw();status('Réponse reçue · '+(provider==='openai'?'ChatGPT':'Gemini'));
  }catch(e){history.pop();draw();status(e.message||'Erreur de connexion.')}
  finally{busy=false}
 }
 window.MaliCutAI={choose,send,clear(){history=[];draw();status('Conversation effacée sur cet appareil.')}};
 document.addEventListener('keydown',e=>{if(e.target?.id==='aiPrompt'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});
})();