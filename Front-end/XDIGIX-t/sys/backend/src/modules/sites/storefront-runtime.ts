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
  // Also update the drawer if open
  renderCartDrawerItems(cart);
}

/* ── 6b. Cart Drawer ──────────────────────────────────────────────── */
var _lastCart=null;
var _cartDrawerEl=document.getElementById('xd-cart-drawer');

function openCartDrawer(){
  if(!_cartDrawerEl)return;
  _cartDrawerEl.classList.add('xd-open');
  document.body.style.overflow='hidden';
  // Refresh cart data
  if(tenantId&&getToken()){
    cartFetch('GET','/cart',null).then(function(cart){
      if(cart){_lastCart=cart;renderCartDrawerItems(cart);}
    });
  }
}
function closeCartDrawer(){
  if(!_cartDrawerEl)return;
  _cartDrawerEl.classList.remove('xd-open');
  document.body.style.overflow='';
}

function renderCartDrawerItems(cart){
  var container=document.getElementById('xd-cart-drawer-items');
  var footer=document.getElementById('xd-cart-drawer-footer');
  if(!container)return;
  _lastCart=cart;
  while(container.firstChild)container.removeChild(container.firstChild);

  if(!cart||!cart.items||cart.items.length===0){
    var empty=mk('div','');
    empty.style.cssText='text-align:center;padding:3rem 1rem;opacity:.5';
    var icon=mk('span','material-icons','shopping_bag');
    icon.style.cssText='font-size:2.5rem;display:block;margin-bottom:.5rem';
    empty.appendChild(icon);
    empty.appendChild(mk('p','','Your cart is empty'));
    container.appendChild(empty);
    if(footer)footer.style.display='none';
    return;
  }

  var cur=cart.currency||currency;
  cart.items.forEach(function(item){
    var row=mk('div','');
    row.style.cssText='display:flex;gap:.75rem;padding:.75rem 0;border-bottom:1px solid color-mix(in srgb,currentColor 8%,transparent);align-items:center';
    // Image
    var img=mk('img','');
    img.src=item.imageUrl||item.image||'https://placehold.co/64/f5f5f5/999?text=Item';
    img.alt=item.name||'';
    img.style.cssText='width:56px;height:56px;object-fit:cover;border-radius:6px;flex-shrink:0';
    row.appendChild(img);
    // Info
    var info=mk('div','');
    info.style.cssText='flex:1;min-width:0';
    var nm=mk('p','',item.name||'Product');
    nm.style.cssText='font-size:.85rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    info.appendChild(nm);
    var priceQty=mk('p','',Number(item.price).toFixed(2)+' '+cur+' × '+item.quantity);
    priceQty.style.cssText='font-size:.75rem;opacity:.6';
    info.appendChild(priceQty);
    row.appendChild(info);
    // Remove
    var removeBtn=mk('button','','\u2715');
    removeBtn.type='button';
    removeBtn.style.cssText='background:none;border:none;cursor:pointer;opacity:.4;font-size:.9rem;padding:.25rem;color:inherit;font-family:inherit';
    removeBtn.onmouseover=function(){this.style.opacity='1';};
    removeBtn.onmouseout=function(){this.style.opacity='.4';};
    (function(pid,vid){
      removeBtn.addEventListener('click',function(e){
        e.stopPropagation();
        cartFetch('PATCH','/cart/item',{cartToken:getToken(),productId:pid,variantId:vid,quantity:0});
      });
    })(item.productId,item.variantId);
    row.appendChild(removeBtn);
    container.appendChild(row);
  });

  // Footer
  if(footer){
    footer.style.display='';
    var totalEl=footer.querySelector('.xd-cart-drawer-total');
    if(totalEl){
      while(totalEl.firstChild)totalEl.removeChild(totalEl.firstChild);
      totalEl.appendChild(mk('span','','Subtotal'));
      var totalVal=mk('span','',Number(cart.subtotal||0).toFixed(2)+' '+cur);
      totalVal.style.fontWeight='800';
      totalEl.appendChild(totalVal);
    }
  }
}

