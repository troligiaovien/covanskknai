
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface User {
  username: string;
  password?: string;
  role: 'admin' | 'user';
  name: string;
}

export interface SKKNTopic {
  title: string;
  category?: string;
  status: 'draft' | 'analyzed' | 'outlined' | 'completed';
}

export enum Step {
  START = 'START',
  ANALYSIS = 'ANALYSIS',
  OUTLINE = 'OUTLINE',
  CONTENT = 'CONTENT'
}

export type AppView = 'login' | 'chat' | 'admin';
