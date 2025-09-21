import React, { useState, useEffect, useRef } from 'react';
import { Language, ConversationError } from '../types';
import useConversationErrorHandling from '../hooks/useConversationErrorHandling';
import useMobileConversation from '../hooks/useMobileConversation';

interface VoiceControlsProps {
  isListening: boolean;
  isAISpeaking: boolean;
  isProcessing: boolean;
  selectedLanguage: Language;
  onStartListening: () => void;
  onStopListening: () => void;
  onStopAISpeaking: () => void;
  onSpeechResult: (transcript: string, audioUrl?: string) => void;
  error: ConversationError | null;
  onRetry: () => void;
}

const VoiceControls: React.FC<VoiceControlsProps> = ({
  isListening,
  isAISpeaking,
  isProcessing,
  selectedLanguage,
  onStartListening,
  onStopListening,
  onStopAISpeaking,
  onSpeechResult,
  error,
  onRetry
}) => {
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isMobile, setIsMobile] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);
  const [isHoldToTalk, setIsHoldToTalk] = useState(false);
  
  // Enhanced error handling
  const [errorState, errorHandlers] = useConversationErrorHandling();
  
  // Mobile conversation features
  const [mobileState, mobileActions] = useMobileConversation();
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const vibrationPatternRef = useRef<number[]>([]);

  // Use mobile detection from mobile service
  useEffect(() => {
    setIsMobile(mobileState.deviceInfo.isMobile);
  }, [mobileState.deviceInfo.isMobile]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = selectedLanguage.code;
      
      // Mobile-specific optimizations
      if (isMobile) {
        recognitionInstance.maxAlternatives = 1;
        // Reduce continuous listening on mobile to save battery
        recognitionInstance.continuous = false;
      }
      
      recognitionInstance.onstart = () => {
        console.log('Speech recognition started');
      };
      
      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(finalTranscript || interimTranscript);
        
        if (finalTranscript) {
          onSpeechResult(finalTranscript);
          setTranscript('');
          onStopListening();
        }
      };
      
      recognitionInstance.onerror = async (event) => {
        console.error('Speech recognition error:', event.error);
        onStopListening();
        
        if (event.error === 'not-allowed') {
          setPermissionStatus('denied');
        }

        // Handle error with enhanced error handling
        await errorHandlers.handleSpeechError(event, async () => {
          if (recognition) {
            recognition.start();
          }
        });
      };
      
      recognitionInstance.onend = () => {
        console.log('Speech recognition ended');
        onStopListening();
      };
      
      setRecognition(recognitionInstance);
    }
  }, [selectedLanguage, onSpeechResult, onStopListening]);

  // Handle microphone permission and audio visualization
  useEffect(() => {
    if (isListening && recognition) {
      startListening();
    } else if (!isListening && recognition) {
      stopListening();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isListening, recognition]);

  // Auto-show text input when fallback is enabled
  useEffect(() => {
    if (errorState.hasTextFallback && !showTextInput) {
      setShowTextInput(true);
    }
  }, [errorState.hasTextFallback, showTextInput]);

  const startListening = async () => {
    try {
      // Get optimal audio settings from mobile service
      const audioSettings = mobileActions ? 
        mobileState.deviceInfo.isMobile ? 
          {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
            channelCount: 1,
            latency: 0.1
          } : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        : {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        };
      
      const constraints = { audio: audioSettings };
      
      // Request microphone permission and start audio visualization
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setPermissionStatus('granted');
      
      // Set up audio context for visualization with mobile optimizations
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      microphoneRef.current.connect(analyserRef.current);
      // Reduce FFT size on mobile for better performance
      analyserRef.current.fftSize = isMobile ? 128 : 256;
      
      // Start speech recognition
      if (recognition) {
        recognition.start();
      }
      
      // Start audio level monitoring
      monitorAudioLevel();
      
      // Haptic feedback for mobile using mobile service
      if (isMobile && mobileActions) {
        mobileActions.vibrate(50); // Short vibration to indicate recording started
      }
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setPermissionStatus('denied');
      onStopListening();
      
      // Handle microphone access error
      await errorHandlers.handleSpeechError(err, async () => {
        await startListening();
      });
      
      // Auto-enable text fallback for microphone errors
      errorHandlers.enableTextFallback();
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
    
    // Clean up audio context
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setAudioLevel(0);
    setTranscript('');
    
    // Haptic feedback for mobile when stopping using mobile service
    if (isMobile && mobileActions) {
      mobileActions.vibrate([50, 50, 50]); // Triple vibration to indicate recording stopped
    }
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateAudioLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average audio level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      setAudioLevel(average / 255); // Normalize to 0-1
      
      if (isListening) {
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      }
    };
    
    updateAudioLevel();
  };

  // Mobile touch handlers for hold-to-talk
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    
    e.preventDefault();
    setTouchStartTime(Date.now());
    setIsHoldToTalk(true);
    
    // Haptic feedback on touch start using mobile service
    if (mobileActions) {
      mobileActions.vibrate(30);
    }
    
    // Start hold timeout
    holdTimeoutRef.current = setTimeout(() => {
      if (!isListening && !isAISpeaking && !isProcessing) {
        onStartListening();
      }
    }, 200); // 200ms hold to start recording
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile) return;
    
    e.preventDefault();
    const touchDuration = touchStartTime ? Date.now() - touchStartTime : 0;
    setTouchStartTime(null);
    setIsHoldToTalk(false);
    
    // Clear hold timeout
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    
    // If it was a quick tap (less than 200ms), treat as regular click
    if (touchDuration < 200) {
      handleMicrophoneClick();
    } else if (isListening) {
      // If we were recording from hold, stop recording
      onStopListening();
    }
  };

  const handleMicrophoneClick = () => {
    if (isListening) {
      onStopListening();
    } else if (isAISpeaking) {
      onStopAISpeaking();
    } else {
      onStartListening();
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onSpeechResult(textInput.trim());
      setTextInput('');
      setShowTextInput(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  const renderMicrophoneButton = () => {
    // Mobile-responsive button sizing
    const buttonSize = isMobile ? "w-20 h-20" : "w-16 h-16";
    const iconSize = isMobile ? "w-10 h-10" : "w-8 h-8";
    
    let buttonClass = `${buttonSize} rounded-full flex items-center justify-center transition-all duration-200 `;
    let iconClass = `${iconSize} `;
    
    // Add hold-to-talk visual feedback
    if (isHoldToTalk && isMobile) {
      buttonClass += "scale-110 ";
    }
    
    if (isProcessing) {
      buttonClass += "bg-gray-400 cursor-not-allowed";
      iconClass += "text-white animate-spin";
    } else if (isListening) {
      buttonClass += "bg-red-500 hover:bg-red-600 shadow-lg animate-pulse";
      iconClass += "text-white";
    } else if (isAISpeaking) {
      buttonClass += "bg-blue-500 hover:bg-blue-600 shadow-lg";
      iconClass += "text-white";
    } else {
      buttonClass += "bg-orange-500 hover:bg-orange-600 shadow-lg hover:shadow-xl";
      iconClass += "text-white";
    }
    
    return (
      <button
        onClick={handleMicrophoneClick}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        disabled={isProcessing}
        className={buttonClass}
        style={{
          touchAction: 'none', // Prevent scrolling on touch
          userSelect: 'none'    // Prevent text selection
        }}
        aria-label={isListening ? "Stop listening" : isAISpeaking ? "Stop AI speech" : isMobile ? "Hold to talk or tap to toggle" : "Start listening"}
      >
        {isProcessing ? (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : isListening ? (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        ) : isAISpeaking ? (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
        ) : (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        )}
      </button>
    );
  };

  const renderAudioVisualization = () => {
    if (!isListening) return null;
    
    // Mobile-optimized visualization
    const barCount = isMobile ? 7 : 5;
    const maxHeight = isMobile ? 50 : 40;
    const barWidth = isMobile ? '3px' : '4px';
    
    const bars = Array.from({ length: barCount }, (_, i) => {
      const height = Math.max(0.1, audioLevel + Math.sin(Date.now() * 0.01 + i) * 0.1);
      return (
        <div
          key={i}
          className="bg-orange-400 rounded-full transition-all duration-100"
          style={{
            width: barWidth,
            height: `${height * maxHeight}px`,
            minHeight: barWidth
          }}
        />
      );
    });
    
    return (
      <div className={`flex items-center justify-center space-x-1 ${isMobile ? 'h-10' : 'h-8'} mb-2`}>
        {bars}
      </div>
    );
  };

  const getStatusText = () => {
    if (isProcessing) return "Processing your response...";
    if (isListening) return transcript || "Listening... speak now";
    if (isAISpeaking) return "AI is speaking... tap to stop";
    return "Tap the microphone to speak";
  };

  const getStatusColor = () => {
    if (isProcessing) return "text-gray-600";
    if (isListening) return "text-red-600";
    if (isAISpeaking) return "text-blue-600";
    return "text-gray-700";
  };

  return (
    <div className={`bg-white border-t border-gray-200 ${isMobile ? 'p-3 pb-4' : 'p-3'}`}>
      {/* Enhanced Error display */}
      {(error || errorState.currentError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700 text-sm">
                {errorState.currentError?.message || error?.message}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {errorState.retryCount > 0 && (
                <span className="text-xs text-red-500">
                  Attempt {errorState.retryCount}
                </span>
              )}
              {(error?.recoverable || errorState.currentError?.recoverable) && (
                <button
                  onClick={errorState.currentError ? errorHandlers.retry : onRetry}
                  disabled={errorState.isRetrying}
                  className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                >
                  {errorState.isRetrying ? 'Retrying...' : 'Retry'}
                </button>
              )}
              <button
                onClick={() => {
                  errorHandlers.clearError();
                  if (error) onRetry(); // Clear parent error too
                }}
                className="text-red-400 hover:text-red-600 text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Network status indicator */}
      {!errorState.networkStatus.isOnline && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-yellow-700 text-sm">
              You're offline. Your conversation is saved and will sync when connection is restored.
            </span>
          </div>
        </div>
      )}

      {/* Permission denied message */}
      {permissionStatus === 'denied' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-yellow-700 text-sm">
              Microphone access denied. You can still type your responses.
            </span>
          </div>
        </div>
      )}

      {/* Audio visualization */}
      {renderAudioVisualization()}

      {/* Main controls */}
      <div className="flex flex-col items-center space-y-2">
        {/* Status text */}
        <div className="text-center">
          <p className={`${isMobile ? 'text-sm' : 'text-xs'} font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </p>
          {isListening && transcript && (
            <p className={`text-xs text-gray-500 mt-0.5 ${isMobile ? 'max-w-sm' : 'max-w-xs'} truncate`}>
              "{transcript}"
            </p>
          )}
          {isMobile && isHoldToTalk && (
            <p className="text-xs text-orange-600 mt-0.5 animate-pulse">
              Hold to record...
            </p>
          )}
        </div>

        {/* Microphone button */}
        <div className={`flex items-center ${isMobile ? 'space-x-4' : 'space-x-3'}`}>
          {renderMicrophoneButton()}
          
          {/* Text input toggle */}
          <button
            onClick={() => setShowTextInput(!showTextInput)}
            className={`${isMobile ? 'w-16 h-16' : 'w-12 h-12'} rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-colors`}
            style={{
              touchAction: 'manipulation' // Optimize for touch
            }}
            aria-label="Toggle text input"
          >
            <svg className={`${isMobile ? 'w-8 h-8' : 'w-6 h-6'} text-gray-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>

        {/* Text input */}
        {showTextInput && (
          <div className={`w-full ${isMobile ? 'max-w-full px-2' : 'max-w-md'}`}>
            <div className={`flex ${isMobile ? 'space-x-3' : 'space-x-2'}`}>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your response here..."
                className={`flex-1 ${isMobile ? 'p-4 text-base' : 'p-3'} border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                style={{
                  fontSize: isMobile ? '16px' : undefined, // Prevent zoom on iOS
                  touchAction: 'manipulation'
                }}
                rows={isMobile ? 3 : 2}
              />
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className={`${isMobile ? 'px-6 py-4 text-base' : 'px-4 py-2'} bg-orange-500 text-white rounded-lg hover:bg-orange-600 active:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors`}
                style={{
                  touchAction: 'manipulation'
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className={`text-center text-xs text-gray-500 ${isMobile ? 'max-w-full px-2' : 'max-w-sm'}`}>
          {isListening ? (
            "Speak clearly and I'll transcribe your words"
          ) : isAISpeaking ? (
            "Tap the microphone to stop AI speech"
          ) : isMobile ? (
            "Hold the microphone to record, or tap to toggle recording"
          ) : (
            "Hold and speak, or use the text input option"
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceControls;