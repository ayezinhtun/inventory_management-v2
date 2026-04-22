import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Component } from '../lib/types';

interface ComponentsState {
  components: Component[];
  isLoading: boolean;

  fetchComponents: () => Promise<void>;
  createComponent: (data: Omit<Component, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>) => Promise<Component>;
  updateComponent: (id: string, updates: Partial<Component>) => Promise<void>;
  deleteComponent: (id: string) => Promise<void>;
}

export const useComponentsStore = create<ComponentsState>((set, get) => ({
  components: [],
  isLoading: false,

  fetchComponents: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('components')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ components: (data ?? []) as Component[] });
    } catch (err) {
      console.error('[ComponentsStore] fetchComponents error:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  createComponent: async (data) => {
    const { data: result, error } = await supabase
      .from('components')
      .insert([{
        item_name: data.item_name,
        component_type_id: data.component_type_id || null,
        manufacturer: data.manufacturer || '',
        model: data.model || '',
        part_number: data.part_number || '',
        specifications: data.specifications || {},
        region_id: data.region_id || null,
        warehouse_id: data.warehouse_id || null,
        bin_location: data.bin_location || '',
        quantity: data.quantity ?? 1,
        reserved_quantity: data.reserved_quantity ?? 0,
        minimum_stock: data.minimum_stock ?? 0,
        reorder_quantity: data.reorder_quantity ?? 0,
        status: data.status || 'Working',
        condition: data.condition || 'New',
        tested: data.tested ?? false,
        test_date: data.test_date || null,
        test_results: data.test_results || '',
        purchase_date: data.purchase_date || null,
        purchase_price: data.purchase_price ?? null,
        vendor: data.vendor || '',
        purchase_order_number: data.purchase_order_number || '',
        warranty_type: data.warranty_type || '',
        warranty_expiry_date: data.warranty_expiry_date || null,
        compatible_with: data.compatible_with || '',
        notes: data.notes || '',
        tags: data.tags ?? [],
        barcode: data.barcode || '',
        created_by: data.created_by || null,
        updated_by: data.updated_by || null,
        is_deleted: false,
      }])
      .select()
      .single();
    if (error) throw error;

    const component = result as Component;
    set((s) => ({ components: [component, ...s.components] }));

    // Write audit log (fire-and-forget)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      (async () => {
        await supabase.from('audit_logs').insert({
          user_id: session.user.id,
          action: 'CREATE',
          module: 'Components',
          record_id: component.id,
          old_value: null,
          new_value: { item_name: component.item_name, quantity: component.quantity },
        });
      })().catch(() => {});
    }

    return component;
  },

  updateComponent: async (id, updates) => {
    const { error } = await supabase
      .from('components')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    set((s) => ({
      components: s.components.map((c) =>
        c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
      ),
    }));
  },

  deleteComponent: async (id) => {
    const { error } = await supabase
      .from('components')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    set((s) => ({ components: s.components.filter((c) => c.id !== id) }));
  },
}));
