import React, { useState } from 'react';
import { enhancedProductService } from '../services/enhancedProductService';
import { geminiKnowledgeBase } from '../services/geminiKnowledgeBase';
import { backendApi } from '../services/backendApi';

interface EnhancedProductDemoProps {
    onBack: () => void;
}

const EnhancedProductDemo: React.FC<EnhancedProductDemoProps> = ({ onBack }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [demoResults, setDemoResults] = useState<any>(null);
    const [serviceStatus, setServiceStatus] = useState<any>(null);

    const runDemo = async () => {
        setIsProcessing(true);
        setDemoResults(null);

        try {
            console.log('🎬 Starting Enhanced Product Demo...');

            // Demo product input
            const demoInput = {
                name: 'Traditional Ceramic Bowl',
                type: 'ceramic bowl',
                materials: ['clay', 'natural glaze'],
                description: 'Beautiful handcrafted ceramic bowl made using traditional Indian pottery techniques',
                photos: [], // Would normally have actual photos
                userPreferences: {
                    targetMarketplaces: ['etsy', 'amazon', 'whatsapp'],
                    priceRange: { min: 30, max: 80 },
                    emphasizeCultural: true,
                    targetAudience: ['home decorators', 'art collectors']
                }
            };

            // Process with enhanced service
            const results = await enhancedProductService.processProduct(demoInput);

            setDemoResults(results);
            console.log('✅ Demo completed successfully:', results);

        } catch (error) {
            console.error('❌ Demo failed:', error);
            setDemoResults({
                error: error.message,
                processingMetrics: {
                    enhancementsApplied: ['Demo mode - services simulated']
                }
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const checkServiceStatus = async () => {
        try {
            const status = await enhancedProductService.getServiceStatus();
            setServiceStatus(status);
        } catch (error) {
            console.error('Error checking service status:', error);
        }
    };

    const testGeminiKnowledge = async () => {
        try {
            const knowledge = await geminiKnowledgeBase.generateProductKnowledge({
                name: 'Handwoven Textile',
                type: 'textile',
                materials: ['cotton', 'silk'],
                description: 'Traditional handwoven textile with cultural patterns'
            });

            console.log('📚 Gemini Knowledge Generated:', knowledge);
            alert('Gemini knowledge generation successful! Check console for details.');
        } catch (error) {
            console.error('Gemini test failed:', error);
            alert('Gemini test failed: ' + error.message);
        }
    };

    const testGemini25Flash = async () => {
        try {
            // Test Gemini 2.5 Flash image generation
            const result = await backendApi.generateProductImages({
                sessionId: 'demo-session',
                prompts: ['A beautiful handcrafted ceramic vase with traditional patterns'],
                style: 'photorealistic',
                count: 1
            });
            
            console.log('🎨 Gemini 2.5 Flash Result:', result);
            if (result.success && result.generatedImages.length > 0) {
                alert('Gemini 2.5 Flash image generation successful! Check console for details.');
            } else {
                alert('Gemini 2.5 Flash test completed but no images generated.');
            }
        } catch (error) {
            console.error('Gemini 2.5 Flash test failed:', error);
            alert('Gemini 2.5 Flash test failed: ' + error.message);
        }
    };

    return (
        <div className="relative flex h-full w-full flex-col bg-background-main">
            <button
                className="absolute top-4 left-4 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-background-main/80 backdrop-blur-sm hover:bg-background-light transition-colors shadow-sm"
                onClick={onBack}
            >
                <span className="material-symbols-outlined text-primary-text text-lg">arrow_back</span>
            </button>

            <div className="flex-1 overflow-y-auto p-6 pt-16">
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-primary-text mb-2">
                            Enhanced Product Processing Demo
                        </h1>
                        <p className="text-secondary-text">
                            Test Gemini Knowledge Base + Gemini 2.5 Flash Image Generation
                        </p>
                    </div>

                    {/* Service Status */}
                    <div className="bg-background-light rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-primary-text">Service Status</h3>
                            <button
                                onClick={checkServiceStatus}
                                className="text-sm text-primary-brand hover:underline"
                            >
                                Check Status
                            </button>
                        </div>

                        {serviceStatus ? (
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span>Gemini Knowledge Base:</span>
                                    <span className={`px-2 py-1 rounded text-xs ${serviceStatus.geminiKnowledgeBase.available
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {serviceStatus.geminiKnowledgeBase.available ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Gemini 2.5 Flash Image:</span>
                                    <span className={`px-2 py-1 rounded text-xs ${serviceStatus.nanoBananaImageCleaner.available
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {serviceStatus.nanoBananaImageCleaner.available ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Overall Status:</span>
                                    <span className={`px-2 py-1 rounded text-xs ${serviceStatus.overallStatus === 'operational'
                                        ? 'bg-green-100 text-green-800'
                                        : serviceStatus.overallStatus === 'partial'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                        {serviceStatus.overallStatus}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-secondary-text text-sm">Click "Check Status" to verify services</p>
                        )}
                    </div>

                    {/* Individual Service Tests */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-background-light rounded-lg p-4">
                            <h3 className="font-semibold text-primary-text mb-2">🧠 Gemini Knowledge Base</h3>
                            <p className="text-sm text-secondary-text mb-3">
                                Test AI-powered product knowledge generation
                            </p>
                            <button
                                onClick={testGeminiKnowledge}
                                className="w-full bg-primary-brand text-white py-2 px-4 rounded-lg hover:bg-primary-brand/90 transition-colors"
                            >
                                Test Gemini API
                            </button>
                        </div>

                        <div className="bg-background-light rounded-lg p-4">
                            <h3 className="font-semibold text-primary-text mb-2">🎨 Gemini 2.5 Flash Image</h3>
                            <p className="text-sm text-secondary-text mb-3">
                                Test AI-powered image generation
                            </p>
                            <button
                                onClick={testGemini25Flash}
                                className="w-full bg-primary-brand text-white py-2 px-4 rounded-lg hover:bg-primary-brand/90 transition-colors"
                            >
                                Test Image Generation
                            </button>
                        </div>
                    </div>

                    {/* Full Demo */}
                    <div className="bg-background-light rounded-lg p-6">
                        <h3 className="font-semibold text-primary-text mb-3">🚀 Full Enhanced Processing Demo</h3>
                        <p className="text-secondary-text mb-4">
                            Run a complete demo that combines Gemini knowledge generation with Gemini 2.5 Flash image enhancement
                        </p>

                        <button
                            onClick={runDemo}
                            disabled={isProcessing}
                            className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${isProcessing
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-primary-brand text-white hover:bg-primary-brand/90'
                                }`}
                        >
                            {isProcessing ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Processing Demo...
                                </div>
                            ) : (
                                'Run Full Demo'
                            )}
                        </button>
                    </div>

                    {/* Demo Results */}
                    {demoResults && (
                        <div className="bg-background-light rounded-lg p-6">
                            <h3 className="font-semibold text-primary-text mb-3">📊 Demo Results</h3>

                            {demoResults.error ? (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-red-800 font-medium">Demo Error:</p>
                                    <p className="text-red-600 text-sm mt-1">{demoResults.error}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <p className="text-green-800 font-medium">✅ Demo Completed Successfully!</p>
                                        <div className="mt-2 text-sm text-green-700">
                                            <p>Processing Time: {demoResults.processingMetrics?.totalProcessingTime}ms</p>
                                            <p>Knowledge Generation: {demoResults.processingMetrics?.knowledgeGenerationTime}ms</p>
                                            <p>Image Cleaning: {demoResults.processingMetrics?.imageCleaningTime}ms</p>
                                        </div>
                                    </div>

                                    {demoResults.enhancedListing && (
                                        <div className="border border-border-color rounded-lg p-4">
                                            <h4 className="font-medium text-primary-text mb-2">Generated Listing:</h4>
                                            <div className="text-sm space-y-2">
                                                <p><strong>Title:</strong> {demoResults.enhancedListing.title}</p>
                                                <p><strong>Price:</strong> ${demoResults.enhancedListing.price}</p>
                                                <p><strong>Category:</strong> {demoResults.enhancedListing.category}</p>
                                                <p><strong>Features:</strong> {demoResults.enhancedListing.features?.slice(0, 3).join(', ')}...</p>
                                            </div>
                                        </div>
                                    )}

                                    {demoResults.processingMetrics?.enhancementsApplied && (
                                        <div className="border border-border-color rounded-lg p-4">
                                            <h4 className="font-medium text-primary-text mb-2">Enhancements Applied:</h4>
                                            <ul className="text-sm space-y-1">
                                                {demoResults.processingMetrics.enhancementsApplied.map((enhancement: string, index: number) => (
                                                    <li key={index} className="flex items-start">
                                                        <span className="text-green-500 mr-2">•</span>
                                                        {enhancement}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* API Key Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-800 mb-2">🔑 API Configuration</h4>
                        <p className="text-blue-700 text-sm">
                            Gemini API Key: {process.env.GEMINI_API_KEY ? 'Configured ✅' : 'Not configured ❌'}
                        </p>
                        <p className="text-blue-700 text-sm mt-1">
                            Gemini 2.5 Flash: AI-powered image generation and enhancement
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnhancedProductDemo;