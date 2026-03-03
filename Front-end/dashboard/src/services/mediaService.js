import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { storage, db } from "../firebase/config";

/**
 * Upload a file to Firebase Storage
 * @param {File} file - File to upload
 * @param {string} userId - User ID
 * @param {string} siteId - Site ID
 * @param {string} folder - Folder path (optional)
 * @returns {Promise<Object>} Upload result
 */
export const uploadFile = async (file, userId, siteId, folder = "") => {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substr(2, 9);
    const fileExtension = file.name.split(".").pop();
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;

    // Create storage path
    const storagePath = `sites/${userId}/${siteId}/${folder}${fileName}`;
    const storageRef = ref(storage, storagePath);

    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Save file metadata to Firestore
    const fileMetadata = {
      fileName: file.name,
      storagePath,
      downloadURL,
      size: file.size,
      type: file.type,
      ownerId: userId,
      siteId,
      folder,
      uploadedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "media"), fileMetadata);

    return {
      id: docRef.id,
      ...fileMetadata,
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("Failed to upload file");
  }
};

/**
 * Get media files for a user and site
 * @param {string} userId - User ID
 * @param {string} siteId - Site ID
 * @param {string} folder - Folder path (optional)
 * @returns {Promise<Array>} Array of media files
 */
export const getMediaFiles = async (userId, siteId, folder = "") => {
  try {
    let q = query(
      collection(db, "media"),
      where("ownerId", "==", userId),
      where("siteId", "==", siteId)
    );

    if (folder) {
      q = query(
        collection(db, "media"),
        where("ownerId", "==", userId),
        where("siteId", "==", siteId),
        where("folder", "==", folder)
      );
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching media files:", error);
    throw new Error("Failed to fetch media files");
  }
};

/**
 * Delete a media file
 * @param {string} fileId - File ID
 * @returns {Promise<Object>} Delete result
 */
export const deleteMediaFile = async (fileId) => {
  try {
    // Get file metadata
    const fileRef = doc(db, "media", fileId);
    const fileDoc = await getDoc(fileRef);

    if (!fileDoc.exists()) {
      throw new Error("File not found");
    }

    const fileData = fileDoc.data();

    // Delete from Storage
    const storageRef = ref(storage, fileData.storagePath);
    await deleteObject(storageRef);

    // Delete from Firestore
    await deleteDoc(fileRef);

    return { success: true };
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file");
  }
};

/**
 * Get file download URL
 * @param {string} fileId - File ID
 * @returns {Promise<string>} Download URL
 */
export const getFileDownloadURL = async (fileId) => {
  try {
    const fileRef = doc(db, "media", fileId);
    const fileDoc = await getDoc(fileRef);

    if (!fileDoc.exists()) {
      throw new Error("File not found");
    }

    return fileDoc.data().downloadURL;
  } catch (error) {
    console.error("Error getting download URL:", error);
    throw new Error("Failed to get download URL");
  }
};

/**
 * Upload multiple files
 * @param {FileList} files - Files to upload
 * @param {string} userId - User ID
 * @param {string} siteId - Site ID
 * @param {string} folder - Folder path (optional)
 * @returns {Promise<Array>} Array of upload results
 */
export const uploadMultipleFiles = async (
  files,
  userId,
  siteId,
  folder = ""
) => {
  try {
    const uploadPromises = Array.from(files).map((file) =>
      uploadFile(file, userId, siteId, folder)
    );

    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error("Error uploading multiple files:", error);
    throw new Error("Failed to upload files");
  }
};

/**
 * Get storage usage for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Storage usage info
 */
export const getStorageUsage = async (userId) => {
  try {
    const q = query(collection(db, "media"), where("ownerId", "==", userId));

    const querySnapshot = await getDocs(q);
    const files = querySnapshot.docs.map((doc) => doc.data());

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const fileCount = files.length;

    return {
      totalSize,
      fileCount,
      files: files.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        size: file.size,
        type: file.type,
        uploadedAt: file.uploadedAt,
      })),
    };
  } catch (error) {
    console.error("Error getting storage usage:", error);
    throw new Error("Failed to get storage usage");
  }
};
