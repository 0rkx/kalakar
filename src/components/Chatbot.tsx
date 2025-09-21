import React, { useState, useEffect, useRef } from 'react';
import { chatWithArtisanAssistant as apiChat } from '../services/api';

interface ChatbotProps {
    userId: string;
}

interface Message {
    text: string;
    sender: 'user' | 'bot';
}

const Chatbot: React.FC<ChatbotProps> = ({ userId }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId] = useState(() => `chat_${userId}_${Date.now()}`);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userMessage: Message = { text: inputValue, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const result = await apiChat(inputValue, sessionId, userId);
            if (result.success) {
                const botMessage: Message = { text: result.reply, sender: 'bot' };
                setMessages(prev => [...prev, botMessage]);
            }
        } catch (error) {
            console.error("Chatbot error:", error);
            const errorMessage: Message = { text: "Sorry, I'm having trouble connecting. Please try again later.", sender: 'bot' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-20 right-4 w-80 h-96 bg-background-main rounded-xl shadow-xl border border-border-color flex flex-col overflow-hidden">
            <style>{`
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
            <header className="bg-primary-brand text-white p-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                    </div>
                    <h2 className="text-base font-semibold">Kalakar AI Assistant</h2>
                </div>
            </header>
            <div className="flex-grow p-4 overflow-y-auto bg-background-light scrollbar-hide">
                {messages.length === 0 && (
                    <div className="text-center py-4">
                        <div className="w-12 h-12 bg-primary-brand/10 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="material-symbols-outlined text-primary-brand">waving_hand</span>
                        </div>
                        <p className="text-sm text-secondary-text">Hi! I'm here to help with your Kalakar questions.</p>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
                        <div className={`max-w-xs p-3 rounded-lg ${
                            msg.sender === 'user' 
                                ? 'bg-primary-brand text-white rounded-br-sm' 
                                : 'bg-background-main text-primary-text rounded-bl-sm border border-border-color'
                        }`}>
                            <p className="text-sm">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start mb-3">
                        <div className="bg-background-main text-primary-text p-3 rounded-lg rounded-bl-sm border border-border-color">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-secondary-text rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-secondary-text rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-2 h-2 bg-secondary-text rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 bg-background-main border-t border-border-color">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask about listings, markets, pricing..."
                        className="flex-grow bg-background-light border border-border-color rounded-lg px-3 py-2 text-sm placeholder:text-secondary-text focus:ring-2 focus:ring-primary-brand focus:border-primary-brand"
                        disabled={isLoading}
                    />
                    <button 
                        type="submit" 
                        className="bg-primary-brand text-white p-2 rounded-lg hover:bg-primary-brand/90 transition-colors disabled:opacity-50" 
                        disabled={isLoading || !inputValue.trim()}
                    >
                        <span className="material-symbols-outlined text-lg">send</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Chatbot;
