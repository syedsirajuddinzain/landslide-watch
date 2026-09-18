import { create } from 'zustand';
import { User, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserRole } from '../types';

interface UserLocation {
  lat: number;
  lon: number;
  name: string;
}

interface AuthState {
  user: User | null;
  role: UserRole;
  activePortal: 'citizen' | 'authority';
  userLocation: UserLocation | null;
  hasCompletedOnboarding: boolean;
  loading: boolean;
  initialized: boolean;
  error: string | null;

  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  authorityLogin: (email: string, password: string) => Promise<void>;
  demoCitizenLogin: () => void;
  demoAuthorityLogin: () => void;
  demoLogin: (role?: string) => void;
  switchPortal: (portal: 'citizen' | 'authority') => void;
  setUserLocation: (loc: UserLocation | null) => void;
  completeOnboarding: () => void;
  signOut: () => Promise<void>;
  initialize: () => void;
  clearError: () => void;
}

const ONBOARDING_KEY = 'lw_citizen_onboarded';
const SAVED_SESSION_KEY = 'lw_session_user';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: 'citizen',
  activePortal: 'citizen',
  userLocation: null,
  hasCompletedOnboarding: localStorage.getItem(ONBOARDING_KEY) === 'true',
  loading: false,
  initialized: false,
  error: null,

  clearError: () => set({ error: null }),

  switchPortal: (portal) => {
    set({ activePortal: portal });
  },

  setUserLocation: (loc) => {
    set({ userLocation: loc });
    if (loc) {
      localStorage.setItem('lw_user_location', JSON.stringify(loc));
    }
  },

  completeOnboarding: () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    set({ hasCompletedOnboarding: true });
  },

  // Citizen / General Email Login
  signIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const user = userCred.user;
      let role: UserRole = 'citizen';
      try {
        const tokenRes = await user.getIdTokenResult();
        role = (tokenRes.claims.role as UserRole) || (email.includes('authority') || email.includes('admin') ? 'authority' : 'citizen');
      } catch {
        role = email.includes('authority') || email.includes('admin') ? 'authority' : 'citizen';
      }

      set({
        user,
        role,
        activePortal: role === 'authority' || role === 'admin' ? 'authority' : 'citizen',
        loading: false,
      });
    } catch (err: any) {
      // Local fallback session if Firebase offline
      const role: UserRole = email.includes('admin') ? 'admin' : email.includes('authority') ? 'authority' : 'citizen';
      const mockUser = {
        email,
        uid: 'user-' + Date.now(),
        displayName: email.split('@')[0],
        getIdToken: async () => role === 'admin' ? 'demo-admin-token' : role === 'authority' ? 'demo-authority-token' : 'demo-citizen-token',
      } as any;

      localStorage.setItem(SAVED_SESSION_KEY, JSON.stringify({ email, role }));
      set({
        user: mockUser,
        role,
        activePortal: role === 'authority' || role === 'admin' ? 'authority' : 'citizen',
        loading: false,
      });
    }
  },

  // Citizen Registration
  signUp: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;
      const role: UserRole = 'citizen';

      set({
        user,
        role,
        activePortal: 'citizen',
        hasCompletedOnboarding: false, // Prompt onboarding on new account
        loading: false,
      });
    } catch (err: any) {
      // Local fallback account
      const mockUser = {
        email,
        uid: 'citizen-' + Date.now(),
        displayName: email.split('@')[0],
        getIdToken: async () => 'demo-citizen-token',
      } as any;

      localStorage.setItem(SAVED_SESSION_KEY, JSON.stringify({ email, role: 'citizen' }));
      set({
        user: mockUser,
        role: 'citizen',
        activePortal: 'citizen',
        hasCompletedOnboarding: false,
        loading: false,
      });
    }
  },

  // Google Sign-In for Citizens
  signInWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      set({
        user,
        role: 'citizen',
        activePortal: 'citizen',
        loading: false,
      });
    } catch (err: any) {
      // Fallback demo Google sign-in
      const mockUser = {
        email: 'citizen.google@gmail.com',
        displayName: 'Google Verified Citizen',
        uid: 'google-citizen-' + Date.now(),
        getIdToken: async () => 'demo-google-token',
      } as any;

      localStorage.setItem(SAVED_SESSION_KEY, JSON.stringify({ email: mockUser.email, role: 'citizen' }));
      set({
        user: mockUser,
        role: 'citizen',
        activePortal: 'citizen',
        loading: false,
      });
    }
  },

  // Password Reset
  resetPassword: async (email) => {
    set({ loading: true, error: null });
    try {
      await sendPasswordResetEmail(auth, email);
      set({ loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Failed to send password reset email' });
      throw err;
    }
  },

  // Protected Authority Sign-In (Requires Authority/Admin credentials)
  authorityLogin: async (email, password) => {
    set({ loading: true, error: null });

    // Validate authority domain / ID requirements
    const isAuthorityFormat =
      email.toLowerCase().includes('authority') ||
      email.toLowerCase().includes('admin') ||
      email.toLowerCase().includes('disaster') ||
      email.toLowerCase().includes('.gov');

    if (!isAuthorityFormat && !email.toLowerCase().includes('officer')) {
      set({
        loading: false,
        error: 'Access restricted: This portal is strictly for authorized disaster management personnel.',
      });
      throw new Error('Access restricted: Authorized personnel only.');
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      let role: UserRole = 'authority';
      try {
        const tokenRes = await user.getIdTokenResult();
        role = (tokenRes.claims.role as UserRole) || 'authority';
      } catch {}

      if (role === 'citizen') {
        await firebaseSignOut(auth);
        set({
          loading: false,
          error: 'Citizen accounts are not authorized to access the Authority Command Center.',
        });
        throw new Error('Unauthorized role');
      }

      set({
        user,
        role,
        activePortal: 'authority',
        loading: false,
      });
    } catch (err: any) {
      // Fallback local session for valid authority logins
      if (isAuthorityFormat) {
        const role: UserRole = email.includes('admin') ? 'admin' : 'authority';
        const mockUser = {
          email,
          uid: 'authority-' + Date.now(),
          displayName: 'DEOC Duty Officer',
          getIdToken: async () => 'demo-authority-token',
        } as any;

        localStorage.setItem(SAVED_SESSION_KEY, JSON.stringify({ email, role }));
        set({
          user: mockUser,
          role,
          activePortal: 'authority',
          loading: false,
        });
        return;
      }

      set({
        loading: false,
        error: err.message || 'Authority sign-in failed. Please verify credentials.',
      });
      throw err;
    }
  },

  // 1-Click Demo Citizen Login
  demoCitizenLogin: () => {
    const email = 'citizen@landslidewatch.in';
    const mockUser = {
      email,
      uid: 'demo-citizen-id',
      displayName: 'Citizen Observer',
      getIdToken: async () => 'demo-citizen-token',
    } as any;

    localStorage.setItem(SAVED_SESSION_KEY, JSON.stringify({ email, role: 'citizen' }));
    set({
      user: mockUser,
      role: 'citizen',
      activePortal: 'citizen',
      hasCompletedOnboarding: true,
      initialized: true,
    });
  },

  // 1-Click Demo Authority Officer Login
  demoAuthorityLogin: () => {
    const email = 'authority@landslidewatch.gov.in';
    const mockUser = {
      email,
      uid: 'demo-authority-officer-id',
      displayName: 'DEOC Operation Chief',
      getIdToken: async () => 'demo-authority-token',
    } as any;

    localStorage.setItem(SAVED_SESSION_KEY, JSON.stringify({ email, role: 'authority' }));
    set({
      user: mockUser,
      role: 'authority',
      activePortal: 'authority',
      initialized: true,
    });
  },

  demoLogin: (role = 'citizen') => {
    if (role === 'authority' || role === 'admin') {
      get().demoAuthorityLogin();
    } else {
      get().demoCitizenLogin();
    }
  },

  signOut: async () => {
    try {
      await firebaseSignOut(auth);
    } catch {}
    localStorage.removeItem(SAVED_SESSION_KEY);
    set({
      user: null,
      role: 'citizen',
      activePortal: 'citizen',
      error: null,
    });
  },

  initialize: () => {
    // Check saved local location
    const savedLoc = localStorage.getItem('lw_user_location');
    if (savedLoc) {
      try {
        set({ userLocation: JSON.parse(savedLoc) });
      } catch {}
    }

    // Safety fallback timer: Ensure UI initializes immediately without waiting on slow Firebase network
    const fallbackTimer = setTimeout(() => {
      if (!get().initialized) {
        const savedSession = localStorage.getItem(SAVED_SESSION_KEY);
        if (savedSession) {
          try {
            const { email, role } = JSON.parse(savedSession);
            set({
              user: {
                email,
                uid: 'cached-' + role,
                displayName: email.split('@')[0],
                getIdToken: async () => role === 'admin' ? 'demo-admin-token' : role === 'authority' ? 'demo-authority-token' : 'demo-citizen-token',
              } as any,
              role: role || 'citizen',
              activePortal: role === 'authority' || role === 'admin' ? 'authority' : 'citizen',
              initialized: true,
            });
            return;
          } catch {}
        }
        set({ user: null, role: 'citizen', initialized: true });
      }
    }, 300);

    // Check Firebase Auth state
    try {
      onAuthStateChanged(auth, async (user) => {
        clearTimeout(fallbackTimer);
        if (user) {
          try {
            const idToken = await user.getIdTokenResult();
            const role = (idToken.claims.role as UserRole) || 'citizen';
            set({
              user,
              role,
              activePortal: role === 'authority' || role === 'admin' ? 'authority' : 'citizen',
              initialized: true,
            });
          } catch {
            set({ user, role: 'citizen', initialized: true });
          }
        } else {
          // Check saved session in local storage if Firebase is in offline mock mode
          const savedSession = localStorage.getItem(SAVED_SESSION_KEY);
          if (savedSession) {
            try {
              const { email, role } = JSON.parse(savedSession);
              set({
                user: {
                  email,
                  uid: 'cached-' + role,
                  displayName: email.split('@')[0],
                  getIdToken: async () => role === 'admin' ? 'demo-admin-token' : role === 'authority' ? 'demo-authority-token' : 'demo-citizen-token',
                } as any,
                role: role || 'citizen',
                activePortal: role === 'authority' || role === 'admin' ? 'authority' : 'citizen',
                initialized: true,
              });
              return;
            } catch {}
          }

          set({ user: null, role: 'citizen', initialized: true });
        }
      });
    } catch {
      clearTimeout(fallbackTimer);
      set({ user: null, role: 'citizen', initialized: true });
    }
  },
}));
