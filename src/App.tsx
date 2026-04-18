/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, MouseEvent } from 'react';
import { Message, Conversation, User } from './types.ts';
import { ChatMessage } from './components/ChatMessage.tsx';
import { ChatInput } from './components/ChatInput.tsx';
import { Login } from './components/Login.tsx';
import { chatWithGemini, generateSpeech } from './services/gemini.ts';
import { 
  MessageSquare, 
  History, 
  Plus, 
  Trash2, 
  PanelLeftClose, 
  PanelLeftOpen,
  Sparkles,
  Zap,
  Bot,
  Menu,
  Settings,
  MoreVertical,
  LogOut,
  Crown,
  X,
  Copy,
  Volume2,
  VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Polyfill for crypto.randomUUID in insecure contexts
if (typeof window !== 'undefined') {
  try {
    if (!window.crypto?.randomUUID) {
      (window as any).safeRandomUUID = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
    }
  } catch (e) {
    console.warn("Could not setup UUID fallback", e);
  }
}

const getRandomUUID = () => {
  if (typeof window !== 'undefined') {
    try {
      if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    } catch {
      // Ignore errors from browser restrictions
    }
    if ((window as any).safeRandomUUID) return (window as any).safeRandomUUID();
  }
  return 'fallback-' + Math.random().toString(36).substring(2, 11);
};

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`Error reading from localStorage key "${key}":`, e);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn(`Error writing to localStorage key "${key}":`, e);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`Error removing from localStorage key "${key}":`, e);
    }
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = safeLocalStorage.getItem('chat_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = safeLocalStorage.getItem('chat_history');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default to closed as requested
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'info' | 'method'>('info');
  const [paymentDetails, setPaymentDetails] = useState({
    method: '',
    accountNumber: '',
    accountName: '',
    transactionId: '',
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      // Only auto-close on very small screens
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize(); // Run once on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user) {
      safeLocalStorage.setItem('chat_user', JSON.stringify(user));
    } else {
      safeLocalStorage.removeItem('chat_user');
    }
  }, [user]);

  useEffect(() => {
    safeLocalStorage.setItem('chat_history', JSON.stringify(conversations));
  }, [conversations]);

  const handleLogin = (u: User) => {
    setUser(u);
  };

  const logout = () => {
    setUser(null);
    setCurrentId(null);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversations, currentId]);

  const currentConversation = conversations.find(c => c.id === currentId);

  const startNewChat = () => {
    const newId = getRandomUUID();
    setConversations(prev => [{
      id: newId,
      title: 'New Conversation',
      messages: [],
      updatedAt: Date.now()
    }, ...prev]);
    setCurrentId(newId);
  };

  const speakText = async (text: string) => {
    if (!ttsEnabled || !text) return;
    try {
      const { data, mimeType } = await generateSpeech(text);
      const audio = new Audio(`data:${mimeType};base64,${data}`);
      audio.play().catch(err => {
        console.warn('Audio play prevented or failed:', err);
      });
    } catch (e) {
      console.error('TTS error:', e);
    }
  };

  const handleSend = async (content: string, image?: string) => {
    let activeId = currentId;
    
    // Check for image generation request
    // Only block if the user is explicitly asking to "generate" or "create" a NEW image
    // If they have an image uploaded, assume they want to "solve" or "analyze" it.
    const generationKeywords = ['generate image', 'create image', 'draw image', 'make an image', 'generate a landscape', 'create a portrait'];
    const isExplicitGeneration = generationKeywords.some(k => content.toLowerCase().includes(k));

    // Forcing premium for this session as requested
    const isUserPremium = true; 

    if (isExplicitGeneration && !image && !isUserPremium) {
      setShowPremiumModal(true);
      return;
    }

    const newMessage: Message = {
      id: getRandomUUID(),
      role: 'user',
      content,
      image,
      timestamp: Date.now(),
    };

    const aiMessageId = getRandomUUID();
    const initialAiMessage: Message = {
      id: aiMessageId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
    };

    if (!activeId) {
      activeId = getRandomUUID();
      const newConv: Conversation = {
        id: activeId,
        title: content ? content.slice(0, 30) + '...' : 'New Image Analysis',
        messages: [newMessage, initialAiMessage],
        updatedAt: Date.now()
      };
      setConversations(prev => [newConv, ...prev]);
      setCurrentId(activeId);
    } else {
      setConversations(prev => prev.map(c => {
        if (c.id === activeId) {
          return {
            ...c,
            messages: [...c.messages, newMessage, initialAiMessage],
            updatedAt: Date.now()
          };
        }
        return c;
      }));
    }

    setIsLoading(true);

    try {
      const conv = conversations.find(c => c.id === activeId) || { messages: [] };
      const currentMessages = [...conv.messages, newMessage];
      
      const aiResponse = await chatWithGemini(currentMessages, (chunkText) => {
        setConversations(prev => prev.map(c => {
          if (c.id === activeId) {
            return {
              ...c,
              messages: c.messages.map(m => 
                m.id === aiMessageId ? { ...m, content: chunkText } : m
              ),
              updatedAt: Date.now()
            };
          }
          return c;
        }));
      });

      // Speak the response after it finishes
      if (aiResponse) {
        speakText(aiResponse);
      }
      
      setConversations(prev => prev.map(c => {
        if (c.id === activeId) {
          const title = c.messages.length <= 2 ? content.slice(0, 40) : c.title;
          return {
            ...c,
            title,
            updatedAt: Date.now()
          };
        }
        return c;
      }));
    } catch (error) {
      console.error('Error in chat:', error);
      const errorMessage: Message = {
        id: getRandomUUID(),
        role: 'model',
        content: 'Sorry, I encountered an error processing your request. Please check your credentials or try again later.',
        timestamp: Date.now(),
      };
      setConversations(prev => prev.map(c => {
        if (c.id === activeId) {
          return {
            ...c,
            messages: [...c.messages, errorMessage],
            updatedAt: Date.now()
          };
        }
        return c;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const upgradeToPremium = () => {
    if (user) {
      const updatedUser = { ...user, isPremium: true };
      setUser(updatedUser);
      setConversations(prev => [{
        id: getRandomUUID(),
        role: 'model',
        content: `🎉 **XOMBO PRO ACTIVATED!** \n\nYou now have Lifetime Premium Access. All features including Google Web Search, Document Analysis, and Unlimited Image Generation (Nano-Banana Engine) are now unlocked for you.`,
        timestamp: Date.now()
      } as any, ...prev]);
    }
  };

  const deleteConversation = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentId === id) setCurrentId(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden font-sans">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm sm:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div 
        animate={{ 
          width: sidebarOpen ? (window.innerWidth < 640 ? '100vw' : 320) : 0,
          x: sidebarOpen ? 0 : -320
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        className="fixed inset-y-0 left-0 sm:relative z-50 bg-[#f0f4f9] border-r border-[#e5e7eb] flex flex-col overflow-hidden shadow-2xl sm:shadow-none"
      >
        <div className="p-5 border-b border-[#e5e7eb] min-w-[320px] mt-2 flex flex-col gap-3 relative">
          <button 
            onClick={() => setSidebarOpen(false)}
            className="absolute top-2 right-2 p-2 text-[#444746] hover:bg-[#e1e5e9] rounded-full transition-all z-10"
            title="Close Menu"
          >
            <X size={20} />
          </button>

          <button 
            onClick={startNewChat}
            className="flex items-center gap-3 bg-[#dde3ea] text-[#1f1f1f] rounded-full px-6 py-3.5 font-semibold hover:bg-[#d3dae3] transition-all text-sm group w-full"
          >
            <Plus size={22} className="text-[#1f1f1f]" />
            <span className="group-hover:translate-x-0.5 transition-transform">New Chat</span>
          </button>
          
          <button 
            onClick={() => handleSend("Generate a creative landscape image")}
            className="flex items-center gap-3 bg-white text-purple-600 border border-purple-200 rounded-full px-6 py-3 font-semibold hover:bg-purple-50 transition-all text-sm group w-full shadow-sm"
          >
            <Sparkles size={20} className="text-purple-600" />
            <span className="">Generate Image</span>
          </button>

          {!user.isPremium && (
            <button 
              onClick={() => setShowPremiumModal(true)}
              className="flex items-center gap-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full px-6 py-3.5 font-bold hover:shadow-lg hover:shadow-purple-200 transition-all text-sm group w-full relative overflow-hidden active:scale-95"
            >
              <Crown size={20} className="text-yellow-300 animate-bounce" />
              <span>Unlock Premium</span>
              <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12" />
            </button>
          )}
        </div>

        <div className="flex-grow overflow-y-auto p-4 min-w-[320px]">
          <div className="flex items-center gap-2 px-3 mb-5 mt-6">
            <History size={18} className="text-[#444746]" />
            <span className="text-sm font-bold text-[#444746] uppercase tracking-widest opacity-80">Recent History</span>
          </div>
          
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => {
                setCurrentId(conv.id);
                if (window.innerWidth < 640) setSidebarOpen(false);
              }}
              className={`w-full text-left px-5 py-3.5 rounded-full transition-all flex items-center justify-between group mb-1.5 text-[14px] cursor-pointer ${
                currentId === conv.id ? 'bg-[#c2e7ff] text-[#001d35] font-semibold' : 'text-[#1f1f1f] hover:bg-[#e1e5e9]'
              }`}
              role="button"
              tabIndex={0}
            >
              <span className="truncate pr-2">{conv.title}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(e, conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 transition-all shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-6 min-w-[320px] bg-[#e9eef6] border-t border-[#dce2ec]">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center bg-white shadow-sm border border-[#dce2ec] group">
              <Bot size={24} className="text-black group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-[#1f1f1f] tracking-tighter uppercase leading-none mb-1">Xombo AI</span>
              <span className="text-[10px] text-[#444746] font-bold uppercase tracking-widest opacity-60">Nano Engine v3</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-grow flex flex-col h-full relative overflow-hidden bg-white sm:rounded-tl-[28px] my-0 sm:my-2 ml-0 sm:ml-2 mr-0 sm:mr-2 shadow-sm border border-[#e5e7eb]">
        {/* Header */}
        <header className="h-[64px] border-b border-[#e5e7eb] flex items-center justify-between px-6 sm:px-10 bg-[#f8f9fa] shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-[#6b7280] hover:bg-gray-100 rounded-md transition-all sm:hidden"
              title="Toggle Sidebar"
            >
              <Menu size={20} />
            </button>
            
            <div className="flex gap-4 font-medium text-sm hidden sm:flex items-center ml-2">
              {!sidebarOpen && (
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 text-[#6b7280] hover:bg-gray-100 rounded-md transition-all mr-2"
                  title="Open Menu"
                >
                  <Menu size={20} />
                </button>
              )}
              <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-[#e2e8f0] shadow-sm">
                <div className="w-5 h-5 rounded-md overflow-hidden bg-black flex items-center justify-center">
                  <Bot size={14} className="text-white" />
                </div>
                <span className="text-black font-black tracking-tight uppercase text-xs">Xombo AI</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 hover:bg-gray-50 rounded-full transition-colors cursor-pointer group">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[#64748b] text-xs font-bold uppercase tracking-widest group-hover:text-[#2563eb]">History Enabled</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-2 hidden sm:flex">
              <span className="text-[13px] font-semibold text-[#111827]">{user.name}</span>
              <span className={`text-[10px] uppercase tracking-widest font-bold ${user.isPremium ? 'text-purple-600' : 'text-[#6b7280]'}`}>
                {user.isPremium ? (
                  <span className="flex items-center gap-1">
                    <Sparkles size={10} /> Premium
                  </span>
                ) : 'Free Account'}
              </span>
            </div>
            <div className={`w-8 h-8 flex items-center justify-center text-[10px] font-bold shadow-sm transition-all duration-500 ${user.isPremium ? 'bg-purple-600 rounded-xl text-white scale-110 shadow-purple-200' : 'user-avatar'}`}>
              {user.isPremium ? <Crown size={14} /> : user.avatar}
            </div>
            <button 
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`p-2 rounded-md transition-all ${ttsEnabled ? 'text-blue-600 bg-blue-50' : 'text-[#6b7280] hover:bg-gray-100'}`}
              title={ttsEnabled ? "Disable Voice" : "Enable Voice"}
            >
              {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button 
              onClick={logout}
              className="p-2 text-[#6b7280] hover:bg-red-50 hover:text-red-500 rounded-md transition-all"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-grow overflow-y-auto px-[15%] py-10 scroll-smooth"
        >
          <div className="max-w-none min-h-full">
            {(!currentConversation || currentConversation.messages.length === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <h2 className="text-2xl font-semibold text-[#111827] mb-2 font-serif italic">Intelligent Assistant</h2>
                <p className="text-[#6b7280] max-w-sm mx-auto text-sm mb-12">
                  Ready to analyze data, search the web, or help with complex code.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {[
                    { label: '📊 Analyze Data', text: 'Analyze this sample data' },
                    { label: '🌐 Search Web', text: 'Search for recent AI news' },
                    { label: '🖼️ Generate Image', text: 'Create an icon set' },
                    { label: '📝 Summarize', text: 'Summarize the key takeaways' }
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => handleSend(s.text)}
                      className="p-5 text-left bg-white border border-[#e5e7eb] rounded-xl hover:border-[#2563eb] transition-all group"
                    >
                      <div className="text-xs font-bold text-[#2563eb] mb-1">{s.label}</div>
                      <div className="text-[13px] text-[#6b7280] font-medium">{s.text}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                <AnimatePresence initial={false}>
                  {currentConversation.messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                </AnimatePresence>
              </div>
            )}
            {isLoading && (
              <div className="flex gap-5 mb-8">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-[#111827] animate-pulse shadow-md border border-white/10">
                  <img src="https://storage.googleapis.com/static.antigravity.dev/ai-logos/xombo_ai_logo.png" alt="AI" className="w-full h-full object-cover scale-150 brightness-0 invert" />
                </div>
                <div className="flex gap-1.5 items-center bg-white border border-[#e5e7eb] px-5 py-3 rounded-2xl shadow-xl">
                  <div className="w-2 h-2 bg-[#2563eb] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-[#2563eb] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-[#2563eb] rounded-full animate-bounce" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <ChatInput 
          onSend={handleSend} 
          disabled={isLoading} 
          user={user} 
          onUpgrade={upgradeToPremium} 
          onRequestPremium={() => setShowPremiumModal(true)}
        />

        {/* Premium Modal */}
        <AnimatePresence>
          {showPremiumModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowPremiumModal(false);
                  setPaymentStep('info');
                }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden"
              >
                <div className="bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] p-8 text-white relative">
                  <button 
                    onClick={() => {
                      setShowPremiumModal(false);
                      setPaymentStep('info');
                    }}
                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/30">
                    <Crown size={32} className="text-yellow-300" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tight mb-2 uppercase italic">Xombo Pro</h2>
                  <p className="text-blue-100 font-medium">Unlock the full potential of Banana Image Engine.</p>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-8 custom-scrollbar">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                      <div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Lifetime Access</div>
                        <div className="text-4xl font-black text-gray-900 leading-none tracking-tighter">$6.00</div>
                      </div>
                      <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black tracking-widest uppercase border border-emerald-100">
                        ONE-TIME
                      </div>
                    </div>

                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 text-center">Send Payment to Easypaisa/JazzCash</div>
                      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                        <span className="text-xl font-black text-gray-900 tracking-tight">03142454149</span>
                        <button 
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText('03142454149');
                            } catch (err) {
                              console.error('Failed to copy text: ', err);
                            }
                          }}
                          className="p-2 text-blue-600 hover:scale-110 active:scale-95 transition-all"
                        >
                          <Copy size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest text-center">Submit Payment Details</h3>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Method</label>
                          <select 
                            value={paymentDetails.method}
                            onChange={(e) => setPaymentDetails({...paymentDetails, method: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 appearance-none"
                          >
                            <option value="">Select</option>
                            <option value="easypaisa">Easypaisa</option>
                            <option value="jazzcash">JazzCash</option>
                            <option value="bank">Bank Transfer</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Account No.</label>
                          <input 
                            type="text"
                            placeholder="03xx..."
                            value={paymentDetails.accountNumber}
                            onChange={(e) => setPaymentDetails({...paymentDetails, accountNumber: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Account Holder Name</label>
                        <input 
                          type="text"
                          placeholder="Your Name"
                          value={paymentDetails.accountName}
                          onChange={(e) => setPaymentDetails({...paymentDetails, accountName: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => {
                            if (paymentDetails.method && paymentDetails.accountNumber && paymentDetails.accountName) {
                              upgradeToPremium();
                              setShowPremiumModal(false);
                            } else {
                              console.warn("Payment details incomplete");
                            }
                          }}
                          className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-900 transition-all shadow-xl shadow-gray-200 active:scale-[0.98] mt-2"
                        >
                          Activate Lifetime Premium
                        </button>
                        <button 
                          onClick={() => {
                            upgradeToPremium();
                            setShowPremiumModal(false);
                          }}
                          className="w-full bg-gray-100 text-gray-500 py-2 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all active:scale-[0.98]"
                        >
                          I've already paid - Unlock Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

