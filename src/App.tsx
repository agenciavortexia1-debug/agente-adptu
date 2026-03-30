import React, { useState, useEffect, useRef } from 'react';
import { 
  getStoredConfig, setStoredConfig, 
  getStoredGoals, setStoredGoals, 
  getStoredHistory, setStoredHistory,
  UserConfig, Goal, Message, STORAGE_KEYS,
  syncToSupabase, loadFromSupabase
} from './lib/storage';
import { supabase } from './lib/supabase';
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
  const [user, setUser] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSync = async () => {
    if (!user || !config) return;
    setIsSyncing(true);
    try {
      await syncToSupabase(config, goals, history);
      alert('Sincronizado com sucesso!');
    } catch (error) {
      console.error('Sync error:', error);
      alert('Erro ao sincronizar.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLoadFromCloud = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const data = await loadFromSupabase();
      if (data) {
        setConfig(data.config);
        setGoals(data.goals);
        setHistory(data.history);
        setStoredConfig(data.config);
        setStoredGoals(data.goals);
        setStoredHistory(data.history);
        alert('Dados carregados da nuvem!');
      } else {
        alert('Nenhum dado encontrado na nuvem.');
      }
    } catch (error) {
      console.error('Load error:', error);
      alert('Erro ao carregar dados.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = async () => {
    const email = prompt('Email:');
    const password = prompt('Senha:');
    if (email && password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  const handleSignup = async () => {
    const email = prompt('Email:');
    const password = prompt('Senha:');
    if (email && password) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert('Verifique seu email para confirmar o cadastro!');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

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
      // Create instance right before call to ensure fresh key
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Diga com tom de sócio estratégico, direto e humano: ${text}` }] }],
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
        const bytes = new Int16Array(len / 2);
        for (let i = 0; i < len; i += 2) {
          bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
        }

        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const float32Data = new Float32Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
          float32Data[i] = bytes[i] / 32768.0;
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
          
          // Auto-sync if logged in
          if (user) {
            syncToSupabase(config, allGoals, updatedHistory).catch(e => console.error('Auto-sync failed:', e));
          }
        } else if (user) {
          // Sync even if no new goals
          syncToSupabase(config, goals, updatedHistory).catch(e => console.error('Auto-sync failed:', e));
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
    <div className="flex h-screen bg-bg-main overflow-hidden">
      {showSetup && <SetupModal onSave={handleSaveConfig} initialConfig={config} />}

      {/* Sidebar */}
      <aside className="w-64 border-r border-border-subtle bg-surface flex flex-col shrink-0 hidden md:flex">
        <div className="p-6 border-bottom border-border-subtle flex items-center gap-3">
          <div className="w-10 h-10 bg-accent-forest rounded-xl flex items-center justify-center shadow-lg shadow-accent-forest/20">
            <TrendingUp className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-serif text-xl leading-none">Adaptu</h1>
            <span className="text-[10px] uppercase tracking-widest text-text-faint font-bold">Sócio Estratégico</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-text-faint font-bold px-4 mb-2">Principal</div>
          <button 
            onClick={() => setActiveTab('chat')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all",
              activeTab === 'chat' ? "bg-accent-mint text-accent-forest font-bold" : "text-text-secondary hover:bg-surface-2"
            )}
          >
            <MessageSquare size={18} /> Conversa
          </button>
          <button 
            onClick={() => setActiveTab('goals')}
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
              onClick={clearHistory}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-text-secondary hover:bg-surface-2 transition-all"
            >
              <RefreshCw size={18} /> Nova Conversa
            </button>
            <button 
              onClick={() => setShowSetup(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-text-secondary hover:bg-surface-2 transition-all"
            >
              <Settings size={18} /> Configurações
            </button>
          </div>

          <div className="pt-6">
            <div className="text-[10px] uppercase tracking-widest text-text-faint font-bold px-4 mb-2">Nuvem (Supabase)</div>
            {!user ? (
              <div className="space-y-1">
                <button 
                  onClick={handleLogin}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-text-secondary hover:bg-surface-2 transition-all"
                >
                  <LogIn size={18} /> Entrar
                </button>
                <button 
                  onClick={handleSignup}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-text-secondary hover:bg-surface-2 transition-all"
                >
                  <Cloud size={18} /> Criar Conta
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="px-4 py-2 text-[10px] text-text-faint truncate">
                  {user.email}
                </div>
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-text-secondary hover:bg-surface-2 transition-all disabled:opacity-50"
                >
                  <CloudUpload size={18} className={cn(isSyncing && "animate-pulse")} /> 
                  {isSyncing ? "Sincronizando..." : "Salvar na Nuvem"}
                </button>
                <button 
                  onClick={handleLoadFromCloud}
                  disabled={isSyncing}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-text-secondary hover:bg-surface-2 transition-all disabled:opacity-50"
                >
                  <CloudDownload size={18} className={cn(isSyncing && "animate-pulse")} />
                  {isSyncing ? "Carregando..." : "Baixar da Nuvem"}
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-all"
                >
                  <LogOut size={18} /> Sair
                </button>
              </div>
            )}
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent-forest rounded-lg flex items-center justify-center">
              <TrendingUp className="text-white" size={16} />
            </div>
            <h1 className="font-serif text-lg">Adaptu</h1>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('chat')} className={cn(activeTab === 'chat' ? "text-accent-forest" : "text-text-faint")}>
              <MessageSquare size={20} />
            </button>
            <button onClick={() => setActiveTab('goals')} className={cn(activeTab === 'goals' ? "text-accent-forest" : "text-text-faint")}>
              <Target size={20} />
            </button>
            <button onClick={toggleAutoRead} className={cn(isAutoRead ? "text-accent-forest" : "text-text-faint")}>
              {isAutoRead ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            {user ? (
              <button onClick={handleSync} disabled={isSyncing} className="text-accent-forest">
                <CloudUpload size={20} className={cn(isSyncing && "animate-pulse")} />
              </button>
            ) : (
              <div className="flex gap-3">
                <button onClick={handleLogin} className="text-text-faint">
                  <LogIn size={20} />
                </button>
                <button onClick={handleSignup} className="text-text-faint">
                  <Cloud size={20} />
                </button>
              </div>
            )}
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
  );
}
