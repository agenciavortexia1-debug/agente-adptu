import React from 'react';
import { Goal } from '../lib/storage';
import { Calendar, CheckCircle2, AlertCircle, Clock, Trash2 } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface GoalsPanelProps {
  goals: Goal[];
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
}

export function GoalsPanel({ goals, onDelete, onToggleStatus }: GoalsPanelProps) {
  const getStatusInfo = (goal: Goal) => {
    if (goal.status === 'completed') return { label: 'Concluída', color: 'text-accent-forest bg-accent-mint', icon: CheckCircle2 };
    
    const deadline = new Date(goal.deadline);
    const daysLeft = differenceInDays(deadline, new Date());
    
    if (isPast(deadline)) return { label: 'Atrasada', color: 'text-red-600 bg-red-50', icon: AlertCircle };
    if (daysLeft <= 3) return { label: 'Atenção', color: 'text-amber-600 bg-amber-50', icon: Clock };
    
    return { label: 'Em dia', color: 'text-blue-600 bg-blue-50', icon: Calendar };
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-serif mb-1">Metas e Prazos</h2>
        <p className="text-text-secondary text-sm">Acompanhamento estratégico do seu progresso.</p>
      </div>

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-faint opacity-50">
          <Calendar size={48} className="mb-4" />
          <p className="text-center">Nenhuma meta registrada ainda.<br />O sócio detecta metas automaticamente no chat.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const status = getStatusInfo(goal);
            const Icon = status.icon;
            
            return (
              <div key={goal.id} className="bg-surface border border-border-subtle rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3", status.color)}>
                      <Icon size={12} />
                      {status.label}
                    </div>
                    <h3 className="font-medium text-lg leading-tight">{goal.description}</h3>
                  </div>
                  <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onToggleStatus(goal.id)}
                      className="p-2 hover:bg-bg-main rounded-lg text-text-secondary transition-colors"
                      title={goal.status === 'completed' ? "Reabrir" : "Concluir"}
                    >
                      <CheckCircle2 size={18} className={goal.status === 'completed' ? "text-accent-forest" : ""} />
                    </button>
                    <button 
                      onClick={() => onDelete(goal.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-border-subtle flex items-center justify-between">
                  <div className="flex items-center gap-2 text-text-secondary text-xs">
                    <Calendar size={14} />
                    <span>{format(new Date(goal.deadline), "dd 'de' MMMM", { locale: ptBR })}</span>
                  </div>
                  
                  {goal.status !== 'completed' && (
                    <div className="text-[10px] font-bold text-text-faint uppercase tracking-widest">
                      {differenceInDays(new Date(goal.deadline), new Date())}d
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
