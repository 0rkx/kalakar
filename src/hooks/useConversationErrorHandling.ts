// src/hooks/useConversationErrorHandling.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { ConversationError } from '../types';
import { conversationErrorService } from '../services/conversation-error-service';

export interface ConversationErrorState {
  currentError: ConversationError | null;
  isRetrying: boolean;
  retryCount: number;
  hasTextFallback: boolean;
  networkStatus: {
    isOnline: boolean;
    connectionType?: string;
    effectiveType?: string;
  };
}

export interface ConversationErrorHandlers {
  handleSpeechError: (error: any, retryAction: () => Promise<void>) => Promise<void>;
  handleAIError: (error: any, retryAction: () => Promise<void>) => Promise<void>;
  handleAudioError: (error: any, retryAction: () => Promise<void>) => Promise<void>;
  handleNetworkError: (error: any, retryAction: () => Promise<void>) => Promise<void>;
  clearError: () => void;
  retry: () => Promise<void>;
  enableTextFallback: () => void;
  disableTextFallback: () => void;
}

export const useConversationErrorHandling = (): [ConversationErrorState, ConversationErrorHandlers] => {
  const [errorState, setErrorState] = useState<ConversationErrorState>({
    currentError: null,
    isRetrying: false,
    retryCount: 0,
    hasTextFallback: false,
    networkStatus: conversationErrorService.getNetworkStatus()
  });

  const currentRetryAction = useRef<(() => Promise<void>) | null>(null);

  // Listen for network status changes
  useEffect(() => {
    const handleNetworkStatusChange = (error: ConversationError) => {
      if (error.type === 'network') {
        setErrorState(prev => ({
          ...prev,
          networkStatus: conversationErrorService.getNetworkStatus(),
          currentError: error.message.includes('restored') ? null : error
        }));
      }
    };

    conversationErrorService.addErrorListener(handleNetworkStatusChange);

    return () => {
      conversationErrorService.removeErrorListener(handleNetworkStatusChange);
    };
  }, []);

  const handleSpeechError = useCallback(async (error: any, retryAction: () => Promise<void>) => {
    try {
      const conversationError = await conversationErrorService.handleSpeechRecognitionError(error, retryAction);
      
      setErrorState(prev => ({
        ...prev,
        currentError: conversationError,
        retryCount: conversationErrorService.getRetryAttempts('speech_recognition'),
        hasTextFallback: !conversationError.recoverable || prev.hasTextFallback
      }));

      currentRetryAction.current = conversationError.retryAction || null;

      // Auto-enable text fallback for certain errors
      if (error.error === 'not-allowed' || error.error === 'audio-capture') {
        setErrorState(prev => ({ ...prev, hasTextFallback: true }));
      }

    } catch (err) {
      console.error('Error handling speech error:', err);
      setErrorState(prev => ({
        ...prev,
        currentError: {
          type: 'speech_recognition',
          message: 'Speech recognition failed. Please use text input.',
          recoverable: false
        },
        hasTextFallback: true
      }));
    }
  }, []);

  const handleAIError = useCallback(async (error: any, retryAction: () => Promise<void>) => {
    try {
      const conversationError = await conversationErrorService.handleAIProcessingError(error, retryAction);
      
      setErrorState(prev => ({
        ...prev,
        currentError: conversationError,
        retryCount: conversationErrorService.getRetryAttempts('ai_processing')
      }));

      currentRetryAction.current = conversationError.retryAction || null;

    } catch (err) {
      console.error('Error handling AI error:', err);
      setErrorState(prev => ({
        ...prev,
        currentError: {
          type: 'ai_processing',
          message: 'AI processing failed. Please try again later.',
          recoverable: false
        }
      }));
    }
  }, []);

  const handleAudioError = useCallback(async (error: any, retryAction: () => Promise<void>) => {
    try {
      const conversationError = await conversationErrorService.handleAudioPlaybackError(error, retryAction);
      
      setErrorState(prev => ({
        ...prev,
        currentError: conversationError,
        retryCount: conversationErrorService.getRetryAttempts('audio_playback')
      }));

      currentRetryAction.current = conversationError.retryAction || null;

    } catch (err) {
      console.error('Error handling audio error:', err);
      setErrorState(prev => ({
        ...prev,
        currentError: {
          type: 'audio_playback',
          message: 'Audio playback failed. Text response is available.',
          recoverable: false
        }
      }));
    }
  }, []);

  const handleNetworkError = useCallback(async (error: any, retryAction: () => Promise<void>) => {
    try {
      const conversationError = await conversationErrorService.handleNetworkError(error, retryAction);
      
      setErrorState(prev => ({
        ...prev,
        currentError: conversationError,
        retryCount: conversationErrorService.getRetryAttempts('network'),
        networkStatus: conversationErrorService.getNetworkStatus()
      }));

      currentRetryAction.current = conversationError.retryAction || null;

    } catch (err) {
      console.error('Error handling network error:', err);
      setErrorState(prev => ({
        ...prev,
        currentError: {
          type: 'network',
          message: 'Network error. Please check your connection.',
          recoverable: true
        }
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      currentError: null,
      isRetrying: false
    }));
    currentRetryAction.current = null;
  }, []);

  const retry = useCallback(async () => {
    if (!currentRetryAction.current) return;

    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
      currentError: null
    }));

    try {
      await currentRetryAction.current();
      // Success - clear error state
      setErrorState(prev => ({
        ...prev,
        isRetrying: false,
        currentError: null
      }));
      currentRetryAction.current = null;
    } catch (error) {
      // Retry failed - show error again
      setErrorState(prev => ({
        ...prev,
        isRetrying: false,
        currentError: {
          type: 'ai_processing',
          message: 'Retry failed. Please try again.',
          recoverable: true,
          retryAction: currentRetryAction.current || undefined
        }
      }));
    }
  }, []);

  const enableTextFallback = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      hasTextFallback: true
    }));
  }, []);

  const disableTextFallback = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      hasTextFallback: false
    }));
  }, []);

  const handlers: ConversationErrorHandlers = {
    handleSpeechError,
    handleAIError,
    handleAudioError,
    handleNetworkError,
    clearError,
    retry,
    enableTextFallback,
    disableTextFallback
  };

  return [errorState, handlers];
};

export default useConversationErrorHandling;