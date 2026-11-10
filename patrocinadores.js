// Banner de patrocinadores. Os anuncios vem do banco (editados em /admin).
// Celular: 1 por vez. PC largo (>=1200px) com 3+ anuncios: 3 ao mesmo tempo; com 4+ gira de 1 em 1.
var INTERVALO=5000;
(function(){
var box=document.getElementById("ads");
if(!box)return;
var mq=window.matchMedia("(min-width:1200px)");
function esc(t){return String(t==null?"":t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function slide(a,on){
var w=a.whatsapp?'<a class="w" href="https://wa.me/'+esc(a.whatsapp)+'" target="_blank" rel="noopener">WhatsApp</a>':'';
var s=a.site?'<a href="'+esc(a.site)+'" target="_blank" rel="noopener">Visitar site</a>':'';
return '<div class="slide'+(on?' on':'')+'"><div class="img">'+(a.img?'<img src="/'+esc(a.img)+'" alt="">':'')+'</div><div class="body"><h3>'+esc(a.titulo)+'</h3><p>'+esc(a.texto)+'</p><div class="btns">'+w+s+'</div></div></div>'}
var L=[],c=0,sl=null,dt=null;
function lado(id){var d=document.getElementById(id);if(!d){d=document.createElement("div");d.id=id;d.className="ad";d.style.cssText="position:fixed;z-index:5;width:320px;display:none";document.body.appendChild(d)}return d}
function pinta(d,a){d.innerHTML='<span class="lbl">PATROCINADO</span>'+slide(a,true)}
function lados(){
var e=lado("adsL"),d=lado("adsR"),n=L.length;
if(!(mq.matches&&n>=3)||box.style.display==="none"){e.style.display=d.style.display="none";return}
var r=box.getBoundingClientRect();
e.style.top=d.style.top=r.top+"px";
e.style.left=(r.left-24-320)+"px";
d.style.left=(r.right+24)+"px";
pinta(e,L[(c+n-1)%n]);pinta(d,L[(c+1)%n]);
e.style.display=d.style.display=""}
function marca(){
for(var i=0;i<sl.length;i++){sl[i].className="slide"+(i===c?" on":"");dt[i].className=i===c?"on":""}
lados()}
function montar(l){
L=l;c=0;
if(!L.length){box.style.display="none";lados();return}
box.style.display="";
box.innerHTML='<span class="lbl">PATROCINADO</span>'+L.map(function(a,i){return slide(a,i===0)}).join("")+'<div class="dots">'+L.map(function(a,i){return '<i'+(i?'':' class="on"')+'></i>'}).join("")+'</div>';
sl=box.querySelectorAll(".slide");dt=box.querySelectorAll(".dots i");
lados();
if(L.length>1)setInterval(function(){if(mq.matches&&L.length===3)return;c=(c+1)%L.length;marca()},INTERVALO)}
window.addEventListener("resize",lados);
try{mq.addEventListener("change",lados)}catch(x){}
fetch("/api/patrocinadores").then(function(r){return r.json()}).then(montar).catch(function(){box.style.display="none"});
})();
