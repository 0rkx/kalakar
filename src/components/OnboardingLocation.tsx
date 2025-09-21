import React, { useState } from 'react';

interface OnboardingLocationProps {
  userLocation: string;
  onLocationChange: (location: string) => void;
  onContinue: () => void;
  onBack?: () => void;
}

const OnboardingLocation: React.FC<OnboardingLocationProps> = ({
  userLocation,
  onLocationChange,
  onContinue,
  onBack
}) => {
  const [isRecording, setIsRecording] = useState(false);

  const handleMicClick = () => {
    setIsRecording(!isRecording);
    // Simulate voice recording for location
    if (!isRecording) {
      setTimeout(() => {
        onLocationChange('Jaipur, Rajasthan');
        setIsRecording(false);
      }, 2000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onLocationChange(e.target.value);
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
      {onBack && (
        <button 
          className="absolute top-4 left-4 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-background-main/80 backdrop-blur-sm hover:bg-background-light transition-colors shadow-sm"
          onClick={onBack}
        >
          <span className="material-symbols-outlined text-primary-text text-lg">arrow_back</span>
        </button>
      )}
      
      <div className="flex-1 overflow-y-auto custom-scrollbar scrollbar-outside" style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 transparent'
      }}>
        <div className="px-lg pt-8">
          <div className="flex w-full flex-row items-center justify-center gap-sm pb-lg">
            <div className="h-1.5 w-8 rounded-full bg-border-color"></div>
            <div className="h-1.5 w-8 rounded-full bg-border-color"></div>
            <div className="h-1.5 w-8 rounded-full bg-primary-brand"></div>
          </div>
          <div className="space-y-md text-center">
            <div className="flex items-center justify-center gap-sm">
              <h1 className="text-primary-text text-2xl font-bold leading-tight">Where are you from?</h1>
              <button className="text-primary-brand" onClick={() => console.log('Playing audio for: location-question')}>
                <span className="material-symbols-outlined text-3xl">volume_up</span>
              </button>
            </div>
            <p className="text-secondary-text text-sm">This helps me understand your craft's cultural context and traditions.</p>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center space-y-md px-lg py-8 min-h-[400px]">
          <div className="w-full max-w-sm">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-secondary-text">
                location_on
              </span>
              <div className="flex w-full items-center rounded-xl bg-background-light border border-border-color pr-md h-14">
                <input 
                  className="form-input flex-grow resize-none overflow-hidden rounded-l-xl text-primary-text focus:outline-0 focus:ring-0 border-none bg-background-light placeholder:text-secondary-text pl-12 py-md text-base font-normal leading-normal"
                  placeholder="Enter your location"
                  value={userLocation}
                  onChange={handleInputChange}
                />
                <button 
                  onClick={handleMicClick} 
                  className={`transition-colors ${isRecording ? 'animate-pulse text-red-500' : 'text-primary-brand hover:text-primary-brand/80'}`}
                >
                  <span className="material-symbols-outlined text-2xl">
                    {isRecording ? 'stop' : 'mic'}
                  </span>
                </button>
              </div>
            </div>
            
            {isRecording && (
              <div className="mt-md text-center">
                <p className="text-secondary-text text-sm">Recording... Say your location clearly</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-shrink-0 bg-background-main/80 backdrop-blur-sm border-t border-border-color">
        <div className="p-md pb-lg">
          <button 
            className={`btn-primary ${
              !userLocation ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={!userLocation}
            onClick={onContinue}
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingLocation;