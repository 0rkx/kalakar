import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

// Use db methods directly instead of importing individual functions
const { collection, query, where, orderBy, getDocs, doc, updateDoc } = db as any;

interface ConversationMetrics {
  conversationId: string;
  userId: string;
  timestamp: Date;
  eventType: 'start' | 'turn' | 'error' | 'abandon' | 'complete';
  eventData: {
    responseTime?: number;
    errorType?: string;
    abandonmentStage?: string;
    satisfactionScore?: number;
    speechProcessingTime?: number;
    speechAccuracy?: number;
  };
}

interface AnalyticsAggregation {
  totalConversations: number;
  completedConversations: number;
  abandonedConversations: number;
  averageCompletionRate: number;
  averageResponseTime: number;
  commonAbandonmentPoints: { stage: string; count: number }[];
  errorRates: { type: string; rate: number }[];
  qualityTrends: { date: string; score: number }[];
}

/**
 * Generate conversation analytics summary
 */
export const generateConversationAnalytics = onCall(
  { cors: true },
  async (request) => {
    try {
      const { userId, timeRange = '30d' } = request.data;
      
      logger.info('Generating conversation analytics', { userId, timeRange });

      // Calculate date range
      const now = new Date();
      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

      // Query conversation metrics
      let metricsQuery = query(
        collection(db, 'conversationMetrics'),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        orderBy('timestamp', 'desc')
      );

      if (userId) {
        metricsQuery = query(metricsQuery, where('userId', '==', userId));
      }

      const metricsSnapshot = await getDocs(metricsQuery);
      const metrics: ConversationMetrics[] = metricsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp.toDate()
        } as ConversationMetrics;
      });

      // Calculate analytics
      const analytics = await calculateAnalytics(metrics);
      
      logger.info('Analytics generated successfully', { 
        totalMetrics: metrics.length,
        totalConversations: analytics.totalConversations
      });

      return { success: true, analytics };

    } catch (error) {
      logger.error('Error generating conversation analytics:', error);
      throw new HttpsError('internal', 'Failed to generate analytics');
    }
  }
);

/**
 * Track conversation completion rate
 */
export const trackConversationCompletion = onCall(
  { cors: true },
  async (request) => {
    try {
      const { conversationId, userId, status, satisfactionScore } = request.data;
      
      if (!conversationId || !userId || !status) {
        throw new HttpsError('invalid-argument', 'Missing required fields');
      }

      logger.info('Tracking conversation completion', { conversationId, status });

      // Save completion metric
      const metric: ConversationMetrics = {
        conversationId,
        userId,
        timestamp: new Date(),
        eventType: status === 'completed' ? 'complete' : 'abandon',
        eventData: {
          satisfactionScore: satisfactionScore || undefined,
          abandonmentStage: status === 'abandoned' ? request.data.abandonmentStage : undefined
        }
      };

      await db.collection('conversationMetrics').add({
        ...metric,
        timestamp: Timestamp.fromDate(metric.timestamp)
      });

      // Update conversation document with completion analytics
      if (status === 'completed') {
        const conversationRef = doc(db, 'conversations', conversationId);
        await updateDoc(conversationRef, {
          status: 'completed',
          completedAt: Timestamp.now(),
          satisfactionScore: satisfactionScore || null
        });
      }

      return { success: true };

    } catch (error) {
      logger.error('Error tracking conversation completion:', error);
      throw new HttpsError('internal', 'Failed to track completion');
    }
  }
);

/**
 * Track speech processing errors
 */
export const trackSpeechProcessingError = onCall(
  { cors: true },
  async (request) => {
    try {
      const { conversationId, userId, errorType, errorDetails } = request.data;
      
      if (!conversationId || !userId || !errorType) {
        throw new HttpsError('invalid-argument', 'Missing required fields');
      }

      logger.info('Tracking speech processing error', { conversationId, errorType });

      const metric: ConversationMetrics = {
        conversationId,
        userId,
        timestamp: new Date(),
        eventType: 'error',
        eventData: {
          errorType: `speech_${errorType}`,
          ...errorDetails
        }
      };

      await db.collection('conversationMetrics').add({
        ...metric,
        timestamp: Timestamp.fromDate(metric.timestamp)
      });

      return { success: true };

    } catch (error) {
      logger.error('Error tracking speech processing error:', error);
      throw new HttpsError('internal', 'Failed to track error');
    }
  }
);

/**
 * Calculate conversation quality metrics
 */
