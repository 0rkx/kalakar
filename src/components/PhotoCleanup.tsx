import React, { useState } from 'react';
import { UploadedPhoto } from '../types';
import { backendApi, ImageProcessingResponse } from '../services/backendApi';

interface PhotoCleanupProps {
  uploadedPhotos: UploadedPhoto[];
  sessionId: string;
  knowledgeId: string;
  onBack: () => void;
  onContinue: (imageProcessingResult: ImageProcessingResponse) => void;
}

const PhotoCleanup: React.FC<PhotoCleanupProps> = ({
  uploadedPhotos,
  sessionId,
  knowledgeId,
  onBack,
  onContinue
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<ImageProcessingResponse | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);

  const handleCleanImages = async () => {
    setIsProcessing(true);
    setProcessingProgress(0);
    
    try {
      console.log('🎨 Starting Gemini 2.5 Flash image processing for', uploadedPhotos.length, 'photos');
      
      // Convert uploaded photos to files
      const imageFiles = uploadedPhotos.map(photo => photo.file);

      // Faster progress updates for better UX
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + 15, 90));
      }, 150);

      // Process images with backend (Gemini 2.5 Flash analysis + enhancement)
      const result = await backendApi.processImages({
        sessionId,
        knowledgeId,
        images: imageFiles
      });

      clearInterval(progressInterval);
      setProcessingProgress(100);
      setProcessingResult(result);
      
      console.log('✨ Backend image processing completed:', result);
      
      // Continue immediately with the result - don't wait
      setIsProcessing(false);
      onContinue(result);
      
    } catch (error) {
      console.error('❌ Image processing failed:', error);
      setIsProcessing(false);
      // Continue anyway with fallback result
      const fallbackResult: ImageProcessingResponse = {
        success: false,
        cleanedImages: [],
        imageAnalysis: {
          visualFeatures: ['Handcrafted quality'],
          colors: ['Natural tones'],
          materials: ['Traditional materials'],
          style: 'Artisan crafted',
          quality: 'High quality handmade',
          marketingPoints: ['Unique handcrafted piece']
        },
        processingTime: 0,
        error: error.message
      };
      onContinue(fallbackResult);
    }
  };

  const playAudio = (type: string) => {
    console.log(`Playing audio for: ${type}`);
  };

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
            <h1 className="text-primary-text text-2xl font-bold leading-tight">Review Photos</h1>
            <div className="flex justify-center items-center text-xs text-secondary-text">
              <button onClick={() => playAudio('tip')} className="mr-sm">
                <span className="material-symbols-outlined text-primary-brand text-lg">volume_up</span>
              </button>
              <p>
                Your photos will be automatically cleaned up for marketplace display.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center px-lg py-8">

        
          <div className="w-full max-w-sm">
            <div className="grid grid-cols-2 gap-md">
              {uploadedPhotos.slice(0, 3).map((photo, index) => (
                <div key={photo.id} className="relative group aspect-square">
                  <div 
                    className="absolute inset-0 bg-cover bg-center rounded-lg"
                    style={{backgroundImage: `url(${photo.dataUrl})`}}
                  ></div>
                  <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-20 h-1 bg-white/50 rounded-full">
                      <div className="w-1/2 h-full bg-white rounded-full relative">
                        <div className="absolute -top-1 -right-2 w-3 h-3 bg-white rounded-full border-2 border-white/50"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {uploadedPhotos.length < 4 && (
                <div className="relative group aspect-square">
                  <div className="w-full h-full bg-background-light border-2 border-dashed border-border-color rounded-lg flex flex-col items-center justify-center text-secondary-text">
                    <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                    <span className="text-xs mt-xs">Add Photo</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-shrink-0 bg-background-main/80 backdrop-blur-sm border-t border-border-color">
        <div className="p-md pb-lg">
          <button 
            className={`btn-primary ${
              isProcessing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={handleCleanImages}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing images...
              </div>
            ) : (
              'Continue'
            )}
          </button>
          
          {isProcessing && processingProgress > 0 && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-brand h-2 rounded-full transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-secondary-text mt-1 text-center">
                {processingProgress < 100 ? 'Enhancing images...' : 'Cleaning complete!'}
              </p>
            </div>
          )}
          

        </div>
      </div>
    </div>
  );
};

export default PhotoCleanup;