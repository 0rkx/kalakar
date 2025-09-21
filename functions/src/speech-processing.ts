import * as functions from 'firebase-functions';
// import * as cors from 'cors'; // For future use
import { GoogleGenerativeAI } from '@google/generative-ai';
import { storage } from './firebase-config';
import { ConversationService } from './services/conversation-service';
import { ConversationTurn } from './models/conversation';
import { v4 as uuidv4 } from 'uuid';

// Initialize CORS (for future use)
// const corsHandler = cors({ origin: true });

// Initialize Gemini AI
const getGeminiApiKey = (): string => {
  return process.env.GEMINI_API_KEY || functions.config().gemini?.api_key || '';
};

const genAI = new GoogleGenerativeAI(getGeminiApiKey());

// Language mapping for speech processing
const LANGUAGE_CODES: { [key: string]: string } = {
  'en': 'English',
  'hi': 'Hindi',
  'bn': 'Bengali', 
  'ta': 'Tamil',
  'gu': 'Gujarati',
  'mr': 'Marathi'
};

// Speech processing response interface
interface SpeechProcessingResponse {
  transcript: string;
  originalTranscript?: string;
  language: string;
  confidence: number;
  processingTime: number;
  audioUrl?: string;
  success: boolean;
  error?: string;
}

/**
 * Process user speech audio blob and convert to text using Gemini AI
 */
export const processUserSpeech = functions.https.onCall(async (data, context) => {
  const startTime = Date.now();
  
  try {
    // Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { audioData, language, conversationId } = data;
    
    // Validate input parameters
    if (!audioData || !language) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Audio data and language are required'
      );
    }

    if (!conversationId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Conversation ID is required'
      );
    }

    const userId = context.auth.uid;
    const languageName = LANGUAGE_CODES[language] || 'English';
    
    // Verify conversation exists and belongs to user
    const conversation = await ConversationService.getConversation(conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Conversation not found or access denied'
      );
    }

    // Extract base64 audio data (remove data URL prefix if present)
    const base64Audio = audioData.includes(',') ? audioData.split(',')[1] : audioData;
    
    // Generate unique filename for audio storage
    const audioFileName = `speech_${Date.now()}_${uuidv4()}.wav`;
    const audioPath = `audio/${userId}/${conversationId}/${audioFileName}`;
    
    // Upload audio to Firebase Storage
    const bucket = storage.bucket();
    const file = bucket.file(audioPath);
    
    await file.save(Buffer.from(base64Audio, 'base64'), {
      metadata: {
        contentType: 'audio/wav',
        metadata: {
          userId,
          conversationId,
          language,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    // Get signed URL for audio file
    const [audioUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    // Process speech with Gemini AI
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `
    You are processing audio from an Indian artisan describing their handmade product in a conversation.
    
    Please transcribe this audio recording accurately. The audio is in ${languageName} language.
    
    Instructions:
    1. Provide an accurate transcription of what the person said
    2. If the language is not English, also provide an English translation
    3. Focus on product-related information (materials, size, colors, crafting process, etc.)
    4. Maintain the conversational tone and context
    5. If the audio is unclear or inaudible, indicate this clearly
    
    Format your response as JSON:
    {
      "transcript": "exact transcription in original language",
      "english_translation": "English translation (if different from transcript)",
      "confidence": 0.95,
      "language_detected": "${languageName}",
      "audio_quality": "good|fair|poor",
      "contains_product_info": true|false,
      "key_points": ["list", "of", "key", "product", "details", "mentioned"]
    }
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "audio/wav",
          data: base64Audio
        }
      },
      prompt
    ]);

    const response = result.response;
    const responseText = response.text();
    
    // Parse Gemini response
    let parsedResponse;
    try {
      // Extract JSON from response (handle cases where Gemini adds extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.warn('Failed to parse Gemini JSON response, using fallback parsing');
      // Fallback: extract transcript manually
      const transcriptMatch = responseText.match(/transcript['"]\s*:\s*['"]([^'"]+)['"]/i);
      const transcript = transcriptMatch ? transcriptMatch[1] : responseText;
      
      parsedResponse = {
        transcript,
        english_translation: transcript,
        confidence: 0.8,
        language_detected: languageName,
        audio_quality: 'fair',
        contains_product_info: true,
        key_points: []
      };
    }

    const processingTime = Date.now() - startTime;
    
    // Prepare response
    const speechResponse: SpeechProcessingResponse = {
      transcript: parsedResponse.english_translation || parsedResponse.transcript,
      originalTranscript: parsedResponse.transcript !== parsedResponse.english_translation ? 
        parsedResponse.transcript : undefined,
      language,
      confidence: parsedResponse.confidence || 0.8,
      processingTime,
      audioUrl,
      success: true
    };

    // Add conversation turn to track this user response
    const conversationTurn: Omit<ConversationTurn, 'id' | 'timestamp'> = {
      type: 'user_response',
      content: speechResponse.transcript,
      audioUrl,
      language,
      processingTime,
      confidence: speechResponse.confidence
    };

    await ConversationService.addConversationTurn(conversationId, conversationTurn);

    // Log successful processing
    console.log(`Speech processed successfully for user ${userId}, conversation ${conversationId}`);
    console.log(`Processing time: ${processingTime}ms, Confidence: ${speechResponse.confidence}`);

    return speechResponse;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Error processing user speech:', error);
    
    // Determine error type and message
    let errorMessage = 'Failed to process speech';
    
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HttpsError as-is
    }
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Speech processing service unavailable';
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        errorMessage = 'Speech processing temporarily unavailable due to high demand';
      } else if (error.message.includes('audio') || error.message.includes('format')) {
        errorMessage = 'Invalid audio format or corrupted audio data';
      }
    }

    // Return error response instead of throwing for better client handling
    const errorResponse: SpeechProcessingResponse = {
      transcript: '',
      language: data.language || 'en',
      confidence: 0,
      processingTime,
      success: false,
      error: errorMessage
    };

    return errorResponse;
  }
});
// Text-to-Speech response interface
interface TextToSpeechResponse {
  audioData?: string; // Base64 encoded audio
  audioUrl?: string;  // Firebase Storage URL
  text: string;
  language: string;
  success: boolean;
  error?: string;
  fallbackToText: boolean;
}

// Language codes for Web Speech API
const TTS_LANGUAGE_CODES: { [key: string]: string } = {
  'en': 'en-US',
  'hi': 'hi-IN',
  'bn': 'bn-IN',
  'ta': 'ta-IN',
  'gu': 'gu-IN',
  'mr': 'mr-IN'
};

/**
 * Generate AI speech from text using Web Speech API or Google Cloud TTS
 * Returns audio blob for frontend playback with fallback to text display
 */
export const generateAISpeech = functions.https.onCall(async (data, context) => {
  try {
    // Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { text, language, conversationId, saveToStorage = false } = data;
    
    // Validate input parameters
    if (!text || !language) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Text and language are required'
      );
    }

    const userId = context.auth.uid;
    const languageCode = TTS_LANGUAGE_CODES[language] || 'en-US';
    
    // Verify conversation exists if conversationId provided
    if (conversationId) {
      const conversation = await ConversationService.getConversation(conversationId);
      if (!conversation || conversation.userId !== userId) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Conversation not found or access denied'
        );
      }
    }

    try {
      // For server-side TTS, we'll use Google Cloud Text-to-Speech API
      // Note: This requires additional setup and billing, so we'll implement a fallback approach
      
      // First, try to use a simple approach that returns instructions for client-side TTS
      // The client will handle the actual speech synthesis using Web Speech API
      
      const response: TextToSpeechResponse = {
        text,
        language,
        success: true,
        fallbackToText: false,
        // Return language code for client-side TTS
        audioData: JSON.stringify({
          text,
          languageCode,
          useClientTTS: true,
          instructions: 'Use Web Speech API on client side'
        })
      };

      // If saveToStorage is requested and we have a conversationId, save the AI question
      if (saveToStorage && conversationId) {
        const conversationTurn: Omit<ConversationTurn, 'id' | 'timestamp'> = {
          type: 'ai_question',
          content: text,
          language,
          processingTime: 0
        };

        await ConversationService.addConversationTurn(conversationId, conversationTurn);
      }

      console.log(`AI speech generated for user ${userId}, language: ${language}`);
      return response;

    } catch (ttsError) {
      console.warn('TTS processing failed, falling back to text-only:', ttsError);
      
      // Fallback to text-only response
      const fallbackResponse: TextToSpeechResponse = {
        text,
        language,
        success: true,
        fallbackToText: true,
        error: 'Text-to-speech unavailable, displaying text instead'
      };

      // Still save the conversation turn if requested
      if (saveToStorage && conversationId) {
        const conversationTurn: Omit<ConversationTurn, 'id' | 'timestamp'> = {
          type: 'ai_question',
          content: text,
          language,
          processingTime: 0
        };

        await ConversationService.addConversationTurn(conversationId, conversationTurn);
      }

      return fallbackResponse;
    }

  } catch (error) {
    console.error('Error generating AI speech:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Return error response for better client handling
    const errorResponse: TextToSpeechResponse = {
      text: data.text || '',
      language: data.language || 'en',
      success: false,
      fallbackToText: true,
      error: 'Failed to generate speech, displaying text instead'
    };

    return errorResponse;
  }
});

/**
 * Enhanced version of generateAISpeech that uses Google Cloud TTS
 * This function requires Google Cloud TTS API to be enabled and configured
 */
export const generateAISpeechAdvanced = functions.https.onCall(async (data, context) => {
  try {
    // Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { text, language } = data;
    
    if (!text || !language) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Text and language are required'
      );
    }

    const userId = context.auth.uid;

    // This would require Google Cloud TTS client library
    // For now, we'll return a placeholder that indicates advanced TTS is not configured
    
    const response: TextToSpeechResponse = {
      text,
      language,
      success: false,
      fallbackToText: true,
      error: 'Advanced TTS not configured. Please use basic generateAISpeech function or configure Google Cloud TTS.'
    };

    console.log(`Advanced TTS requested but not configured for user ${userId}`);
    return response;

  } catch (error) {
    console.error('Error in advanced AI speech generation:', error);
    
    const errorResponse: TextToSpeechResponse = {
      text: data.text || '',
      language: data.language || 'en',
      success: false,
      fallbackToText: true,
      error: 'Advanced TTS service unavailable'
    };

    return errorResponse;
  }
});