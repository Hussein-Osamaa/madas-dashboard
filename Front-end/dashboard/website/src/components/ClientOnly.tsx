'use client';

import { useEffect, useState } from 'react';

interface ClientOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Clean up any browser extension elements that might cause hydration issues
    const cleanupExtensions = () => {
      const extensionElements = document.querySelectorAll('[id*="ext-"], [class*="ext-"], [id*="megabonus"], [class*="megabonus"]');
      extensionElements.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    };

    setHasMounted(true);
    
    // Clean up extensions after a short delay to ensure they're loaded
    setTimeout(cleanupExtensions, 100);
    
    // Also clean up on any DOM mutations
    const observer = new MutationObserver(cleanupExtensions);
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => observer.disconnect();
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}