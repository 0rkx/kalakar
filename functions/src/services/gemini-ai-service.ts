import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import * as functions from 'firebase-functions';
import { db } from '../firebase-config';

export interface GeminiConfig {
  model: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  safetySettings?: any[];
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  language: string;
  context: string;
  history: Array<{
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
  }>;
}

export interface ProductAnalysisResult {
  title: string;
  description: string;
  category: string;
  tags: string[];
  price_suggestion: {
    min: number;
    max: number;
    recommended: number;
    currency: string;
  };
  market_insights: {
    demand_level: 'low' | 'medium' | 'high';
    competition: 'low' | 'medium' | 'high';
    seasonal_trends: string[];
    target_audience: string[];
  };
  seo_keywords: string[];
  improvement_suggestions: string[];
}

export interface ImageAnalysisResult {
  objects_detected: string[];
  colors: string[];
  style: string;
  quality_score: number;
  composition_feedback: string;
  enhancement_suggestions: string[];
  marketplace_suitability: {
    etsy: number;
    amazon: number;
    general: number;
  };
}

export class GeminiAIService {
  private static genAI: GoogleGenerativeAI;
  private static models: Map<string, GenerativeModel> = new Map();
  private static chatSessions: Map<string, ChatSession> = new Map();

  static initialize(): void {
    const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
    if (!apiKey) {
      console.error('Gemini API key not found in environment variables or Firebase config');
      throw new Error('Gemini API key not configured');
    }
    console.log('Initializing Gemini AI with API key:', apiKey.substring(0, 10) + '...');
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  static getModel(config: GeminiConfig = { model: 'gemini-1.5-pro' }): GenerativeModel {
    // Initialize if not already done
    if (!this.genAI) {
      this.initialize();
    }
    
    const modelKey = JSON.stringify(config);
    
    if (!this.models.has(modelKey)) {
      const model = this.genAI.getGenerativeModel({
        model: config.model,
        generationConfig: {
          temperature: config.temperature || 0.7,
          topP: config.topP || 0.8,
          topK: config.topK || 40,
          maxOutputTokens: config.maxOutputTokens || 2048,
        },
        safetySettings: config.safetySettings || [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      });
      
      this.models.set(modelKey, model);
    }
    
    return this.models.get(modelKey)!;
  }

  static async generateText(prompt: string, config?: GeminiConfig): Promise<string> {
    try {
      const model = this.getModel(config);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini text generation error:', error);
      throw new Error(`Text generation failed: ${error}`);
    }
  }

  static async analyzeImage(imageData: string, prompt: string, config?: GeminiConfig): Promise<string> {
    try {
      const model = this.getModel({ ...config, model: 'gemini-1.5-pro-vision' });
      
      const imagePart = {
        inlineData: {
          data: imageData,
          mimeType: 'image/jpeg',
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini image analysis error:', error);
      throw new Error(`Image analysis failed: ${error}`);
    }
  }

  static async startConversation(context: ConversationContext, config?: GeminiConfig): Promise<ChatSession> {
    try {
      const model = this.getModel(config);
      
      const chat = model.startChat({
        history: context.history,
        generationConfig: {
          temperature: 0.8,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 1024,
        },
      });

      this.chatSessions.set(context.sessionId, chat);
      
      // Store conversation context in Firestore
      await db.collection('gemini_conversations').doc(context.sessionId).set({
        userId: context.userId,
        language: context.language,
        context: context.context,
        createdAt: new Date(),
        lastActivity: new Date(),
      });

      return chat;
    } catch (error) {
      console.error('Gemini conversation start error:', error);
      throw new Error(`Conversation start failed: ${error}`);
    }
  }

  static async continueConversation(sessionId: string, message: string): Promise<string> {
    try {
      let chat = this.chatSessions.get(sessionId);
      
      if (!chat) {
        // Restore conversation from Firestore
        const conversationDoc = await db.collection('gemini_conversations').doc(sessionId).get();
        if (!conversationDoc.exists) {
          throw new Error('Conversation session not found');
        }
        
        const conversationData = conversationDoc.data()!;
        const model = this.getModel();
        chat = model.startChat({
          history: conversationData.history || [],
        });
        this.chatSessions.set(sessionId, chat);
      }

      const result = await chat.sendMessage(message);
      const response = await result.response;
      const responseText = response.text();

      // Update conversation in Firestore
      await db.collection('gemini_conversations').doc(sessionId).update({
        lastActivity: new Date(),
        messageCount: (await db.collection('gemini_conversations').doc(sessionId).get()).data()?.messageCount + 1 || 1,
      });

      return responseText;
    } catch (error) {
      console.error('Gemini conversation continue error:', error);
      throw new Error(`Conversation continue failed: ${error}`);
    }
  }

  static async analyzeProductForMarketplace(productData: any, images?: string[]): Promise<ProductAnalysisResult> {
    try {
      const prompt = `
        Analyze this product for marketplace listing optimization:
        
        Product Data: ${JSON.stringify(productData)}
        
        Please provide a comprehensive analysis in JSON format with the following structure:
        {
          "title": "optimized product title",
          "description": "compelling product description",
          "category": "most appropriate category",
          "tags": ["relevant", "tags", "for", "seo"],
          "price_suggestion": {
            "min": 0,
            "max": 0,
            "recommended": 0,
            "currency": "USD"
          },
          "market_insights": {
            "demand_level": "high|medium|low",
            "competition": "high|medium|low",
            "seasonal_trends": ["trend1", "trend2"],
            "target_audience": ["audience1", "audience2"]
          },
          "seo_keywords": ["keyword1", "keyword2"],
          "improvement_suggestions": ["suggestion1", "suggestion2"]
        }
        
        Focus on handcrafted, artisan products and provide actionable insights for Etsy, Amazon, and general marketplace success.
      `;

      let analysisPrompt = prompt;
      
      if (images && images.length > 0) {
        analysisPrompt += `\n\nAdditionally, analyze the provided product images for visual appeal and marketplace suitability.`;
      }

      const response = await this.generateText(analysisPrompt);
      
      try {
        return JSON.parse(response);
      } catch (parseError) {
        // If JSON parsing fails, extract information manually
        return this.extractProductAnalysisFromText(response);
      }
    } catch (error) {
      console.error('Product analysis error:', error);
      throw new Error(`Product analysis failed: ${error}`);
    }
  }

  static async analyzeProductImages(images: string[]): Promise<ImageAnalysisResult> {
    try {
      const prompt = `
        Analyze these product images for marketplace listing optimization. Provide analysis in JSON format:
        {
          "objects_detected": ["object1", "object2"],
          "colors": ["color1", "color2"],
          "style": "style description",
          "quality_score": 0-100,
          "composition_feedback": "feedback on image composition",
          "enhancement_suggestions": ["suggestion1", "suggestion2"],
          "marketplace_suitability": {
            "etsy": 0-100,
            "amazon": 0-100,
            "general": 0-100
          }
        }
        
        Focus on aspects important for online marketplace success: lighting, composition, background, product visibility, and professional appearance.
      `;

      // Analyze first image (can be extended to analyze multiple)
      const response = await this.analyzeImage(images[0], prompt);
      
      try {
        return JSON.parse(response);
      } catch (parseError) {
        return this.extractImageAnalysisFromText(response);
      }
    } catch (error) {
      console.error('Image analysis error:', error);
      throw new Error(`Image analysis failed: ${error}`);
    }
  }

  static async generateMarketplaceListings(productAnalysis: ProductAnalysisResult, targetMarketplaces: string[]): Promise<any> {
    try {
      const listings: any = {};

      for (const marketplace of targetMarketplaces) {
        const prompt = `
          Create an optimized ${marketplace} listing based on this product analysis:
          ${JSON.stringify(productAnalysis)}
          
          Generate a listing optimized for ${marketplace} with:
          - Platform-specific title optimization
          - Description tailored to ${marketplace} audience
          - Appropriate tags/keywords for ${marketplace}
          - Pricing strategy for ${marketplace}
          - Category selection for ${marketplace}
          
          Return as JSON with marketplace-specific optimizations.
        `;

        const response = await this.generateText(prompt);
        listings[marketplace] = response;
      }

      return listings;
    } catch (error) {
      console.error('Marketplace listings generation error:', error);
      throw new Error(`Marketplace listings generation failed: ${error}`);
    }
  }

  static async generatePersonalizedContent(userProfile: any, productData: any, contentType: 'bio' | 'story' | 'description'): Promise<string> {
    try {
      const prompt = `
        Generate personalized ${contentType} content for an artisan marketplace:
        
        User Profile: ${JSON.stringify(userProfile)}
        Product Data: ${JSON.stringify(productData)}
        
        Create compelling, authentic ${contentType} that:
        - Reflects the artisan's personality and story
        - Highlights the unique aspects of their craft
        - Connects emotionally with potential customers
        - Is optimized for marketplace discovery
        - Maintains authenticity while being commercially appealing
        
        Language: ${userProfile.language || 'English'}
        Tone: ${userProfile.tone || 'warm and professional'}
      `;

      return await this.generateText(prompt);
    } catch (error) {
      console.error('Personalized content generation error:', error);
      throw new Error(`Personalized content generation failed: ${error}`);
    }
  }

  static async generateSEOContent(productData: any, targetKeywords: string[], marketplace: string): Promise<any> {
    try {
      const prompt = `
        Generate SEO-optimized content for ${marketplace}:
        
        Product: ${JSON.stringify(productData)}
        Target Keywords: ${targetKeywords.join(', ')}
        
        Create:
        1. SEO-optimized title (include primary keywords naturally)
        2. Meta description (150-160 characters)
        3. Product description with keyword integration
        4. Alt text for images
        5. Additional long-tail keyword suggestions
        
        Ensure content is natural, engaging, and follows ${marketplace} SEO best practices.
        Return as JSON format.
      `;

      const response = await this.generateText(prompt);
      
      try {
        return JSON.parse(response);
      } catch (parseError) {
        return { content: response };
      }
    } catch (error) {
      console.error('SEO content generation error:', error);
      throw new Error(`SEO content generation failed: ${error}`);
    }
  }

  static async translateContent(content: string, targetLanguage: string, context?: string): Promise<string> {
    try {
      const prompt = `
        Translate the following content to ${targetLanguage}:
        
        Content: ${content}
        Context: ${context || 'Artisan marketplace product content'}
        
        Ensure the translation:
        - Maintains the original tone and meaning
        - Is culturally appropriate for ${targetLanguage} speakers
        - Preserves marketing appeal
        - Uses appropriate terminology for the context
        
        Return only the translated content.
      `;

      return await this.generateText(prompt);
    } catch (error) {
      console.error('Content translation error:', error);
      throw new Error(`Content translation failed: ${error}`);
    }
  }

  static async generateMarketInsights(category: string, region?: string): Promise<any> {
    try {
      const prompt = `
        Provide market insights for ${category} products${region ? ` in ${region}` : ' globally'}:
        
        Include:
        1. Current market trends
        2. Seasonal patterns
        3. Price ranges and competition analysis
        4. Target audience demographics
        5. Popular keywords and search terms
        6. Growth opportunities
        7. Challenges and considerations
        8. Recommended strategies for new sellers
        
        Focus on handcrafted/artisan products in this category.
        Return as structured JSON.
      `;

      const response = await this.generateText(prompt);
      
      try {
        return JSON.parse(response);
      } catch (parseError) {
        return { insights: response };
      }
    } catch (error) {
      console.error('Market insights generation error:', error);
      throw new Error(`Market insights generation failed: ${error}`);
    }
  }

  // Helper methods for parsing responses when JSON parsing fails
  private static extractProductAnalysisFromText(text: string): ProductAnalysisResult {
    // Fallback parsing logic
    return {
      title: 'Handcrafted Artisan Product',
      description: text.substring(0, 500),
      category: 'Handmade',
      tags: ['handmade', 'artisan', 'unique', 'craft'],
      price_suggestion: {
        min: 20,
        max: 100,
        recommended: 50,
        currency: 'USD',
      },
      market_insights: {
        demand_level: 'medium',
        competition: 'medium',
        seasonal_trends: ['holiday', 'gift-giving'],
        target_audience: ['art lovers', 'unique gift seekers'],
      },
      seo_keywords: ['handmade', 'artisan', 'unique', 'craft'],
      improvement_suggestions: ['Improve product photography', 'Add more detailed descriptions'],
    };
  }

  private static extractImageAnalysisFromText(text: string): ImageAnalysisResult {
    // Fallback parsing logic
    return {
      objects_detected: ['product'],
      colors: ['various'],
      style: 'artisan',
      quality_score: 75,
      composition_feedback: text.substring(0, 200),
      enhancement_suggestions: ['Improve lighting', 'Use neutral background'],
      marketplace_suitability: {
        etsy: 80,
        amazon: 70,
        general: 75,
      },
    };
  }

  static async cleanup(): Promise<void> {
    // Clear chat sessions periodically
    this.chatSessions.clear();
    this.models.clear();
  }
}

// Initialize the service when first used
// GeminiAIService.initialize();