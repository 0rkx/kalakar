export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export interface UploadedPhoto {
  file: File;
  dataUrl: string;
  id: string;
  isImproving?: boolean;
  isImproved?: boolean;
  originalDataUrl?: string;
}

export interface ProductListing {
  title: string;
  description: string;
  features: string[];
  bio: string;
  tags: string[];
  marketplace?: ExportPlatform;
}

export type ExportPlatform = 'etsy' | 'amazon' | 'whatsapp';

export interface ExportStatus {
  platform: string;
  status: 'queued' | 'processing' | 'success' | 'failed';
  timestamp?: Date;
  enhancedFeatures?: {
    conversationEnhanced?: boolean;
    culturalTags?: number;
    storyElements?: number;
    personalizedDescription?: boolean;
    conversationInsights?: number;
    artisanStoryIncluded?: boolean;
    culturalContextIncluded?: boolean;
    qualityIndicators?: number;
    technicalSpecs?: number;
    productAttributes?: number;
    targetAudienceOptimized?: boolean;
    personalizedMessage?: boolean;
    artisanStory?: boolean;
    multipleMessageOptions?: number;
    customizationOptionsIncluded?: boolean;
  };
}

export type ScreenType = 
  | 'onboarding-name'
  | 'onboarding-location'
  | 'language'
  | 'conversation'
  | 'conversation-recovery'
  | 'conversation-summary'
  | 'recording'
  | 'photos'
  | 'listing'
  | 'review'
  | 'export-status'
  | 'dashboard'
  | 'profile'
  | 'settings'
  | 'products'
  | 'testing'
  | 'marketplace'
  | 'voice-welcome'
  | 'content-booster'
  | 'tutorials'
  | 'ai-assistant';

// Conversation-related enums
export enum ConversationStage {
  INTRODUCTION = 'introduction',
  BASIC_INFO = 'basic_info',
  MATERIALS_CRAFTING = 'materials_crafting',
  CULTURAL_SIGNIFICANCE = 'cultural_significance',
  PRICING_MARKET = 'pricing_market',
  FINAL_DETAILS = 'final_details',
  SUMMARY = 'summary'
}

// Conversation data models
export interface ConversationTurn {
  id: string;
  type: 'ai_question' | 'user_response';
  content: string;
  audioUrl?: string;
  timestamp: Date;
  language: string;
  processingTime?: number;
}

export interface ProductInfo {
  productType: string;
  materials: string[];
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    unit: string;
  };
  colors: string[];
  craftingProcess: string;
  culturalSignificance?: string;
  timeToMake?: string;
  pricing?: {
    cost: number;
    currency: string;
    factors: string[];
  };
  targetMarket?: string;
  uniqueFeatures: string[];
  careInstructions?: string;
  customizationOptions?: string[];
}

export interface ConversationData {
  id: string;
  userId: string;
  language: Language;
  turns: ConversationTurn[];
  extractedInfo: ProductInfo;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: Date;
  completedAt?: Date;
  summary: string;
  analytics?: ConversationAnalytics;
}

export interface ConversationAnalytics {
  completionRate: number;
  totalDuration: number;
  averageResponseTime: number;
  abandonmentPoint?: string;
  errorCount: number;
  speechProcessingErrors: number;
  userSatisfactionScore?: number;
  qualityMetrics: ConversationQualityMetrics;
}

export interface ConversationQualityMetrics {
  responseTimeMs: number[];
  speechRecognitionAccuracy: number[];
  questionRelevanceScore: number[];
  userEngagementScore: number;
  conversationFlowScore: number;
}

export interface ConversationMetrics {
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

export interface AnalyticsSummary {
  totalConversations: number;
  completedConversations: number;
  abandonedConversations: number;
  averageCompletionRate: number;
  averageResponseTime: number;
  commonAbandonmentPoints: { stage: string; count: number }[];
  errorRates: { type: string; rate: number }[];
  qualityTrends: { date: string; score: number }[];
}

export interface AIQuestionContext {
  conversationId: string;
  currentInfo: Partial<ProductInfo>;
  missingFields: string[];
  lastUserResponse: string;
  questionHistory: string[];
  conversationStage: ConversationStage;
}

// Conversation state management types
export interface ConversationState {
  isListening: boolean;
  isAISpeaking: boolean;
  isProcessing: boolean;
  conversationHistory: ConversationTurn[];
  currentQuestion: string;
  conversationSummary: ProductInfo | null;
  currentStage: ConversationStage;
  context: AIQuestionContext | null;
}

export interface ConversationError {
  type: 'speech_recognition' | 'ai_processing' | 'network' | 'audio_playback';
  message: string;
  recoverable: boolean;
  retryAction?: () => void;
}

// Information gap analysis for conversation intelligence
export interface InformationGaps {
  critical: string[];  // Must-have information
  important: string[]; // Should-have information
  nice_to_have: string[]; // Could-have information
}

export interface UserProfile {
  id: string;
  name: string;
  location: string;
  email?: string;
  createdAt: Date;
}

export interface AppState {
  currentScreen: ScreenType;
  selectedLanguage: Language | null;
  transcript: string;
  uploadedPhotos: UploadedPhoto[];
  generatedListing: ProductListing | null;
  isRecording: boolean;
  isProcessing: boolean;
  userName: string;
  userLocation: string;
  // Conversation state
  conversationData: ConversationData | null;
  conversationState: ConversationState | null;
  userProfile: UserProfile | null;
  // Backend integration state
  sessionId: string;
  knowledgeId: string;
  imageProcessingResult: any;
  // Product description from voice note
  productDescription: any;
}

// Conversation utility types
export interface ConversationActions {
  startConversation: (language: Language) => void;
  addUserResponse: (response: string, audioUrl?: string) => void;
  addAIQuestion: (question: string, audioUrl?: string) => void;
  updateConversationStage: (stage: ConversationStage) => void;
  updateExtractedInfo: (info: Partial<ProductInfo>) => void;
  completeConversation: (summary: string) => void;
  abandonConversation: () => void;
  retryLastAction: () => void;
}

export interface ConversationHooks {
  useConversation: () => {
    conversationData: ConversationData | null;
    conversationState: ConversationState | null;
    actions: ConversationActions;
    isLoading: boolean;
    error: ConversationError | null;
  };
}

// Question template types for conversation intelligence
export interface QuestionTemplate {
  stage: ConversationStage;
  templates: string[];
  requiredFields: string[];
  optionalFields: string[];
}

export interface ConversationConfig {
  maxTurns: number;
  timeoutMs: number;
  retryAttempts: number;
  supportedLanguages: Language[];
  questionTemplates: QuestionTemplate[];
}