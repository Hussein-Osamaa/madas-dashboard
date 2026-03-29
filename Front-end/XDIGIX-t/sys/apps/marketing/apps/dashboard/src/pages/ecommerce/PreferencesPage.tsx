import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBusiness } from '../../contexts/BusinessContext';
import { doc, db, getDoc, getDocs, updateDoc, collection, query, orderBy, storage, ref, uploadBytes, getDownloadURL } from '../../lib/backend';
import FullScreenLoader from '../../components/common/FullScreenLoader';

/* ── Types ──────────────────────────────────────────────────────── */
type Preferences = {
  passwordProtection: {
    enabled: boolean;
    password: string;
    message: string;
  };
  seo: {
    homePageTitle: string;
    metaDescription: string;
    socialImage: string;
  };
  redirection: {
    countryRegion: boolean;
    language: boolean;
  };
  spamProtection: {
    contactForms: boolean;
    loginPages: boolean;
  };
};

const DEFAULT_PREFERENCES: Preferences = {
  passwordProtection: { enabled: false, password: '', message: '' },
  seo: { homePageTitle: '', metaDescription: '', socialImage: '' },
  redirection: { countryRegion: true, language: true },
  spamProtection: { contactForms: true, loginPages: true },
};

/* ── Toggle switch ──────────────────────────────────────────────── */
const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
      checked ? 'bg-primary' : 'bg-gray-200'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

/* ── Main page ──────────────────────────────────────────────────── */
const PreferencesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { businessId } = useBusiness();
  const siteId = searchParams.get('siteId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [resolvedSiteId, setResolvedSiteId] = useState<string | null>(siteId);
  const imageInputRef = useRef<HTMLInputElement>(null);

  /* ── Load — auto-detect site if no siteId param ─────────────── */
  useEffect(() => {
    (async () => {
      try {
        let targetId = siteId;

        // Auto-detect: grab the first site belonging to this business
        if (!targetId && businessId) {
          const sitesSnap = await getDocs(
            query(collection(db, 'sites'), orderBy('createdAt', 'desc'))
          );
          const mySite = sitesSnap.docs.find(d => d.data().businessId === businessId);
          if (mySite) targetId = mySite.id;
        }

        if (!targetId) { setLoading(false); return; }
        setResolvedSiteId(targetId);

        const snap = await getDoc(doc(db, 'sites', targetId));
        if (snap.exists()) {
          const data = snap.data();
          setSiteName(data.name || '');
          if (data.preferences) {
            setPrefs(prev => ({
              passwordProtection: { ...prev.passwordProtection, ...data.preferences.passwordProtection },
              seo: { ...prev.seo, ...data.preferences.seo },
              redirection: { ...prev.redirection, ...data.preferences.redirection },
              spamProtection: { ...prev.spamProtection, ...data.preferences.spamProtection },
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load preferences:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [siteId, businessId]);

  /* ── Save ───────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!resolvedSiteId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'sites', resolvedSiteId), { preferences: prefs });
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  /* ── Image upload ───────────────────────────────────────────── */
  const handleImageUpload = async (file: File) => {
    if (!resolvedSiteId || !businessId) return;
    setUploadingImage(true);
    try {
      const path = `businesses/${businessId}/sites/${resolvedSiteId}/social-sharing.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPrefs(p => ({ ...p, seo: { ...p.seo, socialImage: url } }));
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  /* ── Helpers ────────────────────────────────────────────────── */
  const update = <K extends keyof Preferences>(section: K, field: keyof Preferences[K], value: unknown) => {
    setPrefs(p => ({ ...p, [section]: { ...p[section], [field]: value } }));
  };

  if (loading) return <FullScreenLoader />;

  const domain = siteName ? `${siteName.toLowerCase().replace(/\s+/g, '')}.xdigix.com` : 'yourstore.xdigix.com';

  return (
    <div className="space-y-6 px-6 py-8 max-w-[960px] mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <span className="material-icons text-lg">arrow_back</span>
          </button>
          <div>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <span className="material-icons text-sm">storefront</span>
              Preferences
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">Preferences</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#1f3c19] transition-colors disabled:opacity-60 shadow-sm"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="material-icons animate-spin text-base">progress_activity</span>
              Saving…
            </span>
          ) : 'Save'}
        </button>
      </header>

      {/* ── Store access ─────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Store access</h2>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Password protection toggle */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="material-icons text-xl text-gray-400 mt-0.5">lock</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Password protection</p>
                <p className="text-xs text-gray-500">Restrict access to visitors with the password</p>
              </div>
            </div>
            <Toggle
              checked={prefs.passwordProtection.enabled}
              onChange={v => update('passwordProtection', 'enabled', v)}
            />
          </div>

          {prefs.passwordProtection.enabled && (
            <div className="ml-9 space-y-4 border rounded-lg p-4 bg-gray-50/50">
              {/* Info banner */}
              <div className="flex items-start gap-2 bg-blue-50 rounded-lg px-3 py-2.5 text-xs text-blue-700">
                <span className="material-icons text-sm mt-0.5">info</span>
                <span>To let anyone access your online store, remove your password.</span>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="text"
                  value={prefs.passwordProtection.password}
                  onChange={e => update('passwordProtection', 'password', e.target.value)}
                  placeholder="Enter a password"
                  maxLength={100}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-xs text-gray-400 mt-1">{prefs.passwordProtection.password.length} of 100 characters used</p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Message to your visitors</label>
                <textarea
                  value={prefs.passwordProtection.message}
                  onChange={e => update('passwordProtection', 'message', e.target.value)}
                  placeholder="Share a message with your visitors while your store is protected"
                  maxLength={5000}
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-xs text-gray-400 mt-1">{prefs.passwordProtection.message.length} of 5,000 characters used</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Social sharing image and SEO ──────────────────────── */}
      <section className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Social sharing image and SEO</h2>
          <span className="material-icons text-sm text-gray-400 cursor-help" title="This information is used when your store is shared on social media and for search engine optimization.">info</span>
        </div>
        <div className="px-6 py-5">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Social image preview */}
            <div className="w-full md:w-[280px] flex-shrink-0 space-y-3">
              <div className="aspect-[1200/628] bg-gray-50 border border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center overflow-hidden">
                {prefs.seo.socialImage ? (
                  <img src={prefs.seo.socialImage} alt="Social sharing" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {uploadingImage ? 'Uploading…' : 'Add image'}
                    </button>
                    <p className="text-xs text-gray-400 mt-2">Recommended: 1200 x 628 px</p>
                  </>
                )}
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
              {prefs.seo.socialImage && (
                <button
                  type="button"
                  onClick={() => { setPrefs(p => ({ ...p, seo: { ...p.seo, socialImage: '' } })); }}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  Remove image
                </button>
              )}

              {/* SEO preview card */}
              <div className="border rounded-lg p-3 space-y-0.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{domain}</p>
                <p className="text-sm font-medium text-gray-900 truncate">{prefs.seo.homePageTitle || domain}</p>
                <p className="text-xs text-gray-500 truncate">{siteName || 'Your store'}</p>
              </div>
            </div>

            {/* SEO fields */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Home page title</label>
                <input
                  type="text"
                  value={prefs.seo.homePageTitle}
                  onChange={e => update('seo', 'homePageTitle', e.target.value)}
                  placeholder={domain}
                  maxLength={70}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-xs text-gray-400 mt-1">{prefs.seo.homePageTitle.length} of 70 characters used</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Meta description</label>
                <textarea
                  value={prefs.seo.metaDescription}
                  onChange={e => update('seo', 'metaDescription', e.target.value)}
                  placeholder="Enter a description to be shown on search engines like Google"
                  maxLength={320}
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-xs text-gray-400 mt-1">{prefs.seo.metaDescription.length} of 320 characters used</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Automatic redirection ────────────────────────────── */}
      <section className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Automatic redirection</h2>
          <span className="material-icons text-sm text-gray-400 cursor-help" title="Automatically redirect visitors based on their location or browser language.">info</span>
        </div>
        <div className="px-6 divide-y divide-gray-100">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-start gap-3">
              <span className="material-icons text-xl text-gray-400">public</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Country/region</p>
                <p className="text-xs text-gray-500">Displays the storefront that matches a visitor&apos;s location</p>
              </div>
            </div>
            <Toggle
              checked={prefs.redirection.countryRegion}
              onChange={v => update('redirection', 'countryRegion', v)}
            />
          </div>
          <div className="flex items-center justify-between py-4">
            <div className="flex items-start gap-3">
              <span className="material-icons text-xl text-gray-400">translate</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Language</p>
                <p className="text-xs text-gray-500">Displays the language that matches a visitor&apos;s browser, when available</p>
              </div>
            </div>
            <Toggle
              checked={prefs.redirection.language}
              onChange={v => update('redirection', 'language', v)}
            />
          </div>
        </div>
      </section>

      {/* ── Spam protection ──────────────────────────────────── */}
      <section className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Spam protection</h2>
          <p className="text-xs text-gray-500 mt-1">Enabling hCaptcha can protect your store from spam. Some customers may need to complete the hCaptcha task.</p>
        </div>
        <div className="px-6 divide-y divide-gray-100">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-start gap-3">
              <span className="material-icons text-xl text-gray-400">chat_bubble_outline</span>
              <p className="text-sm font-medium text-gray-900">Enable on contact and comment forms</p>
            </div>
            <Toggle
              checked={prefs.spamProtection.contactForms}
              onChange={v => update('spamProtection', 'contactForms', v)}
            />
          </div>
          <div className="flex items-center justify-between py-4">
            <div className="flex items-start gap-3">
              <span className="material-icons text-xl text-gray-400">person_outline</span>
              <p className="text-sm font-medium text-gray-900">Enable on login, create account and password recovery pages</p>
            </div>
            <Toggle
              checked={prefs.spamProtection.loginPages}
              onChange={v => update('spamProtection', 'loginPages', v)}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default PreferencesPage;
