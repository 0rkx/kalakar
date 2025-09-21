import { 
  ConversationAnalytics, 
  ConversationMetrics, 
  ConversationQualityMetrics,
  AnalyticsSummary,
  ConversationData 
} from '../types';
import { firebaseService } from './firebase-service';

class ConversationAnalyticsService {
  private metrics: ConversationMetrics[] = [];
  private currentConversationStartTime: number | null = null;
  private currentConversationId: string | null = null;
  private responseStartTime: number | null = null;

  // Track conversation start
  trackConversationStart(conversationId: string, userId: string): void {
    this.currentConversationStartTime = Date.now();
    this.currentConversationId = conversationId;
    
    const metric: ConversationMetrics = {
      conversationId,
      userId,
      timestamp: new Date(),
      eventType: 'start',
      eventData: {}
    };
    
    this.metrics.push(metric);
    this.saveMetric(metric);
  }

  // Track conversation turn with response time
  trackConversationTurn(
    conversationId: string, 
    userId: string, 
    responseTime: number,
    speechProcessingTime?: number,
    speechAccuracy?: number
  ): void {
    const metric: ConversationMetrics = {
      conversationId,
      userId,
      timestamp: new Date(),
      eventType: 'turn',
      eventData: {
        responseTime,
        speechProcessingTime,
        speechAccuracy
      }
    };
    
    this.metrics.push(metric);
    this.saveMetric(metric);
  }

  // Track conversation errors
  trackConversationError(
    conversationId: string, 
    userId: string, 
    errorType: string
  ): void {
    const metric: ConversationMetrics = {
      conversationId,
      userId,
      timestamp: new Date(),
      eventType: 'error',
      eventData: {
        errorType
      }
    };
    
    this.metrics.push(metric);
    this.saveMetric(metric);
  }

  // Track conversation abandonment
  trackConversationAbandonment(
    conversationId: string, 
    userId: string, 
    abandonmentStage: string
  ): void {
    const metric: ConversationMetrics = {
      conversationId,
      userId,
      timestamp: new Date(),
      eventType: 'abandon',
      eventData: {
        abandonmentStage
      }
    };
    
    this.metrics.push(metric);
    this.saveMetric(metric);
  }

  // Track conversation completion
  trackConversationCompletion(
    conversationId: string, 
    userId: string, 
    satisfactionScore?: number
  ): void {
    const metric: ConversationMetrics = {
      conversationId,
      userId,
      timestamp: new Date(),
      eventType: 'complete',
      eventData: {
        satisfactionScore
      }
    };
    
    this.metrics.push(metric);
    this.saveMetric(metric);
  }

  // Start tracking response time
  startResponseTimer(): void {
    this.responseStartTime = Date.now();
  }

  // End tracking response time and return duration
  endResponseTimer(): number {
    if (!this.responseStartTime) return 0;
    const duration = Date.now() - this.responseStartTime;
    this.responseStartTime = null;
    return duration;
  }

  // Calculate conversation analytics
  calculateConversationAnalytics(conversationData: ConversationData): ConversationAnalytics {
    const conversationMetrics = this.metrics.filter(
      m => m.conversationId === conversationData.id
    );

    const completionRate = conversationData.status === 'completed' ? 100 : 0;
    const totalDuration = conversationData.completedAt && conversationData.startedAt
      ? conversationData.completedAt.getTime() - conversationData.startedAt.getTime()
      : 0;

    const turnMetrics = conversationMetrics.filter(m => m.eventType === 'turn');
    const responseTimes = turnMetrics
      .map(m => m.eventData.responseTime)
      .filter(rt => rt !== undefined) as number[];
    
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
      : 0;

    const errorMetrics = conversationMetrics.filter(m => m.eventType === 'error');
    const speechProcessingErrors = errorMetrics.filter(
      m => m.eventData.errorType?.includes('speech')
    ).length;

    const abandonmentPoint = conversationMetrics
      .find(m => m.eventType === 'abandon')?.eventData.abandonmentStage;

    const speechAccuracyScores = turnMetrics
      .map(m => m.eventData.speechAccuracy)
      .filter(sa => sa !== undefined) as number[];

    const qualityMetrics: ConversationQualityMetrics = {
      responseTimeMs: responseTimes,
      speechRecognitionAccuracy: speechAccuracyScores,
      questionRelevanceScore: [], // Would be calculated based on user feedback
      userEngagementScore: this.calculateEngagementScore(conversationData),
      conversationFlowScore: this.calculateFlowScore(conversationData)
    };

    return {
      completionRate,
      totalDuration,
      averageResponseTime,
      abandonmentPoint,
      errorCount: errorMetrics.length,
      speechProcessingErrors,
      qualityMetrics
    };
  }

  // Calculate user engagement score based on conversation patterns
  private calculateEngagementScore(conversationData: ConversationData): number {
    const totalTurns = conversationData.turns.length;
    const userTurns = conversationData.turns.filter(t => t.type === 'user_response');
    
    if (totalTurns === 0) return 0;
    
    // Base score on response rate and conversation length
    const responseRate = userTurns.length / (totalTurns / 2); // Assuming alternating turns
    const lengthScore = Math.min(totalTurns / 20, 1); // Normalize to max 20 turns
    
    return Math.round((responseRate * 0.7 + lengthScore * 0.3) * 100);
  }

  // Calculate conversation flow score based on natural progression
  private calculateFlowScore(conversationData: ConversationData): number {
    const turns = conversationData.turns;
    if (turns.length < 2) return 0;
    
    // Simple heuristic: fewer interruptions and consistent response times indicate better flow
    let flowScore = 100;
    
    // Penalize for very short responses (might indicate confusion)
    const shortResponses = turns.filter(t => 
      t.type === 'user_response' && t.content.split(' ').length < 3
    ).length;
    
    flowScore -= (shortResponses / turns.length) * 30;
    
    return Math.max(0, Math.round(flowScore));
  }

  // Generate analytics summary for dashboard
  async generateAnalyticsSummary(userId?: string): Promise<AnalyticsSummary> {
    try {
      const allMetrics = await this.getAllMetrics(userId);
      const conversationIds = [...new Set(allMetrics.map(m => m.conversationId))];
      
      const totalConversations = conversationIds.length;
      const completedConversations = allMetrics.filter(m => m.eventType === 'complete').length;
      const abandonedConversations = allMetrics.filter(m => m.eventType === 'abandon').length;
      
      const averageCompletionRate = totalConversations > 0 
        ? (completedConversations / totalConversations) * 100 
        : 0;

      const turnMetrics = allMetrics.filter(m => m.eventType === 'turn');
      const responseTimes = turnMetrics
        .map(m => m.eventData.responseTime)
        .filter(rt => rt !== undefined) as number[];
      
      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
        : 0;

      // Analyze abandonment points
      const abandonmentPoints = allMetrics
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
      const errorMetrics = allMetrics.filter(m => m.eventType === 'error');
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

      // Generate quality trends (simplified - would be more sophisticated in production)
      const qualityTrends = this.generateQualityTrends(allMetrics);

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
    } catch (error) {
      console.error('Error generating analytics summary:', error);
      throw error;
    }
  }

  // Generate quality trends over time
  private generateQualityTrends(metrics: ConversationMetrics[]): { date: string; score: number }[] {
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

  // Save metric to Firebase
  private async saveMetric(metric: ConversationMetrics): Promise<void> {
    try {
      await firebaseService.saveConversationMetric(metric);
    } catch (error) {
      console.error('Error saving conversation metric:', error);
      // Store locally as fallback
      localStorage.setItem(
        `metric_${metric.conversationId}_${Date.now()}`, 
        JSON.stringify(metric)
      );
    }
  }

  // Get all metrics from Firebase
  private async getAllMetrics(userId?: string): Promise<ConversationMetrics[]> {
    try {
      return await firebaseService.getConversationMetrics(userId);
    } catch (error) {
      console.error('Error fetching conversation metrics:', error);
      return [];
    }
  }

  // Get metrics for specific conversation
  async getConversationMetrics(conversationId: string): Promise<ConversationMetrics[]> {
    try {
      const allMetrics = await this.getAllMetrics();
      return allMetrics.filter(m => m.conversationId === conversationId);
    } catch (error) {
      console.error('Error fetching conversation metrics:', error);
      return [];
    }
  }

  // Clear local metrics cache
  clearLocalMetrics(): void {
    this.metrics = [];
    this.currentConversationStartTime = null;
    this.currentConversationId = null;
    this.responseStartTime = null;
  }
}

export const conversationAnalyticsService = new ConversationAnalyticsService();