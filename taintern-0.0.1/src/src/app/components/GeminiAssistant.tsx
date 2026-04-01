import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, ThinkingLevel, GenerateContentResponse } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles, Image as ImageIcon, Paperclip } from 'lucide-react';
import { useAppData } from '../lib/AppDataContext';

export function GeminiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; isThinking?: boolean; image?: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { appData } = useAppData();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage = input.trim();
    const currentImage = selectedImage;
    
    setInput('');
    setSelectedImage(null);
    setMessages(prev => [...prev, { role: 'user', text: userMessage, image: currentImage || undefined }]);
    setIsLoading(true);
    
    // Add a thinking message
    setMessages(prev => [...prev, { role: 'assistant', text: '', isThinking: true }]);

    try {
      const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API Key is missing. Please set it in your environment variables.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Serialize app data for context
      const contextData = JSON.stringify({
        rosterCount: appData.Q_Roster?.length || 0,
        settings: appData.Settings,
        salaryScales: appData.SalaryScales,
      }).substring(0, 2000); // Limit context size

      const systemInstruction = `You are an intelligent assistant for a Payroll and Timesheet application. 
      You help users understand their data, navigate the app, and answer questions.
      Current App Context (partial): ${contextData}
      Be concise and helpful. You can analyze images if provided.`;

      const contents: any[] = [];
      if (currentImage) {
        const base64Data = currentImage.split(',')[1];
        const mimeType = currentImage.split(';')[0].split(':')[1];
        contents.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }
      if (userMessage) {
        contents.push({ text: userMessage });
      }

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: { parts: contents },
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
      });

      setMessages(prev => {
        const newMessages = [...prev];
        // Replace the thinking message with the actual response
        newMessages[newMessages.length - 1] = { role: 'assistant', text: response.text || 'No response generated.' };
        return newMessages;
      });
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: 'assistant', text: `Error: ${error.message || 'Failed to generate response.'}` };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-primary text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all z-50 ${isOpen ? 'hidden' : 'flex'}`}
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-[380px] h-[600px] max-h-[80vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-border flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-primary/10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">AI Assistant</h3>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-bold">
                    <Sparkles className="w-3 h-3 text-primary" />
                    High Thinking Mode
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-50">
                  <Bot className="w-12 h-12 text-primary" />
                  <p className="text-sm">Hi! I'm your AI assistant. How can I help you with your payroll data today?</p>
                </div>
              )}
              
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div
                    className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-tl-sm'
                    }`}
                  >
                    {msg.image && (
                      <img src={msg.image} alt="Uploaded" className="max-w-full h-auto rounded-lg mb-2 border border-white/20" />
                    )}
                    {msg.isThinking ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-background">
              {selectedImage && (
                <div className="mb-2 relative inline-block">
                  <img src={selectedImage} alt="Preview" className="w-16 h-16 object-cover rounded-lg border-2 border-primary" />
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="relative flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me anything..."
                    className="w-full pl-4 pr-12 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={(!input.trim() && !selectedImage) || isLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
