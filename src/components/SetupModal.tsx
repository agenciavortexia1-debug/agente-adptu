import React, { useState } from 'react';
import { UserConfig } from '../lib/storage';
import { Shield, User, Briefcase, Mail, Lock } from 'lucide-react';

interface SetupModalProps {
  onSave: (config: UserConfig) => void;
  initialConfig: UserConfig | null;
}

export function SetupModal({ onSave, initialConfig }: SetupModalProps) {
  const [config, setConfig] = useState<UserConfig>(initialConfig || {
    openaiKey: '',
    userName: '',
    businessDescription: '',
    gmailUser: '',
    gmailAppPassword: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.openaiKey || !config.userName || !config.businessDescription) {
      alert('Por favor, preencha os campos obrigatórios.');
      return;
    }
    onSave(config);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border-subtle rounded-2xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <h2 className="text-2xl font-serif mb-2">Configuração do Sócio</h2>
        <p className="text-text-secondary text-sm mb-6">
          Seus dados são salvos localmente. A chave OpenAI é necessária para o cérebro do Adaptu.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-faint mb-2">
              <Shield size={14} /> Chave API OpenAI (Obrigatório)
            </label>
            <input
              type="password"
              value={config.openaiKey}
              onChange={(e) => setConfig({ ...config, openaiKey: e.target.value })}
              className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-3 text-sm focus:border-accent-forest outline-none transition-all"
              placeholder="sk-..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-faint mb-2">
                <User size={14} /> Seu Nome
              </label>
              <input
                type="text"
                value={config.userName}
                onChange={(e) => setConfig({ ...config, userName: e.target.value })}
                className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-3 text-sm focus:border-accent-forest outline-none transition-all"
                placeholder="Como te chamo?"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-faint mb-2">
                <Briefcase size={14} /> Seu Negócio
              </label>
              <input
                type="text"
                value={config.businessDescription}
                onChange={(e) => setConfig({ ...config, businessDescription: e.target.value })}
                className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-3 text-sm focus:border-accent-forest outline-none transition-all"
                placeholder="Ex: Consultoria"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border-subtle">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Mail size={16} /> Configuração de Email (Opcional)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-text-faint mb-2 block">
                  Gmail User
                </label>
                <input
                  type="email"
                  value={config.gmailUser}
                  onChange={(e) => setConfig({ ...config, gmailUser: e.target.value })}
                  className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-3 text-sm focus:border-accent-forest outline-none transition-all"
                  placeholder="seuemail@gmail.com"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-faint mb-2">
                  <Lock size={14} /> App Password do Gmail
                </label>
                <input
                  type="password"
                  value={config.gmailAppPassword}
                  onChange={(e) => setConfig({ ...config, gmailAppPassword: e.target.value })}
                  className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-3 text-sm focus:border-accent-forest outline-none transition-all"
                  placeholder="xxxx xxxx xxxx xxxx"
                />
                <p className="text-[10px] text-text-faint mt-1">
                  Necessário para o Adaptu te cobrar por email.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-accent-forest text-white font-bold py-4 rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-accent-forest/20 mt-4"
          >
            Salvar e Iniciar
          </button>
        </form>
      </div>
    </div>
  );
}
