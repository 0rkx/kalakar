import React, { useState } from 'react';
import { generateSocialContent as apiGenerateSocialContent } from '../services/api';

interface ContentBoosterProps {
    userId: string;
    onBack: () => void;
}

const ContentBooster: React.FC<ContentBoosterProps> = ({ userId, onBack }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [socialContent, setSocialContent] = useState(null);

    const handleGenerateClick = async () => {
        setIsLoading(true);
        try {
            const result = await apiGenerateSocialContent(userId);
            if (result.success) {
                setSocialContent(result.socialContent);
            }
        } catch (error) {
            console.error("Failed to generate social content:", error);
            alert("Failed to generate social content. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 p-4">
            <header className="flex items-center justify-between mb-4">
                <button onClick={onBack} className="text-gray-600">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold text-gray-800">Content Booster</h1>
                <div className="w-6"></div>
            </header>

            {!socialContent && (
                <div className="flex-grow flex flex-col items-center justify-center text-center">
                    <p className="text-gray-600 mb-4">Generate social media content from your craft story.</p>
                    <button
                        onClick={handleGenerateClick}
                        disabled={isLoading}
                        className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors duration-300"
                    >
                        {isLoading ? 'Generating...' : 'Generate Content'}
                    </button>
                </div>
            )}

            {socialContent && (
                <div className="flex-grow overflow-y-auto">
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-gray-700 mb-2">Social Media Posts</h2>
                        {socialContent.socialPosts.map((post, index) => (
                            <div key={index} className="bg-white p-4 rounded-lg shadow mb-4">
                                <p className="text-gray-800">{post}</p>
                                <button onClick={() => copyToClipboard(post)} className="text-blue-500 text-sm mt-2">Copy</button>
                            </div>
                        ))}
                    </div>

                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-gray-700 mb-2">Short Ads</h2>
                        {socialContent.shortAds.map((ad, index) => (
                            <div key={index} className="bg-white p-4 rounded-lg shadow mb-4">
                                <p className="text-gray-800">{ad}</p>
                                <button onClick={() => copyToClipboard(ad)} className="text-blue-500 text-sm mt-2">Copy</button>
                            </div>
                        ))}
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-700 mb-2">Story Snippets</h2>
                        {socialContent.storySnippets.map((snippet, index) => (
                            <div key={index} className="bg-white p-4 rounded-lg shadow mb-4">
                                <p className="text-gray-800">{snippet}</p>
                                <button onClick={() => copyToClipboard(snippet)} className="text-blue-500 text-sm mt-2">Copy</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentBooster;
