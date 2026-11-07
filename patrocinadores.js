// Edite a lista abaixo. Cada item vira um slide que passa sozinho.
// img: caminho da imagem dentro da pasta img/ (deixe "" para ficar sem foto)
var PATROCINADORES=[
  {titulo:"Seu anúncio aqui",texto:"Anuncie sua marca para quem abastece na cidade.",img:"img/teste1.svg",whatsapp:"5586999999999",site:"https://exemplo.com"},
  {titulo:"Patrocinador 2",texto:"Texto do segundo anúncio.",img:"img/teste2.svg",whatsapp:"",site:"https://exemplo.com"}
];
var INTERVALO=5000;
(function(){
var box=document.getElementById("ads");
if(!box||!PATROCINADORES.length){if(box)box.style.display="none";return}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
box.innerHTML='<span class="lbl">PATROCINADO</span>'+PATROCINADORES.map(function(a,i){
var w=a.whatsapp?'<a class="w" href="https://wa.me/'+esc(a.whatsapp)+'" target="_blank" rel="noopener">WhatsApp</a>':'';
var s=a.site?'<a href="'+esc(a.site)+'" target="_blank" rel="noopener">Visitar site</a>':'';
return '<div class="slide'+(i?'':' on')+'"><div class="img"'+(a.img?' style="background-image:url('+esc(a.img)+')"':'')+'></div><div class="body"><h3>'+esc(a.titulo)+'</h3><p>'+esc(a.texto)+'</p><div class="btns">'+w+s+'</div></div></div>'}).join("")
+'<div class="dots">'+PATROCINADORES.map(function(a,i){return '<i'+(i?'':' class="on"')+'></i>'}).join("")+'</div>';
var sl=box.querySelectorAll(".slide"),dt=box.querySelectorAll(".dots i"),n=0;
if(sl.length>1)setInterval(function(){sl[n].className="slide";dt[n].className="";n=(n+1)%sl.length;sl[n].className="slide on";dt[n].className="on"},INTERVALO);
})();
