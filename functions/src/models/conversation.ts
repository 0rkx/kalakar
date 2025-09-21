import { Timestamp } from 'firebase-admin/firestore';

// Conversation turn interface
export interface ConversationTurn {
  id: string;
  type: 'ai_question' | 'user_response';
  content: string;
  audioUrl?: string;
  timestamp: Timestamp;
  language: string;
  processingTime?: number;
  confidence?: number;
}

// Product information extracted from conversation
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

// Conversation data interface
export interface ConversationData {
  id: string;
  userId: string;
  language: string;
  turns: ConversationTurn[];
  extractedInfo: Partial<ProductInfo>;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: Timestamp;
  completedAt?: Timestamp;
  updatedAt: Timestamp;
  summary?: string;
  conversationStage: ConversationStage;
}

// Conversation stages
export enum ConversationStage {
  INTRODUCTION = 'introduction',
  BASIC_INFO = 'basic_info',
  MATERIALS_CRAFTING = 'materials_crafting',
  CULTURAL_SIGNIFICANCE = 'cultural_significance',
  PRICING_MARKET = 'pricing_market',
  FINAL_DETAILS = 'final_details',
  SUMMARY = 'summary'
}

// AI question context for generating follow-up questions
export interface AIQuestionContext {
  conversationId: string;
  currentInfo: Partial<ProductInfo>;
  missingFields: string[];
  lastUserResponse: string;
  questionHistory: string[];
  conversationStage: ConversationStage;
  language: string;
}

// User profile interface
export interface UserProfile {
  id: string;
  name?: string;
  location?: string;
  language: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  conversationCount: number;
  listingCount: number;
  preferences?: {
    defaultLanguage?: string;
    marketplaces?: string[];
  };
}

// Listing interface
export interface Listing {
  id: string;
  userId: string;
  conversationId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
  productInfo: ProductInfo;
  marketplaceData?: {
    etsy?: any;
    amazon?: any;
    whatsapp?: any;
  };
  status: 'draft' | 'published' | 'exported';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Export record interface
export interface ExportRecord {
  id: string;
  userId: string;
  listingId: string;
  marketplace: 'etsy' | 'amazon' | 'whatsapp';
  status: 'pending' | 'success' | 'failed';
  exportData: any;
  response?: any;
  error?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}