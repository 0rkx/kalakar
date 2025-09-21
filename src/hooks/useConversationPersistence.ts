// src/hooks/useConversationPersistence.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { ConversationData, ConversationState } from '../types';
import { conversationPersistenceService, ConversationBackup } from '../services/conversation-persistence-service';

export interface ConversationPersistenceState {
  isAutoSaving: boolean;
  lastSaved: Date | null;
  pendingUpdates: number;
  isOnline: boolean;
  availableBackups: ConversationBackup[];
  isLoading: boolean;
}

export interface ConversationPersistenceHandlers {
  startPersistence: (conversationData: ConversationData, conversationState: ConversationState) => Promise<void>;
  saveNow: (conversationData: ConversationData, conversationState: ConversationState) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<ConversationBackup | null>;
  resumeConversation: (conversationId: string) => Promise<ConversationBackup | null>;
  deleteConversation: (conversationId: string) => Promise<void>;
  loadAvailableBackups: () => Promise<void>;
  stopPersistence: () => void;
}

export const useConversationPersistence = (): [ConversationPersistenceState, ConversationPersistenceHandlers] => {
  const [persistenceState, setPersistenceState] = useState<ConversationPersistenceState>({
    isAutoSaving: false,
    lastSaved: null,
    pendingUpdates: 0,
    isOnline: conversationPersistenceService.isOnlineMode(),
    availableBackups: [],
    isLoading: false
  });

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const currentConversationRef = useRef<{
    data: ConversationData;
    state: ConversationState;
  } | null>(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setPersistenceState(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setPersistenceState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending updates count periodically
  useEffect(() => {
    const updatePendingCount = () => {
      const count = conversationPersistenceService.getPendingUpdatesCount();
      setPersistenceState(prev => ({ ...prev, pendingUpdates: count }));
    };

    const interval = setInterval(updatePendingCount, 2000);
    updatePendingCount(); // Initial update

    return () => clearInterval(interval);
  }, []);

  const startAutoSave = useCallback((conversationData: ConversationData, conversationState: ConversationState) => {
    // Clear existing timer
    if (autoSaveTimer.current) {
      clearInterval(autoSaveTimer.current);
    }

    // Update current conversation reference
    currentConversationRef.current = { data: conversationData, state: conversationState };

    // Start auto-save timer
    autoSaveTimer.current = setInterval(async () => {
      if (currentConversationRef.current) {
        try {
          setPersistenceState(prev => ({ ...prev, isAutoSaving: true }));
          
          await conversationPersistenceService.saveConversationState(
            currentConversationRef.current!.data,
            currentConversationRef.current!.state
          );
          
          setPersistenceState(prev => ({
            ...prev,
            isAutoSaving: false,
            lastSaved: new Date()
          }));
        } catch (error) {
          console.error('Auto-save failed:', error);
          setPersistenceState(prev => ({ ...prev, isAutoSaving: false }));
        }
      }
    }, 5000); // Auto-save every 5 seconds

    setPersistenceState(prev => ({ ...prev, isAutoSaving: true }));
  }, []);

  const stopAutoSave = useCallback(() => {
    if (autoSaveTimer.current) {
      clearInterval(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    currentConversationRef.current = null;
    conversationPersistenceService.stopAutoSave();
    setPersistenceState(prev => ({ ...prev, isAutoSaving: false }));
  }, []);

  const startPersistence = useCallback(async (
    conversationData: ConversationData,
    conversationState: ConversationState
  ) => {
    try {
      setPersistenceState(prev => ({ ...prev, isLoading: true }));
      
      await conversationPersistenceService.startConversationPersistence(conversationData, conversationState);
      startAutoSave(conversationData, conversationState);
      
      setPersistenceState(prev => ({
        ...prev,
        isLoading: false,
        lastSaved: new Date()
      }));
    } catch (error) {
      console.error('Failed to start persistence:', error);
      setPersistenceState(prev => ({ ...prev, isLoading: false }));
    }
  }, [startAutoSave]);

  const saveNow = useCallback(async (
    conversationData: ConversationData,
    conversationState: ConversationState
  ) => {
    try {
      setPersistenceState(prev => ({ ...prev, isAutoSaving: true }));
      
      // Update current conversation reference
      currentConversationRef.current = { data: conversationData, state: conversationState };
      
      await conversationPersistenceService.saveConversationState(conversationData, conversationState, true);
      
      setPersistenceState(prev => ({
        ...prev,
        isAutoSaving: false,
        lastSaved: new Date()
      }));
    } catch (error) {
      console.error('Manual save failed:', error);
      setPersistenceState(prev => ({ ...prev, isAutoSaving: false }));
      throw error;
    }
  }, []);

  const loadConversation = useCallback(async (conversationId: string): Promise<ConversationBackup | null> => {
    try {
      setPersistenceState(prev => ({ ...prev, isLoading: true }));
      
      const backup = await conversationPersistenceService.loadConversationState(conversationId);
      
      setPersistenceState(prev => ({ ...prev, isLoading: false }));
      return backup;
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setPersistenceState(prev => ({ ...prev, isLoading: false }));
      return null;
    }
  }, []);

  const resumeConversation = useCallback(async (conversationId: string): Promise<ConversationBackup | null> => {
    try {
      setPersistenceState(prev => ({ ...prev, isLoading: true }));
      
      const backup = await conversationPersistenceService.resumeConversation(conversationId);
      
      if (backup) {
        startAutoSave(backup.conversationData, backup.conversationState);
      }
      
      setPersistenceState(prev => ({ ...prev, isLoading: false }));
      return backup;
    } catch (error) {
      console.error('Failed to resume conversation:', error);
      setPersistenceState(prev => ({ ...prev, isLoading: false }));
      return null;
    }
  }, [startAutoSave]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      await conversationPersistenceService.deleteConversationBackup(conversationId);
      
      // Update available backups
      setPersistenceState(prev => ({
        ...prev,
        availableBackups: prev.availableBackups.filter(
          backup => backup.conversationData.id !== conversationId
        )
      }));
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  }, []);

  const loadAvailableBackups = useCallback(async () => {
    try {
      setPersistenceState(prev => ({ ...prev, isLoading: true }));
      
      const backups = await conversationPersistenceService.getAllConversationBackups();
      
      setPersistenceState(prev => ({
        ...prev,
        availableBackups: backups,
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to load available backups:', error);
      setPersistenceState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const stopPersistence = useCallback(() => {
    stopAutoSave();
  }, [stopAutoSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoSave();
    };
  }, [stopAutoSave]);

  const handlers: ConversationPersistenceHandlers = {
    startPersistence,
    saveNow,
    loadConversation,
    resumeConversation,
    deleteConversation,
    loadAvailableBackups,
    stopPersistence
  };

  return [persistenceState, handlers];
};

export default useConversationPersistence;