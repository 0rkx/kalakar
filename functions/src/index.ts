import * as functions from 'firebase-functions';
import * as cors from 'cors';
import { MarketplaceIntegrationService } from './services/marketplace-integration-service';
import { GeminiAIService } from './services/gemini-ai-service';
import { ConversationService } from './services/conversation-service';
import { geminiLive } from './gemini-live';
import { transcribeAudio } from './audio-transcription';
import { enrichTranscription } from './enrich-transcription';
import { enhancePhoto } from './enhance-photo';
import { generateSocialContent } from './generate-social-content';
import { chatWithArtisanAssistant } from './chat-with-artisan-assistant';

// Initialize services
GeminiAIService.initialize();

// Initialize CORS
const corsHandler = cors({ origin: true });

// --- Health Check ---
export const healthCheck = functions.https.onRequest((req, res) => {
  corsHandler(req, res, () => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });
});

const handle = (handler) => functions.https.onCall(async (data, context) => {
    try {
        return await handler(data, context);
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', error.message, error);
    }
});

// --- Gemini AI Service Functions ---
export const analyzeProductWithAI = handle(GeminiAIService.analyzeProductForMarketplace);
export const analyzeProductImagesWithAI = handle(GeminiAIService.analyzeProductImages);
export const generateMarketplaceListingsWithAI = handle(GeminiAIService.generateMarketplaceListings);
export const startAIConversation = handle(GeminiAIService.startConversation);
export const continueAIConversation = handle(GeminiAIService.continueConversation);
export const generatePersonalizedContent = handle(GeminiAIService.generatePersonalizedContent);
export const generateSEOContent = handle(GeminiAIService.generateSEOContent);
export const translateContent = handle(GeminiAIService.translateContent);
export const generateMarketInsights = handle(GeminiAIService.generateMarketInsights);


// --- Conversation Service Functions ---
export const createConversation = handle(ConversationService.createConversation);
export const getConversation = handle(ConversationService.getConversation);
export const addConversationTurn = handle(ConversationService.addConversationTurn);
export const updateConversationStage = handle(ConversationService.updateConversationStage);
export const updateExtractedInfo = handle(ConversationService.updateExtractedInfo);
export const completeConversation = handle(ConversationService.completeConversation);
export const getUserConversations = handle(ConversationService.getUserConversations);
export const createOrUpdateUser = handle(ConversationService.createOrUpdateUser);
export const getUserProfile = handle(ConversationService.getUserProfile);


// --- Marketplace Integration Service Functions ---
export const createMarketplaceIntegration = handle(MarketplaceIntegrationService.createIntegration);
export const getUserIntegrations = handle(MarketplaceIntegrationService.getUserIntegrations);
export const syncProductToMarketplace = handle(MarketplaceIntegrationService.syncProductToMarketplace);
export const syncProductToAllMarketplaces = handle(MarketplaceIntegrationService.syncProductToAllMarketplaces);
export const generateMarketplaceReports = handle(MarketplaceIntegrationService.generateMarketplaceReports);
export const updateIntegration = handle(MarketplaceIntegrationService.updateIntegration);
export const deleteIntegration = handle(MarketplaceIntegrationService.deleteIntegration);
export const refreshIntegrationCredentials = handle(MarketplaceIntegrationService.refreshIntegrationCredentials);


// Export other functions
export { geminiLive, transcribeAudio, enrichTranscription, enhancePhoto, generateSocialContent, chatWithArtisanAssistant };