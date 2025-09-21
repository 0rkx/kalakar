// src/services/api.ts

import { httpsCallable } from 'firebase/functions';
import { functions, isFirebaseConfigured } from '../firebase';
import { ProductListing, UploadedPhoto, ConversationData, Language } from '../types';

// Helper function to handle API calls
const callFirebaseFunction = async (functionName: string, data: any) => {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase is not configured. Using mock data for development.');
    // Return mock responses for development
    return getMockResponse(functionName, data);
  }

  try {
    const func = httpsCallable(functions, functionName);
    const response = await func(data);
    return response.data;
  } catch (error) {
    console.error(`Error calling ${functionName}:`, error);
    throw error;
  }
};

// Mock responses for development
const getMockResponse = (functionName: string, data: any) => {
  switch (functionName) {
    case 'processUserSpeech':
      return {
        success: true,
        transcript: data.mockTranscript || 'I made a beautiful ceramic vase using traditional techniques',
        confidence: 0.95,
        extractedInfo: {
          productType: 'ceramic vase',
          materials: ['clay', 'glaze'],
          colors: ['blue', 'white'],
          techniques: ['wheel throwing']
        },
        processingTime: 1200
      };
    case 'generateAISpeech':
      return {
        success: true,
        audioBlob: new Blob(['mock tts audio'], { type: 'audio/wav' }),
        duration: 2.5,
        processingTime: 800
      };
    case 'manageConversation':
      if (data.action === 'start') {
        return {
          success: true,
          question: 'Hello! I\'m excited to help you create a beautiful listing for your handmade product. Can you start by telling me what you\'ve made?',
          conversationId: 'mock-conv-' + Date.now(),
          stage: 'INTRODUCTION'
        };
      } else if (data.action === 'continue') {
        return {
          success: true,
          question: 'That sounds wonderful! Can you tell me more about the materials you used to make this?',
          conversationId: data.conversationId,
          stage: 'BASIC_INFO'
        };
      }
      return { success: true };
    case 'generateFollowUpQuestion':
      return {
        success: true,
        question: 'What inspired you to create this particular design?',
        questionType: 'cultural_significance',
        stage: 'CULTURAL_SIGNIFICANCE'
      };
    case 'extractProductInfo':
      return {
        success: true,
        extractedInfo: {
          productType: 'ceramic bowl',
          materials: ['clay', 'natural glaze'],
          colors: ['earth tones', 'brown'],
          craftingProcess: 'hand-thrown on pottery wheel',
          culturalSignificance: 'traditional Indian pottery techniques',
          pricing: { cost: 1500, currency: 'INR' },
          uniqueFeatures: ['handmade', 'food-safe', 'microwave-safe']
        },
        completionScore: 0.85
      };
    case 'processVoiceDescription':
      return { transcript: 'This is a beautiful handcrafted wooden bowl made from sustainable teak wood.' };
    case 'analyzeProductPhotos':
      const hasConversationContext = data.conversationContext && data.conversationContext.extractedInfo;
      return {
        analysis: hasConversationContext 
          ? `Enhanced analysis using conversation context: ${data.conversationContext.extractedInfo.productType || 'product'} with ${data.conversationContext.extractedInfo.materials?.join(', ') || 'materials'}`
          : 'Beautiful wooden bowl with smooth finish and natural grain patterns',
        colors: hasConversationContext ? data.conversationContext.extractedInfo.colors || ['brown', 'natural wood'] : ['brown', 'natural wood'],
        materials: hasConversationContext ? data.conversationContext.extractedInfo.materials || ['teak wood'] : ['teak wood'],
        style: 'handcrafted',
        conversationContextUsed: hasConversationContext
      };
    case 'generateListing':
      const hasConversationData = data.conversationContext && data.conversationContext.extractedInfo;
      const productInfo = hasConversationData ? data.conversationContext.extractedInfo : {};
      
      // Note: Enhanced listing generation now handled by backend
      
      return {
        listing: {
          title: hasConversationData 
            ? `Handcrafted ${productInfo.productType || 'Artisan Product'} - ${productInfo.materials?.join(' & ') || 'Traditional Materials'}`
            : 'Handcrafted Teak Wood Bowl - Sustainable Artisan Made',
          description: hasConversationData
            ? `Beautiful ${productInfo.productType || 'handcrafted item'} made from ${productInfo.materials?.join(', ') || 'traditional materials'}. ${productInfo.culturalSignificance || 'Perfect for home decoration.'} Crafted using ${productInfo.craftingProcess || 'traditional techniques'}.`
            : 'Beautiful handcrafted wooden bowl made from sustainable teak wood. Perfect for serving or decoration.',
          price: hasConversationData && productInfo.pricing ? productInfo.pricing.cost : 45.00,
          tags: hasConversationData 
            ? ['handcrafted', productInfo.productType?.toLowerCase(), ...(productInfo.materials || []), ...(productInfo.colors || []), 'artisan']
            : ['handcrafted', 'wooden bowl', 'teak', 'sustainable', 'artisan'],
          features: hasConversationData
            ? [
                `Made from ${productInfo.materials?.join(', ') || 'quality materials'}`,
                `Handcrafted using ${productInfo.craftingProcess || 'traditional techniques'}`,
                `Features ${productInfo.colors?.join(', ') || 'beautiful colors'}`,
                ...(productInfo.uniqueFeatures || ['Perfect for home decoration'])
              ]
            : [
                'Made from sustainable teak wood',
                'Handcrafted by skilled artisans',
                'Smooth natural finish',
                'Perfect for serving or decoration'
              ],
          artisanBio: 'Created by skilled artisans who have been working with traditional crafts for generations.',
          category: 'Home & Kitchen',
          conversationContextUsed: hasConversationData
        }
      };
    case 'exportToMarketplace':
      const hasConversationEnhancement = data.conversationData && data.conversationData.extractedInfo;
      return { 
        success: true, 
        exportId: 'mock-export-123',
        results: {
          etsy: {
            success: true,
            platform: 'etsy',
            listingId: 'etsy_mock_123',
            url: 'https://etsy.com/listing/mock_123',
            message: hasConversationEnhancement 
              ? 'Successfully exported to Etsy with rich conversation insights (mock)'
              : 'Successfully exported to Etsy (mock)',
            enhancedFeatures: hasConversationEnhancement ? {
              conversationEnhanced: true,
              culturalTags: 3,
              storyElements: 4,
              personalizedDescription: true,
              conversationInsights: 8,
              artisanStoryIncluded: true,
              culturalContextIncluded: true
            } : {}
          },
          amazon: {
            success: true,
            platform: 'amazon',
            asin: 'ASIN_mock_123',
            sku: 'ARTISAN_mock_123',
            message: hasConversationEnhancement
              ? 'Successfully exported to Amazon with comprehensive conversation insights (mock)'
              : 'Successfully exported to Amazon (mock)',
            enhancedFeatures: hasConversationEnhancement ? {
              conversationEnhanced: true,
              qualityIndicators: 4,
              technicalSpecs: 6,
              productAttributes: 7,
              targetAudienceOptimized: true,
              culturalContextIncluded: true
            } : {}
          },
          whatsapp: {
            success: true,
            platform: 'whatsapp',
            catalogId: 'WA_mock_123',
            shareableMessage: hasConversationEnhancement
              ? '🎨 *Handcrafted Traditional Bowl* 🎨\n\nBeautiful handcrafted item made from traditional materials...\n\n👨‍🎨 *About the Artisan:* Passionate craftsperson who loves sharing...\n\n📍 *Crafted in:* India\n💰 *Price:* ₹2000\n\n📱 *Message us to bring this beautiful piece home!*'
              : '🎨 *Handcrafted Product* 🎨\n\nBeautiful handcrafted item...\n\n📱 *Message us for details!*',
            message: hasConversationEnhancement
              ? 'Successfully prepared for WhatsApp Business with rich conversation insights'
              : 'Successfully prepared for WhatsApp Business sharing',
            enhancedFeatures: hasConversationEnhancement ? {
              conversationEnhanced: true,
              personalizedMessage: true,
              artisanStory: true,
              culturalContext: true,
              multipleMessageOptions: 6,
              customizationOptionsIncluded: true
            } : {}
          }
        },
        conversationEnhanced: hasConversationEnhancement,
        enhancementMetrics: hasConversationEnhancement ? {
          conversationDataUsed: true,
          totalConversationTurns: data.conversationData.turns?.length || 0,
          extractedFieldsCount: Object.keys(data.conversationData.extractedInfo || {}).length,
          personalizedElementsAdded: 5,
          culturalElementsAdded: 3,
          platformVariationsGenerated: 3,
          conversationRichnessScore: 0.85
        } : {}
      };
    case 'generateConversationExportReport':
      return {
        success: true,
        report: {
          exportSummary: {
            exportId: data.exportId,
            exportedAt: new Date().toISOString(),
            platforms: ['etsy', 'amazon', 'whatsapp'],
            successfulExports: 3,
            totalPlatforms: 3
          },
          conversationEnhancements: data.conversationData ? {
            conversationId: data.conversationData.id || 'mock-conversation-123',
            totalTurns: data.conversationData.turns?.length || 12,
            extractedFields: Object.keys(data.conversationData.extractedInfo || {}).length || 8,
            conversationLanguage: data.conversationData.language || 'English',
            qualityScore: 0.85,
            personalizedElements: 5,
            culturalElements: 3
          } : null,
          platformSpecificEnhancements: {
            etsy: {
              exportSuccess: true,
              enhancementsApplied: {
                conversationEnhanced: true,
                artisanStoryIncluded: true,
                culturalContextIncluded: true
              },
              conversationDataUsed: !!data.conversationData,
              platformSpecificOptimizations: 6
            },
            amazon: {
              exportSuccess: true,
              enhancementsApplied: {
                conversationEnhanced: true,
                qualityIndicators: 4,
                technicalSpecs: 6
              },
              conversationDataUsed: !!data.conversationData,
              platformSpecificOptimizations: 7
            },
            whatsapp: {
              exportSuccess: true,
              enhancementsApplied: {
                conversationEnhanced: true,
                personalizedMessage: true,
                artisanStory: true
              },
              conversationDataUsed: !!data.conversationData,
              platformSpecificOptimizations: 6
            }
          },
          marketplaceOptimizations: {
            etsy: {
              storyDrivenContent: true,
              culturalAuthenticity: true,
              personalizedDescription: true,
              optimizationScore: 0.9
            },
            amazon: {
              qualityIndicators: 4,
              technicalSpecs: 6,
              targetAudienceOptimized: true,
              optimizationScore: 0.85
            },
            whatsapp: {
              personalizedMessaging: true,
              artisanStoryIncluded: true,
              culturalContextIncluded: true,
              optimizationScore: 0.88
            }
          },
          conversationInsights: data.conversationData ? {
            artisanPersonality: 'Passionate artisan who loves sharing the intricacies of their craft and cultural heritage.',
            culturalContext: 'Indian artisan tradition with deep cultural roots and traditional craftsmanship techniques.',
            productStoryElements: ['Personalized Artisan Story', 'Cultural Heritage Story', 'Traditional Crafting Process'],
            marketingHighlights: [
              'Cultural Heritage: Traditional craft with deep cultural significance',
              'Crafting Process: Handmade using time-honored techniques',
              'Unique Features: Authentic materials and cultural motifs'
            ]
          } : null,
          recommendations: [
            'Leverage cultural significance more prominently across all platforms',
            'Consider adding more personal artisan story elements for better engagement',
            'Include target audience information for better platform visibility'
          ],
          generatedAt: new Date().toISOString()
        }
      };
    case 'improveProductPhotos':
      return { improvedPhoto: data.photo };
    case 'generatePersonalizedArtisanBio':
      const artisanName = data.userProfile?.name || 'Skilled Artisan';
      const location = data.userProfile?.location || 'India';
      const productType = data.conversationContext?.extractedInfo?.productType || 'handcrafted items';
      
      return {
        personalizedBio: `Hi, I'm ${artisanName} from ${location}! I've been passionate about creating beautiful ${productType} for many years. Each piece I make tells a story of traditional craftsmanship passed down through generations. I love working with natural materials and incorporating cultural elements that reflect our rich heritage. When you purchase one of my creations, you're not just buying a product - you're supporting traditional artistry and bringing a piece of authentic Indian culture into your home.`,
        personalityInsights: 'Passionate artisan who loves sharing the intricacies of their craft and cultural heritage.',
        culturalElements: `${location} craftsmanship tradition with emphasis on traditional techniques and cultural storytelling.`,
        conversationMetadata: {
          totalTurns: data.conversationContext?.turns?.length || 0,
          responseCount: data.conversationContext?.turns?.filter((t: any) => t.type === 'user_response')?.length || 0,
          personalityScore: 0.8
        },
        success: true
      };
    case 'generateMarketplaceVariations':
      const baseTitle = data.baseListing?.title || 'Handcrafted Artisan Product';
      const baseDescription = data.baseListing?.description || 'Beautiful handcrafted item';
      
      return {
        variations: {
          etsy: {
            title: `${baseTitle} - Handmade with Love`,
            description: `${baseDescription}\n\n🎨 ARTISAN STORY:\nThis beautiful piece is handcrafted with traditional techniques passed down through generations. Each item is unique and tells a story of cultural heritage and artistic passion.\n\n🏛️ CULTURAL HERITAGE:\nRooted in authentic Indian craftsmanship traditions, this piece represents the rich artistic legacy of our artisans.`,
            platformOptimized: true
          },
          amazon: {
            title: `${baseTitle} - Premium Quality Handcrafted`,
            description: `${baseDescription}\n\nQUALITY ASSURANCE:\n• Handcrafted using traditional techniques\n• Premium materials sourced responsibly\n• Detailed artisan consultation\n\nSPECIFICATIONS:\nMaterials: Traditional handcrafted materials\nOrigin: India\nQuality: Premium artisan grade`,
            platformOptimized: true
          },
          whatsapp: {
            title: `🎨 ${baseTitle} 🎨`,
            description: `${baseDescription.substring(0, 120)}...\n\n✨ Handcrafted Features:\n• Made with traditional techniques\n• Authentic Indian craftsmanship\n• Unique cultural design\n\n📍 Crafted in: India\n💰 Price: Contact for details\n\n📱 Message us to bring this beautiful piece home!\n\n#HandmadeInIndia #ArtisanCrafts #TraditionalCraft`,
            platformOptimized: true
          },
          instagram: {
            title: baseTitle,
            description: `${baseDescription.substring(0, 150)}... ✨\n\n#HandmadeInIndia #ArtisanCrafts #TraditionalArt #CulturalHeritage #HandcraftedWithLove #IndianArtisan #AuthenticCraft #SustainableArt #TraditionalTechniques #ArtisanMade`,
            platformOptimized: true
          }
        },
        conversationEnhanced: true,
        platformsGenerated: data.targetPlatforms || ['etsy', 'amazon', 'whatsapp', 'instagram'],
        success: true
      };
    case 'generateSocialContent':
      return {
        success: true,
        socialContent: {
          socialPosts: [
            "🎨 Just finished creating this beautiful handcrafted piece! Each item tells a story of tradition and passion. #HandmadeInIndia #ArtisanCrafts",
            "✨ From my hands to your home - authentic Indian craftsmanship with love and care. #TraditionalArt #HandcraftedWithLove",
            "🏛️ Preserving centuries-old techniques in every piece I create. Supporting traditional artistry one craft at a time. #CulturalHeritage"
          ],
          shortAds: [
            "🎯 Unique handcrafted items - Made with traditional techniques, delivered with modern convenience!",
            "💎 Authentic Indian craftsmanship - Each piece is one-of-a-kind, just like you!",
            "🌟 Support local artisans - Bring home a piece of cultural heritage today!"
          ],
          storySnippets: [
            "Behind every piece is a story of dedication, skill, and cultural pride...",
            "Using techniques passed down through generations, I create items that connect past and present...",
            "Each creation is a labor of love, crafted with the finest materials and traditional methods..."
          ]
        }
      };
    case 'chatWithArtisanAssistant':
      return {
        success: true,
        response: "Hello! I'm here to help you with your artisan journey. How can I assist you today?",
        conversationId: 'chat-' + Date.now()
      };
    default:
      return { success: true };
  }
};

/**
 * Processes the audio recording of the product description using Gemini.
 * @param audioBlob The audio data as a Blob.
 * @param languageCode The language of the audio.
 * @returns A promise that resolves with the transcript of the audio.
 */
export const processVoiceDescription = async (audioBlob: Blob, languageCode: string): Promise<string> => {
  try {
    console.log('🎤 Sending audio to backend for Gemini processing...', {
      audioSize: audioBlob.size,
      audioType: audioBlob.type,
      language: languageCode
    });
    
    // Create FormData to send audio file to backend
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('language', languageCode);
    
    const response = await fetch('http://localhost:3001/process-speech', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('🧠 Backend Gemini processing result:', {
      success: result.success,
      geminiProcessed: result.geminiProcessed,
      fallbackUsed: result.fallbackUsed,
      transcriptLength: result.transcript?.length || 0
    });
    
    if (result.success) {
      return result.transcript || 'I made a beautiful handcrafted item using traditional techniques.';
    } else {
      throw new Error(result.error || 'Speech processing failed');
    }
  } catch (error) {
    console.error('❌ Backend Gemini speech processing failed:', error);
    
    // Fallback to mock response for development
    console.log('🔄 Using client-side fallback mock response...');
    return 'I made a beautiful handcrafted ceramic bowl using traditional pottery techniques with natural clay and glazes.';
  }
};

/**
 * Analyzes the uploaded product photos.
 * @param photos An array of photo files.
 * @param conversationData Optional conversation data to provide context for photo analysis.
 * @returns A promise that resolves with the analysis of the photos.
 */
export const analyzeProductPhotos = async (photos: File[], conversationData?: any): Promise<any> => {
  console.log('📸 Analyzing photos with conversation context:', {
    photoCount: photos.length,
    hasConversationData: !!conversationData,
    productType: conversationData?.extractedInfo?.productType,
    materials: conversationData?.extractedInfo?.materials
  });

  const photoPromises = photos.map(photo => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        name: photo.name,
        type: photo.type,
        data: reader.result
      });
      reader.onerror = reject;
      reader.readAsDataURL(photo);
    });
  });

  const photoData = await Promise.all(photoPromises);

  return callFirebaseFunction('analyzeProductPhotos', { 
    photos: photoData,
    conversationContext: conversationData 
  });
};


