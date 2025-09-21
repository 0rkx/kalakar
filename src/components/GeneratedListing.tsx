import React, { useState } from 'react';
import { UploadedPhoto, ProductListing, ExportPlatform } from '../types';
import SuccessModal from './SuccessModal';

interface GeneratedListingProps {
  uploadedPhotos: UploadedPhoto[];
  generatedListing: ProductListing;
  onBack: () => void;
  onRegenerate: () => void;
}

const GeneratedListing: React.FC<GeneratedListingProps> = ({
  uploadedPhotos,
  generatedListing,
  onBack,
  onRegenerate
}) => {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    title: string;
    message: string;
  }>({ title: '', message: '' });

  const handleExport = (platform: ExportPlatform) => {
    const exportData = {
      etsy: {
        title: 'Etsy Export Successful!',
        message: 'Your listing has been exported to Etsy and is ready for review.'
      },
      amazon: {
        title: 'Amazon Export Successful!',
        message: 'Your listing has been exported to Amazon Seller Central.'
      },
      whatsapp: {
        title: 'WhatsApp Share Successful!',
        message: 'Your product listing has been shared to WhatsApp Business.'
      }
    };

    setSuccessData(exportData[platform]);
    setShowSuccessModal(true);
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
  };

  return (
    <div className="flex h-full flex-col bg-background-main overflow-hidden">
      <header className="p-md bg-background-light shadow-sm safe-header">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-secondary-text">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-base font-semibold">Your Listing</h2>
          <button onClick={onRegenerate} className="text-primary-brand">
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </header>
      
      <main className="flex-grow overflow-y-auto p-md">
        <div className="w-full max-w-sm mx-auto space-y-md">
          {/* Product Images */}
          <div className="bg-background-light rounded-lg p-sm shadow-sm">
            <div className="flex gap-sm overflow-x-auto">
              {uploadedPhotos.map((photo) => (
                <img 
                  key={photo.id}
                  src={photo.dataUrl} 
                  alt="Product"
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                />
              ))}
            </div>
          </div>

          {/* Product Title */}
          <div className="bg-background-light rounded-lg p-sm shadow-sm">
            <h3 className="text-xs font-semibold text-secondary-text mb-sm">Product Title</h3>
            <p className="text-primary-text font-medium text-sm">{generatedListing.title}</p>
          </div>

          {/* Product Description */}
          <div className="bg-background-light rounded-lg p-sm shadow-sm">
            <h3 className="text-xs font-semibold text-secondary-text mb-sm">Description</h3>
            <p className="text-primary-text text-sm">{generatedListing.description}</p>
          </div>

          {/* Key Features */}
          <div className="bg-background-light rounded-lg p-sm shadow-sm">
            <h3 className="text-xs font-semibold text-secondary-text mb-sm">Key Features</h3>
            <ul className="text-primary-text space-y-xs text-sm">
              {generatedListing.features.map((feature, index) => (
                <li key={index}>• {feature}</li>
              ))}
            </ul>
          </div>

          {/* Artisan Bio */}
          <div className="bg-background-light rounded-lg p-sm shadow-sm">
            <h3 className="text-xs font-semibold text-secondary-text mb-sm">Artisan Bio</h3>
            <p className="text-primary-text text-sm">{generatedListing.bio}</p>
          </div>

          {/* Tags */}
          <div className="bg-background-light rounded-lg p-sm shadow-sm">
            <h3 className="text-xs font-semibold text-secondary-text mb-sm">Tags</h3>
            <div className="flex flex-wrap gap-xs">
              {generatedListing.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="px-sm py-xs bg-background-main text-secondary-text rounded-full text-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>
      
      <footer className="p-md bg-background-light border-t pb-lg">
        <div className="space-y-sm">
          <button 
            onClick={() => handleExport('etsy')}
            className="flex w-full items-center justify-center gap-sm rounded-xl bg-etsy py-2.5 text-white font-semibold hover:bg-opacity-90 text-sm"
          >
            <span className="material-symbols-outlined text-lg">storefront</span>
            Export to Etsy
          </button>
          <button 
            onClick={() => handleExport('amazon')}
            className="flex w-full items-center justify-center gap-sm rounded-xl bg-amazon py-2.5 text-white font-semibold hover:bg-opacity-90 text-sm"
          >
            <span className="material-symbols-outlined text-lg">shopping_cart</span>
            Export to Amazon
          </button>
          <button 
            onClick={() => handleExport('whatsapp')}
            className="flex w-full items-center justify-center gap-sm rounded-xl bg-whatsapp py-2.5 text-white font-semibold hover:bg-opacity-90 text-sm"
          >
            <span className="material-symbols-outlined text-lg">chat</span>
            Share on WhatsApp Business
          </button>
        </div>
      </footer>

      <SuccessModal 
        isOpen={showSuccessModal}
        title={successData.title}
        message={successData.message}
        onClose={closeSuccessModal}
      />
    </div>
  );
};

export default GeneratedListing;