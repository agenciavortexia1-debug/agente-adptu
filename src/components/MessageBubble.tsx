import React from 'react';
import { Message } from '../lib/storage';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { Volume2 } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  userName: string;
  onSpeak?: () => void;
}

export function MessageBubble({ message, userName, onSpeak }: MessageBubbleProps) {
  const isAgent = message.role === 'assistant';

  return (
    <div className={cn(
      "flex gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300 group",
      isAgent ? "self-start" : "self-end flex-row-reverse"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold",
        isAgent ? "bg-accent-forest text-white font-serif" : "bg-surface-2 text-text-secondary border border-border-subtle"
      )}>
        {isAgent ? "A" : userName[0]?.toUpperCase() || "U"}
      </div>
      
      <div className={cn("flex flex-col gap-1 relative", isAgent ? "items-start" : "items-end")}>
        <span className="text-[10px] uppercase tracking-widest text-text-faint font-bold px-1">
          {isAgent ? "Sócio" : userName}
        </span>
        
        <div className={cn(
          "px-4 py-3 rounded-2xl text-sm leading-relaxed",
          isAgent 
            ? "bg-surface border border-border-subtle rounded-tl-none shadow-sm" 
            : "bg-accent-mint text-accent-forest border border-[#c2dfd4] rounded-tr-none"
        )}>
          <div className="markdown-body prose prose-sm max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>

        {isAgent && onSpeak && (
          <button 
            onClick={onSpeak}
            className="absolute -right-8 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white border border-border-subtle text-text-faint hover:text-accent-forest hover:border-accent-forest transition-all opacity-0 group-hover:opacity-100 shadow-sm"
            title="Ouvir resposta"
          >
            <Volume2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
