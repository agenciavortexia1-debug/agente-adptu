import { supabase } from './supabase';

export interface Goal {
  id: string;
  description: string;
  deadline: string; // ISO string
  status: 'in-progress' | 'attention' | 'completed' | 'overdue';
  createdAt: string;
}

export interface UserConfig {
  openaiKey: string;
  userName: string;
  businessDescription: string;
  gmailUser?: string;
  gmailAppPassword?: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export const STORAGE_KEYS = {
  CONFIG: 'adaptu_config',
  GOALS: 'adaptu_goals',
  HISTORY: 'adaptu_history',
};

export function getStoredConfig(): UserConfig | null {
  const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
  return data ? JSON.parse(data) : null;
}

export function setStoredConfig(config: UserConfig) {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
}

export function getStoredGoals(): Goal[] {
  const data = localStorage.getItem(STORAGE_KEYS.GOALS);
  return data ? JSON.parse(data) : [];
}

export function setStoredGoals(goals: Goal[]) {
  localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
}

export function getStoredHistory(): Message[] {
  const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
  return data ? JSON.parse(data) : [];
}

export function setStoredHistory(history: Message[]) {
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

// Supabase Syncing
export async function syncToSupabase(config: UserConfig, goals: Goal[], history: Message[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Sync Config
  await supabase.from('user_configs').upsert({
    id: user.id,
    user_name: config.userName,
    business_description: config.businessDescription,
    openai_key: config.openaiKey,
    gmail_user: config.gmailUser,
    gmail_app_password: config.gmailAppPassword,
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' });

  // Sync Goals
  // First delete old goals to replace with current state (simple sync)
  await supabase.from('goals').delete().eq('user_id', user.id);
  if (goals.length > 0) {
    await supabase.from('goals').insert(
      goals.map(g => ({
        user_id: user.id,
        title: g.description,
        deadline: g.deadline,
        completed: g.status === 'completed',
        created_at: g.createdAt
      }))
    );
  }

  // Sync History
  await supabase.from('chat_history').delete().eq('user_id', user.id);
  if (history.length > 0) {
    await supabase.from('chat_history').insert(
      history.filter(m => m.role !== 'system').map(m => ({
        user_id: user.id,
        role: m.role,
        content: m.content,
        created_at: m.timestamp
      }))
    );
  }
}

export async function loadFromSupabase() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: configData } = await supabase.from('user_configs').select('*').eq('id', user.id).single();
  const { data: goalsData } = await supabase.from('goals').select('*').eq('user_id', user.id);
  const { data: historyData } = await supabase.from('chat_history').select('*').eq('user_id', user.id).order('created_at', { ascending: true });

  if (!configData) return null;

  const config: UserConfig = {
    userName: configData.user_name,
    businessDescription: configData.business_description,
    openaiKey: configData.openai_key,
    gmailUser: configData.gmail_user,
    gmailAppPassword: configData.gmail_app_password
  };

  const goals: Goal[] = (goalsData || []).map(g => ({
    id: g.id,
    description: g.title,
    deadline: g.deadline,
    status: g.completed ? 'completed' : 'in-progress',
    createdAt: g.created_at
  }));

  const history: Message[] = (historyData || []).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
    timestamp: m.created_at
  }));

  return { config, goals, history };
}
