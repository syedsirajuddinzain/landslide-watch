import { create } from 'zustand';
import { User } from 'firebase/auth';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthState {
  user: User | null;
  role: string;
  activePortal: 'citizen' | 'authority';
  userLocation: { lat: number; lon: number; name: string } | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  demoLogin: (role?: string) => void;
  switchPortal: (portal: 'citizen' | 'authority') => void;
  setUserLocation: (loc: { lat: number; lon: number; name: string } | null) => void;
  signOut: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
    email: 'citizen@landslidewatch.in',
    uid: 'demo-citizen',
    getIdToken: async () => 'demo-token',
  } as any,
  role: 'citizen',
  activePortal: 'citizen',
  userLocation: { lat: 23.7307, lon: 92.7173, name: 'Aizawl, Mizoram' },
  loading: false,
  initialized: true,

  switchPortal: (portal) => {
    set({ activePortal: portal });
  },

  setUserLocation: (loc) => {
    set({ userLocation: loc });
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      // Fallback to local demo session if Firebase rejected
      const role = email.includes('admin')
        ? 'admin'
        : email.includes('citizen')
        ? 'citizen'
        : email.includes('viewer')
        ? 'viewer'
        : 'authority';
      const activePortal = role === 'citizen' ? 'citizen' : 'authority';
      set({
        user: { email, uid: 'demo-session', getIdToken: async () => 'demo-token' } as any,
        role,
        activePortal,
        initialized: true,
      });
    } finally {
      set({ loading: false });
    }
  },

  demoLogin: (role = 'citizen') => {
    const isCitizen = role === 'citizen';
    const email = isCitizen ? 'citizen@landslidewatch.in' : `${role}@landslidewatch.gov.in`;
    set({
      user: { email, uid: `demo-${role}`, getIdToken: async () => 'demo-token' } as any,
      role,
      activePortal: isCitizen ? 'citizen' : 'authority',
      initialized: true,
    });
  },

  signOut: async () => {
    try {
      await firebaseSignOut(auth);
    } catch {}
    set({ user: null, role: 'citizen', activePortal: 'citizen' });
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
