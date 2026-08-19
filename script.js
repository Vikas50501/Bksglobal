'use strict';

/* 1 - REVEAL */
(function(){
  var els=document.querySelectorAll('.rv');
  if(!els.length)return;
  var io=new IntersectionObserver(function(e){
    e.forEach(function(x){if(x.isIntersecting){x.target.classList.add('on');io.unobserve(x.target);}});
  },{threshold:.1,rootMargin:'0px 0px -32px 0px'});
  els.forEach(function(el){io.observe(el);});
})();

/* 2 - HEADER SCROLL */
(function(){
  var h=document.getElementById('hdr');
  function u(){h.classList.toggle('scrolled',window.scrollY>50);}
  window.addEventListener('scroll',u,{passive:true});u();
})();

/* 3 - ACTIVE NAV */
(function(){
  var links=document.querySelectorAll('.nl');
  var map={};
  links.forEach(function(l){
    var id=(l.getAttribute('href')||'').replace('#','');
    var s=document.getElementById(id);
    if(s)map[id]=l;
  });
  var io=new IntersectionObserver(function(e){
    e.forEach(function(x){
      var l=map[x.target.id];
      if(l)l.classList.toggle('active',x.isIntersecting);
    });
  },{rootMargin:'-35% 0px -35% 0px'});
  Object.keys(map).forEach(function(id){
    var s=document.getElementById(id);
    if(s)io.observe(s);
  });
})();

/* 4 - HAMBURGER */
(function(){
  var ham=document.getElementById('ham');
  var mob=document.getElementById('mob');
  var xbtn=document.getElementById('mob-x');
  var backdrop=document.getElementById('mob-backdrop');
  var ctalnk=document.getElementById('mob-cta-lnk');
  if(!ham||!mob)return;
  var open=false;

  function doOpen(){
    open=true;
    ham.classList.add('open');
    ham.setAttribute('aria-expanded','true');
    mob.classList.add('open');
    mob.removeAttribute('aria-hidden');
    if(backdrop)backdrop.classList.add('open');
    document.body.style.overflow='hidden';
    setTimeout(function(){var f=mob.querySelector('.ml');if(f)f.focus();},80);
  }
  function doClose(){
    open=false;
    ham.classList.remove('open');
    ham.setAttribute('aria-expanded','false');
    mob.classList.remove('open');
    mob.setAttribute('aria-hidden','true');
    if(backdrop)backdrop.classList.remove('open');
    document.body.style.overflow='';
    ham.focus();
  }

  ham.addEventListener('click',function(){open?doClose():doOpen();});
  if(xbtn)xbtn.addEventListener('click',doClose);
  if(backdrop)backdrop.addEventListener('click',doClose);
  if(ctalnk)ctalnk.addEventListener('click',doClose);
  mob.querySelectorAll('.ml').forEach(function(l){l.addEventListener('click',doClose);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&open)doClose();});
})();

/* 5 - SMOOTH SCROLL */
(function(){
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var t=document.querySelector(this.getAttribute('href'));
      if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});}
    });
  });
})();

/* 6 - TICKER PAUSE */
(function(){
  var t=document.querySelector('.ticker');
  var tr=document.querySelector('.ticker-t');
  if(!t||!tr)return;
  t.addEventListener('mouseenter',function(){tr.style.animationPlayState='paused';});
  t.addEventListener('mouseleave',function(){tr.style.animationPlayState='running';});
})();

/* 7 - SERVICE CARD STAGGER */
(function(){
  var cards=document.querySelectorAll('.sc');
  if(!cards.length)return;
  var io=new IntersectionObserver(function(e){
    e.forEach(function(x){
      if(x.isIntersecting){
        var i=Array.from(cards).indexOf(x.target);
        setTimeout(function(){x.target.style.opacity='1';x.target.style.transform='none';},i*40);
        io.unobserve(x.target);
      }
    });
  },{threshold:.07});
  cards.forEach(function(c){
    c.style.opacity='0';c.style.transform='translateY(14px)';
    c.style.transition='opacity 480ms cubic-bezier(.22,1,.36,1),transform 480ms cubic-bezier(.22,1,.36,1),background 240ms';
    io.observe(c);
  });
})();

/* 8 - TEAM STAGGER */
(function(){
  var cards=document.querySelectorAll('.tc');
  if(!cards.length)return;
  var io=new IntersectionObserver(function(e){
    e.forEach(function(x){
      if(x.isIntersecting){
        var i=Array.from(cards).indexOf(x.target);
        setTimeout(function(){x.target.style.opacity='1';x.target.style.transform='none';},i*90);
        io.unobserve(x.target);
      }
    });
  },{threshold:.1});
  cards.forEach(function(c){
    c.style.opacity='0';c.style.transform='translateY(18px)';
    c.style.transition='opacity 540ms cubic-bezier(.22,1,.36,1),transform 540ms cubic-bezier(.22,1,.36,1),border-color 240ms,background 240ms';
    io.observe(c);
  });
})();

/* 9 - SECTOR LIST STAGGER */
(function(){
  var items=document.querySelectorAll('.sec-list li');
  if(!items.length)return;
  var io=new IntersectionObserver(function(e){
    e.forEach(function(x){
      if(x.isIntersecting){
        var i=Array.from(items).indexOf(x.target);
        setTimeout(function(){x.target.style.opacity='1';},i*30);
        io.unobserve(x.target);
      }
    });
  },{threshold:.05});
  items.forEach(function(it){
    it.style.opacity='0';
    it.style.transition='opacity 360ms ease,background 150ms,color 150ms';
    io.observe(it);
  });
})();

/* 10 - CONTACT FORM */
(function(){
  var form=document.getElementById('cform');
  var sub=document.getElementById('fsub');
  var lbl=document.getElementById('fsub-lbl');
  var ok=document.getElementById('form-ok');
  if(!form)return;

  function ok_email(v){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());}
  function show(id,msg){
    var e=document.getElementById(id);
    var i=document.getElementById(id.replace('-e',''));
    if(e)e.textContent=msg;if(i)i.classList.add('err');
  }
  function clr(id){
    var e=document.getElementById(id);
    var i=document.getElementById(id.replace('-e',''));
    if(e)e.textContent='';if(i)i.classList.remove('err');
  }
  function validate(){
    var good=true;
    var n=document.getElementById('fname');
    if(!n||!n.value.trim()){show('fname-e','Name is required.');good=false;}else clr('fname-e');
    var em=document.getElementById('femail');
    if(!em||!em.value.trim()){show('femail-e','Email is required.');good=false;}
    else if(!ok_email(em.value)){show('femail-e','Enter a valid email address.');good=false;}
    else clr('femail-e');
    return good;
  }

  ['fname','femail'].forEach(function(id){
    var el=document.getElementById(id);
    if(el){
      el.addEventListener('blur',validate);
      el.addEventListener('input',function(){if(el.classList.contains('err'))validate();});
    }
  });

  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(!validate())return;
    sub.disabled=true;
    if(lbl)lbl.textContent='Sending…';
    setTimeout(function(){
      sub.hidden=true;
      if(ok){ok.hidden=false;ok.focus();}
      form.reset();
    },900);
  });
})();
