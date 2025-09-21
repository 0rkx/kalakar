import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import { ListingsItemsApi, ApiClient } from '@amazon-sp-api-release/amazon-sp-api-sdk-js';

// Marketplace API configurations
const marketplaceConfig = {
  etsy: {
    apiKey: process.env.ETSY_API_KEY || 'your-etsy-api-key',
    shopId: process.env.ETSY_SHOP_ID || 'your-etsy-shop-id',
  },
  amazon: {
    accessKey: process.env.AMAZON_ACCESS_KEY || 'your-amazon-access-key',
    secretKey: process.env.AMAZON_SECRET_KEY || 'your-amazon-secret-key',
    sellerId: process.env.AMAZON_SELLER_ID || 'your-amazon-seller-id',
  },
  whatsapp: {
    businessApiToken: process.env.WHATSAPP_BUSINESS_API_TOKEN || 'your-whatsapp-business-api-token',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'your-whatsapp-phone-number-id',
  },
};

export const exportToMarketplace = functions.https.onCall(async (data, context) => {
  try {
    const { listing, platforms, userPreferences, conversationData, userProfile } = data;
    
    if (!listing) {
      throw new functions.https.HttpsError('invalid-argument', 'Product listing is required');
    }

    const exportResults: any = {};
    const selectedPlatforms = platforms || ['etsy', 'amazon', 'whatsapp'];

    // Enhance listing with conversation insights before export
    const enhancedListing = await enhanceListingWithConversationData(listing, conversationData, userProfile);

    // Process each platform export with enhanced data
    for (const platform of selectedPlatforms) {
      try {
        switch (platform) {
          case 'etsy':
            exportResults.etsy = await exportToEtsy(enhancedListing, userPreferences, conversationData);
            break;
          case 'amazon':
            exportResults.amazon = await exportToAmazon(enhancedListing, userPreferences, conversationData);
            break;
          case 'whatsapp':
            exportResults.whatsapp = await exportToWhatsApp(enhancedListing, userPreferences, conversationData);
            break;
          default:
            exportResults[platform] = { success: false, error: 'Unsupported platform' };
        }
      } catch (platformError) {
        console.error(`Error exporting to ${platform}:`, platformError);
        exportResults[platform] = { 
          success: false, 
          error: `Failed to export to ${platform}`,
          conversationDataUsed: !!conversationData
        };
      }
    }

    // Store enhanced export record in Firestore with conversation metadata
    await admin.firestore().collection('exports').add({
      listing: enhancedListing,
      originalListing: listing,
      platforms: selectedPlatforms,
      results: exportResults,
      conversationMetadata: conversationData ? {
        conversationId: conversationData.id,
        totalTurns: conversationData.turns?.length || 0,
        extractedFields: Object.keys(conversationData.extractedInfo || {}),
        conversationLanguage: conversationData.language,
        artisanLocation: userProfile?.location,
        culturalEnhancement: !!conversationData.extractedInfo?.culturalSignificance,
        personalizedBio: !!enhancedListing.personalizedArtisanBio
      } : null,
      exportedAt: new Date().toISOString(),
      userId: context.auth?.uid || 'anonymous'
    });

    return {
      success: true,
      results: exportResults,
      exportId: Date.now().toString(),
      exportedAt: new Date().toISOString(),
      conversationEnhanced: !!conversationData,
      enhancementMetrics: enhancedListing.enhancementMetrics || {}
    };

  } catch (error) {
    console.error('Error exporting to marketplace:', error);
    throw new functions.https.HttpsError('internal', 'Failed to export to marketplace');
  }
});

export async function getEtsyAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: marketplaceConfig.etsy.apiKey,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to refresh Etsy access token: ${errorData.error_description}`);
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}

export async function exportToEtsy(listing: any, userPreferences: any, conversationData?: any) {
  const refreshToken = 'your-etsy-refresh-token'; // TODO: Replace with user's stored refresh token
  const accessToken = await getEtsyAccessToken(refreshToken);

  const conversationMetadata = listing.conversationMetadata || {};
  const etsyVariation = listing.marketplaceVariations?.etsy || {};

  const culturalTags = generateCulturalTagsFromConversation(conversationMetadata);
  
  const etsyListing = {
    title: etsyVariation.title || listing.title,
    description: etsyVariation.description || listing.enhancedDescription || listing.description,
    price: extractPrice(listing.pricing?.usd || '25'),
    quantity: userPreferences?.quantity || 1,
    tags: etsyVariation.tags || [...(listing.tags?.slice(0, 10) || []), ...culturalTags].slice(0, 13),
    taxonomy_id: mapToEtsyCategory(listing.category),
    materials: extractMaterialsFromConversation(conversationMetadata.extractedInfo) || [listing.materials || 'Handcrafted materials'],
    shipping_profile_id: userPreferences?.etsyShippingTemplate || null,
    shop_section_id: userPreferences?.etsyShopSection || null,
    who_made: 'i_did',
    when_made: determineWhenMadeFromConversation(conversationMetadata.extractedInfo),
    is_supply: false,
  };

  try {
    const response = await fetch(`https://api.etsy.com/v3/application/shops/${marketplaceConfig.etsy.shopId}/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': marketplaceConfig.etsy.apiKey,
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(etsyListing),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Etsy API Error:', errorData);
      throw new Error(`Etsy API request failed: ${errorData.error}`);
    }

    const responseData = await response.json();

    return {
      success: true,
      platform: 'etsy',
      listingId: responseData.listing_id,
      url: responseData.url,
      message: 'Successfully created draft listing on Etsy.',
    };
  } catch (error) {
    console.error('Error exporting to Etsy:', error);
    return {
      success: false,
      platform: 'etsy',
      error: error.message,
    };
  }
}

export async function exportToAmazon(listing: any, userPreferences: any, conversationData?: any) {
  const refreshToken = 'your-amazon-refresh-token'; // TODO: Replace with user's stored refresh token

  const conversationMetadata = listing.conversationMetadata || {};
  const amazonVariation = listing.marketplaceVariations?.amazon || {};

  const amazonListing = {
    sku: `ARTISAN_${Date.now()}`,
    productType: 'HANDMADE_PRODUCT',
    attributes: {
      title: [{ value: amazonVariation.title || listing.title }],
      brand: [{ value: conversationMetadata.artisanName || 'Handmade by Indian Artisan' }],
      description: [{ value: amazonVariation.description || listing.enhancedDescription || listing.description }],
      bullet_point: (amazonVariation.bulletPoints || generateAmazonBulletPointsFromConversation(listing.features, conversationMetadata.extractedInfo)).slice(0, 5).map((bp: string) => ({ value: bp })),
      item_type_keyword: [{ value: mapToAmazonCategory(listing.category) }],
      generic_keywords: (amazonVariation.keywords || generateAmazonKeywordsFromConversation(listing.tags, conversationMetadata)).split(',').map((kw: string) => ({ value: kw.trim() })),
    },
  };

  try {
    const apiClient = new ApiClient({
      basePath: 'https://sellingpartnerapi-na.amazon.com', // or the correct endpoint for the region
      accessToken: refreshToken, // The SDK will handle the refresh
      region: 'us-east-1', // or the correct region
    });

    const listingsApi = new ListingsItemsApi(apiClient);

    const response = await listingsApi.putListingsItem({
      sellerId: marketplaceConfig.amazon.sellerId,
      sku: amazonListing.sku,
      marketplaceIds: ['ATVPDKIKX0DER'], // US marketplace ID
      body: {
        productType: amazonListing.productType,
        attributes: amazonListing.attributes,
      },
    });

    return {
      success: true,
      platform: 'amazon',
      sku: response.sku,
      message: 'Successfully created listing on Amazon.',
    };
  } catch (error) {
    console.error('Error exporting to Amazon:', error);
    return {
      success: false,
      platform: 'amazon',
      error: error.message,
    };
  }
}

