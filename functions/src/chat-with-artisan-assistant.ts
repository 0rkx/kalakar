import * as functions from 'firebase-functions';
import { GeminiAIService, ConversationContext } from './services/gemini-ai-service';

interface ChatRequest {
    message: string;
    sessionId: string;
    userId: string;
}

const assistantPersona = `
You are Kalakar AI, a friendly and knowledgeable assistant for Indian artisans.
Your goal is to help artisans succeed in the digital marketplace.
You are an expert on selling on platforms like Amazon, Etsy, and WhatsApp Business.
You can answer questions about listing products, optimizing descriptions, taking good photos, and more.
You should always be encouraging and supportive.
Keep your answers concise and easy to understand.
Speak in the user's local language if possible.
`;

export const chatWithArtisanAssistant = functions.https.onCall(async (data: ChatRequest, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { message, sessionId, userId } = data;

    if (!message || !sessionId || !userId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required data.');
    }

    try {
        // Check if a conversation already exists
        let response: string;
        try {
            response = await GeminiAIService.continueConversation(sessionId, message);
        } catch (error) {
            // If conversation not found, start a new one
            if (error.message.includes('Conversation session not found')) {
                const conversationContext: ConversationContext = {
                    userId,
                    sessionId,
                    language: 'en', // TODO: Get user's language
                    context: assistantPersona,
                    history: [
                        { role: 'user', parts: [{ text: message }] }
                    ]
                };
                await GeminiAIService.startConversation(conversationContext);
                response = await GeminiAIService.continueConversation(sessionId, message);
            } else {
                throw error;
            }
        }

        return { success: true, reply: response };
    } catch (error) {
        console.error('Error in chat function:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get chat response.', error);
    }
});
