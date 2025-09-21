import { storage, storagePaths } from '../firebase-config';
import { v4 as uuidv4 } from 'uuid';

export class StorageService {
  
  /**
   * Upload audio file to Firebase Storage
   */
  static async uploadAudio(
    userId: string,
    audioBuffer: Buffer,
    contentType: string = 'audio/webm'
  ): Promise<string> {
    const filename = `${Date.now()}-${uuidv4()}.webm`;
    const filePath = storagePaths.audio(userId, filename);
    
    const file = storage.bucket().file(filePath);
    
    await file.save(audioBuffer, {
      metadata: {
        contentType,
        metadata: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    // Make file publicly readable
    await file.makePublic();
    
    // Return public URL
    return `https://storage.googleapis.com/${storage.bucket().name}/${filePath}`;
  }

  /**
   * Upload image file to Firebase Storage
   */
  static async uploadImage(
    userId: string,
    imageBuffer: Buffer,
    contentType: string,
    folder: 'images' | 'products' = 'images'
  ): Promise<string> {
    const extension = contentType.split('/')[1] || 'jpg';
    const filename = `${Date.now()}-${uuidv4()}.${extension}`;
    
    const filePath = folder === 'images' 
      ? storagePaths.images(userId, filename)
      : storagePaths.products(userId, filename);
    
    const file = storage.bucket().file(filePath);
    
    await file.save(imageBuffer, {
      metadata: {
        contentType,
        metadata: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    // Make file publicly readable
    await file.makePublic();
    
    // Return public URL
    return `https://storage.googleapis.com/${storage.bucket().name}/${filePath}`;
  }

  /**
   * Upload temporary file
   */
  static async uploadTempFile(
    userId: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<string> {
    const extension = contentType.includes('audio') ? 'webm' : 
                     contentType.includes('image') ? contentType.split('/')[1] : 'bin';
    const filename = `${Date.now()}-${uuidv4()}.${extension}`;
    const filePath = storagePaths.temp(userId, filename);
    
    const file = storage.bucket().file(filePath);
    
    await file.save(fileBuffer, {
      metadata: {
        contentType,
        metadata: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        }
      }
    });

    // Make file publicly readable
    await file.makePublic();
    
    // Return public URL
    return `https://storage.googleapis.com/${storage.bucket().name}/${filePath}`;
  }

  /**
   * Delete file from storage
   */
  static async deleteFile(filePath: string): Promise<void> {
    const file = storage.bucket().file(filePath);
    await file.delete();
  }

  /**
   * Get file download URL
   */
  static async getDownloadUrl(filePath: string): Promise<string> {
    const file = storage.bucket().file(filePath);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });
    return url;
  }

  /**
   * Clean up expired temporary files
   */
  static async cleanupTempFiles(): Promise<void> {
    const [files] = await storage.bucket().getFiles({
      prefix: 'temp/',
    });

    const now = new Date();
    const expiredFiles = files.filter(file => {
      const metadata = file.metadata;
      if (metadata?.metadata?.expiresAt) {
        const expiresAt = new Date(metadata.metadata.expiresAt);
        return now > expiresAt;
      }
      return false;
    });

    // Delete expired files
    await Promise.all(expiredFiles.map(file => file.delete()));
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(filePath: string): Promise<any> {
    const file = storage.bucket().file(filePath);
    const [metadata] = await file.getMetadata();
    return metadata;
  }
}