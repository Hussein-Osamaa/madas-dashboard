import { db } from "../api/config";

/**
 * Create a new site
 * @param {Object} siteData - Site data
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Created site
 */
export const createSite = async (siteData, userId) => {
  try {
    const siteDoc = {
      name: siteData.name || "Untitled Site",
      description: siteData.description || "",
      draftData: siteData.draftData || {},
      publishedData: null,
      status: "draft",
      ownerId: userId,
      collaborators: [],
      seoSettings: {
        title: siteData.name || "Untitled Site",
        description: siteData.description || "",
        keywords: "",
        ogTitle: "",
        ogDescription: "",
        ogImage: "",
        twitterCard: "summary_large_image",
        canonicalUrl: "",
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "sites"), siteDoc);

    return {
      id: docRef.id,
      ...siteDoc,
    };
  } catch (error) {
    console.error("Error creating site:", error);
    throw new Error("Failed to create site");
  }
};

/**
 * Get sites for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of sites
 */
export const getUserSites = async (userId) => {
  try {
    const q = query(collection(db, "sites"), where("ownerId", "==", userId));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching user sites:", error);
    throw new Error("Failed to fetch sites");
  }
};

/**
 * Get a specific site
 * @param {string} siteId - Site ID
 * @returns {Promise<Object>} Site data
 */
export const getSite = async (siteId) => {
  try {
    const siteRef = doc(db, "sites", siteId);
    const siteDoc = await getDoc(siteRef);

    if (!siteDoc.exists()) {
      throw new Error("Site not found");
    }

    return {
      id: siteDoc.id,
      ...siteDoc.data(),
    };
  } catch (error) {
    console.error("Error fetching site:", error);
    throw new Error("Failed to fetch site");
  }
};

/**
 * Update site data
 * @param {string} siteId - Site ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated site
 */
export const updateSite = async (siteId, updateData) => {
  try {
    const siteRef = doc(db, "sites", siteId);
    await updateDoc(siteRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating site:", error);
    throw new Error("Failed to update site");
  }
};

/**
 * Update site draft data
 * @param {string} siteId - Site ID
 * @param {Object} draftData - Draft data
 * @returns {Promise<Object>} Update result
 */
export const updateSiteDraft = async (siteId, draftData) => {
  try {
    const siteRef = doc(db, "sites", siteId);
    await updateDoc(siteRef, {
      draftData,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating site draft:", error);
    throw new Error("Failed to update site draft");
  }
};

/**
 * Update SEO settings
 * @param {string} siteId - Site ID
 * @param {Object} seoSettings - SEO settings
 * @returns {Promise<Object>} Update result
 */
export const updateSEOSettings = async (siteId, seoSettings) => {
  try {
    const siteRef = doc(db, "sites", siteId);
    await updateDoc(siteRef, {
      seoSettings,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating SEO settings:", error);
    throw new Error("Failed to update SEO settings");
  }
};

/**
 * Delete a site
 * @param {string} siteId - Site ID
 * @returns {Promise<Object>} Delete result
 */
export const deleteSite = async (siteId) => {
  try {
    await deleteDoc(doc(db, "sites", siteId));
    return { success: true };
  } catch (error) {
    console.error("Error deleting site:", error);
    throw new Error("Failed to delete site");
  }
};

/**
 * Duplicate a site
 * @param {string} siteId - Site ID to duplicate
 * @param {string} userId - User ID
 * @param {string} newName - New site name
 * @returns {Promise<Object>} Duplicated site
 */
export const duplicateSite = async (siteId, userId, newName) => {
  try {
    const originalSite = await getSite(siteId);

    const duplicatedSite = {
      name: newName || `${originalSite.name} (Copy)`,
      description: originalSite.description,
      draftData: originalSite.draftData,
      publishedData: null,
      status: "draft",
      ownerId: userId,
      collaborators: [],
      seoSettings: originalSite.seoSettings,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "sites"), duplicatedSite);

    return {
      id: docRef.id,
      ...duplicatedSite,
    };
  } catch (error) {
    console.error("Error duplicating site:", error);
    throw new Error("Failed to duplicate site");
  }
};