// Cart drawer toggle, close, backdrop
if(_cartDrawerEl){
  _cartDrawerEl.querySelector('.xd-cart-drawer-backdrop').addEventListener('click',closeCartDrawer);
  _cartDrawerEl.querySelector('.xd-cart-drawer-close').addEventListener('click',closeCartDrawer);
}
// Cart icon click — open drawer or navigate to /cart
document.querySelectorAll('[data-xd-cart-toggle]').forEach(function(btn){
  btn.addEventListener('click',function(e){
    e.preventDefault();
    if(_cartDrawerEl){
      openCartDrawer();
    }else{
      // Fallback: navigate to cart page
      window.location.href=btn.getAttribute('data-cart-url')||sfBase+'/cart';
    }
  });
});
// Close drawer on Escape
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&_cartDrawerEl&&_cartDrawerEl.classList.contains('xd-open')){
    closeCartDrawer();
  }
});

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
    cartFetch('POST','/cart/add',{productId:pid,quantity:1,name:pname,price:price}).then(function(cart){
      btn.style.opacity='';btn.style.pointerEvents='';
      // Open cart drawer after adding item
      if(_cartDrawerEl&&cart){openCartDrawer();}
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

/* ── 23. Cart page hydration ────────────────────────────────────────── */
function renderCartPage(cart){
  var container=document.getElementById('xd-cart-container');
  if(!container)return;

  // Read config embedded by renderCart() — ALL builder settings
  var cfg={};
  try{cfg=JSON.parse(container.getAttribute('data-xd-cart-config')||'{}');}catch(e){}
  var C=function(k,d){return cfg[k]!=null?cfg[k]:d;};

  while(container.firstChild)container.removeChild(container.firstChild);

  // ── Empty state ──
  if(!cart||!cart.items||cart.items.length===0){
    var empty=mk('div','');
    empty.style.cssText='text-align:center;padding:4rem 0';
    var icon=mk('span','material-icons','shopping_bag');
    icon.style.cssText='font-size:4rem;opacity:.2;display:block;margin-bottom:1rem';
    empty.appendChild(icon);
    var emptyH=mk('h2','',C('emptyTitle','Your cart is empty'));
    emptyH.style.cssText='font-size:1.25rem;font-weight:700;margin-bottom:.5rem';
    empty.appendChild(emptyH);
    var emptyP=mk('p','',C('emptyMessage','Looks like you haven\'t added anything yet.'));
    emptyP.style.cssText='opacity:.6;font-size:.95rem;margin-bottom:1.5rem';
    empty.appendChild(emptyP);
    var shopLink=mk('a','xd-btn xd-btn-primary',C('emptyButtonText','Continue shopping'));
    shopLink.href=sfBase+(C('emptyButtonLink','/products'));
    shopLink.style.cssText='display:inline-flex';
    empty.appendChild(shopLink);
    container.appendChild(empty);
    return;
  }

  var cur=cart.currency||currency;
  var showImage=C('showProductImage',true);
  var showQty=C('showQuantityControls',true);
  var showRemove=C('showRemoveButtons',true);
  var showVendor=C('showProductVendor',false);
  var showVariant=C('showVariantDetails',true);

  // ── Items list ──
  var list=mk('div','');
  list.style.cssText='display:flex;flex-direction:column;gap:.75rem';

  // Header row
  var header=mk('div','');
  header.style.cssText='display:none;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;opacity:.5;padding-bottom:.5rem;border-bottom:1px solid color-mix(in srgb,currentColor 8%,transparent)';
  list.appendChild(header);

  cart.items.forEach(function(item){
    var row=mk('div','xd-cart-item');
    row.setAttribute('data-product-id',item.productId||'');
    row.style.cssText='display:flex;gap:1rem;padding:1rem 0;border-bottom:1px solid color-mix(in srgb,currentColor 6%,transparent);align-items:center';

    // Image
    if(showImage){
      var imgLink=mk('a','');
      imgLink.href=sfBase+'/products/'+(item.productId||'');
      imgLink.style.flexShrink='0';
      var img=mk('img','');
      img.src=item.imageUrl||item.image||'https://placehold.co/100/f5f5f5/999?text=Item';
      img.alt=item.name||'';
      img.style.cssText='width:80px;height:80px;object-fit:cover;border-radius:var(--media-radius,8px);background:#f5f5f5';
      img.setAttribute('loading','lazy');
      imgLink.appendChild(img);
      row.appendChild(imgLink);
    }

    // Info column
    var info=mk('div','');
    info.style.cssText='flex:1;min-width:0';
    var nameLink=mk('a','',item.name||'Product');
    nameLink.href=sfBase+'/products/'+(item.productId||'');
    nameLink.style.cssText='font-weight:600;font-size:.9rem;text-decoration:none;color:inherit;display:block';
    info.appendChild(nameLink);
    if(showVendor&&item.vendor){
      var vendor=mk('p','',item.vendor);
      vendor.style.cssText='font-size:.75rem;opacity:.4;text-transform:uppercase;letter-spacing:.03em;margin-top:.15rem';
      info.appendChild(vendor);
    }
    if(showVariant&&item.variantLabel){
      var vl=mk('p','',item.variantLabel);
      vl.style.cssText='font-size:.8rem;opacity:.5;margin-top:.15rem';
      info.appendChild(vl);
    }
    var priceP=mk('p','',Number(item.price).toFixed(2)+' '+cur);
    priceP.style.cssText='font-weight:600;font-size:.9rem;margin-top:.25rem';
    info.appendChild(priceP);

    // Qty controls
    if(showQty){
      var qtyRow=mk('div','');
      qtyRow.style.cssText='display:flex;align-items:center;gap:0;margin-top:.5rem;border:1px solid color-mix(in srgb,currentColor 15%,transparent);border-radius:min(var(--btn-radius,8px),8px);width:fit-content';
      var minusBtn=mk('button','','\u2212');
      minusBtn.type='button';
      setAttrs(minusBtn,{'data-xd-cart-qty':'-1','data-pid':item.productId||'','data-vid':item.variantId||''});
      minusBtn.style.cssText='width:32px;height:32px;border:none;border-right:1px solid color-mix(in srgb,currentColor 15%,transparent);background:transparent;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;font-family:inherit;color:inherit';
      qtyRow.appendChild(minusBtn);
      var qtyDisplay=mk('span','',String(item.quantity));
      qtyDisplay.setAttribute('data-xd-cart-qty-display',item.productId||'');
      qtyDisplay.style.cssText='width:2.5rem;text-align:center;font-weight:600;font-size:.85rem';
      qtyRow.appendChild(qtyDisplay);
      var plusBtn=mk('button','','+');
      plusBtn.type='button';
      setAttrs(plusBtn,{'data-xd-cart-qty':'1','data-pid':item.productId||'','data-vid':item.variantId||''});
      plusBtn.style.cssText='width:32px;height:32px;border:none;border-left:1px solid color-mix(in srgb,currentColor 15%,transparent);background:transparent;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;font-family:inherit;color:inherit';
      qtyRow.appendChild(plusBtn);
      info.appendChild(qtyRow);
    }
    row.appendChild(info);

    // Line total + remove
    var rightCol=mk('div','');
    rightCol.style.cssText='display:flex;flex-direction:column;align-items:flex-end;gap:.5rem;flex-shrink:0';
    var lineTotal=mk('span','',Number(item.price*item.quantity).toFixed(2)+' '+cur);
    lineTotal.style.cssText='font-weight:700;font-size:.95rem';
    rightCol.appendChild(lineTotal);
    if(showRemove){
      var removeBtn=mk('button','','\u2715');
      removeBtn.type='button';
      setAttrs(removeBtn,{'data-xd-cart-remove':item.productId||'','data-vid':item.variantId||''});
      removeBtn.style.cssText='background:none;border:none;cursor:pointer;opacity:.35;font-size:.85rem;padding:.25rem;color:inherit;transition:opacity .2s';
      removeBtn.onmouseover=function(){this.style.opacity='1';};
      removeBtn.onmouseout=function(){this.style.opacity='.35';};
      rightCol.appendChild(removeBtn);
    }
    row.appendChild(rightCol);
    list.appendChild(row);
  });
  container.appendChild(list);

  // ── Order notes ──
  if(C('showNotes',false)){
    var notesWrap=mk('div','');
    notesWrap.style.cssText='margin-top:1.5rem';
    var notesLabel=mk('label','',C('notesLabel','Order notes'));
    notesLabel.setAttribute('for','xd-cart-notes');
    notesLabel.style.cssText='font-size:.85rem;font-weight:600;display:block;margin-bottom:.5rem';
    notesWrap.appendChild(notesLabel);
    var notesArea=document.createElement('textarea');
    notesArea.id='xd-cart-notes';
    notesArea.placeholder=C('notesPlaceholder','Special instructions for your order...');
    notesArea.style.cssText='width:100%;padding:.75rem;border:1px solid var(--input-border,#e5e7eb);border-radius:var(--input-radius,8px);font-size:.9rem;font-family:inherit;outline:none;resize:vertical;min-height:80px;box-sizing:border-box;background:transparent;color:inherit';
    notesWrap.appendChild(notesArea);
    container.appendChild(notesWrap);
  }

  // ── Summary ──
  var summary=mk('div','');
  summary.style.cssText='margin-top:2rem;padding:1.5rem;border:1px solid color-mix(in srgb,currentColor 10%,transparent);border-radius:var(--container-radius,12px)';

  if(C('showEstimatedTotal',true)){
    var subtotalRow=mk('div','');
    subtotalRow.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem';
    subtotalRow.appendChild(mk('span','','Subtotal ('+cart.itemCount+' item'+(cart.itemCount!==1?'s':'')+')'));
    var totalEl=mk('span','',Number(cart.subtotal).toFixed(2)+' '+cur);
    totalEl.style.cssText='font-size:1.25rem;font-weight:800';
    subtotalRow.appendChild(totalEl);
    summary.appendChild(subtotalRow);
  }

  if(C('showShippingInfo',true)){
    var shipNote=mk('p','',C('shippingInfoText','Shipping & taxes calculated at checkout'));
    shipNote.style.cssText='font-size:.8rem;opacity:.5;margin-bottom:1rem';
    summary.appendChild(shipNote);
  }

  if(C('showTrustBadges',false)&&C('trustMessage','')){
    var trustP=mk('p','',C('trustMessage',''));
    trustP.style.cssText='font-size:.8rem;opacity:.6;margin-bottom:1rem;display:flex;align-items:center;gap:.5rem';
    var lockIcon=mk('span','material-icons','lock');
    lockIcon.style.cssText='font-size:1rem';
    trustP.prepend(lockIcon);
    summary.appendChild(trustP);
  }

  if(C('showCheckoutButton',true)){
    var checkoutBtn=mk('a','xd-btn xd-btn-primary',C('checkoutButtonText','Check out'));
    checkoutBtn.href=sfBase+'/checkout';
    checkoutBtn.style.cssText='width:100%;display:flex;justify-content:center;font-weight:700;font-size:1rem;border-radius:min(var(--btn-radius,8px),12px);margin-bottom:.75rem';
    summary.appendChild(checkoutBtn);
  }

  if(C('showContinueShopping',true)){
    var continueLink=mk('a','',C('continueShoppingText','Continue shopping'));
    continueLink.href=sfBase+'/products';
    continueLink.style.cssText='display:block;text-align:center;font-size:.85rem;opacity:.6;text-decoration:underline;margin-top:.5rem';
    summary.appendChild(continueLink);
  }

  container.appendChild(summary);
}

/* Cart page: quantity +/- and remove */
document.addEventListener('click',function(e){
  var qtyBtn=e.target.closest('[data-xd-cart-qty]');
  if(qtyBtn){
    e.preventDefault();
    var delta=parseInt(qtyBtn.getAttribute('data-xd-cart-qty'))||0;
    var pid=qtyBtn.getAttribute('data-pid')||'';
    var vid=qtyBtn.getAttribute('data-vid')||undefined;
    var display=document.querySelector('[data-xd-cart-qty-display="'+pid+'"]');
    var currentQty=display?parseInt(display.textContent||'1'):1;
    var newQty=Math.max(0,currentQty+delta);
    cartFetch('PATCH','/cart/item',{cartToken:getToken(),productId:pid,variantId:vid,quantity:newQty}).then(function(cart){
      renderCartPage(cart);
    });
    return;
  }
  var removeBtn=e.target.closest('[data-xd-cart-remove]');
  if(removeBtn){
    e.preventDefault();
    var pid2=removeBtn.getAttribute('data-xd-cart-remove')||'';
    var vid2=removeBtn.getAttribute('data-vid')||undefined;
    cartFetch('PATCH','/cart/item',{cartToken:getToken(),productId:pid2,variantId:vid2,quantity:0}).then(function(cart){
      renderCartPage(cart);
    });
  }
});

/* ── 24. Checkout page ──────────────────────────────────────────────── */
function renderCheckoutPage(cart){
  var container=document.getElementById('xd-checkout-container');
  if(!container)return;
  while(container.firstChild)container.removeChild(container.firstChild);

  if(!cart||!cart.items||cart.items.length===0){
    var empty=mk('div','');
    empty.style.cssText='text-align:center;padding:3rem 0;opacity:.6';
    empty.appendChild(mk('p','','Your cart is empty. Add some products before checking out.'));
    var shopLink=mk('a','xd-btn','Continue Shopping');
    shopLink.href=sfBase+'/products';
    shopLink.style.cssText='margin-top:1rem;display:inline-block';
    empty.appendChild(shopLink);
    container.appendChild(empty);
    return;
  }

  var cur=cart.currency||currency;
  var subtotal=cart.subtotal||0;

  // Build checkout layout: form left, summary right
  var layout=mk('div','');
  layout.style.cssText='display:flex;flex-wrap:wrap;gap:2rem';

  // ── Left: Checkout form ──
  var formCol=mk('div','');
  formCol.style.cssText='flex:1;min-width:320px';

  var form=mk('form','');
  form.id='xd-checkout-form';
  form.style.cssText='display:flex;flex-direction:column;gap:1.5rem';
  form.setAttribute('onsubmit','return false');

  // Error display
  var errBox=mk('div','');
  errBox.id='xd-checkout-error';
  errBox.style.cssText='display:none;background:#fef2f2;color:#dc2626;padding:.75rem 1rem;border-radius:8px;font-size:.875rem';
  form.appendChild(errBox);

  // Contact section
  var contactH=mk('h3','','Contact');
  contactH.style.cssText='font-weight:700;font-size:1.1rem;margin-bottom:.5rem';
  form.appendChild(contactH);
  var contactGrid=mk('div','');
  contactGrid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:.75rem';
  function addInput(parent,id,label,type,required,placeholder,colspan){
    var wrap=mk('div','');
    if(colspan)wrap.style.gridColumn='1/-1';
    var lbl=mk('label','',label);
    lbl.setAttribute('for',id);
    lbl.style.cssText='font-size:.8rem;font-weight:600;display:block;margin-bottom:.25rem';
    wrap.appendChild(lbl);
    var inp=mk('input','');
    inp.id=id;inp.name=id;inp.type=type||'text';
    inp.placeholder=placeholder||'';
    if(required)inp.required=true;
    inp.style.cssText='width:100%;padding:.65rem .75rem;border:1px solid #e5e7eb;border-radius:8px;font-size:.9rem;font-family:inherit;outline:none;box-sizing:border-box';
    wrap.appendChild(inp);
    parent.appendChild(wrap);
    return inp;
  }
  addInput(contactGrid,'checkout-firstName','First name','text',true,'John');
  addInput(contactGrid,'checkout-lastName','Last name','text',true,'Doe');
  addInput(contactGrid,'checkout-email','Email','email',true,'john@example.com',true);
  addInput(contactGrid,'checkout-phone','Phone','tel',false,'+20 XXX XXX XXXX',true);
  form.appendChild(contactGrid);

  // Shipping section
  var shipH=mk('h3','','Shipping address');
  shipH.style.cssText='font-weight:700;font-size:1.1rem;margin-bottom:.5rem;margin-top:.5rem';
  form.appendChild(shipH);
  var shipGrid=mk('div','');
  shipGrid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:.75rem';
  addInput(shipGrid,'checkout-address','Address','text',true,'123 Main St',true);
  addInput(shipGrid,'checkout-city','City','text',true,'Cairo');
  addInput(shipGrid,'checkout-state','State / Province','text',false,'');
  addInput(shipGrid,'checkout-postalCode','Postal code','text',false,'');
  addInput(shipGrid,'checkout-country','Country','text',true,'Egypt',true);
  form.appendChild(shipGrid);

  // Payment method section
  var payH=mk('h3','','Payment method');
  payH.style.cssText='font-weight:700;font-size:1.1rem;margin-bottom:.5rem;margin-top:.5rem';
  form.appendChild(payH);
  var payContainer=mk('div','');
  payContainer.id='xd-payment-methods';
  payContainer.style.cssText='display:flex;flex-direction:column;gap:.5rem';
  var payLoading=mk('p','','Loading payment methods...');
  payLoading.style.cssText='opacity:.5;font-size:.9rem';
  payContainer.appendChild(payLoading);
  form.appendChild(payContainer);

  // Notes
  var noteWrap=mk('div','');
  var noteLbl=mk('label','','Order notes (optional)');
  noteLbl.setAttribute('for','checkout-notes');
  noteLbl.style.cssText='font-size:.8rem;font-weight:600;display:block;margin-bottom:.25rem';
  noteWrap.appendChild(noteLbl);
  var noteArea=document.createElement('textarea');
  noteArea.id='checkout-notes';noteArea.name='notes';
  noteArea.placeholder='Any special instructions...';
  noteArea.style.cssText='width:100%;padding:.65rem .75rem;border:1px solid #e5e7eb;border-radius:8px;font-size:.9rem;font-family:inherit;outline:none;resize:vertical;min-height:60px;box-sizing:border-box';
  noteWrap.appendChild(noteArea);
  form.appendChild(noteWrap);

  // Submit button
  var submitBtn=mk('button','xd-btn xd-btn-primary','Complete order');
  submitBtn.type='submit';
  submitBtn.id='xd-checkout-submit';
  submitBtn.style.cssText='width:100%;padding:1rem;font-size:1.05rem;font-weight:700;cursor:pointer;border:none;border-radius:min(var(--btn-radius,8px),12px);font-family:inherit';
  form.appendChild(submitBtn);

  formCol.appendChild(form);
  layout.appendChild(formCol);

  // ── Right: Order summary ──
  var summaryCol=mk('div','');
  summaryCol.style.cssText='width:360px;flex-shrink:0';
  var summaryBox=mk('div','');
  summaryBox.style.cssText='border:1px solid #e5e7eb;border-radius:12px;padding:1.5rem;position:sticky;top:100px';
  var summaryH=mk('h3','','Order summary');
  summaryH.style.cssText='font-weight:700;font-size:1rem;margin-bottom:1rem';
  summaryBox.appendChild(summaryH);

  // Items list
  cart.items.forEach(function(item){
    var row=mk('div','');
    row.style.cssText='display:flex;gap:.75rem;align-items:center;margin-bottom:.75rem;padding-bottom:.75rem;border-bottom:1px solid #f3f3f3';
    var img=mk('img','');
    img.src=item.imageUrl||item.image||'https://placehold.co/60/f5f5f5/999?text=Item';
    img.alt=item.name||'';
    img.style.cssText='width:50px;height:50px;object-fit:cover;border-radius:6px;flex-shrink:0';
    row.appendChild(img);
    var info=mk('div','');
    info.style.cssText='flex:1;min-width:0';
    var nm=mk('p','',item.name||'Product');
    nm.style.cssText='font-size:.85rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    info.appendChild(nm);
    var qty=mk('p','','Qty: '+item.quantity);
    qty.style.cssText='font-size:.75rem;opacity:.5';
    info.appendChild(qty);
    row.appendChild(info);
    var pr=mk('span','',Number(item.price*item.quantity).toFixed(2)+' '+cur);
    pr.style.cssText='font-weight:600;font-size:.85rem;flex-shrink:0';
    row.appendChild(pr);
    summaryBox.appendChild(row);
  });

  // Totals
  var totalsDiv=mk('div','');
  totalsDiv.style.cssText='margin-top:1rem;padding-top:1rem;border-top:1px solid #e5e7eb';
  function addTotalRow(label,value,bold){
    var r=mk('div','');
    r.style.cssText='display:flex;justify-content:space-between;margin-bottom:.5rem'+(bold?';font-weight:800;font-size:1.1rem':'');
    r.appendChild(mk('span','',label));
    r.appendChild(mk('span','',value));
    totalsDiv.appendChild(r);
  }
  addTotalRow('Subtotal',Number(subtotal).toFixed(2)+' '+cur,false);
  addTotalRow('Shipping','Calculated at checkout',false);
  addTotalRow('Total',Number(subtotal).toFixed(2)+' '+cur,true);
  summaryBox.appendChild(totalsDiv);
  summaryCol.appendChild(summaryBox);
  layout.appendChild(summaryCol);

  container.appendChild(layout);

  // Load payment methods
  var selectedPayment='';
  fetchJSON(publicUrl('/payment-methods'),{}).then(function(data){
    if(!data||!data.methods)return;
    while(payContainer.firstChild)payContainer.removeChild(payContainer.firstChild);
    data.methods.forEach(function(m,i){
      var label=mk('label','');
      label.style.cssText='display:flex;align-items:center;gap:.75rem;padding:.75rem;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;transition:border-color .2s';
      var radio=mk('input','');
      radio.type='radio';radio.name='paymentMethod';radio.value=m.code;
      if(i===0){radio.checked=true;selectedPayment=m.code;label.style.borderColor='var(--c-primary,#121212)';}
      radio.addEventListener('change',function(){
        selectedPayment=m.code;
        payContainer.querySelectorAll('label').forEach(function(l){l.style.borderColor='#e5e7eb';});
        label.style.borderColor='var(--c-primary,#121212)';
      });
      label.appendChild(radio);
      var info=mk('div','');
      info.appendChild(mk('span','',m.label));
      if(m.type==='offline'){var badge=mk('span','','Pay on delivery');badge.style.cssText='font-size:.7rem;opacity:.5;display:block';info.appendChild(badge);}
      if(m.type==='manual'&&m.instructions){var inst=mk('span','',m.instructions.substring(0,60));inst.style.cssText='font-size:.7rem;opacity:.5;display:block';info.appendChild(inst);}
      label.appendChild(info);
      payContainer.appendChild(label);
    });
  });

  // Handle form submit
  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(!selectedPayment){showCheckoutError('Please select a payment method');return;}
    var btn=document.getElementById('xd-checkout-submit');
    if(btn.disabled)return;
    btn.disabled=true;btn.textContent='Processing...';btn.style.opacity='0.6';

    var payload={
      cartToken:getToken(),
      customer:{
        email:document.getElementById('checkout-email').value,
        firstName:document.getElementById('checkout-firstName').value,
        lastName:document.getElementById('checkout-lastName').value,
        phone:document.getElementById('checkout-phone').value||undefined,
      },
      shipping:{
        address:document.getElementById('checkout-address').value,
        city:document.getElementById('checkout-city').value,
        state:document.getElementById('checkout-state').value||undefined,
        postalCode:document.getElementById('checkout-postalCode').value||undefined,
        country:document.getElementById('checkout-country').value,
      },
      paymentMethod:selectedPayment,
      customerNote:document.getElementById('checkout-notes').value||undefined,
      idempotencyKey:'ck-'+getToken()+'-'+Date.now(),
    };

    fetchJSON(publicUrl('/checkout'),{method:'POST',headers:{'Content-Type':'application/json','x-cart-token':getToken()},body:JSON.stringify(payload)}).then(function(result){
      if(!result){showCheckoutError('Checkout failed. Please try again.');resetBtn();return;}
      if(result.error){showCheckoutError(result.error);resetBtn();return;}

      // Handle response based on status
      if(result.status==='confirmed'){
        // COD or confirmed — redirect to confirmation
        window.location.href=sfBase+'/order/'+result.orderId+'?token='+result.publicLookupToken;
      }else if(result.clientSecret){
        // Stripe — load Stripe.js and confirm payment
        loadStripeAndPay(result.clientSecret,result.orderId,result.publicLookupToken);
      }else if(result.status==='awaiting_payment'){
        // Manual payment — show instructions then redirect
        window.location.href=sfBase+'/order/'+result.orderId+'?token='+result.publicLookupToken;
      }else{
        window.location.href=sfBase+'/order/'+result.orderId+'?token='+result.publicLookupToken;
      }
    }).catch(function(err){
      showCheckoutError(err&&err.message||'Checkout failed');
      resetBtn();
    });
  });

  function showCheckoutError(msg){
    var box=document.getElementById('xd-checkout-error');
    if(box){box.textContent=msg;box.style.display='block';}
  }
  function resetBtn(){
    var btn=document.getElementById('xd-checkout-submit');
    if(btn){btn.disabled=false;btn.textContent='Complete order';btn.style.opacity='';}
  }
}

