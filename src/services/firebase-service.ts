import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';

import { db, storage, auth, functions } from '../firebase';

// Types
export interface ConversationTurn {
  id: string;
  type: 'ai_question' | 'user_response';
  content: string;
  audioUrl?: string;
  timestamp: Date;
  language: string;
  processingTime?: number;
  confidence?: number;
}

export interface ConversationData {
  id: string;
  userId: string;
  language: string;
  turns: ConversationTurn[];
  extractedInfo: any;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: Date;
  completedAt?: Date;
  updatedAt: Date;
  summary?: string;
  conversationStage: string;
}

export interface UserProfile {
  id: string;
  name?: string;
  location?: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
  conversationCount: number;
  listingCount: number;
  preferences?: {
    defaultLanguage?: string;
    marketplaces?: string[];
  };
}

class FirebaseService {
  
  /**
   * Initialize anonymous authentication
   */
  static async initializeAuth(): Promise<User> {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        
        if (user) {
          resolve(user);
        } else {
          try {
            const userCredential = await signInAnonymously(auth);
            resolve(userCredential.user);
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  /**
   * Create or update user profile
   */
  static async createOrUpdateUser(
    userId: string, 
    userData: Partial<UserProfile>
  ): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      await updateDoc(userRef, {
        ...userData,
        updatedAt: Timestamp.now()
      });
    } else {
      await updateDoc(userRef, {
        id: userId,
        ...userData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        conversationCount: 0,
        listingCount: 0
      });
    }
  }

  /**
   * Get user profile
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as UserProfile;
    }
    
    return null;
  }

  /**
   * Create new conversation
   */
  static async createConversation(
    userId: string, 
    language: string
  ): Promise<string> {
    const conversationRef = await addDoc(collection(db, 'conversations'), {
      userId,
      language,
      turns: [],
      extractedInfo: {},
      status: 'in_progress',
      startedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      conversationStage: 'introduction'
    });

    return conversationRef.id;
  }

  /**
   * Get conversation by ID
   */
  static async getConversation(conversationId: string): Promise<ConversationData | null> {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);
    
    if (conversationDoc.exists()) {
      const data = conversationDoc.data();
      return {
        ...data,
        id: conversationDoc.id,
        startedAt: data.startedAt.toDate(),
        completedAt: data.completedAt?.toDate(),
        updatedAt: data.updatedAt.toDate(),
        turns: data.turns.map((turn: any) => ({
          ...turn,
          timestamp: turn.timestamp.toDate()
        }))
      } as ConversationData;
    }
    
    return null;
  }

  /**
   * Get user's conversations
   */
  static async getUserConversations(
    userId?: string, 
    limitCount: number = 10
  ): Promise<ConversationData[]> {
    // If no userId provided, get current user's conversations
    if (!userId && auth.currentUser) {
      userId = auth.currentUser.uid;
    }
    
    if (!userId) {
      throw new Error('No user ID provided and no authenticated user');
    }

    const q = query(
      collection(db, 'conversations'),
      where('userId', '==', userId),
      orderBy('startedAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        startedAt: data.startedAt.toDate(),
        completedAt: data.completedAt?.toDate(),
        updatedAt: data.updatedAt.toDate(),
        turns: data.turns.map((turn: any) => ({
          ...turn,
          timestamp: turn.timestamp.toDate()
        }))
      } as ConversationData;
    });
  }

  /**
   * Save conversation state to Firestore
   */
  static async saveConversation(conversationData: any): Promise<void> {
    const conversationRef = doc(db, 'conversations', conversationData.id);
    
    // Convert dates to Firestore timestamps
    const firestoreData = {
      ...conversationData,
      startedAt: Timestamp.fromDate(conversationData.startedAt),
      completedAt: conversationData.completedAt ? Timestamp.fromDate(conversationData.completedAt) : null,
      updatedAt: Timestamp.now(),
      turns: conversationData.turns.map((turn: any) => ({
        ...turn,
        timestamp: Timestamp.fromDate(turn.timestamp)
      }))
    };

    await updateDoc(conversationRef, firestoreData);
  }

  /**
   * Delete conversation
   */
  static async deleteConversation(conversationId: string): Promise<void> {
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      status: 'deleted',
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Upload audio file
   */
  static async uploadAudio(
    userId: string, 
    audioBlob: Blob
  ): Promise<string> {
    const filename = `${Date.now()}-audio.webm`;
    const audioRef = ref(storage, `audio/${userId}/${filename}`);
    
    await uploadBytes(audioRef, audioBlob);
    return await getDownloadURL(audioRef);
  }

  /**
   * Upload image file
   */
  static async uploadImage(
    userId: string, 
    imageFile: File,
    folder: 'images' | 'products' = 'images'
  ): Promise<string> {
    const filename = `${Date.now()}-${imageFile.name}`;
    const imageRef = ref(storage, `${folder}/${userId}/${filename}`);
    
    await uploadBytes(imageRef, imageFile);
    return await getDownloadURL(imageRef);
  }

  /**
   * Delete file from storage
   */
  static async deleteFile(fileUrl: string): Promise<void> {
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
  }

  /**
   * Call Firebase Function
   */
  static async callFunction(functionName: string, data: any): Promise<any> {
    const callable = httpsCallable(functions, functionName);
    const result = await callable(data);
    return result.data;
  }

  /**
   * Initialize conversation collections (calls Firebase Function)
   */
  static async initializeConversationCollections(): Promise<any> {
    return this.callFunction('initializeConversationCollections', {});
  }

  /**
   * Process user speech (calls Firebase Function)
   */
  static async processUserSpeech(audioUrl: string, language: string): Promise<any> {
    return this.callFunction('processUserSpeech', { audioUrl, language });
  }

  /**
   * Generate AI speech (calls Firebase Function)
   */
  static async generateAISpeech(text: string, language: string): Promise<any> {
    return this.callFunction('generateAISpeech', { text, language });
  }

  /**
   * Manage conversation (calls Firebase Function)
   */
  static async manageConversation(conversationId: string, userResponse: string): Promise<any> {
    return this.callFunction('manageConversation', { conversationId, userResponse });
  }

  /**
   * Extract product information from conversation (calls Firebase Function)
   */
  static async extractProductInformation(conversationId: string): Promise<any> {
    return this.callFunction('extractProductInformation', { conversationId });
  }

  /**
   * Save conversation metric
   */
  static async saveConversationMetric(metric: any): Promise<void> {
    await addDoc(collection(db, 'conversationMetrics'), {
      ...metric,
      timestamp: Timestamp.fromDate(metric.timestamp)
    });
  }

  /**
   * Get conversation metrics
   */
  static async getConversationMetrics(userId?: string): Promise<any[]> {
    let q = query(collection(db, 'conversationMetrics'));
    
    if (userId) {
      q = query(q, where('userId', '==', userId));
    }
    
    q = query(q, orderBy('timestamp', 'desc'));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        timestamp: data.timestamp?.toDate() || new Date()
      };
    });
  }

  /**
   * Update conversation with analytics
   */
  static async updateConversationAnalytics(conversationId: string, analytics: any): Promise<void> {
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      analytics,
      updatedAt: Timestamp.now()
    });
  }
}

// Export singleton instance
export const firebaseService = FirebaseService;