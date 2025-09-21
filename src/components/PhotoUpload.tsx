import React, { useRef, useState } from 'react';
import { UploadedPhoto, ConversationData } from '../types';
import { improvePhoto } from '../services/api';
import { backendApi } from '../services/backendApi';

interface PhotoUploadProps {
  uploadedPhotos: UploadedPhoto[];
  onPhotosChange: (photos: UploadedPhoto[]) => void;
  onBack: () => void;
  onNext: () => void;
  conversationData?: ConversationData | null;
  sessionId: string;
  knowledgeId: string;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  uploadedPhotos,
  onPhotosChange,
  onBack,
  onNext,
  conversationData,
  sessionId,
  knowledgeId
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [batchImproving, setBatchImproving] = useState(false);
  const [autoCleaningImages, setAutoCleaningImages] = useState(false);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const photosArray = Array.isArray(uploadedPhotos) ? uploadedPhotos : [];
    const remainingSlots = 5 - photosArray.length;
    const filesToProcess = files.slice(0, remainingSlots);
    
    // Process all files and automatically clean them
    const processFiles = async () => {
      setAutoCleaningImages(true);
      const newPhotos: UploadedPhoto[] = [];
      
      for (const file of filesToProcess) {
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          
          const newPhoto: UploadedPhoto = {
            file,
            dataUrl,
            id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
            isImproving: true // Show as processing
          };
          
          newPhotos.push(newPhoto);
        } catch (error) {
          console.error('Error processing file:', file.name, error);
        }
      }
      
      // Add photos immediately (showing as processing)
      if (newPhotos.length > 0) {
        onPhotosChange([...photosArray, ...newPhotos]);
        
        // Auto-enhance the images in the background with Gemini 2.5 Flash
        try {
          console.log('🎨 Auto-enhancing uploaded images with Gemini 2.5 Flash...');
          const result = await backendApi.processImages({
            sessionId,
            knowledgeId,
            images: filesToProcess
          });
          
          if (result.success && result.cleanedImages) {
            // Update photos with Gemini 2.5 Flash enhanced versions
            const updatedPhotos = [...photosArray, ...newPhotos];
            result.cleanedImages.forEach((enhancedImg, index) => {
              const photoIndex = updatedPhotos.findIndex(p => p.id === newPhotos[index]?.id);
              if (photoIndex !== -1) {
                updatedPhotos[photoIndex] = {
                  ...updatedPhotos[photoIndex],
                  dataUrl: enhancedImg.cleanedUrl || updatedPhotos[photoIndex].dataUrl,
                  isImproved: enhancedImg.success,
                  isImproving: false,
                  originalDataUrl: updatedPhotos[photoIndex].dataUrl
                };
              }
            });
            onPhotosChange(updatedPhotos);
          } else {
            // If enhancement fails, just mark as not processing
            const allPhotos = [...photosArray, ...newPhotos];
            const updatedPhotos = allPhotos.map(photo => 
              newPhotos.some(np => np.id === photo.id) 
                ? { ...photo, isImproving: false }
                : photo
            );
            onPhotosChange(updatedPhotos);
          }
        } catch (error) {
          console.error('❌ Auto-enhancement failed:', error);
          // Mark photos as not processing if enhancement fails
          const allPhotos = [...photosArray, ...newPhotos];
          const updatedPhotos = allPhotos.map(photo => 
            newPhotos.some(np => np.id === photo.id) 
              ? { ...photo, isImproving: false }
              : photo
          );
          onPhotosChange(updatedPhotos);
        }
      }
      
      setAutoCleaningImages(false);
    };
    
    processFiles();
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (photoId: string) => {
    const photosArray = Array.isArray(uploadedPhotos) ? uploadedPhotos : [];
    onPhotosChange(photosArray.filter(photo => photo.id !== photoId));
  };

  /**
   * Handles the click on the "Improve" button for a photo.
   * Calls the improvePhoto API and updates the photo with the improved version.
   */
  const handleImprovePhoto = async (photoToImprove: UploadedPhoto) => {
    const photosArray = Array.isArray(uploadedPhotos) ? uploadedPhotos : [];
    // Set loading state for the specific photo
    onPhotosChange(photosArray.map(p => p.id === photoToImprove.id ? { ...p, isImproving: true } : p));

    try {
      const improved = await improvePhoto({
        id: photoToImprove.id,
        dataUrl: photoToImprove.dataUrl,
        file: photoToImprove.file
      });

      // Update the photo with the improved data and store the original
      const photosArray = Array.isArray(uploadedPhotos) ? uploadedPhotos : [];
      onPhotosChange(photosArray.map(p => p.id === photoToImprove.id ? {
        ...p,
        dataUrl: improved.dataUrl,
        isImproved: true,
        isImproving: false,
        originalDataUrl: photoToImprove.dataUrl
      } : p));

    } catch (error) {
      console.error("Failed to improve photo", error);
      // Revert loading state on error
      const photosArray = Array.isArray(uploadedPhotos) ? uploadedPhotos : [];
      onPhotosChange(photosArray.map(p => p.id === photoToImprove.id ? { ...p, isImproving: false } : p));
    }
  };

  /**
   * Reverts an improved photo to its original version.
   */
  const handleRevertPhoto = (photoToRevert: UploadedPhoto) => {
    if (photoToRevert.originalDataUrl) {
      const photosArray = Array.isArray(uploadedPhotos) ? uploadedPhotos : [];
      onPhotosChange(photosArray.map(p => p.id === photoToRevert.id ? {
        ...p,
        dataUrl: photoToRevert.originalDataUrl!,
        isImproved: false,
        originalDataUrl: undefined
      } : p));
    }
  };

  /**
   * Improves all photos that haven't been improved yet
   */
  const handleBatchImprove = async () => {
    const photosArray = Array.isArray(uploadedPhotos) ? uploadedPhotos : [];
    const photosToImprove = photosArray.filter(photo => !photo.isImproved && !photo.isImproving);
    
    if (photosToImprove.length === 0) return;
    
    setBatchImproving(true);
    
    // Set all photos to improving state
    onPhotosChange(prev => prev.map(p => 
      photosToImprove.some(pi => pi.id === p.id) ? { ...p, isImproving: true } : p
    ));

    try {
      // Process photos in parallel with a limit to avoid overwhelming the API
      const batchSize = 2;
      for (let i = 0; i < photosToImprove.length; i += batchSize) {
        const batch = photosToImprove.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (photo) => {
            try {
              const improved = await improvePhoto({
                id: photo.id,
                dataUrl: photo.dataUrl,
                file: photo.file
              });

              onPhotosChange(prev => prev.map(p => p.id === photo.id ? {
                ...p,
                dataUrl: improved.dataUrl,
                isImproved: true,
                isImproving: false,
                originalDataUrl: photo.dataUrl
              } : p));

            } catch (error) {
              console.error(`Failed to improve photo ${photo.id}`, error);
              onPhotosChange(prev => prev.map(p => p.id === photo.id ? { ...p, isImproving: false } : p));
            }
          })
        );
      }
    } finally {
      setBatchImproving(false);
    }
  };

  const renderPhotoGrid = () => {
    const gridItems = [];
    
    // Safety check - ensure uploadedPhotos is an array
    const photosArray = Array.isArray(uploadedPhotos) ? uploadedPhotos : [];
    
    // Add uploaded photos
    photosArray.forEach((photo) => {
      gridItems.push(
        <div key={photo.id} className="aspect-square relative group">
          <img 
            src={photo.dataUrl} 
            alt="Product" 
            className={`w-full h-full object-cover rounded-lg ${photo.isImproving ? 'opacity-50' : ''}`}
          />
          
          {/* Improving spinner */}
          {photo.isImproving && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            </div>
          )}
          
          {/* Remove button */}
          <button 
            onClick={() => removePhoto(photo.id)}
            className="absolute -top-2 -right-2 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center text-sm hover:bg-opacity-80 z-10"
          >
            <span className="material-symbols-outlined text-xs">close</span>
          </button>
          

          
          {/* Improved indicator */}
          {photo.isImproved && (
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-primary-brand text-white rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-sm">check</span>
            </div>
          )}
        </div>
      );
    });
    
    // Add upload button if less than 5 photos
    if (photosArray.length < 5) {
      gridItems.push(
        <div 
          key="upload"
          className="aspect-square bg-background-light rounded-lg border-2 border-dashed border-border-color flex flex-col items-center justify-center cursor-pointer hover:bg-background-main transition-colors"
          onClick={triggerFileInput}
        >
          <span className="material-symbols-outlined text-secondary-text text-2xl mb-1">add_a_photo</span>
          <span className="text-xs text-secondary-text">Add More</span>
        </div>
      );
    }
    
    return gridItems;
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
            <h1 className="text-primary-text text-2xl font-bold leading-tight">Add Product Photos</h1>
            <p className="text-secondary-text text-sm">Upload 2-5 photos of your product. They'll be automatically cleaned up for marketplace display.</p>
            {autoCleaningImages && (
              <div className="flex items-center justify-center text-primary-brand text-sm mt-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-brand mr-2"></div>
                Processing images...
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center px-lg py-8">
          <div className="w-full max-w-sm">
            {conversationData && (
              <div className="bg-primary-brand bg-opacity-10 border border-primary-brand border-opacity-20 rounded-lg p-md mb-lg">
                <div className="flex items-center text-primary-brand text-sm">
                  <span className="material-symbols-outlined text-sm mr-2">chat</span>
                  <span>Using conversation details to enhance photo analysis</span>
                </div>
                <p className="text-xs text-secondary-text mt-1">
                  Product: {conversationData.extractedInfo?.productType || 'Details from conversation'}
                </p>
              </div>
            )}



            {/* Upload button for empty state */}
            {uploadedPhotos.length === 0 && (
              <div className="text-center mb-md">
                <button
                  onClick={triggerFileInput}
                  className="bg-primary-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg mr-2 align-middle">add_a_photo</span>
                  Select Photos
                </button>
                <p className="text-xs text-secondary-text mt-2">
                  Upload 2-5 photos (JPEG, PNG, WebP)
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-md">
              {renderPhotoGrid()}
            </div>
            
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              multiple 
              className="hidden" 
              onChange={handlePhotoUpload}
            />
          </div>
        </div>
      </div>
      
      <div className="flex-shrink-0 bg-background-main/80 backdrop-blur-sm border-t border-border-color">
        <div className="p-md pb-lg">
          <button 
            className={`btn-primary ${
              uploadedPhotos.length < 2 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={uploadedPhotos.length < 2}
            onClick={onNext}
          >
            Continue
          </button>
        </div>
      </div>

    </div>
  );
};

export default PhotoUpload;