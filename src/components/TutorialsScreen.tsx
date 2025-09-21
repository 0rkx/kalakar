import React, { useState } from 'react';
import BottomNavigation from './BottomNavigation';

interface TutorialsScreenProps {
    onBack: () => void;
    onNavigateToProducts?: () => void;
    onNavigateToProfile?: () => void;
    onNavigateToAIAssistant?: () => void;
    userId?: string;
}

const tutorials = [
    {
        platform: 'Amazon',
        title: 'How to list your product on Amazon',
        steps: [
            '1. Go to your Amazon Seller Central account.',
            '2. Navigate to "Inventory" and click "Add a Product".',
            '3. Copy and paste the generated title, description, and keywords.',
            '4. Upload your enhanced photos.',
            '5. Set your price and shipping options.',
            '6. Click "Save and finish".'
        ]
    },
    {
        platform: 'Etsy',
        title: 'How to create a listing on Etsy',
        steps: [
            '1. Go to your Etsy Shop Manager.',
            '2. Click "Listings" and then "Add a listing".',
            '3. Upload your enhanced photos.',
            '4. Fill in the listing details using the generated content.',
            '5. Add your tags and materials.',
            '6. Set your price and shipping profile.',
            '7. Click "Publish".'
        ]
    },
    {
        platform: 'WhatsApp',
        title: 'How to create a catalog on WhatsApp Business',
        steps: [
            '1. Open the WhatsApp Business app.',
            '2. Go to "Settings" > "Business tools" > "Catalog".',
            '3. Tap "Add new item".',
            '4. Add images of your product.',
            '5. Enter the product name and description.',
            '6. Tap "Save".'
        ]
    }
];

const TutorialsScreen: React.FC<TutorialsScreenProps> = ({ onBack, onNavigateToProducts, onNavigateToProfile, onNavigateToAIAssistant, userId }) => {
    const [openTutorial, setOpenTutorial] = useState<string | null>(null);

    const toggleTutorial = (platform: string) => {
        setOpenTutorial(openTutorial === platform ? null : platform);
    };

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
                    <h1 className="text-2xl font-bold text-primary-text mb-4">Help & Tutorials</h1>
                    
                    <div className="space-y-4 text-left">
                        {/* AI Assistant Section */}
                        <div className="bg-background-light rounded-lg border border-border-color p-4 mb-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-primary-brand rounded-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-lg">smart_toy</span>
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-primary-text">Kalakar AI Assistant</h2>
                                    <p className="text-xs text-secondary-text">Get instant help</p>
                                </div>
                            </div>
                            <p className="text-sm text-secondary-text mb-4">
                                Ask questions about creating listings, marketplace features, pricing strategies, and more.
                            </p>
                            <button
                                onClick={onNavigateToAIAssistant}
                                className="btn-primary w-full"
                            >
                                <span className="material-symbols-outlined text-lg mr-2">smart_toy</span>
                                Open AI Assistant
                            </button>
                        </div>
                        
                        {tutorials.map(tutorial => (
                            <div key={tutorial.platform} className="bg-background-light rounded-lg border border-border-color overflow-hidden">
                                <button
                                    onClick={() => toggleTutorial(tutorial.platform)}
                                    className="w-full flex justify-between items-center p-4 hover:bg-background-main transition-colors"
                                >
                                    <h2 className="text-base font-semibold text-primary-text text-left">{tutorial.title}</h2>
                                    <span className="material-symbols-outlined text-secondary-text">
                                        {openTutorial === tutorial.platform ? 'expand_less' : 'expand_more'}
                                    </span>
                                </button>
                                {openTutorial === tutorial.platform && (
                                    <div className="px-4 pb-4 border-t border-border-color bg-background-main">
                                        <ul className="space-y-2 mt-3">
                                            {tutorial.steps.map((step, index) => (
                                                <li key={index} className="text-sm text-secondary-text">{step}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            
            <BottomNavigation
                currentScreen="help"
                onNavigateToProducts={onNavigateToProducts || (() => {})}
                onNavigateToProfile={onNavigateToProfile || (() => {})}
                onNavigateToHelp={() => {}} // Already on help screen
            />
        </div>
    );
};

export default TutorialsScreen;
