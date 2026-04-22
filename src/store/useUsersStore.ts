import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { auditLog } from '../lib/auditLog';

export interface UserRecord {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  username?: string | null;
  region_id?: string | null;
  warehouse_id?: string | null;
  status: string;
  force_password_change: boolean;
  last_seen_at?: string | null;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserActivityLog {
  id: string;
  user_id: string;
  actor_id: string | null;
  action: string;
  details: Record<string, any> | null;
  created_at: string;
}

interface UsersState {
  users: UserRecord[];
  isLoading: boolean;

  fetchUsers: () => Promise<void>;
  updateUserRecord: (userId: string, updates: Partial<UserRecord>) => Promise<void>;
  createUser: (data: {
    email: string;
    name: string;
    role: string;
    region_id?: string | null;
    warehouse_id?: string | null;
  }) => Promise<string>;
  deleteUser: (userId: string) => Promise<void>;
  resetUserPassword: (userId: string) => Promise<string>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  fetchUserActivity: (userId: string) => Promise<UserActivityLog[]>;
  subscribeToPresence: () => () => void;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  isLoading: false,

  fetchUsers: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ users: (data ?? []) as UserRecord[] });
    } finally {
      set({ isLoading: false });
    }
  },

  updateUserRecord: async (userId, updates) => {
    const existing = get().users.find((u) => u.user_id === userId);
    const { error } = await supabase
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    if (error) throw error;
    auditLog({ action: 'UPDATE', module: 'User Management', record_id: userId, old_value: existing ? { name: existing.name, role: existing.role, status: existing.status } : null, new_value: updates as Record<string, unknown> });

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      (async () => {
        await supabase.from('user_activity_logs').insert({
          user_id: userId,
          actor_id: session.user.id,
          action: 'PROFILE_UPDATED',
          details: updates,
        });
      })().catch(() => {});
    }

    set((s) => ({
      users: s.users.map((u) => u.user_id === userId ? { ...u, ...updates } : u),
    }));
  },

  createUser: async (data) => {
    const { data: result, error } = await supabase.functions.invoke('admin-user-actions', {
      body: { action: 'create', ...data },
    });
    if (error) throw new Error(error.message);
    if (result?.error) throw new Error(result.error);
    await get().fetchUsers();
    auditLog({ action: 'CREATE', module: 'User Management', record_id: result.user_id ?? null, new_value: { name: data.name, email: data.email, role: data.role } });
    return result.password as string;
  },

  deleteUser: async (userId) => {
    const existing = get().users.find((u) => u.user_id === userId);
    const { data: result, error } = await supabase.functions.invoke('admin-user-actions', {
      body: { action: 'delete', target_user_id: userId },
    });
    if (error) throw new Error(error.message);
    if (result?.error) throw new Error(result.error);
    auditLog({ action: 'DELETE', module: 'User Management', record_id: userId, old_value: existing ? { name: existing.name, email: existing.email } : null });
    set((s) => ({ users: s.users.filter((u) => u.user_id !== userId) }));
  },

  resetUserPassword: async (userId) => {
    const { data: result, error } = await supabase.functions.invoke('admin-user-actions', {
      body: { action: 'reset_password', target_user_id: userId },
    });
    if (error) throw new Error(error.message);
    if (result?.error) throw new Error(result.error);
    set((s) => ({
      users: s.users.map((u) =>
        u.user_id === userId ? { ...u, force_password_change: true } : u
      ),
    }));
    return result.password as string;
  },

  sendPasswordResetEmail: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  },

  fetchUserActivity: async (userId) => {
    const { data, error } = await supabase
      .from('user_activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as UserActivityLog[];
  },

  subscribeToPresence: () => {
    const channel = supabase
      .channel('user-profiles-presence')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_profiles' },
        (payload) => {
          const updated = payload.new as UserRecord;
          set((s) => ({
            users: s.users.map((u) =>
              u.user_id === updated.user_id
                ? { ...u, last_seen_at: updated.last_seen_at }
                : u
            ),
          }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));
