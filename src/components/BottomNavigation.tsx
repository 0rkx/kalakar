import React from 'react';

interface BottomNavigationProps {
  currentScreen: 'products' | 'profile' | 'help' | 'dashboard';
  onNavigateToProducts: () => void;
  onNavigateToProfile: () => void;
  onNavigateToHelp: () => void;
  onNavigateToHome?: () => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentScreen,
  onNavigateToProducts,
  onNavigateToProfile,
  onNavigateToHelp,
  onNavigateToHome
}) => {
  const getButtonClass = (screen: string) => {
    const baseClass = "flex flex-col items-center justify-center gap-1 transition-colors flex-1 py-1";
    return currentScreen === screen 
      ? `${baseClass} text-primary-brand` 
      : `${baseClass} text-secondary-text hover:text-primary-brand`;
  };

  return (
    <footer className="bg-background-light border-t border-border-color px-2 py-2 pb-4 flex-shrink-0">
      <nav className="flex justify-around w-full">
        <button
          className={getButtonClass('products')}
          onClick={onNavigateToProducts}
        >
          <span className="material-symbols-outlined text-lg">inventory_2</span>
          <p className="text-xs font-medium leading-tight">Products</p>
        </button>
        <button
          className={getButtonClass('profile')}
          onClick={onNavigateToProfile}
        >
          <span className="material-symbols-outlined text-lg">person</span>
          <p className="text-xs font-medium leading-tight">Profile</p>
        </button>
        <button
          className={getButtonClass('help')}
          onClick={onNavigateToHelp}
        >
          <span className="material-symbols-outlined text-lg">help</span>
          <p className="text-xs font-medium leading-tight">Help</p>
        </button>
      </nav>
    </footer>
  );
};

export default BottomNavigation;