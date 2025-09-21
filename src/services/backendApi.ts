// Backend API Service
// Handles communication with the enhanced backend server

const BACKEND_URL = 'http://localhost:3001';

export interface ConversationResponse {
  success: boolean;
  response: string;
  extractedInfo: any;
  knowledgeId: string;
  sessionId: string;
  error?: string;
}

export interface ImageProcessingResponse {
  success: boolean;
  cleanedImages: Array<{
    originalName: string;
    cleanedUrl: string;
    improvements: string[];
    processingTime: number;
  }>;
  imageAnalysis: {
    visualFeatures: string[];
    colors: string[];
    materials: string[];
    style: string;
    quality: string;
    marketingPoints: string[];
  };
  processingTime: number;
  error?: string;
}

export interface ListingResponse {
  success: boolean;
  listing: {
    title: string;
    description: string;
    price: number;
    category: string;
    tags: string[];
    features: string[];
    materials: string[];
    colors: string[];
    techniques: string[];
    culturalSignificance: string;
    targetAudience: string[];
    careInstructions: string[];
    artisanBio: string;
    enhancementMetadata: {
      geminiEnhanced: boolean;
      gemini25FlashProcessed: boolean;
      knowledgeBaseGenerated: boolean;
      conversationTurns: number;
      imageEnhancements: number;
    };
  };
  knowledgeUsed: any;
  error?: string;
}

export interface GeneratedImage {
  index: number;
  originalPrompt: string;
  enhancedPrompt?: string;
  success: boolean;
  imageUrl?: string;
  imageData?: string;
  mimeType?: string;
  style?: string;
  timestamp?: string;
  error?: string;
}

export interface ImageGenerationResponse {
  success: boolean;
  generatedImages: GeneratedImage[];
  failedImages: GeneratedImage[];
  stats: {
    totalRequested: number;
    successful: number;
    failed: number;
    style: string;
    model: string;
  };
  sessionId: string;
  knowledgeId?: string;
  error?: string;
}

export interface EditedImage {
  index: number;
  originalName: string;
  editPrompt: string;
  success: boolean;
  imageUrl?: string;
  imageData?: string;
  mimeType?: string;
  timestamp?: string;
  originalSize?: number;
  editedSize?: number;
  error?: string;
}

export interface ImageEditResponse {
  success: boolean;
  editedImages: EditedImage[];
  failedEdits: EditedImage[];
  stats: {
    totalRequested: number;
    successful: number;
    failed: number;
    model: string;
  };
  sessionId: string;
  knowledgeId?: string;
  error?: string;
}

export interface MarketingImage {
  type: string;
  prompt: string;
  success: boolean;
  imageUrl?: string;
  imageData?: string;
  mimeType?: string;
  timestamp?: string;
  error?: string;
}

export interface MarketingImageResponse {
  success: boolean;
  marketingImages: MarketingImage[];
  failedImages: MarketingImage[];
  stats: {
    totalRequested: number;
    successful: number;
    failed: number;
    types: string[];
    model: string;
  };
  productInfo: any;
  sessionId: string;
  knowledgeId: string;
  error?: string;
}

class BackendApiService {
  // Generate product description from voice note transcript
  async generateDescription(transcript: string): Promise<any> {
    try {
      console.log('📝 Calling backend to generate description from transcript:', transcript.substring(0, 100) + '...');
      console.log('📝 Backend URL:', `${BACKEND_URL}/generate-description`);
      
      const response = await fetch(`${BACKEND_URL}/generate-description`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript }),
      });

      console.log('📝 Backend response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📝 Backend response:', result);
      return result;
    } catch (error) {
      console.error('❌ Error generating description:', error);
      return {
        success: false,
        error: error.message,
        productDescription: {
          productType: 'Handcrafted Item',
          description: 'Beautiful handcrafted piece made with care and attention to detail.',
          materials: ['Traditional materials'],
          techniques: ['Handcrafted'],
          features: ['Unique', 'Handmade', 'Quality craftsmanship'],
          culturalSignificance: 'Made with traditional techniques'
        }
      };
    }
  }

  // Process conversation with Gemini and build knowledge base
  async processConversation(data: {
    sessionId: string;
    userInput: string;
    conversationHistory?: any[];
    stage: string;
  }): Promise<ConversationResponse> {
    try {
      console.log('💬 Sending conversation to backend:', data.stage);
      
      const response = await fetch(`${BACKEND_URL}/process-conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Conversation processed:', result.success);
      
      return result;
    } catch (error) {
      console.error('❌ Conversation processing failed:', error);
      return {
        success: false,
        response: '',
        extractedInfo: {},
        knowledgeId: '',
        sessionId: data.sessionId,
        error: error.message
      };
    }
  }

  // Process images with Gemini 2.5 Flash and analyze with Gemini Vision
  async processImages(data: {
    sessionId: string;
    knowledgeId: string;
    images: File[];
  }): Promise<ImageProcessingResponse> {
    try {
      console.log('🍌 Sending images to backend for processing:', data.images.length, 'images');
      
      const formData = new FormData();
      formData.append('sessionId', data.sessionId);
      formData.append('knowledgeId', data.knowledgeId);
      
      data.images.forEach((image, index) => {
        formData.append('images', image);
      });

      const response = await fetch(`${BACKEND_URL}/process-images`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Images processed:', result.success);
      
      return result;
    } catch (error) {
      console.error('❌ Image processing failed:', error);
      return {
        success: false,
        cleanedImages: [],
        imageAnalysis: {
          visualFeatures: [],
          colors: [],
          materials: [],
          style: '',
          quality: '',
          marketingPoints: []
        },
        processingTime: 0,
        error: error.message
      };
    }
  }

  // Generate final listing from knowledge base
  async generateListing(data: {
    sessionId: string;
    knowledgeId?: string;
  }): Promise<ListingResponse> {
    try {
      console.log('📝 Generating listing from knowledge base');
      
      const response = await fetch(`${BACKEND_URL}/generate-listing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Listing generated:', result.success);
      
      return result;
    } catch (error) {
      console.error('❌ Listing generation failed:', error);
      return {
        success: false,
        listing: {
          title: 'Beautiful Handcrafted Product',
          description: 'Exquisite handcrafted item made with traditional techniques.',
          price: 45.00,
          category: 'Art & Collectibles',
          tags: ['handmade', 'artisan'],
          features: ['Handcrafted with care'],
          materials: ['Traditional materials'],
          colors: ['Natural tones'],
          techniques: ['Traditional crafting'],
          culturalSignificance: 'Authentic artisan tradition',
          targetAudience: ['Art lovers'],
          careInstructions: ['Handle with care'],
          artisanBio: 'Skilled artisan with traditional crafting experience',
          enhancementMetadata: {
            geminiEnhanced: false,
            gemini25FlashProcessed: false,
            knowledgeBaseGenerated: false,
            conversationTurns: 0,
            imageEnhancements: 0
          }
        },
        knowledgeUsed: {},
        error: error.message
      };
    }
  }

  // Get knowledge base statistics
  async getKnowledgeStats(): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/knowledge-stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get knowledge stats:', error);
      return {
        totalEntries: 0,
        totalSessions: 0,
        recentEntries: 0
      };
    }
  }

  // Check backend health
  async checkHealth(): Promise<{ status: string; services: any }> {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Backend health check failed:', error);
      return {
        status: 'error',
        services: {
          gemini: 'unavailable',
          gemini25Flash: 'unavailable',
          knowledgeBase: 'unavailable'
        }
      };
    }
  }

  // Generate product images with Gemini 2.5 Flash
  async generateProductImages(data: {
    sessionId: string;
    knowledgeId?: string;
    prompts: string[];
    style?: 'photorealistic' | 'lifestyle' | 'artistic' | 'minimalist';
    count?: number;
  }): Promise<ImageGenerationResponse> {
    try {
      console.log('🎨 Generating product images with Gemini 2.5 Flash:', data.prompts.length, 'prompts');
      
      const response = await fetch(`${BACKEND_URL}/generate-product-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Images generated:', result.stats?.successful || 0, 'successful');
      
      return result;
    } catch (error) {
      console.error('❌ Image generation failed:', error);
      return {
        success: false,
        generatedImages: [],
        failedImages: [],
        stats: {
          totalRequested: data.prompts.length,
          successful: 0,
          failed: data.prompts.length,
          style: data.style || 'photorealistic',
          model: 'gemini-2.5-flash-image-preview'
        },
        sessionId: data.sessionId,
        knowledgeId: data.knowledgeId,
        error: error.message
      };
    }
  }

  // Edit product images with Gemini 2.5 Flash
  async editProductImages(data: {
    sessionId: string;
    knowledgeId?: string;
    images: File[];
    editPrompts: string | string[];
  }): Promise<ImageEditResponse> {
    try {
      console.log('✏️ Editing product images with Gemini 2.5 Flash:', data.images.length, 'images');
      
      const formData = new FormData();
      formData.append('sessionId', data.sessionId);
      if (data.knowledgeId) {
        formData.append('knowledgeId', data.knowledgeId);
      }
      
      // Handle single or multiple edit prompts
      if (Array.isArray(data.editPrompts)) {
        data.editPrompts.forEach((prompt, index) => {
          formData.append(`editPrompts[${index}]`, prompt);
        });
      } else {
        formData.append('editPrompts', data.editPrompts);
      }
      
      data.images.forEach((image) => {
        formData.append('images', image);
      });

      const response = await fetch(`${BACKEND_URL}/edit-product-images`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Images edited:', result.stats?.successful || 0, 'successful');
      
      return result;
    } catch (error) {
      console.error('❌ Image editing failed:', error);
      return {
        success: false,
        editedImages: [],
        failedEdits: [],
        stats: {
          totalRequested: data.images.length,
          successful: 0,
          failed: data.images.length,
          model: 'gemini-2.5-flash-image-preview'
        },
        sessionId: data.sessionId,
        knowledgeId: data.knowledgeId,
        error: error.message
      };
    }
  }

  // Generate marketing images from product knowledge
  async generateMarketingImages(data: {
    sessionId: string;
    knowledgeId: string;
    imageTypes?: string[];
  }): Promise<MarketingImageResponse> {
    try {
      console.log('📸 Generating marketing images from knowledge base');
      
      const response = await fetch(`${BACKEND_URL}/generate-marketing-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Marketing images generated:', result.stats?.successful || 0, 'successful');
      
      return result;
    } catch (error) {
      console.error('❌ Marketing image generation failed:', error);
      return {
        success: false,
        marketingImages: [],
        failedImages: [],
        stats: {
          totalRequested: 0,
          successful: 0,
          failed: 0,
          types: data.imageTypes || [],
          model: 'gemini-2.5-flash-image-preview'
        },
        productInfo: {},
        sessionId: data.sessionId,
        knowledgeId: data.knowledgeId,
        error: error.message
      };
    }
  }

  // Test backend connection
  async testConnection(): Promise<{ success: boolean; message: string; endpoints?: string[] }> {
    try {
      console.log('🔗 Testing backend connection...');
      const response = await fetch(`${BACKEND_URL}/test`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Backend connection successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Backend connection test failed:', error);
      return {
        success: false,
        message: `Connection failed: ${error.message}. Make sure backend is running on ${BACKEND_URL}`
      };
    }
  }
}

// Export singleton instance
export const backendApi = new BackendApiService();

export default BackendApiService;