import * as functions from 'firebase-functions';
import * as cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize CORS
const corsHandler = cors({ origin: true });

// Initialize Gemini AI
const getGeminiApiKey = (): string => {
  // Try environment variable first, then Firebase config
  const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key || '';
  if (!apiKey) {
    console.error('Gemini API key not found in environment variables or Firebase config');
  }
  return apiKey;
};

const genAI = new GoogleGenerativeAI(getGeminiApiKey());

// Import the gemini-live function
import { geminiLive } from './gemini-live';

// Export Cloud Functions
export { 
  geminiLive
};

// Health check function
export const healthCheck = functions.https.onRequest((req: functions.Request, res: functions.Response) => {
  corsHandler(req, res, () => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      services: ['gemini-live'],
      gemini_api_key: getGeminiApiKey() ? 'configured' : 'missing'
    });
  });
});

// Simple test function for Gemini API
export const testGemini = functions.https.onCall(async (data, context) => {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new functions.https.HttpsError('failed-precondition', 'Gemini API key not configured');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent('Hello, this is a test message.');
    const response = await result.response;
    
    return {
      success: true,
      message: 'Gemini API is working',
      response: response.text().substring(0, 100) + '...'
    };
  } catch (error) {
    console.error('Gemini test error:', error);
    throw new functions.https.HttpsError('internal', `Test failed: ${error}`);
  }
});

// Export Firebase services for use in other functions
export { genAI };