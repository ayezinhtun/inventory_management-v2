import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { auditLog } from '../lib/auditLog';

export interface Customer {
  id: string;
  customer_name: string;
  customer_type: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface CustomersState {
  customers: Customer[];
  isLoading: boolean;

  fetchCustomers: () => Promise<void>;
  createCustomer: (payload: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => Promise<Customer>;
  updateCustomer: (id: string, payload: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
}

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [],
  isLoading: false,

  fetchCustomers: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('customer_name', { ascending: true });
    if (error) {
      console.error('fetchCustomers error:', error);
      set({ isLoading: false });
      return;
    }
    set({ customers: data || [], isLoading: false });
  },

  createCustomer: async (payload) => {
    const { data, error } = await supabase
      .from('customers')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;

    auditLog({ action: 'CREATE', module: 'Customers', record_id: data!.id, new_value: data! });

    await get().fetchCustomers();
    return data!;
  },

  updateCustomer: async (id, payload) => {
    const existing = get().customers.find((c) => c.id === id);

    const { data, error } = await supabase
      .from('customers')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    auditLog({ action: 'UPDATE', module: 'Customers', record_id: id, old_value: existing ?? null, new_value: data! });

    set((s) => ({
      customers: s.customers.map((c) => (c.id === id ? data! : c)),
    }));
    return data!;
  },

  deleteCustomer: async (id) => {
    const existing = get().customers.find((c) => c.id === id);

    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;

    auditLog({ action: 'DELETE', module: 'Customers', record_id: id, old_value: existing ?? null });

    set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }));
  },
}));
