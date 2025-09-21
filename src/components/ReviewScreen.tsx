import React, { useEffect } from 'react';
import { UploadedPhoto, ProductListing } from '../types';

interface ReviewScreenProps {
  uploadedPhotos: UploadedPhoto[];
  generatedListing: ProductListing | null;
  userName: string;
  isGenerating?: boolean;
  conversationData?: any;
  productDescription?: any;
  transcript?: string;
  onBack: () => void;
  onExport: () => void;
  onGenerateListing?: () => void;
}

const ReviewScreen: React.FC<ReviewScreenProps> = ({
  uploadedPhotos,
  generatedListing,
  userName,
  isGenerating = false,
  conversationData,
  productDescription,
  transcript,
  onBack,
  onExport,
  onGenerateListing
}) => {
  console.log('🔍 ReviewScreen received:', { productDescription, transcript });
  const playAudio = (type: string) => {
    console.log(`Playing audio for: ${type}`);
  };

  // No useEffect needed - we use productDescription from voice note directly

  // Create detailed features from product description
  const getFeatures = () => {
    if (productDescription) {
      console.log('📋 Using detailed product description for features:', productDescription);
      
      // Use the comprehensive features from the backend
      let features = [];
      
      // Add product type as first feature
      if (productDescription.productType) {
        features.push(productDescription.productType);
      }
      
      // Add specific features from backend
      if (productDescription.features && productDescription.features.length > 0) {
        features.push(...productDescription.features.slice(0, 4)); // Take first 4 detailed features
      }
      
      // Add cultural significance if available
      if (productDescription.culturalSignificance) {
        features.push(productDescription.culturalSignificance);
      }
      
      // Add quality indicators
      if (productDescription.qualityIndicators && productDescription.qualityIndicators.length > 0) {
        features.push(...productDescription.qualityIndicators.slice(0, 2));
      }
      
      // Add unique aspects
      if (productDescription.uniqueAspects && productDescription.uniqueAspects.length > 0) {
        features.push(...productDescription.uniqueAspects.slice(0, 2));
      }
      
      // Ensure we have at least 5-6 features for a rich preview
      if (features.length < 5) {
        // Add materials and techniques as backup
        if (productDescription.materials && productDescription.materials.length > 0) {
          features.push(`Materials: ${productDescription.materials.join(', ')}`);
        }
        if (productDescription.techniques && productDescription.techniques.length > 0) {
          features.push(`Techniques: ${productDescription.techniques.join(', ')}`);
        }
      }
      
      return features.slice(0, 6); // Limit to 6 features for clean display
    }
    
    // If we have transcript but no productDescription, create basic features from transcript
    if (transcript) {
      console.log('📋 Creating features from transcript:', transcript);
      const words = transcript.toLowerCase();
      let features = [];
      
      // Extract product type from transcript
      if (words.includes('ceramic') || words.includes('pottery')) {
        features.push('Traditional handcrafted ceramic pottery');
      } else if (words.includes('textile') || words.includes('fabric')) {
        features.push('Handwoven traditional textile');
      } else if (words.includes('wood') || words.includes('carved')) {
        features.push('Hand-carved wooden artisan piece');
      } else {
        features.push('Beautiful handcrafted artisan product');
      }
      
      // Add materials/location mentioned
      if (words.includes('ganga') || words.includes('river')) {
        features.push('Made with sacred Ganga river clay');
        features.push('Spiritual and cultural significance');
      } else if (words.includes('jabalpur')) {
        features.push('Crafted by Jabalpur artisans');
        features.push('Regional traditional craftsmanship');
      } else if (words.includes('clay')) {
        features.push('Natural clay construction');
      } else if (words.includes('cotton')) {
        features.push('Pure cotton material');
      } else if (words.includes('wood')) {
        features.push('Quality wood construction');
      } else {
        features.push('Premium traditional materials');
      }
      
      // Add technique/quality
      if (words.includes('high quality')) {
        features.push('Artisan-verified high quality');
        features.push('Superior craftsmanship standards');
      } else if (words.includes('traditional')) {
        features.push('Ancient traditional techniques');
        features.push('Cultural heritage preservation');
      } else if (words.includes('small artist')) {
        features.push('Small artisan handmade');
        features.push('Personal attention to detail');
      } else {
        features.push('Skilled artisan craftsmanship');
        features.push('Traditional handcrafting methods');
      }
      
      return features.slice(0, 6);
    }
    
    // Enhanced fallback with more detail
    return [
      'Beautiful handcrafted artisan product',
      'Made with premium traditional materials', 
      'Time-honored crafting techniques',
      'Unique one-of-a-kind design',
      'High quality artisan craftsmanship',
      'Cultural heritage and authenticity'
    ];
  };

  const platforms = [
    {
      name: 'Etsy',
      image: uploadedPhotos[0]?.dataUrl,
      features: getFeatures()
    },
    {
      name: 'Amazon',
      image: uploadedPhotos[1]?.dataUrl || uploadedPhotos[0]?.dataUrl,
      features: getFeatures()
    },
    {
      name: 'WhatsApp',
      image: uploadedPhotos[2]?.dataUrl || uploadedPhotos[0]?.dataUrl,
      features: getFeatures()
    }
  ];

  return (
    <div className="relative flex h-full w-full flex-col bg-background-main">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          position: absolute;
          right: -12px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
          background-clip: content-box;
        }
        .scrollbar-outside {
          margin-right: -12px;
          padding-right: 12px;
        }
      `}</style>
      
      <button 
        className="absolute top-4 left-4 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-background-main/80 backdrop-blur-sm hover:bg-background-light transition-colors shadow-sm"
        onClick={onBack}
      >
        <span className="material-symbols-outlined text-primary-text text-lg">arrow_back</span>
      </button>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar scrollbar-outside" style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 transparent'
      }}>
        <div className="px-lg pt-8">
          <div className="space-y-md text-center">
            <h1 className="text-primary-text text-2xl font-bold leading-tight">Review</h1>
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center gap-sm">
                <button onClick={() => playAudio('review-instruction')}>
                  <span className="material-symbols-outlined text-2xl text-secondary-text">volume_up</span>
                </button>
                <p className="text-secondary-text text-sm">Swipe left or right to review your listings.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-lg py-8">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-brand mb-4"></div>
              <h3 className="text-primary-text text-lg font-semibold mb-2">Generating your listing...</h3>
              <p className="text-secondary-text text-sm text-center">
                Our AI is analyzing your photos and creating personalized listings for different platforms.
              </p>
            </div>
          ) : (
            <div className="flex overflow-x-auto snap-x snap-mandatory [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-full gap-md">
              {platforms.map((platform, index) => (
                <div key={platform.name} className="flex-shrink-0 w-full snap-center">
                  <div className="flex flex-col gap-sm rounded-lg">
                    <div 
                      className="w-full bg-center bg-no-repeat aspect-square bg-cover rounded-xl"
                      style={{backgroundImage: `url(${platform.image})`}}
                    ></div>
                    <div>
                      <h3 className="text-primary-text text-lg font-bold leading-tight">{platform.name} Preview</h3>
                      <ul className="mt-sm space-y-xs text-secondary-text text-sm">
                        {platform.features.map((feature, idx) => (
                          <li key={idx}>• {feature}</li>
                        ))}
                      </ul>
                      {productDescription?.description && (
                        <p className="mt-sm text-secondary-text text-xs">
                          {productDescription.description}
                        </p>
                      )}
                      <p className="mt-sm text-secondary-text text-xs italic">
                        By {userName}, {productDescription?.artisanStory || 'a skilled local artisan specializing in traditional handcrafted products'}.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>
      
      <div className="flex-shrink-0 bg-background-main/80 backdrop-blur-sm border-t border-border-color">
        <div className="p-md pb-lg">
          <div className="flex items-center justify-center mb-md">
            <div className="flex flex-col items-center gap-xs">
              <button onClick={() => playAudio('export-instruction')}>
                <span className="material-symbols-outlined text-xl text-secondary-text">volume_up</span>
              </button>
              <p className="text-secondary-text text-xs">Choose your export platform</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-sm">
            <button 
              className="flex flex-col items-center gap-xs py-sm text-center transition-colors duration-200 rounded-lg hover:bg-background-light"
              onClick={onExport}
            >
              <div className="rounded-full bg-background-light p-sm">
                <svg className="w-5 h-5" fill="none" height="20" stroke="var(--primary-brand)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2a10 10 0 0 0-3.38 19.34c.5.09.68-.22.68-.49v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.63-1.34-2.25-.26-4.62-1.12-4.62-5 0-1.11.39-2.01.99-2.72-.1-.26-.43-1.28.1-2.68 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.8c.85 0 1.7.11 2.5.34 1.91-1.29 2.75-1.02 2.75-1.02.53 1.4.2 2.42.1 2.68.6.71.99 1.61.99 2.72 0 3.89-2.37 4.74-4.64 5a3.11 3.11 0 0 1 .68 1.97v2.94c0 .27.18.58.69.49A10 10 0 0 0 12 2Z"></path>
                </svg>
              </div>
              <p className="text-primary-text text-xs font-medium leading-normal">Etsy</p>
            </button>
            <button 
              className="flex flex-col items-center gap-xs py-sm text-center transition-colors duration-200 rounded-lg hover:bg-background-light"
              onClick={onExport}
            >
              <div className="rounded-full bg-background-light p-sm">
                <svg className="w-5 h-5 text-primary-text" fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                  <path d="M248 168v32a8 8 0 0 1-16 0v-14.69l-2.21 2.22C226.69 192.9 189.44 232 128 232c-62.84 0-100.38-40.91-101.95-42.65a8 8 0 0 1 12-11.3C38.27 179 72.5 216 128 216s89.73-37 90.07-37.36a3.85 3.85 0 0 1 .27-.3l2.35-2.34H208a8 8 0 0 1 0-16h32a8 8 0 0 1 8 8ZM160 94.53V84a36 36 0 0 0-68.08-16.36 8 8 0 0 1-14.25-7.28A52 52 0 0 1 176 84v92a8 8 0 0 1-16 0v-6.53a52 52 0 1 1 0-74.94ZM160 132a36 36 0 1 0-36 36 36 36 0 0 0 36-36Z"></path>
              </svg>
              </div>
              <p className="text-primary-text text-xs font-medium leading-normal">Amazon</p>
            </button>
            <button 
              className="flex flex-col items-center gap-xs py-sm text-center transition-colors duration-200 rounded-lg hover:bg-background-light"
              onClick={onExport}
            >
              <div className="rounded-full bg-background-light p-sm">
                <svg className="w-5 h-5 text-whatsapp" fill="currentColor" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
                  <path d="M128 24a104 104 0 0 0-91.82 152.88L24.83 210.93a16 16 0 0 0 20.24 20.24l34.05-11.35A104 104 0 1 0 128 24Zm-8.42 160.58-32-16a8 8 0 0 1-.5-14.5l14.69-9.8a40.55 40.55 0 0 0 16-16l9.8-14.69a8 8 0 0 1 14.5-.5l16 32a8 8 0 0 1-7.08 11.58A40 40 0 0 1 128 192a88.1 88.1 0 0 1-8.42-7.42Zm39.26-47.42-23-11.48 9.74-14.61a8 8 0 0 0-1.28-9.09 56.47 56.47 0 0 1-30.15-30.15 8 8 0 0 0-9.09-1.28L101 118l-11.48-23A24 24 0 0 0 80.46 104 72.08 72.08 0 0 0 152 176a24 24 0 0 0 9.06-.72Z"></path>
              </svg>
              </div>
              <p className="text-primary-text text-xs font-medium leading-normal">WhatsApp</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewScreen;