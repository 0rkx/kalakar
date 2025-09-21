import React from 'react';
import BottomNavigation from './BottomNavigation';

interface ProfileScreenProps {
  userName: string;
  userLocation: string;
  onBack: () => void;
  onNavigateToProducts?: () => void;
  onNavigateToHelp?: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userName,
  userLocation,
  onBack,
  onNavigateToProducts,
  onNavigateToHelp
}) => {
  return (
    <div className="flex h-full flex-col bg-background-main overflow-hidden">
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <header className="px-4 py-3">
        <button 
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-background-light transition-colors"
          onClick={onBack}
        >
          <span className="material-symbols-outlined text-primary-text">arrow_back</span>
        </button>
      </header>
      
      <main className="flex-grow flex flex-col px-4 pt-4 text-center overflow-y-auto scrollbar-hide">
        <div className="w-full px-2">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-primary-brand rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-white">person</span>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-primary-text mb-2">{userName}</h1>
          <p className="text-sm text-secondary-text mb-4">{userLocation}</p>
          
          <div className="space-y-4">
            <div className="bg-background-light rounded-lg p-4 border border-border-color">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-text">inventory_2</span>
                  <span className="text-base text-primary-text">My Products</span>
                </div>
                <span className="material-symbols-outlined text-secondary-text">chevron_right</span>
              </div>
            </div>
            
            <div className="bg-background-light rounded-lg p-4 border border-border-color">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-text">history</span>
                  <span className="text-base text-primary-text">Conversation History</span>
                </div>
                <span className="material-symbols-outlined text-secondary-text">chevron_right</span>
              </div>
            </div>
            
            <div className="bg-background-light rounded-lg p-4 border border-border-color">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-text">language</span>
                  <span className="text-base text-primary-text">Language Preferences</span>
                </div>
                <span className="material-symbols-outlined text-secondary-text">chevron_right</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <BottomNavigation
        currentScreen="profile"
        onNavigateToProducts={onNavigateToProducts || (() => {})}
        onNavigateToProfile={() => {}} // Already on profile screen
        onNavigateToHelp={onNavigateToHelp || (() => {})}
      />
    </div>
  );
};

export default ProfileScreen;