/* Load Stripe.js dynamically and confirm payment */
function loadStripeAndPay(clientSecret,orderId,lookupToken){
  if(window.Stripe){
    confirmStripePayment(clientSecret,orderId,lookupToken);
    return;
  }
  var script=document.createElement('script');
  script.src='https://js.stripe.com/v3/';
  script.onload=function(){confirmStripePayment(clientSecret,orderId,lookupToken);};
  script.onerror=function(){
    var box=document.getElementById('xd-checkout-error');
    if(box){box.textContent='Failed to load payment processor. Please try again.';box.style.display='block';}
    var btn=document.getElementById('xd-checkout-submit');
    if(btn){btn.disabled=false;btn.textContent='Complete order';btn.style.opacity='';}
  };
  document.head.appendChild(script);
}

function confirmStripePayment(clientSecret,orderId,lookupToken){
  // Get publishable key from payment methods
  fetchJSON(publicUrl('/payment-methods'),{}).then(function(data){
    if(!data||!data.methods)return;
    var stripeMethod=data.methods.find(function(m){return m.code==='stripe';});
    if(!stripeMethod||!stripeMethod.publishableKey)return;
    var stripe=window.Stripe(stripeMethod.publishableKey);
    stripe.confirmCardPayment(clientSecret,{
      payment_method:{
        card:{/* Stripe Elements would go here — for now redirect to Stripe hosted */},
      },
    }).then(function(result){
      if(result.error){
        var box=document.getElementById('xd-checkout-error');
        if(box){box.textContent=result.error.message||'Payment failed';box.style.display='block';}
        var btn=document.getElementById('xd-checkout-submit');
        if(btn){btn.disabled=false;btn.textContent='Complete order';btn.style.opacity='';}
      }else{
        window.location.href=sfBase+'/order/'+orderId+'?token='+lookupToken;
      }
    });
  });
}

