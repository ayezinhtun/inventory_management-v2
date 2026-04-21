import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  region_id?: string | null;
  warehouse_id?: string | null;
  status: string;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitializing: boolean;

  initializeAuth: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<UserProfile | null>;
}

// Sync authenticated profile into the Zustand app store so the rest of the
// app (role guards, audit logs, etc.) continues to work without changes.
// Uses dynamic import to avoid a circular dependency between the two stores.
async function syncToAppStore(profile: UserProfile | null) {
  const { useStore } = await import('./useStore');
  if (profile) {
    useStore.setState({
      isAuthenticated: true,
      currentUser: {
        id: profile.user_id,
        username: profile.email,
        email: profile.email,
        password_hash: '',
        full_name: profile.name,
        role: profile.role as any,
        assigned_region_id: profile.region_id ?? null,
        assigned_warehouse_id: profile.warehouse_id ?? null,
        is_active: profile.status === 'active',
        last_login: profile.last_login_at ?? null,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      },
    });
  } else {
    useStore.setState({ isAuthenticated: false, currentUser: null });
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: false,
  isInitializing: true,

  // Called once on app mount. Restores an existing session from localStorage
  // and subscribes to auth state changes for the lifetime of the app.
  initializeAuth: async () => {
    set({ isInitializing: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        set({ user: session.user, session });
        const profile = await get().fetchProfile();
        await syncToAppStore(profile);
      }
    } finally {
      set({ isInitializing: false });
    }

    // Persistent listener: handles token refresh, OAuth callbacks, sign-out
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        set({ user: session.user, session });
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const profile = await get().fetchProfile();
          await syncToAppStore(profile);
        }
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, session: null, profile: null });
        await syncToAppStore(null);
      }
    });
  },

  // Email/password sign-up — sends a confirmation email before the user can log in
  signup: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      // user_profiles row is created automatically by the DB trigger with role = 'user'
      set({ user: data.user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // Email/password sign-in
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      set({ user: data.user, session: data.session });

      await supabase
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', data.user.id);

      const profile = await get().fetchProfile();
      await syncToAppStore(profile);
      set({ isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // Google SSO — redirects the user to Google then back to the app.
  // Requires Google OAuth enabled in the Supabase dashboard (Auth > Providers).
  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null, profile: null, isLoading: false });
      await syncToAppStore(null);
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  fetchProfile: async () => {
    const userId = get().user?.id;
    if (!userId) {
      set({ profile: null });
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      set({ profile: data });
      return data as UserProfile;
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      set({ profile: null });
      return null;
    }
  },
}));