export async function exportToWhatsApp(listing: any, userPreferences: any, conversationData?: any) {
  const conversationMetadata = listing.conversationMetadata || {};
  const whatsappVariation = listing.marketplaceVariations?.whatsapp || {};

  const personalizedMessage = whatsappVariation.message || generateWhatsAppMessageFromConversation(listing, conversationMetadata);

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${marketplaceConfig.whatsapp.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${marketplaceConfig.whatsapp.businessApiToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: userPreferences.whatsappNumber, // Assuming the user's number is in userPreferences
        type: 'text',
        text: {
          body: personalizedMessage,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('WhatsApp API Error:', errorData);
      throw new Error(`WhatsApp API request failed: ${errorData.error.message}`);
    }

    const responseData = await response.json();

    return {
      success: true,
      platform: 'whatsapp',
      messageId: responseData.messages[0].id,
      message: 'Successfully sent message to WhatsApp.',
    };
  } catch (error) {
    console.error('Error exporting to WhatsApp:', error);
    return {
      success: false,
      platform: 'whatsapp',
      error: error.message,
    };
  }
}

// Enhanced listing with conversation data integration
async function enhanceListingWithConversationData(listing: any, conversationData: any, userProfile: any): Promise<any> {
  if (!conversationData) {
    return {
      ...listing,
      enhancementMetrics: { conversationDataUsed: false }
    };
  }

  const extractedInfo = conversationData.extractedInfo || {};
  const userResponses = conversationData.turns?.filter((turn: any) => turn.type === 'user_response') || [];
  
  // Generate conversation insights
  const conversationInsights = generateConversationInsights(conversationData, userProfile);
  
  // Create enhanced artisan bio using conversation personality
  const personalizedBio = generatePersonalizedArtisanBio(userResponses, extractedInfo, userProfile);
  
  // Enhance product descriptions with conversation details
  const enhancedDescriptions = generateEnhancedDescriptions(listing, conversationInsights, extractedInfo);
  
  // Create platform-specific variations using conversation context
  const platformVariations = generatePlatformSpecificVariations(listing, conversationInsights, extractedInfo);

  return {
    ...listing,
    // Enhanced core content
    personalizedArtisanBio: personalizedBio,
    enhancedDescription: enhancedDescriptions.detailed,
    conversationHighlights: conversationInsights.highlights,
    
    // Platform-specific enhanced content
    marketplaceVariations: {
      ...listing.marketplaceVariations,
      etsy: platformVariations.etsy,
      amazon: platformVariations.amazon,
      whatsapp: platformVariations.whatsapp,
      instagram: platformVariations.instagram
    },
    
    // Conversation metadata for export reference
    conversationMetadata: {
      conversationId: conversationData.id,
      artisanName: userProfile?.name || 'Skilled Artisan',
      artisanLocation: userProfile?.location || 'India',
      conversationLanguage: conversationData.language,
      culturalContext: conversationInsights.culturalContext,
      personalityAnalysis: conversationInsights.personalityAnalysis,
      extractedInfo: extractedInfo,
      conversationQuality: conversationInsights.qualityMetrics
    },
    
    // Enhancement metrics
    enhancementMetrics: {
      conversationDataUsed: true,
      totalConversationTurns: conversationData.turns?.length || 0,
      extractedFieldsCount: Object.keys(extractedInfo).length,
      personalizedElementsAdded: conversationInsights.personalizedElements.length,
      culturalElementsAdded: conversationInsights.culturalElements.length,
      platformVariationsGenerated: Object.keys(platformVariations).length,
      conversationRichnessScore: conversationInsights.qualityMetrics.richnessScore
    }
  };
}

// Generate comprehensive conversation insights
function generateConversationInsights(conversationData: any, userProfile: any): any {
  const extractedInfo = conversationData.extractedInfo || {};
  const userResponses = conversationData.turns?.filter((turn: any) => turn.type === 'user_response') || [];
  
  // Analyze artisan personality from responses
  const personalityAnalysis = analyzeArtisanPersonalityFromConversation(userResponses);
  
  // Extract cultural context
  const culturalContext = extractCulturalContextFromConversation(extractedInfo, userProfile);
  
  // Identify conversation highlights
  const highlights = extractConversationHighlights(userResponses, extractedInfo);
  
  // Generate personalized elements
  const personalizedElements = generatePersonalizedElements(userResponses, extractedInfo);
  
  // Extract cultural elements
  const culturalElements = extractCulturalElements(extractedInfo, userProfile);
  
  // Calculate quality metrics
  const qualityMetrics = calculateConversationQualityMetrics(conversationData, userResponses);

  return {
    personalityAnalysis,
    culturalContext,
    highlights,
    personalizedElements,
    culturalElements,
    qualityMetrics
  };
}

// Generate personalized artisan bio from conversation
function generatePersonalizedArtisanBio(userResponses: any[], extractedInfo: any, userProfile: any): string {
  if (!userResponses || userResponses.length === 0) {
    return `${userProfile?.name || 'Skilled Artisan'} is a dedicated craftsperson from ${userProfile?.location || 'India'} who creates beautiful handmade products with traditional techniques and modern appeal.`;
  }

  const responses = userResponses.map(r => r.content).join(' ');
  const avgResponseLength = responses.length / userResponses.length;
  
  let bio = `Hi, I'm ${userProfile?.name || 'a skilled artisan'} from ${userProfile?.location || 'India'}. `;
  
  // Add personality-based introduction
  if (avgResponseLength > 100) {
    bio += "I love sharing the stories behind my creations and the traditional techniques that make each piece special. ";
  } else if (avgResponseLength > 50) {
    bio += "I take pride in creating quality handmade pieces that reflect our rich cultural heritage. ";
  } else {
    bio += "I focus on creating beautiful, authentic handmade pieces with attention to detail. ";
  }
  
  // Add craft-specific details from conversation
  if (extractedInfo.craftingProcess) {
    bio += `My crafting process involves ${extractedInfo.craftingProcess.toLowerCase()}. `;
  }
  
  // Add cultural significance if mentioned
  if (extractedInfo.culturalSignificance) {
    bio += `Each piece carries cultural significance: ${extractedInfo.culturalSignificance}. `;
  }
  
  // Add materials expertise
  if (extractedInfo.materials && extractedInfo.materials.length > 0) {
    bio += `I work with ${extractedInfo.materials.join(', ')} to create unique pieces that blend tradition with contemporary appeal. `;
  }
  
  // Add time commitment
  if (extractedInfo.timeToMake) {
    bio += `I invest ${extractedInfo.timeToMake} in each creation to ensure the highest quality. `;
  }
  
  bio += "Thank you for supporting handmade craftsmanship and helping preserve our traditional arts!";
  
  return bio;
}

// Generate enhanced descriptions using conversation context
function generateEnhancedDescriptions(listing: any, conversationInsights: any, extractedInfo: any): any {
  const baseDescription = listing.description || '';
  
  let enhancedDescription = baseDescription;
  
  // Add conversation highlights
  if (conversationInsights.highlights.length > 0) {
    enhancedDescription += '\n\n✨ ARTISAN INSIGHTS:\n';
    conversationInsights.highlights.forEach((highlight: string, index: number) => {
      enhancedDescription += `• ${highlight}\n`;
    });
  }
  
  // Add cultural context
  if (conversationInsights.culturalContext) {
    enhancedDescription += `\n🏛️ CULTURAL HERITAGE:\n${conversationInsights.culturalContext}\n`;
  }
  
  // Add crafting process details
  if (extractedInfo.craftingProcess) {
    enhancedDescription += `\n⚒️ CRAFTING PROCESS:\n${extractedInfo.craftingProcess}\n`;
  }
  
  // Add personalized elements
  if (conversationInsights.personalizedElements.length > 0) {
    enhancedDescription += '\n👨‍🎨 PERSONAL TOUCH:\n';
    conversationInsights.personalizedElements.forEach((element: string) => {
      enhancedDescription += `• ${element}\n`;
    });
  }

  return {
    detailed: enhancedDescription,
    summary: baseDescription,
    conversationEnhanced: true
  };
}

// Generate platform-specific variations with conversation data
function generatePlatformSpecificVariations(listing: any, conversationInsights: any, extractedInfo: any): any {
  const baseTitle = listing.title || 'Handmade Artisan Product';
  const baseDescription = listing.description || '';
  
  return {
    etsy: {
      title: enhanceEtsyTitle(baseTitle, extractedInfo, conversationInsights),
      description: enhanceEtsyDescriptionWithConversation(baseDescription, conversationInsights, extractedInfo),
      tags: generateEtsyTagsFromConversation(listing.tags || [], extractedInfo, conversationInsights),
      storyFocus: true,
      culturalElements: conversationInsights.culturalElements
    },
    amazon: {
      title: enhanceAmazonTitle(baseTitle, extractedInfo),
      description: enhanceAmazonDescriptionWithConversation(baseDescription, conversationInsights, extractedInfo),
      bulletPoints: generateAmazonBulletPointsFromConversation(listing.features || [], extractedInfo),
      keywords: generateAmazonKeywordsFromConversation(listing.tags || [], extractedInfo, conversationInsights),
      qualityFocus: true,
      specifications: extractTechnicalSpecsFromConversation(extractedInfo)
    },
    whatsapp: {
      message: generateWhatsAppMessageFromConversation(listing, conversationInsights, extractedInfo),
      personalizedGreeting: generatePersonalizedWhatsAppGreeting(conversationInsights),
      culturalContext: conversationInsights.culturalContext,
      conversationalTone: true
    },
    instagram: {
      caption: generateInstagramCaptionFromConversation(listing, conversationInsights, extractedInfo),
      hashtags: generateInstagramHashtagsFromConversation(listing.tags || [], extractedInfo, conversationInsights),
      storyHighlights: conversationInsights.highlights.slice(0, 3),
      visualStorytelling: true
    }
  };
}

// Helper functions
function extractPrice(priceString: string): number {
  const match = priceString.match(/(\d+)/);
  return match ? parseInt(match[1]) : 25;
}

function mapToEtsyCategory(category: string): number {
  // Map your categories to Etsy category IDs
  const categoryMap: { [key: string]: number } = {
    'handmade': 69150467,
    'jewelry': 69150425,
    'clothing': 69150429,
    'home': 69150433,
    'art': 69150437
  };
  return categoryMap[category?.toLowerCase()] || 69150467;
}

function mapToAmazonCategory(category: string): string {
  // Map your categories to Amazon categories
  const categoryMap: { [key: string]: string } = {
    'handmade': 'Handmade',
    'jewelry': 'Handmade/Jewelry',
    'clothing': 'Handmade/Clothing',
    'home': 'Handmade/Home & Kitchen',
    'art': 'Handmade/Artwork'
  };
  return categoryMap[category?.toLowerCase()] || 'Handmade';
}



// Enhanced WhatsApp message with conversation personalization
function formatPersonalizedWhatsAppMessage(listing: any, conversationMetadata: any): string {
  const artisanName = conversationMetadata.artisanName || 'Artisan';
  const location = conversationMetadata.artisanLocation || 'India';
  const culturalElement = conversationMetadata.culturalContext ? 
    `\n🏛️ *Cultural Heritage:* ${conversationMetadata.culturalContext.substring(0, 50)}...` : '';
  
  const personalTouch = conversationMetadata.personalityAnalysis ? 
    `\n👨‍🎨 *About ${artisanName}:* ${conversationMetadata.personalityAnalysis.substring(0, 80)}...` : '';

  return `🎨 *${listing.title}* 🎨

${listing.description?.substring(0, 120)}...

✨ *Handcrafted Features:*
${listing.features?.slice(0, 3).map((f: string) => `• ${f}`).join('\n') || '• Made with traditional techniques'}
${culturalElement}
${personalTouch}

📍 *Crafted in:* ${location}
💰 *Price:* ₹${extractPrice(listing.pricing?.inr || '2000')}
⏱️ *Made to order:* ${listing.conversationMetadata?.extractedInfo?.timeToMake || 'Contact for timeline'}

📱 *Message us to bring this beautiful piece home!*

#HandmadeInIndia #${location.replace(/\s+/g, '')} #ArtisanCrafts #${listing.tags?.slice(0, 2).join(' #') || 'TraditionalCraft'}`;
}

// Helper functions for enhanced marketplace exports

function generateCulturalTags(culturalContext: string, location: string): string[] {
  const tags: string[] = [];
  
  if (location) {
    const locationTags = location.toLowerCase().split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    );
    tags.push(...locationTags);
  }
  
  if (culturalContext) {
    const context = culturalContext.toLowerCase();
    if (context.includes('traditional')) tags.push('Traditional');
    if (context.includes('heritage')) tags.push('Heritage');
    if (context.includes('rajasthani')) tags.push('Rajasthani');
    if (context.includes('gujarati')) tags.push('Gujarati');
    if (context.includes('bengali')) tags.push('Bengali');
    if (context.includes('tamil')) tags.push('Tamil');
    if (context.includes('kerala')) tags.push('Kerala');
  }
  
  return tags.slice(0, 3); // Limit to 3 cultural tags
}

