// Banner de patrocinadores. Os anuncios vem do banco (editados em /admin).
var INTERVALO=5000;
(function(){
var box=document.getElementById("ads");
if(!box)return;
function esc(t){return String(t==null?"":t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function montar(L){
if(!L.length){box.style.display="none";return}
box.style.display="";
box.innerHTML='<span class="lbl">PATROCINADO</span>'+L.map(function(a,i){
var w=a.whatsapp?'<a class="w" href="https://wa.me/'+esc(a.whatsapp)+'" target="_blank" rel="noopener">WhatsApp</a>':'';
var s=a.site?'<a href="'+esc(a.site)+'" target="_blank" rel="noopener">Visitar site</a>':'';
return '<div class="slide'+(i?'':' on')+'"><div class="img"'+(a.img?' style="background-image:url(/'+esc(a.img)+')"':'')+'></div><div class="body"><h3>'+esc(a.titulo)+'</h3><p>'+esc(a.texto)+'</p><div class="btns">'+w+s+'</div></div></div>'}).join("")
+'<div class="dots">'+L.map(function(a,i){return '<i'+(i?'':' class="on"')+'></i>'}).join("")+'</div>';
var sl=box.querySelectorAll(".slide"),dt=box.querySelectorAll(".dots i"),n=0;
if(sl.length>1)setInterval(function(){sl[n].className="slide";dt[n].className="";n=(n+1)%sl.length;sl[n].className="slide on";dt[n].className="on"},INTERVALO);
}
fetch("/api/patrocinadores").then(function(r){return r.json()}).then(montar).catch(function(){box.style.display="none"});
})();
