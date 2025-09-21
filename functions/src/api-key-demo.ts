/**
 * API Key Integration Demonstration
 * This file shows how the Gemini API key is integrated and used throughout the system
 */

import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// API KEY CONFIGURATION METHODS
// ============================================================================

/**
 * Method 1: Firebase Functions Config (Production)
 * Set via: firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"
 */
const getGeminiApiKeyFromConfig = (): string => {
  return functions.config().gemini?.api_key || '';
};

/**
 * Method 2: Environment Variables (Local Development)
 * Set in .env file: GEMINI_API_KEY=YOUR_GEMINI_API_KEY
 */
const getGeminiApiKeyFromEnv = (): string => {
  return process.env.GEMINI_API_KEY || '';
};

/**
 * Combined API Key Retrieval (Used in Production)
 * Tries environment variable first, then Firebase config
 */
const getGeminiApiKey = (): string => {
  const envKey = process.env.GEMINI_API_KEY;
  const configKey = functions.config().gemini?.api_key;
  
  console.log('API Key Sources:');
  console.log('- Environment Variable:', envKey ? 'Set' : 'Not Set');
  console.log('- Firebase Config:', configKey ? 'Set' : 'Not Set');
  
  return envKey || configKey || '';
};

// ============================================================================
// GEMINI AI INITIALIZATION
// ============================================================================

/**
 * Initialize Gemini AI with API Key
 */
const initializeGeminiAI = (): GoogleGenerativeAI => {
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    throw new Error('Gemini API key not found. Please set GEMINI_API_KEY environment variable or Firebase config.');
  }
  
  console.log('Initializing Gemini AI with API key:', apiKey.substring(0, 10) + '...');
  return new GoogleGenerativeAI(apiKey);
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Basic Text Generation
 */
export const demoTextGeneration = async (): Promise<string> => {
  try {
    const genAI = initializeGeminiAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    const prompt = `
      Analyze this handcrafted product for marketplace optimization:
      
      Product: Handmade Ceramic Coffee Mug
      Description: Beautiful ceramic mug with unique glaze pattern
      Price: $25
      
      Provide optimization suggestions for Etsy marketplace.
    `;
    
    console.log('Sending request to Gemini AI...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini AI Response received:', text.substring(0, 100) + '...');
    return text;
    
  } catch (error) {
    console.error('Gemini AI Error:', error);
    throw new Error(`Gemini AI request failed: ${error}`);
  }
};

/**
 * Example 2: Product Analysis with Structured Output
 */
export const demoProductAnalysis = async (productData: any): Promise<any> => {
  try {
    const genAI = initializeGeminiAI();
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      }
    });
    
    const prompt = `
      Analyze this product for marketplace optimization and return JSON:
      
      Product Data: ${JSON.stringify(productData)}
      
      Return analysis in this JSON format:
      {
        "optimized_title": "SEO-optimized title",
        "category": "best category",
        "price_recommendation": {
          "min": 0,
          "max": 0,
          "recommended": 0
        },
        "seo_keywords": ["keyword1", "keyword2"],
        "market_insights": {
          "demand": "high|medium|low",
          "competition": "high|medium|low"
        },
        "improvements": ["suggestion1", "suggestion2"]
      }
    `;
    
    console.log('Analyzing product with Gemini AI...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const analysis = JSON.parse(text);
      console.log('Product analysis completed:', analysis);
      return analysis;
    } catch (parseError) {
      console.log('JSON parsing failed, returning raw text');
      return { raw_response: text };
    }
    
  } catch (error) {
    console.error('Product analysis error:', error);
    throw error;
  }
};

/**
 * Example 3: Image Analysis
 */
export const demoImageAnalysis = async (imageBase64: string): Promise<string> => {
  try {
    const genAI = initializeGeminiAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-vision' });
    
    const prompt = `
      Analyze this product image for marketplace optimization:
      
      1. Describe what you see
      2. Rate the image quality (1-10)
      3. Suggest improvements for marketplace listing
      4. Identify the product category
      5. Suggest SEO-friendly alt text
    `;
    
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: 'image/jpeg',
      },
    };
    
    console.log('Analyzing image with Gemini AI Vision...');
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    console.log('Image analysis completed');
    return text;
    
  } catch (error) {
    console.error('Image analysis error:', error);
    throw error;
  }
};

/**
 * Example 4: Conversational AI
 */
export const demoConversationalAI = async (): Promise<void> => {
  try {
    const genAI = initializeGeminiAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    // Start a chat session
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: 'I am an artisan who makes ceramic pottery. I want to sell on Etsy.' }],
        },
        {
          role: 'model',
          parts: [{ text: 'That\'s wonderful! Ceramic pottery is very popular on Etsy. I can help you optimize your listings for better visibility and sales. What specific pottery items do you create?' }],
        },
      ],
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });
    
    console.log('Starting conversational AI demo...');
    
    // Continue the conversation
    const userMessage = 'I make coffee mugs with unique glazes. How should I price them?';
    console.log('User:', userMessage);
    
    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    const aiResponse = response.text();
    
    console.log('AI:', aiResponse);
    
    // Another message
    const followUp = 'What keywords should I use for SEO?';
    console.log('User:', followUp);
    
    const result2 = await chat.sendMessage(followUp);
    const response2 = await result2.response;
    const aiResponse2 = response2.text();
    
    console.log('AI:', aiResponse2);
    
  } catch (error) {
    console.error('Conversational AI error:', error);
    throw error;
  }
};

/**
 * Example 5: Multi-language Support
 */
export const demoMultiLanguageSupport = async (text: string, targetLanguage: string): Promise<string> => {
  try {
    const genAI = initializeGeminiAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    const prompt = `
      Translate the following product description to ${targetLanguage}:
      
      Original text: ${text}
      
      Requirements:
      - Maintain marketing appeal
      - Keep cultural context appropriate
      - Preserve product benefits
      - Use natural, fluent language
      
      Return only the translated text.
    `;
    
    console.log(`Translating to ${targetLanguage}...`);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translatedText = response.text();
    
    console.log('Translation completed');
    return translatedText;
    
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
};

// ============================================================================
// FIREBASE FUNCTION EXAMPLES
// ============================================================================

/**
 * Firebase Function: Test Gemini AI Integration
 */
export const testGeminiIntegration = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  try {
    console.log('Testing Gemini AI integration...');
    
    // Test API key retrieval
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new functions.https.HttpsError('failed-precondition', 'Gemini API key not configured');
    }
    
    // Test basic text generation
    const textResult = await demoTextGeneration();
    
    // Test product analysis
    const productData = {
      title: 'Handmade Ceramic Vase',
      description: 'Beautiful ceramic vase with unique patterns',
      price: 45.99,
      category: 'Home & Garden'
    };
    const analysisResult = await demoProductAnalysis(productData);
    
    return {
      success: true,
      message: 'Gemini AI integration working correctly',
      results: {
        api_key_configured: true,
        text_generation: textResult.substring(0, 200) + '...',
        product_analysis: analysisResult
      }
    };
    
  } catch (error) {
    console.error('Gemini integration test failed:', error);
    throw new functions.https.HttpsError('internal', `Integration test failed: ${error}`);
  }
});

/**
 * Firebase Function: Analyze Product with AI
 */
export const analyzeProductWithGemini = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { productData, images } = data;
  
  try {
    console.log('Analyzing product with Gemini AI...');
    
    // Analyze product data
    const analysis = await demoProductAnalysis(productData);
    
    // Analyze images if provided
    let imageAnalysis = null;
    if (images && images.length > 0) {
      imageAnalysis = await demoImageAnalysis(images[0]);
    }
    
    return {
      success: true,
      analysis,
      image_analysis: imageAnalysis,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Product analysis failed:', error);
    throw new functions.https.HttpsError('internal', `Analysis failed: ${error}`);
  }
});

// ============================================================================
// MONITORING AND LOGGING
// ============================================================================

/**
 * Monitor API Usage
 */
export const monitorGeminiUsage = async (): Promise<void> => {
  console.log('=== Gemini AI Usage Monitor ===');
  console.log('API Key Status:', getGeminiApiKey() ? 'Configured' : 'Missing');
  console.log('Timestamp:', new Date().toISOString());
  
  // In production, you would track:
  // - Number of API calls
  // - Token usage
  // - Error rates
  // - Response times
};

/**
 * Health Check for Gemini AI
 */
export const geminiHealthCheck = functions.https.onRequest(async (req, res) => {
  try {
    const apiKey = getGeminiApiKey();
    
    if (!apiKey) {
      res.status(500).json({
        status: 'unhealthy',
        error: 'Gemini API key not configured',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Test basic functionality
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    const testResult = await model.generateContent('Hello, this is a health check.');
    const response = await testResult.response;
    
    res.json({
      status: 'healthy',
      api_key_configured: true,
      model_accessible: true,
      test_response_length: response.text().length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Gemini health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.toString(),
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// EXPORT FOR TESTING
// ============================================================================

export {
  getGeminiApiKey,
  initializeGeminiAI
};