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
var sections = Array.isArray(_m.sections)?_m.sections:[];

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
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.json();
  }).catch(function(){if(tid)clearTimeout(tid);return null;});
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
  var card=mk('div','xd-product-card xd-reveal xd-visible');
  setAttrs(card,{'data-item-id':p.id||p._id||''});
  if(eventName)card.setAttribute('data-xd-analytics-view',eventName);

  var imgWrap=mk('div','xd-product-img-wrap');
  var img=mk('img');
  var src=p.image||(p.images&&p.images[0])||'';
  img.src=src||'https://placehold.co/400/f5f5f5/999?text=Product';
  img.alt=p.name||'';
  img.setAttribute('loading','lazy');
  img.setAttribute('decoding','async');
  img.setAttribute('width','400');
  img.setAttribute('height','400');
  imgWrap.appendChild(img);

  var onSale=p.onSale||(p.salePrice&&Number(p.salePrice)<Number(p.price));
  if(onSale){imgWrap.appendChild(mk('span','xd-product-badge','Sale'));}
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

  var btn=mk('a','xd-btn xd-btn-primary xd-btn-sm xd-product-btn xd-btn-full',ctaLabel||'Add to Cart');
  btn.href=p.link||p.url||'#';
  setAttrs(btn,{'data-xd-atc':'','data-xd-product-id':String(p.id||p._id||''),
    'data-xd-product-name':String(p.name||''),'data-xd-price':String(p.price||0)});
  body.appendChild(btn);
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
  var pid=btn.getAttribute('data-xd-product-id')||'';
  var pname=btn.getAttribute('data-xd-product-name')||'';
  var price=parseFloat(btn.getAttribute('data-xd-price')||'0');
  track('add_to_cart',{item_id:pid,item_name:pname,value:price,currency:currency});
  if(tenantId){cartFetch('POST','/cart/add',{productId:pid,quantity:1,name:pname,price:price});}
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

/* ── 22. Init ───────────────────────────────────────────────────────── */
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
