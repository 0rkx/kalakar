import { db, collections } from '../firebase-config';
import { 
  ConversationData, 
  ConversationTurn, 
  ConversationStage, 
  UserProfile,
  ProductInfo 
} from '../models/conversation';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export class ConversationService {
  
  /**
   * Create a new conversation
   */
  static async createConversation(
    userId: string, 
    language: string
  ): Promise<ConversationData> {
    const conversationRef = db.collection(collections.conversations).doc();
    
    const conversationData: ConversationData = {
      id: conversationRef.id,
      userId,
      language,
      turns: [],
      extractedInfo: {},
      status: 'in_progress',
      startedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      conversationStage: ConversationStage.INTRODUCTION
    };

    await conversationRef.set(conversationData);
    return conversationData;
  }

  /**
   * Get conversation by ID
   */
  static async getConversation(conversationId: string): Promise<ConversationData | null> {
    const doc = await db.collection(collections.conversations).doc(conversationId).get();
    
    if (!doc.exists) {
      return null;
    }

    return doc.data() as ConversationData;
  }

  /**
   * Add a turn to the conversation
   */
  static async addConversationTurn(
    conversationId: string,
    turn: Omit<ConversationTurn, 'id' | 'timestamp'>
  ): Promise<ConversationTurn> {
    const conversationRef = db.collection(collections.conversations).doc(conversationId);
    
    const newTurn: ConversationTurn = {
      ...turn,
      id: db.collection('temp').doc().id, // Generate unique ID
      timestamp: Timestamp.now()
    };

    await conversationRef.update({
      turns: FieldValue.arrayUnion(newTurn),
      updatedAt: Timestamp.now()
    });

    return newTurn;
  }

  /**
   * Update conversation stage
   */
  static async updateConversationStage(
    conversationId: string,
    stage: ConversationStage
  ): Promise<void> {
    await db.collection(collections.conversations).doc(conversationId).update({
      conversationStage: stage,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Update extracted product information
   */
  static async updateExtractedInfo(
    conversationId: string,
    extractedInfo: Partial<ProductInfo>
  ): Promise<void> {
    await db.collection(collections.conversations).doc(conversationId).update({
      extractedInfo,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Complete conversation
   */
  static async completeConversation(
    conversationId: string,
    summary: string,
    finalExtractedInfo: ProductInfo
  ): Promise<void> {
    await db.collection(collections.conversations).doc(conversationId).update({
      status: 'completed',
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      summary,
      extractedInfo: finalExtractedInfo
    });
  }

  /**
   * Get user's conversations
   */
  static async getUserConversations(
    userId: string,
    limit: number = 10
  ): Promise<ConversationData[]> {
    const snapshot = await db
      .collection(collections.conversations)
      .where('userId', '==', userId)
      .orderBy('startedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => doc.data() as ConversationData);
  }

  /**
   * Create or update user profile
   */
  static async createOrUpdateUser(
    userId: string,
    userData: Partial<UserProfile>
  ): Promise<UserProfile> {
    const userRef = db.collection(collections.users).doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      // Update existing user
      await userRef.update({
        ...userData,
        updatedAt: Timestamp.now()
      });
      
      const updatedDoc = await userRef.get();
      return updatedDoc.data() as UserProfile;
    } else {
      // Create new user
      const newUser: UserProfile = {
        id: userId,
        ...userData,
        language: userData.language || 'en',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        conversationCount: 0,
        listingCount: 0
      };

      await userRef.set(newUser);
      return newUser;
    }
  }

  /**
   * Increment user conversation count
   */
  static async incrementConversationCount(userId: string): Promise<void> {
    await db.collection(collections.users).doc(userId).update({
      conversationCount: FieldValue.increment(1),
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Get user profile
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const doc = await db.collection(collections.users).doc(userId).get();
    
    if (!doc.exists) {
      return null;
    }

    return doc.data() as UserProfile;
  }
}