// src/services/conversation-error-service.ts

import { ConversationError } from '../types';

export interface ErrorRecoveryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface NetworkStatus {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
}

export class ConversationErrorService {
  private static instance: ConversationErrorService;
  private retryAttempts: Map<string, number> = new Map();
  private networkStatus: NetworkStatus = { isOnline: navigator.onLine };
  private errorListeners: Set<(error: ConversationError) => void> = new Set();

  private constructor() {
    this.initializeNetworkMonitoring();
  }

  public static getInstance(): ConversationErrorService {
    if (!ConversationErrorService.instance) {
      ConversationErrorService.instance = new ConversationErrorService();
    }
    return ConversationErrorService.instance;
  }

  private initializeNetworkMonitoring(): void {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.networkStatus.isOnline = true;
      this.notifyNetworkRecovery();
    });

    window.addEventListener('offline', () => {
      this.networkStatus.isOnline = false;
      this.handleNetworkError();
    });

    // Monitor connection quality if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        this.networkStatus.connectionType = connection.type;
        this.networkStatus.effectiveType = connection.effectiveType;
      });
    }
  }

  public addErrorListener(listener: (error: ConversationError) => void): void {
    this.errorListeners.add(listener);
  }

  public removeErrorListener(listener: (error: ConversationError) => void): void {
    this.errorListeners.delete(listener);
  }

  private notifyErrorListeners(error: ConversationError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }

  private notifyNetworkRecovery(): void {
    const recoveryError: ConversationError = {
      type: 'network',
      message: 'Connection restored! You can continue your conversation.',
      recoverable: true
    };
    this.notifyErrorListeners(recoveryError);
  }

  private handleNetworkError(): void {
    const networkError: ConversationError = {
      type: 'network',
      message: 'Connection lost. Your conversation will be saved and you can continue when back online.',
      recoverable: true,
      retryAction: () => this.checkNetworkAndRetry()
    };
    this.notifyErrorListeners(networkError);
  }

  private checkNetworkAndRetry(): void {
    if (this.networkStatus.isOnline) {
      this.notifyNetworkRecovery();
    } else {
      setTimeout(() => this.checkNetworkAndRetry(), 2000);
    }
  }

  public async handleSpeechRecognitionError(
    error: any,
    retryAction: () => Promise<void>
  ): Promise<ConversationError> {
    const errorKey = 'speech_recognition';
    const attempts = this.retryAttempts.get(errorKey) || 0;

    let errorMessage: string;
    let recoverable = true;

    switch (error.error || error.type) {
      case 'not-allowed':
        errorMessage = 'Microphone access denied. Please enable microphone permissions or use text input.';
        recoverable = false;
        break;
      case 'no-speech':
        errorMessage = "I didn't hear anything. Please try speaking again.";
        break;
      case 'audio-capture':
        errorMessage = 'Microphone not available. Please check your microphone or use text input.';
        break;
      case 'network':
        errorMessage = 'Network error during speech recognition. Please check your connection.';
        break;
      case 'aborted':
        errorMessage = 'Speech recognition was interrupted. Please try again.';
        break;
      case 'language-not-supported':
        errorMessage = 'Selected language not supported for speech recognition. Please use text input.';
        recoverable = false;
        break;
      default:
        errorMessage = 'Speech recognition failed. Please try again or use text input.';
    }

    const conversationError: ConversationError = {
      type: 'speech_recognition',
      message: errorMessage,
      recoverable,
      retryAction: recoverable ? () => this.retryWithBackoff(errorKey, retryAction) : undefined
    };

    if (recoverable) {
      this.retryAttempts.set(errorKey, attempts + 1);
    }

    return conversationError;
  }

  public async handleAIProcessingError(
    error: any,
    retryAction: () => Promise<void>
  ): Promise<ConversationError> {
    const errorKey = 'ai_processing';
    const attempts = this.retryAttempts.get(errorKey) || 0;

    let errorMessage: string;
    let recoverable = true;

    if (error.code === 'functions/unavailable') {
      errorMessage = 'AI service temporarily unavailable. Please try again in a moment.';
    } else if (error.code === 'functions/deadline-exceeded') {
      errorMessage = 'AI processing took too long. Please try again.';
    } else if (error.code === 'functions/resource-exhausted') {
      errorMessage = 'AI service is busy. Please wait a moment and try again.';
    } else if (error.code === 'functions/permission-denied') {
      errorMessage = 'Authentication error. Please refresh the page and try again.';
      recoverable = false;
    } else if (!this.networkStatus.isOnline) {
      errorMessage = 'No internet connection. Please check your connection and try again.';
    } else {
      errorMessage = 'AI processing failed. Please try again.';
    }

    const conversationError: ConversationError = {
      type: 'ai_processing',
      message: errorMessage,
      recoverable,
      retryAction: recoverable ? () => this.retryWithBackoff(errorKey, retryAction) : undefined
    };

    if (recoverable) {
      this.retryAttempts.set(errorKey, attempts + 1);
    }

    return conversationError;
  }

  public async handleAudioPlaybackError(
    error: any,
    retryAction: () => Promise<void>
  ): Promise<ConversationError> {
    const errorKey = 'audio_playback';
    const attempts = this.retryAttempts.get(errorKey) || 0;

    let errorMessage: string;
    let recoverable = true;

    if (error.name === 'NotAllowedError') {
      errorMessage = 'Audio playback blocked. Please enable audio or read the text response.';
      recoverable = false;
    } else if (error.name === 'NotSupportedError') {
      errorMessage = 'Audio format not supported. The text response is available below.';
      recoverable = false;
    } else {
      errorMessage = 'Audio playback failed. You can read the text response below.';
    }

    const conversationError: ConversationError = {
      type: 'audio_playback',
      message: errorMessage,
      recoverable,
      retryAction: recoverable ? () => this.retryWithBackoff(errorKey, retryAction) : undefined
    };

    if (recoverable) {
      this.retryAttempts.set(errorKey, attempts + 1);
    }

    return conversationError;
  }

  public async handleNetworkError(
    error: any,
    retryAction: () => Promise<void>
  ): Promise<ConversationError> {
    const errorKey = 'network';
    const attempts = this.retryAttempts.get(errorKey) || 0;

    let errorMessage: string;

    if (!this.networkStatus.isOnline) {
      errorMessage = 'You appear to be offline. Your conversation is saved and will continue when connection is restored.';
    } else if (this.networkStatus.effectiveType === 'slow-2g') {
      errorMessage = 'Slow connection detected. Please wait while we process your request.';
    } else {
      errorMessage = 'Network error occurred. Please check your connection and try again.';
    }

    const conversationError: ConversationError = {
      type: 'network',
      message: errorMessage,
      recoverable: true,
      retryAction: () => this.retryWithBackoff(errorKey, retryAction)
    };

    this.retryAttempts.set(errorKey, attempts + 1);
    return conversationError;
  }

  private async retryWithBackoff(
    errorKey: string,
    retryAction: () => Promise<void>,
    options: ErrorRecoveryOptions = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    }
  ): Promise<void> {
    const attempts = this.retryAttempts.get(errorKey) || 0;

    if (attempts >= options.maxRetries) {
      this.retryAttempts.delete(errorKey);
      throw new Error(`Max retry attempts (${options.maxRetries}) exceeded for ${errorKey}`);
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      options.baseDelay * Math.pow(options.backoffMultiplier, attempts),
      options.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitteredDelay = delay + Math.random() * 1000;

    await new Promise(resolve => setTimeout(resolve, jitteredDelay));

    try {
      await retryAction();
      // Success - reset retry count
      this.retryAttempts.delete(errorKey);
    } catch (error) {
      // Increment retry count and re-throw
      this.retryAttempts.set(errorKey, attempts + 1);
      throw error;
    }
  }

  public clearRetryAttempts(errorKey?: string): void {
    if (errorKey) {
      this.retryAttempts.delete(errorKey);
    } else {
      this.retryAttempts.clear();
    }
  }

  public getRetryAttempts(errorKey: string): number {
    return this.retryAttempts.get(errorKey) || 0;
  }

  public isNetworkAvailable(): boolean {
    return this.networkStatus.isOnline;
  }

  public getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  public createFallbackTextInputError(): ConversationError {
    return {
      type: 'speech_recognition',
      message: 'Voice input unavailable. Please use the text input option below.',
      recoverable: false
    };
  }

  public createGracefulDegradationError(feature: string): ConversationError {
    return {
      type: 'ai_processing',
      message: `${feature} temporarily unavailable. Basic functionality continues to work.`,
      recoverable: true
    };
  }
}

// Export singleton instance
export const conversationErrorService = ConversationErrorService.getInstance();