/**
 * Generates a product listing based on the transcript and photo analysis.
 * @param transcript The transcript of the product description.
 * @param photoAnalysis The analysis of the product photos.
 * @param conversationData Optional rich conversation data to enhance listing generation.
 * @returns A promise that resolves with the generated product listing.
 */
export const generateListing = async (transcript: string, photoAnalysis: any, conversationData?: any): Promise<ProductListing> => {
  console.log('📝 Generating listing with conversation context:', {
    hasTranscript: !!transcript,
    hasPhotoAnalysis: !!photoAnalysis,
    hasConversationData: !!conversationData,
    conversationTurns: conversationData?.turns?.length || 0,
    extractedProductType: conversationData?.extractedInfo?.productType
  });

  const response: any = await callFirebaseFunction('generateListing', { 
    transcript, 
    photoAnalysis,
    conversationContext: conversationData 
  });
  return response.listing;
};

/**
 * Exports the product listing to marketplaces with conversation enhancement.
 * @param listing The product listing to export.
 * @param platforms The platforms to export to.
 * @param userPreferences User preferences for export.
 * @param conversationData Optional conversation data for enhancement.
 * @param userProfile Optional user profile for personalization.
 * @returns A promise that resolves when the export is complete.
 */
export const exportToMarketplace = async (
  listing: ProductListing, 
  platforms?: string[], 
  userPreferences?: any,
  conversationData?: any,
  userProfile?: any
): Promise<any> => {
  console.log('🚀 Exporting to marketplace with conversation enhancement:', {
    hasListing: !!listing,
    platforms: platforms || ['etsy', 'amazon', 'whatsapp'],
    hasConversationData: !!conversationData,
    hasUserProfile: !!userProfile,
    conversationTurns: conversationData?.turns?.length || 0,
    extractedFields: conversationData?.extractedInfo ? Object.keys(conversationData.extractedInfo).length : 0
  });

  return callFirebaseFunction('exportToMarketplace', { 
    listing, 
    platforms, 
    userPreferences,
    conversationData,
    userProfile
  });
};