/* ── 25. Search page ──────────────────────────────────────────────── */
function initSearchPage(){
  var input=document.getElementById('xd-search-input');
  var results=document.getElementById('xd-search-results');
  var status=document.getElementById('xd-search-status');
  var form=document.getElementById('xd-search-form');
  if(!input||!results)return;

  var debounceTimer=null;
  var lastQuery='';
  var currentPage=1;

  // Read initial query from URL
  var params=new URLSearchParams(window.location.search);
  var initialQ=params.get('q')||'';
  if(initialQ){input.value=initialQ;doSearch(initialQ,1);}

  // Debounced input handler (300ms)
  input.addEventListener('input',function(){
    var q=input.value.trim();
    if(debounceTimer)clearTimeout(debounceTimer);
    if(!q){clearResults();return;}
    debounceTimer=setTimeout(function(){doSearch(q,1);},300);
  });

  // Form submit
  if(form)form.addEventListener('submit',function(e){
    e.preventDefault();
    var q=input.value.trim();
    if(q)doSearch(q,1);
  });

  function clearResults(){
    while(results.firstChild)results.removeChild(results.firstChild);
    if(status)status.textContent='';
    lastQuery='';
  }

  function doSearch(q,page){
    lastQuery=q;currentPage=page;
    if(status)status.textContent='Searching...';

    // Update URL without reload
    var url=new URL(window.location.href);
    url.searchParams.set('q',q);
    if(page>1)url.searchParams.set('page',String(page));
    else url.searchParams.delete('page');
    window.history.replaceState(null,'',url.toString());

    fetchJSON(publicUrl('/search?q='+encodeURIComponent(q)+'&page='+page+'&limit=20'),{}).then(function(data){
      if(!data||lastQuery!==q)return; // Stale response
      if(status){
        status.textContent=data.total>0
          ? data.total+' result'+(data.total!==1?'s':'')+' for "'+q+'"'
          : 'No results found for "'+q+'"';
      }
      renderSearchResults(data.products||[],data.total||0,page,q);
    }).catch(function(){
      if(status)status.textContent='Search failed. Please try again.';
    });
  }

  function renderSearchResults(products,total,page,q){
    while(results.firstChild)results.removeChild(results.firstChild);
    if(products.length===0)return;

    var grid=mk('div','');
    grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));gap:1.5rem';

    products.forEach(function(p){
      var detailHref=sfBase+'/products/'+(p.id||'');
      var card=mk('a','xd-product-card xd-reveal xd-visible');
      card.href=detailHref;
      card.style.cssText='text-decoration:none;color:inherit';
      // Image
      var imgWrap=mk('div','xd-product-img-wrap');
      var img=mk('img','xd-product-img-primary');
      img.src=p.image||(p.images&&p.images[0])||'https://placehold.co/400/f5f5f5/999?text=Product';
      img.alt=p.name||'';
      img.setAttribute('loading','lazy');img.setAttribute('width','400');img.setAttribute('height','400');
      imgWrap.appendChild(img);
      card.appendChild(imgWrap);
      // Body
      var body=mk('div','xd-product-body');
      body.appendChild(mk('span','xd-product-name',p.name||'Product'));
      if(p.vendor){var v=mk('span','xd-product-vendor',p.vendor);body.appendChild(v);}
      var price=p.sellingPrice||p.salePrice||p.price;
      if(price){body.appendChild(mk('span','xd-product-price',Number(price).toFixed(2)+' '+currency));}
      card.appendChild(body);
      grid.appendChild(card);
    });
    results.appendChild(grid);

    // Pagination
    var totalPages=Math.ceil(total/20);
    if(totalPages>1){
      var pag=mk('div','');
      pag.style.cssText='display:flex;justify-content:center;gap:.5rem;margin-top:2rem;flex-wrap:wrap';
      for(var i=1;i<=totalPages;i++){
        (function(pageNum){
          var btn=mk('button','xd-btn xd-btn-sm '+(pageNum===page?'xd-btn-primary':'xd-btn-secondary'),String(pageNum));
          btn.type='button';
          btn.style.cssText='min-width:36px;font-family:inherit;cursor:pointer';
          btn.addEventListener('click',function(){doSearch(q,pageNum);window.scrollTo({top:0,behavior:'smooth'});});
          pag.appendChild(btn);
        })(i);
      }
      results.appendChild(pag);
    }
  }
}

/* ── 26. Order confirmation page ──────────────────────────────────── */
function renderOrderConfirmation(){
  var container=document.getElementById('xd-checkout-container');
  if(!container)return;
  var params=new URLSearchParams(window.location.search);
  var token=params.get('token');
  var pathParts=window.location.pathname.split('/');
  var orderIdx=pathParts.indexOf('order');
  var orderId=orderIdx>=0?pathParts[orderIdx+1]:'';
  if(!orderId||!token)return;

  fetchJSON(publicUrl('/orders/'+orderId+'?token='+encodeURIComponent(token)),{}).then(function(order){
    if(!order||order.error){
      while(container.firstChild)container.removeChild(container.firstChild);
      container.appendChild(mk('p','','Order not found'));
      return;
    }
    while(container.firstChild)container.removeChild(container.firstChild);
    var cur=order.currency||currency;
    // Success icon
    var icon=mk('div','');
    icon.style.cssText='text-align:center;margin-bottom:2rem';
    var checkSvg=mk('span','material-icons','check_circle');
    checkSvg.style.cssText='font-size:4rem;color:#22c55e';
    icon.appendChild(checkSvg);
    var thankYou=mk('h2','','Thank you for your order!');
    thankYou.style.cssText='font-size:1.5rem;font-weight:800;margin-top:.5rem';
    icon.appendChild(thankYou);
    var orderNum=mk('p','','Order #'+order.orderId);
    orderNum.style.cssText='opacity:.6;font-size:.95rem';
    icon.appendChild(orderNum);
    container.appendChild(icon);

    // Status
    var statusMap={confirmed:'Confirmed',awaiting_payment:'Awaiting Payment',processing:'Processing',shipped:'Shipped',delivered:'Delivered'};
    var statusBadge=mk('div','');
    statusBadge.style.cssText='text-align:center;margin-bottom:2rem';
    var badge=mk('span','',(statusMap[order.status]||order.status).toUpperCase());
    badge.style.cssText='display:inline-block;padding:.4rem 1rem;border-radius:999px;font-size:.8rem;font-weight:700;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0';
    if(order.status==='awaiting_payment'){badge.style.background='#fffbeb';badge.style.color='#d97706';badge.style.borderColor='#fde68a';}
    if(order.status==='failed'||order.status==='cancelled'){badge.style.background='#fef2f2';badge.style.color='#dc2626';badge.style.borderColor='#fecaca';}
    statusBadge.appendChild(badge);
    container.appendChild(statusBadge);

    // Order details grid
    var details=mk('div','');
    details.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:2rem;max-width:700px;margin:0 auto';
    // Customer
    var custBox=mk('div','');
    custBox.appendChild(mk('h4','','Customer'));
    custBox.querySelector('h4').style.cssText='font-weight:700;margin-bottom:.5rem';
    custBox.appendChild(mk('p','',order.customer.firstName+' '+order.customer.lastName));
    custBox.appendChild(mk('p','',order.customer.email));
    if(order.customer.phone)custBox.appendChild(mk('p','',order.customer.phone));
    details.appendChild(custBox);
    // Shipping
    var shipBox=mk('div','');
    shipBox.appendChild(mk('h4','','Shipping'));
    shipBox.querySelector('h4').style.cssText='font-weight:700;margin-bottom:.5rem';
    shipBox.appendChild(mk('p','',order.shipping.address));
    shipBox.appendChild(mk('p','',order.shipping.city+(order.shipping.state?', '+order.shipping.state:'')));
    shipBox.appendChild(mk('p','',order.shipping.country));
    details.appendChild(shipBox);
    container.appendChild(details);

    // Items
    var itemsH=mk('h4','','Items');
    itemsH.style.cssText='font-weight:700;margin:2rem 0 1rem;max-width:700px;margin-left:auto;margin-right:auto';
    container.appendChild(itemsH);
    var itemsList=mk('div','');
    itemsList.style.cssText='max-width:700px;margin:0 auto;display:flex;flex-direction:column;gap:.5rem';
    (order.items||[]).forEach(function(item){
      var row=mk('div','');
      row.style.cssText='display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid #f3f3f3';
      row.appendChild(mk('span','',item.name+' × '+item.quantity));
      row.appendChild(mk('span','',Number(item.price*item.quantity).toFixed(2)+' '+cur));
      itemsList.appendChild(row);
    });
    container.appendChild(itemsList);

    // Total
    var totalDiv=mk('div','');
    totalDiv.style.cssText='max-width:700px;margin:1rem auto 0;padding-top:1rem;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-weight:800;font-size:1.1rem';
    totalDiv.appendChild(mk('span','','Total'));
    totalDiv.appendChild(mk('span','',Number(order.total).toFixed(2)+' '+cur));
    container.appendChild(totalDiv);

    // Continue shopping
    var shopDiv=mk('div','');
    shopDiv.style.cssText='text-align:center;margin-top:2rem';
    var shopBtn=mk('a','xd-btn','Continue Shopping');
    shopBtn.href=sfBase+'/products';
    shopBtn.style.cssText='display:inline-block';
    shopDiv.appendChild(shopBtn);
    container.appendChild(shopDiv);
  });
}

/* ── 26. Init ───────────────────────────────────────────────────────── */
function init(){
  sections.forEach(hydrateSection);
  sections.forEach(function(entry){
    var sEl=document.querySelector('[data-xd-section-id="'+entry.id+'"]');
    if(!sEl)return;
    wireAnalyticsOnSection(sEl,entry);
    if(entry.apiBinding)wireFormSubmit(sEl,entry);
  });
  // Load cart and hydrate cart/checkout pages
  if(tenantId&&getToken()){
    cartFetch('GET','/cart',null).then(function(cart){
      if(cart){
        renderCartPage(cart);
        renderCheckoutPage(cart);
      }
    });
  }
  // Order confirmation page
  if(window.location.pathname.indexOf('/order/')!==-1){
    renderOrderConfirmation();
  }
  // Search page
  initSearchPage();
}

/* Deferred scripts execute after HTML parsing — DOM is complete */
init();

})();`;
