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

/* 7 - REVIEWS */
(function(){
  var track=document.getElementById('reviews-track');
  var controls=document.getElementById('reviews-controls');
  if(!track||!controls)return;
  var viewport=document.querySelector('.reviews-viewport');
  var prev=document.getElementById('reviews-prev');
  var next=document.getElementById('reviews-next');
  var average=document.getElementById('review-average');
  var count=document.getElementById('review-count');
  var summaryStars=document.getElementById('review-summary-stars');
  var index=0;
  var maxIndex=0;
  var reviews=[];
  var autoPlay;

  function stars(rating){
    var value=parseInt(String(rating||'').match(/\d+/)||[0],10);
    return {value:value,display:'★★★★★'.slice(0,value)};
  }
  function move(){
    var card=track.querySelector('.review-card');
    if(!card)return;
    var gap=parseFloat(getComputedStyle(track).gap)||0;
    var visible=Math.max(1,Math.floor((viewport.clientWidth+gap)/(card.offsetWidth+gap)));
    maxIndex=Math.max(0,reviews.length-visible);
    index=Math.min(index,maxIndex);
    track.style.transform='translateX(-'+(index*(card.offsetWidth+gap))+'px)';
    prev.disabled=index===0;
    next.disabled=index===maxIndex;
  }
  function render(data){
    reviews=data.filter(function(review){return review&&review.name;});
    if(!reviews.length){count.textContent='No reviews available';return;}
    var total=reviews.reduce(function(sum,review){return sum+stars(review.rating).value;},0);
    average.textContent=(total/reviews.length).toFixed(2);
    count.textContent=reviews.length+' client reviews';
    summaryStars.textContent='★★★★★';
    reviews.forEach(function(review,i){
      var rating=stars(review.rating);
      var card=document.createElement('article');
      card.className='review-card';
      card.setAttribute('aria-label','Review by '+review.name);
      var top=document.createElement('div');
      top.className='review-card-top';
      var name=document.createElement('h3');
      name.className='reviewer-name';
      name.textContent=review.name;
      var star=document.createElement('span');
      star.className='review-stars review-stars-card';
      star.setAttribute('aria-label',rating.value+' out of 5 stars');
      star.textContent=rating.display;
      top.append(name,star);
      var text=document.createElement('p');
      text.className='review-text'+(review.text?'':' review-empty');
      text.textContent=review.text||('Rated our firm '+rating.value+' out of 5.');
      var mark=document.createElement('span');
      mark.className='review-mark';
      mark.setAttribute('aria-hidden','true');
      mark.textContent='”';
      card.append(top,text,mark);
      track.appendChild(card);
    });
    controls.hidden=false;
    move();
    autoPlay=setInterval(function(){
      index=index<maxIndex?index+1:0;
      move();
    },5500);
  }
  prev.addEventListener('click',function(){if(index>0){index--;move();}});
  next.addEventListener('click',function(){if(index<maxIndex){index++;move();}else{index=0;move();}});
  viewport.addEventListener('mouseenter',function(){clearInterval(autoPlay);});
  viewport.addEventListener('mouseleave',function(){
    clearInterval(autoPlay);
    autoPlay=setInterval(function(){index=index<maxIndex?index+1:0;move();},5500);
  });
  viewport.addEventListener('focusin',function(){clearInterval(autoPlay);});
  viewport.addEventListener('focusout',function(){
    clearInterval(autoPlay);
    autoPlay=setInterval(function(){index=index<maxIndex?index+1:0;move();},5500);
  });
  window.addEventListener('resize',move);
  fetch('reviews.json').then(function(response){
    if(!response.ok)throw new Error('Review source unavailable');
    return response.json();
  }).then(render).catch(function(){count.textContent='Reviews unavailable';});
})();

/* 8 - SERVICE CARD STAGGER */
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
