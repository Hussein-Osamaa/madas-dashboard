import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateSiteModal from '../../components/ecommerce/CreateSiteModal';
import { useDarkMode } from '../../contexts/DarkModeContext';
import { useBusiness } from '../../contexts/BusinessContext';

/* ──────────────────────────────────────────────────────────────
   Theme tokens — keyed by isDark
────────────────────────────────────────────────────────────── */
function tokens(isDark: boolean) {
  return isDark
    ? {
        // dark — matches dashboard dark palette
        pageBg:      'transparent',
        card:        '#1a1b3e',
        cardHover:   '#22244a',
        surface:     '#0f1025',
        input:       '#0f1025',
        border:      '#2d2f5a',
        borderSub:   '#232545',
        textPrimary: '#f9fafb',
        textSecond:  '#a8a8b8',
        textMuted:   '#6b7280',
        shadow:      'rgba(0,0,0,.5)',
        shadowHover: 'rgba(0,0,0,.7)',
        // status
        liveGlow:    'rgba(22,163,74,.3)',
        liveBorder:  '#166534',
        // new-site card
        newCardBg:   'linear-gradient(135deg,#0f1025,#1a1b3e)',
        newCardHoverBg: 'rgba(39,73,31,.25)',
        newCardHoverColor: '#4ade80',
      }
    : {
        // light
        pageBg:      'transparent',
        card:        '#ffffff',
        cardHover:   '#f8fafc',
        surface:     '#f1f5f9',
        input:       '#ffffff',
        border:      '#e2e8f0',
        borderSub:   '#f1f5f9',
        textPrimary: '#0f172a',
        textSecond:  '#475569',
        textMuted:   '#94a3b8',
        shadow:      'rgba(0,0,0,.07)',
        shadowHover: 'rgba(0,0,0,.13)',
        liveGlow:    'rgba(22,163,74,.15)',
        liveBorder:  '#86efac',
        newCardBg:   'linear-gradient(135deg,#f8fafc,#f1f5f9)',
        newCardHoverBg: '#f0fdf4',
        newCardHoverColor: '#15803d',
      };
}

/* ──────────────────────────────────────────────────────────────
   API
────────────────────────────────────────────────────────────── */
const API_BASE = (import.meta.env.VITE_API_BACKEND_URL as string | undefined)
  ?.replace(/\/api\/?$/, '') ?? '';

function getToken() {
  return localStorage.getItem('backend_access_token')
    || localStorage.getItem('warehouse_access_token') || '';
}

async function sitesApi<T>(method: string, path: string, body?: unknown, businessId?: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?';
  const bizQuery = businessId ? `${sep}businessId=${encodeURIComponent(businessId)}` : '';
  const res = await fetch(`${API_BASE}/api/sites${path}${bizQuery}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* ──────────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────────── */
type Site = {
  id: string; name: string; themeName?: string; description?: string;
  status: 'draft' | 'published';
  createdAt?: string; updatedAt?: string;
  url?: string; publicUrl?: string; customDomain?: string;
  sections?: unknown[]; pages?: unknown[];
};
type SiteListResponse = { sites: (Site & { _id?: string })[] };
type T = ReturnType<typeof tokens>;

/* ──────────────────────────────────────────────────────────────
   Toast
────────────────────────────────────────────────────────────── */
type ToastKind = 'success' | 'error' | 'info';
function showToast(message: string, kind: ToastKind = 'info') {
  const icons: Record<ToastKind, string> = { success: '✓', error: '✕', info: 'ℹ' };
  const colors: Record<ToastKind, string> = {
    success: 'linear-gradient(135deg,#166534,#15803d)',
    error:   'linear-gradient(135deg,#991b1b,#dc2626)',
    info:    'linear-gradient(135deg,#1e40af,#2563eb)',
  };
  const el = document.createElement('div');
  el.innerHTML = `<span style="font-size:16px;margin-right:8px;">${icons[kind]}</span>${message}`;
  Object.assign(el.style, {
    position:'fixed', bottom:'24px', right:'24px', zIndex:'99999',
    background:colors[kind], color:'#fff', padding:'13px 20px',
    borderRadius:'12px', fontSize:'14px', fontWeight:'500',
    boxShadow:'0 8px 32px rgba(0,0,0,.4)', display:'flex',
    alignItems:'center', maxWidth:'360px', animation:'slideInToast .25s ease', opacity:'1',
  });
  if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = '@keyframes slideInToast{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}';
    document.head.appendChild(s);
  }
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; el.style.transition = 'all .3s';
    setTimeout(() => el.remove(), 350);
  }, 3000);
}

function showConfirm(message: string, confirmLabel = 'Confirm', danger = true, isDark = true): Promise<boolean> {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position:'fixed', inset:'0', zIndex:'99998',
      background:'rgba(0,0,0,.55)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center',
    });
    const cardBg  = isDark ? '#1a1b3e' : '#ffffff';
    const cardBdr = isDark ? '#2d2f5a' : '#e2e8f0';
    const textCol = isDark ? '#f9fafb'  : '#0f172a';
    const btnBg   = isDark ? '#0f1025' : '#f8fafc';
    const btnBdr  = isDark ? '#2d2f5a' : '#e2e8f0';
    const btnText = isDark ? '#d1d5db' : '#374151';
    overlay.innerHTML = `
      <div style="background:${cardBg};border:1px solid ${cardBdr};border-radius:16px;padding:28px 32px;max-width:400px;width:90%;box-shadow:0 24px 64px rgba(0,0,0,.4);">
        <p style="font-size:15px;color:${textCol};margin:0 0 24px;line-height:1.6;">${message}</p>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button id="c-cancel" style="padding:10px 22px;border-radius:8px;border:1.5px solid ${btnBdr};background:${btnBg};cursor:pointer;font-size:14px;font-weight:500;color:${btnText};">Cancel</button>
          <button id="c-ok" style="padding:10px 22px;border-radius:8px;border:none;background:${danger ? '#dc2626' : '#2563eb'};color:#fff;cursor:pointer;font-size:14px;font-weight:600;">${confirmLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#c-ok')!.addEventListener('click', () => { overlay.remove(); resolve(true); });
    overlay.querySelector('#c-cancel')!.addEventListener('click', () => { overlay.remove(); resolve(false); });
    overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
  });
}

/* ──────────────────────────────────────────────────────────────
   Gradient thumbnails
────────────────────────────────────────────────────────────── */
const GRADIENTS: [string, string][] = [
  ['#667eea','#764ba2'], ['#f093fb','#f5576c'], ['#4facfe','#00f2fe'],
  ['#43e97b','#38f9d7'], ['#fa709a','#fee140'], ['#a18cd1','#fbc2eb'],
  ['#ffecd2','#fcb69f'], ['#ff9a9e','#fecfef'], ['#a1c4fd','#c2e9fb'],
  ['#d4fc79','#96e6a1'], ['#84fab0','#8fd3f4'], ['#fda085','#f6d365'],
];
function getSiteGradient(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

/* ──────────────────────────────────────────────────────────────
   MoreMenu
────────────────────────────────────────────────────────────── */
type MoreMenuProps = { site: Site; t: T; onDuplicate: () => void; onSettings: () => void; };
function MoreMenu({ site, t, onDuplicate, onSettings }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const previewUrl = site.publicUrl || site.url || `${API_BASE}/api/sites/${site.id}/public`;
  const row: React.CSSProperties = {
    display:'flex', alignItems:'center', gap:10, padding:'11px 14px',
    fontSize:13, fontWeight:500, color:t.textPrimary, textDecoration:'none',
    width:'100%', background:'none', border:'none', cursor:'pointer', textAlign:'left',
  };
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button type="button" title="More options" onClick={() => setOpen(o => !o)}
        style={{
          width:34, height:34, borderRadius:8, border:`1.5px solid ${t.border}`,
          background: open ? t.cardHover : t.card, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:t.textSecond, transition:'all .15s',
        }}>
        <span className="material-icons" style={{ fontSize:18 }}>more_vert</span>
      </button>
      {open && (
        <div style={{
          position:'absolute', right:0, bottom:'calc(100% + 6px)', zIndex:1000,
          background:t.card, borderRadius:12, border:`1px solid ${t.border}`,
          boxShadow:`0 8px 40px ${t.shadow}`, minWidth:188, overflow:'hidden',
        }}>
          <a href={previewUrl} target="_blank" rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            style={{ ...row, borderBottom:`1px solid ${t.borderSub}` }}
            onMouseEnter={e => (e.currentTarget.style.background = t.cardHover)}
            onMouseLeave={e => (e.currentTarget.style.background = '')}>
            <span className="material-icons" style={{ fontSize:17, color:'#3b82f6' }}>preview</span>
            Preview site
          </a>
          <button type="button" onClick={() => { onSettings(); setOpen(false); }}
            style={{ ...row, borderBottom:`1px solid ${t.borderSub}` }}
            onMouseEnter={e => (e.currentTarget.style.background = t.cardHover)}
            onMouseLeave={e => (e.currentTarget.style.background = '')}>
            <span className="material-icons" style={{ fontSize:17, color:'#8b5cf6' }}>tune</span>
            Analytics & SEO
          </button>
          <button type="button" onClick={() => { onDuplicate(); setOpen(false); }}
            style={row}
            onMouseEnter={e => (e.currentTarget.style.background = t.cardHover)}
            onMouseLeave={e => (e.currentTarget.style.background = '')}>
            <span className="material-icons" style={{ fontSize:17, color:'#10b981' }}>content_copy</span>
            Duplicate
          </button>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   SiteCard
────────────────────────────────────────────────────────────── */
type SiteCardProps = {
  site: Site; t: T;
  publishing: string | null; unpublishing: string | null; deleting: string | null;
  onEdit: () => void; onPublish: () => void; onUnpublish: () => void;
  onDelete: () => void; onDuplicate: () => void; onSettings: () => void;
};
function SiteCard({ site, t, publishing, unpublishing, deleting, onEdit, onPublish, onUnpublish, onDelete, onDuplicate, onSettings }: SiteCardProps) {
  const displayName = site.themeName || site.name;
  const [col1, col2] = getSiteGradient(displayName);
  const isLive        = site.status === 'published';
  const busyPublish   = publishing   === site.id;
  const busyUnpublish = unpublishing === site.id;
  const busyDelete    = deleting     === site.id;
  const sectionCount  = Array.isArray(site.sections) ? site.sections.length : 0;
  const pageCount     = Array.isArray(site.pages)    ? site.pages.length    : 0;
  const cardBorder    = isLive ? t.liveBorder : t.border;
  const cardShadow    = isLive ? `0 0 0 2px ${t.liveGlow}` : `0 2px 10px ${t.shadow}`;
  const cardShadowH   = isLive ? `0 0 0 3px ${t.liveGlow},0 8px 28px ${t.shadowHover}` : `0 8px 28px ${t.shadowHover}`;

  return (
    <article
      style={{
        background:t.card, borderRadius:16, overflow:'hidden',
        border:`1.5px solid ${cardBorder}`, boxShadow:cardShadow,
        display:'flex', flexDirection:'column', transition:'box-shadow .2s,transform .15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = cardShadowH; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = cardShadow;  (e.currentTarget as HTMLElement).style.transform = ''; }}
    >
      {/* Thumbnail */}
      <div onClick={onEdit} style={{ height:110, background:`linear-gradient(135deg,${col1},${col2})`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.1)', top:-30, right:-20 }} />
        <div style={{ position:'absolute', width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,.07)', bottom:-20, left:10 }} />
        <div style={{ width:52, height:52, borderRadius:14, background:'rgba(255,255,255,.22)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:800, color:'#fff', backdropFilter:'blur(8px)', border:'2px solid rgba(255,255,255,.3)', position:'relative', zIndex:1, letterSpacing:-1 }}>
          {displayName.charAt(0).toUpperCase()}
        </div>
        {isLive && (
          <div style={{ position:'absolute', top:10, right:10, background:'#16a34a', color:'#fff', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#86efac', display:'inline-block', animation:'pulse 2s infinite' }} />
            LIVE
          </div>
        )}
        {!isLive && (
          <div style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,.4)', color:'rgba(255,255,255,.9)', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:600 }}>
            Draft
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding:'16px 18px 14px', flex:1, display:'flex', flexDirection:'column', gap:10 }}>
        <div>
          <h3 style={{ fontSize:15, fontWeight:700, color:t.textPrimary, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</h3>
          {site.description && (
            <p style={{ fontSize:12, color:t.textSecond, margin:'3px 0 0', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{site.description}</p>
          )}
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
          {site.updatedAt && (
            <span style={{ fontSize:11, color:t.textMuted, display:'flex', alignItems:'center', gap:4 }}>
              <span className="material-icons" style={{ fontSize:13 }}>schedule</span>
              {new Date(site.updatedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}
            </span>
          )}
          {sectionCount > 0 && (
            <span style={{ fontSize:11, color:t.textMuted, display:'flex', alignItems:'center', gap:4 }}>
              <span className="material-icons" style={{ fontSize:13 }}>layers</span>
              {sectionCount} section{sectionCount !== 1 ? 's' : ''}
            </span>
          )}
          {pageCount > 1 && (
            <span style={{ fontSize:11, color:t.textMuted, display:'flex', alignItems:'center', gap:4 }}>
              <span className="material-icons" style={{ fontSize:13 }}>article</span>
              {pageCount} pages
            </span>
          )}
        </div>

        {/* Live URL chip */}
        {isLive && (site.url || site.publicUrl) && (
          <a href={site.url || site.publicUrl} target="_blank" rel="noopener noreferrer"
            style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:500, color:'#16a34a', background:'rgba(22,163,74,.12)', border:'1px solid rgba(22,163,74,.3)', borderRadius:8, padding:'5px 10px', textDecoration:'none', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', maxWidth:'100%' }}
            onClick={e => e.stopPropagation()}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(22,163,74,.22)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(22,163,74,.12)')}>
            <span className="material-icons" style={{ fontSize:13, flexShrink:0 }}>open_in_new</span>
            <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>
              {(site.customDomain || site.url || site.publicUrl || '').replace(/^https?:\/\//, '')}
            </span>
          </a>
        )}

        {/* Primary actions */}
        <div style={{ display:'flex', gap:8, marginTop:4 }}>
          <button type="button" onClick={onEdit}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'9px 16px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#27491F,#3a6b2e)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', transition:'opacity .15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            <span className="material-icons" style={{ fontSize:16 }}>edit</span>
            Open Editor
          </button>
          {isLive ? (
            <button type="button" onClick={onUnpublish} disabled={!!busyUnpublish} title="Unpublish"
              style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:10, border:'1.5px solid rgba(251,146,60,.35)', background:'rgba(234,88,12,.12)', color:'#ea580c', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all .15s', opacity:busyUnpublish ? .5 : 1 }}
              onMouseEnter={e => { if (!busyUnpublish) (e.currentTarget.style.background = 'rgba(234,88,12,.22)'); }}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(234,88,12,.12)')}>
              {busyUnpublish ? <span className="material-icons" style={{ fontSize:16, animation:'spin 1s linear infinite' }}>autorenew</span> : <span className="material-icons" style={{ fontSize:16 }}>cloud_off</span>}
              Take Down
            </button>
          ) : (
            <button type="button" onClick={onPublish} disabled={!!busyPublish} title="Publish"
              style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 14px', borderRadius:10, border:'1.5px solid rgba(22,163,74,.35)', background:'rgba(22,163,74,.12)', color:'#16a34a', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all .15s', opacity:busyPublish ? .5 : 1 }}
              onMouseEnter={e => { if (!busyPublish) (e.currentTarget.style.background = 'rgba(22,163,74,.22)'); }}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(22,163,74,.12)')}>
              {busyPublish ? <span className="material-icons" style={{ fontSize:16, animation:'spin 1s linear infinite' }}>autorenew</span> : <span className="material-icons" style={{ fontSize:16 }}>rocket_launch</span>}
              Publish
            </button>
          )}
        </div>

        {/* Secondary actions */}
        <div style={{ display:'flex', alignItems:'center', gap:6, paddingTop:2 }}>
          <button type="button" onClick={onDelete} disabled={!!busyDelete} title="Delete site"
            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:8, border:'1.5px solid rgba(220,38,38,.35)', background:'rgba(220,38,38,.1)', color:'#dc2626', fontSize:12, fontWeight:600, cursor:'pointer', opacity:busyDelete ? .5 : 1, transition:'all .15s' }}
            onMouseEnter={e => { if (!busyDelete) (e.currentTarget.style.background = 'rgba(220,38,38,.2)'); }}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(220,38,38,.1)')}>
            {busyDelete ? <span className="material-icons" style={{ fontSize:14, animation:'spin 1s linear infinite' }}>autorenew</span> : <span className="material-icons" style={{ fontSize:14 }}>delete_outline</span>}
            Delete
          </button>
          <div style={{ flex:1 }} />
          <MoreMenu site={site} t={t} onDuplicate={onDuplicate} onSettings={onSettings} />
        </div>
      </div>
    </article>
  );
}

/* ──────────────────────────────────────────────────────────────
   Main Page
────────────────────────────────────────────────────────────── */
const WebsiteBuilderPage = () => {
  const { isDark } = useDarkMode();
  const { businessId: ctxBusinessId } = useBusiness();
  const t = tokens(isDark);
  const navigate = useNavigate();
  const [sites, setSites]               = useState<Site[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showCreateModal, setShowCreate]= useState(false);
  const [deleting,    setDeleting]      = useState<string | null>(null);
  const [publishing,  setPublishing]    = useState<string | null>(null);
  const [unpublishing,setUnpublishing]  = useState<string | null>(null);
  const [search, setSearch]             = useState('');
  const [showLegacyBanner, setShowLegacyBanner] = useState(
    () => localStorage.getItem('xdigix_legacy_builder_dismissed') !== '1'
  );

  const dismissLegacyBanner = () => {
    localStorage.setItem('xdigix_legacy_builder_dismissed', '1');
    setShowLegacyBanner(false);
  };

  useEffect(() => {
    if (!document.getElementById('wb-spin-style')) {
      const s = document.createElement('style');
      s.id = 'wb-spin-style';
      s.textContent = [
        '@keyframes spin{to{transform:rotate(360deg)}}',
        '@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}',
      ].join('');
      document.head.appendChild(s);
    }
  }, []);

  const loadSites = useCallback(async () => {
    try {
      const data = await sitesApi<SiteListResponse>('GET', '', undefined, ctxBusinessId);
      setSites(data.sites.map(s => ({ ...s, id: s.id || String(s._id) })));
    } catch { showToast('Failed to load sites — check connection', 'error'); }
  }, [ctxBusinessId]);

  useEffect(() => { setLoading(true); void loadSites().finally(() => setLoading(false)); }, [loadSites]);

  const handleCreateSite = async (siteData: { name: string; themeName: string; description?: string }) => {
    try {
      const res = await sitesApi<{ id: string }>('POST', '', { name: siteData.name, themeName: siteData.themeName, description: siteData.description || '' }, ctxBusinessId);
      setShowCreate(false);
      showToast(`"${siteData.themeName}" created!`, 'success');
      navigate(`/ecommerce/builder?siteId=${res.id}`);
    } catch { showToast('Failed to create site', 'error'); }
  };

  const handleDeleteSite = async (siteId: string, name: string) => {
    if (!await showConfirm(`Delete "<strong>${name}</strong>"? This cannot be undone.`, 'Delete', true, isDark)) return;
    setDeleting(siteId);
    try { await sitesApi('DELETE', `/${siteId}`, undefined, ctxBusinessId); setSites(prev => prev.filter(s => s.id !== siteId)); showToast('Site deleted', 'success'); }
    catch { showToast('Failed to delete site', 'error'); }
    finally { setDeleting(null); }
  };

  const handlePublishSite = async (siteId: string) => {
    setPublishing(siteId);
    try {
      const updated = await sitesApi<Site>('POST', `/${siteId}/publish`, undefined, ctxBusinessId);
      setSites(prev => prev.map(s => s.id === siteId ? { ...s, status:'published' as const, url:updated.url, publicUrl:updated.publicUrl, updatedAt:updated.updatedAt } : { ...s, status:'draft' as const }));
      showToast('🚀 Site is now live!', 'success');
    } catch (e) { showToast((e as Error).message || 'Failed to publish', 'error'); }
    finally { setPublishing(null); }
  };

  const handleUnpublishSite = async (siteId: string) => {
    if (!await showConfirm('Take this site offline? Visitors will no longer see it.', 'Take Down', false, isDark)) return;
    setUnpublishing(siteId);
    try { await sitesApi('POST', `/${siteId}/unpublish`, undefined, ctxBusinessId); setSites(prev => prev.map(s => s.id === siteId ? { ...s, status:'draft' as const, url:undefined } : s)); showToast('Site taken offline', 'info'); }
    catch { showToast('Failed to unpublish', 'error'); }
    finally { setUnpublishing(null); }
  };

  const handleDuplicateSite = async (site: Site) => {
    try { await sitesApi('POST', `/${site.id}/duplicate`, undefined, ctxBusinessId); await loadSites(); showToast(`"${site.themeName || site.name}" duplicated`, 'success'); }
    catch { showToast('Failed to duplicate', 'error'); }
  };

  const handleSettings = (siteId: string) => navigate(`/ecommerce/builder?siteId=${siteId}&openPanel=settings`);

  const publishedCount = sites.filter(s => s.status === 'published').length;
  const filtered = search.trim() ? sites.filter(s => (s.themeName || s.name).toLowerCase().includes(search.toLowerCase())) : sites;

  const infoCards = [
    { icon:'rocket_launch', color:'#8b5cf6', bg:isDark ? 'rgba(124,58,237,.15)' : '#f5f3ff', border:isDark ? 'rgba(124,58,237,.3)' : '#ddd6fe', title:'How publishing works', body:'Only one site can be live at a time. Publishing a site automatically unpublishes others.' },
    { icon:'analytics',     color:'#3b82f6', bg:isDark ? 'rgba(59,130,246,.15)' : '#eff6ff',  border:isDark ? 'rgba(59,130,246,.3)' : '#bfdbfe', title:'Analytics & Pixels', body:"Open a site's editor → Settings icon to add GA4, Meta Pixel, TikTok & more." },
    { icon:'history',       color:'#10b981', bg:isDark ? 'rgba(16,185,129,.15)' : '#f0fdf4',  border:isDark ? 'rgba(16,185,129,.3)' : '#bbf7d0', title:'Version history', body:'Every publish saves a snapshot. Restore any previous version from inside the editor.' },
  ];

  return (
    <div style={{ padding:'32px 28px', maxWidth:1200, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:800, color:t.textPrimary, margin:0, letterSpacing:-0.5 }}>Website Builder</h1>
          <p style={{ fontSize:13, color:t.textSecond, marginTop:5 }}>
            {loading ? 'Loading…' : `${sites.length} site${sites.length !== 1 ? 's' : ''} · ${publishedCount} live`}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* Search */}
          <div style={{ position:'relative' }}>
            <span className="material-icons" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:17, color:t.textMuted, pointerEvents:'none' }}>search</span>
            <input
              type="search" placeholder="Search sites…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding:'9px 14px 9px 34px', borderRadius:10, border:`1.5px solid ${t.border}`, fontSize:13, color:t.textPrimary, background:t.input, outline:'none', width:200, transition:'border-color .2s' }}
              onFocus={e => (e.target.style.borderColor = '#27491F')}
              onBlur={e => (e.target.style.borderColor = t.border)}
            />
          </div>
          <button type="button" onClick={() => setShowCreate(true)}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#27491F,#3a6b2e)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 16px rgba(39,73,31,.35)', transition:'opacity .15s,transform .1s', whiteSpace:'nowrap' }}
            onMouseEnter={e => { (e.currentTarget.style.opacity = '.9'); (e.currentTarget.style.transform = 'translateY(-1px)'); }}
            onMouseLeave={e => { (e.currentTarget.style.opacity = '1'); (e.currentTarget.style.transform = ''); }}>
            <span className="material-icons" style={{ fontSize:18 }}>add</span>
            New Site
          </button>
        </div>
      </div>

      {/* ── Legacy builder retirement notice (dismissable, one-time) ───── */}
      {showLegacyBanner && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 14,
          background: isDark ? 'rgba(99,102,241,.12)' : '#eef2ff',
          border: `1.5px solid ${isDark ? 'rgba(99,102,241,.3)' : '#c7d2fe'}`,
          borderRadius: 12, padding: '14px 18px', marginBottom: 24,
        }}>
          <span className="material-icons" style={{ color: '#6366f1', fontSize: 20, marginTop: 2, flexShrink: 0 }}>
            new_releases
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#a5b4fc' : '#3730a3', margin: 0 }}>
              Legacy HTML Builder Retired
            </p>
            <p style={{ fontSize: 13, color: isDark ? '#818cf8' : '#4338ca', margin: '4px 0 0', lineHeight: 1.55 }}>
              The old site builder has been replaced by this React-powered builder — now with multi-page support,
              a global theme system, per-page SEO, autosave, and a CDN image pipeline.
              All new sites are created and edited here.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissLegacyBanner}
            title="Dismiss"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: isDark ? '#818cf8' : '#6366f1', flexShrink: 0, lineHeight: 1,
            }}
          >
            <span className="material-icons" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
      )}

      {/* Multi-publish warning */}
      {!loading && publishedCount > 1 && (
        <div style={{ display:'flex', alignItems:'flex-start', gap:12, background:isDark ? 'rgba(251,191,36,.1)' : '#fffbeb', border:`1.5px solid ${isDark ? 'rgba(251,191,36,.25)' : '#fde68a'}`, borderRadius:12, padding:'14px 18px', marginBottom:24 }}>
          <span className="material-icons" style={{ color:'#f59e0b', fontSize:20, marginTop:1 }}>warning</span>
          <div>
            <p style={{ fontSize:14, fontWeight:600, color:isDark ? '#fbbf24' : '#92400e', margin:0 }}>Multiple sites published</p>
            <p style={{ fontSize:13, color:isDark ? '#d97706' : '#b45309', margin:'4px 0 0', lineHeight:1.5 }}>
              {publishedCount} sites are live. Only one serves your store. Click <strong>Publish</strong> on the correct one — others auto-unpublish.
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 0', gap:16 }}>
          <span className="material-icons" style={{ fontSize:48, color:'#27491F', animation:'spin 1s linear infinite' }}>autorenew</span>
          <p style={{ fontSize:14, color:t.textSecond, margin:0 }}>Loading your sites…</p>
        </div>
      ) : sites.length === 0 ? (
        <div style={{ background:isDark ? 'linear-gradient(135deg,#0f1025,#1a1b3e)' : 'linear-gradient(135deg,#f8fafc,#f1f5f9)', borderRadius:20, border:`2px dashed ${t.border}`, padding:'72px 32px', textAlign:'center' }}>
          <div style={{ width:80, height:80, borderRadius:20, margin:'0 auto 24px', background:'linear-gradient(135deg,#27491F,#4ade80)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span className="material-icons" style={{ fontSize:40, color:'#fff' }}>web</span>
          </div>
          <h2 style={{ fontSize:22, fontWeight:800, color:t.textPrimary, margin:'0 0 10px' }}>No websites yet</h2>
          <p style={{ fontSize:14, color:t.textSecond, margin:'0 0 32px', maxWidth:360, marginLeft:'auto', marginRight:'auto', lineHeight:1.6 }}>
            Create your first website and use the drag-and-drop builder to design it — no coding needed.
          </p>
          <button type="button" onClick={() => setShowCreate(true)}
            style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'13px 28px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#27491F,#3a6b2e)', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 8px 24px rgba(39,73,31,.35)' }}>
            <span className="material-icons" style={{ fontSize:20 }}>add</span>
            Create Your First Site
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ textAlign:'center', color:t.textSecond, padding:'48px 0', fontSize:14 }}>
          No sites match "<strong style={{ color:t.textPrimary }}>{search}</strong>"
        </p>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:20, marginBottom:36 }}>
          {filtered.map(site => (
            <SiteCard key={site.id} site={site} t={t}
              publishing={publishing} unpublishing={unpublishing} deleting={deleting}
              onEdit={() => navigate(`/ecommerce/builder?siteId=${site.id}`)}
              onPublish={() => handlePublishSite(site.id)}
              onUnpublish={() => handleUnpublishSite(site.id)}
              onDelete={() => handleDeleteSite(site.id, site.name)}
              onDuplicate={() => handleDuplicateSite(site)}
              onSettings={() => handleSettings(site.id)}
            />
          ))}
          {/* New site card */}
          <button type="button" onClick={() => setShowCreate(true)}
            style={{ minHeight:240, borderRadius:16, border:`2px dashed ${t.border}`, background:t.newCardBg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, cursor:'pointer', transition:'all .2s', color:t.textSecond }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#27491F'; e.currentTarget.style.color = t.newCardHoverColor; e.currentTarget.style.background = t.newCardHoverBg; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textSecond; e.currentTarget.style.background = t.newCardBg; }}>
            <div style={{ width:52, height:52, borderRadius:'50%', border:'2px dashed currentColor', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span className="material-icons" style={{ fontSize:28 }}>add</span>
            </div>
            <span style={{ fontSize:14, fontWeight:600 }}>New Site</span>
          </button>
        </div>
      )}

      {/* Info cards */}
      {!loading && sites.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16, marginTop:8 }}>
          {infoCards.map(item => (
            <div key={item.title} style={{ background:item.bg, borderRadius:12, border:`1px solid ${item.border}`, padding:'16px 18px', display:'flex', gap:14, alignItems:'flex-start' }}>
              <div style={{ width:38, height:38, borderRadius:10, background:t.surface, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 2px 8px ${t.shadow}` }}>
                <span className="material-icons" style={{ fontSize:20, color:item.color }}>{item.icon}</span>
              </div>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:t.textPrimary, margin:0 }}>{item.title}</p>
                <p style={{ fontSize:12, color:t.textSecond, margin:'4px 0 0', lineHeight:1.5 }}>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateSiteModal open={showCreateModal} onClose={() => setShowCreate(false)} onCreate={handleCreateSite} />
      )}
    </div>
  );
};

export default WebsiteBuilderPage;