export const calculateConversationQuality = onCall(
  { cors: true },
  async (request) => {
    try {
      const { conversationId } = request.data;
      
      if (!conversationId) {
        throw new HttpsError('invalid-argument', 'Conversation ID is required');
      }

      logger.info('Calculating conversation quality', { conversationId });

      // Get conversation data
      const conversationDoc = await db.collection('conversations').doc(conversationId).get();
      if (!conversationDoc.exists) {
        throw new HttpsError('not-found', 'Conversation not found');
      }

      const conversationData = conversationDoc.data();
      
      // Get conversation metrics
      const metricsQuery = query(
        collection(db, 'conversationMetrics'),
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'asc')
      );

      const metricsSnapshot = await getDocs(metricsQuery);
      const metrics: ConversationMetrics[] = metricsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp.toDate()
        } as ConversationMetrics;
      });

      // Calculate quality score
      const qualityScore = calculateQualityScore(conversationData, metrics);

      // Update conversation with quality metrics
      await updateDoc(doc(db, 'conversations', conversationId), {
        qualityScore,
        qualityCalculatedAt: Timestamp.now()
      });

      return { success: true, qualityScore };

    } catch (error) {
      logger.error('Error calculating conversation quality:', error);
      throw new HttpsError('internal', 'Failed to calculate quality');
    }
  }
);

/**
 * Helper function to calculate analytics from metrics
 */
async function calculateAnalytics(metrics: ConversationMetrics[]): Promise<AnalyticsAggregation> {
  const conversationIds = [...new Set(metrics.map(m => m.conversationId))];
  
  const totalConversations = conversationIds.length;
  const completedConversations = metrics.filter(m => m.eventType === 'complete').length;
  const abandonedConversations = metrics.filter(m => m.eventType === 'abandon').length;
  
  const averageCompletionRate = totalConversations > 0 
    ? (completedConversations / totalConversations) * 100 
    : 0;

  // Calculate average response time
  const turnMetrics = metrics.filter(m => m.eventType === 'turn');
  const responseTimes = turnMetrics
    .map(m => m.eventData.responseTime)
    .filter(rt => rt !== undefined) as number[];
  
  const averageResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
    : 0;

  // Analyze abandonment points
  const abandonmentPoints = metrics
    .filter(m => m.eventType === 'abandon')
    .map(m => m.eventData.abandonmentStage)
    .filter(stage => stage !== undefined) as string[];
  
  const abandonmentCounts = abandonmentPoints.reduce((acc, stage) => {
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const commonAbandonmentPoints = Object.entries(abandonmentCounts)
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calculate error rates
  const errorMetrics = metrics.filter(m => m.eventType === 'error');
  const errorTypes = errorMetrics.map(m => m.eventData.errorType).filter(Boolean) as string[];
  const errorCounts = errorTypes.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const errorRates = Object.entries(errorCounts)
    .map(([type, count]) => ({ 
      type, 
      rate: totalConversations > 0 ? (count / totalConversations) * 100 : 0 
    }));

  // Generate quality trends
  const qualityTrends = generateQualityTrends(metrics);

  return {
    totalConversations,
    completedConversations,
    abandonedConversations,
    averageCompletionRate,
    averageResponseTime,
    commonAbandonmentPoints,
    errorRates,
    qualityTrends
  };
}

/**
 * Helper function to calculate quality score
 */
function calculateQualityScore(conversationData: any, metrics: ConversationMetrics[]): number {
  let score = 100;

  // Penalize for errors
  const errorCount = metrics.filter(m => m.eventType === 'error').length;
  score -= errorCount * 10;

  // Reward for completion
  const isCompleted = metrics.some(m => m.eventType === 'complete');
  if (isCompleted) {
    score += 20;
  }

  // Consider response times
  const turnMetrics = metrics.filter(m => m.eventType === 'turn');
  const responseTimes = turnMetrics
    .map(m => m.eventData.responseTime)
    .filter(rt => rt !== undefined) as number[];

  if (responseTimes.length > 0) {
    const avgResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
    if (avgResponseTime > 5000) { // More than 5 seconds
      score -= 15;
    } else if (avgResponseTime < 2000) { // Less than 2 seconds
      score += 10;
    }
  }

  // Consider conversation length (engagement)
  const turnCount = conversationData?.turns?.length || 0;
  if (turnCount > 10) {
    score += 10; // Good engagement
  } else if (turnCount < 3) {
    score -= 20; // Poor engagement
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Helper function to generate quality trends
 */
function generateQualityTrends(metrics: ConversationMetrics[]): { date: string; score: number }[] {
  const dailyMetrics = metrics.reduce((acc, metric) => {
    const date = metric.timestamp.toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { completed: 0, total: 0, errors: 0 };
    }
    
    if (metric.eventType === 'complete') acc[date].completed++;
    if (metric.eventType === 'start') acc[date].total++;
    if (metric.eventType === 'error') acc[date].errors++;
    
    return acc;
  }, {} as Record<string, { completed: number; total: number; errors: number }>);

  return Object.entries(dailyMetrics)
    .map(([date, data]) => ({
      date,
      score: data.total > 0 ? ((data.completed / data.total) * 100) - (data.errors * 5) : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}