'use strict';

/* REVEAL */
(function(){
  var els=document.querySelectorAll('.rv');
  if(!els.length)return;
  var io=new IntersectionObserver(function(e){
    e.forEach(function(x){if(x.isIntersecting){x.target.classList.add('on');io.unobserve(x.target);}});
  },{threshold:.08,rootMargin:'0px 0px -24px 0px'});
  els.forEach(function(el){io.observe(el);});
})();

/* HEADER SCROLL */
(function(){
  var h=document.getElementById('hdr');
  if(!h)return;
  function u(){h.classList.toggle('scrolled',window.scrollY>50);}
  window.addEventListener('scroll',u,{passive:true});u();
})();

/* HAMBURGER */
(function(){
  var ham=document.getElementById('ham');
  var mob=document.getElementById('mob');
  var xbtn=document.getElementById('mob-x');
  var backdrop=document.getElementById('mob-backdrop');
  var ctalnk=document.getElementById('mob-cta-lnk');
  if(!ham||!mob)return;
  var open=false;
  function doOpen(){
    open=true;ham.classList.add('open');ham.setAttribute('aria-expanded','true');
    mob.classList.add('open');mob.removeAttribute('aria-hidden');
    if(backdrop)backdrop.classList.add('open');
    document.body.style.overflow='hidden';
    setTimeout(function(){var f=mob.querySelector('.ml');if(f)f.focus();},80);
  }
  function doClose(){
    open=false;ham.classList.remove('open');ham.setAttribute('aria-expanded','false');
    mob.classList.remove('open');mob.setAttribute('aria-hidden','true');
    if(backdrop)backdrop.classList.remove('open');
    document.body.style.overflow='';ham.focus();
  }
  ham.addEventListener('click',function(){open?doClose():doOpen();});
  if(xbtn)xbtn.addEventListener('click',doClose);
  if(backdrop)backdrop.addEventListener('click',doClose);
  if(ctalnk)ctalnk.addEventListener('click',doClose);
  mob.querySelectorAll('.ml').forEach(function(l){l.addEventListener('click',doClose);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&open)doClose();});
})();

/* LIGHTBOX */
(function(){
  var items=Array.from(document.querySelectorAll('.gi'));
  var lb=document.getElementById('lb');
  var lbImg=document.getElementById('lb-img');
  var lbClose=document.getElementById('lb-close');
  var lbPrev=document.getElementById('lb-prev');
  var lbNext=document.getElementById('lb-next');
  var lbCounter=document.getElementById('lb-counter');
  if(!lb||!items.length)return;

  var current=0;

  function getImg(i){
    return items[i].querySelector('img').src;
  }

  function setImg(i,animate){
    current=i;
    if(animate){
      lbImg.classList.add('fade');
      setTimeout(function(){
        lbImg.src=getImg(i);
        lbImg.onload=function(){lbImg.classList.remove('fade');};
        lbCounter.textContent=(i+1)+' / '+items.length;
      },180);
    } else {
      lbImg.src=getImg(i);
      lbCounter.textContent=(i+1)+' / '+items.length;
    }
  }

  function openLb(i){
    setImg(i,false);
    lb.classList.add('open');
    lb.removeAttribute('aria-hidden');
    document.body.style.overflow='hidden';
    lbClose.focus();
  }

  function closeLb(){
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }

  function prev(){setImg((current-1+items.length)%items.length,true);}
  function next(){setImg((current+1)%items.length,true);}

  items.forEach(function(gi,i){
    gi.addEventListener('click',function(){openLb(i);});
    gi.setAttribute('tabindex','0');
    gi.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){openLb(i);}});
  });

  lbClose.addEventListener('click',closeLb);
  lbPrev.addEventListener('click',prev);
  lbNext.addEventListener('click',next);

  lb.addEventListener('click',function(e){if(e.target===lb)closeLb();});

  document.addEventListener('keydown',function(e){
    if(!lb.classList.contains('open'))return;
    if(e.key==='Escape')closeLb();
    if(e.key==='ArrowLeft')prev();
    if(e.key==='ArrowRight')next();
  });
})();
