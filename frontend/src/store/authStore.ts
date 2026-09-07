import { create } from 'zustand';
import { User } from 'firebase/auth';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthState {
  user: User | null;
  role: string;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  demoLogin: (role?: string) => void;
  signOut: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
    email: 'authority@landslidewatch.gov.in',
    uid: 'demo-authority',
    getIdToken: async () => 'demo-token',
  } as any,
  role: 'authority',
  loading: false,
  initialized: true,

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      // Fallback to local demo session if Firebase rejected
      const role = email.includes('admin') ? 'admin' : email.includes('viewer') ? 'viewer' : 'authority';
      set({
        user: { email, uid: 'demo-session', getIdToken: async () => 'demo-token' } as any,
        role,
        initialized: true,
      });
    } finally {
      set({ loading: false });
    }
  },

  demoLogin: (role = 'authority') => {
    set({
      user: { email: `${role}@landslidewatch.gov.in`, uid: `demo-${role}`, getIdToken: async () => 'demo-token' } as any,
      role,
      initialized: true,
    });
  },

  signOut: async () => {
    try {
      await firebaseSignOut(auth);
    } catch {}
    set({ user: null, role: 'viewer' });
  },

  initialize: () => {
    try {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const idToken = await user.getIdTokenResult();
            const role = (idToken.claims.role as string) || 'authority';
            set({ user, role, initialized: true });
          } catch {
            set({ user, role: 'authority', initialized: true });
          }
        }
      });
    } catch {}
  },
}));
