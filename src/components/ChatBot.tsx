import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

// Detect language from text
const detectLanguage = (text: string): 'hi' | 'en' => {
    const devanagariRegex = /[\u0900-\u097F]/g;
    const devanagariChars = text.match(devanagariRegex) || [];
    // If more than 30% of text is Devanagari, consider it Hindi
    return devanagariChars.length > text.length * 0.3 ? 'hi' : 'en';
};

export default function ChatBot() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'नमस्ते किसान भाई! 👋 मैं आपकी कृषि संबंधी समस्याओं में मदद करने के लिए यहाँ हूँ। आप हिंदी या अंग्रेजी में सवाल पूछ सकते हैं।',
            sender: 'bot',
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!inputValue.trim()) return;

        // Add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputValue,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            // Auto-detect language from user input
            const detectedLanguage = detectLanguage(inputValue);

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: inputValue,
                    language: detectedLanguage,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: data.reply,
                sender: 'bot',
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: 'Sorry, an error occurred. Please try again. / क्षमा करें, कुछ त्रुटि हुई। कृपया फिर से कोशिश करें।',
                sender: 'bot',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gradient-to-b from-green-50 to-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 flex items-center gap-3 sticky top-0 z-10">
                <MessageCircle size={28} />
                <div>
                    <h1 className="text-xl font-bold">कृषि सहायक | Farm Assistant</h1>
                    <p className="text-xs text-green-100">आपकी कृषि समस्याओं का समाधान | Your Farming Solutions</p>
                </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${message.sender === 'user'
                                ? 'bg-green-600 text-white rounded-br-none'
                                : 'bg-gray-200 text-gray-900 rounded-bl-none'
                                }`}
                        >
                            <p className="text-sm leading-relaxed">{message.text}</p>
                            <p
                                className={`text-xs mt-1 ${message.sender === 'user' ? 'text-green-100' : 'text-gray-500'
                                    }`}
                            >
                                {message.timestamp.toLocaleTimeString('hi-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-200 text-gray-900 px-4 py-3 rounded-lg rounded-bl-none">
                            <div className="flex gap-2">
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="bg-white border-t border-gray-200 p-4 sticky bottom-0">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="अपनी समस्या बताएं... Ask in English or Hindi"
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-green-500 text-sm"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !inputValue.trim()}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg px-4 py-2 transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </form>
                <p className="text-xs text-gray-500 mt-2 text-center">
                    💡 फसल, कीट, खाद, सिंचाई के बारे में पूछें | Ask about crops, pests, fertilizers, irrigation
                </p>
            </div>
        </div>
    );
}
