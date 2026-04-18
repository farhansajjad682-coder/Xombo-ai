import React, { useState } from 'react';
import { User } from '../types';
import { Bot, LogIn, Mail, Lock, ShieldCheck, Phone, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const forwardUserInfoToAdmin = (data: any) => {
    // Simulate sending information to the specified number: 03142454149
    console.log("%c[ADMIN NOTIFICATION SENT]", "background: #2563eb; color: white; padding: 4px; border-radius: 4px;");
    console.log(`Forwarding to +92 314 2454149:
User: ${data.name}
Email: ${data.email}
Phone: ${data.phone}
Action: ${isSignUp ? 'New Registration' : 'Login Attempt'}
Time: ${new Date().toLocaleString()}`);
  };

  const handleInitialAction = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Simulate login without OTP
    setTimeout(() => {
      setIsLoading(false);
      
      // Forward info to admin as before
      forwardUserInfoToAdmin({ name, email, phone });
      
      onLogin({
        name: name || 'Demo User',
        email: email || 'demo@example.com',
        avatar: (name || 'DU').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        isPremium: true
      });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 font-sans overflow-hidden">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="flex flex-col items-center mb-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center shadow-lg mb-4 overflow-hidden p-3"
          >
            <Bot size={32} className="text-white" />
          </motion.div>
          <h1 className="text-2xl font-black text-[#111827] tracking-tighter uppercase italic">Xombo AI</h1>
          <p className="text-[#6b7280] font-bold mt-1 uppercase tracking-widest text-[10px]">Security Verified Access</p>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white border border-[#e5e7eb] rounded-[32px] p-8 shadow-[0_8px_40px_rgb(0,0,0,0.06)] relative overflow-hidden"
        >
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900">{isSignUp ? 'Create New Account' : 'Welcome Professional'}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {isSignUp ? 'Enter your details to start your journey.' : 'Access your intelligence workspace.'}
            </p>
          </div>

          <form onSubmit={handleInitialAction} className="space-y-4">
            {isSignUp && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] mb-1.5 px-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9ca3af]">
                    <LogIn size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl py-3 pl-11 pr-4 text-[#111827] text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  />
                </div>
              </motion.div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] mb-1.5 px-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9ca3af]">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="professional@xombo.ai"
                  className="w-full bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl py-3 pl-11 pr-4 text-[#111827] text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>
            </div>

            {isSignUp && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] mb-1.5 px-1">Phone Number (Admin Log)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9ca3af]">
                    <Phone size={18} />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03xx-xxxxxxx"
                    className="w-full bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl py-3 pl-11 pr-4 text-[#111827] text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  />
                </div>
              </motion.div>
            )}

            {!isSignUp && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] mb-1.5 px-1">Safety Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9ca3af]">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#f8f9fa] border border-[#e5e7eb] rounded-xl py-3 pl-11 pr-4 text-[#111827] text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white rounded-2xl py-4 font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2 group disabled:opacity-70 mt-4 overflow-hidden relative"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="relative z-10 font-black tracking-widest uppercase">
                    {isSignUp ? 'Create Workspace' : 'Connect to Workspace'}
                  </span>
                  <motion.div 
                    className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-10 transition-opacity"
                  />
                  {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">
              {isSignUp ? 'Already have an account?' : "Don't have access?"}
            </span>
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs font-black uppercase tracking-widest text-[#2563eb] hover:underline"
            >
              {isSignUp ? 'Login instead' : 'Register Now'}
            </button>
          </div>
        </motion.div>

        <div className="mt-8 flex items-center justify-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                <img src={`https://picsum.photos/seed/${i+40}/100`} alt="user" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Joined by 2k+ developers today
          </p>
        </div>

        <p className="mt-12 text-[11px] text-[#9ca3af] text-center max-w-[280px] mx-auto leading-relaxed uppercase tracking-widest font-bold">
          End-to-end encryption active <ShieldCheck size={10} className="inline ml-1 text-emerald-500" />
        </p>
      </div>
    </div>
  );
};
