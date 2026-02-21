import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { useBusiness } from '../../contexts/BusinessContext';
import { collection, db, getDocs, query, where, updateDoc, doc } from '../../lib/firebase';
import DomainModal from '../../components/ecommerce/DomainModal';
import { getCustomDomainUrl, getDefaultPublishedSiteUrl } from '../../utils/siteUrls';

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

type DomainStatus = 'none' | 'pending_dns' | 'dns_configured' | 'verifying' | 'verified' | 'ssl_pending' | 'active' | 'broken' | 'failed' | 'pending';

type DnsRecord = {
  type: string;
  host: string;
  value: string;
  id: string;
};

type DnsRecords = {
  aRecords?: DnsRecord[];
  txtRecords?: DnsRecord[];
  cnameRecord?: DnsRecord;
};

type Site = {
  id: string;
  name: string;
  url: string;
  customDomain?: string;
  customDomainId?: string;
  domainStatus?: DomainStatus;
  domainVerificationToken?: string;
  domainVerifiedAt?: Date;
  domainProvider?: string;
  sslStatus?: 'pending' | 'active' | 'failed';
  dnsRecords?: DnsRecords;
  firebaseSiteId?: string;
  slug?: string;
};

// Default fallback config - will be replaced by actual values from Firebase
const getDefaultHostingConfig = (firebaseSiteId?: string) => ({
  cnameTarget: `${firebaseSiteId || 'madas-sites-c3c5e'}.web.app`,
  aRecordIP: '199.36.158.100',
  txtRecord: `hosting-site=${firebaseSiteId || 'madas-sites-c3c5e'}`,
});

function isSubdomainDomain(domain: string): boolean {
  const parts = domain.split('.').filter(Boolean);
  return parts.length > 2 && parts[0] !== 'www';
}

function getSubdomainHost(domain: string): string {
  const parts = domain.split('.').filter(Boolean);
  if (parts.length <= 2) return 'www';
  return parts[0] || 'www';
}

function normalizeDnsRecords(domain: string, firebaseSiteId?: string, raw?: unknown): DnsRecords {
  const defaults = getDefaultHostingConfig(firebaseSiteId);
  const rawAny = (raw || {}) as any;
  const isSub = isSubdomainDomain(domain);

  // A records
  let aRecords: DnsRecord[] | undefined;
  if (Array.isArray(rawAny.aRecords)) {
    // Either array of IPs (strings) OR array of record objects
    if (rawAny.aRecords.length > 0 && typeof rawAny.aRecords[0] === 'string') {
      aRecords = rawAny.aRecords.map((ip: string, i: number) => ({
        type: 'A',
        host: '@',
        value: ip,
        id: `a-${i}`,
      }));
    } else {
      aRecords = rawAny.aRecords
        .filter(Boolean)
        .map((r: any, i: number) => ({
          type: r.type || 'A',
          host: r.host || '@',
          value: r.value || defaults.aRecordIP,
          id: r.id || `a-${i}`,
        }));
    }
  } else if (!isSub) {
    aRecords = [
      { type: 'A', host: '@', value: defaults.aRecordIP, id: 'a-0' }
    ];
  }

  // TXT records
  let txtRecords: DnsRecord[] | undefined;
  if (Array.isArray(rawAny.txtRecords)) {
    txtRecords = rawAny.txtRecords
      .filter(Boolean)
      .map((r: any, i: number) => ({
        type: 'TXT',
        host: r.host || '@',
        value: r.value || defaults.txtRecord,
        id: r.id || `txt-${i}`,
      }));
  } else if (rawAny.txtRecord && typeof rawAny.txtRecord === 'object') {
    txtRecords = [
      {
        type: 'TXT',
        host: rawAny.txtRecord.host || (isSub ? domain : '@'),
        value: rawAny.txtRecord.value || defaults.txtRecord,
        id: 'txt-0',
      },
    ];
  } else {
    txtRecords = [
      { type: 'TXT', host: isSub ? domain : '@', value: defaults.txtRecord, id: 'txt-0' }
    ];
  }

  // CNAME record
  let cnameRecord: DnsRecord | undefined;
  if (rawAny.cnameRecord && typeof rawAny.cnameRecord === 'object') {
    cnameRecord = {
      type: 'CNAME',
      host: rawAny.cnameRecord.host || (isSub ? getSubdomainHost(domain) : 'www'),
      value: rawAny.cnameRecord.value || defaults.cnameTarget,
      id: rawAny.cnameRecord.id || 'cname-0',
    };
  } else if (typeof rawAny.cnameTarget === 'string' && rawAny.cnameTarget.trim()) {
    cnameRecord = {
      type: 'CNAME',
      host: isSub ? getSubdomainHost(domain) : 'www',
      value: rawAny.cnameTarget.trim(),
      id: 'cname-0',
    };
  } else {
    // For root domains, we show the recommended www -> root redirect.
    // For subdomains, CNAME points to our hosting target.
    cnameRecord = {
      type: 'CNAME',
      host: isSub ? getSubdomainHost(domain) : 'www',
      value: isSub ? defaults.cnameTarget : domain,
      id: 'cname-0',
    };
  }

  return { aRecords, txtRecords, cnameRecord };
}

const CustomDomainsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { businessId } = useBusiness();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const loadSites = useCallback(async () => {
      if (!businessId) return;
      try {
        const sitesRef = collection(db, 'businesses', businessId, 'published_sites');
        const sitesQuery = query(sitesRef, where('status', '==', 'published'));
        const snapshot = await getDocs(sitesQuery);

        // Also fetch custom domains to get latest status
        const customDomainsRef = collection(db, 'customDomains');
        const customDomainsQuery = query(customDomainsRef, where('tenantId', '==', businessId));
        const customDomainsSnapshot = await getDocs(customDomainsQuery);
        
        // Create a map of domain -> status for quick lookup
        const domainStatusMap = new Map<string, { status: DomainStatus; sslStatus?: string; dnsRecords?: DnsRecords }>();
        customDomainsSnapshot.docs.forEach((doc) => {
          const domainData = doc.data();
          domainStatusMap.set(domainData.domain, {
            status: (domainData.status as DomainStatus) || 'pending_dns',
            sslStatus: domainData.sslStatus,
            dnsRecords: domainData.dnsRecords,
          });
        });

        const loadedSites: Site[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const customDomain = data.customDomain;
          
          // Get latest status from customDomains collection if domain exists
          let domainStatus: DomainStatus = (data.domainStatus as DomainStatus) || 'none';
          let sslStatus = data.sslStatus;
          const rawDnsRecords = data.dnsRecords;
          
          if (customDomain && domainStatusMap.has(customDomain)) {
            const domainInfo = domainStatusMap.get(customDomain)!;
            domainStatus = domainInfo.status;
            sslStatus = domainInfo.sslStatus || sslStatus;
          }

          const mergedRawDnsRecords =
            customDomain && domainStatusMap.has(customDomain)
              ? domainStatusMap.get(customDomain)!.dnsRecords || rawDnsRecords
              : rawDnsRecords;
          
          return {
            id: docSnap.id,
            name: data.name || 'My Store',
            url: data.url || data.previewUrl || getDefaultPublishedSiteUrl(docSnap.id, data.slug),
            customDomain: customDomain,
            customDomainId: data.customDomainId,
            domainStatus: domainStatus,
            domainVerificationToken: data.domainVerificationToken,
            domainVerifiedAt: data.domainVerifiedAt?.toDate?.() || undefined,
            domainProvider: data.domainProvider,
            sslStatus: sslStatus,
            dnsRecords: customDomain ? normalizeDnsRecords(customDomain, data.firebaseSiteId, mergedRawDnsRecords) : undefined,
            firebaseSiteId: data.firebaseSiteId,
            slug: data.slug,
          };
        });

        setSites(loadedSites);
      } catch (error) {
        console.error('Failed to load sites:', error);
      } finally {
        setLoading(false);
      }
  }, [businessId]);

  useEffect(() => {
    void loadSites();
  }, [loadSites]);

  // If navigated here with ?siteId=..., auto-open the connect domain modal for that site
  useEffect(() => {
    const requestedSiteId = searchParams.get('siteId');
    if (!requestedSiteId || loading) return;
    if (domainModalOpen) return;

    const site = sites.find((s) => s.id === requestedSiteId);
    if (!site) return;

    setSelectedSite(site);
    setDomainModalOpen(true);

    // Clean up the URL (optional)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('siteId');
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams, sites, loading, domainModalOpen]);

  const handleCopy = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleAddDomain = (site: Site) => {
    setSelectedSite(site);
    setDomainModalOpen(true);
  };

  const handleConnectDomain = async (siteId: string, domain: string) => {
    if (!businessId) {
      const msg = 'Business is still loading. Please refresh the page and try again.';
      alert(msg);
      throw new Error(msg);
    }
    try {
      // Clean the domain (remove protocol and trailing slashes)
      const cleanDomain = domain.toLowerCase().trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '')
        .replace(/^www\./, '');
      
      if (!cleanDomain || cleanDomain.length < 3) {
        const msg = 'Please enter a valid domain name (e.g., mystore.com)';
        alert(msg);
        throw new Error(msg);
      }
      
      console.log('Connecting domain via HTTP endpoint:', { businessId, siteId, domain: cleanDomain });
      
      // Call the HTTP endpoint directly for better reliability
      let response: Response;
      try {
        response = await fetch('https://us-central1-madas-store.cloudfunctions.net/connectDomainHttp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessId,
            siteId,
            domain: cleanDomain,
          }),
        });
      } catch (networkError: any) {
        console.error('Network error connecting domain:', networkError);
        const msg = `Network error: ${networkError?.message || 'Failed to reach server'}. Please check your internet connection and try again.`;
        alert(msg);
        throw new Error(msg);
      }
      
      let result: any;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        const text = await response.text().catch(() => '');
        console.error('Response text:', text);
        const msg = `Server returned invalid response (${response.status}). Please try again.`;
        alert(msg);
        throw new Error(msg);
      }
      
      if (!response.ok) {
        const errorMsg = result?.error || result?.message || `Server error (${response.status})`;
        console.error('Server error response:', result);
        alert(`Failed to connect domain: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      if (result && result.success === false) {
        const errorMsg = result.error || 'Failed to connect domain';
        console.error('Domain connection failed:', result);
        alert(`Failed to connect domain: ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      console.log('Domain connection result:', result);
      
      // Check if domain was already registered but now linked to this site
      const wasAlreadyRegistered = result.status === 'pending_dns' || result.status === 'ssl_pending' || result.status === 'active';
      
      // Reload sites to get updated DNS records
      await loadSites();
      
      // Close modal but keep showing DNS instructions
      setDomainModalOpen(false);
      setSelectedSite(null);
      
      // Show appropriate success message
      if (wasAlreadyRegistered && result.dnsRecords) {
        alert(`✅ Domain "${cleanDomain}" is now linked to this site!\n\nDNS records are shown below. If you haven't added them yet:\n1. Add the DNS records to your domain registrar\n2. Wait for DNS propagation (15 min - 48 hours)\n3. Click "Verify Domain" to complete setup`);
      } else {
        alert(`✅ Domain "${cleanDomain}" connected!\n\nNext steps:\n1. Add the DNS records shown below to your domain registrar\n2. Wait for DNS propagation (15 min - 48 hours)\n3. Click "Verify Domain" to complete setup`);
      }
      
    } catch (error: any) {
      console.error('Failed to connect domain:', error);
      // Error already shown via alert above, but re-throw so modal can show it too
      throw error;
    }
  };

  const handleVerifyDomain = async (siteId: string) => {
    if (!businessId) {
      alert('Business is still loading. Please refresh the page and try again.');
      return;
    }
    setVerifyingDomain(siteId);
    
    try {
      const site = sites.find(s => s.id === siteId);
      if (!site?.customDomain) {
        throw new Error('No domain configured');
      }

      console.log('Verifying domain via HTTP endpoint:', { businessId, siteId, domain: site.customDomain });
      
      // Call the HTTP endpoint directly
      const response = await fetch('https://us-central1-madas-store.cloudfunctions.net/verifyDomainHttp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          siteId,
          domain: site.customDomain,
        }),
      });
      
      const result = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify domain');
      }
      if (result && result.success === false) {
        throw new Error(result.error || 'Failed to verify domain');
      }
      
      console.log('Domain verification result:', result);
      
      await loadSites();
    } catch (error: any) {
      console.error('Failed to verify domain:', error);
      alert(error?.message || 'Failed to verify domain. Please check your DNS records and try again.');
      await loadSites();
    } finally {
      setVerifyingDomain(null);
    }
  };

  const handleRemoveDomain = async (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    if (!site?.customDomain) return;
    
    if (!confirm(`Are you sure you want to remove ${site.customDomain}? Your store will only be accessible via the default URL.`)) return;
    if (!businessId) {
      alert('Business is still loading. Please refresh the page and try again.');
      return;
    }

    try {
      console.log('Removing domain via HTTP endpoint:', { businessId, siteId, domain: site.customDomain });
      
      // Call the backend to properly remove the domain from Firebase Hosting and Firestore
      const response = await fetch('https://us-central1-madas-store.cloudfunctions.net/removeDomain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          siteId,
          // Let the backend resolve the correct customDomains document ID from the siteId
        }),
      });
      
      const result = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove domain');
      }
      if (result && result.success === false) {
        throw new Error(result.error || 'Failed to remove domain');
      }
      
      console.log('Domain removed successfully:', result);
      await loadSites();
    } catch (error: any) {
      console.error('Failed to remove domain:', error);
      
      // Fallback: Update site document directly if backend fails
      try {
        const siteRef = doc(db, 'businesses', businessId, 'published_sites', siteId);
        await updateDoc(siteRef, {
          customDomain: null,
          domainStatus: 'none',
          domainVerificationToken: null,
          domainVerifiedAt: null,
          domainProvider: null,
          sslStatus: null,
          dnsRecords: null,
        });
        await loadSites();
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        alert('Failed to remove domain. Please try again.');
      }
    }
  };

  const getStatusConfig = (status: DomainStatus) => {
    switch (status) {
      case 'active':
        return {
          badge: 'bg-green-100 text-green-700 border-green-200',
          label: 'Active',
          icon: 'check_circle',
          iconColor: 'text-green-600',
        };
      case 'ssl_pending':
        return {
          badge: 'bg-blue-100 text-blue-700 border-blue-200',
          label: 'SSL Pending',
          icon: 'lock_clock',
          iconColor: 'text-blue-600',
        };
      case 'verified':
        return {
          badge: 'bg-blue-100 text-blue-700 border-blue-200',
          label: 'Verified',
          icon: 'verified',
          iconColor: 'text-blue-600',
        };
      case 'dns_configured':
        return {
          badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',
          label: 'DNS Configured',
          icon: 'dns',
          iconColor: 'text-cyan-600',
        };
      case 'pending_dns':
        return {
          badge: 'bg-yellow-100 text-yellow-700 border-yellow-200',
          label: 'Pending DNS',
          icon: 'schedule',
          iconColor: 'text-yellow-600',
        };
      case 'pending':
        return {
          badge: 'bg-yellow-100 text-yellow-700 border-yellow-200',
          label: 'Pending Verification',
          icon: 'schedule',
          iconColor: 'text-yellow-600',
        };
      case 'verifying':
        return {
          badge: 'bg-amber-100 text-amber-700 border-amber-200',
          label: 'Verifying...',
          icon: 'sync',
          iconColor: 'text-amber-600',
        };
      case 'broken':
        return {
          badge: 'bg-red-100 text-red-700 border-red-200',
          label: 'Broken',
          icon: 'error',
          iconColor: 'text-red-600',
        };
      case 'failed':
        return {
          badge: 'bg-red-100 text-red-700 border-red-200',
          label: 'Verification Failed',
          icon: 'error',
          iconColor: 'text-red-600',
        };
      case 'none':
      default:
        return {
          badge: 'bg-gray-100 text-gray-600 border-gray-200',
          label: 'No Domain',
          icon: 'language',
          iconColor: 'text-gray-400',
        };
    }
  };

  // DNS Configuration Component
  const DNSConfigurationPanel = ({ site }: { site: Site }) => {
    // Always allow viewing DNS records if a custom domain exists.
    // (Users often need to re-check DNS even when "Active".)
    if (!site.customDomain) {
      return null;
    }

    const isSub = isSubdomainDomain(site.customDomain);
    const isActive = site.domainStatus === 'active';

    return (
      <details
        className={clsx(
          'mt-6 rounded-2xl border-2 overflow-hidden',
          isActive
            ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50'
            : 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50'
        )}
        open={!isActive}
      >
        <summary className={clsx(
          'cursor-pointer select-none px-6 py-4 border-b flex items-center justify-between gap-4',
          isActive ? 'bg-green-100 border-green-200' : 'bg-amber-100 border-amber-200'
        )}>
          <div className="flex items-center gap-3">
            <div className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              isActive ? 'bg-green-600' : 'bg-amber-500'
            )}>
              <span className="material-icons text-white text-xl">dns</span>
            </div>
            <div>
              <h3 className={clsx('text-lg font-bold', isActive ? 'text-green-900' : 'text-amber-900')}>
                {isActive ? 'DNS Records (Connected)' : 'DNS Configuration Required'}
              </h3>
              <p className={clsx('text-sm', isActive ? 'text-green-700' : 'text-amber-700')}>
                {isActive
                  ? 'Keep these for reference (or if you change DNS provider).'
                  : 'Add these records at your domain registrar (GoDaddy, Namecheap, etc.)'}
              </p>
            </div>
          </div>
          <span className={clsx('material-icons', isActive ? 'text-green-700' : 'text-amber-700')}>expand_more</span>
        </summary>

        <div className="p-6 space-y-6">
          {/* Simple Steps */}
          {!isActive && (
            <div className="bg-white rounded-xl p-5 border border-amber-200">
              <h4 className="font-bold text-amber-900 mb-4 flex items-center gap-2">
                <span className="material-icons text-amber-600">list_alt</span>
              Follow These Steps
              </h4>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500 text-white text-sm font-bold flex items-center justify-center">1</span>
                  <div>
                    <p className="font-medium text-gray-800">Log in to your domain registrar</p>
                    <p className="text-sm text-gray-600">Go to GoDaddy, Namecheap, Cloudflare, or wherever you bought your domain</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500 text-white text-sm font-bold flex items-center justify-center">2</span>
                  <div>
                    <p className="font-medium text-gray-800">Find DNS Settings</p>
                    <p className="text-sm text-gray-600">Look for "DNS", "DNS Management", or "DNS Records" in your domain settings</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500 text-white text-sm font-bold flex items-center justify-center">3</span>
                  <div>
                    <p className="font-medium text-gray-800">Add the DNS records below</p>
                    <p className="text-sm text-gray-600">Copy the values exactly as shown</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500 text-white text-sm font-bold flex items-center justify-center">4</span>
                  <div>
                    <p className="font-medium text-gray-800">Wait & Verify</p>
                    <p className="text-sm text-gray-600">DNS changes take 15 minutes to 48 hours. Then click "Verify Domain"</p>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {/* DNS Records - Dynamic from Firebase */}
          <div className="space-y-4">
            <h4 className="font-bold text-amber-900 flex items-center gap-2">
              <span className="material-icons text-amber-600">settings_ethernet</span>
              DNS Records to Add
            </h4>

            {/* A Records (root domains) */}
            {!isSub && (site.dnsRecords?.aRecords || [{ type: 'A', host: '@', value: getDefaultHostingConfig(site.firebaseSiteId).aRecordIP, id: 'a-0' }]).map((record, index) => (
              <div key={record.id || `a-${index}`} className="bg-white rounded-xl border-2 border-green-200 overflow-hidden">
                <div className="bg-green-50 px-4 py-2 border-b border-green-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded">A RECORD {(site.dnsRecords?.aRecords?.length || 0) > 1 ? `#${index + 1}` : ''}</span>
                    <span className="text-sm text-green-800 font-medium">Points {site.customDomain} to Firebase Hosting</span>
                  </div>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Required</span>
                </div>
                <div className="p-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Type</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg font-mono text-sm text-gray-800">A</code>
                        <button
                          type="button"
                          onClick={() => handleCopy('A', `a-type-${index}`)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Copy"
                        >
                          <span className="material-icons text-lg text-gray-500">
                            {copiedField === `a-type-${index}` ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Host / Name</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg font-mono text-sm text-gray-800">{record.host}</code>
                        <button
                          type="button"
                          onClick={() => handleCopy(record.host, `a-host-${index}`)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Copy"
                        >
                          <span className="material-icons text-lg text-gray-500">
                            {copiedField === `a-host-${index}` ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">@ means root domain ({site.customDomain})</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Points to / Value</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-green-100 px-3 py-2 rounded-lg font-mono text-sm text-green-800 font-bold">{record.value}</code>
                        <button
                          type="button"
                          onClick={() => handleCopy(record.value, `a-value-${index}`)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Copy"
                        >
                          <span className="material-icons text-lg text-gray-500">
                            {copiedField === `a-value-${index}` ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* TXT Records - Dynamic */}
            {(site.dnsRecords?.txtRecords || [{ type: 'TXT', host: '@', value: getDefaultHostingConfig(site.firebaseSiteId).txtRecord, id: 'txt-0' }]).map((record, index) => (
              <div key={record.id || `txt-${index}`} className="bg-white rounded-xl border-2 border-purple-200 overflow-hidden">
                <div className="bg-purple-50 px-4 py-2 border-b border-purple-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-bold rounded">TXT {(site.dnsRecords?.txtRecords?.length || 0) > 1 ? `#${index + 1}` : ''}</span>
                    <span className="text-sm text-purple-800 font-medium">Verification record for Firebase</span>
                  </div>
                  <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">Required</span>
                </div>
                <div className="p-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Type</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg font-mono text-sm text-gray-800">TXT</code>
                        <button
                          type="button"
                          onClick={() => handleCopy('TXT', `txt-type-${index}`)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Copy"
                        >
                          <span className="material-icons text-lg text-gray-500">
                            {copiedField === `txt-type-${index}` ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Host / Name</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg font-mono text-sm text-gray-800">{record.host}</code>
                        <button
                          type="button"
                          onClick={() => handleCopy(record.host, `txt-host-${index}`)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Copy"
                        >
                          <span className="material-icons text-lg text-gray-500">
                            {copiedField === `txt-host-${index}` ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Value</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-purple-100 px-3 py-2 rounded-lg font-mono text-sm text-purple-800 font-bold break-all">{record.value}</code>
                        <button
                          type="button"
                          onClick={() => handleCopy(record.value, `txt-value-${index}`)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Copy"
                        >
                          <span className="material-icons text-lg text-gray-500">
                            {copiedField === `txt-value-${index}` ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* CNAME Record - Dynamic */}
            {(() => {
              // Normalize CNAME value to ensure it's always just a hostname (no protocol, no paths)
              const normalizeHostname = (value: string) => {
                return value
                  .replace(/^https?:\/\//, '') // Remove protocol
                  .replace(/\/.*$/, '') // Remove any paths
                  .trim();
              };
              
              const rawCnameValue = site.dnsRecords?.cnameRecord?.value || 
                (isSub ? getDefaultHostingConfig(site.firebaseSiteId).cnameTarget : site.customDomain);
              
              const cnameRecord = site.dnsRecords?.cnameRecord || {
                type: 'CNAME',
                host: isSub ? getSubdomainHost(site.customDomain) : 'www',
                value: normalizeHostname(rawCnameValue),
                id: 'cname-0'
              };
              
              // Ensure value is normalized even if it came from dnsRecords
              cnameRecord.value = normalizeHostname(cnameRecord.value);
              return (
                <div className="bg-white rounded-xl border-2 border-blue-200 overflow-hidden">
                  <div className="bg-blue-50 px-4 py-2 border-b border-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded">CNAME</span>
                      <span className="text-sm text-blue-800 font-medium">
                        {isSub
                          ? `Points ${site.customDomain} to hosting`
                          : `Redirects www.${site.customDomain} to ${site.customDomain}`}
                      </span>
                    </div>
                    <span className={clsx(
                      'text-xs px-2 py-1 rounded-full',
                      isSub ? 'text-blue-600 bg-blue-100' : 'text-gray-600 bg-gray-100'
                    )}>
                      {isSub ? 'Required' : 'Optional'}
                    </span>
                  </div>
                  {!isSub && (
                    <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-2 text-xs text-amber-800">
                      <strong>Note:</strong> This CNAME is for <code className="bg-amber-100 px-1 rounded">www</code> only. For the root domain (<code className="bg-amber-100 px-1 rounded">@</code>), use the <strong>A record</strong> above, not CNAME.
                    </div>
                  )}
                  <div className="p-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Type</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg font-mono text-sm text-gray-800">CNAME</code>
                          <button
                            type="button"
                            onClick={() => handleCopy('CNAME', 'cname-type')}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Copy"
                          >
                            <span className="material-icons text-lg text-gray-500">
                              {copiedField === 'cname-type' ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Host / Name</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg font-mono text-sm text-gray-800">{cnameRecord.host}</code>
                          <button
                            type="button"
                            onClick={() => handleCopy(cnameRecord.host, 'cname-host')}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Copy"
                          >
                            <span className="material-icons text-lg text-gray-500">
                              {copiedField === 'cname-host' ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Points to / Value</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-blue-100 px-3 py-2 rounded-lg font-mono text-sm text-blue-800 font-bold">{cnameRecord.value.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}</code>
                          <button
                            type="button"
                            onClick={() => handleCopy(cnameRecord.value.replace(/^https?:\/\//, '').replace(/\/.*$/, ''), 'cname-value')}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Copy"
                          >
                            <span className="material-icons text-lg text-gray-500">
                              {copiedField === 'cname-value' ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          ⚠️ Enter only the hostname (no <code className="bg-gray-100 px-1 rounded">https://</code> or paths like <code className="bg-gray-100 px-1 rounded">/site/...</code>)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Provider-specific help */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="material-icons text-gray-600">help_outline</span>
              Quick Links to DNS Settings
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <a
                href="https://www.godaddy.com/help/manage-dns-680"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <span className="text-2xl">🌐</span>
                <div>
                  <p className="font-medium text-gray-800 group-hover:text-primary">GoDaddy</p>
                  <p className="text-xs text-gray-500">DNS Guide</p>
                </div>
                <span className="material-icons text-gray-400 ml-auto text-sm">open_in_new</span>
              </a>
              <a
                href="https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <span className="text-2xl">🔷</span>
                <div>
                  <p className="font-medium text-gray-800 group-hover:text-primary">Namecheap</p>
                  <p className="text-xs text-gray-500">DNS Guide</p>
                </div>
                <span className="material-icons text-gray-400 ml-auto text-sm">open_in_new</span>
              </a>
              <a
                href="https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <span className="text-2xl">☁️</span>
                <div>
                  <p className="font-medium text-gray-800 group-hover:text-primary">Cloudflare</p>
                  <p className="text-xs text-gray-500">DNS Guide</p>
                </div>
                <span className="material-icons text-gray-400 ml-auto text-sm">open_in_new</span>
              </a>
              <a
                href="https://support.google.com/domains/answer/3290350"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <span className="text-2xl">🔍</span>
                <div>
                  <p className="font-medium text-gray-800 group-hover:text-primary">Google</p>
                  <p className="text-xs text-gray-500">DNS Guide</p>
                </div>
                <span className="material-icons text-gray-400 ml-auto text-sm">open_in_new</span>
              </a>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <span className="material-icons text-blue-600 flex-shrink-0">info</span>
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Important Notes:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>DNS changes can take <strong>15 minutes to 48 hours</strong> to take effect worldwide</li>
                  <li>If using Cloudflare, set the proxy status to <strong>"DNS Only"</strong> (gray cloud)</li>
                  <li>Some registrars use "Host" instead of "Name" - they mean the same thing</li>
                  <li>After adding records, click <strong>"Verify Domain"</strong> to check if they're active</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </details>
    );
  };

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Custom Domains</h1>
          <p className="text-sm text-madas-text/70 mt-1">Connect your own domain from any registrar to your store</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/ecommerce/website-builder')}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-madas-text/70 hover:bg-base transition-colors flex items-center gap-2"
        >
          <span className="material-icons text-lg">build</span>
          Website Builder
        </button>
      </header>

      {/* How it works - Simplified */}
      <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="material-icons text-primary text-2xl">rocket_launch</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-primary mb-3">Get Your Store on Your Own Domain</h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 bg-white/60 rounded-xl p-3">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold flex-shrink-0">1</div>
                <p className="text-sm font-medium text-primary">Add your domain</p>
              </div>
              <div className="flex items-center gap-3 bg-white/60 rounded-xl p-3">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold flex-shrink-0">2</div>
                <p className="text-sm font-medium text-primary">Copy DNS records</p>
              </div>
              <div className="flex items-center gap-3 bg-white/60 rounded-xl p-3">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold flex-shrink-0">3</div>
                <p className="text-sm font-medium text-primary">Add to your registrar</p>
              </div>
              <div className="flex items-center gap-3 bg-white/60 rounded-xl p-3">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold flex-shrink-0">4</div>
                <p className="text-sm font-medium text-primary">Verify & go live!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <span className="material-icons animate-spin text-primary text-5xl mb-3">progress_activity</span>
            <p className="text-sm text-madas-text/60">Loading your sites...</p>
          </div>
        </div>
      ) : sites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <span className="material-icons text-5xl text-madas-text/30">language</span>
          </div>
          <p className="text-xl font-bold text-primary mb-2">No Published Sites</p>
          <p className="text-sm text-madas-text/60 mb-6 max-w-md">
            Publish your website from the Website Builder to connect a custom domain and make your store live.
          </p>
          <button
            type="button"
            onClick={() => navigate('/ecommerce/website-builder')}
            className="rounded-xl bg-primary text-white px-8 py-4 text-sm font-bold hover:bg-[#1f3c19] transition-colors shadow-lg flex items-center gap-2"
          >
            <span className="material-icons">build</span>
            Go to Website Builder
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {sites.map((site) => {
            const statusConfig = getStatusConfig(site.domainStatus || 'none');
            const isVerifying = verifyingDomain === site.id;

            return (
            <article
              key={site.id}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      {/* Site Header */}
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="material-icons text-primary text-2xl">store</span>
                    </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-bold text-primary truncate">{site.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={clsx(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border',
                              statusConfig.badge
                            )}>
                              <span className={clsx('material-icons text-sm', statusConfig.iconColor, isVerifying && 'animate-spin')}>
                                {isVerifying ? 'sync' : statusConfig.icon}
                              </span>
                              {isVerifying ? 'Verifying...' : statusConfig.label}
                            </span>
                            {site.sslStatus === 'active' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                <span className="material-icons text-sm text-green-600">lock</span>
                                SSL Active
                              </span>
                            )}
                          </div>
                    </div>
                  </div>

                      {/* Store URLs card: Custom Domain first (when set), then Default URL */}
                      <div className="rounded-2xl border border-gray-200 bg-gray-50/80 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200 bg-white/80 flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-primary flex items-center gap-2">
                            <span className="material-icons text-lg text-primary">link</span>
                            Store URLs
                          </span>
                          {site.domainStatus === 'active' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                              <span className="material-icons text-sm text-green-600">check_circle</span>
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="p-4 space-y-4">
                          {site.customDomain ? (
                            <div className={clsx(
                              'rounded-xl border p-4',
                              site.domainStatus === 'active'
                                ? 'border-green-200 bg-green-50/80'
                                : site.domainStatus === 'failed'
                                ? 'border-red-200 bg-red-50/80'
                                : 'border-primary/20 bg-primary/5'
                            )}>
                              <p className="text-xs text-madas-text/60 mb-1.5 flex items-center gap-1">
                                <span className="material-icons text-xs">language</span>
                                Custom Domain {site.domainStatus === 'active' && '— primary link'}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <a
                                  href={site.domainStatus === 'active' ? getCustomDomainUrl(site.customDomain) : '#'}
                                  target={site.domainStatus === 'active' ? '_blank' : undefined}
                                  rel="noopener noreferrer"
                                  className={clsx(
                                    'text-sm font-bold break-all flex items-center gap-1',
                                    site.domainStatus === 'active'
                                      ? 'text-green-700 hover:underline'
                                      : 'text-primary'
                                  )}
                                >
                                  https://{site.customDomain}
                                  {site.domainStatus === 'active' && (
                                    <span className="material-icons text-sm">open_in_new</span>
                                  )}
                                </a>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const url = getCustomDomainUrl(site.customDomain!);
                                    const ok = await copyToClipboard(url);
                                    if (ok) {
                                      setCopiedField(`${site.id}-custom`);
                                      setTimeout(() => setCopiedField(null), 2000);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-madas-text/50 hover:bg-white/80 hover:text-primary transition-colors"
                                  title="Copy URL"
                                >
                                  <span className="material-icons text-sm">
                                    {copiedField === `${site.id}-custom` ? 'check' : 'content_copy'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-4 flex items-center justify-center">
                              <p className="text-sm text-madas-text/50">No custom domain configured</p>
                            </div>
                          )}
                          <div className="rounded-xl border border-gray-200 bg-white p-4">
                            <p className="text-xs text-madas-text/60 mb-1.5 flex items-center gap-1">
                              <span className="material-icons text-xs">link</span>
                              Default URL (xdigix.com/[brand])
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <a
                                href={getDefaultPublishedSiteUrl(site.id, site.slug)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-primary hover:underline break-all flex items-center gap-1"
                              >
                                {getDefaultPublishedSiteUrl(site.id, site.slug)}
                                <span className="material-icons text-sm">open_in_new</span>
                              </a>
                              <button
                                type="button"
                                onClick={async () => {
                                  const url = getDefaultPublishedSiteUrl(site.id, site.slug);
                                  const ok = await copyToClipboard(url);
                                  if (ok) {
                                    setCopiedField(`${site.id}-default`);
                                    setTimeout(() => setCopiedField(null), 2000);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-madas-text/50 hover:bg-gray-100 hover:text-primary transition-colors"
                                title="Copy URL"
                              >
                                <span className="material-icons text-sm">
                                  {copiedField === `${site.id}-default` ? 'check' : 'content_copy'}
                                </span>
                              </button>
                            </div>
                            {!site.slug && (
                              <p className="text-xs text-madas-text/50 mt-2">
                                Re-publish from Website Builder to get a friendly URL like xdigix.com/your-brand.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Failed verification message */}
                      {site.customDomain && site.domainStatus === 'failed' && (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                          <div className="flex items-start gap-3">
                            <span className="material-icons text-red-600 flex-shrink-0">error</span>
                            <div>
                              <p className="text-sm font-semibold text-red-800 mb-1">Verification Failed</p>
                              <p className="text-xs text-red-700">
                                We couldn't verify your DNS records. Please ensure you've added the correct records below and try again. DNS changes can take up to 48 hours to propagate.
                              </p>
                            </div>
                          </div>
                      </div>
                    )}

                      {/* Active domain success message */}
                      {site.customDomain && site.domainStatus === 'active' && (
                        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                          <div className="flex items-start gap-3">
                            <span className="material-icons text-green-600 flex-shrink-0">check_circle</span>
                            <div>
                              <p className="text-sm font-semibold text-green-800 mb-1">🎉 Your domain is live!</p>
                              <p className="text-xs text-green-700">
                                Your store is now accessible at <a href={`https://${site.customDomain}`} target="_blank" rel="noopener noreferrer" className="font-bold underline">https://{site.customDomain}</a>
                              </p>
                            </div>
                          </div>
                    </div>
                  )}
                </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                  {!site.customDomain ? (
                    <button
                      type="button"
                      onClick={() => handleAddDomain(site)}
                          className="rounded-xl bg-primary text-white px-5 py-3 text-sm font-semibold hover:bg-[#1f3c19] transition-colors shadow-md whitespace-nowrap flex items-center gap-2"
                    >
                          <span className="material-icons text-lg">add_link</span>
                      Add Domain
                    </button>
                  ) : (
                    <>
                          {(site.domainStatus === 'pending' || 
                            site.domainStatus === 'pending_dns' || 
                            site.domainStatus === 'dns_configured' || 
                            site.domainStatus === 'failed' || 
                            site.domainStatus === 'broken' ||
                            site.domainStatus === 'ssl_pending') && (
                        <button
                          type="button"
                          onClick={() => handleVerifyDomain(site.id)}
                              disabled={isVerifying}
                              className="rounded-xl bg-primary text-white px-5 py-3 text-sm font-semibold hover:bg-[#1f3c19] transition-colors shadow-md whitespace-nowrap flex items-center gap-2 disabled:opacity-60"
                            >
                              <span className={clsx('material-icons text-lg', isVerifying && 'animate-spin')}>
                                {isVerifying ? 'sync' : 'verified'}
                              </span>
                              {isVerifying ? 'Verifying...' : 'Verify Domain'}
                        </button>
                      )}
                          {site.domainStatus === 'active' && (
                            <a
                              href={`https://${site.customDomain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl border-2 border-primary text-primary px-5 py-3 text-sm font-semibold hover:bg-primary/5 transition-colors whitespace-nowrap flex items-center gap-2"
                            >
                              <span className="material-icons text-lg">open_in_new</span>
                              Visit Site
                            </a>
                          )}
                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(site.id)}
                            className="rounded-xl border border-red-200 text-red-600 px-5 py-3 text-sm font-medium hover:bg-red-50 transition-colors whitespace-nowrap flex items-center gap-2"
                      >
                            <span className="material-icons text-lg">link_off</span>
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
                </div>

                {/* Full DNS Configuration Panel */}
                <DNSConfigurationPanel site={site} />
            </article>
            );
          })}
        </div>
      )}

      {/* Domain Modal */}
      {domainModalOpen && selectedSite && (
        <DomainModal
          open={domainModalOpen}
          onClose={() => {
            setDomainModalOpen(false);
            setSelectedSite(null);
          }}
          site={selectedSite}
          onConnect={handleConnectDomain}
        />
      )}
    </div>
  );
};

export default CustomDomainsPage;