/**
 * Generates a comprehensive export report with conversation insights.
 * @param exportId The ID of the export to generate a report for.
 * @param conversationData The conversation data used in the export.
 * @param userProfile The user profile information.
 * @returns A promise that resolves with the export report.
 */
export const generateConversationExportReport = async (
  exportId: string,
  conversationData?: any,
  userProfile?: any
): Promise<any> => {
  console.log('📊 Generating conversation export report:', {
    exportId,
    hasConversationData: !!conversationData,
    hasUserProfile: !!userProfile
  });

  return callFirebaseFunction('generateConversationExportReport', {
    exportId,
    conversationData,
    userProfile
  });
};

/**
 * Improves a single product photo using local backend.
 * @param photo The photo to improve.
 * @returns A promise that resolves with the improved photo.
 */
export const improvePhoto = async (photo: UploadedPhoto): Promise<UploadedPhoto> => {
  try {
    console.log('🍌 Improving photo with local backend...');
    
    // Create FormData to send image file
    const formData = new FormData();
    formData.append('images', photo.file);
    formData.append('sessionId', 'photo-improve-session');
    formData.append('knowledgeId', 'photo-improve-knowledge');
    
    const response = await fetch('http://localhost:3001/process-images', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.cleanedImages && result.cleanedImages[0]) {
      const cleanedImage = result.cleanedImages[0];
      return {
        ...photo,
        dataUrl: cleanedImage.cleanedUrl || photo.dataUrl,
        isImproved: cleanedImage.success,
        originalDataUrl: photo.dataUrl
      };
    } else {
      throw new Error(result.error || 'Image improvement failed');
    }
  } catch (error) {
    console.error('❌ Local backend photo improvement failed:', error);
    
    // Return original photo as fallback
    return {
      ...photo,
      isImproved: false
    };
  }
};

