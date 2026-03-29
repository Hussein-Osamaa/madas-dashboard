import { db } from "../api/config";

/**
 * Publish a site by copying draft data to published data
 * @param {Object} publishData - Site data and metadata
 * @returns {Promise<Object>} Publishing result
 */
export const publishSite = async (publishData) => {
  const { siteId, siteData, userId, userName } = publishData;

  try {
    const startTime = Date.now();

    // Create publishing log entry
    const logRef = await addDoc(collection(db, "publishing_logs"), {
      userId,
      siteId,
      siteName: siteData.name || "Untitled Site",
      status: "pending",
      message: "Starting publication process...",
      timestamp: serverTimestamp(),
      duration: 0,
    });

    // Update site document with published data
    const siteRef = doc(db, "sites", siteId);
    await setDoc(
      siteRef,
      {
        publishedData: siteData,
        publishedAt: serverTimestamp(),
        status: "published",
        lastPublishedBy: userId,
        lastPublishedByName: userName,
      },
      { merge: true }
    );

    // Create published site entry for public access
    const publishedSiteRef = doc(db, "published_sites", siteId);
    await setDoc(publishedSiteRef, {
      siteId,
      ownerId: userId,
      siteData,
      publishedAt: serverTimestamp(),
      url: `https://${siteId}.web.app`,
      status: "active",
    });

    const duration = Date.now() - startTime;

    // Update log with success
    await setDoc(
      logRef,
      {
        status: "success",
        message: "Site published successfully",
        duration,
        url: `https://${siteId}.web.app`,
      },
      { merge: true }
    );

    return {
      success: true,
      siteId,
      url: `https://${siteId}.web.app`,
      duration,
    };
  } catch (error) {
    console.error("Publishing error:", error);

    // Log the error
    await addDoc(collection(db, "publishing_logs"), {
      userId,
      siteId,
      siteName: siteData.name || "Untitled Site",
      status: "error",
      message: "Publishing failed",
      error: error.message,
      timestamp: serverTimestamp(),
    });

    throw new Error(`Failed to publish site: ${error.message}`);
  }
};

/**
 * Get publishing logs for a user and optionally a specific site
 * @param {string} userId - User ID
 * @param {string} siteId - Optional site ID
 * @returns {Promise<Array>} Array of publishing logs
 */
export const getPublishingLogs = async (userId, siteId = null) => {
  try {
    let q = query(
      collection(db, "publishing_logs"),
      where("userId", "==", userId),
      orderBy("timestamp", "desc")
    );

    if (siteId) {
      q = query(
        collection(db, "publishing_logs"),
        where("userId", "==", userId),
        where("siteId", "==", siteId),
        orderBy("timestamp", "desc")
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching publishing logs:", error);
    throw new Error("Failed to fetch publishing logs");
  }
};

/**
 * Get published site data
 * @param {string} siteId - Site ID
 * @returns {Promise<Object>} Published site data
 */
export const getPublishedSite = async (siteId) => {
  try {
    const siteRef = doc(db, "published_sites", siteId);
    const siteDoc = await getDoc(siteRef);

    if (!siteDoc.exists()) {
      throw new Error("Published site not found");
    }

    return {
      id: siteDoc.id,
      ...siteDoc.data(),
    };
  } catch (error) {
    console.error("Error fetching published site:", error);
    throw new Error("Failed to fetch published site");
  }
};

/**
 * Unpublish a site
 * @param {string} siteId - Site ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Unpublishing result
 */
export const unpublishSite = async (siteId, userId) => {
  try {
    // Update site status
    const siteRef = doc(db, "sites", siteId);
    await setDoc(
      siteRef,
      {
        status: "draft",
        unpublishedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Remove from published sites
    const publishedSiteRef = doc(db, "published_sites", siteId);
    await setDoc(
      publishedSiteRef,
      {
        status: "unpublished",
        unpublishedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Log the action
    await addDoc(collection(db, "publishing_logs"), {
      userId,
      siteId,
      status: "success",
      message: "Site unpublished successfully",
      timestamp: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("Unpublishing error:", error);
    throw new Error(`Failed to unpublish site: ${error.message}`);
  }
};
