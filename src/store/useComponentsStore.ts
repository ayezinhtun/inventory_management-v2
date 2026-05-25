import { create } from 'zustand';

import { supabase } from '../lib/supabase';

import { auditLog } from '../lib/auditLog';

import type { Component } from '../lib/types';



interface ComponentsState {

  components: Component[];

  isLoading: boolean;



  fetchComponents: () => Promise<void>;

  createComponent: (data: Omit<Component, 'id' | 'created_at' | 'updated_at' | 'is_deleted'> & { quantity?: number }) => Promise<Component>;

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

    const componentsToInsert = Array.from({ length: data.quantity ?? 1 }, (_, i) => ({

      name: data.name,

      component_type_id: data.component_type_id,

      specifications: data.specifications,

      manufacturer: data.manufacturer,

      model: data.model,

      part_number: data.part_number,

      compatible_with: data.compatible_with,

      status: data.status,

      condition: data.condition,

      region_id: data.region_id,

      warehouse_id: data.warehouse_id,

      installed_in_device_id: data.installed_in_device_id,

      created_by: data.created_by,

      updated_by: null,

      is_deleted: false

    }));



    const { data: result, error } = await supabase

      .from('components')

      .insert(componentsToInsert)

      .select();



    if (error) throw error;



    const newComponents = result as Component[];

    set((s) => ({ components: [...newComponents, ...s.components] }));



    // Log audit for each created component

    newComponents.forEach((comp) => {

      auditLog({

        action: 'CREATE',

        module: 'Components',

        record_id: comp.id,

        new_value: { name: comp.name, status: comp.status, quantity: data.quantity ?? 1 },

      });

    });



    return newComponents[0]; // Return first component

  },



  updateComponent: async (id, updates) => {

    const existing = get().components.find((c) => c.id === id);



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



    auditLog({

      action: 'UPDATE',

      module: 'Components',

      record_id: id,

      old_value: existing ? { name: existing.name, status: existing.status, quantity: existing.quantity } : null,

      new_value: { ...updates },

    });

  },







  deleteComponent: async (id) => {

    const existing = get().components.find((c) => c.id === id);



    const { error } = await supabase

      .from('components')

      .delete()

      .eq('id', id);

    

    if (error) {

      console.error('Delete component error:', error);

      throw error;

    }



    set((s) => ({ components: s.components.filter((c) => c.id !== id) }));



    auditLog({

      action: 'DELETE',

      module: 'Components',

      record_id: id,

      old_value: existing ? { name: existing.name, status: existing.status } : null,

    });

  },

}));

