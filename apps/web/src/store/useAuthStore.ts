import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (name: string, email?: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,

  restoreSession: () => {
    const token = localStorage.getItem('eldertable:token');
    const raw = localStorage.getItem('eldertable:user');
    if (token && raw) {
      try {
        const user = JSON.parse(raw) as User;
        set({ user, token });
      } catch {}
    }
  },

  login: async (name, email) => {
    const { data } = await api.post<{ user: User; token: string }>('/api/auth/mock-login', { name, email });
    localStorage.setItem('eldertable:token', data.token);
    localStorage.setItem('eldertable:user', JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
  },

  logout: () => {
    localStorage.removeItem('eldertable:token');
    localStorage.removeItem('eldertable:user');
    set({ user: null, token: null });
  },
}));
