#!/usr/bin/env python3
# MaliCut — éditeur vidéo tout-en-un
# Python 3.x, aucune bibliothèque externe.
# Import vidéo/audio/image • aperçu • découpage • texte • filtres • vitesse
# volume • rotation • miroir • formats • export WebM.

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os
import socket

PREFERRED_PORT = 8081
PUBLIC_HOST = '0.0.0.0'

HTML = r'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>MaliCut</title>
<style>
*{box-sizing:border-box}:root{--bg:#0d0f12;--panel:#171a1f;--line:#30353d;--text:#f5f7fa;--muted:#9ca5b1}
body{margin:0;background:var(--bg);color:var(--text);font-family:Arial,sans-serif}
header{position:sticky;top:0;z-index:20;background:#12151a;border-bottom:1px solid var(--line);padding:14px 16px}
.brand{font-size:23px;font-weight:800}.sub{font-size:12px;color:var(--muted);margin-top:3px}
.wrap{max-width:1150px;margin:auto;padding:14px}.grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(290px,.8fr);gap:14px}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px}
.preview{background:#000;border-radius:10px;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;min-height:250px}
video{width:100%;max-height:58vh;display:block;background:#000}
.overlay{position:absolute;inset:0;pointer-events:none;text-align:center}
.overlay span{position:absolute;left:50%;transform:translate(-50%,-50%);font-weight:800;font-size:42px;text-shadow:0 2px 7px #000;white-space:pre-wrap;max-width:90%}
.controls{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
button,.filebtn,select,input[type=text]{border:1px solid var(--line);background:#22272e;color:var(--text);border-radius:9px;padding:10px 12px}
button{cursor:pointer;font-weight:700}.primary{background:#198754;border-color:#198754}
.filebtn{display:inline-block;cursor:pointer}.filebtn input{display:none}
label{display:block;font-size:12px;color:var(--muted);margin:11px 0 5px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
input[type=range]{width:100%}.value{font-size:12px;color:var(--muted);float:right}
h2{font-size:16px;margin:0 0 10px}.section{padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid var(--line)}
.section:last-child{border-bottom:0;margin-bottom:0}
.timeline{height:62px;border:1px solid var(--line);background:#101216;border-radius:9px;margin-top:12px;position:relative;overflow:hidden}
.rangebar{position:absolute;top:21px;height:20px;background:#1f7a48;border-radius:5px;left:0;width:100%}
.status{font-size:12px;color:var(--muted);padding-top:9px;min-height:25px}
footer{text-align:center;color:#68717d;font-size:11px;padding:18px}
@media(max-width:800px){.grid{grid-template-columns:1fr}.preview{min-height:220px}.row3{grid-template-columns:1fr 1fr}}
</style>
</head>
<body>
<header><div class="brand">MaliCut</div><div class="sub">Éditeur vidéo local • montage directement dans le navigateur</div></header>
<div class="wrap"><div class="grid"><main>
<div class="panel">
<div class="preview"><video id="video" playsinline></video><div class="overlay"><span id="textOverlay"></span></div></div>
<div class="controls">
<label class="filebtn">🎬 Importer vidéo<input id="videoFile" type="file" accept="video/*"></label>
<label class="filebtn">🎵 Importer audio<input id="audioFile" type="file" accept="audio/*"></label>
<label class="filebtn">🖼️ Importer image<input id="imageFile" type="file" accept="image/*"></label>
<button id="play">▶ Lecture</button><button id="pause">⏸ Pause</button>
</div>
<div class="timeline"><div class="rangebar" id="rangebar"></div></div>
<div class="status" id="status">Importe une vidéo pour commencer.</div>
</div>
<div class="panel" style="margin-top:14px">
<h2>✂️ Découpage</h2>
<div class="row">
<div><label>Début <span class="value" id="startVal">0.00 s</span></label><input id="start" type="range" min="0" max="1" step=".01" value="0"></div>
<div><label>Fin <span class="value" id="endVal">0.00 s</span></label><input id="end" type="range" min="0" max="1" step=".01" value="1"></div>
</div>
<div class="controls"><button id="setStart">Définir début ici</button><button id="setEnd">Définir fin ici</button><button id="previewCut">▶ Aperçu du découpage</button></div>
</div></main>

<aside><div class="panel">
<div class="section"><h2>📝 Texte</h2>
<input id="caption" type="text" placeholder="Votre texte..." style="width:100%">
<div class="row"><div><label>Taille <span class="value" id="fontVal">42 px</span></label><input id="font" type="range" min="12" max="100" value="42"></div>
<div><label>Position</label><select id="pos" style="width:100%"><option value="20">Haut</option><option value="50" selected>Centre</option><option value="80">Bas</option></select></div></div></div>

<div class="section"><h2>🎨 Filtres</h2>
<label>Luminosité <span class="value" id="brightVal">100%</span></label><input id="bright" type="range" min="50" max="160" value="100">
<label>Contraste <span class="value" id="contrastVal">100%</span></label><input id="contrast" type="range" min="50" max="180" value="100">
<label>Saturation <span class="value" id="satVal">100%</span></label><input id="sat" type="range" min="0" max="200" value="100">
<label>Teinte <span class="value" id="hueVal">0°</span></label><input id="hue" type="range" min="-180" max="180" value="0">
<div class="controls"><button data-preset="none">Normal</button><button data-preset="bw">N&B</button><button data-preset="cinema">Cinéma</button><button data-preset="vivid">Vif</button></div></div>

<div class="section"><h2>⚙️ Transformations</h2>
<div class="row3"><button id="rotL">↶ 90°</button><button id="rotR">↷ 90°</button><button id="mirror">↔ Miroir</button></div>
<label>Vitesse <span class="value" id="speedVal">1×</span></label><input id="speed" type="range" min=".25" max="2" step=".05" value="1">
<label>Volume <span class="value" id="volumeVal">100%</span></label><input id="volume" type="range" min="0" max="100" value="100"></div>

<div class="section"><h2>📐 Format</h2>
<select id="ratio" style="width:100%"><option value="16:9">16:9 — paysage</option><option value="9:16">9:16 — TikTok / Reels / Shorts</option><option value="1:1">1:1 — carré</option><option value="4:5">4:5 — portrait</option></select></div>

<div class="section"><h2>💾 Exportation</h2>
<div class="controls"><button class="primary" id="export">⬇ Exporter la vidéo</button><button id="reset">↺ Réinitialiser</button></div>
<div class="status" id="exportStatus"></div></div>
</div></aside></div>
<footer>MaliCut • Traitement local dans le navigateur.</footer></div>

<script>
const $=id=>document.getElementById(id),v=$('video'),status=$('status'),text=$('textOverlay');
let videoURL=null,audioURL=null,imageURL=null,rotation=0,mirrored=false,cutPreview=false;
function sec(x){return isFinite(x)?Number(x).toFixed(2)+' s':'0.00 s'}
function updateRange(){let d=v.duration||1;$('start').max=d;$('end').max=d;if(+$('end').value>d)$('end').value=d;$('startVal').textContent=sec($('start').value);$('endVal').textContent=sec($('end').value)}
function filterCSS(){return `brightness(${$('bright').value}%) contrast(${$('contrast').value}%) saturate(${$('sat').value}%) hue-rotate(${$('hue').value}deg)`}
function updatePreview(){
 text.textContent=$('caption').value;text.style.fontSize=$('font').value+'px';text.style.top=$('pos').value+'%';text.style.filter='none';
 v.style.filter=filterCSS();v.style.transform=`rotate(${rotation}deg) scaleX(${mirrored?-1:1})`;
 $('fontVal').textContent=$('font').value+' px';$('brightVal').textContent=$('bright').value+'%';$('contrastVal').textContent=$('contrast').value+'%';$('satVal').textContent=$('sat').value+'%';$('hueVal').textContent=$('hue').value+'°';
}
$('videoFile').onchange=e=>{let f=e.target.files[0];if(!f)return;if(videoURL)URL.revokeObjectURL(videoURL);videoURL=URL.createObjectURL(f);v.src=videoURL;v.load();status.textContent='Vidéo chargée : '+f.name};
$('audioFile').onchange=e=>{let f=e.target.files[0];if(!f)return;audioURL=URL.createObjectURL(f);status.textContent='Audio chargé : '+f.name};
$('imageFile').onchange=e=>{let f=e.target.files[0];if(!f)return;if(imageURL)URL.revokeObjectURL(imageURL);imageURL=URL.createObjectURL(f);status.textContent='Image importée : '+f.name};
v.onloadedmetadata=()=>{updateRange();$('end').value=v.duration;updateRange()};
v.ontimeupdate=()=>{let d=v.duration||1,s=+$('start').value,e=+$('end').value;$('rangebar').style.left=s/d*100+'%';$('rangebar').style.width=Math.max(0,(e-s)/d*100)+'%';if(cutPreview&&v.currentTime>=e){v.pause();cutPreview=false}};
$('play').onclick=()=>{if(v.currentTime<+$('start').value)v.currentTime=+$('start').value;cutPreview=true;v.play()};
$('pause').onclick=()=>{v.pause();cutPreview=false};
$('setStart').onclick=()=>{if(v.duration){$('start').value=v.currentTime;if(+$('start').value>+$('end').value)$('end').value=v.currentTime;updateRange()}};
$('setEnd').onclick=()=>{if(v.duration){$('end').value=v.currentTime;if(+$('end').value<+$('start').value)$('start').value=v.currentTime;updateRange()}};
$('previewCut').onclick=()=>{if(v.src){v.currentTime=+$('start').value;cutPreview=true;v.play()}};
['start','end'].forEach(id=>$(id).oninput=()=>{if(+$('start').value>+$('end').value){if(id==='start')$('end').value=$(id).value;else $('start').value=$(id).value}updateRange()});
$('caption').oninput=updatePreview;$('font').oninput=updatePreview;$('pos').onchange=updatePreview;['bright','contrast','sat','hue'].forEach(id=>$(id).oninput=updatePreview);
$('rotL').onclick=()=>{rotation=(rotation-90)%360;updatePreview()};$('rotR').onclick=()=>{rotation=(rotation+90)%360;updatePreview()};$('mirror').onclick=()=>{mirrored=!mirrored;updatePreview()};
$('speed').oninput=()=>{v.playbackRate=+$('speed').value;$('speedVal').textContent=$('speed').value+'×'};$('volume').oninput=()=>{v.volume=+$('volume').value/100;$('volumeVal').textContent=$('volume').value+'%'};
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{let p=b.dataset.preset;if(p==='none')[$('bright').value,$('contrast').value,$('sat').value,$('hue').value]=[100,100,100,0];if(p==='bw')[$('bright').value,$('contrast').value,$('sat').value,$('hue').value]=[100,110,0,0];if(p==='cinema')[$('bright').value,$('contrast').value,$('sat').value,$('hue').value]=[92,125,85,-4];if(p==='vivid')[$('bright').value,$('contrast').value,$('sat').value,$('hue').value]=[105,115,150,0];updatePreview()});
$('ratio').onchange=()=>{let r=$('ratio').value.replace(':','/');v.style.aspectRatio=r;v.style.objectFit='contain'};
$('reset').onclick=()=>{rotation=0;mirrored=false;$('caption').value='';$('bright').value=100;$('contrast').value=100;$('sat').value=100;$('hue').value=0;$('font').value=42;$('pos').value=50;$('speed').value=1;$('volume').value=100;$('ratio').value='16:9';v.playbackRate=1;v.volume=1;updatePreview();status.textContent='Réglages réinitialisés.'};

function mimeType(){if(!window.MediaRecorder)return '';return ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(x=>MediaRecorder.isTypeSupported(x))||''}
$('export').onclick=async()=>{
 if(!v.src){$('exportStatus').textContent='Importe d’abord une vidéo.';return}
 let mime=mimeType();if(!mime){$('exportStatus').textContent='Export non pris en charge par ce navigateur.';return}
 $('exportStatus').textContent='Export en cours...';
 let canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),rr=$('ratio').value.split(':');
 let W=1280,H=Math.round(1280*rr[1]/rr[0]);if($('ratio').value==='9:16'){W=720;H=1280}if($('ratio').value==='1:1'){W=1080;H=1080}if($('ratio').value==='4:5'){W=1080;H=1350}canvas.width=W;canvas.height=H;
 let stream=canvas.captureStream(30);try{let vs=v.captureStream?v.captureStream():null;if(vs)vs.getAudioTracks().forEach(t=>stream.addTrack(t))}catch(e){}
 let chunks=[],rec=new MediaRecorder(stream,{mimeType});rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
 let done=new Promise(r=>rec.onstop=r),start=+$('start').value,end=+$('end').value,old=v.currentTime,oldRate=v.playbackRate;
 v.pause();v.currentTime=start;v.playbackRate=+$('speed').value;await new Promise(r=>{let f=()=>{v.removeEventListener('seeked',f);r()};v.addEventListener('seeked',f)});
 rec.start(200);
 let draw=()=>{ctx.save();ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);let vw=v.videoWidth||1280,vh=v.videoHeight||720,scale=Math.min(W/vw,H/vh),dw=vw*scale,dh=vh*scale;ctx.translate(W/2,H/2);ctx.rotate(rotation*Math.PI/180);ctx.scale(mirrored?-1:1,1);ctx.filter=filterCSS();ctx.drawImage(v,-dw/2,-dh/2,dw,dh);ctx.restore();let cap=$('caption').value;if(cap){ctx.save();ctx.fillStyle='white';ctx.font='800 '+$('font').value+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='black';ctx.shadowBlur=8;ctx.fillText(cap,W/2,H*+$('pos').value/100);ctx.restore()}if(v.currentTime>=end-.04){v.pause();rec.stop();return}requestAnimationFrame(draw)};
 try{await v.play();requestAnimationFrame(draw)}catch(e){rec.stop()}
 await done;v.pause();v.currentTime=old;v.playbackRate=oldRate;
 let blob=new Blob(chunks,{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='malicut_export.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);$('exportStatus').textContent='Export terminé : malicut_export.webm';
};
updatePreview();
</script></body></html>'''

class ReusableHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ('/','/index.html'):
            data=HTML.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type','text/html; charset=utf-8')
            self.send_header('Content-Length',str(len(data)))
            self.send_header('Cache-Control','no-store')
            self.end_headers()
            self.wfile.write(data)
        else:
            self.send_error(404)
    def log_message(self,fmt,*args):
        return

def get_free_port(preferred):
    for port in (preferred,8082,8083,8084,8085):
        s=socket.socket()
        try:
            s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
            s.bind((PUBLIC_HOST,port))
            s.close()
            return port
        except OSError:
            s.close()
    s=socket.socket()
    s.bind((PUBLIC_HOST,0))
    port=s.getsockname()[1]
    s.close()
    return port

def main():
    # Render fournit le port via la variable d'environnement PORT.
    # Le serveur doit écouter sur 0.0.0.0 pour être accessible publiquement.
    port=int(os.environ.get('PORT', PREFERRED_PORT))
    server=ReusableHTTPServer(('0.0.0.0',port),Handler)
    print('='*56)
    print(' MALICUT V3.1 — ÉDITEUR VIDÉO')
    print('='*56)
    print('Éditeur actif.')
    print('Adresse : http://0.0.0.0:'+str(port))
    print('Laisse cette console ouverte.')
    print('Ctrl+C pour arrêter.')
    print('='*56)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nArrêt...')
    finally:
        server.server_close()

if __name__=='__main__':
    main()
