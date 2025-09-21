import React, { useState, useEffect, useRef } from 'react';
import { chatWithArtisanAssistant as apiChat } from '../services/api';
import BottomNavigation from './BottomNavigation';

interface AIAssistantScreenProps {
    onBack: () => void;
    onNavigateToProducts?: () => void;
    onNavigateToProfile?: () => void;
    userId?: string;
}

interface Message {
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

const AIAssistantScreen: React.FC<AIAssistantScreenProps> = ({ 
    onBack, 
    onNavigateToProducts, 
    onNavigateToProfile, 
    userId 
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId] = useState(() => `chat_${userId}_${Date.now()}`);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    // Welcome message on component mount
    useEffect(() => {
        const welcomeMessage: Message = {
            text: "Hi! I'm your Kalakar AI Assistant. I'm here to help with creating listings, marketplace features, pricing strategies, and more. What would you like to know?",
            sender: 'bot',
            timestamp: new Date()
        };
        setMessages([welcomeMessage]);
    }, []);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userMessage: Message = { 
            text: inputValue, 
            sender: 'user', 
            timestamp: new Date() 
        };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const result = await apiChat(inputValue, sessionId, userId || 'anonymous');
            if (result.success) {
                const botMessage: Message = { 
                    text: result.reply, 
                    sender: 'bot', 
                    timestamp: new Date() 
                };
                setMessages(prev => [...prev, botMessage]);
            }
        } catch (error) {
            console.error("AI Assistant error:", error);
            const errorMessage: Message = { 
                text: "Sorry, I'm having trouble connecting. Please try again later.", 
                sender: 'bot', 
                timestamp: new Date() 
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const quickQuestions = [
        "How do I create a good product listing?",
        "What are the best pricing strategies?",
        "How do I optimize my photos?",
        "Which marketplace should I use?",
        "How do I write compelling descriptions?"
    ];

    const handleQuickQuestion = (question: string) => {
        setInputValue(question);
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
            
            {/* Header */}
            <header className="bg-primary-brand text-white px-4 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <button 
                        className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors"
                        onClick={onBack}
                    >
                        <span className="material-symbols-outlined text-white">arrow_back</span>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-white">smart_toy</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">Kalakar AI Assistant</h1>
                            <p className="text-sm text-white/80">Your marketplace companion</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Chat Messages */}
            <main className="flex-grow overflow-y-auto scrollbar-hide bg-background-light">
                <div className="p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-2xl ${
                                msg.sender === 'user' 
                                    ? 'bg-primary-brand text-white rounded-br-md' 
                                    : 'bg-background-main text-primary-text rounded-bl-md border border-border-color shadow-sm'
                            }`}>
                                <p className="text-sm leading-relaxed">{msg.text}</p>
                                <p className={`text-xs mt-2 ${
                                    msg.sender === 'user' ? 'text-white/70' : 'text-secondary-text'
                                }`}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-background-main text-primary-text p-4 rounded-2xl rounded-bl-md border border-border-color shadow-sm">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-secondary-text rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-secondary-text rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                    <div className="w-2 h-2 bg-secondary-text rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Quick Questions */}
                    {messages.length === 1 && (
                        <div className="mt-6">
                            <p className="text-sm text-secondary-text mb-3 px-2">Quick questions to get started:</p>
                            <div className="space-y-2">
                                {quickQuestions.map((question, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleQuickQuestion(question)}
                                        className="w-full text-left p-3 bg-background-main border border-border-color rounded-lg hover:bg-background-light transition-colors"
                                    >
                                        <span className="text-sm text-primary-text">{question}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input Area */}
            <div className="bg-background-main border-t border-border-color p-4">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask about listings, markets, pricing..."
                        className="flex-grow bg-background-light border border-border-color rounded-full px-4 py-3 text-sm placeholder:text-secondary-text focus:ring-2 focus:ring-primary-brand focus:border-primary-brand"
                        disabled={isLoading}
                    />
                    <button 
                        type="submit" 
                        className="bg-primary-brand text-white p-3 rounded-full hover:bg-primary-brand/90 transition-colors disabled:opacity-50 min-w-[48px]" 
                        disabled={isLoading || !inputValue.trim()}
                    >
                        <span className="material-symbols-outlined text-lg">send</span>
                    </button>
                </form>
            </div>

            {/* Bottom Navigation */}
            <BottomNavigation
                currentScreen="help"
                onNavigateToProducts={onNavigateToProducts || (() => {})}
                onNavigateToProfile={onNavigateToProfile || (() => {})}
                onNavigateToHelp={() => {}} // Already on help screen
            />
        </div>
    );
};

export default AIAssistantScreen;