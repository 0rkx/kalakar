import React from 'react';
import { Language } from '../types';
import { LANGUAGES } from '../constants/languages';

interface LanguageSelectionProps {
  selectedLanguage: Language | null;
  onLanguageSelect: (language: Language) => void;
  onContinue: () => void;
  onBack?: () => void;
}

const LanguageSelection: React.FC<LanguageSelectionProps> = ({
  selectedLanguage,
  onLanguageSelect,
  onContinue,
  onBack
}) => {
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
      <div className="flex-1 overflow-y-auto custom-scrollbar scrollbar-outside" style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#cbd5e1 transparent'
      }}>
        <div className="px-lg pt-8">
          <div className="flex w-full flex-row items-center justify-center gap-sm pb-lg">
            <div className="h-1.5 w-8 rounded-full bg-primary-brand"></div>
            <div className="h-1.5 w-8 rounded-full bg-border-color"></div>
            <div className="h-1.5 w-8 rounded-full bg-border-color"></div>
          </div>
          
          <div className="flex justify-center pb-md">
            <svg fill="none" height="48" viewBox="0 0 64 64" width="48" xmlns="http://www.w3.org/2000/svg">
              <path d="M43.913 18.5996C42.1463 15.9329 39.5463 13.8929 36.5197 12.8929C30.9997 11.0529 24.6397 12.5996 20.3597 16.8929C16.0663 21.1729 14.533 27.5329 16.373 33.0529C17.373 36.0796 19.413 38.6796 22.0797 40.4463L29.3197 21.3196L43.913 18.5996Z" fill="var(--primary-brand)" fillOpacity="0.3"></path>
              <path d="M29.3201 21.3198L22.0734 40.4465C23.6334 41.5332 25.4268 42.2798 27.3134 42.6132C28.2134 42.7732 29.1134 42.8598 30.0068 42.8598C33.1534 42.8598 36.1334 41.7732 38.4334 39.8798L29.3201 21.3198Z" fill="var(--primary-brand)"></path>
              <path d="M42.6865 42.6867C40.0198 44.4533 37.0132 45.4267 33.8665 45.3467C28.3465 45.1133 23.6132 41.7867 21.4932 36.88L42.6865 42.6867Z" fill="var(--primary-brand)" fillOpacity="0.3"></path>
            </svg>
          </div>
          
          <div className="space-y-md text-center">
            <div className="flex items-center justify-center gap-sm">
              <h1 className="text-primary-text text-2xl font-bold leading-tight">Welcome to Kalakar</h1>
              <button className="text-primary-brand" onClick={() => playAudio('welcome')}>
                <span className="material-symbols-outlined text-3xl">volume_up</span>
              </button>
            </div>
            <div className="flex items-center justify-center gap-sm">
              <p className="text-secondary-text text-sm">Give your craft a digital voice.</p>
              <button className="text-primary-brand" onClick={() => playAudio('tagline')}>
                <span className="material-symbols-outlined text-xl">volume_up</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center space-y-md px-lg py-6 min-h-[300px]">
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-center gap-sm mb-md">
              <h2 className="text-primary-text text-xl font-semibold">Select your language</h2>
              <button className="text-primary-brand" onClick={() => playAudio('selectLanguage')}>
                <span className="material-symbols-outlined text-2xl">volume_up</span>
              </button>
            </div>
            
            <div className="bg-background-light rounded-lg border border-border-color overflow-hidden">
              {LANGUAGES.map((language, index) => (
                <div
                  key={language.code}
                  className={`flex items-center justify-between p-md cursor-pointer hover:bg-primary-brand/10 transition-colors ${
                    index !== LANGUAGES.length - 1 ? 'border-b border-border-color' : ''
                  } ${
                    selectedLanguage?.code === language.code ? 'bg-primary-brand text-white hover:bg-primary-brand' : ''
                  }`}
                  onClick={() => onLanguageSelect(language)}
                >
                  <span className="text-base font-medium">{language.nativeName}</span>
                  <button
                    className={`transition-colors ${
                      selectedLanguage?.code === language.code ? 'text-white' : 'text-primary-brand'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      playAudio(language.code);
                    }}
                  >
                    <span className="material-symbols-outlined text-xl">volume_up</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-shrink-0 bg-background-main/80 backdrop-blur-sm border-t border-border-color">
        <div className="p-md pb-lg">
          <button
            className={`btn-primary ${!selectedLanguage ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!selectedLanguage}
            onClick={onContinue}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelection;