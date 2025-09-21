import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { backendApi } from '../services/backendApi';

interface SimpleConversationInterfaceProps {
  selectedLanguage: Language;
  userName: string;
  userLocation: string;
  sessionId: string;
  onBack: () => void;
  onConversationComplete?: (conversationData: any, knowledgeId: string) => void;
  resumedConversationData?: any;
  resumedConversationState?: any;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const SimpleConversationInterface: React.FC<SimpleConversationInterfaceProps> = ({
  selectedLanguage,
  userName,
  userLocation,
  sessionId,
  onBack,
  onConversationComplete,
  resumedConversationData,
  resumedConversationState
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [extractedInfo, setExtractedInfo] = useState<any>({});
  const [knowledgeId, setKnowledgeId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize conversation
  useEffect(() => {
    initializeConversation();
  }, []);

  const initializeConversation = async () => {
    try {
      console.log('🤖 INITIALIZING SIMPLE GEMINI CONVERSATION');
      
      const introMessage = `Hello ${userName}! I'm here to help you create a beautiful listing for your handmade product. Can you start by telling me what you've made?`;
      
      // Add intro message
      const introMsg: Message = {
        id: `msg_${Date.now()}`,
        type: 'ai',
        content: introMessage,
        timestamp: new Date()
      };
      
      setMessages([introMsg]);
      setIsInitialized(true);
      
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      type: 'user',
      content: inputText.trim(),
      timestamp: new Date()
    };

    // Add user message
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputText.trim();
    setInputText('');
    setIsLoading(true);

    try {
      console.log('🧠 Processing conversation with backend Gemini...');
      
      // Process conversation with backend
      const result = await backendApi.processConversation({
        sessionId,
        userInput: messageToSend,
        conversationHistory,
        stage: messages.length < 2 ? 'introduction' : 'basic_info'
      });

      console.log('✅ Backend conversation processing completed:', result);

      if (result.success) {
        // Update conversation history
        setConversationHistory(prev => [...prev, {
          userInput: messageToSend,
          aiResponse: result.response,
          extractedInfo: result.extractedInfo
        }]);

        // Update extracted info
        setExtractedInfo(prev => ({ ...prev, ...result.extractedInfo }));
        
        // Store knowledge ID
        if (result.knowledgeId) {
          setKnowledgeId(result.knowledgeId);
        }

        // Add AI response
        const aiMessage: Message = {
          id: `msg_${Date.now() + 1}`,
          type: 'ai',
          content: result.response,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);

        // Check if conversation is complete (simple heuristic)
        if (messages.length >= 6 && Object.keys(extractedInfo).length >= 3) {
          setTimeout(() => {
            const conversationData = {
              id: sessionId,
              extractedInfo: { ...extractedInfo, ...result.extractedInfo },
              turns: conversationHistory,
              language: selectedLanguage
            };
            onConversationComplete?.(conversationData, knowledgeId);
          }, 2000);
        }
      } else {
        throw new Error(result.error || 'Backend processing failed');
      }

    } catch (error) {
      console.error('❌ Error processing message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        type: 'ai',
        content: "I'm having trouble processing your message. Please try again.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">Back</span>
        </button>
        
        <div className="text-center flex-1 mx-2">
          <h1 className="text-base font-semibold text-gray-800">
            Simple Gemini Live Test
          </h1>
          <div className="text-xs text-gray-500">
            {messages.length} messages • {session ? 'Connected' : 'Not connected'}
          </div>
        </div>
        
        <div className="w-12"></div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-800 shadow-sm'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 shadow-sm px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                <span className="text-sm">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            disabled={isLoading || !isInitialized}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputText.trim() || !isInitialized}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleConversationInterface;