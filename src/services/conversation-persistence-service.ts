// src/services/conversation-persistence-service.ts

import { ConversationData, ConversationState, ConversationTurn } from '../types';
import { firebaseService } from './firebase-service';

export interface ConversationBackup {
  conversationData: ConversationData;
  conversationState: ConversationState;
  timestamp: Date;
  version: string;
}

export interface PersistenceOptions {
  enableFirestore: boolean;
  enableLocalStorage: boolean;
  autoSaveInterval: number; // milliseconds
  maxLocalBackups: number;
}

export class ConversationPersistenceService {
  private static instance: ConversationPersistenceService;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private currentConversationId: string | null = null;
  private isOnline: boolean = navigator.onLine;
  private pendingUpdates: Map<string, ConversationBackup> = new Map();

  private readonly options: PersistenceOptions = {
    enableFirestore: true,
    enableLocalStorage: true,
    autoSaveInterval: 5000, // 5 seconds
    maxLocalBackups: 10
  };

  private constructor() {
    this.initializeNetworkMonitoring();
    this.initializeStorageEventListeners();
  }

  public static getInstance(): ConversationPersistenceService {
    if (!ConversationPersistenceService.instance) {
      ConversationPersistenceService.instance = new ConversationPersistenceService();
    }
    return ConversationPersistenceService.instance;
  }

  private initializeNetworkMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingUpdates();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private initializeStorageEventListeners(): void {
    // Listen for storage events from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith('conversation_backup_')) {
        console.log('Conversation updated in another tab');
        // Could emit event to notify components
      }
    });

    // Handle page unload - save current state
    window.addEventListener('beforeunload', () => {
      if (this.currentConversationId) {
        this.stopAutoSave();
      }
    });
  }

  public async startConversationPersistence(
    conversationData: ConversationData,
    conversationState: ConversationState
  ): Promise<void> {
    this.currentConversationId = conversationData.id;
    
    // Initial save
    await this.saveConversationState(conversationData, conversationState);
    
    // Start auto-save
    this.startAutoSave(conversationData.id);
  }

  public async saveConversationState(
    conversationData: ConversationData,
    conversationState: ConversationState,
    force: boolean = false
  ): Promise<void> {
    const backup: ConversationBackup = {
      conversationData,
      conversationState,
      timestamp: new Date(),
      version: '1.0'
    };

    // Always save to localStorage first (faster, more reliable)
    if (this.options.enableLocalStorage) {
      await this.saveToLocalStorage(backup);
    }

    // Save to Firestore if online
    if (this.options.enableFirestore && (this.isOnline || force)) {
      try {
        await this.saveToFirestore(backup);
        // Remove from pending updates if successful
        this.pendingUpdates.delete(conversationData.id);
      } catch (error) {
        console.warn('Failed to save to Firestore, will retry when online:', error);
        // Add to pending updates for later sync
        this.pendingUpdates.set(conversationData.id, backup);
      }
    } else if (this.options.enableFirestore && !this.isOnline) {
      // Queue for later sync
      this.pendingUpdates.set(conversationData.id, backup);
    }
  }

  private async saveToLocalStorage(backup: ConversationBackup): Promise<void> {
    try {
      const key = `conversation_backup_${backup.conversationData.id}`;
      const serialized = JSON.stringify({
        ...backup,
        timestamp: backup.timestamp.toISOString(),
        conversationData: {
          ...backup.conversationData,
          startedAt: backup.conversationData.startedAt.toISOString(),
          completedAt: backup.conversationData.completedAt?.toISOString(),
          turns: backup.conversationData.turns.map(turn => ({
            ...turn,
            timestamp: turn.timestamp.toISOString()
          }))
        }
      });

      localStorage.setItem(key, serialized);
      
      // Maintain backup limit
      await this.cleanupOldLocalBackups();
      
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      // Handle storage quota exceeded
      if (error instanceof DOMException && error.code === 22) {
        await this.cleanupOldLocalBackups(true);
        // Try again after cleanup
        try {
          const key = `conversation_backup_${backup.conversationData.id}`;
          const serialized = JSON.stringify(backup);
          localStorage.setItem(key, serialized);
        } catch (retryError) {
          console.error('Failed to save to localStorage after cleanup:', retryError);
        }
      }
    }
  }

  private async saveToFirestore(backup: ConversationBackup): Promise<void> {
    try {
      await firebaseService.saveConversation(backup.conversationData);
      console.log('Conversation saved to Firestore:', backup.conversationData.id);
    } catch (error) {
      console.error('Failed to save to Firestore:', error);
      throw error;
    }
  }

  public async loadConversationState(conversationId: string): Promise<ConversationBackup | null> {
    // Try Firestore first if online
    if (this.options.enableFirestore && this.isOnline) {
      try {
        const firestoreData = await this.loadFromFirestore(conversationId);
        if (firestoreData) {
          return firestoreData;
        }
      } catch (error) {
        console.warn('Failed to load from Firestore, trying localStorage:', error);
      }
    }

    // Fallback to localStorage
    if (this.options.enableLocalStorage) {
      return await this.loadFromLocalStorage(conversationId);
    }

    return null;
  }

  private async loadFromFirestore(conversationId: string): Promise<ConversationBackup | null> {
    try {
      const conversationData = await firebaseService.getConversation(conversationId);
      if (!conversationData) return null;

      // Create a basic conversation state from the data
      const conversationState: ConversationState = {
        isListening: false,
        isAISpeaking: false,
        isProcessing: false,
        conversationHistory: conversationData.turns,
        currentQuestion: '',
        conversationSummary: conversationData.status === 'completed' ? conversationData.extractedInfo : null,
        currentStage: this.determineStageFromTurns(conversationData.turns),
        context: null
      };

      return {
        conversationData,
        conversationState,
        timestamp: new Date(),
        version: '1.0'
      };
    } catch (error) {
      console.error('Failed to load from Firestore:', error);
      return null;
    }
  }

  private async loadFromLocalStorage(conversationId: string): Promise<ConversationBackup | null> {
    try {
      const key = `conversation_backup_${conversationId}`;
      const serialized = localStorage.getItem(key);
      
      if (!serialized) return null;

      const parsed = JSON.parse(serialized);
      
      // Deserialize dates
      const backup: ConversationBackup = {
        ...parsed,
        timestamp: new Date(parsed.timestamp),
        conversationData: {
          ...parsed.conversationData,
          startedAt: new Date(parsed.conversationData.startedAt),
          completedAt: parsed.conversationData.completedAt ? new Date(parsed.conversationData.completedAt) : undefined,
          turns: parsed.conversationData.turns.map((turn: any) => ({
            ...turn,
            timestamp: new Date(turn.timestamp)
          }))
        }
      };

      return backup;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }

  public async getAllConversationBackups(): Promise<ConversationBackup[]> {
    const backups: ConversationBackup[] = [];

    // Get from localStorage
    if (this.options.enableLocalStorage) {
      const localBackups = await this.getAllLocalBackups();
      backups.push(...localBackups);
    }

    // Get from Firestore if online
    if (this.options.enableFirestore && this.isOnline) {
      try {
        const firestoreBackups = await this.getAllFirestoreBackups();
        
        // Merge with local backups, preferring newer versions
        const mergedBackups = new Map<string, ConversationBackup>();
        
        [...backups, ...firestoreBackups].forEach(backup => {
          const existing = mergedBackups.get(backup.conversationData.id);
          if (!existing || backup.timestamp > existing.timestamp) {
            mergedBackups.set(backup.conversationData.id, backup);
          }
        });
        
        return Array.from(mergedBackups.values());
      } catch (error) {
        console.warn('Failed to load from Firestore, using local backups only:', error);
      }
    }

    return backups;
  }

  private async getAllLocalBackups(): Promise<ConversationBackup[]> {
    const backups: ConversationBackup[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('conversation_backup_')) {
        const conversationId = key.replace('conversation_backup_', '');
        const backup = await this.loadFromLocalStorage(conversationId);
        if (backup) {
          backups.push(backup);
        }
      }
    }
    
    return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private async getAllFirestoreBackups(): Promise<ConversationBackup[]> {
    try {
      const conversations = await firebaseService.getUserConversations();
      return conversations.map(conversationData => ({
        conversationData,
        conversationState: {
          isListening: false,
          isAISpeaking: false,
          isProcessing: false,
          conversationHistory: conversationData.turns,
          currentQuestion: '',
          conversationSummary: conversationData.status === 'completed' ? conversationData.extractedInfo : null,
          currentStage: this.determineStageFromTurns(conversationData.turns),
          context: null
        },
        timestamp: conversationData.completedAt || conversationData.startedAt,
        version: '1.0'
      }));
    } catch (error) {
      console.error('Failed to load conversations from Firestore:', error);
      return [];
    }
  }

  private determineStageFromTurns(turns: ConversationTurn[]): any {
    // Simple heuristic to determine conversation stage from turns
    if (turns.length === 0) return 'introduction';
    if (turns.length <= 2) return 'basic_info';
    if (turns.length <= 6) return 'materials_crafting';
    if (turns.length <= 10) return 'cultural_significance';
    return 'summary';
  }

  private startAutoSave(conversationId: string): void {
    this.stopAutoSave(); // Clear any existing timer
    
    this.autoSaveTimer = setInterval(() => {
      // Auto-save would need to be triggered by the component
      // This is just the timer setup
      console.log('Auto-save timer triggered for conversation:', conversationId);
    }, this.options.autoSaveInterval);
  }

  public stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  private async cleanupOldLocalBackups(aggressive: boolean = false): Promise<void> {
    try {
      const backups = await this.getAllLocalBackups();
      const limit = aggressive ? Math.floor(this.options.maxLocalBackups / 2) : this.options.maxLocalBackups;
      
      if (backups.length > limit) {
        const toDelete = backups.slice(limit);
        toDelete.forEach(backup => {
          const key = `conversation_backup_${backup.conversationData.id}`;
          localStorage.removeItem(key);
        });
        console.log(`Cleaned up ${toDelete.length} old conversation backups`);
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  private async syncPendingUpdates(): Promise<void> {
    if (!this.isOnline || this.pendingUpdates.size === 0) return;

    console.log(`Syncing ${this.pendingUpdates.size} pending conversation updates`);
    
    const updates = Array.from(this.pendingUpdates.entries());
    
    for (const [conversationId, backup] of updates) {
      try {
        await this.saveToFirestore(backup);
        this.pendingUpdates.delete(conversationId);
        console.log('Synced conversation:', conversationId);
      } catch (error) {
        console.error('Failed to sync conversation:', conversationId, error);
        // Keep in pending updates for next sync attempt
      }
    }
  }

  public async deleteConversationBackup(conversationId: string): Promise<void> {
    // Delete from localStorage
    if (this.options.enableLocalStorage) {
      const key = `conversation_backup_${conversationId}`;
      localStorage.removeItem(key);
    }

    // Delete from Firestore
    if (this.options.enableFirestore && this.isOnline) {
      try {
        await firebaseService.deleteConversation(conversationId);
      } catch (error) {
        console.error('Failed to delete from Firestore:', error);
      }
    }

    // Remove from pending updates
    this.pendingUpdates.delete(conversationId);
  }

  public async resumeConversation(conversationId: string): Promise<ConversationBackup | null> {
    const backup = await this.loadConversationState(conversationId);
    
    if (backup) {
      this.currentConversationId = conversationId;
      this.startAutoSave(conversationId);
    }
    
    return backup;
  }

  public getPendingUpdatesCount(): number {
    return this.pendingUpdates.size;
  }

  public isOnlineMode(): boolean {
    return this.isOnline;
  }
}

// Export singleton instance
export const conversationPersistenceService = ConversationPersistenceService.getInstance();