/**
 * Generates a personalized artisan bio based on conversation data.
 * @param conversationData The conversation context with artisan responses.
 * @param userProfile The user profile information.
 * @param productInfo The extracted product information.
 * @returns A promise that resolves with the personalized bio.
 */
export const generatePersonalizedArtisanBio = async (
  conversationData: any, 
  userProfile: any, 
  productInfo: any
): Promise<any> => {
  console.log('👨‍🎨 Generating personalized artisan bio:', {
    hasConversationData: !!conversationData,
    hasUserProfile: !!userProfile,
    artisanName: userProfile?.name,
    location: userProfile?.location,
    conversationTurns: conversationData?.turns?.length || 0
  });

  return callFirebaseFunction('generatePersonalizedArtisanBio', {
    conversationContext: conversationData,
    userProfile,
    productInfo
  });
};

/**
 * Generates marketplace-specific variations of a listing using conversation insights.
 * @param baseListing The base product listing.
 * @param conversationData The conversation context.
 * @param userProfile The user profile information.
 * @param targetPlatforms The platforms to generate variations for.
 * @returns A promise that resolves with platform-specific variations.
 */
export const generateMarketplaceVariations = async (
  baseListing: any,
  conversationData: any,
  userProfile: any,
  targetPlatforms?: string[]
): Promise<any> => {
  console.log('🏪 Generating marketplace variations:', {
    hasBaseListing: !!baseListing,
    hasConversationData: !!conversationData,
    platforms: targetPlatforms || ['etsy', 'amazon', 'whatsapp', 'instagram'],
    conversationTurns: conversationData?.turns?.length || 0
  });

  return callFirebaseFunction('generateMarketplaceVariations', {
    baseListing,
    conversationContext: conversationData,
    userProfile,
    targetPlatforms
  });
};

