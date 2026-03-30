import OpenAI from 'openai';
import { Message, UserConfig, Goal } from './storage';

export const getSystemPrompt = (config: UserConfig, goals: Goal[]) => {
  const goalsList = goals
    .map(g => `- ${g.description} (Prazo: ${new Date(g.deadline).toLocaleDateString('pt-BR')})`)
    .join('\n');

  const today = new Date();
  const dateStr = today.toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `Você é o sócio estratégico de ${config.userName} na Adaptu.
Hoje é ${dateStr}. Use esta data como referência para prazos relativos (ex: "próxima sexta").
 
CONTEXTO DO NEGÓCIO:
${config.businessDescription}
 
METAS ATIVAS:
${goalsList || 'Nenhuma meta registrada ainda.'}
 
PERSONALIDADE:
- Direto e honesto. Aponta falhas com respeito, sem rodeios.
- Faz perguntas que desafiam o pensamento, não só valida.
- Lembra de compromissos assumidos e cobra resultados.
- Tom leve, humano — como um sócio tomando um café.
- Fala português brasileiro naturalmente, sem formalidade.
 
FUNÇÕES:
1. ESTRATÉGIA: Discutir decisões com visão crítica real.
2. COBRANÇAS: Lembrar e cobrar prazos e metas assumidas.
3. INSIGHTS: Apontar oportunidades e riscos não óbvios.
4. DESAFIO: Questionar premissas antes de validar ideias.
 
REGRAS:
- Nunca seja genérico. Sempre específico para ${config.userName}.
- Quando registrar meta: [META: descrição | prazo] (Use SEMPRE o formato AAAA-MM-DD para o prazo).
- Máximo 3 parágrafos, salvo análise detalhada solicitada.
- Priorize perguntas que façam ${config.userName} pensar, não se sentir bem.`;
};

export async function chatWithPartner(config: UserConfig, history: Message[], goals: Goal[]) {
  const openai = new OpenAI({
    apiKey: config.openaiKey,
    dangerouslyAllowBrowser: true,
  });

  const messages = [
    { role: 'system', content: getSystemPrompt(config, goals) },
    ...history.map(m => ({ role: m.role, content: m.content })),
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: messages as any,
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

export function extractGoalsFromText(text: string): Omit<Goal, 'id' | 'status' | 'createdAt'>[] {
  const regex = /\[META:\s*([^|]+)\|\s*([^\]]+)\]/g;
  const goals: Omit<Goal, 'id' | 'status' | 'createdAt'>[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    goals.push({
      description: match[1].trim(),
      deadline: match[2].trim(),
    });
  }

  return goals;
}
