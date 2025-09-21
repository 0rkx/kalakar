import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(functions.config().gemini.api_key);

// New function to generate personalized artisan bios
export const generatePersonalizedArtisanBio = functions.https.onCall(async (data, context) => {
  try {
    const { conversationContext, userProfile, productInfo } = data;
    
    if (!conversationContext) {
      throw new functions.https.HttpsError('invalid-argument', 'Conversation context is required');
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Extract personality and story elements from conversation
    const userResponses = conversationContext.turns?.filter((turn: any) => turn.type === 'user_response') || [];
    const personalityAnalysis = analyzeArtisanPersonality(userResponses);
    const culturalContext = extractCulturalContext(conversationContext.extractedInfo || {}, userProfile);
    
    const prompt = `
    Create a compelling, personalized artisan bio based on this rich conversation data.
    
    ARTISAN INFORMATION:
    - Name: ${userProfile?.name || 'Skilled Artisan'}
    - Location: ${userProfile?.location || 'India'}
    - Language: ${conversationContext.language?.name || 'Not specified'}
    
    PERSONALITY ANALYSIS FROM CONVERSATION:
    ${personalityAnalysis}
    
    CULTURAL CONTEXT:
    ${culturalContext}
    
    PRODUCT INFORMATION:
    - Product Type: ${productInfo?.productType || conversationContext.extractedInfo?.productType || 'Handmade craft'}
    - Materials: ${productInfo?.materials?.join(', ') || conversationContext.extractedInfo?.materials?.join(', ') || 'Traditional materials'}
    - Crafting Process: ${productInfo?.craftingProcess || conversationContext.extractedInfo?.craftingProcess || 'Traditional techniques'}
    - Cultural Significance: ${productInfo?.culturalSignificance || conversationContext.extractedInfo?.culturalSignificance || 'Not specified'}
    - Time to Make: ${productInfo?.timeToMake || conversationContext.extractedInfo?.timeToMake || 'Not specified'}
    
    CONVERSATION HIGHLIGHTS:
    ${userResponses.map((turn: any, index: number) => 
      `Response ${index + 1}: ${turn.content}`
    ).join('\n')}
    
    Create a personalized artisan bio (150-250 words) that includes:
    
    1. PERSONAL INTRODUCTION: Use the artisan's actual personality and speaking style
    2. CRAFT EXPERTISE: Highlight their specific skills and techniques mentioned in conversation
    3. CULTURAL CONNECTION: Incorporate cultural heritage and traditional knowledge shared
    4. PERSONAL JOURNEY: Include personal elements and passion evident from conversation
    5. QUALITY COMMITMENT: Emphasize dedication to craftsmanship based on conversation tone
    6. UNIQUE STORY: What makes this artisan special based on their responses
    
    WRITING STYLE:
    - Write in first person as if the artisan is speaking
    - Use warm, authentic language that reflects their personality
    - Include specific details mentioned in the conversation
    - Be culturally respectful and accurate
    - Create emotional connection with potential buyers
    - Highlight the human story behind the craft
    
    Return the bio as a single, well-formatted paragraph that tells a compelling story.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const bioText = response.text();
    
    return {
      personalizedBio: bioText.trim(),
      personalityInsights: personalityAnalysis,
      culturalElements: culturalContext,
      conversationMetadata: {
        totalTurns: conversationContext.turns?.length || 0,
        responseCount: userResponses.length,
        averageResponseLength: userResponses.length > 0 
          ? userResponses.reduce((sum: number, turn: any) => sum + turn.content.length, 0) / userResponses.length
          : 0,
        personalityScore: calculatePersonalizationLevel(conversationContext, personalityAnalysis)
      },
      generatedAt: new Date().toISOString(),
      success: true
    };

  } catch (error) {
    console.error('Error generating personalized artisan bio:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate personalized artisan bio');
  }
});

export const generateListing = functions.https.onCall(async (data, context) => {
  try {
    const { transcript, photoAnalysis, conversationContext, userProfile } = data;
    
    if (!transcript && !conversationContext) {
      throw new functions.https.HttpsError('invalid-argument', 'Either transcript or conversation context is required');
    }

    // Use Gemini Text for comprehensive product listing generation
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    // Build comprehensive context from conversation data
    let conversationDetails = '';
    let artisanPersonality = '';
    let culturalContext = '';
    
    if (conversationContext) {
      const info = conversationContext.extractedInfo || {};
      const turns = conversationContext.turns || [];
      
      // Extract artisan personality and speaking style from conversation
      const userResponses = turns.filter((turn: any) => turn.type === 'user_response');
      artisanPersonality = analyzeArtisanPersonality(userResponses);
      culturalContext = extractCulturalContext(info, userProfile);
      
      conversationDetails = `
      RICH CONVERSATION CONTEXT:
      - Language: ${conversationContext.language?.name || 'Not specified'}
      - Conversation Status: ${conversationContext.status}
      - Total Conversation Turns: ${turns.length}
      - Artisan Location: ${userProfile?.location || 'India'}
      - Artisan Name: ${userProfile?.name || 'Skilled Artisan'}
      
      EXTRACTED PRODUCT INFORMATION:
      - Product Type: ${info.productType || 'Not specified'}
      - Materials: ${info.materials ? info.materials.join(', ') : 'Not specified'}
      - Dimensions: ${info.dimensions ? JSON.stringify(info.dimensions) : 'Not specified'}
      - Colors: ${info.colors ? info.colors.join(', ') : 'Not specified'}
      - Crafting Process: ${info.craftingProcess || 'Not specified'}
      - Cultural Significance: ${info.culturalSignificance || 'Not specified'}
      - Time to Make: ${info.timeToMake || 'Not specified'}
      - Pricing Info: ${info.pricing ? JSON.stringify(info.pricing) : 'Not specified'}
      - Target Market: ${info.targetMarket || 'Not specified'}
      - Unique Features: ${info.uniqueFeatures ? info.uniqueFeatures.join(', ') : 'Not specified'}
      - Care Instructions: ${info.careInstructions || 'Not specified'}
      - Customization Options: ${info.customizationOptions ? info.customizationOptions.join(', ') : 'Not specified'}
      
      CONVERSATION SUMMARY: ${conversationContext.summary || 'Not available'}
      
      ARTISAN PERSONALITY ANALYSIS:
      ${artisanPersonality}
      
      CULTURAL CONTEXT:
      ${culturalContext}
      
      KEY CONVERSATION HIGHLIGHTS:
      ${userResponses.map((turn: any, index: number) => 
        `User Response ${index + 1}: ${turn.content}`
      ).join('\n')}
      `;
    }

    const prompt = `
    Create a comprehensive marketplace listing for this handmade Indian artisan product using rich conversation data.
    
    VOICE DESCRIPTION (Legacy): ${transcript || 'Not provided - using rich conversation data instead'}
    
    ${conversationDetails}
    
    PHOTO ANALYSIS: ${JSON.stringify(photoAnalysis)}
    
    Generate a complete product listing with the following sections:
    
    1. PRODUCT TITLE (compelling, SEO-friendly, max 80 characters, incorporate cultural elements)
    2. PRODUCT DESCRIPTION (detailed, engaging, 300-600 words, tell the artisan's story)
    3. KEY FEATURES (bullet points, 6-10 features, highlight unique craftsmanship details)
    4. MATERIALS & CRAFTSMANSHIP (detailed explanation with cultural context and traditional techniques)
    5. PERSONALIZED ARTISAN BIO (compelling story based on conversation personality, 150-250 words)
    6. DIMENSIONS & SPECIFICATIONS (precise measurements from conversation or photo analysis)
    7. CARE INSTRUCTIONS (specific to materials and cultural practices)
    8. TAGS (20-25 relevant marketplace tags including cultural and regional terms)
    9. CATEGORY CLASSIFICATION (for Etsy, Amazon, etc.)
    10. PRICING SUGGESTIONS (USD and INR ranges based on conversation insights)
    11. SHIPPING INFORMATION (consider artisan location and product fragility)
    12. CULTURAL SIGNIFICANCE (detailed explanation if mentioned in conversation)
    13. CUSTOMIZATION OPTIONS (based on conversation details)
    14. ARTISAN STORY HIGHLIGHTS (key personal touches from conversation)
    
    ENHANCED MARKETPLACE VARIATIONS:
    - Etsy version (story-driven, emphasize handmade journey, cultural heritage, personal connection)
    - Amazon version (feature-focused, commercial appeal, quality assurance, specifications)
    - WhatsApp Business version (conversational, personal, mobile-friendly with emojis)
    - Instagram version (visual storytelling, hashtag-optimized, behind-the-scenes feel)
    
    PERSONALIZATION INSTRUCTIONS:
    - Use the artisan's actual speaking style and personality from the conversation
    - Incorporate specific cultural details and traditional knowledge shared
    - Highlight the personal journey and passion evident in the conversation
    - Reference specific techniques, materials, and processes mentioned
    - Include the artisan's own words and phrases where appropriate
    - Create authentic emotional connection based on conversation tone
    - Emphasize unique selling points discovered through conversation
    - Use cultural context to enhance authenticity and appeal
    
    QUALITY ENHANCEMENT:
    - Cross-reference conversation details with photo analysis for accuracy
    - Ensure cultural sensitivity and authenticity in all descriptions
    - Create compelling narratives that reflect the artisan's passion
    - Optimize for marketplace search algorithms while maintaining authenticity
    - Include specific details that only come from personal conversation
    - Balance traditional craftsmanship with modern market appeal
    
    Format as JSON for easy parsing with clear section headers.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const listingText = response.text();
    
    let listing;
    try {
      // Try to parse as JSON
      const jsonMatch = listingText.match(/\{[\s\S]*\}/);
      listing = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (parseError) {
      console.log('JSON parsing failed, using structured text parsing');
    }
    
    // Fallback: Parse structured text if JSON parsing fails
    if (!listing) {
      listing = parseStructuredListing(listingText);
    }
    
    // Ensure required fields exist with enhanced conversation context
    const finalListing = {
      title: listing.title || listing.productTitle || 'Handmade Indian Artisan Product',
      description: listing.description || listing.productDescription || transcript || 'Beautiful handcrafted product',
      features: listing.features || listing.keyFeatures || [],
      materials: listing.materials || listing.materialsAndCraftsmanship || 'Handcrafted materials',
      artisanBio: listing.personalizedArtisanBio || listing.artisanBio || 'Skilled Indian artisan with traditional craftsmanship',
      dimensions: listing.dimensions || listing.dimensionsAndSpecifications || 'Contact for exact dimensions',
      careInstructions: listing.careInstructions || 'Handle with care, clean gently',
      tags: listing.tags || [],
      category: listing.category || listing.categoryClassification || 'Handmade',
      pricing: listing.pricing || listing.pricingSuggestions || { usd: '25-50', inr: '2000-4000' },
      shipping: listing.shipping || listing.shippingInformation || 'Worldwide shipping available',
      culturalSignificance: listing.culturalSignificance || '',
      customizationOptions: listing.customizationOptions || [],
      artisanStoryHighlights: listing.artisanStoryHighlights || [],
      marketplaceVariations: listing.enhancedMarketplaceVariations || listing.marketplaceVariations || {
        etsy: listing.description,
        amazon: listing.description,
        whatsapp: listing.description?.substring(0, 200) + '...',
        instagram: listing.description?.substring(0, 150) + '... #HandmadeInIndia'
      },
      generatedAt: new Date().toISOString(),
      sourceTranscript: transcript,
      conversationContextUsed: !!conversationContext,
      photoAnalysisUsed: !!photoAnalysis,
      // Enhanced conversation metadata for reference
      conversationMetadata: conversationContext ? {
        conversationId: conversationContext.id,
        language: conversationContext.language?.name,
        totalTurns: conversationContext.turns?.length || 0,
        extractedFields: Object.keys(conversationContext.extractedInfo || {}),
        artisanLocation: userProfile?.location,
        artisanName: userProfile?.name,
        conversationDuration: conversationContext.completedAt && conversationContext.startedAt 
          ? new Date(conversationContext.completedAt).getTime() - new Date(conversationContext.startedAt).getTime()
          : null,
        personalityAnalysis: artisanPersonality,
        culturalContext: culturalContext
      } : null,
      // Quality indicators based on conversation richness
      qualityMetrics: {
        conversationRichness: conversationContext ? calculateConversationRichness(conversationContext) : 0,
        culturalAuthenticity: culturalContext ? calculateCulturalAuthenticity(conversationContext, culturalContext) : 0,
        personalizationLevel: artisanPersonality ? calculatePersonalizationLevel(conversationContext, artisanPersonality) : 0,
        marketReadiness: calculateMarketReadiness(listing, conversationContext)
      }
    };

    return {
      listing: finalListing,
      success: true
    };

  } catch (error) {
    console.error('Error generating listing:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate product listing');
  }
});

// Helper function to analyze artisan personality from conversation
function analyzeArtisanPersonality(userResponses: any[]): string {
  if (!userResponses || userResponses.length === 0) {
    return 'Passionate artisan with traditional craftsmanship skills';
  }
  
  const responses = userResponses.map(r => r.content).join(' ');
  const responseLength = responses.length;
  const avgResponseLength = responseLength / userResponses.length;
  
  let personality = '';
  
  // Analyze speaking style
  if (avgResponseLength > 100) {
    personality += 'Detailed storyteller who loves sharing the intricacies of their craft. ';
  } else if (avgResponseLength > 50) {
    personality += 'Thoughtful artisan who provides meaningful insights about their work. ';
  } else {
    personality += 'Focused craftsperson who speaks with precision and clarity. ';
  }
  
  // Analyze content themes
  const lowerResponses = responses.toLowerCase();
  if (lowerResponses.includes('tradition') || lowerResponses.includes('family') || lowerResponses.includes('generation')) {
    personality += 'Deeply connected to traditional methods passed down through generations. ';
  }
  if (lowerResponses.includes('love') || lowerResponses.includes('passion') || lowerResponses.includes('enjoy')) {
    personality += 'Shows genuine passion and love for their craft. ';
  }
  if (lowerResponses.includes('learn') || lowerResponses.includes('improve') || lowerResponses.includes('new')) {
    personality += 'Always eager to learn and improve their techniques. ';
  }
  if (lowerResponses.includes('customer') || lowerResponses.includes('people') || lowerResponses.includes('happy')) {
    personality += 'Cares deeply about customer satisfaction and bringing joy to others. ';
  }
  
  return personality || 'Dedicated artisan committed to quality craftsmanship';
}

// Helper function to extract cultural context
function extractCulturalContext(productInfo: any, userProfile: any): string {
  let context = '';
  
  // Location-based cultural context
  const location = userProfile?.location || '';
  if (location.toLowerCase().includes('rajasthan')) {
    context += 'Rich Rajasthani heritage with vibrant colors and intricate patterns. ';
  } else if (location.toLowerCase().includes('gujarat')) {
    context += 'Gujarati craftsmanship tradition known for detailed work and cultural motifs. ';
  } else if (location.toLowerCase().includes('bengal') || location.toLowerCase().includes('kolkata')) {
    context += 'Bengali artistic tradition with emphasis on cultural storytelling. ';
  } else if (location.toLowerCase().includes('tamil') || location.toLowerCase().includes('chennai')) {
    context += 'Tamil Nadu\'s rich artistic heritage with temple-inspired designs. ';
  } else if (location.toLowerCase().includes('kerala')) {
    context += 'Kerala\'s unique artistic traditions influenced by coastal culture. ';
  } else {
    context += 'Indian artisan tradition with deep cultural roots. ';
  }
  
  // Product-based cultural context
  if (productInfo.culturalSignificance) {
    context += `Cultural significance: ${productInfo.culturalSignificance}. `;
  }
  
  // Material-based cultural context
  if (productInfo.materials) {
    const materials = productInfo.materials.join(' ').toLowerCase();
    if (materials.includes('brass') || materials.includes('copper')) {
      context += 'Traditional metalwork techniques passed down through generations. ';
    }
    if (materials.includes('cotton') || materials.includes('silk')) {
      context += 'Traditional textile craftsmanship with natural fibers. ';
    }
    if (materials.includes('clay') || materials.includes('terracotta')) {
      context += 'Ancient pottery traditions rooted in Indian culture. ';
    }
    if (materials.includes('wood')) {
      context += 'Traditional woodworking skills with cultural motifs. ';
    }
  }
  
  return context || 'Authentic Indian craftsmanship with cultural heritage';
}

// Enhanced helper function to parse structured text when JSON parsing fails
function parseStructuredListing(text: string): any {
  const sections: any = {};
  
  // Extract title
  const titleMatch = text.match(/(?:PRODUCT TITLE|Title):\s*(.+)/i);
  if (titleMatch) sections.title = titleMatch[1].trim();
  
  // Extract description
  const descMatch = text.match(/(?:PRODUCT DESCRIPTION|Description):\s*([\s\S]*?)(?:\n\d+\.|$)/i);
  if (descMatch) sections.description = descMatch[1].trim();
  
  // Extract features
  const featuresMatch = text.match(/(?:KEY FEATURES|Features):\s*([\s\S]*?)(?:\n\d+\.|$)/i);
  if (featuresMatch) {
    sections.features = featuresMatch[1]
      .split(/[-•*]/)
      .map(f => f.trim())
      .filter(f => f.length > 0);
  }
  
  // Extract artisan bio
  const bioMatch = text.match(/(?:PERSONALIZED ARTISAN BIO|ARTISAN BIO|Bio):\s*([\s\S]*?)(?:\n\d+\.|$)/i);
  if (bioMatch) sections.artisanBio = bioMatch[1].trim();
  
  // Extract cultural significance
  const culturalMatch = text.match(/(?:CULTURAL SIGNIFICANCE|Cultural):\s*([\s\S]*?)(?:\n\d+\.|$)/i);
  if (culturalMatch) sections.culturalSignificance = culturalMatch[1].trim();
  
  // Extract marketplace variations
  const etsyMatch = text.match(/(?:Etsy version|ETSY):\s*([\s\S]*?)(?:\n-|$)/i);
  const amazonMatch = text.match(/(?:Amazon version|AMAZON):\s*([\s\S]*?)(?:\n-|$)/i);
  const whatsappMatch = text.match(/(?:WhatsApp version|WHATSAPP):\s*([\s\S]*?)(?:\n-|$)/i);
  
  if (etsyMatch || amazonMatch || whatsappMatch) {
    sections.marketplaceVariations = {
      etsy: etsyMatch ? etsyMatch[1].trim() : sections.description,
      amazon: amazonMatch ? amazonMatch[1].trim() : sections.description,
      whatsapp: whatsappMatch ? whatsappMatch[1].trim() : sections.description?.substring(0, 200) + '...'
    };
  }
  
  // Extract tags
  const tagsMatch = text.match(/(?:TAGS|Tags):\s*(.+)/i);
  if (tagsMatch) {
    sections.tags = tagsMatch[1]
      .split(/[,;]/)
      .map(t => t.trim())
      .filter(t => t.length > 0);
  }
  
  // Extract pricing
  const pricingMatch = text.match(/(?:PRICING SUGGESTIONS|Pricing):\s*([\s\S]*?)(?:\n\d+\.|$)/i);
  if (pricingMatch) {
    const pricingText = pricingMatch[1];
    const usdMatch = pricingText.match(/USD[:\s]*([^,\n]+)/i);
    const inrMatch = pricingText.match(/INR[:\s]*([^,\n]+)/i);
    
    sections.pricing = {
      usd: usdMatch ? usdMatch[1].trim() : '25-50',
      inr: inrMatch ? inrMatch[1].trim() : '2000-4000'
    };
  }
  
  return sections;
}

// Helper function to calculate conversation richness score
function calculateConversationRichness(conversationContext: any): number {
  if (!conversationContext) return 0;
  
  const turns = conversationContext.turns || [];
  const extractedInfo = conversationContext.extractedInfo || {};
  
  let score = 0;
  
  // Base score from conversation length
  score += Math.min(turns.length * 0.1, 0.3);
  
  // Score from extracted information completeness
  const infoFields = Object.keys(extractedInfo);
  score += Math.min(infoFields.length * 0.05, 0.3);
  
  // Score from conversation depth (average response length)
  const userResponses = turns.filter((turn: any) => turn.type === 'user_response');
  if (userResponses.length > 0) {
    const avgLength = userResponses.reduce((sum: number, turn: any) => sum + turn.content.length, 0) / userResponses.length;
    score += Math.min(avgLength / 200, 0.2);
  }
  
  // Score from cultural significance mention
  if (extractedInfo.culturalSignificance) {
    score += 0.2;
  }
  
  return Math.min(score, 1.0);
}

// Helper function to calculate cultural authenticity score
function calculateCulturalAuthenticity(conversationContext: any, culturalContext: string): number {
  if (!conversationContext || !culturalContext) return 0;
  
  let score = 0;
  const extractedInfo = conversationContext.extractedInfo || {};
  
  // Score from cultural significance
  if (extractedInfo.culturalSignificance) {
    score += 0.4;
  }
  
  // Score from traditional materials
  if (extractedInfo.materials) {
    const traditionalMaterials = ['brass', 'copper', 'clay', 'terracotta', 'cotton', 'silk', 'wood'];
    const hasTraditional = extractedInfo.materials.some((material: string) => 
      traditionalMaterials.some(tm => material.toLowerCase().includes(tm))
    );
    if (hasTraditional) score += 0.3;
  }
  
  // Score from crafting process detail
  if (extractedInfo.craftingProcess && extractedInfo.craftingProcess.length > 50) {
    score += 0.3;
  }
  
  return Math.min(score, 1.0);
}

// Helper function to calculate personalization level
function calculatePersonalizationLevel(conversationContext: any, artisanPersonality: string): number {
  if (!conversationContext || !artisanPersonality) return 0;
  
  let score = 0;
  const turns = conversationContext.turns || [];
  const userResponses = turns.filter((turn: any) => turn.type === 'user_response');
  
  // Score from personality analysis depth
  score += Math.min(artisanPersonality.length / 200, 0.4);
  
  // Score from personal details shared
  const personalKeywords = ['family', 'tradition', 'learn', 'love', 'passion', 'generation', 'father', 'mother'];
  const personalMentions = userResponses.reduce((count: number, turn: any) => {
    const content = turn.content.toLowerCase();
    return count + personalKeywords.filter(keyword => content.includes(keyword)).length;
  }, 0);
  
  score += Math.min(personalMentions * 0.1, 0.3);
  
  // Score from unique story elements
  const extractedInfo = conversationContext.extractedInfo || {};
  if (extractedInfo.uniqueFeatures && extractedInfo.uniqueFeatures.length > 0) {
    score += 0.3;
  }
  
  return Math.min(score, 1.0);
}

// Helper function to calculate market readiness score
function calculateMarketReadiness(listing: any, conversationContext: any): number {
  let score = 0;
  
  // Required fields completeness
  const requiredFields = ['title', 'description', 'features', 'materials', 'artisanBio'];
  const completedRequired = requiredFields.filter(field => listing[field] && listing[field].length > 0).length;
  score += (completedRequired / requiredFields.length) * 0.4;
  
  // Optional fields completeness
  const optionalFields = ['dimensions', 'careInstructions', 'tags', 'culturalSignificance'];
  const completedOptional = optionalFields.filter(field => listing[field] && listing[field].length > 0).length;
  score += (completedOptional / optionalFields.length) * 0.3;
  
  // Marketplace variations completeness
  if (listing.marketplaceVariations) {
    const platforms = Object.keys(listing.marketplaceVariations);
    score += Math.min(platforms.length * 0.075, 0.3);
  }
  
  return Math.min(score, 1.0);
}

// New function to generate marketplace-specific variations using conversation data
export const generateMarketplaceVariations = functions.https.onCall(async (data, context) => {
  try {
    const { baseListing, conversationContext, userProfile, targetPlatforms } = data;
    
    if (!baseListing || !conversationContext) {
      throw new functions.https.HttpsError('invalid-argument', 'Base listing and conversation context are required');
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const platforms = targetPlatforms || ['etsy', 'amazon', 'whatsapp', 'instagram'];
    const variations: Record<string, any> = {};
    
    // Generate variations for each platform
    for (const platform of platforms) {
      const prompt = `
      Create a ${platform.toUpperCase()}-optimized product listing variation using rich conversation data.
      
      BASE LISTING:
      Title: ${baseListing.title}
      Description: ${baseListing.description}
      Features: ${baseListing.features?.join(', ') || 'Not specified'}
      
      CONVERSATION CONTEXT:
      - Artisan: ${userProfile?.name || 'Skilled Artisan'} from ${userProfile?.location || 'India'}
      - Product: ${conversationContext.extractedInfo?.productType || 'Handmade craft'}
      - Cultural Significance: ${conversationContext.extractedInfo?.culturalSignificance || 'Traditional craft'}
      - Crafting Process: ${conversationContext.extractedInfo?.craftingProcess || 'Handmade with care'}
      - Materials: ${conversationContext.extractedInfo?.materials?.join(', ') || 'Quality materials'}
      - Unique Features: ${conversationContext.extractedInfo?.uniqueFeatures?.join(', ') || 'Handcrafted details'}
      
      PLATFORM-SPECIFIC REQUIREMENTS FOR ${platform.toUpperCase()}:
      
      ${getPlatformRequirements(platform)}
      
      Create an optimized listing that:
      1. Uses conversation insights to enhance authenticity
      2. Follows platform best practices
      3. Incorporates cultural elements appropriately
      4. Highlights unique artisan story elements
      5. Optimizes for platform-specific search and discovery
      
      Return as JSON with: title, description, features, tags, and platform-specific fields.
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const variationText = response.text();
      
      try {
        const jsonMatch = variationText.match(/\{[\s\S]*\}/);
        variations[platform] = jsonMatch ? JSON.parse(jsonMatch[0]) : {
          title: baseListing.title,
          description: baseListing.description,
          platformOptimized: false
        };
      } catch (parseError) {
        console.error(`Failed to parse ${platform} variation:`, parseError);
        variations[platform] = {
          title: baseListing.title,
          description: baseListing.description,
          platformOptimized: false,
          error: 'Failed to parse platform-specific variation'
        };
      }
    }
    
    return {
      variations,
      conversationEnhanced: true,
      generatedAt: new Date().toISOString(),
      platformsGenerated: platforms,
      success: true
    };

  } catch (error) {
    console.error('Error generating marketplace variations:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate marketplace variations');
  }
});

// Helper function to get platform-specific requirements
function getPlatformRequirements(platform: string): string {
  const requirements = {
    etsy: `
    ETSY FOCUS:
    - Emphasize handmade story and artisan journey
    - Use emotional, personal language
    - Highlight cultural heritage and traditional techniques
    - Include behind-the-scenes crafting details
    - Focus on uniqueness and personal connection
    - Use storytelling approach
    - Optimize for craft-focused keywords
    `,
    amazon: `
    AMAZON FOCUS:
    - Emphasize quality, durability, and specifications
    - Use clear, factual language
    - Highlight features and benefits
    - Include technical specifications
    - Focus on value proposition
    - Use commercial, professional tone
    - Optimize for search keywords and filters
    `,
    whatsapp: `
    WHATSAPP FOCUS:
    - Use conversational, friendly tone
    - Keep concise and mobile-friendly
    - Include emojis and visual elements
    - Emphasize personal connection
    - Use local language nuances
    - Focus on immediate appeal
    - Include call-to-action for direct contact
    `,
    instagram: `
    INSTAGRAM FOCUS:
    - Use visual storytelling approach
    - Include relevant hashtags
    - Emphasize aesthetic appeal
    - Use trendy, engaging language
    - Focus on lifestyle and inspiration
    - Include behind-the-scenes elements
    - Optimize for discovery and engagement
    `
  };
  
  return requirements[platform as keyof typeof requirements] || 'General marketplace optimization';
}