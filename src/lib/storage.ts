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
