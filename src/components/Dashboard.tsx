import React from 'react';
import BottomNavigation from './BottomNavigation';

interface DashboardProps {
  userName: string;
  onCreateListing: () => void;
  conversationHistory?: any[];
  onResumeConversation?: (conversationId: string) => void;
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToProducts?: () => void;
  onNavigateToTesting?: () => void;
  onNavigateToMarketplace?: () => void;
  onNavigateToContentBooster?: () => void;
  onNavigateToTutorials?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  userName,
  onCreateListing,
  conversationHistory = [],
  onResumeConversation,
  onNavigateToProfile,
  onNavigateToSettings,
  onNavigateToProducts,
  onNavigateToTesting,
  onNavigateToMarketplace,
  onNavigateToContentBooster,
  onNavigateToTutorials
}) => {
  const products = [
    {
      id: 1,
      name: 'Handcrafted Ceramic Vase',
      description: 'Elegant vase',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'
    },
    {
      id: 2,
      name: 'Traditional Silk Scarf',
      description: 'Luxurious silk scarf',
      image: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=400&fit=crop'
    },
    {
      id: 3,
      name: 'Wooden Carved Elephant',
      description: 'Detailed carving',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop'
    },
    {
      id: 4,
      name: 'Beaded Necklace',
      description: 'Colorful beaded necklace',
      image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop'
    }
  ];

  const playAudio = (productName: string) => {
    console.log(`Playing audio for: ${productName}`);
  };

  return (
    <div className="flex h-full flex-col bg-background-main overflow-hidden font-main">
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* Header */}
      <header className="px-4 py-3 bg-background-light shadow-sm">
        <div className="flex items-center justify-between">
          <button
            className="flex items-center justify-center w-8 h-8 rounded-full bg-background-main hover:bg-background-light transition-colors"
            onClick={onNavigateToSettings}
          >
            <span className="material-symbols-outlined text-primary-text text-lg">settings</span>
          </button>
          <h1 className="text-xl font-bold text-primary-text">Welcome, {userName}</h1>
          <button
            className="flex items-center justify-center w-8 h-8 rounded-full bg-background-main hover:bg-background-light transition-colors"
            onClick={onNavigateToContentBooster}
          >
            <span className="material-symbols-outlined text-primary-text text-lg">auto_awesome</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow px-4 pt-6 pb-4 overflow-y-auto scrollbar-hide">
        <div className="w-full px-2">
          {/* Quick Actions */}
          <div className="mb-lg">
            <button
              className="btn-primary w-full mb-md"
              onClick={onCreateListing}
            >
              <span className="material-symbols-outlined text-xl">add_circle</span>
              Create New Listing
            </button>
          </div>

          {/* Conversation History Section */}
          {conversationHistory.length > 0 && (
            <div className="mb-lg">
              <h2 className="text-lg font-semibold text-primary-text mb-md">Recent Conversations</h2>
              <div className="space-y-sm">
                {conversationHistory.slice(0, 3).map((conversation: any, index: number) => (
                  <div key={index} className="bg-background-light rounded-lg p-md border border-border-color">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-primary-text text-sm">
                          {conversation.extractedInfo?.productType || 'Untitled Product'}
                        </h3>
                        <p className="text-xs text-secondary-text">
                          {conversation.status === 'in_progress' ? 'In Progress' : 'Completed'}
                        </p>
                      </div>
                      {conversation.status === 'in_progress' && onResumeConversation && (
                        <button
                          className="text-primary-brand text-sm font-medium"
                          onClick={() => onResumeConversation(conversation.id)}
                        >
                          Resume
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Section */}
          <div className="mb-lg">
            <div className="flex items-center gap-sm">
              <div className="relative flex-1">
                <input
                  className="w-full rounded-full bg-background-light border border-border-color placeholder:text-secondary-text px-md py-3 text-sm focus:ring-2 focus:ring-primary-brand focus:border-primary-brand"
                  placeholder="Search products"
                  type="text"
                />
              </div>
              <button className="flex items-center justify-center w-10 h-10 rounded-full bg-background-light border border-border-color hover:bg-background-main transition-colors">
                <span className="material-symbols-outlined text-primary-text">tune</span>
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="space-y-lg">
            {products.map((product) => (
              <div key={product.id} className="bg-background-light rounded-lg p-md shadow-sm border border-border-color">
                <div className="flex gap-md">
                  <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg">
                    <img
                      alt={product.name}
                      className="w-full h-full object-cover"
                      src={product.image}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-primary-text text-base leading-tight mb-xs">{product.name}</h3>
                    <p className="text-sm text-secondary-text mb-sm">{product.description}</p>
                    <button
                      className="flex items-center gap-xs text-secondary-text hover:text-primary-brand transition-colors"
                      onClick={() => playAudio(product.name)}
                    >
                      <span className="material-symbols-outlined text-lg">volume_up</span>
                      <span className="text-sm">Listen</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State Message */}
          {products.length === 0 && conversationHistory.length === 0 && (
            <div className="text-center py-xl">
              <div className="w-16 h-16 mx-auto mb-md bg-background-light rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl text-secondary-text">chat</span>
              </div>
              <h3 className="text-lg font-semibold text-primary-text mb-xs">Ready to share your craft?</h3>
              <p className="text-sm text-secondary-text mb-lg">Let's have a conversation about your handmade products</p>
              <button
                className="btn-primary max-w-xs"
                onClick={onCreateListing}
              >
                <span className="material-symbols-outlined text-xl">chat</span>
                Start Conversation
              </button>
            </div>
          )}
        </div>
      </main>

      <BottomNavigation
        currentScreen="dashboard"
        onNavigateToProducts={onNavigateToProducts!}
        onNavigateToProfile={onNavigateToProfile!}
        onNavigateToHelp={onNavigateToTutorials!}
      />
    </div>
  );
};

export default Dashboard;