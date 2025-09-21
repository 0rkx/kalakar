import React from 'react';
import BottomNavigation from './BottomNavigation';

interface ProductsScreenProps {
  onBack: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToHelp?: () => void;
}

const ProductsScreen: React.FC<ProductsScreenProps> = ({ onBack, onNavigateToProfile, onNavigateToHelp }) => {
  const products = [
    {
      id: 1,
      name: 'Handcrafted Ceramic Vase',
      description: 'Elegant handmade ceramic vase with traditional patterns',
      price: '$45.00',
      status: 'Active',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'
    },
    {
      id: 2,
      name: 'Traditional Silk Scarf',
      description: 'Luxurious silk scarf with hand-painted designs',
      price: '$32.00',
      status: 'Active',
      image: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=400&fit=crop'
    },
    {
      id: 3,
      name: 'Wooden Carved Elephant',
      description: 'Detailed wooden carving of an elephant',
      price: '$28.00',
      status: 'Draft',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'
    },
    {
      id: 4,
      name: 'Beaded Necklace',
      description: 'Colorful handmade beaded necklace',
      price: '$22.00',
      status: 'Active',
      image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop'
    }
  ];

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
          <h1 className="text-2xl font-bold text-primary-text mb-4">My Products</h1>
          
          <div className="space-y-4 text-left">
            {products.map((product) => (
              <div key={product.id} className="bg-background-light rounded-lg p-4 border border-border-color">
                <div className="flex gap-3">
                  <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-lg">
                    <img 
                      alt={product.name} 
                      className="w-full h-full object-cover" 
                      src={product.image}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-primary-text text-sm leading-tight">{product.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${
                        product.status === 'Active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {product.status}
                      </span>
                    </div>
                    <p className="text-xs text-secondary-text mb-2 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary-brand">{product.price}</span>
                      <div className="flex items-center gap-2">
                        <button className="text-xs text-primary-brand hover:text-primary-text transition-colors">
                          Edit
                        </button>
                        <button className="text-xs text-secondary-text hover:text-primary-text transition-colors">
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {products.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-background-light rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl text-secondary-text">inventory_2</span>
              </div>
              <h3 className="text-lg font-semibold text-primary-text mb-2">No products yet</h3>
              <p className="text-sm text-secondary-text mb-4">Start creating your first product listing</p>
            </div>
          )}
        </div>
      </main>
      
      <BottomNavigation
        currentScreen="products"
        onNavigateToProducts={() => {}} // Already on products screen
        onNavigateToProfile={onNavigateToProfile || (() => {})}
        onNavigateToHelp={onNavigateToHelp || (() => {})}
      />
    </div>
  );
};

export default ProductsScreen;