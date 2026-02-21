import { useState, useEffect } from 'react';
import { doc, getDoc, db, collection, getDocs } from '../lib/firebase';
import { Section } from '../types/builder';

interface UseSiteSectionsResult {
  navbarSection: Section | null;
  footerSection: Section | null;
  loading: boolean;
}

export function useSiteSections(siteId: string | undefined, businessId: string | null | undefined): UseSiteSectionsResult {
  const [navbarSection, setNavbarSection] = useState<Section | null>(null);
  const [footerSection, setFooterSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSections = async () => {
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
                break;
              }
            } catch (err) {
              continue;
            }
          }
        }

        if (!targetBusinessId) {
          setLoading(false);
          return;
        }

        const siteRef = doc(db, 'businesses', targetBusinessId, 'published_sites', siteId);
        const siteSnap = await getDoc(siteRef);

        if (siteSnap.exists()) {
          const data = siteSnap.data();
          const sections: Section[] = data.sections || [];
          
          // Find navbar and footer sections
          const navbar = sections.find(s => s.type === 'navbar') || null;
          const footer = sections.find(s => s.type === 'footer') || null;
          
          setNavbarSection(navbar);
          setFooterSection(footer);
        }
      } catch (error) {
        console.error('Failed to load site sections:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadSections();
  }, [siteId, businessId]);

  return { navbarSection, footerSection, loading };
}

