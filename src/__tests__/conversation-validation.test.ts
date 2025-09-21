import { firebaseService } from '../services/firebase-service';
import { conversationPersistenceService } from '../services/conversation-persistence-service';
import { processUserSpeech, generateAISpeech, manageConversation } from '../services/api';
import { ConversationStage, Language, ConversationData } from '../types';

// Mock services
jest.mock('../services/firebase-service');
jest.mock('../services/conversation-persistence-service');

describe('Conversation Data Validation Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Conversation Data Persistence Validation', () => {
        it('should validate conversation data integrity across all scenarios', async () => {
            const mockFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;
            const mockPersistenceService = conversationPersistenceService as jest.Mocked<typeof conversationPersistenceService>;

            // Test scenario 1: Complete conversation flow
            const completeConversationData: ConversationData = {
                id: 'validation-conv-1',
                userId: 'validation-user-1',
                language: 'en',
                turns: [
                    {
                        id: 'turn-1',
                        type: 'ai_question',
                        content: 'Hello! What would you like to create today?',
                        timestamp: new Date(Date.now() - 300000),
                        language: 'en'
                    },
                    {
                        id: 'turn-2',
                        type: 'user_response',
                        content: 'I made a ceramic vase',
                        timestamp: new Date(Date.now() - 240000),
                        language: 'en',
                        audioUrl: 'https://storage.example.com/audio/turn-2.wav'
                    },
                    {
                        id: 'turn-3',
                        type: 'ai_question',
                        content: 'That sounds wonderful! What materials did you use?',
                        timestamp: new Date(Date.now() - 180000),
                        language: 'en',
                        audioUrl: 'https://storage.example.com/audio/turn-3.wav'
                    },
                    {
                        id: 'turn-4',
                        type: 'user_response',
                        content: 'I used local red clay and blue glaze',
                        timestamp: new Date(Date.now() - 120000),
                        language: 'en'
                    }
                ],
                extractedInfo: {
                    productType: 'ceramic vase',
                    materials: ['red clay', 'blue glaze'],
                    colors: ['blue'],
                    craftingProcess: 'pottery wheel, traditional techniques',
                    culturalSignificance: 'traditional Indian pottery',
                    pricing: {
                        cost: 2500,
                        currency: 'INR',
                        factors: ['materials', 'time', 'craftsmanship']
                    },
                    uniqueFeatures: ['handmade', 'traditional design'],
                    dimensions: {
                        height: 25,
                        width: 15,
                        unit: 'cm'
                    }
                },
                status: 'completed',
                startedAt: new Date(Date.now() - 300000),
                completedAt: new Date(),
                summary: 'User created a ceramic vase using traditional techniques with local materials'
            };

            // Mock successful save
            mockPersistenceService.saveConversation.mockResolvedValue();
            mockPersistenceService.loadConversation.mockResolvedValue(completeConversationData);

            // Save conversation
            await conversationPersistenceService.saveConversation(completeConversationData);

            // Load and validate
            const loadedConversation = await conversationPersistenceService.loadConversation('validation-conv-1');

            // Validate data integrity
            expect(loadedConversation).toEqual(completeConversationData);
            expect(loadedConversation?.turns).toHaveLength(4);
            expect(loadedConversation?.extractedInfo.productType).toBe('ceramic vase');
            expect(loadedConversation?.extractedInfo.materials).toContain('red clay');
            expect(loadedConversation?.extractedInfo.pricing?.cost).toBe(2500);
            expect(loadedConversation?.status).toBe('completed');

            // Validate turn sequence
            const turns = loadedConversation?.turns || [];
            expect(turns[0].type).toBe('ai_question');
            expect(turns[1].type).toBe('user_response');
            expect(turns[2].type).toBe('ai_question');
            expect(turns[3].type).toBe('user_response');

            // Validate timestamps are in order
            for (let i = 1; i < turns.length; i++) {
                expect(turns[i].timestamp.getTime()).toBeGreaterThan(turns[i - 1].timestamp.getTime());
            }
        });

        it('should handle incomplete conversation data gracefully', async () => {
            const mockPersistenceService = conversationPersistenceService as jest.Mocked<typeof conversationPersistenceService>;

            const incompleteConversationData: Partial<ConversationData> = {
                id: 'incomplete-conv-1',
                userId: 'test-user-1',
                language: 'en',
                turns: [
                    {
                        id: 'turn-1',
                        type: 'ai_question',
                        content: 'Hello! What would you like to create today?',
                        timestamp: new Date(),
                        language: 'en'
                    }
                ],
                extractedInfo: {
                    productType: 'unknown',
                    materials: [],
                    colors: [],
                    uniqueFeatures: []
                },
                status: 'in_progress',
                startedAt: new Date()
                // Missing completedAt, summary
            };

            mockPersistenceService.saveConversation.mockResolvedValue();
            mockPersistenceService.loadConversation.mockResolvedValue(incompleteConversationData as ConversationData);

            // Should handle incomplete data without errors
            await conversationPersistenceService.saveConversation(incompleteConversationData as ConversationData);
            const loadedConversation = await conversationPersistenceService.loadConversation('incomplete-conv-1');

            expect(loadedConversation?.status).toBe('in_progress');
            expect(loadedConversation?.completedAt).toBeUndefined();
            expect(loadedConversation?.extractedInfo.productType).toBe('unknown');
        });

        it('should validate conversation data across app restarts', async () => {
            const mockPersistenceService = conversationPersistenceService as jest.Mocked<typeof conversationPersistenceService>;

            // Simulate app restart scenario
            const conversationBeforeRestart = global.testUtils.createMockConversationData({
                id: 'restart-conv-1',
                status: 'in_progress',
                turns: [
                    global.testUtils.createMockConversationTurn('ai_question', 'What are you making?'),
                    global.testUtils.createMockConversationTurn('user_response', 'A wooden sculpture')
                ]
            });

            // Save before "restart"
            mockPersistenceService.saveConversation.mockResolvedValue();
            await conversationPersistenceService.saveConversation(conversationBeforeRestart);

            // Simulate app restart - clear memory, load from persistence
            mockPersistenceService.loadConversation.mockResolvedValue(conversationBeforeRestart);
            mockPersistenceService.getAllConversations.mockResolvedValue([conversationBeforeRestart]);

            // Load conversation after "restart"
            const conversationAfterRestart = await conversationPersistenceService.loadConversation('restart-conv-1');
            const allConversations = await conversationPersistenceService.getAllConversations();

            // Validate data persistence
            expect(conversationAfterRestart).toEqual(conversationBeforeRestart);
            expect(allConversations).toHaveLength(1);
            expect(allConversations[0].id).toBe('restart-conv-1');
            expect(allConversations[0].status).toBe('in_progress');
        });

        it('should validate conversation data under network failures', async () => {
            const mockFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;
            const mockPersistenceService = conversationPersistenceService as jest.Mocked<typeof conversationPersistenceService>;

            const conversationData = global.testUtils.createMockConversationData({
                id: 'network-failure-conv-1',
                status: 'in_progress'
            });

            // Simulate network failure during save
            mockFirebaseService.callFunction.mockRejectedValue({
                error: 'NETWORK_ERROR',
                message: 'Failed to save to server'
            });

            // Should fall back to local storage
            mockPersistenceService.saveConversationOffline.mockResolvedValue();
            mockPersistenceService.loadConversation.mockResolvedValue(conversationData);

            try {
                await firebaseService.callFunction('saveConversation', { conversationData });
            } catch (error) {
                // Handle network failure by saving offline
                await conversationPersistenceService.saveConversationOffline(conversationData);
            }

            // Verify offline save was called
            expect(mockPersistenceService.saveConversationOffline).toHaveBeenCalledWith(conversationData);

            // Should still be able to load conversation
            const loadedConversation = await conversationPersistenceService.loadConversation('network-failure-conv-1');
            expect(loadedConversation).toEqual(conversationData);
        });
    });

    describe('Export Data Validation', () => {
        it('should validate conversation data before marketplace export', async () => {
            const mockFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;

            // Test with complete conversation data
            const completeConversationData = global.testUtils.createMockConversationData({
                id: 'export-validation-conv-1',
                status: 'completed',
                extractedInfo: {
                    productType: 'ceramic bowl',
                    materials: ['clay', 'glaze'],
                    colors: ['blue', 'white'],
                    craftingProcess: 'wheel throwing, glazing',
                    culturalSignificance: 'traditional pottery',
                    pricing: {
                        cost: 1500,
                        currency: 'INR',
                        factors: ['materials', 'time']
                    },
                    uniqueFeatures: ['handmade', 'food-safe'],
                    dimensions: {
                        height: 8,
                        width: 12,
                        unit: 'cm'
                    }
                }
            });

            mockFirebaseService.callFunction.mockImplementation((functionName, data) => {
                if (functionName === 'validateForExport') {
                    const validation = validateConversationForExport(data.conversationData);
                    return Promise.resolve(validation);
                }
                if (functionName === 'exportToMarketplace') {
                    return Promise.resolve({
                        success: true,
                        exportId: 'export-123',
                        marketplace: data.marketplace,
                        listingUrl: `https://${data.marketplace}.com/listing/123`
                    });
                }
                return Promise.resolve({ success: true });
            });

            function validateConversationForExport(conversationData: ConversationData) {
                const requiredFields = ['productType', 'materials', 'colors'];
                const missingFields = requiredFields.filter(field =>
                    !conversationData.extractedInfo[field as keyof typeof conversationData.extractedInfo] ||
                    (Array.isArray(conversationData.extractedInfo[field as keyof typeof conversationData.extractedInfo]) &&
                        (conversationData.extractedInfo[field as keyof typeof conversationData.extractedInfo] as any[]).length === 0)
                );

                return {
                    valid: missingFields.length === 0,
                    missingFields,
                    completionScore: calculateCompletionScore(conversationData),
                    recommendations: generateExportRecommendations(conversationData)
                };
            }

            function calculateCompletionScore(conversationData: ConversationData) {
                const fields = ['productType', 'materials', 'colors', 'craftingProcess', 'pricing'];
                const completedFields = fields.filter(field => {
                    const value = conversationData.extractedInfo[field as keyof typeof conversationData.extractedInfo];
                    return value && (typeof value !== 'object' || Object.keys(value).length > 0);
                });
                return completedFields.length / fields.length;
            }

            function generateExportRecommendations(conversationData: ConversationData) {
                const recommendations = [];
                if (!conversationData.extractedInfo.dimensions) {
                    recommendations.push('Add product dimensions for better marketplace listings');
                }
                if (!conversationData.extractedInfo.pricing) {
                    recommendations.push('Set pricing information for marketplace export');
                }
                return recommendations;
            }

            // Validate complete conversation data
            const validation = await firebaseService.callFunction('validateForExport', {
                conversationData: completeConversationData
            });

            expect(validation.valid).toBe(true);
            expect(validation.missingFields).toHaveLength(0);
            expect(validation.completionScore).toBeGreaterThan(0.8);

            // Export should succeed
            const exportResult = await firebaseService.callFunction('exportToMarketplace', {
                conversationData: completeConversationData,
                marketplace: 'etsy'
            });

            expect(exportResult.success).toBe(true);
            expect(exportResult.listingUrl).toContain('etsy.com');
        });

        it('should reject export for incomplete conversation data', async () => {
            const mockFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;

            const incompleteConversationData = global.testUtils.createMockConversationData({
                id: 'incomplete-export-conv-1',
                status: 'in_progress',
                extractedInfo: {
                    productType: 'unknown',
                    materials: [],
                    colors: [],
                    uniqueFeatures: []
                }
            });

            mockFirebaseService.callFunction.mockImplementation((functionName, data) => {
                if (functionName === 'validateForExport') {
                    return Promise.resolve({
                        valid: false,
                        missingFields: ['productType', 'materials', 'colors'],
                        completionScore: 0.2,
                        recommendations: [
                            'Complete the conversation to gather product information',
                            'Provide product type and materials information',
                            'Add color and crafting process details'
                        ]
                    });
                }
                if (functionName === 'exportToMarketplace') {
                    return Promise.reject({
                        error: 'VALIDATION_FAILED',
                        message: 'Conversation data is incomplete for export',
                        missingFields: ['productType', 'materials', 'colors']
                    });
                }
                return Promise.resolve({ success: true });
            });

            // Validation should fail
            const validation = await firebaseService.callFunction('validateForExport', {
                conversationData: incompleteConversationData
            });

            expect(validation.valid).toBe(false);
            expect(validation.missingFields).toContain('productType');
            expect(validation.missingFields).toContain('materials');
            expect(validation.completionScore).toBeLessThan(0.5);

            // Export should fail
            try {
                await firebaseService.callFunction('exportToMarketplace', {
                    conversationData: incompleteConversationData,
                    marketplace: 'etsy'
                });
                fail('Export should have failed for incomplete data');
            } catch (error: any) {
                expect(error.error).toBe('VALIDATION_FAILED');
                expect(error.missingFields).toContain('productType');
            }
        });
    });

    describe('Multilingual Data Validation', () => {
        it('should validate conversation data across different languages', async () => {
            const mockFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;
            const mockPersistenceService = conversationPersistenceService as jest.Mocked<typeof conversationPersistenceService>;

            const languages: Language[] = ['en', 'hi', 'bn', 'ta'];
            const conversationDataByLanguage: { [key: string]: ConversationData } = {};

            // Create conversation data for each language
            languages.forEach(language => {
                conversationDataByLanguage[language] = global.testUtils.createMockConversationData({
                    id: `multilingual-conv-${language}`,
                    language,
                    turns: [
                        {
                            id: `turn-1-${language}`,
                            type: 'ai_question',
                            content: getLocalizedContent(language, 'greeting'),
                            timestamp: new Date(),
                            language
                        },
                        {
                            id: `turn-2-${language}`,
                            type: 'user_response',
                            content: getLocalizedContent(language, 'product_description'),
                            timestamp: new Date(),
                            language
                        }
                    ],
                    extractedInfo: {
                        productType: getLocalizedContent(language, 'product_type'),
                        materials: [getLocalizedContent(language, 'material')],
                        colors: [getLocalizedContent(language, 'color')],
                        uniqueFeatures: []
                    }
                });
            });

            function getLocalizedContent(language: string, type: string) {
                const content: { [key: string]: { [key: string]: string } } = {
                    en: {
                        greeting: 'Hello! What would you like to create today?',
                        product_description: 'I made a ceramic vase',
                        product_type: 'ceramic vase',
                        material: 'clay',
                        color: 'blue'
                    },
                    hi: {
                        greeting: 'नमस्ते! आप आज क्या बनाना चाहते हैं?',
                        product_description: 'मैंने एक मिट्टी का फूलदान बनाया',
                        product_type: 'मिट्टी का फूलदान',
                        material: 'मिट्टी',
                        color: 'नीला'
                    },
                    bn: {
                        greeting: 'হ্যালো! আপনি আজ কী তৈরি করতে চান?',
                        product_description: 'আমি একটি মাটির ফুলদানি তৈরি করেছি',
                        product_type: 'মাটির ফুলদানি',
                        material: 'মাটি',
                        color: 'নীল'
                    },
                    ta: {
                        greeting: 'வணக்கம்! இன்று நீங்கள் என்ன உருவாக்க விரும்புகிறீர்கள்?',
                        product_description: 'நான் ஒரு களிமண் குவளை செய்தேன்',
                        product_type: 'களிமண் குவளை',
                        material: 'களிமண்',
                        color: 'நீலம்'
                    }
                };
                return content[language]?.[type] || content.en[type];
            }

            // Mock persistence for all languages
            mockPersistenceService.saveConversation.mockResolvedValue();
            mockPersistenceService.loadConversation.mockImplementation((id) => {
                const language = id.split('-').pop() as string;
                return Promise.resolve(conversationDataByLanguage[language]);
            });

            // Save and validate each language
            for (const language of languages) {
                const conversationData = conversationDataByLanguage[language];

                await conversationPersistenceService.saveConversation(conversationData);
                const loadedConversation = await conversationPersistenceService.loadConversation(conversationData.id);

                // Validate language-specific data
                expect(loadedConversation?.language).toBe(language);
                expect(loadedConversation?.turns[0].language).toBe(language);
                expect(loadedConversation?.turns[1].language).toBe(language);

                // Validate localized content
                expect(loadedConversation?.turns[0].content).toBe(getLocalizedContent(language, 'greeting'));
                expect(loadedConversation?.turns[1].content).toBe(getLocalizedContent(language, 'product_description'));
                expect(loadedConversation?.extractedInfo.productType).toBe(getLocalizedContent(language, 'product_type'));
            }
        });
    });

    describe('Performance Data Validation', () => {
        it('should validate conversation performance metrics', async () => {
            const mockFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;

            const performanceMetrics = {
                speechProcessingTime: [],
                questionGenerationTime: [],
                ttsGenerationTime: [],
                totalConversationTime: 0
            };

            mockFirebaseService.callFunction.mockImplementation((functionName) => {
                const processingTime = Math.random() * 2000 + 500; // 500-2500ms

                switch (functionName) {
                    case 'processUserSpeech':
                        performanceMetrics.speechProcessingTime.push(processingTime);
                        return Promise.resolve({
                            success: true,
                            transcript: 'Test speech',
                            processingTime
                        });
                    case 'manageConversation':
                        performanceMetrics.questionGenerationTime.push(processingTime);
                        return Promise.resolve({
                            success: true,
                            question: 'Test question',
                            processingTime
                        });
                    case 'generateAISpeech':
                        performanceMetrics.ttsGenerationTime.push(processingTime);
                        return Promise.resolve({
                            success: true,
                            audioBlob: global.testUtils.createMockAudioBlob('tts'),
                            processingTime
                        });
                    default:
                        return Promise.resolve({ success: true });
                }
            });

            const conversationStartTime = Date.now();

            // Simulate conversation with performance tracking
            for (let i = 0; i < 5; i++) {
                // User speech processing
                const audioBlob = global.testUtils.createMockAudioBlob(`speech ${i}`);
                await processUserSpeech({
                    audioBlob,
                    language: 'en' as Language
                });

                // AI question generation
                await manageConversation({
                    action: 'continue',
                    conversationId: 'performance-test-conv',
                    userResponse: `Response ${i}`
                });

                // AI speech generation
                await generateAISpeech({
                    text: `Question ${i}`,
                    language: 'en' as Language
                });
            }

            performanceMetrics.totalConversationTime = Date.now() - conversationStartTime;

            // Validate performance metrics
            const avgSpeechProcessing = performanceMetrics.speechProcessingTime.reduce((a, b) => a + b, 0) / performanceMetrics.speechProcessingTime.length;
            const avgQuestionGeneration = performanceMetrics.questionGenerationTime.reduce((a, b) => a + b, 0) / performanceMetrics.questionGenerationTime.length;
            const avgTTSGeneration = performanceMetrics.ttsGenerationTime.reduce((a, b) => a + b, 0) / performanceMetrics.ttsGenerationTime.length;

            // Performance thresholds
            expect(avgSpeechProcessing).toBeLessThan(3000); // Under 3 seconds
            expect(avgQuestionGeneration).toBeLessThan(2000); // Under 2 seconds
            expect(avgTTSGeneration).toBeLessThan(2000); // Under 2 seconds
            expect(performanceMetrics.totalConversationTime).toBeLessThan(30000); // Under 30 seconds total

            // Validate no performance degradation
            const speechTimes = performanceMetrics.speechProcessingTime;
            const lastThree = speechTimes.slice(-3);
            const firstThree = speechTimes.slice(0, 3);
            const avgLast = lastThree.reduce((a, b) => a + b, 0) / lastThree.length;
            const avgFirst = firstThree.reduce((a, b) => a + b, 0) / firstThree.length;

            // Performance should not degrade significantly over time
            expect(avgLast).toBeLessThan(avgFirst * 1.5); // No more than 50% slower
        });
    });
});