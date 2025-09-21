
import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Define the structure of a conversation turn
interface Turn {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// Define the structure of a conversation session
interface ConversationSession {
  history: Turn[];
  context?: string;
  stage?: string;
}

/**
 * Handles real-time conversations with the Gemini Live API.
 * This function manages the conversation session and interacts with the Gemini model
 * specifically for artisan product conversations.
 */
export const geminiLive = functions.https.onCall(async (data, context) => {
  console.log('🤖 GEMINI LIVE FUNCTION CALLED');
  console.log('📤 Received data:', JSON.stringify(data, null, 2));
  
  try {
    const { message, session } = data;

    if (!message) {
      console.log('❌ No message provided');
      throw new functions.https.HttpsError('invalid-argument', 'Message is required');
    }

    console.log('📝 Processing message:', message);

    // Get API key from environment variables or Firebase config
    const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
    
    if (!apiKey) {
      console.error('Gemini API key not found');
      throw new functions.https.HttpsError('failed-precondition', 'Gemini API key not configured');
    }

    console.log('Using Gemini API key:', apiKey.substring(0, 10) + '...');

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);

    // Initialize conversation session if it doesn't exist
    const conversationSession: ConversationSession = session || { 
      history: [],
      context: 'artisan_product_conversation',
      stage: 'introduction'
    };

    // Add system context for artisan product conversations
    const systemPrompt = `You are an AI assistant helping artisans create compelling product listings for online marketplaces like Etsy, Amazon, and others. Your role is to:

1. Ask thoughtful questions about their handmade products
2. Extract key information like materials, crafting process, unique features, colors, and story
3. Help them understand what makes their product special
4. Guide them through describing their craft in an engaging way
5. Keep the conversation natural and encouraging

Current conversation stage: ${conversationSession.stage || 'introduction'}

Be conversational, supportive, and focus on one aspect at a time. Ask follow-up questions to get detailed, specific information that will help create amazing product listings.`;

    // Use the Gemini 1.5 Pro model for conversation
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });

    // Prepare conversation history with system context
    let chatHistory = conversationSession.history;
    
    // If this is the first message, add system context
    if (chatHistory.length === 0) {
      chatHistory = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'I understand. I\'m here to help you create an amazing product listing by learning about your handmade creation. Let\'s start our conversation!' }] }
      ];
    }

    // Start a chat session with the model, including the conversation history
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });

    console.log('Sending message to Gemini:', message);

    // Send the user's message to the model
    console.log('🚀 Sending message to Gemini AI...');
    const result = await chat.sendMessage(message);
    const response = result.response;

    // Extract the model's response text
    const modelResponse = response.text();
    console.log('📥 Received response from Gemini AI:', modelResponse.substring(0, 100) + '...');

    console.log('Received response from Gemini:', modelResponse.substring(0, 100) + '...');

    // Determine conversation stage based on the conversation
    let newStage = conversationSession.stage || 'introduction';
    const messageCount = conversationSession.history.length;
    
    if (messageCount < 4) {
      newStage = 'introduction';
    } else if (messageCount < 8) {
      newStage = 'product_details';
    } else if (messageCount < 12) {
      newStage = 'materials_process';
    } else if (messageCount < 16) {
      newStage = 'story_features';
    } else {
      newStage = 'summary';
    }

    // Update the conversation history with the user's message and the model's response
    const updatedHistory: Turn[] = [
      ...conversationSession.history,
      { role: 'user', parts: [{ text: message }] },
      { role: 'model', parts: [{ text: modelResponse }] },
    ];

    // Return the model's response and the updated session
    console.log('✅ GEMINI LIVE FUNCTION COMPLETED');
    console.log('📊 Session updated with', updatedHistory.length, 'total messages');
    
    return {
      response: modelResponse,
      session: { 
        history: updatedHistory,
        context: conversationSession.context,
        stage: newStage
      },
    };
  } catch (error) {
    console.error('Error in Gemini Live conversation:', error);
    
    // Provide more specific error information
    if (error.message?.includes('API key') || error.message?.includes('API_KEY')) {
      throw new functions.https.HttpsError('failed-precondition', 'Gemini API key not configured properly');
    }
    
    if (error.message?.includes('quota') || error.message?.includes('limit')) {
      throw new functions.https.HttpsError('resource-exhausted', 'API quota exceeded');
    }
    
    throw new functions.https.HttpsError('internal', `Failed to process Gemini Live conversation: ${error.message}`);
  }
});
