import { useState, useEffect, useCallback } from 'react';
import { 
  ConversationAnalytics, 
  ConversationMetrics, 
  AnalyticsSummary,
  ConversationData 
} from '../types';
import { conversationAnalyticsService } from '../services/conversation-analytics-service';

interface UseConversationAnalyticsReturn {
  // Analytics data
  analyticsSummary: AnalyticsSummary | null;
  conversationMetrics: ConversationMetrics[];
  isLoading: boolean;
  error: string | null;

  // Analytics tracking methods
  trackConversationStart: (conversationId: string, userId: string) => void;
  trackConversationTurn: (
    conversationId: string, 
    userId: string, 
    responseTime: number,
    speechProcessingTime?: number,
    speechAccuracy?: number
  ) => void;
  trackConversationError: (conversationId: string, userId: string, errorType: string) => void;
  trackConversationAbandonment: (conversationId: string, userId: string, stage: string) => void;
  trackConversationCompletion: (conversationId: string, userId: string, satisfactionScore?: number) => void;
  
  // Analytics calculation methods
  calculateConversationAnalytics: (conversationData: ConversationData) => ConversationAnalytics;
  refreshAnalytics: () => Promise<void>;
  getConversationMetrics: (conversationId: string) => Promise<ConversationMetrics[]>;

  // Response time tracking
  startResponseTimer: () => void;
  endResponseTimer: () => number;
}

export const useConversationAnalytics = (userId?: string): UseConversationAnalyticsReturn => {
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [conversationMetrics, setConversationMetrics] = useState<ConversationMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load analytics summary on mount
  useEffect(() => {
    refreshAnalytics();
  }, [userId]);

  // Refresh analytics data
  const refreshAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const summary = await conversationAnalyticsService.generateAnalyticsSummary(userId);
      setAnalyticsSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Track conversation start
  const trackConversationStart = useCallback((conversationId: string, userId: string) => {
    try {
      conversationAnalyticsService.trackConversationStart(conversationId, userId);
    } catch (err) {
      console.error('Error tracking conversation start:', err);
    }
  }, []);

  // Track conversation turn
  const trackConversationTurn = useCallback((
    conversationId: string, 
    userId: string, 
    responseTime: number,
    speechProcessingTime?: number,
    speechAccuracy?: number
  ) => {
    try {
      conversationAnalyticsService.trackConversationTurn(
        conversationId, 
        userId, 
        responseTime, 
        speechProcessingTime, 
        speechAccuracy
      );
    } catch (err) {
      console.error('Error tracking conversation turn:', err);
    }
  }, []);

  // Track conversation error
  const trackConversationError = useCallback((
    conversationId: string, 
    userId: string, 
    errorType: string
  ) => {
    try {
      conversationAnalyticsService.trackConversationError(conversationId, userId, errorType);
    } catch (err) {
      console.error('Error tracking conversation error:', err);
    }
  }, []);

  // Track conversation abandonment
  const trackConversationAbandonment = useCallback((
    conversationId: string, 
    userId: string, 
    stage: string
  ) => {
    try {
      conversationAnalyticsService.trackConversationAbandonment(conversationId, userId, stage);
    } catch (err) {
      console.error('Error tracking conversation abandonment:', err);
    }
  }, []);

  // Track conversation completion
  const trackConversationCompletion = useCallback((
    conversationId: string, 
    userId: string, 
    satisfactionScore?: number
  ) => {
    try {
      conversationAnalyticsService.trackConversationCompletion(conversationId, userId, satisfactionScore);
    } catch (err) {
      console.error('Error tracking conversation completion:', err);
    }
  }, []);

  // Calculate conversation analytics
  const calculateConversationAnalytics = useCallback((conversationData: ConversationData): ConversationAnalytics => {
    return conversationAnalyticsService.calculateConversationAnalytics(conversationData);
  }, []);

  // Get conversation metrics
  const getConversationMetrics = useCallback(async (conversationId: string): Promise<ConversationMetrics[]> => {
    try {
      return await conversationAnalyticsService.getConversationMetrics(conversationId);
    } catch (err) {
      console.error('Error getting conversation metrics:', err);
      return [];
    }
  }, []);

  // Start response timer
  const startResponseTimer = useCallback(() => {
    conversationAnalyticsService.startResponseTimer();
  }, []);

  // End response timer
  const endResponseTimer = useCallback((): number => {
    return conversationAnalyticsService.endResponseTimer();
  }, []);

  return {
    analyticsSummary,
    conversationMetrics,
    isLoading,
    error,
    trackConversationStart,
    trackConversationTurn,
    trackConversationError,
    trackConversationAbandonment,
    trackConversationCompletion,
    calculateConversationAnalytics,
    refreshAnalytics,
    getConversationMetrics,
    startResponseTimer,
    endResponseTimer
  };
};