import { create } from "zustand";
import { supabase } from "../lib/supabase";

// Define UserProfile interface
export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  region_id?: string;
  warehouse_id?: string;
  status: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// Define AuthState interface
interface AuthState {
  user: any | null;
  profile: UserProfile | null;
  isLoading: boolean;
  
  signup: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,

  signup: async (email: string, password: string, name: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          }
        }
      });
      
      if (error) throw error;
      
      set({ user: data.user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      set({ user: data.user, isLoading: false });
      
      // Fetch user profile after login and update last login
      if (data.user) {
        // Update last login
        await supabase
          .from('user_profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('user_id', data.user.id);
          
        // Fetch profile
        await get().fetchProfile();
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      set({ user: null, profile: null, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchProfile: async () => {
    if (!get().user) {
      set({ profile: null });
      return;
    }

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', get().user.id)
        .single();

      if (error) throw error;
      
      set({ profile: data, isLoading: false });
    } catch (error) {
      console.error('Error fetching profile:', error);
      set({ profile: null, isLoading: false });
    }
  },

  checkSession: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        set({ user: session.user });
        await get().fetchProfile();
      } else {
        set({ user: null, profile: null });
      }
    } catch (error) {
      console.error('Error checking session:', error);
      set({ user: null, profile: null });
    } finally {
      set({ isLoading: false });
    }
  },
}));