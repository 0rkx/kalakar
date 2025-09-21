import React, { useEffect, useRef, useState } from 'react';
import { ConversationTurn, Language } from '../types';

interface ConversationHistoryProps {
  conversationHistory: ConversationTurn[];
  isProcessing: boolean;
  currentQuestion: string;
  selectedLanguage: Language;
  isMobile?: boolean;
  orientation?: 'portrait' | 'landscape';
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversationHistory,
  isProcessing,
  currentQuestion,
  selectedLanguage,
  isMobile = false,
  orientation = 'portrait'
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Auto-scroll to bottom when new messages arrive (only if already at bottom)
  useEffect(() => {
    if (scrollContainerRef.current && isScrolledToBottom) {
      const container = scrollContainerRef.current;
      const scrollToBottom = () => {
        container.scrollTop = container.scrollHeight;
      };
      
      // Use requestAnimationFrame for smooth scrolling on mobile
      if (isMobile) {
        requestAnimationFrame(scrollToBottom);
      } else {
        scrollToBottom();
      }
    }
  }, [conversationHistory, isProcessing, isScrolledToBottom, isMobile]);

  // Handle scroll events to track position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
      setIsScrolledToBottom(isAtBottom);
      setShowScrollToBottom(!isAtBottom && conversationHistory.length > 3);
    };

    // Throttle scroll events on mobile for better performance
    let scrollTimeout: NodeJS.Timeout;
    const throttledHandleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, isMobile ? 100 : 50);
    };

    container.addEventListener('scroll', throttledHandleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', throttledHandleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [conversationHistory.length, isMobile]);

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(timestamp);
  };

  const playAudio = async (text: string, turnId: string) => {
    if (playingAudio === turnId) {
      // Stop current audio
      speechSynthesis.cancel();
      setPlayingAudio(null);
      return;
    }

    if ('speechSynthesis' in window) {
      // Stop any currently playing audio
      speechSynthesis.cancel();
      setPlayingAudio(turnId);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = selectedLanguage.code;
      utterance.rate = isMobile ? 0.8 : 0.9; // Slower on mobile for clarity
      utterance.pitch = 1.0;
      utterance.volume = isMobile ? 0.9 : 1.0; // Slightly quieter on mobile

      utterance.onend = () => {
        setPlayingAudio(null);
      };

      utterance.onerror = () => {
        setPlayingAudio(null);
      };

      speechSynthesis.speak(utterance);
    }
  };

  const renderTurn = (turn: ConversationTurn, index: number) => {
    const isAI = turn.type === 'ai_question';
    const isPlaying = playingAudio === turn.id;

    return (
      <div
        key={turn.id}
        className={`flex ${isAI ? 'justify-start' : 'justify-end'} ${isMobile ? 'mb-6' : 'mb-4'} animate-fade-in`}
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        <div className={`${
          isMobile 
            ? orientation === 'landscape' 
              ? 'max-w-sm' 
              : 'max-w-xs'
            : 'max-w-xs lg:max-w-md xl:max-w-lg'
        } ${isAI ? 'order-2' : 'order-1'}`}>
          {/* Message bubble */}
          <div
            className={`${isMobile ? 'px-5 py-4' : 'px-4 py-3'} rounded-2xl shadow-sm ${
              isAI
                ? 'bg-white border border-gray-200 text-gray-800'
                : 'bg-orange-500 text-white'
            } ${isAI ? 'rounded-tl-sm' : 'rounded-tr-sm'}`}
            style={{
              touchAction: 'manipulation' // Optimize for touch
            }}
          >
            <p className={`${isMobile ? 'text-base' : 'text-sm'} leading-relaxed whitespace-pre-wrap`}>
              {turn.content}
            </p>
            
            {/* Audio controls and timestamp */}
            <div className={`flex items-center justify-between mt-2 pt-2 border-t ${
              isAI ? 'border-gray-100' : 'border-orange-400'
            }`}>
              <div className="flex items-center space-x-2">
                {/* Audio play button */}
                <button
                  onClick={() => playAudio(turn.content, turn.id)}
                  className={`${isMobile ? 'p-2' : 'p-1'} rounded-full transition-colors ${
                    isAI
                      ? 'hover:bg-gray-100 active:bg-gray-200 text-gray-500 hover:text-gray-700'
                      : 'hover:bg-orange-400 active:bg-orange-600 text-orange-100 hover:text-white'
                  }`}
                  style={{
                    touchAction: 'manipulation',
                    minWidth: isMobile ? '44px' : 'auto',
                    minHeight: isMobile ? '44px' : 'auto'
                  }}
                  aria-label={isPlaying ? 'Stop audio' : 'Play audio'}
                >
                  {isPlaying ? (
                    <svg className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                {/* Processing time indicator */}
                {turn.processingTime && !isMobile && (
                  <span className={`text-xs ${
                    isAI ? 'text-gray-400' : 'text-orange-200'
                  }`}>
                    {turn.processingTime}ms
                  </span>
                )}
              </div>

              {/* Timestamp */}
              <span className={`${isMobile ? 'text-sm' : 'text-xs'} ${
                isAI ? 'text-gray-400' : 'text-orange-200'
              }`}>
                {formatTimestamp(turn.timestamp)}
              </span>
            </div>
          </div>
        </div>

        {/* Avatar */}
        <div className={`flex-shrink-0 ${isAI ? `order-1 ${isMobile ? 'mr-4' : 'mr-3'}` : `order-2 ${isMobile ? 'ml-4' : 'ml-3'}`}`}>
          <div className={`${isMobile ? 'w-10 h-10' : 'w-8 h-8'} rounded-full flex items-center justify-center ${
            isAI ? 'bg-orange-100' : 'bg-gray-100'
          }`}>
            {isAI ? (
              <svg className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-orange-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            ) : (
              <svg className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-gray-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProcessingIndicator = () => {
    if (!isProcessing) return null;

    return (
      <div className={`flex justify-start ${isMobile ? 'mb-6' : 'mb-4'}`}>
        <div className={`flex-shrink-0 ${isMobile ? 'mr-4' : 'mr-3'}`}>
          <div className={`${isMobile ? 'w-10 h-10' : 'w-8 h-8'} rounded-full bg-orange-100 flex items-center justify-center`}>
            <svg className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'} text-orange-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        </div>
        
        <div className={`${
          isMobile 
            ? orientation === 'landscape' 
              ? 'max-w-sm' 
              : 'max-w-xs'
            : 'max-w-xs lg:max-w-md xl:max-w-lg'
        }`}>
          <div className={`${isMobile ? 'px-5 py-4' : 'px-4 py-3'} bg-white border border-gray-200 rounded-2xl rounded-tl-sm shadow-sm`}>
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className={`${isMobile ? 'text-base' : 'text-sm'} text-gray-500`}>AI is thinking...</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEmptyState = () => {
    if (conversationHistory.length > 0) return null;

    return (
      <div className={`flex flex-col items-center justify-center h-full text-center ${isMobile ? 'p-12' : 'p-8'}`}>
        <div className={`${isMobile ? 'w-20 h-20' : 'w-16 h-16'} bg-orange-100 rounded-full flex items-center justify-center mb-4`}>
          <svg className={`${isMobile ? 'w-10 h-10' : 'w-8 h-8'} text-orange-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className={`${isMobile ? 'text-xl' : 'text-lg'} font-semibold text-gray-800 mb-2`}>
          Ready to start our conversation!
        </h3>
        <p className={`text-gray-600 ${isMobile ? 'max-w-md text-base' : 'max-w-sm'}`}>
          I'll ask you questions about your handmade product to create the perfect listing. 
          Let's begin when you're ready.
        </p>
      </div>
    );
  };

  const renderConversationStats = () => {
    if (conversationHistory.length === 0) return null;

    const userResponses = conversationHistory.filter(turn => turn.type === 'user_response').length;
    const aiQuestions = conversationHistory.filter(turn => turn.type === 'ai_question').length;

    return (
      <div className={`sticky top-0 bg-gradient-to-b from-orange-50 to-transparent ${isMobile ? 'p-6 mb-6' : 'p-4 mb-4'} z-10`}>
        <div className="flex justify-center">
          <div className={`bg-white rounded-full ${isMobile ? 'px-6 py-3' : 'px-4 py-2'} shadow-sm border border-orange-100`}>
            <div className={`flex items-center ${isMobile ? 'space-x-6' : 'space-x-4'} ${isMobile ? 'text-sm' : 'text-xs'} text-gray-600`}>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                {aiQuestions} questions
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                {userResponses} responses
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Conversation stats */}
      {renderConversationStats()}

      {/* Scrollable conversation area */}
      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto ${isMobile ? 'px-6 pb-6' : 'px-4 pb-4'} scroll-smooth`}
        style={{ 
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
          overscrollBehavior: 'contain' // Prevent overscroll bounce on mobile
        }}
      >
        {/* Empty state */}
        {renderEmptyState()}

        {/* Conversation turns */}
        {conversationHistory.map((turn, index) => renderTurn(turn, index))}

        {/* Processing indicator */}
        {renderProcessingIndicator()}

        {/* Scroll anchor */}
        <div className="h-1" />
      </div>

      {/* Scroll to bottom button for mobile */}
      {showScrollToBottom && isMobile && (
        <div className="absolute bottom-4 right-4 z-20">
          <button
            onClick={() => {
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                setIsScrolledToBottom(true);
              }
            }}
            className="w-12 h-12 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
            style={{
              touchAction: 'manipulation'
            }}
            aria-label="Scroll to bottom"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}

      {/* Quick actions */}
      {conversationHistory.length > 0 && !isMobile && (
        <div className="flex-shrink-0 px-4 py-2 bg-gradient-to-t from-orange-50 to-transparent">
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop = 0;
                }
              }}
              className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50 rounded-full border border-gray-200 transition-colors"
            >
              ↑ Scroll to top
            </button>
            <button
              onClick={() => {
                speechSynthesis.cancel();
                setPlayingAudio(null);
              }}
              className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50 rounded-full border border-gray-200 transition-colors"
            >
              ⏹ Stop audio
            </button>
          </div>
        </div>
      )}

      {/* Mobile quick actions */}
      {conversationHistory.length > 0 && isMobile && (
        <div className="flex-shrink-0 px-6 py-3 bg-gradient-to-t from-orange-50 to-transparent">
          <div className="flex justify-center">
            <button
              onClick={() => {
                speechSynthesis.cancel();
                setPlayingAudio(null);
              }}
              className="px-6 py-3 text-sm text-gray-600 hover:text-gray-800 active:text-gray-900 bg-white hover:bg-gray-50 active:bg-gray-100 rounded-full border border-gray-200 transition-colors shadow-sm"
              style={{
                touchAction: 'manipulation'
              }}
            >
              ⏹ Stop audio
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationHistory;