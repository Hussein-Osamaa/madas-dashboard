import { db } from "../api/config";

/**
 * Get custom domains for a user and site
 * @param {string} userId - User ID
 * @param {string} siteId - Site ID
 * @returns {Promise<Array>} Array of custom domains
 */
export const getCustomDomains = async (userId, siteId) => {
  try {
    const q = query(
      collection(db, "custom_domains"),
      where("ownerId", "==", userId),
      where("siteId", "==", siteId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching custom domains:", error);
    throw new Error("Failed to fetch custom domains");
  }
};

/**
 * Add a custom domain
 * @param {Object} domainData - Domain data
 * @returns {Promise<Object>} Added domain
 */
export const addCustomDomain = async (domainData) => {
  const { domain, siteId, userId } = domainData;

  try {
    // Generate verification token
    const verificationToken = `verification-token-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const domainDoc = {
      domain: domain.toLowerCase(),
      siteId,
      ownerId: userId,
      status: "pending",
      verificationToken,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "custom_domains"), domainDoc);

    return {
      id: docRef.id,
      ...domainDoc,
    };
  } catch (error) {
    console.error("Error adding custom domain:", error);
    throw new Error("Failed to add custom domain");
  }
};

/**
 * Remove a custom domain
 * @param {string} domainId - Domain ID
 * @returns {Promise<void>}
 */
export const removeCustomDomain = async (domainId) => {
  try {
    await deleteDoc(doc(db, "custom_domains", domainId));
  } catch (error) {
    console.error("Error removing custom domain:", error);
    throw new Error("Failed to remove custom domain");
  }
};

/**
 * Verify a custom domain
 * @param {string} domainId - Domain ID
 * @returns {Promise<Object>} Verification result
 */
export const verifyDomain = async (domainId) => {
  try {
    // In a real implementation, this would check DNS records
    // For now, we'll simulate the verification process

    const domainRef = doc(db, "custom_domains", domainId);

    // Simulate verification delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update domain status to verified
    await updateDoc(domainRef, {
      status: "verified",
      verifiedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, status: "verified" };
  } catch (error) {
    console.error("Error verifying domain:", error);

    // Update domain status to failed
    const domainRef = doc(db, "custom_domains", domainId);
    await updateDoc(domainRef, {
      status: "failed",
      error: error.message,
      updatedAt: serverTimestamp(),
    });

    throw new Error("Domain verification failed");
  }
};

/**
 * Get domain verification instructions
 * @param {string} domainId - Domain ID
 * @returns {Promise<Object>} Verification instructions
 */
export const getDomainVerificationInstructions = async (domainId) => {
  try {
    const domainRef = doc(db, "custom_domains", domainId);
    const domainDoc = await getDoc(domainRef);

    if (!domainDoc.exists()) {
      throw new Error("Domain not found");
    }

    const domainData = domainDoc.data();

    return {
      domain: domainData.domain,
      verificationToken: domainData.verificationToken,
      instructions: {
        cname: {
          name: domainData.domain,
          value: "yoursite.web.app",
          type: "CNAME",
        },
        txt: {
          name: domainData.domain,
          value: domainData.verificationToken,
          type: "TXT",
        },
      },
    };
  } catch (error) {
    console.error("Error getting verification instructions:", error);
    throw new Error("Failed to get verification instructions");
  }
};
