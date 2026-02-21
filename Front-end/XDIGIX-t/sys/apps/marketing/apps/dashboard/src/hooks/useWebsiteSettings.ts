import { useState, useEffect } from 'react';
import { doc, getDoc, db, collection, getDocs } from '../lib/firebase';

interface WebsiteSettings {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}

export function useWebsiteSettings(siteId: string | undefined, businessId: string | null | undefined) {
  const [settings, setSettings] = useState<WebsiteSettings>({
    theme: {
      primaryColor: '#27491F',
      secondaryColor: '#F0CAE1',
      backgroundColor: '#FFFFFF',
      textColor: '#171817'
    }
  });
  const [loading, setLoading] = useState(true);
  const [foundBusinessId, setFoundBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      if (!siteId) {
        setLoading(false);
        return;
      }

      try {
        let targetBusinessId = businessId;

        // If businessId not provided, find it
        if (!targetBusinessId) {
          const businessesRef = collection(db, 'businesses');
          const businessesSnapshot = await getDocs(businessesRef);
          
          for (const businessDoc of businessesSnapshot.docs) {
            try {
              const siteRef = doc(db, 'businesses', businessDoc.id, 'published_sites', siteId);
              const siteSnap = await getDoc(siteRef);
              
              if (siteSnap.exists()) {
                targetBusinessId = businessDoc.id;
                setFoundBusinessId(targetBusinessId);
                break;
              }
            } catch (err) {
              continue;
            }
          }
        } else {
          setFoundBusinessId(targetBusinessId);
        }

        if (!targetBusinessId) {
          setLoading(false);
          return;
        }

        const siteRef = doc(db, 'businesses', targetBusinessId, 'published_sites', siteId);
        const siteSnap = await getDoc(siteRef);

        if (siteSnap.exists()) {
          const data = siteSnap.data();
          const siteSettings = data.settings || {};
          
          setSettings({
            theme: {
              primaryColor: siteSettings.theme?.primaryColor || '#27491F',
              secondaryColor: siteSettings.theme?.secondaryColor || '#F0CAE1',
              backgroundColor: siteSettings.theme?.backgroundColor || '#FFFFFF',
              textColor: siteSettings.theme?.textColor || '#171817'
            },
            seo: siteSettings.seo || {},
            socialLinks: siteSettings.socialLinks || {}
          });
        }
      } catch (error) {
        console.error('Failed to load website settings:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, [siteId, businessId]);

  return { settings, loading, businessId: foundBusinessId };
}

