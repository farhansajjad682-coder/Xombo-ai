import React, { useState, useRef } from 'react';
import { Send, Plus, Mic, Image, FileText, Globe, Paperclip, X, Crown, CreditCard, Copy, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';

interface ChatInputProps {
  onSend: (message: string, image?: string) => void;
  disabled?: boolean;
  user: User | null;
  onUpgrade: () => void;
  onRequestPremium: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled, user, onUpgrade, onRequestPremium }) => {
  const [input, setInput] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isImageGenerationRequest = input.toLowerCase().includes('generate') || 
                                     input.toLowerCase().includes('create') || 
                                     input.toLowerCase().includes('draw') ||
                                     input.toLowerCase().includes('banana');

    if (isImageGenerationRequest && !user?.isPremium) {
      onRequestPremium();
      return;
    }

    if ((input.trim() || selectedImage) && !disabled) {
      onSend(input.trim(), selectedImage || undefined);
      setInput('');
      setSelectedImage(null);
      setIsMenuOpen(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setIsMenuOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.");
      return;
    }
    
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; // Default, but it usually picks up Urdu/Hindi too if available
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? " " : "") + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      
      if (event.error === 'not-allowed') {
        alert("Microphone access was denied. Please enable it in your browser settings to use voice input.");
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const suggestions = [
    { label: '📊 Analyze Data', prompt: 'Analyze this sample data: [10, 20, 30, 40]' },
    { label: '🌐 Search Web', prompt: 'What are the top 3 AI news today?' },
    { label: '🖼️ Generate Image', prompt: 'Tell me about Imagen 3 capabilities' },
    { label: '📝 Summarize', prompt: 'Summarize the benefits of AI in 3 points' },
    { label: '🕒 Local Time', prompt: 'What time is it now?' },
    { label: '🌤️ Weather', prompt: 'Weather in Paris' },
  ];

  return (
    <div className="p-0 px-[15%] pb-10 bg-transparent shrink-0">
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => !disabled && onSend(s.prompt)}
            disabled={disabled}
            className="flex-shrink-0 px-3.5 py-1.5 bg-white border border-[#e5e7eb] rounded-full text-[12px] text-[#6b7280] flex items-center gap-1 hover:border-[#2563eb] hover:text-[#2563eb] transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer shadow-sm"
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleImageSelect}
        />
        
        <AnimatePresence>
          {selectedImage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute bottom-full left-0 mb-4 p-2 bg-white border border-[#e5e7eb] rounded-xl shadow-lg z-50 group"
            >
              <img src={selectedImage} className="max-h-32 rounded-lg" alt="Upload preview" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-0 mb-4 bg-white border border-[#e5e7eb] rounded-xl shadow-xl p-2 grid grid-cols-2 gap-2 min-w-[200px] max-h-[300px] overflow-y-auto custom-scrollbar z-50"
            >
              {[
                { icon: <Image size={18} />, label: 'Solve Question', color: 'text-blue-500', isPremium: false, onClick: () => fileInputRef.current?.click() },
                { icon: <Globe size={18} />, label: 'Search the Web', color: 'text-green-500', isPremium: true, onClick: () => setInput(p => p + (p ? " " : "") + "Search for: ") },
                { icon: <FileText size={18} />, label: 'Analyze Document', color: 'text-orange-500', isPremium: true, onClick: () => {} },
                { icon: <Paperclip size={18} />, label: 'Upload Reference', color: 'text-purple-500', isPremium: true, onClick: () => {} },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    item.onClick();
                    if (item.label !== 'Solve Question') setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium text-[#374151] relative group/item"
                >
                  <span className={item.color}>{item.icon}</span>
                  <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="bg-white border border-[#e5e7eb] rounded-2xl p-3 input-box-shadow flex flex-col gap-2">
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-full transition-all ${isMenuOpen ? 'bg-blue-50 text-blue-600' : 'text-[#6b7280] hover:bg-gray-100'}`}
            >
              {isMenuOpen ? <X size={20} /> : <Plus size={20} />}
            </button>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={disabled}
              placeholder="Ask Gemini"
              rows={1}
              className="flex-grow bg-transparent border-none text-[15px] focus:outline-none resize-none pt-2 pb-2 text-[#111827] placeholder-[#9ca3af]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleRecording}
                disabled={disabled}
                className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-50 text-red-500 animate-pulse' : 'text-[#6b7280] hover:bg-gray-100'}`}
                title="Voice Input"
              >
                <Mic size={20} />
              </button>
              
              <button
                type="submit"
                disabled={!input.trim() || disabled}
                className="bg-[#2563eb] text-white rounded-full p-2.5 hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:shadow-none"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </form>
      </div>

      <p className="text-[10px] text-[#6b7280] text-center mt-3">
        Gemini AI can make mistakes. Check important info.
      </p>
    </div>
  );
};
