/**
 * Support Mode Banner
 * Shows when admin/support staff is viewing a client's business
 */

import { useEffect, useState } from 'react';
import { X, UserCog, AlertCircle } from 'lucide-react';

type SupportModeInfo = {
  enabled: boolean;
  businessId: string | null;
  businessName: string | null;
  adminEmail: string | null;
  adminName: string | null;
};

export default function SupportModeBanner() {
  const [supportInfo, setSupportInfo] = useState<SupportModeInfo>({
    enabled: false,
    businessId: null,
    businessName: null,
    adminEmail: null,
    adminName: null
  });

  useEffect(() => {
    // Check if support mode is active
    const checkSupportMode = () => {
      const supportMode = sessionStorage.getItem('supportMode') === 'true';
      const businessId = sessionStorage.getItem('supportBusinessId');
      const businessName = sessionStorage.getItem('supportBusinessName');
      const adminEmail = sessionStorage.getItem('supportAdminEmail');
      const adminName = sessionStorage.getItem('supportAdminName');

      // Also check URL params
      const urlParams = new URLSearchParams(window.location.search);
      const urlSupport = urlParams.get('support') === 'true';
      const urlBusiness = urlParams.get('business');

      if (supportMode || urlSupport) {
        setSupportInfo({
          enabled: true,
          businessId: businessId || urlBusiness || null,
          businessName: businessName || 'Unknown Business',
          adminEmail: adminEmail || null,
          adminName: adminName || 'Support Staff'
        });
      }
    };

    checkSupportMode();
    
    // Check periodically in case sessionStorage is updated
    const interval = setInterval(checkSupportMode, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const exitSupportMode = () => {
    // Clear support mode from sessionStorage
    sessionStorage.removeItem('supportMode');
    sessionStorage.removeItem('supportBusinessId');
    sessionStorage.removeItem('supportBusinessName');
    sessionStorage.removeItem('supportAdminEmail');
    sessionStorage.removeItem('supportAdminName');
    
    // Remove from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('support');
    url.searchParams.delete('business');
    window.history.replaceState({}, '', url.toString());
    
    // Reload to exit support mode
    window.location.reload();
  };

  if (!supportInfo.enabled) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500/20 via-amber-500/15 to-amber-500/20 border-b border-amber-500/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20">
              <UserCog className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <p className="text-sm font-semibold text-amber-300">
                  Support Mode Active
                </p>
              </div>
              <p className="text-xs text-amber-400/80 mt-0.5">
                Viewing as: <span className="font-medium">{supportInfo.businessName}</span>
                {supportInfo.adminName && (
                  <> • Support: <span className="font-medium">{supportInfo.adminName}</span></>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin"
              target="_blank"
              className="px-3 py-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-all border border-amber-500/20"
            >
              Open Admin Panel
            </a>
            <button
              onClick={exitSupportMode}
              className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all"
              title="Exit Support Mode"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


