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
  assigned_region_ids?: string[];
  assigned_warehouse_ids?: string[];
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
    region_ids?: string[];
    warehouse_ids?: string[];
  }) => Promise<string>;
  deleteUser: (userId: string) => Promise<void>;
  resetUserPassword: (userId: string) => Promise<string>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  fetchUserActivity: (userId: string) => Promise<UserActivityLog[]>;
  subscribeToPresence: () => () => void;
  fetchUserAssignments: (userId: string) => Promise<{ regions: string[]; warehouses: string[] }>;
  updateUserAssignments: (userId: string, regionIds: string[], warehouseIds: string[]) => Promise<void>;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  isLoading: false,

  fetchUsers: async () => {
    set({ isLoading: true });
    try {
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (usersError) throw usersError;

      // Fetch all assignments
      const [regionsRes, warehousesRes] = await Promise.all([
        supabase.from('user_regions').select('user_id, region_id'),
        supabase.from('user_warehouses').select('user_id, warehouse_id'),
      ]);

      // Map assignments to users
      const users = (usersData ?? []).map(user => {
        const userRegions = regionsRes.data?.filter(r => r.user_id === user.user_id) ?? [];
        const userWarehouses = warehousesRes.data?.filter(w => w.user_id === user.user_id) ?? [];

        return {
          ...user,
          assigned_region_ids: userRegions.map(r => r.region_id),
          assigned_warehouse_ids: userWarehouses.map(w => w.warehouse_id),
        };
      });

      set({ users });
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
      })().catch(() => { });
    }

    set((s) => ({
      users: s.users.map((u) => u.user_id === userId ? { ...u, ...updates } : u),
    }));
  },

  createUser: async (data) => {
    // Get the current user's session token
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    console.log('Creating user with data:', data);

    // Use regular fetch instead of supabase.functions.invoke
    // This lets us control the headers (no automatic Authorization header)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-actions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, // ADD THIS
        },
        body: JSON.stringify({
          action: 'create',
          ...data,
          _token: token,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create user');
    }

    // Add new user to local state instead of refetching all users
    if (result.user_id) {
      const newUser: UserRecord = {
        id: result.user_id,
        user_id: result.user_id,
        name: data.name,
        email: data.email,
        role: data.role,
        assigned_region_ids: data.region_ids || [],
        assigned_warehouse_ids: data.warehouse_ids || [],
        status: 'active',
        force_password_change: true,
        last_seen_at: null,
        last_login_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      set((s) => ({ users: [newUser, ...s.users] }));
    }

    auditLog({ action: 'CREATE', module: 'User Management', record_id: result.user_id ?? null, new_value: { name: data.name, email: data.email, role: data.role } });
    return result.password as string;
  },

  deleteUser: async (userId) => {
    const existing = get().users.find((u) => u.user_id === userId);

    // Get token
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    // Use fetch instead of supabase.functions.invoke
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-actions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'delete',
          target_user_id: userId,
          _token: token,
        }),
      }
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete user');
    }

    if (result?.error) throw new Error(result.error);

    auditLog({ action: 'DELETE', module: 'User Management', record_id: userId, old_value: existing ? { name: existing.name, email: existing.email } : null });
    set((s) => ({ users: s.users.filter((u) => u.user_id !== userId) }));
  },

  fetchUserAssignments: async (userId) => {
    const [regionsRes, warehousesRes] = await Promise.all([
      supabase.from('user_regions').select('region_id').eq('user_id', userId),
      supabase.from('user_warehouses').select('warehouse_id').eq('user_id', userId),
    ]);
    return {
      regions: (regionsRes.data ?? []).map(r => r.region_id),
      warehouses: (warehousesRes.data ?? []).map(w => w.warehouse_id),
    };
  },

  updateUserAssignments: async (userId, regionIds, warehouseIds) => {
    // Delete existing
    await Promise.all([
      supabase.from('user_regions').delete().eq('user_id', userId),
      supabase.from('user_warehouses').delete().eq('user_id', userId),
    ]);

    // Insert new
    const regionRows = regionIds.map(rid => ({ user_id: userId, region_id: rid }));
    const warehouseRows = warehouseIds.map(wid => ({ user_id: userId, warehouse_id: wid }));

    if (regionRows.length > 0) await supabase.from('user_regions').insert(regionRows);
    if (warehouseRows.length > 0) await supabase.from('user_warehouses').insert(warehouseRows);
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
