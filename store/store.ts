import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type User = {
  username: string;
  email: string;
  role: string;
  access: string;
  isAdmin?: boolean;
};

type UserStore = {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
};

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user: User) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'user-storage', // Name of the persisted storage
      storage: createJSONStorage(() => localStorage), // Specify the storage type (localStorage by default)
    }
  )
);
