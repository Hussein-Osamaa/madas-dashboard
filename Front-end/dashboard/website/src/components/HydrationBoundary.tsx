'use client';

import { useEffect, useState } from 'react';

interface HydrationBoundaryProps {
  children: React.ReactNode;
}

export default function HydrationBoundary({ children }: HydrationBoundaryProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated
    setIsHydrated(true);

    // Simple cleanup function
    const cleanupExtensions = () => {
      const selectors = [
        '[id*="ext-megabonus"]',
        '[class*="ext-megabonus"]',
        '#ext-megabonus-main-content',
        '.ext-megabonus-top-line'
      ];

      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
        } catch (e) {
          // Ignore errors
        }
      });
    };

    // Run cleanup once after a delay
    setTimeout(cleanupExtensions, 1000);

    // Simple mutation observer
    const observer = new MutationObserver(() => {
      cleanupExtensions();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Cleanup on unmount
    return () => {
      observer.disconnect();
    };
  }, []);

  // Show loading state until hydrated
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
