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
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Error parsing config:', e);
    return null;
  }
}

export function setStoredConfig(config: UserConfig) {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving config:', e);
  }
}

export function getStoredGoals(): Goal[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GOALS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error parsing goals:', e);
    return [];
  }
}

export function setStoredGoals(goals: Goal[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  } catch (e) {
    console.error('Error saving goals:', e);
  }
}

export function getStoredHistory(): Message[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error parsing history:', e);
    return [];
  }
}

export function setStoredHistory(history: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Error saving history:', e);
  }
}
