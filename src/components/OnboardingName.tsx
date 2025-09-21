import React from 'react';

interface OnboardingWelcomeProps {
  userName?: string;
  onContinue: () => void;
  onBack?: () => void;
}

const OnboardingWelcome: React.FC<OnboardingWelcomeProps> = ({
  userName,
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
            <div className="h-1.5 w-8 rounded-full bg-primary-brand"></div>
            <div className="h-1.5 w-8 rounded-full bg-border-color"></div>
          </div>
          <div className="space-y-md text-center">
            <div className="flex items-center justify-center gap-sm">
              <h1 className="text-primary-text text-3xl font-bold leading-tight">
                Welcome{userName ? `, ${userName}` : ''}!
              </h1>
              <button className="text-primary-brand" onClick={() => playAudio('welcome-message')}>
                <span className="material-symbols-outlined text-3xl">volume_up</span>
              </button>
            </div>
            <p className="text-secondary-text text-base leading-relaxed max-w-sm mx-auto">
              I'm here to help you explore and develop your creative craft. Let's start this journey together.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center space-y-lg px-lg py-12 min-h-[400px]">
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-primary-brand/10">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-brand shadow-lg">
              <span className="material-symbols-outlined text-4xl text-white">
                waving_hand
              </span>
            </div>
          </div>
          
          <div className="text-center space-y-md max-w-md">
            <h2 className="text-primary-text text-xl font-semibold">
              Ready to get started?
            </h2>
            <p className="text-secondary-text text-sm leading-relaxed">
              I'll guide you through setting up your creative workspace and help you discover new techniques and inspiration for your craft.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-md w-full max-w-sm">
            <div className="bg-background-light rounded-lg p-md border border-border-color">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary-brand text-xl">palette</span>
                <span className="text-primary-text text-sm font-medium">Personalized guidance</span>
              </div>
            </div>
            <div className="bg-background-light rounded-lg p-md border border-border-color">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary-brand text-xl">lightbulb</span>
                <span className="text-primary-text text-sm font-medium">Creative inspiration</span>
              </div>
            </div>
            <div className="bg-background-light rounded-lg p-md border border-border-color">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary-brand text-xl">trending_up</span>
                <span className="text-primary-text text-sm font-medium">Skill development</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-shrink-0 bg-background-main/80 backdrop-blur-sm border-t border-border-color">
        <div className="p-md pb-lg">
          <button 
            className="btn-primary"
            onClick={onContinue}
          >
            Let's Begin
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWelcome;