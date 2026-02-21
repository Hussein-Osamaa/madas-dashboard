import { useState } from 'react';

type Site = {
  id: string;
  name: string;
  url: string;
  customDomain?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  site: Site;
  onConnect: (siteId: string, domain: string) => Promise<void>;
};

type DomainProvider = 'godaddy' | 'namecheap' | 'cloudflare' | 'google' | 'other';

const PROVIDERS: { id: DomainProvider; name: string; logo: string }[] = [
  { id: 'godaddy', name: 'GoDaddy', logo: '🌐' },
  { id: 'namecheap', name: 'Namecheap', logo: '🔷' },
  { id: 'cloudflare', name: 'Cloudflare', logo: '☁️' },
  { id: 'google', name: 'Google Domains', logo: '🔍' },
  { id: 'other', name: 'Other Provider', logo: '⚙️' },
];

const DNS_INSTRUCTIONS: Record<DomainProvider, { steps: string[]; link: string }> = {
  godaddy: {
    steps: [
      'Log in to your GoDaddy account',
      'Go to "My Products" → "DNS"',
      'Click "DNS Management" for your domain',
      'Add the DNS records shown on the Custom Domains page',
      'Save changes and wait for propagation (15 mins - 48 hrs)',
    ],
    link: 'https://www.godaddy.com/help/manage-dns-680',
  },
  namecheap: {
    steps: [
      'Log in to your Namecheap account',
      'Go to "Domain List" → select your domain',
      'Click "Advanced DNS"',
      'Add the DNS records shown on the Custom Domains page',
      'Save all changes',
    ],
    link: 'https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/',
  },
  cloudflare: {
    steps: [
      'Log in to your Cloudflare dashboard',
      'Select your domain',
      'Go to "DNS" section',
      'Add the DNS records shown on the Custom Domains page (set Proxy status to "DNS only")',
      'Save changes',
    ],
    link: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/',
  },
  google: {
    steps: [
      'Log in to Google Domains',
      'Select your domain',
      'Go to "DNS" in the left menu',
      'Under "Custom records", add the records below',
      'Click "Save"',
    ],
    link: 'https://support.google.com/domains/answer/3290350',
  },
  other: {
    steps: [
      'Log in to your domain registrar',
      'Find DNS settings / DNS management',
      'Add the DNS records shown on the Custom Domains page',
      'Save your changes',
      'Wait for DNS propagation (can take up to 48 hours)',
    ],
    link: '',
  },
};

const DomainModal = ({ open, onClose, site, onConnect }: Props) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [domain, setDomain] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<DomainProvider | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateDomain = (domainInput: string): boolean => {
    // Remove http/https and www
    const cleanDomain = domainInput
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .trim();
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    return domainRegex.test(cleanDomain);
  };

  const cleanDomain = (input: string): string => {
    return input
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')
      .trim();
  };

  const handleNextStep = () => {
    if (step === 1) {
      setError(null);
      const cleaned = cleanDomain(domain);
      if (!cleaned) {
        setError('Please enter a domain name');
        return;
      }
      if (!validateDomain(cleaned)) {
        setError('Please enter a valid domain (e.g., mystore.com or shop.example.com)');
        return;
      }
      setDomain(cleaned);
      setStep(2);
    } else if (step === 2) {
      if (!selectedProvider) {
        setError('Please select your domain provider');
        return;
      }
      setError(null);
      setStep(3);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await onConnect(site.id, domain);
      // Close modal on success - parent handles the rest
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect domain';
      setError(msg);
      alert(msg);
    } finally {
      setConnecting(false);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleClose = () => {
    setStep(1);
    setDomain('');
    setSelectedProvider(null);
    setError(null);
    onClose();
  };

  if (!open) return null;

  const instructions = selectedProvider ? DNS_INSTRUCTIONS[selectedProvider] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-icons text-primary">language</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">Connect Custom Domain</h2>
              <p className="text-sm text-madas-text/60">{site.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={connecting}
            className="p-2 rounded-full hover:bg-base transition-colors disabled:opacity-50"
          >
            <span className="material-icons text-madas-text/60">close</span>
          </button>
        </header>

        {/* Progress Steps */}
        <div className="px-6 py-3 bg-base/50 border-b border-gray-100">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    step >= s
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step > s ? (
                    <span className="material-icons text-lg">check</span>
                  ) : (
                    s
                  )}
                </div>
                {s < 3 && (
                  <div
                    className={`w-16 h-1 mx-1 rounded ${
                      step > s ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-madas-text/60">
            <span className="w-20 text-center">Enter Domain</span>
            <span className="w-20 text-center">Select Provider</span>
            <span className="w-20 text-center">Configure DNS</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step 1: Enter Domain */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="material-icons text-blue-600 text-xl">info</span>
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Use your own domain</p>
                    <p>Connect a domain you own from any registrar (GoDaddy, Namecheap, Cloudflare, etc.) to your store.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-madas-text mb-2">
                  Your Domain Name
                </label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-madas-text/40">
                    public
                  </span>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => {
                      setDomain(e.target.value);
                      setError(null);
                    }}
                    placeholder="mystore.com or shop.mybrand.com"
                    className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-xs text-madas-text/60">
                  Enter your domain without http:// or www (e.g., mystore.com)
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <p className="text-sm font-medium text-madas-text mb-2">You can use:</p>
                <ul className="text-sm text-madas-text/70 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="material-icons text-green-500 text-base">check_circle</span>
                    Root domain (e.g., mystore.com)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-icons text-green-500 text-base">check_circle</span>
                    Subdomain (e.g., shop.mybrand.com)
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Select Provider */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-madas-text/70 mb-4">
                  Where did you register <strong className="text-primary">{domain}</strong>?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => {
                        setSelectedProvider(provider.id);
                        setError(null);
                      }}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        selectedProvider === provider.id
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-2xl">{provider.logo}</span>
                      <span className="font-medium text-primary">{provider.name}</span>
                      {selectedProvider === provider.id && (
                        <span className="material-icons text-primary ml-auto">check_circle</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: DNS Configuration */}
          {step === 3 && instructions && (
            <div className="space-y-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="material-icons text-amber-600 text-xl">warning</span>
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">DNS Changes Required</p>
                    <p>
                      After you click <strong>Connect Domain</strong>, we’ll generate the exact DNS records for your domain and show them on the
                      <strong> Custom Domains</strong> page.
                    </p>
                  </div>
                </div>
              </div>

              {/* Provider-specific steps */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-primary flex items-center gap-2">
                    <span className="text-xl">{PROVIDERS.find(p => p.id === selectedProvider)?.logo}</span>
                    {PROVIDERS.find(p => p.id === selectedProvider)?.name} Setup
                  </h3>
                  {instructions.link && (
                    <a
                      href={instructions.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View guide <span className="material-icons text-sm">open_in_new</span>
                    </a>
                  )}
                </div>
                <ol className="text-sm text-madas-text/70 space-y-2">
                  {instructions.steps.map((stepText, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                        {idx + 1}
                      </span>
                      {stepText}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="material-icons text-green-600 text-xl">tips_and_updates</span>
                  <div className="text-sm text-green-800">
                    <p className="font-semibold mb-1">After adding DNS records</p>
                    <p>
                      Add the DNS records shown on the <strong>Custom Domains</strong> page, wait for propagation, then click <strong>Verify Domain</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 flex items-center gap-2">
              <span className="material-icons text-red-600">error</span>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={connecting}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-madas-text/70 hover:bg-white transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <span className="material-icons text-base">arrow_back</span>
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            disabled={connecting}
            className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-madas-text/70 hover:bg-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={step === 3 ? handleConnect : handleNextStep}
            disabled={connecting || (step === 1 && !domain.trim()) || (step === 2 && !selectedProvider)}
            className="flex-1 rounded-xl bg-primary text-white px-4 py-3 text-sm font-semibold hover:bg-[#1f3c19] transition-colors disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
          >
            {connecting ? (
              <>
                <span className="material-icons animate-spin text-lg">progress_activity</span>
                Connecting...
              </>
            ) : step === 3 ? (
              <>
                <span className="material-icons text-lg">check_circle</span>
                Connect Domain
              </>
            ) : (
              <>
                Continue
                <span className="material-icons text-lg">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DomainModal;
