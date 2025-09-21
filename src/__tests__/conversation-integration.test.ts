import { processUserSpeech, generateAISpeech, manageConversation } from '../services/api';
import { conversationPersistenceService } from '../services/conversation-persistence-service';
import { conversationErrorService } from '../services/conversation-error-service';
import { ConversationStage, ConversationData, Language } from '../types';

// Mock all services
jest.mock('../services/firebase-service');
jest.mock('../services/conversation-persistence-service');
jest.mock('../services/conversation-error-service');

describe('Conversation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Conversation Flow', () => {
    it('should complete a full conversation from start to finish', async () => {
      // Mock the complete conversation flow
      const mockConversationId = 'integration-test-conv-1';
      const mockUserId = 'integration-test-user-1';
      
      // Step 1: Start conversation
      const { firebaseService } = require('../services/firebase-service');
      firebaseService.callFunction.mockResolvedValueOnce({
        success: true,
        question: 'Hello! What would you like to create today?',
        conversationId: mockConversationId,
        stage: ConversationStage.INTRODUCTION
      });

      let result = await manageConversation({
        action: 'start',
        language: 'en' as Language,
        userId: mockUserId
      });

      expect(result.success).toBe(true);
      expect(result.conversationId).toBe(mockConversationId);
      expect(result.stage).toBe(ConversationStage.INTRODUCTION);

      // Step 2: User responds with product description
      const userAudioBlob = global.testUtils.createMockAudioBlob('I made a ceramic vase');
      
      firebaseService.callFunction.mockResolvedValueOnce({
        success: true,
        transcript: 'I made a ceramic vase',
        confidence: 0.95,
        extractedInfo: {
          productType: 'ceramic vase'
        }
      });

      const speechResult = await processUserSpeech({
        audioBlob: userAudioBlob,
        language: 'en'
      });

      expect(speechResult.success).toBe(true);
      expect(speechResult.transcript).toBe('I made a ceramic vase');
      expect(speechResult.extractedInfo.productType).toBe('ceramic vase');

      // Step 3: AI asks follow-up question about materials
      firebaseService.callFunction.mockResolvedValueOnce({
        success: true,
        question: 'That sounds wonderful! What materials did you use to make this ceramic vase?',
        conversationId: mockConversationId,
        stage: ConversationStage.BASIC_INFO,
        extractedInfo: {
          productType: 'ceramic vase'
        }
      });

      result = await manageConversation({
        action: 'continue',
        conversationId: mockConversationId,
        userResponse: 'I made a ceramic vase',
        currentStage: ConversationStage.INTRODUCTION
      });

      expect(result.question).toContain('materials');
      expect(result.stage).toBe(ConversationStage.BASIC_INFO);

      // Step 4: Generate AI speech for the question
      const mockTTSBlob = global.testUtils.createMockAudioBlob('tts audio', 'audio/wav');
      
      firebaseService.callFunction.mockResolvedValueOnce({
        success: true,
        audioBlob: mockTTSBlob,
        duration: 3.2
      });

      const ttsResult = await generateAISpeech({
        text: result.question,
        language: 'en'
      });

      expect(ttsResult.success).toBe(true);
      expect(ttsResult.audioBlob).toBeDefined();

      // Step 5: User responds with materials information
      const materialsAudioBlob = global.testUtils.createMockAudioBlob('I used local red clay and blue glaze');
      
      firebaseService.callFunction.mockResolvedValueOnce({
        success: true,
        transcript: 'I used local red clay and blue glaze',
        confidence: 0.92,
        extractedInfo: {
          materials: ['red clay'],
          colors: ['blue'],
          techniques: ['glazing']
        }
      });

      const materialsResult = await processUserSpeech({
        audioBlob: materialsAudioBlob,
        language: 'en'
      });

      expect(materialsResult.extractedInfo.materials).toContain('red clay');
      expect(materialsResult.extractedInfo.colors).toContain('blue');

      // Step 6: Continue conversation through all stages
      const conversationStages = [
        {
          stage: ConversationStage.MATERIALS_CRAFTING,
          question: 'How did you shape and craft this vase?',
          userResponse: 'I used a pottery wheel and traditional techniques',
          extractedInfo: { craftingProcess: 'pottery wheel, traditional techniques' }
        },
        {
          stage: ConversationStage.CULTURAL_SIGNIFICANCE,
          question: 'Does this vase have any cultural or traditional significance?',
          userResponse: 'It\'s inspired by traditional Indian pottery from my village',
          extractedInfo: { culturalSignificance: 'traditional Indian pottery' }
        },
        {
          stage: ConversationStage.PRICING_MARKET,
          question: 'What do you think would be a fair price for this vase?',
          userResponse: 'I think around 2500 rupees would be fair',
          extractedInfo: { pricing: { cost: 2500, currency: 'INR' } }
        }
      ];

      let accumulatedInfo = {
        productType: 'ceramic vase',
        materials: ['red clay'],
        colors: ['blue'],
        techniques: ['glazing']
      };

      for (const stageData of conversationStages) {
        // AI asks stage-specific question
        firebaseService.callFunction.mockResolvedValueOnce({
          success: true,
          question: stageData.question,
          conversationId: mockConversationId,
          stage: stageData.stage,
          extractedInfo: accumulatedInfo
        });

        result = await manageConversation({
          action: 'continue',
          conversationId: mockConversationId,
          userResponse: 'Previous response',
          currentStage: stageData.stage
        });

        expect(result.question).toBe(stageData.question);
        expect(result.stage).toBe(stageData.stage);

        // User responds
        const stageAudioBlob = global.testUtils.createMockAudioBlob(stageData.userResponse);
        
        firebaseService.callFunction.mockResolvedValueOnce({
          success: true,
          transcript: stageData.userResponse,
          confidence: 0.90,
          extractedInfo: stageData.extractedInfo
        });

        const stageResult = await processUserSpeech({
          audioBlob: stageAudioBlob,
          language: 'en'
        });

        expect(stageResult.transcript).toBe(stageData.userResponse);
        
        // Accumulate extracted information
        accumulatedInfo = { ...accumulatedInfo, ...stageData.extractedInfo };
      }

      // Step 7: Complete conversation
      const finalConversationData: ConversationData = {
        id: mockConversationId,
        userId: mockUserId,
        language: 'en',
        turns: [
          global.testUtils.createMockConversationTurn('ai_question', 'Hello! What would you like to create today?'),
          global.testUtils.createMockConversationTurn('user_response', 'I made a ceramic vase'),
          global.testUtils.createMockConversationTurn('ai_question', 'What materials did you use?'),
          global.testUtils.createMockConversationTurn('user_response', 'I used local red clay and blue glaze')
        ],
        extractedInfo: {
          productType: 'ceramic vase',
          materials: ['red clay'],
          colors: ['blue'],
          craftingProcess: 'pottery wheel, traditional techniques',
          culturalSignificance: 'traditional Indian pottery',
          pricing: { cost: 2500, currency: 'INR', factors: [] },
          uniqueFeatures: []
        },
        status: 'completed',
        startedAt: new Date(Date.now() - 600000), // 10 minutes ago
        completedAt: new Date(),
        summary: 'User created a ceramic vase using traditional techniques'
      };

      firebaseService.callFunction.mockResolvedValueOnce({
        success: true,
        conversationComplete: true,
        conversationData: finalConversationData,
        completionScore: 0.95
      });

      const completionResult = await manageConversation({
        action: 'complete',
        conversationId: mockConversationId,
        conversationData: finalConversationData
      });

      expect(completionResult.conversationComplete).toBe(true);
      expect(completionResult.completionScore).toBeGreaterThan(0.9);
      expect(completionResult.conversationData.status).toBe('completed');
    });

    it('should handle conversation with errors and recovery', async () => {
      const mockConversationId = 'error-recovery-conv-1';
      
      // Start conversation successfully
      const { firebaseService } = require('../services/firebase-service');
      firebaseService.callFunction.mockResolvedValueOnce({
        success: true,
        question: 'Hello! What would you like to create today?',
        conversationId: mockConversationId,
        stage: ConversationStage.INTRODUCTION
      });

      let result = await manageConversation({
        action: 'start',
        language: 'en' as Language
      });

      expect(result.success).toBe(true);

      // Simulate speech recognition error
      const poorQualityAudio = global.testUtils.createMockAudioBlob('unclear audio');
      
      firebaseService.callFunction.mockRejectedValueOnce({
        error: 'SPEECH_RECOGNITION_FAILED',
        message: 'Could not understand the audio',
        confidence: 0.2
      });

      // Mock error service response
      const mockConversationErrorService = conversationErrorService as jest.Mocked<typeof conversationErrorService>;
      mockConversationErrorService.handleError.mockReturnValue({
        action: 'retry_with_fallback',
        userMessage: 'I didn\'t catch that. Could you try again or type your response?',
        fallbackOptions: ['text_input', 'retry_audio'],
        retryDelay: 1000
      });

      try {
        await processUserSpeech({
          audioBlob: poorQualityAudio,
          language: 'en'
        });
      } catch (error: any) {
        expect(error.error).toBe('SPEECH_RECOGNITION_FAILED');
        
        // Handle error through error service
        const recovery = conversationErrorService.handleError({
          type: 'speech_recognition',
          code: 'LOW_CONFIDENCE',
          message: error.message,
          recoverable: true,
          context: { conversationId: mockConversationId }
        });

        expect(recovery.action).toBe('retry_with_fallback');
        expect(recovery.fallbackOptions).toContain('text_input');
      }

      // Retry with text input fallback
      firebaseService.callFunction.mockResolvedValueOnce({
        success: true,
        transcript: 'I made a wooden sculpture',
        confidence: 1.0,
        inputMethod: 'text_fallback',
        extractedInfo: {
          productType: 'wooden sculpture'
        }
      });

      const fallbackResult = await manageConversation({
        action: 'process_text_input',
        conversationId: mockConversationId,
        textInput: 'I made a wooden sculpture'
      });

      expect(fallbackResult.success).toBe(true);
      expect(fallbackResult.inputMethod).toBe('text_fallback');

      // Continue conversation normally after recovery
      firebaseService.callFunction.mockResolvedValueOnce({
        success: true,
        question: 'That sounds amazing! What type of wood did you use?',
        conversationId: mockConversationId,
        stage: ConversationStage.BASIC_INFO
      });

      result = await manageConversation({
        action: 'continue',
        conversationId: mockConversationId,
        userResponse: 'I made a wooden sculpture'
      });

      expect(result.question).toContain('wood');
      expect(result.stage).toBe(ConversationStage.BASIC_INFO);
    });

    it('should handle multilingual conversation switching', async () => {
      const mockConversationId = 'multilingual-conv-1';
      
      // Start conversation in English
      const { firebaseService } = require('../services/firebase-service');
      firebaseService.callFunction.mockResolvedValueOnce({
        success: true,
        question: 'Hello! What would you like to create today?',
        conversationId: mockConversationId,
        stage: ConversationStage.INTRODUCTION,
        language: 'en'
      });

      let result = await manageConversation({
        action: 'start',
        language: 'en' as Language
      });

      expect(result.language).toBe('en');

      // User responds in Hindi
      const hindiAudioBlob = global.testUtils.createMockAudioBlob('मैंने एक मिट्टी का बर्तन बनाया');
      
      firebaseService.callFunction.mockResolvedValueOnce({
        success: true,
        transcript: 'मैंने एक मिट्टी का बर्तन बनाया',
        confidence: 0.93,
        detectedLanguage: 'hi',
        translation: 'I made a clay pot',
        extractedInfo: {
          productType: 'clay pot'
        }
      });

      const hindiResult = await processUserSpeech({
        audioBlob: hindiAudioBlob,
        language: 'en' // Started in English but detected Hindi
      });

      expect(hindiResult.detectedLanguage).toBe('hi');
      expect(hindiResult.translation).toBe('I made a clay pot');

      // AI switches to Hindi for follow-up
      firebaseService.callFunction.mockResolvedValueOnce({
        success: true,
        question: 'वाह! आपने कौन सी मिट्टी का उपयोग किया?',
        conversationId: mockConversationId,
        stage: ConversationStage.BASIC_INFO,
        language: 'hi'
      });

      result = await manageConversation({
        action: 'continue',
        conversationId: mockConversationId,
        userResponse: hindiResult.transcript,
        detectedLanguage: 'hi'
      });

      expect(result.language).toBe('hi');
      expect(result.question).toContain('मिट्टी');

      // Generate Hindi TTS
      const hindiTTSBlob = global.testUtils.createMockAudioBlob('hindi tts audio');
      
      firebaseService.callFunction.mockResolvedValueOnce({
        success: true,
        audioBlob: hindiTTSBlob,
        language: 'hi',
        voice: 'hi-IN-female'
      });

      const hindiTTSResult = await generateAISpeech({
        text: result.question,
        language: 'hi'
      });

      expect(hindiTTSResult.language).toBe('hi');
      expect(hindiTTSResult.voice).toBe('hi-IN-female');
    });

    it('should persist conversation state throughout the flow', async () => {
      const mockConversationId = 'persistence-test-conv-1';
      const mockUserId = 'persistence-test-user-1';
      
      // Mock persistence service
      const mockPersistenceService = conversationPersistenceService as jest.Mocked<typeof conversationPersistenceService>;
      mockPersistenceService.saveConversation.mockResolvedValue();
      mockPersistenceService.updateConversation.mockResolvedValue();

      // Start conversation
      const { firebaseService } = require('../services/firebase-service');
      firebaseService.callFunction.mockResolvedValueOnce({
        success: true,
        question: 'Hello! What would you like to create today?',
        conversationId: mockConversationId,
        stage: ConversationStage.INTRODUCTION
      });

      await manageConversation({
        action: 'start',
        language: 'en' as Language,
        userId: mockUserId
      });

      // Verify initial conversation was saved
      expect(mockPersistenceService.saveConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockConversationId,
          userId: mockUserId,
          status: 'in_progress'
        })
      );

      // Add conversation turn
      const userAudioBlob = global.testUtils.createMockAudioBlob('I made a ceramic bowl');
      
      firebaseService.callFunction.mockResolvedValueOnce({
        success: true,
        transcript: 'I made a ceramic bowl',
        confidence: 0.94
      });

      await processUserSpeech({
        audioBlob: userAudioBlob,
        language: 'en'
      });

      // Continue conversation
      firebaseService.callFunction.mockResolvedValueOnce({
        success: true,
        question: 'What materials did you use for the bowl?',
        conversationId: mockConversationId,
        stage: ConversationStage.BASIC_INFO
      });

      await manageConversation({
        action: 'continue',
        conversationId: mockConversationId,
        userResponse: 'I made a ceramic bowl'
      });

      // Verify conversation state was updated
      expect(mockPersistenceService.updateConversation).toHaveBeenCalledWith(
        mockConversationId,
        expect.objectContaining({
          stage: ConversationStage.BASIC_INFO
        })
      );

      // Simulate app restart - load conversation
      const mockSavedConversation = global.testUtils.createMockConversationData({
        id: mockConversationId,
        userId: mockUserId,
        turns: [
          global.testUtils.createMockConversationTurn('ai_question', 'Hello! What would you like to create today?'),
          global.testUtils.createMockConversationTurn('user_response', 'I made a ceramic bowl'),
          global.testUtils.createMockConversationTurn('ai_question', 'What materials did you use for the bowl?')
        ]
      });

      mockPersistenceService.loadConversation.mockResolvedValue(mockSavedConversation);

      const loadedConversation = await conversationPersistenceService.loadConversation(mockConversationId);

      expect(loadedConversation).toEqual(mockSavedConversation);
      expect(loadedConversation?.turns).toHaveLength(3);
    });
  });

  describe('Performance Integration Tests', () => {
    it('should complete conversation within acceptable time limits', async () => {
      const startTime = Date.now();
      const mockConversationId = 'performance-test-conv-1';
      
      // Mock fast responses
      const { firebaseService } = require('../services/firebase-service');
      firebaseService.callFunction.mockImplementation(() => 
        Promise.resolve({
          success: true,
          question: 'Test question',
          conversationId: mockConversationId,
          stage: ConversationStage.INTRODUCTION,
          processingTime: 800
        })
      );

      // Start conversation
      await manageConversation({
        action: 'start',
        language: 'en' as Language
      });

      // Process speech
      const audioBlob = global.testUtils.createMockAudioBlob('test speech');
      await processUserSpeech({
        audioBlob: audioBlob,
        language: 'en'
      });

      // Generate TTS
      await generateAISpeech({
        text: 'Test question',
        language: 'en'
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete basic operations within 5 seconds
      expect(totalTime).toBeLessThan(5000);
    });

    it('should handle concurrent conversation operations', async () => {
      const concurrentOperations = 3;
      const promises = [];

      const { firebaseService } = require('../services/firebase-service');
      firebaseService.callFunction.mockImplementation((functionName, data) => 
        Promise.resolve({
          success: true,
          operationId: data.operationId || Math.random().toString(36),
          functionName
        })
      );

      // Start multiple conversations concurrently
      for (let i = 0; i < concurrentOperations; i++) {
        promises.push(
          manageConversation({
            action: 'start',
            language: 'en' as Language,
            operationId: `concurrent-${i}`
          })
        );
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(concurrentOperations);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.operationId).toBe(`concurrent-${index}`);
      });
    });
  });
});