function extractStoryElements(listing: any): string[] {
  const elements: string[] = [];
  
  if (listing.culturalSignificance) {
    elements.push('Cultural Heritage');
  }
  
  if (listing.conversationMetadata?.personalityAnalysis) {
    elements.push('Artisan Story');
  }
  
  if (listing.conversationMetadata?.extractedInfo?.craftingProcess) {
    elements.push('Traditional Process');
  }
  
  if (listing.conversationMetadata?.extractedInfo?.timeToMake) {
    elements.push('Handmade Timeline');
  }
  
  return elements;
}

function enhanceEtsyDescription(listing: any, storyElements: string[], conversationMetadata: any): string {
  let description = listing.marketplaceVariations?.etsy || listing.description || '';
  
  // Add personal story if available
  if (conversationMetadata.personalityAnalysis) {
    description += `\n\n🎨 ARTISAN STORY:\n${conversationMetadata.personalityAnalysis}`;
  }
  
  // Add cultural context
  if (conversationMetadata.culturalContext) {
    description += `\n\n🏛️ CULTURAL HERITAGE:\n${conversationMetadata.culturalContext}`;
  }
  
  // Add crafting process details
  if (listing.conversationMetadata?.extractedInfo?.craftingProcess) {
    description += `\n\n⚒️ CRAFTING PROCESS:\n${listing.conversationMetadata.extractedInfo.craftingProcess}`;
  }
  
  return description;
}

function extractQualityIndicators(listing: any, conversationMetadata: any): string[] {
  const indicators: string[] = [];
  
  if (conversationMetadata.extractedInfo?.timeToMake) {
    indicators.push(`Handcrafted over ${conversationMetadata.extractedInfo.timeToMake}`);
  }
  
  if (conversationMetadata.extractedInfo?.materials?.length > 0) {
    indicators.push(`Premium materials: ${conversationMetadata.extractedInfo.materials.join(', ')}`);
  }
  
  if (conversationMetadata.culturalContext) {
    indicators.push('Traditional craftsmanship techniques');
  }
  
  if (listing.qualityMetrics?.conversationRichness > 0.7) {
    indicators.push('Detailed artisan consultation');
  }
  
  return indicators;
}

function extractTechnicalSpecs(listing: any): Record<string, any> {
  const specs: Record<string, any> = {};
  
  if (listing.dimensions) {
    specs.dimensions = listing.dimensions;
  }
  
  if (listing.conversationMetadata?.extractedInfo?.materials) {
    specs.materials = listing.conversationMetadata.extractedInfo.materials;
  }
  
  if (listing.conversationMetadata?.extractedInfo?.colors) {
    specs.colors = listing.conversationMetadata.extractedInfo.colors;
  }
  
  if (listing.careInstructions) {
    specs.care = listing.careInstructions;
  }
  
  return specs;
}

function enhanceAmazonDescription(listing: any, qualityIndicators: string[], conversationMetadata: any): string {
  let description = listing.marketplaceVariations?.amazon || listing.description || '';
  
  // Add quality indicators
  if (qualityIndicators.length > 0) {
    description += `\n\nQUALITY ASSURANCE:\n${qualityIndicators.map(q => `• ${q}`).join('\n')}`;
  }
  
  // Add technical specifications
  if (conversationMetadata.extractedInfo) {
    description += '\n\nSPECIFICATIONS:';
    const info = conversationMetadata.extractedInfo;
    if (info.materials) description += `\nMaterials: ${info.materials.join(', ')}`;
    if (info.colors) description += `\nColors: ${info.colors.join(', ')}`;
    if (info.timeToMake) description += `\nCrafting Time: ${info.timeToMake}`;
  }
  
  return description;
}

function enhanceAmazonKeywords(tags: string[], conversationMetadata: any): string {
  let keywords = tags?.join(', ') || '';
  
  // Add location-based keywords
  if (conversationMetadata.artisanLocation) {
    keywords += `, ${conversationMetadata.artisanLocation}, Indian handicraft`;
  }
  
  // Add cultural keywords
  if (conversationMetadata.culturalContext) {
    keywords += ', traditional craft, cultural heritage, authentic Indian';
  }
  
  return keywords;
}

function enhanceAmazonBulletPoints(features: string[], qualityIndicators: string[]): string[] {
  const bulletPoints = [...(features || [])];
  
  // Add quality indicators as bullet points
  qualityIndicators.forEach(indicator => {
    if (bulletPoints.length < 5) {
      bulletPoints.push(indicator);
    }
  });
  
  return bulletPoints;
}

function determineWhenMade(conversationMetadata: any): string {
  // For Etsy - when was the item made
  if (conversationMetadata.extractedInfo?.timeToMake) {
    return 'made_to_order';
  }
  return '2020_2024'; // Recent handmade items
}

function extractArtisticStyle(listing: any, conversationMetadata: any): string {
  if (conversationMetadata.culturalContext) {
    const context = conversationMetadata.culturalContext.toLowerCase();
    if (context.includes('traditional')) return 'Traditional';
    if (context.includes('modern')) return 'Contemporary';
    if (context.includes('vintage')) return 'Vintage';
  }
  
  return 'Handmade';
}

