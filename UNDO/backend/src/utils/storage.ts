import * as admin from 'firebase-admin';
import { logSystemEvent } from './logger';

/**
 * Upload file to Firebase Storage
 */
export const uploadFile = async (
  file: any,
  path: string,
  metadata?: any
): Promise<string> => {
  try {
    const bucket = admin.storage().bucket();
    const fileName = `${path}/${Date.now()}-${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        metadata: metadata || {},
      },
      resumable: false,
    });

    return new Promise((resolve, reject) => {
      stream.on('error', (error) => {
        logSystemEvent('error', 'File upload failed', 'system', { error: error.message });
        reject(error);
      });

      stream.on('finish', async () => {
        try {
          // Make file publicly accessible
          await fileUpload.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
          
          logSystemEvent('info', 'File uploaded successfully', 'system', { fileName, publicUrl });
          resolve(publicUrl);
        } catch (error) {
          logSystemEvent('error', 'Failed to make file public', 'system', { error: error.message });
          reject(error);
        }
      });

      stream.end(file.buffer);
    });
  } catch (error) {
    logSystemEvent('error', 'File upload error', 'system', { error: error.message });
    throw error;
  }
};

/**
 * Delete file from Firebase Storage
 */
export const deleteFile = async (fileName: string): Promise<boolean> => {
  try {
    const bucket = admin.storage().bucket();
    await bucket.file(fileName).delete();
    
    logSystemEvent('info', 'File deleted successfully', 'system', { fileName });
    return true;
  } catch (error) {
    logSystemEvent('error', 'File deletion failed', 'system', { fileName, error: error.message });
    return false;
  }
};

/**
 * Get file metadata
 */
export const getFileMetadata = async (fileName: string) => {
  try {
    const bucket = admin.storage().bucket();
    const [metadata] = await bucket.file(fileName).getMetadata();
    return metadata;
  } catch (error) {
    logSystemEvent('error', 'Failed to get file metadata', 'system', { fileName, error: error.message });
    throw error;
  }
};

/**
 * Generate signed URL for private file access
 */
export const generateSignedUrl = async (
  fileName: string,
  expiresIn: number = 3600
): Promise<string> => {
  try {
    const bucket = admin.storage().bucket();
    const [url] = await bucket.file(fileName).getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });
    
    return url;
  } catch (error) {
    logSystemEvent('error', 'Failed to generate signed URL', 'system', { fileName, error: error.message });
    throw error;
  }
};

/**
 * Clean up temporary files
 */
export const cleanupTempFiles = async (olderThanHours: number = 24): Promise<number> => {
  try {
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ prefix: 'temp/' });
    
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    let deletedCount = 0;
    
    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const createdTime = new Date(metadata.timeCreated).getTime();
      
      if (createdTime < cutoffTime) {
        await file.delete();
        deletedCount++;
      }
    }
    
    logSystemEvent('info', 'Temporary files cleaned up', 'system', { deletedCount, olderThanHours });
    return deletedCount;
  } catch (error) {
    logSystemEvent('error', 'Failed to cleanup temp files', 'system', { error: error.message });
    throw error;
  }
};

/**
 * Get storage usage for user
 */
export const getUserStorageUsage = async (userId: string): Promise<{
  used: number;
  limit: number;
  files: number;
}> => {
  try {
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({ prefix: `users/${userId}/` });
    
    let totalSize = 0;
    for (const file of files) {
      const [metadata] = await file.getMetadata();
      totalSize += parseInt(metadata.size || '0');
    }
    
    // Get user's storage limit from subscription
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();
    
    const userData = userDoc.data();
    const limit = userData?.subscription?.features?.storage || 100; // Default 100MB
    
    return {
      used: Math.round(totalSize / (1024 * 1024)), // Convert to MB
      limit,
      files: files.length,
    };
  } catch (error) {
    logSystemEvent('error', 'Failed to get user storage usage', 'system', { userId, error: error.message });
    throw error;
  }
};

/**
 * Check if user has enough storage space
 */
export const hasStorageSpace = async (userId: string, fileSize: number): Promise<boolean> => {
  try {
    const usage = await getUserStorageUsage(userId);
    const fileSizeMB = fileSize / (1024 * 1024);
    return (usage.used + fileSizeMB) <= usage.limit;
  } catch (error) {
    logSystemEvent('error', 'Failed to check storage space', 'system', { userId, fileSize, error: error.message });
    return false;
  }
};

/**
 * Update user storage usage
 */
export const updateUserStorageUsage = async (userId: string, fileSize: number, operation: 'add' | 'remove') => {
  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    const increment = operation === 'add' ? fileSize : -fileSize;
    
    await userRef.update({
      'stats.storage.used': admin.firestore.FieldValue.increment(increment),
    });
    
    logSystemEvent('info', 'User storage usage updated', 'system', { userId, fileSize, operation });
  } catch (error) {
    logSystemEvent('error', 'Failed to update storage usage', 'system', { userId, fileSize, operation, error: error.message });
    throw error;
  }
};

/**
 * Create backup of user data
 */
export const createUserBackup = async (userId: string): Promise<string> => {
  try {
    const bucket = admin.storage().bucket();
    const backupFileName = `backups/users/${userId}/${Date.now()}-backup.json`;
    
    // Get user data
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const websitesSnapshot = await admin.firestore()
      .collection('websites')
      .where('ownerId', '==', userId)
      .get();
    
    const backupData = {
      user: userDoc.data(),
      websites: websitesSnapshot.docs.map(doc => doc.data()),
      timestamp: new Date().toISOString(),
    };
    
    // Upload backup
    const file = bucket.file(backupFileName);
    await file.save(JSON.stringify(backupData, null, 2), {
      metadata: {
        contentType: 'application/json',
      },
    });
    
    logSystemEvent('info', 'User backup created', 'system', { userId, backupFileName });
    return backupFileName;
  } catch (error) {
    logSystemEvent('error', 'Failed to create user backup', 'system', { userId, error: error.message });
    throw error;
  }
};

/**
 * Restore user data from backup
 */
export const restoreUserBackup = async (userId: string, backupFileName: string): Promise<boolean> => {
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(backupFileName);
    
    const [data] = await file.download();
    const backupData = JSON.parse(data.toString());
    
    // Restore user data
    if (backupData.user) {
      await admin.firestore().collection('users').doc(userId).set(backupData.user);
    }
    
    // Restore websites
    if (backupData.websites) {
      const batch = admin.firestore().batch();
      for (const website of backupData.websites) {
        const websiteRef = admin.firestore().collection('websites').doc();
        batch.set(websiteRef, { ...website, ownerId: userId });
      }
      await batch.commit();
    }
    
    logSystemEvent('info', 'User backup restored', 'system', { userId, backupFileName });
    return true;
  } catch (error) {
    logSystemEvent('error', 'Failed to restore user backup', 'system', { userId, backupFileName, error: error.message });
    return false;
  }
};
