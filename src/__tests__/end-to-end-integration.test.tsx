import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { firebaseService } from '../services/firebase-service';
import { conversationPersistenceService } from '../services/conversation-persistence-service';
import { ConversationStage, Language } from '../types';

// Mock all external services
jest.mock('../services/firebase-service');
jest.mock('../services/conversation-persistence-service');
jest.mock('../services/api');

// Mock Web APIs
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: jest.fn(),
    cancel: jest.fn(),
    getVoices: jest.fn(() => []),
    addEventListener: jest.fn()
  }
});

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn(() => Promise.resolve({
      getTracks: () => [{ stop: jest.fn() }]
    }))
  }
});

const renderApp = () => {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
};

describe('End-to-End Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Mock Firebase service responses
    const mockFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;
    mockFirebaseService.callFunction.mockImplementation((functionName, data) => {
      switch (functionName) {
        case 'manageConversation':
          return Promise.resolve({
            success: true,
            question: 'Hello! What would you like to create today?',
            conversationId: 'test-conv-1',
            stage: ConversationStage.INTRODUCTION
          });
        case 'processUserSpeech':
          return Promise.resolve({
            success: true,
            transcript: 'I made a ceramic vase',
            confidence: 0.95,
            extractedInfo: { productType: 'ceramic vase' }
          });
        case 'generateAISpeech':
          return Promise.resolve({
            success: true,
            audioBlob: global.testUtils.createMockAudioBlob('tts audio'),
            duration: 2.5
          });
        case 'generateListing':
          return Promise.resolve({
            success: true,
            listing: {
              title: 'Beautiful Handmade Ceramic Vase',
              description: 'A stunning ceramic vase crafted with traditional techniques...',
              price: 2500,
              currency: 'INR'
            }
          });
        case 'exportToMarketplace':
          return Promise.resolve({
            success: true,
            exportId: 'export-123',
            marketplace: data.marketplace,
            status: 'completed'
          });
        default:
          return Promise.resolve({ success: true });
      }
    });
  });

  describe('Complete User Flow', () => {
    it('should complete the entire flow from onboarding to export', async () => {
      const user = userEvent.setup();
      renderApp();

      // Step 1: Language Selection
      await waitFor(() => {
        expect(screen.getByText(/select your language/i)).toBeInTheDocument();
      });

      const englishButton = screen.getByText('English');
      await user.click(englishButton);

      // Step 2: Name Input
      await waitFor(() => {
        expect(screen.getByText(/what's your name/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText(/enter your name/i);
      await user.type(nameInput, 'Priya Sharma');

      const nameNextButton = screen.getByText(/next/i);
      await user.click(nameNextButton);

      // Step 3: Location Input
      await waitFor(() => {
        expect(screen.getByText(/where are you located/i)).toBeInTheDocument();
      });

      const locationInput = screen.getByPlaceholderText(/enter your location/i);
      await user.type(locationInput, 'Jaipur, Rajasthan');

      const locationNextButton = screen.getByText(/next/i);
      await user.click(locationNextButton);

      // Step 4: Conversation Interface
      await waitFor(() => {
        expect(screen.getByText(/start conversation/i)).toBeInTheDocument();
      });

      // Start conversation
      const startButton = screen.getByText(/start conversation/i);
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/hello! what would you like to create today/i)).toBeInTheDocument();
      });

      // Step 5: Voice Recording Simulation
      const recordButton = screen.getByRole('button', { name: /start recording/i });
      await user.click(recordButton);

      // Simulate recording state
      await waitFor(() => {
        expect(screen.getByText(/recording/i)).toBeInTheDocument();
      });

      // Stop recording
      const stopButton = screen.getByRole('button', { name: /stop recording/i });
      await user.click(stopButton);

      // Wait for speech processing
      await waitFor(() => {
        expect(screen.getByText(/i made a ceramic vase/i)).toBeInTheDocument();
      });

      // Step 6: Continue conversation through multiple turns
      const continueButton = screen.getByText(/continue/i);
      await user.click(continueButton);

      // Simulate multiple conversation turns
      for (let i = 0; i < 3; i++) {
        await waitFor(() => {
          expect(recordButton).toBeInTheDocument();
        });

        await user.click(recordButton);
        await user.click(stopButton);

        await waitFor(() => {
          expect(continueButton).toBeInTheDocument();
        });

        await user.click(continueButton);
      }

      // Step 7: Conversation Summary
      await waitFor(() => {
        expect(screen.getByText(/conversation summary/i)).toBeInTheDocument();
      });

      const confirmSummaryButton = screen.getByText(/confirm and continue/i);
      await user.click(confirmSummaryButton);

      // Step 8: Photo Upload
      await waitFor(() => {
        expect(screen.getByText(/upload photos/i)).toBeInTheDocument();
      });

      // Mock file upload
      const fileInput = screen.getByLabelText(/upload photos/i);
      const mockFile = new File(['mock image'], 'vase.jpg', { type: 'image/jpeg' });
      
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByText(/vase.jpg/i)).toBeInTheDocument();
      });

      const uploadNextButton = screen.getByText(/next/i);
      await user.click(uploadNextButton);

      // Step 9: AI Processing and Listing Generation
      await waitFor(() => {
        expect(screen.getByText(/generating your listing/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/beautiful handmade ceramic vase/i)).toBeInTheDocument();
      }, { timeout: 10000 });

      // Step 10: Review Generated Listing
      const reviewNextButton = screen.getByText(/looks good/i);
      await user.click(reviewNextButton);

      // Step 11: Export to Marketplaces
      await waitFor(() => {
        expect(screen.getByText(/export to marketplaces/i)).toBeInTheDocument();
      });

      // Export to Etsy
      const etsyButton = screen.getByText(/export to etsy/i);
      await user.click(etsyButton);

      await waitFor(() => {
        expect(screen.getByText(/exported successfully/i)).toBeInTheDocument();
      });

      // Export to Amazon
      const amazonButton = screen.getByText(/export to amazon/i);
      await user.click(amazonButton);

      await waitFor(() => {
        expect(screen.getByText(/exported successfully/i)).toBeInTheDocument();
      });

      // Step 12: Success Screen
      await waitFor(() => {
        expect(screen.getByText(/congratulations/i)).toBeInTheDocument();
      });

      // Verify all Firebase calls were made
      const mockFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;
      expect(mockFirebaseService.callFunction).toHaveBeenCalledWith('manageConversation', expect.any(Object));
      expect(mockFirebaseService.callFunction).toHaveBeenCalledWith('processUserSpeech', expect.any(Object));
      expect(mockFirebaseService.callFunction).toHaveBeenCalledWith('generateListing', expect.any(Object));
      expect(mockFirebaseService.callFunction).toHaveBeenCalledWith('exportToMarketplace', expect.objectContaining({
        marketplace: 'etsy'
      }));
      expect(mockFirebaseService.callFunction).toHaveBeenCalledWith('exportToMarketplace', expect.objectContaining({
        marketplace: 'amazon'
      }));
    });

    it('should handle user flow with errors and recovery', async () => {
      const user = userEvent.setup();
      
      // Mock error scenarios
      const mockFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;
      mockFirebaseService.callFunction.mockImplementation((functionName, data) => {
        if (functionName === 'processUserSpeech' && data.simulateError) {
          return Promise.reject({
            error: 'SPEECH_RECOGNITION_FAILED',
            message: 'Could not understand the audio'
          });
        }
        return Promise.resolve({ success: true });
      });

      renderApp();

      // Complete onboarding quickly
      await waitFor(() => {
        expect(screen.getByText('English')).toBeInTheDocument();
      });
      await user.click(screen.getByText('English'));

      await user.type(screen.getByPlaceholderText(/enter your name/i), 'Test User');
      await user.click(screen.getByText(/next/i));

      await user.type(screen.getByPlaceholderText(/enter your location/i), 'Test Location');
      await user.click(screen.getByText(/next/i));

      // Start conversation
      await user.click(screen.getByText(/start conversation/i));

      // Simulate speech recognition error
      const recordButton = screen.getByRole('button', { name: /start recording/i });
      await user.click(recordButton);

      // Mock error in speech processing
      mockFirebaseService.callFunction.mockRejectedValueOnce({
        error: 'SPEECH_RECOGNITION_FAILED',
        message: 'Could not understand the audio'
      });

      const stopButton = screen.getByRole('button', { name: /stop recording/i });
      await user.click(stopButton);

      // Should show error message and fallback options
      await waitFor(() => {
        expect(screen.getByText(/couldn't understand/i)).toBeInTheDocument();
      });

      // Use text input fallback
      const textFallbackButton = screen.getByText(/type instead/i);
      await user.click(textFallbackButton);

      const textInput = screen.getByPlaceholderText(/type your response/i);
      await user.type(textInput, 'I made a ceramic bowl');

      const submitTextButton = screen.getByText(/submit/i);
      await user.click(submitTextButton);

      // Should continue normally after recovery
      await waitFor(() => {
        expect(screen.getByText(/i made a ceramic bowl/i)).toBeInTheDocument();
      });

      // Reset mock to normal behavior
      mockFirebaseService.callFunction.mockImplementation(() => 
        Promise.resolve({ success: true })
      );

      const continueButton = screen.getByText(/continue/i);
      await user.click(continueButton);

      // Should proceed to next conversation turn
      await waitFor(() => {
        expect(recordButton).toBeInTheDocument();
      });
    });

    it('should persist conversation state across page refreshes', async () => {
      const user = userEvent.setup();
      
      // Mock persistence service
      const mockPersistenceService = conversationPersistenceService as jest.Mocked<typeof conversationPersistenceService>;
      mockPersistenceService.loadConversation.mockResolvedValue(
        global.testUtils.createMockConversationData({
          id: 'persisted-conv-1',
          userId: 'test-user-1',
          status: 'in_progress',
          turns: [
            global.testUtils.createMockConversationTurn('ai_question', 'Hello! What would you like to create today?'),
            global.testUtils.createMockConversationTurn('user_response', 'I made a ceramic vase')
          ]
        })
      );

      // Set up localStorage with conversation state
      localStorage.setItem('currentConversationId', 'persisted-conv-1');
      localStorage.setItem('userProfile', JSON.stringify({
        name: 'Priya Sharma',
        location: 'Jaipur, Rajasthan',
        language: 'en'
      }));

      renderApp();

      // Should restore conversation state
      await waitFor(() => {
        expect(screen.getByText(/continue conversation/i)).toBeInTheDocument();
      });

      const continueButton = screen.getByText(/continue conversation/i);
      await user.click(continueButton);

      // Should show conversation history
      await waitFor(() => {
        expect(screen.getByText(/hello! what would you like to create today/i)).toBeInTheDocument();
        expect(screen.getByText(/i made a ceramic vase/i)).toBeInTheDocument();
      });

      // Verify persistence service was called
      expect(mockPersistenceService.loadConversation).toHaveBeenCalledWith('persisted-conv-1');
    });

    it('should handle multilingual conversation flow', async () => {
      const user = userEvent.setup();
      
      // Mock multilingual responses
      const mockFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;
      mockFirebaseService.callFunction.mockImplementation((functionName, data) => {
        if (functionName === 'manageConversation' && data.language === 'hi') {
          return Promise.resolve({
            success: true,
            question: 'नमस्ते! आप आज क्या बनाना चाहते हैं?',
            conversationId: 'hindi-conv-1',
            stage: ConversationStage.INTRODUCTION,
            language: 'hi'
          });
        }
        if (functionName === 'processUserSpeech' && data.language === 'hi') {
          return Promise.resolve({
            success: true,
            transcript: 'मैंने एक मिट्टी का बर्तन बनाया',
            confidence: 0.92,
            translation: 'I made a clay pot',
            extractedInfo: { productType: 'clay pot' }
          });
        }
        return Promise.resolve({ success: true });
      });

      renderApp();

      // Select Hindi language
      await waitFor(() => {
        expect(screen.getByText('हिंदी')).toBeInTheDocument();
      });
      await user.click(screen.getByText('हिंदी'));

      // Complete onboarding in Hindi
      await user.type(screen.getByPlaceholderText(/अपना नाम दर्ज करें/i), 'प्रिया शर्मा');
      await user.click(screen.getByText(/अगला/i));

      await user.type(screen.getByPlaceholderText(/अपना स्थान दर्ज करें/i), 'जयपुर, राजस्थान');
      await user.click(screen.getByText(/अगला/i));

      // Start Hindi conversation
      await user.click(screen.getByText(/बातचीत शुरू करें/i));

      await waitFor(() => {
        expect(screen.getByText(/नमस्ते! आप आज क्या बनाना चाहते हैं/i)).toBeInTheDocument();
      });

      // Record response in Hindi
      const recordButton = screen.getByRole('button', { name: /रिकॉर्डिंग शुरू करें/i });
      await user.click(recordButton);

      const stopButton = screen.getByRole('button', { name: /रिकॉर्डिंग बंद करें/i });
      await user.click(stopButton);

      // Should show Hindi transcript and translation
      await waitFor(() => {
        expect(screen.getByText(/मैंने एक मिट्टी का बर्तन बनाया/i)).toBeInTheDocument();
        expect(screen.getByText(/translation: i made a clay pot/i)).toBeInTheDocument();
      });

      // Verify Hindi API calls
      expect(mockFirebaseService.callFunction).toHaveBeenCalledWith('manageConversation', 
        expect.objectContaining({ language: 'hi' })
      );
      expect(mockFirebaseService.callFunction).toHaveBeenCalledWith('processUserSpeech', 
        expect.objectContaining({ language: 'hi' })
      );
    });
  });

  describe('Performance and Network Conditions', () => {
    it('should handle slow network conditions gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock slow responses
      const mockFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;
      mockFirebaseService.callFunction.mockImplementation((functionName) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ success: true, processingTime: 5000 });
          }, 3000); // 3 second delay
        });
      });

      renderApp();

      // Complete onboarding
      await user.click(screen.getByText('English'));
      await user.type(screen.getByPlaceholderText(/enter your name/i), 'Test User');
      await user.click(screen.getByText(/next/i));
      await user.type(screen.getByPlaceholderText(/enter your location/i), 'Test Location');
      await user.click(screen.getByText(/next/i));

      // Start conversation
      await user.click(screen.getByText(/start conversation/i));

      // Should show loading indicator
      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });

      // Should eventually complete
      await waitFor(() => {
        expect(screen.getByText(/start recording/i)).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('should handle offline scenarios', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      const mockFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;
      mockFirebaseService.callFunction.mockRejectedValue({
        error: 'NETWORK_ERROR',
        message: 'Network request failed'
      });

      renderApp();

      // Complete onboarding
      await user.click(screen.getByText('English'));
      await user.type(screen.getByPlaceholderText(/enter your name/i), 'Test User');
      await user.click(screen.getByText(/next/i));
      await user.type(screen.getByPlaceholderText(/enter your location/i), 'Test Location');
      await user.click(screen.getByText(/next/i));

      // Try to start conversation
      await user.click(screen.getByText(/start conversation/i));

      // Should show offline message
      await waitFor(() => {
        expect(screen.getByText(/you appear to be offline/i)).toBeInTheDocument();
      });

      // Should offer retry option
      expect(screen.getByText(/retry/i)).toBeInTheDocument();

      // Mock network recovery
      mockFirebaseService.callFunction.mockResolvedValue({ success: true });

      // Retry should work
      await user.click(screen.getByText(/retry/i));

      await waitFor(() => {
        expect(screen.getByText(/start recording/i)).toBeInTheDocument();
      });
    });

    it('should optimize conversation response times', async () => {
      const user = userEvent.setup();
      
      // Track response times
      const responseTimes: number[] = [];
      const mockFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;
      
      mockFirebaseService.callFunction.mockImplementation((functionName) => {
        const startTime = Date.now();
        return Promise.resolve({ 
          success: true,
          processingTime: Date.now() - startTime
        }).then(result => {
          responseTimes.push(result.processingTime);
          return result;
        });
      });

      renderApp();

      // Complete onboarding quickly
      await user.click(screen.getByText('English'));
      await user.type(screen.getByPlaceholderText(/enter your name/i), 'Test User');
      await user.click(screen.getByText(/next/i));
      await user.type(screen.getByPlaceholderText(/enter your location/i), 'Test Location');
      await user.click(screen.getByText(/next/i));

      // Perform multiple conversation operations
      await user.click(screen.getByText(/start conversation/i));
      
      const recordButton = screen.getByRole('button', { name: /start recording/i });
      const stopButton = screen.getByRole('button', { name: /stop recording/i });

      for (let i = 0; i < 3; i++) {
        await user.click(recordButton);
        await user.click(stopButton);
        
        await waitFor(() => {
          expect(screen.getByText(/continue/i)).toBeInTheDocument();
        });
        
        await user.click(screen.getByText(/continue/i));
      }

      // Verify response times are reasonable (under 3 seconds)
      responseTimes.forEach(time => {
        expect(time).toBeLessThan(3000);
      });

      // Verify average response time is under 2 seconds
      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      expect(averageTime).toBeLessThan(2000);
    });
  });

  describe('Data Validation and Export', () => {
    it('should validate conversation data before export', async () => {
      const user = userEvent.setup();
      
      // Mock incomplete conversation data
      const mockFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;
      mockFirebaseService.callFunction.mockImplementation((functionName, data) => {
        if (functionName === 'generateListing') {
          return Promise.resolve({
            success: false,
            error: 'INCOMPLETE_DATA',
            message: 'Missing required product information',
            missingFields: ['materials', 'dimensions']
          });
        }
        return Promise.resolve({ success: true });
      });

      renderApp();

      // Complete flow to listing generation
      await user.click(screen.getByText('English'));
      await user.type(screen.getByPlaceholderText(/enter your name/i), 'Test User');
      await user.click(screen.getByText(/next/i));
      await user.type(screen.getByPlaceholderText(/enter your location/i), 'Test Location');
      await user.click(screen.getByText(/next/i));

      // Skip to photo upload (mock conversation completion)
      localStorage.setItem('conversationComplete', 'true');
      
      // Upload photo
      const fileInput = screen.getByLabelText(/upload photos/i);
      const mockFile = new File(['mock image'], 'test.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, mockFile);
      await user.click(screen.getByText(/next/i));

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/missing required product information/i)).toBeInTheDocument();
        expect(screen.getByText(/materials, dimensions/i)).toBeInTheDocument();
      });

      // Should offer to return to conversation
      expect(screen.getByText(/complete conversation/i)).toBeInTheDocument();
    });

    it('should export to all marketplaces successfully', async () => {
      const user = userEvent.setup();
      
      const exportResults: any[] = [];
      const mockFirebaseService = firebaseService as jest.Mocked<typeof firebaseService>;
      
      mockFirebaseService.callFunction.mockImplementation((functionName, data) => {
        if (functionName === 'exportToMarketplace') {
          const result = {
            success: true,
            exportId: `export-${data.marketplace}-${Date.now()}`,
            marketplace: data.marketplace,
            status: 'completed',
            listingUrl: `https://${data.marketplace}.com/listing/123`
          };
          exportResults.push(result);
          return Promise.resolve(result);
        }
        return Promise.resolve({ success: true });
      });

      renderApp();

      // Complete flow to export screen (mock all previous steps)
      localStorage.setItem('conversationComplete', 'true');
      localStorage.setItem('photosUploaded', 'true');
      localStorage.setItem('listingGenerated', 'true');

      // Navigate to export screen
      await waitFor(() => {
        expect(screen.getByText(/export to marketplaces/i)).toBeInTheDocument();
      });

      // Export to all marketplaces
      const marketplaces = ['etsy', 'amazon', 'whatsapp'];
      
      for (const marketplace of marketplaces) {
        const exportButton = screen.getByText(new RegExp(`export to ${marketplace}`, 'i'));
        await user.click(exportButton);

        await waitFor(() => {
          expect(screen.getByText(/exported successfully/i)).toBeInTheDocument();
        });
      }

      // Verify all exports completed
      expect(exportResults).toHaveLength(3);
      marketplaces.forEach((marketplace, index) => {
        expect(exportResults[index].marketplace).toBe(marketplace);
        expect(exportResults[index].status).toBe('completed');
        expect(exportResults[index].listingUrl).toContain(marketplace);
      });
    });
  });
});