function estimateProcessingTime(timeToMake: string, isMax: boolean = false): number {
  if (!timeToMake) return isMax ? 7 : 3; // Default 3-7 days
  
  const time = timeToMake.toLowerCase();
  if (time.includes('hour')) {
    return isMax ? 2 : 1; // 1-2 days for items taking hours
  } else if (time.includes('day')) {
    const match = time.match(/(\d+)/);
    const days = match ? parseInt(match[1]) : 3;
    return isMax ? days + 2 : days;
  } else if (time.includes('week')) {
    const match = time.match(/(\d+)/);
    const weeks = match ? parseInt(match[1]) : 1;
    return isMax ? weeks * 7 + 3 : weeks * 7;
  }
  
  return isMax ? 7 : 3; // Default fallback
}

function formatAmazonDimensions(dimensions: any): string {
  if (!dimensions) return '';
  
  const { length, width, height, unit = 'cm' } = dimensions;
  if (length && width && height) {
    return `${length} x ${width} x ${height} ${unit}`;
  }
  
  return '';
}

function extractWeight(dimensions: any): string {
  if (dimensions?.weight) {
    return `${dimensions.weight} ${dimensions.unit === 'cm' ? 'grams' : dimensions.unit}`;
  }
  return '';
}

function extractPattern(conversationMetadata: any): string {
  if (conversationMetadata.extractedInfo?.uniqueFeatures) {
    const features = conversationMetadata.extractedInfo.uniqueFeatures.join(' ').toLowerCase();
    if (features.includes('floral')) return 'Floral';
    if (features.includes('geometric')) return 'Geometric';
    if (features.includes('paisley')) return 'Paisley';
    if (features.includes('mandala')) return 'Mandala';
  }
  
  return 'Traditional';
}

function determineOccasion(listing: any, conversationMetadata: any): string {
  if (conversationMetadata.extractedInfo?.targetMarket) {
    const market = conversationMetadata.extractedInfo.targetMarket.toLowerCase();
    if (market.includes('wedding')) return 'Wedding';
    if (market.includes('festival')) return 'Festival';
    if (market.includes('gift')) return 'Gift';
    if (market.includes('home')) return 'Home Decor';
  }
  
  return 'All Occasions';
}

// Enhanced helper functions for conversation data integration

function analyzeArtisanPersonalityFromConversation(userResponses: any[]): string {
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

function extractCulturalContextFromConversation(extractedInfo: any, userProfile: any): string {
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
  if (extractedInfo.culturalSignificance) {
    context += `Cultural significance: ${extractedInfo.culturalSignificance}. `;
  }
  
  // Material-based cultural context
  if (extractedInfo.materials) {
    const materials = extractedInfo.materials.join(' ').toLowerCase();
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

function extractConversationHighlights(userResponses: any[], extractedInfo: any): string[] {
  const highlights: string[] = [];
  
  // Extract meaningful quotes from user responses
  userResponses.forEach((response: any) => {
    const content = response.content;
    if (content.length > 30 && content.length < 150) {
      // Look for passionate or descriptive statements
      if (content.toLowerCase().includes('love') || 
          content.toLowerCase().includes('special') || 
          content.toLowerCase().includes('traditional') ||
          content.toLowerCase().includes('family')) {
        highlights.push(content);
      }
    }
  });
  
  // Add extracted info highlights
  if (extractedInfo.culturalSignificance) {
    highlights.push(`Cultural Heritage: ${extractedInfo.culturalSignificance}`);
  }
  
  if (extractedInfo.craftingProcess) {
    highlights.push(`Crafting Process: ${extractedInfo.craftingProcess}`);
  }
  
  if (extractedInfo.uniqueFeatures && extractedInfo.uniqueFeatures.length > 0) {
    highlights.push(`Unique Features: ${extractedInfo.uniqueFeatures.join(', ')}`);
  }
  
  return highlights.slice(0, 5); // Limit to top 5 highlights
}

function generatePersonalizedElements(userResponses: any[], extractedInfo: any): string[] {
  const elements: string[] = [];
  
  // Extract personal touches from responses
  const personalKeywords = ['family', 'tradition', 'learn', 'love', 'passion', 'generation', 'father', 'mother', 'grandmother'];
  
  userResponses.forEach((response: any) => {
    const content = response.content.toLowerCase();
    personalKeywords.forEach(keyword => {
      if (content.includes(keyword) && !elements.some(e => e.includes(keyword))) {
        elements.push(`Personal connection to ${keyword} mentioned in conversation`);
      }
    });
  });
  
  // Add extracted personal elements
  if (extractedInfo.timeToMake) {
    elements.push(`Dedicates ${extractedInfo.timeToMake} to each piece`);
  }
  
  if (extractedInfo.customizationOptions && extractedInfo.customizationOptions.length > 0) {
    elements.push(`Offers personalization: ${extractedInfo.customizationOptions.join(', ')}`);
  }
  
  return elements.slice(0, 4); // Limit to top 4 elements
}

function extractCulturalElements(extractedInfo: any, userProfile: any): string[] {
  const elements: string[] = [];
  
  if (extractedInfo.culturalSignificance) {
    elements.push(extractedInfo.culturalSignificance);
  }
  
  if (userProfile?.location) {
    elements.push(`${userProfile.location} regional craftsmanship`);
  }
  
  if (extractedInfo.materials) {
    const traditionalMaterials = extractedInfo.materials.filter((material: string) => 
      ['brass', 'copper', 'clay', 'terracotta', 'cotton', 'silk', 'wood'].some(tm => 
        material.toLowerCase().includes(tm)
      )
    );
    if (traditionalMaterials.length > 0) {
      elements.push(`Traditional materials: ${traditionalMaterials.join(', ')}`);
    }
  }
  
  return elements;
}

function calculateConversationQualityMetrics(conversationData: any, userResponses: any[]): any {
  const totalTurns = conversationData.turns?.length || 0;
  const extractedFields = Object.keys(conversationData.extractedInfo || {}).length;
  const avgResponseLength = userResponses.length > 0 
    ? userResponses.reduce((sum: number, turn: any) => sum + turn.content.length, 0) / userResponses.length
    : 0;
  
  return {
    totalTurns,
    extractedFields,
    avgResponseLength,
    richnessScore: Math.min((totalTurns * 0.1) + (extractedFields * 0.05) + (avgResponseLength / 200), 1.0),
    completenessScore: extractedFields / 12, // Assuming 12 possible fields
    engagementScore: Math.min(avgResponseLength / 100, 1.0)
  };
}

// Platform-specific enhancement functions

function generateCulturalTagsFromConversation(conversationMetadata: any): string[] {
  const tags: string[] = [];
  
  if (conversationMetadata.artisanLocation) {
    const locationTags = conversationMetadata.artisanLocation.toLowerCase().split(' ').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1)
    );
    tags.push(...locationTags);
  }
  
  if (conversationMetadata.culturalContext) {
    const context = conversationMetadata.culturalContext.toLowerCase();
    if (context.includes('traditional')) tags.push('Traditional');
    if (context.includes('heritage')) tags.push('Heritage');
    if (context.includes('rajasthani')) tags.push('Rajasthani');
    if (context.includes('gujarati')) tags.push('Gujarati');
    if (context.includes('bengali')) tags.push('Bengali');
    if (context.includes('tamil')) tags.push('Tamil');
    if (context.includes('kerala')) tags.push('Kerala');
  }
  
  if (conversationMetadata.extractedInfo?.culturalSignificance) {
    tags.push('Cultural', 'Authentic', 'Heritage');
  }
  
  return [...new Set(tags)].slice(0, 5); // Remove duplicates and limit
}

function extractStoryElementsFromConversation(listing: any, conversationData: any): string[] {
  const elements: string[] = [];
  
  if (listing.personalizedArtisanBio) {
    elements.push('Personalized Artisan Story');
  }
  
  if (conversationData?.extractedInfo?.culturalSignificance) {
    elements.push('Cultural Heritage Story');
  }
  
  if (conversationData?.extractedInfo?.craftingProcess) {
    elements.push('Traditional Crafting Process');
  }
  
  if (conversationData?.extractedInfo?.timeToMake) {
    elements.push('Handmade Timeline Story');
  }
  
  if (listing.conversationHighlights && listing.conversationHighlights.length > 0) {
    elements.push('Personal Conversation Insights');
  }
  
  return elements;
}

function extractMaterialsFromConversation(extractedInfo: any): string[] {
  if (extractedInfo?.materials && Array.isArray(extractedInfo.materials)) {
    return extractedInfo.materials;
  }
  return ['Handcrafted materials'];
}

function determineWhenMadeFromConversation(extractedInfo: any): string {
  if (extractedInfo?.timeToMake) {
    const time = extractedInfo.timeToMake.toLowerCase();
    if (time.includes('order') || time.includes('custom')) {
      return 'made_to_order';
    }
  }
  return '2020_2024'; // Recent handmade items
}

function extractArtisticStyleFromConversation(conversationMetadata: any): string {
  if (conversationMetadata.culturalContext) {
    const context = conversationMetadata.culturalContext.toLowerCase();
    if (context.includes('traditional')) return 'Traditional';
    if (context.includes('modern')) return 'Contemporary';
    if (context.includes('vintage')) return 'Vintage';
    if (context.includes('rajasthani')) return 'Rajasthani';
    if (context.includes('gujarati')) return 'Gujarati';
  }
  
  return 'Handmade';
}

function estimateProcessingTimeFromConversation(timeToMake: string, isMax: boolean = false): number {
  if (!timeToMake) return isMax ? 7 : 3; // Default 3-7 days
  
  const time = timeToMake.toLowerCase();
  if (time.includes('hour')) {
    return isMax ? 2 : 1; // 1-2 days for items taking hours
  } else if (time.includes('day')) {
    const match = time.match(/(\d+)/);
    const days = match ? parseInt(match[1]) : 3;
    return isMax ? days + 2 : days;
  } else if (time.includes('week')) {
    const match = time.match(/(\d+)/);
    const weeks = match ? parseInt(match[1]) : 1;
    return isMax ? weeks * 7 + 3 : weeks * 7;
  }
  
  return isMax ? 7 : 3; // Default fallback
}

function determineOccasionFromConversation(extractedInfo: any): string {
  if (extractedInfo?.targetMarket) {
    const market = extractedInfo.targetMarket.toLowerCase();
    if (market.includes('wedding')) return 'Wedding';
    if (market.includes('festival')) return 'Festival';
    if (market.includes('gift')) return 'Gift';
    if (market.includes('home')) return 'Home Decor';
    if (market.includes('religious')) return 'Religious';
    if (market.includes('celebration')) return 'Celebration';
  }
  
  if (extractedInfo?.culturalSignificance) {
    const cultural = extractedInfo.culturalSignificance.toLowerCase();
    if (cultural.includes('wedding')) return 'Wedding';
    if (cultural.includes('festival')) return 'Festival';
    if (cultural.includes('religious')) return 'Religious';
  }
  
  return 'All Occasions';
}

function determineRecipientFromConversation(extractedInfo: any): string {
  if (extractedInfo?.targetMarket) {
    const market = extractedInfo.targetMarket.toLowerCase();
    if (market.includes('women')) return 'Women';
    if (market.includes('men')) return 'Men';
    if (market.includes('children')) return 'Children';
    if (market.includes('family')) return 'Family';
    if (market.includes('couple')) return 'Couples';
  }
  
  return 'Anyone';
}

function determineHolidayFromConversation(extractedInfo: any): string {
  if (extractedInfo?.culturalSignificance || extractedInfo?.targetMarket) {
    const text = (extractedInfo.culturalSignificance + ' ' + extractedInfo.targetMarket).toLowerCase();
    if (text.includes('diwali')) return 'Diwali';
    if (text.includes('holi')) return 'Holi';
    if (text.includes('christmas')) return 'Christmas';
    if (text.includes('eid')) return 'Eid';
    if (text.includes('navratri')) return 'Navratri';
    if (text.includes('durga puja')) return 'Durga Puja';
  }
  
  return '';
}

// Amazon-specific conversation enhancement functions

function extractQualityIndicatorsFromConversation(conversationMetadata: any): string[] {
  const indicators: string[] = [];
  const extractedInfo = conversationMetadata.extractedInfo || {};
  
  if (extractedInfo.timeToMake) {
    indicators.push(`Handcrafted over ${extractedInfo.timeToMake}`);
  }
  
  if (extractedInfo.materials && extractedInfo.materials.length > 0) {
    indicators.push(`Premium materials: ${extractedInfo.materials.join(', ')}`);
  }
  
  if (extractedInfo.craftingProcess) {
    indicators.push('Traditional craftsmanship techniques');
  }
  
  if (conversationMetadata.culturalContext) {
    indicators.push('Authentic cultural heritage');
  }
  
  if (conversationMetadata.personalityAnalysis) {
    indicators.push('Detailed artisan consultation');
  }
  
  return indicators;
}

function extractTechnicalSpecsFromConversation(extractedInfo: any): Record<string, any> {
  const specs: Record<string, any> = {};
  
  if (extractedInfo?.dimensions) {
    specs.dimensions = extractedInfo.dimensions;
  }
  
  if (extractedInfo?.materials) {
    specs.materials = extractedInfo.materials;
  }
  
  if (extractedInfo?.colors) {
    specs.colors = extractedInfo.colors;
  }
  
  if (extractedInfo?.careInstructions) {
    specs.care = extractedInfo.careInstructions;
  }
  
  if (extractedInfo?.timeToMake) {
    specs.craftingTime = extractedInfo.timeToMake;
  }
  
  return specs;
}

function generateAmazonKeywordsFromConversation(tags: string[], conversationMetadata: any, extractedInfo?: any): string {
  let keywords = tags?.join(', ') || '';
  
  // Add location-based keywords
  if (conversationMetadata.artisanLocation) {
    keywords += `, ${conversationMetadata.artisanLocation}, Indian handicraft`;
  }
  
  // Add cultural keywords
  if (conversationMetadata.culturalContext) {
    keywords += ', traditional craft, cultural heritage, authentic Indian';
  }
  
  // Add material keywords
  if (conversationMetadata.extractedInfo?.materials) {
    keywords += `, ${conversationMetadata.extractedInfo.materials.join(', ')}`;
  }
  
  return keywords;
}

function generateAmazonBulletPointsFromConversation(features: string[], extractedInfo: any): string[] {
  const bulletPoints = [...(features || [])];
  
  // Add conversation-derived bullet points
  if (extractedInfo?.materials && bulletPoints.length < 5) {
    bulletPoints.push(`PREMIUM MATERIALS: Made with ${extractedInfo.materials.join(', ')}`);
  }
  
  if (extractedInfo?.timeToMake && bulletPoints.length < 5) {
    bulletPoints.push(`HANDCRAFTED QUALITY: Each piece takes ${extractedInfo.timeToMake} to create`);
  }
  
  if (extractedInfo?.culturalSignificance && bulletPoints.length < 5) {
    bulletPoints.push(`CULTURAL HERITAGE: ${extractedInfo.culturalSignificance}`);
  }
  
  if (extractedInfo?.customizationOptions && extractedInfo.customizationOptions.length > 0 && bulletPoints.length < 5) {
    bulletPoints.push(`CUSTOMIZABLE: ${extractedInfo.customizationOptions.join(', ')}`);
  }
  
  if (extractedInfo?.careInstructions && bulletPoints.length < 5) {
    bulletPoints.push(`CARE INSTRUCTIONS: ${extractedInfo.careInstructions}`);
  }
  
  return bulletPoints.slice(0, 5);
}

function formatAmazonDimensionsFromConversation(dimensions: any): string {
  if (!dimensions) return '';
  
  const { length, width, height, unit = 'cm' } = dimensions;
  if (length && width && height) {
    return `${length} x ${width} x ${height} ${unit}`;
  }
  
  return '';
}

function extractWeightFromConversation(dimensions: any): string {
  if (dimensions?.weight) {
    return `${dimensions.weight} ${dimensions.unit === 'cm' ? 'grams' : dimensions.unit}`;
  }
  return '';
}

function extractPatternFromConversation(extractedInfo: any): string {
  if (extractedInfo?.uniqueFeatures) {
    const features = extractedInfo.uniqueFeatures.join(' ').toLowerCase();
    if (features.includes('floral')) return 'Floral';
    if (features.includes('geometric')) return 'Geometric';
    if (features.includes('paisley')) return 'Paisley';
    if (features.includes('mandala')) return 'Mandala';
    if (features.includes('tribal')) return 'Tribal';
    if (features.includes('abstract')) return 'Abstract';
  }
  
  return 'Traditional';
}

function determineTargetAudienceFromConversation(extractedInfo: any): string {
  if (extractedInfo?.targetMarket) {
    const market = extractedInfo.targetMarket.toLowerCase();
    if (market.includes('women')) return 'Women';
    if (market.includes('men')) return 'Men';
    if (market.includes('children')) return 'Children';
    if (market.includes('young')) return 'Young Adults';
    if (market.includes('professional')) return 'Professionals';
    if (market.includes('collector')) return 'Collectors';
  }
  
  return 'General Audience';
}

function determineAgeRangeFromConversation(extractedInfo: any): string {
  if (extractedInfo?.targetMarket) {
    const market = extractedInfo.targetMarket.toLowerCase();
    if (market.includes('children') || market.includes('kids')) return '3-12';
    if (market.includes('teen')) return '13-17';
    if (market.includes('young')) return '18-35';
    if (market.includes('adult')) return '25-65';
    if (market.includes('senior')) return '55+';
  }
  
  return '18+';
}

function extractThemeFromConversation(extractedInfo: any): string {
  if (extractedInfo?.culturalSignificance) {
    const cultural = extractedInfo.culturalSignificance.toLowerCase();
    if (cultural.includes('religious')) return 'Religious';
    if (cultural.includes('nature')) return 'Nature';
    if (cultural.includes('spiritual')) return 'Spiritual';
    if (cultural.includes('royal')) return 'Royal';
    if (cultural.includes('folk')) return 'Folk Art';
  }
  
  return 'Traditional';
}

function checkEcoFriendlyFromConversation(extractedInfo: any): boolean {
  if (extractedInfo?.materials) {
    const materials = extractedInfo.materials.join(' ').toLowerCase();
    return materials.includes('natural') || 
           materials.includes('organic') || 
           materials.includes('eco') || 
           materials.includes('sustainable') ||
           materials.includes('bamboo') ||
           materials.includes('cotton') ||
           materials.includes('jute');
  }
  return false;
}

function checkGiftSuitabilityFromConversation(extractedInfo: any): boolean {
  if (extractedInfo?.targetMarket) {
    const market = extractedInfo.targetMarket.toLowerCase();
    return market.includes('gift') || 
           market.includes('present') || 
           market.includes('wedding') || 
           market.includes('festival') ||
           market.includes('celebration');
  }
  return true; // Most handmade items are gift-suitable
}

function extractArtisanExperienceFromConversation(conversationData: any): string {
  if (!conversationData) return 'Experienced';
  
  const userResponses = conversationData.turns?.filter((turn: any) => turn.type === 'user_response') || [];
  const responses = userResponses.map((r: any) => r.content).join(' ').toLowerCase();
  
  if (responses.includes('years') || responses.includes('generation') || responses.includes('family tradition')) {
    return 'Master Craftsperson';
  } else if (responses.includes('learn') || responses.includes('taught') || responses.includes('practice')) {
    return 'Skilled Artisan';
  } else if (responses.includes('new') || responses.includes('start')) {
    return 'Emerging Artist';
  }
  
  return 'Experienced Craftsperson';
}

// WhatsApp-specific conversation enhancement functions

function generateWhatsAppMessageFromConversation(listing: any, conversationMetadata: any, extractedInfo?: any): string {
  const artisanName = conversationMetadata.artisanName || 'Artisan';
  const location = conversationMetadata.artisanLocation || 'India';
  const productInfo = extractedInfo || conversationMetadata.extractedInfo || {};
  
  const culturalElement = productInfo.culturalSignificance ? 
    `\n🏛️ *Cultural Heritage:* ${productInfo.culturalSignificance.substring(0, 50)}...` : '';
  
  const personalTouch = conversationMetadata.personalityAnalysis ? 
    `\n👨‍🎨 *About ${artisanName}:* ${conversationMetadata.personalityAnalysis.substring(0, 80)}...` : '';

  const craftingDetails = productInfo.craftingProcess ?
    `\n⚒️ *How it's made:* ${productInfo.craftingProcess.substring(0, 60)}...` : '';

  const materials = productInfo.materials && productInfo.materials.length > 0 ?
    `\n🎨 *Materials:* ${productInfo.materials.join(', ')}` : '';

  return `🎨 *${listing.title}* 🎨

${listing.description?.substring(0, 120)}...

✨ *Handcrafted Features:*
${listing.features?.slice(0, 3).map((f: string) => `• ${f}`).join('\n') || '• Made with traditional techniques'}
${culturalElement}
${personalTouch}
${craftingDetails}
${materials}

📍 *Crafted in:* ${location}
💰 *Price:* ₹${extractPrice(listing.pricing?.inr || '2000')}
⏱️ *Made to order:* ${extractedInfo.timeToMake || 'Contact for timeline'}

📱 *Message us to bring this beautiful piece home!*

#HandmadeInIndia #${location.replace(/\s+/g, '')} #ArtisanCrafts #${listing.tags?.slice(0, 2).join(' #') || 'TraditionalCraft'}`;
}

function generatePersonalizedWhatsAppGreeting(conversationMetadata: any): string {
  const artisanName = conversationMetadata.artisanName || 'Artisan';
  const location = conversationMetadata.artisanLocation || 'India';
  
  return `🙏 Namaste! I'm ${artisanName} from ${location}. 

I create beautiful handmade pieces using traditional techniques passed down through generations. Each item tells a story and carries the essence of our rich cultural heritage.

I'd love to share more about my craft and help you find something special! 🎨✨`;
}

function generateWhatsAppProductHighlights(extractedInfo: any): string[] {
  const highlights: string[] = [];
  
  if (extractedInfo?.materials) {
    highlights.push(`🎨 Made with: ${extractedInfo.materials.join(', ')}`);
  }
  
  if (extractedInfo?.timeToMake) {
    highlights.push(`⏱️ Crafting time: ${extractedInfo.timeToMake}`);
  }
  
  if (extractedInfo?.culturalSignificance) {
    highlights.push(`🏛️ Cultural significance: ${extractedInfo.culturalSignificance.substring(0, 50)}...`);
  }
  
  if (extractedInfo?.uniqueFeatures && extractedInfo.uniqueFeatures.length > 0) {
    highlights.push(`✨ Special features: ${extractedInfo.uniqueFeatures.slice(0, 2).join(', ')}`);
  }
  
  if (extractedInfo?.customizationOptions && extractedInfo.customizationOptions.length > 0) {
    highlights.push(`🎯 Customizable: ${extractedInfo.customizationOptions.join(', ')}`);
  }
  
  return highlights;
}

function generateWhatsAppArtisanStory(conversationMetadata: any): string {
  const artisanName = conversationMetadata.artisanName || 'Artisan';
  const personalityAnalysis = conversationMetadata.personalityAnalysis || '';
  
  if (personalityAnalysis) {
    return `👨‍🎨 *About ${artisanName}:*\n${personalityAnalysis.substring(0, 200)}...`;
  }
  
  return `👨‍🎨 *About ${artisanName}:*\nPassionate craftsperson dedicated to preserving traditional Indian arts through beautiful handmade creations.`;
}

function generateWhatsAppCulturalContext(conversationMetadata: any): string {
  const culturalContext = conversationMetadata.culturalContext || '';
  const extractedInfo = conversationMetadata.extractedInfo || {};
  
  if (extractedInfo.culturalSignificance) {
    return `🏛️ *Cultural Heritage:*\n${extractedInfo.culturalSignificance}`;
  } else if (culturalContext) {
    return `🏛️ *Cultural Heritage:*\n${culturalContext.substring(0, 150)}...`;
  }
  
  return `🏛️ *Cultural Heritage:*\nAuthentic Indian craftsmanship rooted in traditional techniques and cultural values.`;
}

function generateWhatsAppCustomizationInfo(extractedInfo: any): string {
  if (extractedInfo?.customizationOptions && extractedInfo.customizationOptions.length > 0) {
    return `🎯 *Customization Available:*\n• ${extractedInfo.customizationOptions.join('\n• ')}\n\nLet me know your preferences and I'll create something special just for you!`;
  }
  
  return `🎯 *Customization:*\nI can work with you to create personalized variations. Share your ideas and let's make something unique together!`;
}

function generateWhatsAppOrderingProcess(conversationMetadata: any): string {
  const extractedInfo = conversationMetadata.extractedInfo || {};
  const timeToMake = extractedInfo.timeToMake || '1-2 weeks';
  
  return `📋 *How to Order:*
1️⃣ Share your requirements and preferences
2️⃣ I'll provide detailed quote and timeline
3️⃣ Confirm order with advance payment
4️⃣ I'll craft your piece with love (${timeToMake})
5️⃣ Quality check and secure packaging
6️⃣ Safe delivery to your doorstep

💬 Message me to start your custom order journey!`;
}

// Platform-specific title and description enhancement functions

function enhanceEtsyTitle(baseTitle: string, extractedInfo: any, conversationInsights: any): string {
  let enhancedTitle = baseTitle;
  
  // Add cultural elements
  if (extractedInfo?.culturalSignificance && !enhancedTitle.toLowerCase().includes('traditional')) {
    enhancedTitle = `Traditional ${enhancedTitle}`;
  }
  
  // Add location if not present
  if (conversationInsights.culturalElements.some((e: string) => e.includes('Rajasthani'))) {
    if (!enhancedTitle.toLowerCase().includes('rajasthani')) {
      enhancedTitle = `Rajasthani ${enhancedTitle}`;
    }
  }
  
  // Add handmade emphasis
  if (!enhancedTitle.toLowerCase().includes('handmade') && !enhancedTitle.toLowerCase().includes('handcrafted')) {
    enhancedTitle = `Handmade ${enhancedTitle}`;
  }
  
  return enhancedTitle.substring(0, 80); // Etsy title limit
}

function enhanceEtsyDescriptionWithConversation(baseDescription: string, conversationInsights: any, extractedInfo: any): string {
  let description = baseDescription;
  
  // Add artisan story
  if (conversationInsights.personalityAnalysis) {
    description += `\n\n💫 ARTISAN'S STORY:\n${conversationInsights.personalityAnalysis}`;
  }
  
  // Add cultural heritage
  if (conversationInsights.culturalContext) {
    description += `\n\n🏛️ CULTURAL HERITAGE:\n${conversationInsights.culturalContext}`;
  }
  
  // Add crafting process
  if (extractedInfo?.craftingProcess) {
    description += `\n\n⚒️ TRADITIONAL CRAFTING:\n${extractedInfo.craftingProcess}`;
  }
  
  // Add conversation highlights
  if (conversationInsights.highlights.length > 0) {
    description += `\n\n✨ SPECIAL TOUCHES:\n${conversationInsights.highlights.slice(0, 3).map((h: string) => `• ${h}`).join('\n')}`;
  }
  
  return description;
}

function generateEtsyTagsFromConversation(baseTags: string[], extractedInfo: any, conversationInsights: any): string[] {
  const tags = [...baseTags];
  
  // Add cultural tags
  const culturalTags = generateCulturalTagsFromConversation({ extractedInfo, ...conversationInsights });
  tags.push(...culturalTags);
  
  // Add material tags
  if (extractedInfo?.materials) {
    tags.push(...extractedInfo.materials.slice(0, 3));
  }
  
  // Add style tags
  if (extractedInfo?.uniqueFeatures) {
    tags.push(...extractedInfo.uniqueFeatures.slice(0, 2));
  }
  
  // Remove duplicates and limit to 13 (Etsy limit)
  return [...new Set(tags)].slice(0, 13);
}

function enhanceAmazonTitle(baseTitle: string, extractedInfo: any): string {
  let enhancedTitle = baseTitle;
  
  // Add key specifications for Amazon
  if (extractedInfo?.materials && extractedInfo.materials.length > 0) {
    const primaryMaterial = extractedInfo.materials[0];
    if (!enhancedTitle.toLowerCase().includes(primaryMaterial.toLowerCase())) {
      enhancedTitle = `${primaryMaterial} ${enhancedTitle}`;
    }
  }
  
  // Add size if available
  if (extractedInfo?.dimensions) {
    const { length, width, unit = 'cm' } = extractedInfo.dimensions;
    if (length && width) {
      enhancedTitle += ` (${length}x${width}${unit})`;
    }
  }
  
  // Add handmade qualifier
  if (!enhancedTitle.toLowerCase().includes('handmade')) {
    enhancedTitle = `Handmade ${enhancedTitle}`;
  }
  
  return enhancedTitle.substring(0, 200); // Amazon title limit
}

function enhanceAmazonDescriptionWithConversation(baseDescription: string, conversationInsights: any, extractedInfo: any): string {
  let description = baseDescription;
  
  // Add quality assurance section
  description += '\n\nQUALITY ASSURANCE:';
  if (extractedInfo?.timeToMake) {
    description += `\n• Handcrafted over ${extractedInfo.timeToMake}`;
  }
  if (extractedInfo?.materials) {
    description += `\n• Premium materials: ${extractedInfo.materials.join(', ')}`;
  }
  if (conversationInsights.culturalContext) {
    description += '\n• Authentic traditional techniques';
  }
  
  // Add specifications
  description += '\n\nSPECIFICATIONS:';
  if (extractedInfo?.materials) {
    description += `\nMaterials: ${extractedInfo.materials.join(', ')}`;
  }
  if (extractedInfo?.colors) {
    description += `\nColors: ${extractedInfo.colors.join(', ')}`;
  }
  if (extractedInfo?.dimensions) {
    description += `\nDimensions: ${JSON.stringify(extractedInfo.dimensions)}`;
  }
  if (extractedInfo?.careInstructions) {
    description += `\nCare: ${extractedInfo.careInstructions}`;
  }
  
  return description;
}

function generateInstagramCaptionFromConversation(listing: any, conversationInsights: any, extractedInfo: any): string {
  const artisanName = conversationInsights.personalityAnalysis ? 
    conversationInsights.personalityAnalysis.split(' ')[0] : 'Artisan';
  
  let caption = `✨ ${listing.title} ✨\n\n`;
  caption += `${listing.description?.substring(0, 100)}...\n\n`;
  
  // Add behind-the-scenes element
  if (extractedInfo?.craftingProcess) {
    caption += `🎨 Behind the scenes: ${extractedInfo.craftingProcess.substring(0, 80)}...\n\n`;
  }
  
  // Add cultural element
  if (extractedInfo?.culturalSignificance) {
    caption += `🏛️ Cultural story: ${extractedInfo.culturalSignificance.substring(0, 80)}...\n\n`;
  }
  
  // Add call to action
  caption += `💫 Each piece tells a story. What story will yours tell?\n\n`;
  caption += `📱 DM for custom orders and inquiries!`;
  
  return caption;
}

function generateInstagramHashtagsFromConversation(baseTags: string[], extractedInfo: any, conversationInsights: any): string[] {
  const hashtags = baseTags.map(tag => `#${tag.replace(/\s+/g, '')}`);
  
  // Add Instagram-specific hashtags
  hashtags.push('#HandmadeInIndia', '#ArtisanMade', '#TraditionalCraft', '#CulturalHeritage');
  
  // Add location-based hashtags
  if (conversationInsights.culturalElements) {
    conversationInsights.culturalElements.forEach((element: string) => {
      if (element.includes('Rajasthani')) hashtags.push('#Rajasthan');
      if (element.includes('Gujarati')) hashtags.push('#Gujarat');
      if (element.includes('Bengali')) hashtags.push('#Bengal');
    });
  }
  
  // Add material hashtags
  if (extractedInfo?.materials) {
    extractedInfo.materials.forEach((material: string) => {
      hashtags.push(`#${material.replace(/\s+/g, '')}`);
    });
  }
  
  return [...new Set(hashtags)].slice(0, 30); // Instagram limit
}

// New function to generate conversation-enhanced export reports
export const generateConversationExportReport = functions.https.onCall(async (data, context) => {
  try {
    const { exportId, conversationData, userProfile } = data;
    
    if (!exportId) {
      throw new functions.https.HttpsError('invalid-argument', 'Export ID is required');
    }

    // Retrieve export record
    const exportDoc = await admin.firestore().collection('exports').doc(exportId).get();
    if (!exportDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Export record not found');
    }

    const exportRecord = exportDoc.data();
    const listing = exportRecord?.listing;
    const results = exportRecord?.results;

    // Generate comprehensive report
    const report = {
      exportSummary: {
        exportId: exportId,
        exportedAt: exportRecord?.exportedAt,
        platforms: Object.keys(results || {}),
        successfulExports: Object.values(results || {}).filter((r: any) => r.success).length,
        totalPlatforms: Object.keys(results || {}).length
      },
      
      conversationEnhancements: conversationData ? {
        conversationId: conversationData.id,
        totalTurns: conversationData.turns?.length || 0,
        extractedFields: Object.keys(conversationData.extractedInfo || {}),
        conversationLanguage: conversationData.language,
        conversationDuration: conversationData.completedAt && conversationData.startedAt 
          ? new Date(conversationData.completedAt).getTime() - new Date(conversationData.startedAt).getTime()
          : null,
        qualityScore: calculateConversationQualityScore(conversationData),
        personalizedElements: extractPersonalizedElementsCount(conversationData, userProfile),
        culturalElements: extractCulturalElementsCount(conversationData, userProfile)
      } : null,
      
      platformSpecificEnhancements: generatePlatformEnhancementReport(results, listing, conversationData),
      
      marketplaceOptimizations: {
        etsy: generateEtsyOptimizationReport(results?.etsy, listing, conversationData),
        amazon: generateAmazonOptimizationReport(results?.amazon, listing, conversationData),
        whatsapp: generateWhatsAppOptimizationReport(results?.whatsapp, listing, conversationData)
      },
      
      conversationInsights: conversationData ? {
        artisanPersonality: analyzeArtisanPersonalityFromConversation(
          conversationData.turns?.filter((turn: any) => turn.type === 'user_response') || []
        ),
        culturalContext: extractCulturalContextFromConversation(conversationData.extractedInfo || {}, userProfile),
        productStoryElements: extractStoryElementsFromConversation(listing, conversationData),
        marketingHighlights: extractConversationHighlights(
          conversationData.turns?.filter((turn: any) => turn.type === 'user_response') || [],
          conversationData.extractedInfo || {}
        )
      } : null,
      
      recommendations: generateExportRecommendations(results, listing, conversationData),
      
      generatedAt: new Date().toISOString()
    };

    // Store the report
    await admin.firestore().collection('export_reports').add({
      ...report,
      userId: context.auth?.uid || 'anonymous',
      exportId: exportId
    });

    return {
      success: true,
      report: report
    };

  } catch (error) {
    console.error('Error generating conversation export report:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate export report');
  }
});

// Helper functions for export reporting

function calculateConversationQualityScore(conversationData: any): number {
  const turns = conversationData.turns || [];
  const extractedInfo = conversationData.extractedInfo || {};
  const userResponses = turns.filter((turn: any) => turn.type === 'user_response');
  
  let score = 0;
  
  // Base score from conversation length
  score += Math.min(turns.length * 0.05, 0.3);
  
  // Score from extracted information completeness
  const infoFields = Object.keys(extractedInfo);
  score += Math.min(infoFields.length * 0.08, 0.4);
  
  // Score from response quality
  if (userResponses.length > 0) {
    const avgLength = userResponses.reduce((sum: number, turn: any) => sum + turn.content.length, 0) / userResponses.length;
    score += Math.min(avgLength / 150, 0.3);
  }
  
  return Math.min(score, 1.0);
}

function extractPersonalizedElementsCount(conversationData: any, userProfile: any): number {
  let count = 0;
  
  if (userProfile?.name) count++;
  if (userProfile?.location) count++;
  if (conversationData.extractedInfo?.culturalSignificance) count++;
  if (conversationData.extractedInfo?.craftingProcess) count++;
  if (conversationData.extractedInfo?.timeToMake) count++;
  if (conversationData.extractedInfo?.customizationOptions?.length > 0) count++;
  
  return count;
}

function extractCulturalElementsCount(conversationData: any, userProfile: any): number {
  let count = 0;
  
  if (conversationData.extractedInfo?.culturalSignificance) count++;
  if (userProfile?.location && userProfile.location !== 'India') count++; // Specific region
  if (conversationData.extractedInfo?.materials?.some((m: string) => 
    ['brass', 'copper', 'clay', 'terracotta', 'cotton', 'silk', 'wood'].some(tm => m.toLowerCase().includes(tm))
  )) count++;
  
  return count;
}

function generatePlatformEnhancementReport(results: any, listing: any, conversationData: any): any {
  const report: any = {};
  
  Object.keys(results || {}).forEach(platform => {
    const platformResult = results[platform];
    report[platform] = {
      exportSuccess: platformResult.success,
      enhancementsApplied: platformResult.enhancedFeatures || {},
      conversationDataUsed: !!conversationData,
      platformSpecificOptimizations: platformResult.enhancedFeatures ? Object.keys(platformResult.enhancedFeatures).length : 0
    };
  });
  
  return report;
}

function generateEtsyOptimizationReport(etsyResult: any, listing: any, conversationData: any): any {
  if (!etsyResult) return null;
  
  return {
    storyDrivenContent: !!etsyResult.enhancedFeatures?.artisanStoryIncluded,
    culturalAuthenticity: !!etsyResult.enhancedFeatures?.culturalContextIncluded,
    personalizedDescription: !!etsyResult.enhancedFeatures?.personalizedDescription,
    culturalTags: etsyResult.enhancedFeatures?.culturalTags || 0,
    storyElements: etsyResult.enhancedFeatures?.storyElements || 0,
    customAttributes: etsyResult.enhancedFeatures?.customAttributes || 0,
    optimizationScore: calculateEtsyOptimizationScore(etsyResult, conversationData)
  };
}

function generateAmazonOptimizationReport(amazonResult: any, listing: any, conversationData: any): any {
  if (!amazonResult) return null;
  
  return {
    qualityIndicators: amazonResult.enhancedFeatures?.qualityIndicators || 0,
    technicalSpecs: amazonResult.enhancedFeatures?.technicalSpecs || 0,
    productAttributes: amazonResult.enhancedFeatures?.productAttributes || 0,
    qualityMetrics: amazonResult.enhancedFeatures?.qualityMetrics || 0,
    targetAudienceOptimized: !!amazonResult.enhancedFeatures?.targetAudienceOptimized,
    searchOptimization: !!amazonResult.enhancedFeatures?.conversationInsights,
    optimizationScore: calculateAmazonOptimizationScore(amazonResult, conversationData)
  };
}

function generateWhatsAppOptimizationReport(whatsappResult: any, listing: any, conversationData: any): any {
  if (!whatsappResult) return null;
  
  return {
    personalizedMessaging: !!whatsappResult.enhancedFeatures?.personalizedMessage,
    artisanStoryIncluded: !!whatsappResult.enhancedFeatures?.artisanStory,
    culturalContextIncluded: !!whatsappResult.enhancedFeatures?.culturalContext,
    multipleMessageOptions: whatsappResult.enhancedFeatures?.multipleMessageOptions || 0,
    customizationOptionsIncluded: !!whatsappResult.enhancedFeatures?.customizationOptionsIncluded,
    conversationalTone: !!whatsappResult.enhancedFeatures?.conversationalTone,
    optimizationScore: calculateWhatsAppOptimizationScore(whatsappResult, conversationData)
  };
}

function generateExportRecommendations(results: any, listing: any, conversationData: any): string[] {
  const recommendations: string[] = [];
  
  // General recommendations
  if (!conversationData) {
    recommendations.push('Consider using conversation data for more personalized listings');
  } else {
    const extractedFields = Object.keys(conversationData.extractedInfo || {}).length;
    if (extractedFields < 5) {
      recommendations.push('Gather more detailed product information through conversation for better listings');
    }
  }
  
  // Platform-specific recommendations
  if (results?.etsy && !results.etsy.enhancedFeatures?.artisanStoryIncluded) {
    recommendations.push('Add more personal artisan story elements for better Etsy performance');
  }
  
  if (results?.amazon && !results.amazon.enhancedFeatures?.targetAudienceOptimized) {
    recommendations.push('Include target audience information for better Amazon visibility');
  }
  
  if (results?.whatsapp && !results.whatsapp.enhancedFeatures?.personalizedMessage) {
    recommendations.push('Create more personalized WhatsApp messages using conversation insights');
  }
  
  // Cultural recommendations
  if (conversationData?.extractedInfo?.culturalSignificance) {
    recommendations.push('Leverage cultural significance more prominently across all platforms');
  }
  
  return recommendations;
}

function calculateEtsyOptimizationScore(etsyResult: any, conversationData: any): number {
  let score = 0;
  
  if (etsyResult.enhancedFeatures?.artisanStoryIncluded) score += 0.3;
  if (etsyResult.enhancedFeatures?.culturalContextIncluded) score += 0.3;
  if (etsyResult.enhancedFeatures?.personalizedDescription) score += 0.2;
  if (etsyResult.enhancedFeatures?.culturalTags > 0) score += 0.1;
  if (etsyResult.enhancedFeatures?.storyElements > 0) score += 0.1;
  
  return Math.min(score, 1.0);
}

function calculateAmazonOptimizationScore(amazonResult: any, conversationData: any): number {
  let score = 0;
  
  if (amazonResult.enhancedFeatures?.qualityIndicators > 0) score += 0.25;
  if (amazonResult.enhancedFeatures?.technicalSpecs > 0) score += 0.25;
  if (amazonResult.enhancedFeatures?.productAttributes > 0) score += 0.2;
  if (amazonResult.enhancedFeatures?.targetAudienceOptimized) score += 0.15;
  if (amazonResult.enhancedFeatures?.conversationInsights > 0) score += 0.15;
  
  return Math.min(score, 1.0);
}

function calculateWhatsAppOptimizationScore(whatsappResult: any, conversationData: any): number {
  let score = 0;
  
  if (whatsappResult.enhancedFeatures?.personalizedMessage) score += 0.3;
  if (whatsappResult.enhancedFeatures?.artisanStory) score += 0.2;
  if (whatsappResult.enhancedFeatures?.culturalContext) score += 0.2;
  if (whatsappResult.enhancedFeatures?.multipleMessageOptions > 0) score += 0.15;
  if (whatsappResult.enhancedFeatures?.customizationOptionsIncluded) score += 0.15;
  
  return Math.min(score, 1.0);
}