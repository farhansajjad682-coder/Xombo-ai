export type Role = 'user' | 'model' | 'system' | 'function';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  image?: string; // Base64 encoded image
  functionCall?: {
    name: string;
    args: any;
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface User {
  name: string;
  email: string;
  avatar: string;
  isPremium?: boolean;
}

export interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
}
