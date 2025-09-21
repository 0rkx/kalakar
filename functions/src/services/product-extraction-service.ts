import { GoogleGenerativeAI } from '@google/generative-ai';
import * as functions from 'firebase-functions';
import { ConversationData, ConversationTurn, ProductInfo } from '../models/conversation';

const genAI = new GoogleGenerativeAI(functions.config().gemini.api_key);

export interface ExtractedProductInfo extends ProductInfo {
  confidence: {
    overall: number;
    fields: Record<string, number>;
  };
  missingFields: string[];
  requiredFieldsComplete: boolean;
}

export class ProductExtractionService {
  
  /**
   * Extract structured product information from conversation history
   */
  static async extractProductInfo(conversationData: ConversationData): Promise<ExtractedProductInfo> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      // Prepare conversation context
      const conversationText = this.formatConversationForExtraction(conversationData.turns);
      
      const prompt = `
      Analyze this conversation between an AI assistant and an Indian artisan about their handmade product.
      Extract structured product information and provide confidence scores.
      
      CONVERSATION:
      ${conversationText}
      
      Extract the following information and provide confidence scores (0-1) for each field:
      
      REQUIRED FIELDS:
      - productType: What type of product is it?
      - materials: What materials are used?
      - colors: What colors are present?
      - craftingProcess: How is it made?
      
      OPTIONAL FIELDS:
      - dimensions: Size/measurements (length, width, height, weight, unit)
      - culturalSignificance: Cultural or traditional significance
      - timeToMake: How long it takes to create
      - pricing: Cost information (cost, currency, factors)
      - targetMarket: Who would buy this?
      - uniqueFeatures: What makes it special?
      - careInstructions: How to care for it?
      - customizationOptions: Can it be customized?
      
      Return a JSON response with this structure:
      {
        "productInfo": {
          "productType": "string",
          "materials": ["string"],
          "colors": ["string"],
          "craftingProcess": "string",
          "dimensions": {
            "length": number,
            "width": number,
            "height": number,
            "weight": number,
            "unit": "string"
          },
          "culturalSignificance": "string",
          "timeToMake": "string",
          "pricing": {
            "cost": number,
            "currency": "string",
            "factors": ["string"]
          },
          "targetMarket": "string",
          "uniqueFeatures": ["string"],
          "careInstructions": "string",
          "customizationOptions": ["string"]
        },
        "confidence": {
          "overall": number,
          "fields": {
            "productType": number,
            "materials": number,
            "colors": number,
            "craftingProcess": number,
            "dimensions": number,
            "culturalSignificance": number,
            "timeToMake": number,
            "pricing": number,
            "targetMarket": number,
            "uniqueFeatures": number,
            "careInstructions": number,
            "customizationOptions": number
          }
        },
        "missingFields": ["string"],
        "requiredFieldsComplete": boolean
      }
      
      Guidelines:
      - Only extract information explicitly mentioned in the conversation
      - Set confidence to 0 for fields not mentioned
      - Mark fields as missing if confidence < 0.3
      - Required fields: productType, materials, colors, craftingProcess
      - Be culturally sensitive and respectful
      - Preserve original language nuances where possible
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text();
      
      // Parse the JSON response
      let extractedData;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse extraction response:', parseError);
        // Fallback to basic extraction
        extractedData = this.fallbackExtraction(conversationData.turns);
      }
      
      // Validate and structure the response
      const productInfo = this.validateAndStructureProductInfo(extractedData.productInfo || {});
      const confidence = this.validateConfidenceScores(extractedData.confidence || {});
      const missingFields = this.identifyMissingFields(productInfo, confidence);
      const requiredFieldsComplete = this.checkRequiredFields(productInfo, confidence);
      
      return {
        ...productInfo,
        confidence,
        missingFields,
        requiredFieldsComplete
      };
      
    } catch (error) {
      console.error('Error extracting product information:', error);
      // Return fallback extraction
      return this.fallbackExtraction(conversationData.turns);
    }
  }
  
  /**
   * Format conversation turns for AI analysis
   */
  private static formatConversationForExtraction(turns: ConversationTurn[]): string {
    return turns.map(turn => {
      const speaker = turn.type === 'ai_question' ? 'AI' : 'User';
      return `${speaker}: ${turn.content}`;
    }).join('\n\n');
  }
  
  /**
   * Validate and structure product information
   */
  private static validateAndStructureProductInfo(rawInfo: any): ProductInfo {
    return {
      productType: rawInfo.productType || '',
      materials: Array.isArray(rawInfo.materials) ? rawInfo.materials : [],
      colors: Array.isArray(rawInfo.colors) ? rawInfo.colors : [],
      craftingProcess: rawInfo.craftingProcess || '',
      dimensions: rawInfo.dimensions ? {
        length: rawInfo.dimensions.length || undefined,
        width: rawInfo.dimensions.width || undefined,
        height: rawInfo.dimensions.height || undefined,
        weight: rawInfo.dimensions.weight || undefined,
        unit: rawInfo.dimensions.unit || 'cm'
      } : undefined,
      culturalSignificance: rawInfo.culturalSignificance || undefined,
      timeToMake: rawInfo.timeToMake || undefined,
      pricing: rawInfo.pricing ? {
        cost: rawInfo.pricing.cost || 0,
        currency: rawInfo.pricing.currency || 'INR',
        factors: Array.isArray(rawInfo.pricing.factors) ? rawInfo.pricing.factors : []
      } : undefined,
      targetMarket: rawInfo.targetMarket || undefined,
      uniqueFeatures: Array.isArray(rawInfo.uniqueFeatures) ? rawInfo.uniqueFeatures : [],
      careInstructions: rawInfo.careInstructions || undefined,
      customizationOptions: Array.isArray(rawInfo.customizationOptions) ? rawInfo.customizationOptions : []
    };
  }
  
  /**
   * Validate confidence scores
   */
  private static validateConfidenceScores(rawConfidence: any): ExtractedProductInfo['confidence'] {
    const defaultConfidence = {
      overall: 0,
      fields: {
        productType: 0,
        materials: 0,
        colors: 0,
        craftingProcess: 0,
        dimensions: 0,
        culturalSignificance: 0,
        timeToMake: 0,
        pricing: 0,
        targetMarket: 0,
        uniqueFeatures: 0,
        careInstructions: 0,
        customizationOptions: 0
      }
    };
    
    if (!rawConfidence || typeof rawConfidence !== 'object') {
      return defaultConfidence;
    }
    
    const fields = { ...defaultConfidence.fields };
    if (rawConfidence.fields && typeof rawConfidence.fields === 'object') {
      Object.keys(fields).forEach(field => {
        const score = rawConfidence.fields[field];
        if (typeof score === 'number' && score >= 0 && score <= 1) {
          (fields as any)[field] = score;
        }
      });
    }
    
    // Calculate overall confidence as average of field confidences
    const fieldScores = Object.values(fields);
    const overall = fieldScores.length > 0 
      ? fieldScores.reduce((sum, score) => sum + score, 0) / fieldScores.length
      : 0;
    
    return {
      overall: Math.min(1, Math.max(0, rawConfidence.overall || overall)),
      fields
    };
  }
  
  /**
   * Identify missing fields based on confidence scores
   */
  private static identifyMissingFields(
    productInfo: ProductInfo, 
    confidence: ExtractedProductInfo['confidence']
  ): string[] {
    const missingFields: string[] = [];
    const threshold = 0.3;
    
    Object.entries(confidence.fields).forEach(([field, score]) => {
      if (score < threshold) {
        missingFields.push(field);
      }
    });
    
    return missingFields;
  }
  
  /**
   * Check if required fields are complete
   */
  private static checkRequiredFields(
    productInfo: ProductInfo,
    confidence: ExtractedProductInfo['confidence']
  ): boolean {
    const requiredFields = ['productType', 'materials', 'colors', 'craftingProcess'];
    const threshold = 0.5;
    
    return requiredFields.every(field => 
      confidence.fields[field] >= threshold && 
      this.hasFieldValue(productInfo, field)
    );
  }
  
  /**
   * Check if a field has a meaningful value
   */
  private static hasFieldValue(productInfo: ProductInfo, field: string): boolean {
    const value = (productInfo as any)[field];
    
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    
    return value !== undefined && value !== null;
  }
  
  /**
   * Fallback extraction when AI processing fails
   */
  private static fallbackExtraction(turns: ConversationTurn[]): ExtractedProductInfo {
    const userResponses = turns
      .filter(turn => turn.type === 'user_response')
      .map(turn => turn.content)
      .join(' ');
    
    // Basic keyword extraction
    const productInfo: ProductInfo = {
      productType: this.extractKeywords(userResponses, ['pottery', 'jewelry', 'textile', 'painting', 'sculpture', 'craft'])[0] || '',
      materials: this.extractKeywords(userResponses, ['clay', 'wood', 'metal', 'fabric', 'cotton', 'silk', 'silver', 'gold']),
      colors: this.extractKeywords(userResponses, ['red', 'blue', 'green', 'yellow', 'white', 'black', 'brown', 'orange']),
      craftingProcess: '',
      uniqueFeatures: []
    };
    
    return {
      ...productInfo,
      confidence: {
        overall: 0.2,
        fields: {
          productType: productInfo.productType ? 0.3 : 0,
          materials: productInfo.materials.length > 0 ? 0.3 : 0,
          colors: productInfo.colors.length > 0 ? 0.3 : 0,
          craftingProcess: 0,
          dimensions: 0,
          culturalSignificance: 0,
          timeToMake: 0,
          pricing: 0,
          targetMarket: 0,
          uniqueFeatures: 0,
          careInstructions: 0,
          customizationOptions: 0
        }
      },
      missingFields: ['craftingProcess', 'dimensions', 'culturalSignificance', 'timeToMake', 'pricing'],
      requiredFieldsComplete: false
    };
  }
  
  /**
   * Extract keywords from text
   */
  private static extractKeywords(text: string, keywords: string[]): string[] {
    const lowerText = text.toLowerCase();
    return keywords.filter(keyword => lowerText.includes(keyword.toLowerCase()));
  }
}