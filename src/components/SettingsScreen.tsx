import React from 'react';

interface SettingsScreenProps {
  onBack: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  return (
    <div className="flex h-full flex-col bg-background-main overflow-hidden">
      <header className="p-sm safe-header">
        <button 
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-background-light transition-colors"
          onClick={onBack}
        >
          <span className="material-symbols-outlined text-primary-text">arrow_back</span>
        </button>
      </header>
      
      <main className="flex-grow flex flex-col px-md pt-2 text-center overflow-y-auto">
        <div className="w-full max-w-sm mx-auto">
          <h1 className="text-2xl font-bold text-primary-text mb-6">Settings</h1>
          
          <div className="space-y-4 text-left">
            <div className="bg-background-light rounded-lg p-4 border border-border-color">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-text">notifications</span>
                  <span className="text-base text-primary-text">Notifications</span>
                </div>
                <span className="material-symbols-outlined text-secondary-text">chevron_right</span>
              </div>
            </div>
            
            <div className="bg-background-light rounded-lg p-4 border border-border-color">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-text">language</span>
                  <span className="text-base text-primary-text">Language</span>
                </div>
                <span className="material-symbols-outlined text-secondary-text">chevron_right</span>
              </div>
            </div>
            
            <div className="bg-background-light rounded-lg p-4 border border-border-color">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-text">volume_up</span>
                  <span className="text-base text-primary-text">Audio Settings</span>
                </div>
                <span className="material-symbols-outlined text-secondary-text">chevron_right</span>
              </div>
            </div>
            
            <div className="bg-background-light rounded-lg p-4 border border-border-color">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-text">privacy_tip</span>
                  <span className="text-base text-primary-text">Privacy</span>
                </div>
                <span className="material-symbols-outlined text-secondary-text">chevron_right</span>
              </div>
            </div>
            
            <div className="bg-background-light rounded-lg p-4 border border-border-color">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-text">help</span>
                  <span className="text-base text-primary-text">Help & Support</span>
                </div>
                <span className="material-symbols-outlined text-secondary-text">chevron_right</span>
              </div>
            </div>
            
            <div className="bg-background-light rounded-lg p-4 border border-border-color">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-text">info</span>
                  <span className="text-base text-primary-text">About</span>
                </div>
                <span className="material-symbols-outlined text-secondary-text">chevron_right</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsScreen;