import React, { useState, useEffect, useCallback } from 'react';
import { Language, ConversationData, ConversationState, ConversationStage, ConversationTurn, ProductInfo, ConversationError } from '../types';
import VoiceControls from './VoiceControls';
import ConversationHistory from './ConversationHistory';
import ConversationSummary from './ConversationSummary';
import MobileConversationSettings from './MobileConversationSettings';
import useConversationErrorHandling from '../hooks/useConversationErrorHandling';
import useConversationPersistence from '../hooks/useConversationPersistence';
import useMobileConversation from '../hooks/useMobileConversation';
import { useConversationAnalytics } from '../hooks/useConversationAnalytics';
import { functions } from '../firebase';

interface ConversationInterfaceProps {
  selectedLanguage: Language;
  userName: string;
  userLocation: string;
  onConversationComplete: (conversationData: ConversationData) => void;
  onBack: () => void;
  resumedConversationData?: ConversationData;
  resumedConversationState?: ConversationState;
}

const ConversationInterface: React.FC<ConversationInterfaceProps> = ({
  selectedLanguage,
  userName,
  userLocation,
  onConversationComplete,
  onBack,
  resumedConversationData,
  resumedConversationState
}) => {
  const [conversationState, setConversationState] = useState<ConversationState>({
    isListening: false,
    isAISpeaking: false,
    isProcessing: false,
    conversationHistory: [],
    currentQuestion: '',
    conversationSummary: null,
    currentStage: ConversationStage.INTRODUCTION,
    context: null
  });

  const [conversationData, setConversationData] = useState<ConversationData | null>(null);
  const [error, setError] = useState<ConversationError | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  
  // Enhanced error handling
  const [errorState, errorHandlers] = useConversationErrorHandling();
  
  // Conversation persistence
  const [persistenceState, persistenceHandlers] = useConversationPersistence();
  
  // Mobile conversation features
  const [mobileState, mobileActions] = useMobileConversation();
  
  // Conversation analytics
  const {
    trackConversationStart,
    trackConversationTurn,
    trackConversationError,
    trackConversationAbandonment,
    trackConversationCompletion,
    startResponseTimer,
    endResponseTimer
  } = useConversationAnalytics();

  // Mobile detection and orientation handling using mobile service
  useEffect(() => {
    setIsMobile(mobileState.deviceInfo.isMobile);
    setOrientation(mobileState.orientation.orientation);
  }, [mobileState.deviceInfo.isMobile, mobileState.orientation.orientation]);

  // Handle background state changes for mobile
  useEffect(() => {
    if (!isMobile) return;

    if (mobileState.isBackground) {
      // Save conversation state when app goes to background
      if (conversationData && conversationState) {
        mobileActions.saveToBackground(conversationData, conversationState);
        persistenceHandlers.saveNow(conversationData, conversationState).catch(console.warn);
      }
    }
  }, [mobileState.isBackground, conversationData, conversationState, isMobile]);

  // Handle before unload for mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (conversationData && conversationState.conversationHistory.length > 0) {
        // Save to mobile background storage
        mobileActions.saveToBackground(conversationData, conversationState);
        e.preventDefault();
        e.returnValue = 'Your conversation will be saved. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [conversationData, conversationState, isMobile]);

  // Request wake lock during active conversation on mobile
  useEffect(() => {
    if (isMobile && conversationState.isListening && !mobileState.hasWakeLock) {
      mobileActions.requestWakeLock().catch(console.warn);
    } else if (isMobile && !conversationState.isListening && mobileState.hasWakeLock) {
      // Release wake lock when not actively listening to save battery
      setTimeout(() => {
        if (!conversationState.isListening) {
          mobileActions.releaseWakeLock();
        }
      }, 5000); // 5 second delay
    }
  }, [conversationState.isListening, isMobile, mobileState.hasWakeLock]);

  // Initialize conversation when component mounts
  useEffect(() => {
    if (resumedConversationData && resumedConversationState) {
      // Resume existing conversation
      setConversationData(resumedConversationData);
      setConversationState(resumedConversationState);
      
      // Start persistence for resumed conversation
      persistenceHandlers.startPersistence(resumedConversationData, resumedConversationState);
      
      // Check if conversation is complete
      if (resumedConversationData.status === 'completed') {
        setShowSummary(true);
      }
    } else {
      // Start new conversation
      initializeConversation();
    }
  }, [resumedConversationData, resumedConversationState]);

  const initializeConversation = useCallback(async () => {
    try {
      setConversationState(prev => ({ ...prev, isProcessing: true }));
      
      // Check for background conversation restoration on mobile
      if (isMobile) {
        const backgroundData = mobileActions.restoreFromBackground();
        if (backgroundData) {
          setConversationData(backgroundData.conversationData);
          setConversationState(backgroundData.conversationState);
          await persistenceHandlers.startPersistence(backgroundData.conversationData, backgroundData.conversationState);
          
          // Haptic feedback for restoration
          mobileActions.vibrate(100);
          return;
        }
      }
      
      // Create new conversation data
      const newConversationData: ConversationData = {
        id: `conv_${Date.now()}`,
        userId: `user_${userName.toLowerCase().replace(/\s+/g, '_')}`,
        language: selectedLanguage,
        turns: [],
        extractedInfo: {
          productType: '',
          materials: [],
          colors: [],
          craftingProcess: '',
          uniqueFeatures: []
        },
        status: 'in_progress',
        startedAt: new Date(),
        summary: ''
      };

      setConversationData(newConversationData);

      // Track conversation start
      trackConversationStart(newConversationData.id, newConversationData.userId);

      // Start persistence for the new conversation
      await persistenceHandlers.startPersistence(newConversationData, conversationState);

      // Generate initial AI introduction using Gemini Live
      const introQuestion = getIntroductionQuestion();
      
      // Initialize Gemini Live session with the intro question
      try {
        console.log('🤖 INITIALIZING GEMINI LIVE SESSION');
        const { httpsCallable } = await import('firebase/functions');
        const geminiLiveFunction = httpsCallable(functions, 'geminiLive');
        const result = await geminiLiveFunction({ 
          message: `Initialize conversation for artisan ${userName}. Start with: ${introQuestion}`, 
          session: null 
        });
        
        console.log('📥 Initial Gemini response:', result.data);
        setSession(result.data.session);
        
        // Use Gemini's response or fallback to intro question
        const aiResponse = result.data.response || introQuestion;
        await addAIQuestion(aiResponse);
        
      } catch (error) {
        console.error('Failed to initialize Gemini Live, using fallback:', error);
        await addAIQuestion(introQuestion);
      }

      // Haptic feedback for new conversation start on mobile
      if (isMobile) {
        mobileActions.vibrate(50);
      }

    } catch (err) {
      console.error('Failed to initialize conversation:', err);
      
      // Track initialization error
      if (conversationData) {
        trackConversationError(conversationData.id, conversationData.userId, 'initialization_error');
      }
      
      await errorHandlers.handleAIError(err, initializeConversation);
    } finally {
      setConversationState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [selectedLanguage, userName, isMobile]);

  const getIntroductionQuestion = (): string => {
    return `Hello ${userName}! I'm here to help you create a beautiful listing for your handmade product. Can you start by telling me what you've made?`;
  };

  const addAIQuestion = async (question: string, audioUrl?: string) => {
    const newTurn: ConversationTurn = {
      id: `turn_${Date.now()}`,
      type: 'ai_question',
      content: question,
      audioUrl,
      timestamp: new Date(),
      language: selectedLanguage.code
    };

    const updatedState = {
      ...conversationState,
      conversationHistory: [...conversationState.conversationHistory, newTurn],
      currentQuestion: question
    };

    setConversationState(updatedState);

    // Update conversation data
    if (conversationData) {
      const updatedData = {
        ...conversationData,
        turns: [...conversationData.turns, newTurn]
      };
      setConversationData(updatedData);

      // Save to persistence
      try {
        await persistenceHandlers.saveNow(updatedData, updatedState);
      } catch (persistenceError) {
        console.warn('Failed to save conversation state:', persistenceError);
        // Continue with conversation even if persistence fails
      }
    }

    // Generate AI speech if needed
    if (!audioUrl) {
      try {
        await generateAISpeech(question);
      } catch (err) {
        console.warn('Failed to generate AI speech, continuing with text only');
      }
    }
  };

  const [session, setSession] = useState(null);

  const addUserResponse = async (response: string, audioUrl?: string) => {
    const newTurn: ConversationTurn = {
      id: `turn_${Date.now()}`,
      type: 'user_response',
      content: response,
      audioUrl,
      timestamp: new Date(),
      language: selectedLanguage.code
    };

    const updatedState = {
      ...conversationState,
      conversationHistory: [...conversationState.conversationHistory, newTurn],
      isProcessing: true
    };

    setConversationState(updatedState);

    // Update conversation data
    if (conversationData) {
      const updatedData = {
        ...conversationData,
        turns: [...conversationData.turns, newTurn]
      };
      setConversationData(updatedData);

      // Save to persistence
      try {
        await persistenceHandlers.saveNow(updatedData, updatedState);
      } catch (persistenceError) {
        console.warn('Failed to save conversation state:', persistenceError);
        // Continue with conversation even if persistence fails
      }
    }

    try {
      // Process user response and generate follow-up
      await processUserResponse(response);
    } catch (err) {
      console.error('Failed to process user response:', err);
      
      // Track response processing error
      if (conversationData) {
        trackConversationError(conversationData.id, conversationData.userId, 'response_processing_error');
      }
      
      await errorHandlers.handleAIError(err, async () => {
        await addUserResponse(response, audioUrl);
      });
    }
  };

  const processUserResponse = async (response: string) => {
    const responseStartTime = Date.now();
    
    try {
      // Start response timer for analytics
      startResponseTimer();

      console.log('🤖 GEMINI API CALL #' + (Date.now() % 10000));
      console.log('📤 Sending message to Gemini Live:', response);
      console.log('📋 Current session:', session);

      const { httpsCallable } = await import('firebase/functions');
      const geminiLiveFunction = httpsCallable(functions, 'geminiLive');
      const result = await geminiLiveFunction({ message: response, session });

      console.log('📥 Gemini Live response:', result.data);
      console.log('✅ GEMINI API CALL COMPLETED');

      const { response: modelResponse, session: newSession } = result.data;

      setSession(newSession);
      
      // Update conversation data with extracted info
      if (conversationData) {
        const updatedData = {
          ...conversationData,
        };
        setConversationData(updatedData);
      }

      await addAIQuestion(modelResponse);

      // Track conversation turn with response time
      const responseTime = endResponseTimer();
      if (conversationData) {
        trackConversationTurn(
          conversationData.id,
          conversationData.userId,
          responseTime
        );
      }

    } catch (error) {
      console.error('Error processing user response:', error);
      
      // Show user-friendly error message
      const errorMessage = error.message?.includes('API key') 
        ? "I'm having trouble connecting to the AI service. Please check that the API key is configured properly."
        : "I'm having trouble processing your message. Let me try again.";
      
      await addAIQuestion(errorMessage);
      
      // Track error
      if (conversationData) {
        trackConversationError(conversationData.id, conversationData.userId, 'gemini_api_error');
      }
    } finally {
      setConversationState(prev => ({ ...prev, isProcessing: false }));
    }
  };



  const generateAISpeech = async (text: string): Promise<void> => {
    try {
      setConversationState(prev => ({ ...prev, isAISpeaking: true }));
      
      // Use Web Speech API for text-to-speech with mobile optimizations
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = selectedLanguage.code;
        
        // Apply mobile-optimized audio settings
        if (isMobile) {
          utterance.rate = 0.8; // Slower for clarity on mobile speakers
          utterance.pitch = 1.0;
          utterance.volume = 0.85; // Prevent distortion on mobile speakers
          
          // Haptic feedback when AI starts speaking
          mobileActions.vibrate(30);
        } else {
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
        }
        
        utterance.onend = () => {
          setConversationState(prev => ({ ...prev, isAISpeaking: false }));
          
          // Haptic feedback when AI finishes speaking on mobile
          if (isMobile) {
            mobileActions.vibrate([30, 30, 30]);
          }
        };
        
        utterance.onerror = async (event) => {
          setConversationState(prev => ({ ...prev, isAISpeaking: false }));
          await errorHandlers.handleAudioError(event, async () => {
            await generateAISpeech(text);
          });
        };
        
        speechSynthesis.speak(utterance);
      }
    } catch (err) {
      setConversationState(prev => ({ ...prev, isAISpeaking: false }));
      
      // Track speech processing error
      if (conversationData) {
        trackConversationError(conversationData.id, conversationData.userId, 'speech_processing_error');
      }
      
      await errorHandlers.handleAudioError(err, async () => {
        await generateAISpeech(text);
      });
    }
  };

  const handleError = (error: ConversationError) => {
    setError(error);
    setConversationState(prev => ({
      ...prev,
      isProcessing: false,
      isListening: false,
      isAISpeaking: false
    }));
  };

  const handleStartListening = () => {
    setConversationState(prev => ({ ...prev, isListening: true }));
    setError(null);
  };

  const handleStopListening = () => {
    setConversationState(prev => ({ ...prev, isListening: false }));
  };

  const handleStopAISpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    setConversationState(prev => ({ ...prev, isAISpeaking: false }));
  };

  const handleUserSpeechResult = async (transcript: string, audioUrl?: string) => {
    if (transcript.trim()) {
      await addUserResponse(transcript, audioUrl);
    }
  };

  const handleSummaryConfirm = async () => {
    if (conversationData) {
      const completedData: ConversationData = {
        ...conversationData,
        status: 'completed',
        completedAt: new Date(),
        summary: `Conversation completed with ${conversationState.conversationHistory.length} turns`
      };
      
      // Save final state
      try {
        await persistenceHandlers.saveNow(completedData, conversationState);
      } catch (persistenceError) {
        console.warn('Failed to save final conversation state:', persistenceError);
      }
      
      // Track conversation completion
      trackConversationCompletion(completedData.id, completedData.userId);
      
      // Stop persistence
      persistenceHandlers.stopPersistence();
      
      // Clear mobile background data since conversation is complete
      if (isMobile) {
        mobileActions.clearBackgroundData();
        mobileActions.releaseWakeLock();
        
        // Success haptic feedback
        mobileActions.vibrate([100, 50, 100, 50, 200]);
      }
      
      onConversationComplete(completedData);
    }
  };

  const handleSummaryEdit = (field: string) => {
    // Allow user to edit specific fields
    setShowSummary(false);
    const editQuestion = `Let's update the ${field}. Can you tell me more about that?`;
    addAIQuestion(editQuestion);
  };

  const retryLastAction = async () => {
    if (error?.retryAction) {
      setError(null);
      error.retryAction();
    } else if (errorState.currentError?.retryAction) {
      await errorHandlers.retry();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-orange-50 to-red-50 ${isMobile ? 'touch-manipulation' : ''}`}
         style={{
           minHeight: isMobile ? '100vh' : 'auto',
           maxHeight: isMobile ? '100vh' : 'auto',
           overflow: 'hidden',
           // Apply safe area insets for mobile devices with notches
           ...(isMobile && {
             paddingTop: `max(0px, ${mobileState.orientation.safeAreaInsets.top}px)`,
             paddingBottom: `max(0px, ${mobileState.orientation.safeAreaInsets.bottom}px)`,
             paddingLeft: `max(0px, ${mobileState.orientation.safeAreaInsets.left}px)`,
             paddingRight: `max(0px, ${mobileState.orientation.safeAreaInsets.right}px)`
           })
         }}>
      {/* Header */}
      <div className={`flex items-center justify-between ${isMobile ? 'px-3 py-2' : 'px-4 py-3'} bg-white shadow-sm safe-header`}>
        <button
          onClick={() => {
            // Track conversation abandonment
            if (conversationData && conversationData.status === 'in_progress') {
              trackConversationAbandonment(
                conversationData.id, 
                conversationData.userId, 
                conversationState.currentStage
              );
            }
            onBack();
          }}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">Back</span>
        </button>
        
        <div className="text-center flex-1 mx-2">
          <h1 className={`${isMobile ? 'text-lg' : 'text-base'} font-semibold text-gray-800 leading-tight`}>
            {isMobile && orientation === 'landscape' ? 'Your craft' : 'Tell me about your craft'}
          </h1>
          <div className={`flex items-center justify-center ${isMobile && orientation === 'landscape' ? 'space-x-1' : 'space-x-2'} text-xs text-gray-500 mt-0.5`}>
            <span>Stage: {conversationState.currentStage.replace('_', ' ')}</span>
          </div>
        </div>
        
        {/* Mobile settings button */}
        {isMobile ? (
          <button
            onClick={() => setShowMobileSettings(true)}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            aria-label="Mobile settings"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
          </button>
        ) : (
          <div className="w-12"></div> /* Spacer for centering */
        )}
      </div>

      {/* Progress indicator */}
      <div className={`${isMobile ? 'px-4 py-2' : 'px-4 py-1.5'} bg-white border-b`}>
        <div className={`flex items-center justify-between text-xs text-gray-500`}>
          <span>Turn {Math.floor(conversationState.conversationHistory.length / 2) + 1}</span>
          <span>{conversationState.conversationHistory.length} messages</span>
        </div>
        <div className={`w-full bg-gray-200 rounded-full h-1 mt-1`}>
          <div 
            className={`bg-orange-500 h-1 rounded-full transition-all duration-300`}
            style={{ 
              width: `${Math.min((conversationState.conversationHistory.length / 10) * 100, 100)}%` 
            }}
          ></div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {showSummary && conversationState.conversationSummary ? (
          <ConversationSummary
            productInfo={conversationState.conversationSummary}
            onConfirm={handleSummaryConfirm}
            onEdit={handleSummaryEdit}
          />
        ) : (
          <>
            {/* Conversation History */}
            <div className="flex-1 overflow-hidden">
              <ConversationHistory
                conversationHistory={conversationState.conversationHistory}
                isProcessing={conversationState.isProcessing}
                currentQuestion={conversationState.currentQuestion}
                selectedLanguage={selectedLanguage}
                isMobile={isMobile}
                orientation={orientation}
              />
            </div>

            {/* Voice Controls */}
            <div className="flex-shrink-0">
              <VoiceControls
                isListening={conversationState.isListening}
                isAISpeaking={conversationState.isAISpeaking}
                isProcessing={conversationState.isProcessing}
                selectedLanguage={selectedLanguage}
                onStartListening={handleStartListening}
                onStopListening={handleStopListening}
                onStopAISpeaking={handleStopAISpeaking}
                onSpeechResult={handleUserSpeechResult}
                error={error}
                onRetry={retryLastAction}
              />
            </div>
          </>
        )}
      </div>

      {/* Mobile Settings Modal */}
      <MobileConversationSettings
        isOpen={showMobileSettings}
        onClose={() => setShowMobileSettings(false)}
      />
    </div>
  );
};

export default ConversationInterface;