/**
 * Processes user speech input and extracts product information.
 * @param audioBlob The audio data from user speech.
 * @param language The language of the speech.
 * @param conversationId Optional conversation ID for context.
 * @returns A promise that resolves with speech processing results.
 */
export const processUserSpeech = async (data: {
  audioBlob: Blob;
  language: Language;
  conversationId?: string;
  attempt?: number;
  timeout?: number;
  enableProgressiveLoading?: boolean;
  onProgress?: (update: any) => void;
  deviceConfig?: any;
  enableEnhancement?: boolean;
  networkCondition?: string;
  audioId?: string;
  simulateError?: boolean;
}): Promise<any> => {
  console.log('🎤 Processing user speech:', {
    language: data.language,
    conversationId: data.conversationId,
    hasAudio: !!data.audioBlob,
    audioSize: data.audioBlob?.size
  });

  // Convert Blob to base64 for transmission
  const reader = new FileReader();
  const base64Audio = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(data.audioBlob);
  });

  return callFirebaseFunction('processUserSpeech', {
    audio: base64Audio,
    language: data.language,
    conversationId: data.conversationId,
    ...data
  });
};

/**
 * Generates AI speech from text.
 * @param text The text to convert to speech.
 * @param language The target language for speech.
 * @param voice Optional voice preference.
 * @returns A promise that resolves with generated audio.
 */
export const generateAISpeech = async (data: {
  text: string;
  language: Language;
  voice?: string;
}): Promise<any> => {
  console.log('🔊 Generating AI speech:', {
    textLength: data.text.length,
    language: data.language,
    voice: data.voice
  });

  return callFirebaseFunction('generateAISpeech', data);
};

/**
 * Manages conversation flow and generates appropriate responses.
 * @param data Conversation management parameters.
 * @returns A promise that resolves with conversation response.
 */
export const manageConversation = async (data: {
  action: 'start' | 'continue' | 'complete' | 'process_text_input' | 'check_network';
  language?: Language;
  userId?: string;
  conversationId?: string;
  userResponse?: string;
  currentStage?: string;
  textInput?: string;
  detectedLanguage?: string;
  conversationData?: ConversationData;
  operationId?: string;
  batchId?: number;
  requestId?: number;
  testIndex?: number;
  adaptToConnection?: boolean;
  preferredMode?: string;
  callNumber?: number;
}): Promise<any> => {
  console.log('💬 Managing conversation:', {
    action: data.action,
    language: data.language,
    conversationId: data.conversationId,
    hasUserResponse: !!data.userResponse
  });

  return callFirebaseFunction('manageConversation', data);
};

/**
 * Generates follow-up questions based on conversation context.
 * @param context The conversation context for question generation.
 * @returns A promise that resolves with generated question.
 */
export const generateFollowUpQuestion = async (context: {
  conversationId: string;
  currentInfo: any;
  missingFields: string[];
  lastUserResponse: string;
  questionHistory: string[];
  conversationStage: string;
}): Promise<any> => {
  console.log('❓ Generating follow-up question:', {
    conversationId: context.conversationId,
    stage: context.conversationStage,
    missingFields: context.missingFields?.length || 0
  });

  return callFirebaseFunction('generateFollowUpQuestion', context);
};

/**
 * Extracts structured product information from conversation.
 * @param conversationData The conversation data to analyze.
 * @returns A promise that resolves with extracted product information.
 */
export const extractProductInfo = async (conversationData: ConversationData): Promise<any> => {
  console.log('📊 Extracting product info:', {
    conversationId: conversationData.id,
    turns: conversationData.turns?.length || 0,
    language: conversationData.language
  });

  return callFirebaseFunction('extractProductInfo', { conversationData });
};

/**
 * Generates social media content from user's craft story.
 * @param userId The user ID to generate content for.
 * @returns A promise that resolves with generated social content.
 */
export const generateSocialContent = async (userId: string): Promise<any> => {
  console.log('📱 Generating social content for user:', userId);

  return callFirebaseFunction('generateSocialContent', { userId });
};

/**
 * Chat with the artisan assistant.
 * @param message The message to send to the assistant.
 * @param conversationHistory Optional conversation history.
 * @returns A promise that resolves with the assistant's response.
 */
export const chatWithArtisanAssistant = async (message: string, conversationHistory?: any[]): Promise<any> => {
  console.log('💬 Chatting with artisan assistant:', message);

  return callFirebaseFunction('chatWithArtisanAssistant', { message, conversationHistory });
};
