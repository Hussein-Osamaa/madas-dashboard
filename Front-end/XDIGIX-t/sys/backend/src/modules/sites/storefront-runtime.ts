/**
 * Storefront Runtime  —  ~8 KB deferred script
 * ──────────────────────────────────────────────────────────────────────
 * This module exports the browser-side JavaScript that is embedded into
 * every published storefront HTML page.
 *
 * Responsibilities:
 *  1. Read the <script id="xd-manifest"> JSON (tenantId, apiBase, sections)
 *  2. Fetch live data for each section that declares an apiBinding
 *  3. Hydrate product / collection grids with fresh data from the public API
 *  4. Manage the cart token in sessionStorage and update the navbar badge
 *  5. Override form submit handlers to POST to the public API
 *  6. Auto-wire analytics (GA4, Meta Pixel, TikTok) via IntersectionObserver
 *  7. Handle all legacy UI interactions (mobile nav, video, gallery, countdown)
 *
 * Security: all DOM construction uses createElement / setAttribute / textContent.
 */

export const STOREFRONT_RUNTIME_JS = /* javascript */ `(function(){
"use strict";

/* ── 0. Manifest ────────────────────────────────────────────────────── */
var _mEl=document.getElementById('xd-manifest');
var _m={};
try{_m=JSON.parse(_mEl?(_mEl.textContent||_mEl.innerText||''):'{}');}catch(e){}
var tenantId = _m.tenantId||'';
var apiBase  = _m.apiBase||'/api/public';
var currency = _m.currency||'SAR';
var sfBase   = _m.storefrontBase||'';
var sections = Array.isArray(_m.sections)?_m.sections:[];
window.__xd_sf_base=sfBase;

/* ── 1. Cart token (sessionStorage) ────────────────────────────────── */
var cartKey='xd-cart-'+tenantId;
function getToken(){return tenantId?sessionStorage.getItem(cartKey)||'':'';}
function saveToken(t){if(t&&tenantId)sessionStorage.setItem(cartKey,t);}

/* ── 2. DOM helper — safe element builder ───────────────────────────── */
function mk(tag,cls,text){
  var e=document.createElement(tag);
  if(cls)e.className=cls;
  if(text!=null)e.textContent=text;
  return e;
}
function setAttrs(el,attrs){
  Object.keys(attrs).forEach(function(k){el.setAttribute(k,attrs[k]);});
  return el;
}

/* ── 3. Analytics ───────────────────────────────────────────────────── */
function track(event,params){
  params=params||{};
  try{
    if(typeof gtag!=='undefined')gtag('event',event,params);
    if(typeof fbq!=='undefined'){
      var fbMap={
        product_view:  ['ViewContent',{content_ids:[params.item_id||''],content_type:'product'}],
        add_to_cart:   ['AddToCart',  {content_ids:[params.item_id||''],value:params.value||0,currency:currency}],
        cta_click:     ['Lead',       {}],
        section_view:  ['ViewContent',{}],
        newsletter_subscribe:['Lead', {}]
      };
      var fm=fbMap[event];
      if(fm)fbq('track',fm[0],fm[1]);
    }
    if(typeof ttq!=='undefined'){
      var ttMap={product_view:'ViewContent',add_to_cart:'AddToCart',cta_click:'ClickButton'};
      if(ttMap[event])ttq.track(ttMap[event],{content_id:params.item_id||''});
    }
    if(typeof snaptr!=='undefined'&&event==='add_to_cart'){
      snaptr('track','ADD_CART',{item_ids:[params.item_id||''],price:params.value||0,currency:currency});
    }
  }catch(e){}
}
window.xdTrack=track;

/* ── 4. Fetch helper (with AbortController timeout) ─────────────────── */
function fetchJSON(url,opts,ms){
  ms=ms||8000;
  var ctrl=typeof AbortController!=='undefined'?new AbortController():null;
  var tid=ctrl?setTimeout(function(){ctrl.abort();},ms):null;
  var fo=Object.assign({},opts||{});
  if(ctrl)fo.signal=ctrl.signal;
  return fetch(url,fo).then(function(r){
    if(tid)clearTimeout(tid);
    if(!r.ok)return r.json().catch(function(){return {};}).then(function(body){
      var err=new Error(body.error||('HTTP '+r.status));err.code=body.code||'';throw err;
    });
    return r.json();
  }).catch(function(e){if(tid)clearTimeout(tid);if(e&&e.code)throw e;return null;});
}

/* ── 5. Public API helpers ──────────────────────────────────────────── */
function publicUrl(path){
  return apiBase.replace(/\\/$/,'')+'/'+tenantId+path;
}
function cartFetch(method,path,body){
  var token=getToken();
  var opts={method:method,headers:{'Content-Type':'application/json','x-cart-token':token}};
  if(body)opts.body=JSON.stringify(body);
  return fetchJSON(publicUrl(path),opts).then(function(data){
    if(!data)return null;
    if(data.cartToken)saveToken(data.cartToken);
    updateCartBadge(data);
    return data;
  });
}

/* ── 6. Navbar cart badge ───────────────────────────────────────────── */
function updateCartBadge(cart){
  if(!cart)return;
  var count=typeof cart.itemCount==='number'?cart.itemCount:(cart.items?cart.items.length:0);
  document.querySelectorAll('.xd-nav-badge').forEach(function(badge){
    badge.textContent=String(count);
    badge.style.display=count>0?'':'none';
  });
}

/* ── 7. Product card builder (safe DOM methods) ─────────────────────── */
function makeProductCard(p,ctaLabel,eventName){
  var detailHref=(window.__xd_sf_base||'')+'/products/'+(p.id||p._id||'');
  var card=mk('a','xd-product-card xd-reveal xd-visible');
  card.href=detailHref;
  setAttrs(card,{'data-item-id':p.id||p._id||''});
  if(eventName)card.setAttribute('data-xd-analytics-view',eventName);

  var imgWrap=mk('div','xd-product-img-wrap');
  var img=mk('img','xd-product-img-primary');
  var src=p.image||(p.images&&p.images[0])||'';
  img.src=src||'https://placehold.co/400/f5f5f5/999?text=Product';
  img.alt=p.name||'';
  img.setAttribute('loading','lazy');
  img.setAttribute('decoding','async');
  img.setAttribute('width','400');
  img.setAttribute('height','400');
  imgWrap.appendChild(img);
  // Secondary image on hover
  if(p.images&&p.images.length>1){
    var img2=mk('img','xd-product-img-secondary');
    img2.src=p.images[1];img2.alt=p.name||'';
    img2.setAttribute('loading','lazy');img2.setAttribute('decoding','async');
    img2.setAttribute('width','400');img2.setAttribute('height','400');
    imgWrap.appendChild(img2);
  }

  var onSale=p.onSale||(p.salePrice&&Number(p.salePrice)<Number(p.price));
  var outOfStock=p.inStock===false||(typeof p.totalStock==='number'&&p.totalStock<=0);
  if(onSale&&!outOfStock){imgWrap.appendChild(mk('span','xd-product-badge','Sale'));}
  if(outOfStock){imgWrap.appendChild(mk('span','xd-product-badge xd-badge-sold-out','Sold Out'));}
  card.appendChild(imgWrap);

  var body=mk('div','xd-product-body');
  body.appendChild(mk('p','xd-product-name',p.name||''));

  var displayPrice=p.sellingPrice||p.salePrice||p.price;
  if(displayPrice){
    var priceRow=mk('div');
    priceRow.appendChild(mk('span','xd-product-price',String(displayPrice)+' '+currency));
    if(onSale&&p.price){priceRow.appendChild(mk('span','xd-product-compare',String(p.price)+' '+currency));}
    body.appendChild(priceRow);
  }

  if(outOfStock){
    var soldBtn=mk('span','xd-btn xd-btn-sm xd-product-btn xd-btn-full xd-btn-disabled','Sold Out');
    soldBtn.style.opacity='0.5';soldBtn.style.pointerEvents='none';soldBtn.style.cursor='not-allowed';
    body.appendChild(soldBtn);
  }else{
    var btn=mk('button','xd-product-btn',ctaLabel||'Add to Cart');
    btn.type='button';
    setAttrs(btn,{'data-xd-atc':'','data-xd-product-id':String(p.id||p._id||''),
      'data-xd-product-name':String(p.name||''),'data-xd-price':String(p.price||0)});
    body.appendChild(btn);
  }
  card.appendChild(body);
  return card;
}

/* ── 8. Collection card builder ─────────────────────────────────────── */
function makeCollectionCard(col,eventName){
  var card=mk('div','xd-collection-card xd-reveal xd-visible');
  setAttrs(card,{'data-item-id':col.id||col._id||col.slug||''});
  if(eventName)card.setAttribute('data-xd-analytics-view',eventName);
  var link=mk('a');
  link.href=col.url||'/collections/'+(col.slug||'');
  var imgWrap=mk('div','xd-collection-img-wrap');
  var img=mk('img');
  img.src=col.image||(col.images&&col.images[0])||'https://placehold.co/400/f5f5f5/999?text=Collection';
  img.alt=col.name||col.title||'';
  img.setAttribute('loading','lazy');
  img.setAttribute('decoding','async');
  img.setAttribute('width','400');
  img.setAttribute('height','400');
  imgWrap.appendChild(img);
  var overlay=mk('div','xd-collection-overlay');
  overlay.appendChild(mk('span','xd-collection-name',col.name||col.title||''));
  if(col.productsCount!=null){overlay.appendChild(mk('span','xd-collection-count',String(col.productsCount)+' products'));}
  imgWrap.appendChild(overlay);
  link.appendChild(imgWrap);
  card.appendChild(link);
  return card;
}

/* ── 9. Hydrate a section grid with live data ───────────────────────── */
function hydrateGrid(sectionEl,items,builder){
  var grid=sectionEl.querySelector('[data-xd-grid]');
  if(!grid||!items||!items.length)return;
  while(grid.firstChild)grid.removeChild(grid.firstChild);
  items.forEach(function(item){grid.appendChild(builder(item));});
  if(revealObserver){grid.querySelectorAll('.xd-reveal').forEach(function(el){revealObserver.observe(el);});}
}

/* ── 10. Session cache helpers ──────────────────────────────────────── */
function cacheGet(key,ttlMs){
  try{
    var raw=sessionStorage.getItem(key);
    if(!raw)return null;
    var obj=JSON.parse(raw);
    if(obj.ts&&Date.now()-obj.ts<ttlMs)return obj.data;
    sessionStorage.removeItem(key);
  }catch(e){}
  return null;
}
function cacheSet(key,data){
  try{sessionStorage.setItem(key,JSON.stringify({ts:Date.now(),data:data}));}catch(e){}
}

/* ── 11. Hydrate one manifest section entry ─────────────────────────── */
function hydrateSection(entry){
  if(!entry.apiBinding||!tenantId)return;
  var binding=entry.apiBinding;
  var type=entry.type;
  var endpoint=(binding.endpoint||'').replace(/\{tenantId\}/g,tenantId);
  /* If endpoint is still a relative /api/... path, make absolute using apiBase origin */
  var url=endpoint;
  if(!url)return;
  /* If section declares specific product IDs, fetch only those */
  if(entry.selectedProductIds&&entry.selectedProductIds.length>0){
    url+=(url.indexOf('?')>=0?'&':'?')+'ids='+entry.selectedProductIds.join(',');
  }

  var cacheKey='xd-cache-'+entry.id;
  var ttl=binding.cacheTtlMs||0;
  var cached=ttl?cacheGet(cacheKey,ttl):null;
  var ae=entry.analyticsEvents||{};

  function applyData(data){
    if(!data)return;
    var sEl=document.querySelector('[data-xd-section-id="'+entry.id+'"]');
    if(!sEl)return;
    if(type==='products'||type==='deals'){
      var prods=Array.isArray(data)?data:(data.products||data.items||[]);
      var lbl=type==='deals'?'Shop Now':'Add to Cart';
      hydrateGrid(sEl,prods,function(p){return makeProductCard(p,lbl,ae.onItemView||'');});
    } else if(type==='collections'){
      var cols=Array.isArray(data)?data:(data.collections||data.items||[]);
      hydrateGrid(sEl,cols,function(c){return makeCollectionCard(c,ae.onItemView||'');});
    } else if(type==='navbar'){
      updateCartBadge(data);
    }
  }

  if(cached){applyData(cached);return;}
  fetchJSON(url,{method:binding.method||'GET',headers:{'Content-Type':'application/json'}}).then(function(data){
    if(!data)return;
    if(ttl)cacheSet(cacheKey,data);
    applyData(data);
  });
}

/* ── 12. Analytics IntersectionObserver ─────────────────────────────── */
var analyticsObserver=null;
if(typeof IntersectionObserver!=='undefined'){
  analyticsObserver=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(!entry.isIntersecting)return;
      var el=entry.target;
      var evt=el.getAttribute('data-xd-analytics-view');
      var itemId=el.getAttribute('data-item-id');
      if(evt)track(evt,itemId?{item_id:itemId}:{});
      analyticsObserver.unobserve(el);
    });
  },{threshold:0.25});
}

function wireAnalyticsOnSection(sEl,entry){
  var ae=entry.analyticsEvents||{};
  if(ae.onSectionView&&analyticsObserver){
    sEl.setAttribute('data-xd-analytics-view',ae.onSectionView);
    analyticsObserver.observe(sEl);
  }
  if(ae.onItemView&&analyticsObserver){
    sEl.querySelectorAll('[data-item-id]').forEach(function(el){
      el.setAttribute('data-xd-analytics-view',ae.onItemView);
      analyticsObserver.observe(el);
    });
  }
  if(ae.onCtaClick){
    sEl.querySelectorAll('[data-cta]').forEach(function(btn){
      btn.addEventListener('click',function(){track(ae.onCtaClick,{section_id:entry.id});});
    });
  }
}

/* ── 13. Form submissions to public API ─────────────────────────────── */
function wireFormSubmit(sEl,entry){
  var binding=entry.apiBinding;
  if(!binding||binding.method!=='POST'||!tenantId)return;
  var form=sEl.querySelector('form');
  if(!form)return;
  /* Clone to remove static handlers, then attach live handler */
  var newForm=form.cloneNode(true);
  form.parentNode.replaceChild(newForm,form);
  newForm.addEventListener('submit',function(e){
    e.preventDefault();
    var payload={};
    new FormData(newForm).forEach(function(v,k){payload[k]=v;});
    var endpoint=(binding.endpoint||'').replace(/\{tenantId\}/g,tenantId);
    fetchJSON(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(res){
      if(res===null)return;
      newForm.style.display='none';
      var success=newForm.nextElementSibling;
      if(success&&success.classList.contains('xd-form-success'))success.classList.add('xd-show');
      var ae=entry.analyticsEvents||{};
      if(ae.onFormSubmit)track(ae.onFormSubmit,{section_id:entry.id});
    });
  });
}

/* ── 14. Add-to-cart click delegate ─────────────────────────────────── */
document.addEventListener('click',function(e){
  var btn=e.target.closest('[data-xd-atc]');
  if(!btn)return;
  e.preventDefault();
  var pid=btn.getAttribute('data-xd-product-id')||'';
  var pname=btn.getAttribute('data-xd-product-name')||'';
  var price=parseFloat(btn.getAttribute('data-xd-price')||'0');
  track('add_to_cart',{item_id:pid,item_name:pname,value:price,currency:currency});
  if(tenantId){
    btn.style.opacity='0.6';btn.style.pointerEvents='none';
    cartFetch('POST','/cart/add',{productId:pid,quantity:1,name:pname,price:price}).then(function(){
      btn.style.opacity='';btn.style.pointerEvents='';
    }).catch(function(err){
      btn.style.opacity='';btn.style.pointerEvents='';
      if(err&&err.message&&err.message.indexOf('Out of stock')!==-1){
        btn.textContent='Sold Out';btn.style.opacity='0.5';btn.style.pointerEvents='none';btn.style.cursor='not-allowed';
        btn.classList.remove('xd-btn-primary');btn.classList.add('xd-btn-disabled');
      }
    });
  }
});

/* ── 15. Announce bar dismiss ───────────────────────────────────────── */
document.querySelectorAll('.xd-announce-close').forEach(function(btn){
  btn.addEventListener('click',function(){
    var bar=btn.closest('.xd-announce');
    if(bar)bar.style.display='none';
  });
});

/* ── 16. Mobile nav ─────────────────────────────────────────────────── */
var mToggle=document.querySelector('.xd-mobile-toggle');
var mMenu=document.getElementById('xd-mobile-menu');
var mClose=document.querySelector('.xd-mobile-menu-close');
function openMenu(){if(mMenu){mMenu.style.display='flex';document.body.style.overflow='hidden';}}
function closeMenu(){if(mMenu){mMenu.style.display='none';document.body.style.overflow='';}}
if(mToggle)mToggle.addEventListener('click',openMenu);
if(mClose)mClose.addEventListener('click',closeMenu);
if(mMenu)mMenu.addEventListener('click',function(e){if(e.target===mMenu)closeMenu();});

/* ── 17. Video thumbnail to iframe ──────────────────────────────────── */
document.querySelectorAll('.xd-video-thumb').forEach(function(thumb){
  thumb.addEventListener('click',function(){
    var wrap=thumb.closest('.xd-video-wrap');
    if(!wrap)return;
    var src=thumb.getAttribute('data-src');
    if(!src)return;
    while(wrap.firstChild)wrap.removeChild(wrap.firstChild);
    var iframe=document.createElement('iframe');
    setAttrs(iframe,{src:src+'&autoplay=1',allow:'autoplay;fullscreen',allowfullscreen:'',loading:'lazy',title:'Video'});
    wrap.appendChild(iframe);
  });
});

/* ── 18. Gallery lightbox ───────────────────────────────────────────── */
var lb=document.getElementById('xd-lightbox');
var lbImg=lb?lb.querySelector('img'):null;
if(lb&&lbImg){
  document.querySelectorAll('.xd-gallery-item').forEach(function(item){
    item.addEventListener('click',function(){
      var img=item.querySelector('img');
      if(img){lbImg.src=img.src;lbImg.alt=img.alt||'';}
      lb.classList.add('xd-open');
    });
  });
  lb.addEventListener('click',function(e){
    if(e.target===lb||e.target.classList.contains('xd-lightbox-close'))lb.classList.remove('xd-open');
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape')lb.classList.remove('xd-open');});
}

/* ── 19. Countdown timers ───────────────────────────────────────────── */
document.querySelectorAll('[data-xd-countdown]').forEach(function(el){
  var target=new Date(el.getAttribute('data-xd-countdown')).getTime();
  var expired=el.getAttribute('data-xd-expired')||'';
  function tick(){
    var diff=target-Date.now();
    function set(id,v){var x=document.getElementById(id);if(x)x.textContent=String(v).padStart(2,'0');}
    if(diff<0){
      var wrap=el.closest('.xd-countdown-wrap');
      if(wrap){var msg=mk('p',null,expired);wrap.appendChild(msg);}
      clearInterval(timer);return;
    }
    set(el.id+'-d',Math.floor(diff/86400000));
    set(el.id+'-h',Math.floor(diff%86400000/3600000));
    set(el.id+'-m',Math.floor(diff%3600000/60000));
    set(el.id+'-s',Math.floor(diff%60000/1000));
  }
  tick();var timer=setInterval(tick,1000);
});

/* ── 20. Image comparison slider ───────────────────────────────────── */
document.querySelectorAll('.xd-comparison').forEach(function(el){
  var clip=el.querySelector('.xd-comparison-clip');
  var handle=el.querySelector('.xd-comparison-handle');
  if(!clip||!handle)return;
  var dragging=false;
  function setPos(x){
    var rect=el.getBoundingClientRect();
    var pct=Math.min(100,Math.max(0,(x-rect.left)/rect.width*100));
    clip.style.width=pct+'%';
    handle.style.left=pct+'%';
  }
  el.addEventListener('mousedown',function(e){dragging=true;setPos(e.clientX);});
  window.addEventListener('mousemove',function(e){if(dragging)setPos(e.clientX);});
  window.addEventListener('mouseup',function(){dragging=false;});
  el.addEventListener('touchstart',function(e){dragging=true;setPos(e.touches[0].clientX);},{passive:true});
  window.addEventListener('touchmove',function(e){if(dragging)setPos(e.touches[0].clientX);},{passive:true});
  window.addEventListener('touchend',function(){dragging=false;});
});

/* ── 21. Scroll-reveal (reused for newly hydrated cards) ────────────── */
var revealObserver=null;
if(typeof IntersectionObserver!=='undefined'){
  revealObserver=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){entry.target.classList.add('xd-visible');revealObserver.unobserve(entry.target);}
    });
  },{threshold:0.08});
  document.querySelectorAll('.xd-reveal').forEach(function(el){revealObserver.observe(el);});
}

/* ── 21b. Product Carousel ────────────────────────────────────────── */
document.querySelectorAll('[data-xd-carousel]').forEach(function(carousel){
  var cols=parseInt(carousel.getAttribute('data-xd-cols')||'4',10);
  carousel.style.setProperty('--xd-cols',''+cols);
  var wrap=carousel.parentElement;
  var prevBtn=wrap?wrap.parentElement&&wrap.parentElement.querySelector('[data-xd-carousel-prev]'):null;
  if(!prevBtn){var head=wrap&&wrap.previousElementSibling;if(head){prevBtn=head.querySelector('[data-xd-carousel-prev]');}}
  var nextBtn=wrap?wrap.parentElement&&wrap.parentElement.querySelector('[data-xd-carousel-next]'):null;
  if(!nextBtn){var head2=wrap&&wrap.previousElementSibling;if(head2){nextBtn=head2.querySelector('[data-xd-carousel-next]');}}
  function updateArrows(){
    if(prevBtn)prevBtn.disabled=carousel.scrollLeft<5;
    if(nextBtn)nextBtn.disabled=carousel.scrollLeft+carousel.clientWidth>=carousel.scrollWidth-5;
  }
  carousel.addEventListener('scroll',updateArrows,{passive:true});
  updateArrows();
  var cardEl=carousel.querySelector('.xd-product-card');
  var cardW=cardEl?cardEl.offsetWidth+24:280;
  if(prevBtn)prevBtn.addEventListener('click',function(){carousel.scrollBy({left:-cardW,behavior:'smooth'});});
  if(nextBtn)nextBtn.addEventListener('click',function(){carousel.scrollBy({left:cardW,behavior:'smooth'});});
});

/* ── 22. Slideshow ─────────────────────────────────────────────────── */
document.querySelectorAll('.xd-slideshow').forEach(function(ss){
  var slides=ss.querySelectorAll('.xd-slide');
  var count=slides.length;
  if(count<2)return;
  var current=0;
  var isTransition=(ss.getAttribute('data-transition')||'slide');
  var autoplay=ss.getAttribute('data-autoplay')==='true';
  var speed=(parseInt(ss.getAttribute('data-speed')||'5',10)||5)*1000;
  var slidesWrap=ss.querySelector('.xd-slides');
  var dots=ss.querySelectorAll('.xd-slide-dot');
  var counter=ss.querySelector('.xd-slide-current');
  var timer=null;

  function goTo(idx){
    if(idx<0)idx=count-1;
    if(idx>=count)idx=0;
    current=idx;
    if(isTransition==='slide'&&slidesWrap){
      slidesWrap.style.transform='translateX(-'+(current*100)+'%)';
    }else{
      slides.forEach(function(s,i){s.style.opacity=i===current?'1':'0';s.style.zIndex=i===current?'10':'0';});
    }
    dots.forEach(function(d,i){d.style.background=i===current?'#fff':'rgba(255,255,255,.4)';d.style.transform=i===current?'scale(1.1)':'scale(1)';d.classList.toggle('active',i===current);});
    if(counter)counter.textContent=''+(current+1);
    resetTimer();
  }

  function resetTimer(){
    if(timer)clearInterval(timer);
    if(autoplay)timer=setInterval(function(){goTo(current+1);},speed);
  }

  var prevBtn=ss.querySelector('.xd-slide-prev');
  var nextBtn=ss.querySelector('.xd-slide-next');
  if(prevBtn)prevBtn.addEventListener('click',function(){goTo(current-1);});
  if(nextBtn)nextBtn.addEventListener('click',function(){goTo(current+1);});
  dots.forEach(function(d){d.addEventListener('click',function(){goTo(parseInt(d.getAttribute('data-slide')||'0',10));});});

  resetTimer();
});

/* ── 23. Init ───────────────────────────────────────────────────────── */
function init(){
  sections.forEach(hydrateSection);
  sections.forEach(function(entry){
    var sEl=document.querySelector('[data-xd-section-id="'+entry.id+'"]');
    if(!sEl)return;
    wireAnalyticsOnSection(sEl,entry);
    if(entry.apiBinding)wireFormSubmit(sEl,entry);
  });
  if(tenantId&&getToken()){cartFetch('GET','/cart',null);}
}

/* Deferred scripts execute after HTML parsing — DOM is complete */
init();

})();`;
