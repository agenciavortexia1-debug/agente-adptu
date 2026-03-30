import React, { useState, useEffect, useRef } from 'react';
import { 
  getStoredConfig, setStoredConfig, 
  getStoredGoals, setStoredGoals, 
  getStoredHistory, setStoredHistory,
  UserConfig, Goal, Message, STORAGE_KEYS
} from './lib/storage';
import { chatWithPartner, extractGoalsFromText } from './lib/openai';
import { SetupModal } from './components/SetupModal';
import { MessageBubble } from './components/MessageBubble';
import { GoalsPanel } from './components/GoalsPanel';
import { 
  MessageSquare, 
  Target, 
  Settings, 
  Send, 
  RefreshCw,
  LayoutDashboard,
  TrendingUp,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  LogIn,
  LogOut,
  Cloud,
  CloudUpload,
  CloudDownload
} from 'lucide-react';
import { cn } from './lib/utils';
import { GoogleGenAI, Modality } from "@google/genai";

// Initialize Gemini for TTS
// const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center bg-white min-h-screen flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Algo deu errado.</h1>
          <p className="mb-4 text-gray-600">Ocorreu um erro inesperado ao carregar a aplicação.</p>
          <pre className="bg-gray-100 p-4 rounded text-left overflow-auto max-w-full text-xs mb-4">
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="bg-accent-forest text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-accent-forest/20"
          >
            Limpar Dados e Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [config, setConfig] = useState<UserConfig | null>(getStoredConfig());
  const [goals, setGoals] = useState<Goal[]>(getStoredGoals());
  const [history, setHistory] = useState<Message[]>(getStoredHistory());
  const [activeTab, setActiveTab] = useState<'chat' | 'goals'>('chat');
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSetup, setShowSetup] = useState(!config);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'done'>('idle');
  
  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [isAutoRead, setIsAutoRead] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const speakText = async (text: string) => {
    if (!config) return;
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error('GEMINI_API_KEY is missing');
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Clean text for better TTS (remove markdown, etc)
      const cleanText = text.replace(/[*_#`]/g, '').trim();

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Diga com tom de sócio estratégico, direto e humano: ${cleanText}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        // The Gemini TTS returns raw PCM 16-bit little-endian
        const int16Data = new Int16Array(bytes.buffer);
        const float32Data = new Float32Array(int16Data.length);
        for (let i = 0; i < int16Data.length; i++) {
          float32Data[i] = int16Data[i] / 32768.0;
        }

        const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
        audioBuffer.getChannelData(0).set(float32Data);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
      }
    } catch (error) {
      console.error('TTS error:', error);
    }
  };

  const toggleAutoRead = async () => {
    const newState = !isAutoRead;
    setIsAutoRead(newState);
    
    // Resume audio context on user gesture
    if (newState) {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    }
  };

  useEffect(() => {
    // Trigger deadline check on load if email is configured
    if (config?.gmailUser && config?.gmailAppPassword && goals.length > 0 && emailStatus === 'idle') {
      setEmailStatus('checking');
      fetch('/api/check-deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals,
          gmailUser: config.gmailUser,
          gmailAppPassword: config.gmailAppPassword,
          userName: config.userName
        })
      }).finally(() => setEmailStatus('done'));
    }
  }, [config, goals, emailStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isTyping]);

  const handleSaveConfig = (newConfig: UserConfig) => {
    setConfig(newConfig);
    setStoredConfig(newConfig);
    setShowSetup(false);
    
    if (history.length === 0) {
      const initialMsg: Message = {
        role: 'assistant',
        content: `E aí, ${newConfig.userName}. Sócio aqui.\n\nJá entendi o contexto do seu negócio: *${newConfig.businessDescription}*.\n\nO que está na mesa hoje? Algum desafio específico ou quer que eu revise suas metas?`,
        timestamp: new Date().toISOString()
      };
      setHistory([initialMsg]);
      setStoredHistory([initialMsg]);
      if (isAutoRead) speakText(initialMsg.content);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !config || isTyping) return;

    const userMsg: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    };

    const newHistory = [...history, userMsg];
    setHistory(newHistory);
    setStoredHistory(newHistory);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await chatWithPartner(config, newHistory, goals);
      if (response) {
        const agentMsg: Message = {
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString()
        };

        const updatedHistory = [...newHistory, agentMsg];
        setHistory(updatedHistory);
        setStoredHistory(updatedHistory);
        
        // Speak response if auto-read is on
        if (isAutoRead) speakText(response);

        // Detect goals
        const detectedGoals = extractGoalsFromText(response);
        if (detectedGoals.length > 0) {
          const newGoals: Goal[] = detectedGoals.map(dg => ({
            id: Math.random().toString(36).substr(2, 9),
            description: dg.description,
            deadline: dg.deadline,
            status: 'in-progress',
            createdAt: new Date().toISOString()
          }));
          const allGoals = [...goals, ...newGoals];
          setGoals(allGoals);
          setStoredGoals(allGoals);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: Message = {
        role: 'assistant',
        content: 'Desculpe, tive um problema ao processar sua mensagem. Verifique sua conexão ou chave API.',
        timestamp: new Date().toISOString()
      };
      setHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleDeleteGoal = (id: string) => {
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    setStoredGoals(updated);
  };

  const handleToggleGoalStatus = (id: string) => {
    const updated = goals.map(g => 
      g.id === id ? { ...g, status: g.status === 'completed' ? 'in-progress' : 'completed' } as Goal : g
    );
    setGoals(updated);
    setStoredGoals(updated);
  };

  const clearHistory = () => {
    if (confirm('Deseja apagar o histórico de conversas?')) {
      setHistory([]);
      setStoredHistory([]);
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-bg-main overflow-hidden">
        {showSetup && <SetupModal onSave={handleSaveConfig} initialConfig={config} />}

        {/* Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-border-subtle bg-surface flex flex-col shrink-0 transition-transform duration-300 md:relative md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="p-6 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-forest rounded-xl flex items-center justify-center shadow-lg shadow-accent-forest/20">
                <TrendingUp className="text-white" size={20} />
              </div>
              <div>
                <h1 className="font-serif text-xl leading-none">Adaptu</h1>
                <span className="text-[10px] uppercase tracking-widest text-text-faint font-bold">Sócio Estratégico</span>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-text-faint">
              <VolumeX size={20} />
            </button>
          </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest text-text-faint font-bold px-4 mb-2">Principal</div>
          <button 
            onClick={() => { setActiveTab('chat'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all",
              activeTab === 'chat' ? "bg-accent-mint text-accent-forest font-bold" : "text-text-secondary hover:bg-surface-2"
            )}
          >
            <MessageSquare size={18} /> Conversa
          </button>
          <button 
            onClick={() => { setActiveTab('goals'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all",
              activeTab === 'goals' ? "bg-accent-mint text-accent-forest font-bold" : "text-text-secondary hover:bg-surface-2"
            )}
          >
            <Target size={18} /> Metas e Prazos
          </button>

          <div className="pt-6">
            <div className="text-[10px] uppercase tracking-widest text-text-faint font-bold px-4 mb-2">Sessão</div>
            <button 
              onClick={() => { clearHistory(); setIsSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-text-secondary hover:bg-surface-2 transition-all"
            >
              <RefreshCw size={18} /> Nova Conversa
            </button>
            <button 
              onClick={() => { setShowSetup(true); setIsSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-text-secondary hover:bg-surface-2 transition-all"
            >
              <Settings size={18} /> Configurações
            </button>
          </div>

          <div className="pt-6">
            <div className="text-[10px] uppercase tracking-widest text-text-faint font-bold px-4 mb-2">Voz</div>
            <button 
              onClick={toggleAutoRead}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all",
                isAutoRead ? "bg-accent-mint text-accent-forest font-bold" : "text-text-secondary hover:bg-surface-2"
              )}
            >
              {isAutoRead ? <Volume2 size={18} /> : <VolumeX size={18} />}
              {isAutoRead ? "Leitura Ativa" : "Leitura Desativada"}
            </button>
          </div>

          {config?.gmailUser && (
            <div className="pt-6">
              <div className="text-[10px] uppercase tracking-widest text-text-faint font-bold px-4 mb-2">Email</div>
              <div className="px-4 py-2 flex items-center gap-2 text-xs text-text-secondary">
                <div className={cn("w-2 h-2 rounded-full", emailStatus === 'checking' ? "bg-amber-400 animate-pulse" : "bg-accent-forest")} />
                {emailStatus === 'checking' ? "Verificando prazos..." : "Cobranças ativas"}
              </div>
            </div>
          )}
        </nav>

        <div className="p-4">
          <div className="bg-accent-mint border border-[#c2dfd4] rounded-2xl p-4">
            <div className="text-[10px] uppercase tracking-widest text-accent-forest font-bold mb-1">Status do Negócio</div>
            <div className="text-accent-forest font-serif text-lg">{goals.filter(g => g.status === 'completed').length}/{goals.length} Metas</div>
            <div className="w-full bg-white/50 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-accent-forest h-full transition-all duration-500" 
                style={{ width: `${goals.length > 0 ? (goals.filter(g => g.status === 'completed').length / goals.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border-subtle bg-surface flex items-center justify-between px-6 md:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-text-faint">
              <LayoutDashboard size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent-forest rounded-lg flex items-center justify-center">
                <TrendingUp className="text-white" size={16} />
              </div>
              <h1 className="font-serif text-lg">Adaptu</h1>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={toggleAutoRead} className={cn(isAutoRead ? "text-accent-forest" : "text-text-faint")}>
              {isAutoRead ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>
        </header>

        {activeTab === 'chat' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {history.map((msg, i) => (
                <MessageBubble 
                  key={i} 
                  message={msg} 
                  userName={config?.userName || 'Você'} 
                  onSpeak={() => speakText(msg.content)}
                />
              ))}
              {isTyping && (
                <div className="flex gap-3 self-start animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-accent-forest text-white flex items-center justify-center font-serif text-sm">A</div>
                  <div className="bg-surface border border-border-subtle rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 bg-text-faint rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-text-faint rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-text-faint rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 bg-surface border-t border-border-subtle">
              <div className="max-w-4xl mx-auto">
                <div className="relative flex items-end gap-3 bg-bg-main border border-border-subtle rounded-2xl p-2 focus-within:border-accent-forest transition-all">
                  <button
                    onClick={toggleListening}
                    className={cn(
                      "p-3 rounded-xl transition-all",
                      isListening ? "bg-red-500 text-white animate-pulse" : "text-text-faint hover:bg-surface-2"
                    )}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={isListening ? "Ouvindo..." : "O que está na cabeça hoje?"}
                    className="flex-1 bg-transparent border-none outline-none resize-none px-4 py-3 text-sm max-h-32 min-h-[44px]"
                    rows={1}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isTyping}
                    className="bg-accent-forest text-white p-3 rounded-xl hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent-forest/20"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <GoalsPanel 
            goals={goals} 
            onDelete={handleDeleteGoal} 
            onToggleStatus={handleToggleGoalStatus} 
          />
        )}
      </main>
    </div>
    </ErrorBoundary>
  );
}
