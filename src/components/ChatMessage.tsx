import React, { useState } from 'react';
import { Message } from '../types';
import { Bot, User, Cpu, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';

import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: Message;
}

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  const handleCopy = () => {
    const textToCopy = String(children).replace(/\n$/, '');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && language) {
    return (
      <pre {...props} className={className}>
        <div className="code-header">
          <span>{language}</span>
          <button 
            onClick={handleCopy}
            className="flex items-center gap-1.5 hover:text-white transition-colors group/copy"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-500" />
                <span className="text-emerald-500">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <code>{children}</code>
      </pre>
    );
  }
  return <code className={className} {...props}>{children}</code>;
};

const MarkdownImage = ({ node, ...props }: any) => {
  if (props.src?.includes('pollinations.ai')) {
    return (
      <div className="my-6">
        <div className="rounded-2xl border border-[#e5e7eb] shadow-2xl overflow-hidden bg-white max-w-[512px]">
          <img 
            {...props}
            alt="Generated AI" 
            className="w-full h-auto object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="px-4 py-2 border-t border-[#f1f5f9] flex items-center justify-between bg-[#f8fafc]">
            <span className="text-[10px] text-[#6b7280] uppercase tracking-widest font-black">Xombo AI</span>
            <span className="text-[10px] text-[#94a3b8] font-medium">1024x1024 • Nano Engine</span>
          </div>
        </div>
      </div>
    );
  }
  return <img {...props} className="rounded-xl my-4 max-w-full" referrerPolicy="no-referrer" />;
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isFunction = message.role === 'function';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-5 mb-8 max-w-none"
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center font-bold text-xs shadow-sm transition-transform hover:scale-105 ${
        isUser ? 'user-avatar' : isFunction ? 'system-avatar' : 'bg-[#111827] border border-white/10'
      }`}>
        {isUser ? 'JD' : isFunction ? 'FX' : (
          <Bot size={22} className="text-white" />
        )}
      </div>
      
      <div className="flex-grow min-w-0">
        {!isUser && !isFunction && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-tight text-[#111827]">Xombo AI</span>
            <div className="w-1 h-1 rounded-full bg-blue-500" />
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Nano Pro</span>
          </div>
        )}
        {isFunction && (
          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 mb-1">
            System Function Result
          </div>
        )}
        <div className="markdown-body">
          <ReactMarkdown
            components={{
              code: CodeBlock,
              img: MarkdownImage
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        {message.image && (
          <div className="mt-3">
            <img 
              src={message.image} 
              alt="Attached content" 
              className="max-w-[300px] rounded-xl border border-[#e5e7eb] shadow-sm"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};
