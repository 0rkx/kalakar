import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  AIQuestionContext, 
  ConversationStage, 
  ProductInfo 
} from '../models/conversation';

// Initialize Gemini AI
const getGeminiApiKey = (): string => {
  return process.env.GEMINI_API_KEY || '';
};

const genAI = new GoogleGenerativeAI(getGeminiApiKey());

// Question templates for different conversation stages
export const QUESTION_TEMPLATES: Record<ConversationStage, string[]> = {
  [ConversationStage.INTRODUCTION]: [
    "Hello! I'm here to help you create a beautiful listing for your handmade product. Can you start by telling me what you've made?",
    "Welcome! I'd love to learn about your craft. What product would you like to create a listing for today?",
    "Namaste! I'm excited to help showcase your beautiful handmade creation. Please tell me about the product you'd like to list."
  ],
  [ConversationStage.BASIC_INFO]: [
    "That sounds wonderful! Can you tell me more about what materials you used to make this {productType}?",
    "How big is your {productType}? Can you describe its size or dimensions?",
    "What colors do you see in your {productType}?",
    "Could you describe the shape and form of your {productType}?"
  ],
  [ConversationStage.MATERIALS_CRAFTING]: [
    "How did you make this {productType}? Can you walk me through your crafting process?",
    "Where do you source your {materials} from? Are they locally sourced?",
    "How long does it typically take you to create one {productType}?",
    "What tools or techniques do you use in making this {productType}?",
    "Are there any special skills or techniques involved in creating this?"
  ],
  [ConversationStage.CULTURAL_SIGNIFICANCE]: [
    "Does this {productType} have any cultural or traditional significance?",
    "Is this based on any traditional Indian art form or technique?",
    "What inspired you to create this particular design?",
    "Are there any stories or traditions connected to this type of craft?",
    "Does this represent any particular region's artistic heritage?"
  ],
  [ConversationStage.PRICING_MARKET]: [
    "What do you think would be a fair price for this {productType}?",
    "Who do you think would love to buy this {productType}?",
    "Have you sold similar items before? What was the response?",
    "What factors do you consider when pricing your handmade items?",
    "Do you think this would appeal more to local customers or international buyers?"
  ],
  [ConversationStage.FINAL_DETAILS]: [
    "How should someone care for this {productType} to keep it in good condition?",
    "Can this {productType} be customized in different colors or sizes?",
    "Are there any special features that make this {productType} unique?",
    "Is there anything else special about this {productType} that buyers should know?"
  ],
  [ConversationStage.SUMMARY]: [
    "Let me summarize what we've discussed about your beautiful {productType}.",
    "Based on our conversation, here's what I understand about your {productType}."
  ]
};

// Critical information fields that must be gathered
export const CRITICAL_FIELDS = [
  'productType',
  'materials',
  'colors',
  'craftingProcess'
];

// Important information fields that should be gathered
export const IMPORTANT_FIELDS = [
  'dimensions',
  'timeToMake',
  'pricing',
  'uniqueFeatures'
];

// Nice-to-have information fields
export const NICE_TO_HAVE_FIELDS = [
  'culturalSignificance',
  'targetMarket',
  'careInstructions',
  'customizationOptions'
];

export interface InformationGaps {
  critical: string[];
  important: string[];
  nice_to_have: string[];
}

export class QuestionGenerationService {
  
  /**
   * Analyze what information is missing from the current product info
   */
  static analyzeInformationGaps(productInfo: Partial<ProductInfo>): InformationGaps {
    const gaps: InformationGaps = {
      critical: [],
      important: [],
      nice_to_have: []
    };

    // Check critical fields
    CRITICAL_FIELDS.forEach(field => {
      if (!productInfo[field as keyof ProductInfo] || 
          (Array.isArray(productInfo[field as keyof ProductInfo]) && 
           (productInfo[field as keyof ProductInfo] as any[]).length === 0)) {
        gaps.critical.push(field);
      }
    });

    // Check important fields
    IMPORTANT_FIELDS.forEach(field => {
      if (!productInfo[field as keyof ProductInfo]) {
        gaps.important.push(field);
      }
    });

    // Check nice-to-have fields
    NICE_TO_HAVE_FIELDS.forEach(field => {
      if (!productInfo[field as keyof ProductInfo]) {
        gaps.nice_to_have.push(field);
      }
    });

    return gaps;
  }

  /**
   * Determine the next conversation stage based on current info and gaps
   */
  static determineNextStage(
    currentStage: ConversationStage, 
    gaps: InformationGaps,
    productInfo: Partial<ProductInfo>
  ): ConversationStage {
    // If we have critical gaps, stay in basic info
    if (gaps.critical.length > 0) {
      return ConversationStage.BASIC_INFO;
    }

    // Progress through stages based on current stage and missing info
    switch (currentStage) {
      case ConversationStage.INTRODUCTION:
        return ConversationStage.BASIC_INFO;
      
      case ConversationStage.BASIC_INFO:
        if (gaps.important.some(field => ['timeToMake', 'craftingProcess'].includes(field))) {
          return ConversationStage.MATERIALS_CRAFTING;
        }
        return ConversationStage.CULTURAL_SIGNIFICANCE;
      
      case ConversationStage.MATERIALS_CRAFTING:
        return ConversationStage.CULTURAL_SIGNIFICANCE;
      
      case ConversationStage.CULTURAL_SIGNIFICANCE:
        if (!productInfo.pricing) {
          return ConversationStage.PRICING_MARKET;
        }
        return ConversationStage.FINAL_DETAILS;
      
      case ConversationStage.PRICING_MARKET:
        return ConversationStage.FINAL_DETAILS;
      
      case ConversationStage.FINAL_DETAILS:
        return ConversationStage.SUMMARY;
      
      default:
        return ConversationStage.SUMMARY;
    }
  }

  /**
   * Select a template question based on stage and context
   */
  static selectTemplateQuestion(
    stage: ConversationStage,
    productInfo: Partial<ProductInfo>,
    questionHistory: string[]
  ): string {
    const templates = QUESTION_TEMPLATES[stage] || [];
    
    if (templates.length === 0) {
      return "Can you tell me more about your product?";
    }

    // Filter out questions we've already asked
    const availableTemplates = templates.filter((template: string) => 
      !questionHistory.some(asked => asked.includes(template.split('?')[0]))
    );

    if (availableTemplates.length === 0) {
      // If we've asked all template questions, use the first one
      return templates[0];
    }

    // Select based on missing information
    const gaps = this.analyzeInformationGaps(productInfo);
    
    // Prioritize questions based on gaps
    if (stage === ConversationStage.BASIC_INFO) {
      if (gaps.critical.includes('materials')) {
        return availableTemplates.find((t: string) => t.includes('materials')) || availableTemplates[0];
      }
      if (gaps.critical.includes('colors')) {
        return availableTemplates.find((t: string) => t.includes('colors')) || availableTemplates[0];
      }
      if (!productInfo.dimensions) {
        return availableTemplates.find((t: string) => t.includes('size') || t.includes('dimensions')) || availableTemplates[0];
      }
    }

    // Default to first available template
    let selectedTemplate = availableTemplates[0];

    // Replace placeholders with actual product info
    if (productInfo.productType) {
      selectedTemplate = selectedTemplate.replace(/{productType}/g, productInfo.productType);
    }
    if (productInfo.materials && productInfo.materials.length > 0) {
      selectedTemplate = selectedTemplate.replace(/{materials}/g, productInfo.materials.join(', '));
    }

    return selectedTemplate;
  }

  /**
   * Generate a contextual follow-up question using Gemini AI
   */
  static async generateContextualQuestion(context: AIQuestionContext): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const gaps = this.analyzeInformationGaps(context.currentInfo);
      const nextStage = this.determineNextStage(context.conversationStage, gaps, context.currentInfo);
      
      const prompt = `
You are an AI assistant helping Indian artisans create product listings. You're having a friendly conversation to gather product information.

Current conversation context:
- Product type: ${context.currentInfo.productType || 'unknown'}
- Materials mentioned: ${context.currentInfo.materials?.join(', ') || 'none'}
- Colors mentioned: ${context.currentInfo.colors?.join(', ') || 'none'}
- Crafting process: ${context.currentInfo.craftingProcess || 'not described'}
- Cultural significance: ${context.currentInfo.culturalSignificance || 'not mentioned'}
- Pricing info: ${context.currentInfo.pricing ? 'provided' : 'not provided'}

Last user response: "${context.lastUserResponse}"
Current conversation stage: ${context.conversationStage}
Next suggested stage: ${nextStage}
Language: ${context.language}

Missing critical information: ${gaps.critical.join(', ') || 'none'}
Missing important information: ${gaps.important.join(', ') || 'none'}

Previous questions asked: ${context.questionHistory.join('; ')}

Generate the most relevant follow-up question that will help gather the most important missing information. The question should be:
1. Natural and conversational
2. Culturally appropriate for Indian artisans
3. Encouraging and supportive
4. Focused on gathering specific missing information
5. Not repetitive of previous questions

If all critical information is gathered, move to cultural significance, pricing, or final details.
If the conversation seems complete, suggest summarizing the information.

Respond with just the question, nothing else.
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const question = response.text().trim();

      return question || this.selectTemplateQuestion(nextStage, context.currentInfo, context.questionHistory);
    } catch (error) {
      console.error('Error generating contextual question:', error);
      
      // Fallback to template question
      const gaps = this.analyzeInformationGaps(context.currentInfo);
      const nextStage = this.determineNextStage(context.conversationStage, gaps, context.currentInfo);
      return this.selectTemplateQuestion(nextStage, context.currentInfo, context.questionHistory);
    }
  }

  /**
   * Extract product information from user response using Gemini AI
   */
  static async extractProductInfo(
    userResponse: string, 
    currentInfo: Partial<ProductInfo>,
    language: string
  ): Promise<Partial<ProductInfo>> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const prompt = `
You are extracting product information from an Indian artisan's response about their handmade product.

Current product information: ${JSON.stringify(currentInfo, null, 2)}

User's latest response: "${userResponse}"
Language: ${language}

Extract any new product information from the user's response and merge it with existing information. Look for:
- Product type/name
- Materials used
- Colors
- Dimensions/size
- Crafting process/techniques
- Cultural significance
- Time to make
- Pricing information
- Target market
- Unique features
- Care instructions
- Customization options

Return ONLY a JSON object with the extracted information. Do not include explanations.
Only include fields where you found new or updated information.
For arrays (like materials, colors), include all items mentioned.

Example response format:
{
  "productType": "handwoven scarf",
  "materials": ["silk", "cotton"],
  "colors": ["red", "gold"],
  "craftingProcess": "traditional handloom weaving"
}
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const extractedText = response.text().trim();

      // Try to parse JSON response
      try {
        const extractedInfo = JSON.parse(extractedText);
        
        // Merge with current info
        const updatedInfo = { ...currentInfo };
        
        Object.keys(extractedInfo).forEach(key => {
          if (extractedInfo[key] !== null && extractedInfo[key] !== undefined) {
            if (Array.isArray(extractedInfo[key])) {
              // For arrays, merge unique values
              const currentArray = updatedInfo[key as keyof ProductInfo] as string[] || [];
              const newArray = extractedInfo[key] as string[];
              updatedInfo[key as keyof ProductInfo] = [...new Set([...currentArray, ...newArray])] as any;
            } else {
              updatedInfo[key as keyof ProductInfo] = extractedInfo[key];
            }
          }
        });

        return updatedInfo;
      } catch (parseError) {
        console.error('Error parsing extracted info JSON:', parseError);
        return currentInfo;
      }
    } catch (error) {
      console.error('Error extracting product info:', error);
      return currentInfo;
    }
  }

  /**
   * Generate conversation summary
   */
  static async generateConversationSummary(
    productInfo: ProductInfo,
    conversationHistory: string[],
    language: string
  ): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      const prompt = `
Create a friendly summary of the product information gathered from this conversation with an Indian artisan.

Product Information:
${JSON.stringify(productInfo, null, 2)}

Language: ${language}

Create a warm, encouraging summary that:
1. Acknowledges the artisan's craftsmanship
2. Highlights the unique aspects of their product
3. Shows appreciation for cultural elements
4. Confirms the key details gathered

Keep it conversational and supportive, as if speaking directly to the artisan.
Maximum 3-4 sentences.
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating conversation summary:', error);
      return `Thank you for sharing the details about your beautiful ${productInfo.productType}. I've gathered information about the materials, crafting process, and unique features that make this special.`;
    }
  }
}