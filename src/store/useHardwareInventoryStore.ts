import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { auditLog } from '../lib/auditLog';
import type { HardwareInventory } from '../lib/types';



interface HardwareInventoryState {
  hardwareInventory: HardwareInventory[];
  isLoading: boolean;
  error: string | null;

  fetchHardwareInventory: () => Promise<void>;
  createHardwareInventory: (data: Omit<HardwareInventory, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>) => Promise<HardwareInventory>;
  updateHardwareInventory: (id: string, updates: Partial<HardwareInventory>) => Promise<void>;
  deleteHardwareInventory: (id: string) => Promise<void>;
}

export const useHardwareInventoryStore = create<HardwareInventoryState>((set, get) => ({
  hardwareInventory: [],
  isLoading: false,
  error: null,

  
  fetchHardwareInventory: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('hardware_inventory')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ hardwareInventory: (data ?? []) as HardwareInventory[] });
    } catch (err) {
      console.error('[HardwareInventoryStore] fetchHardwareInventory error:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  createHardwareInventory: async (data) => {

    // Check for duplicate serial number
    const { data: existing } = await supabase
      .from('hardware_inventory')
      .select('id')
      .eq('serial_number', data.serial_number)
      .eq('is_deleted', false)
      .single();

    if (existing) {
      throw new Error('Serial number already exists');
    }

    // Create new hardware inventory item directly (no quantity or existing check)
    const { data: result, error: insertError } = await supabase
      .from('hardware_inventory')
      .insert([{
        name: data.name,
        item_type: data.item_type,
        specifications: data.specifications || {},
        manufacturer: data.manufacturer || '',
        model: data.model || '',
        serial_number: data.serial_number || '',
        asset_tag: data.asset_tag || '',
        status: data.status || 'available',
        condition: data.condition || 'working',
        region_id: data.region_id || null,
        warehouse_id: data.warehouse_id || null,
        created_by: data.created_by || null,
        updated_by: null,
        is_deleted: false,
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    const item = result as HardwareInventory;
    set((s) => ({ hardwareInventory: [item, ...s.hardwareInventory] }));

    auditLog({
      action: 'CREATE',
      module: 'HardwareInventory',
      record_id: item.id,
      new_value: {
        name: item.name,
        status: item.status,
        condition: item.condition,
      },
    });

    return item;
  },

  updateHardwareInventory: async (id, updates) => {
    const existing = get().hardwareInventory.find((i) => i.id === id);

    const { error } = await supabase
      .from('hardware_inventory')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;

    set((s) => ({
      hardwareInventory: s.hardwareInventory.map((i) =>
        i.id === id ? { ...i, ...updates, updated_at: new Date().toISOString() } : i
      ),
    }));

    auditLog({
      action: 'UPDATE',
      module: 'HardwareInventory',
      record_id: id,
      old_value: existing ? { name: existing.name, status: existing.status } : null,
      new_value: { ...updates },
    });
  },

  deleteHardwareInventory: async (id) => {
    const existing = get().hardwareInventory.find((i) => i.id === id);

    const { error } = await supabase
      .from('hardware_inventory')
      .delete()
      .eq('id', id);
    if (error) throw error;

    set((s) => ({ hardwareInventory: s.hardwareInventory.filter((i) => i.id !== id) }));

    auditLog({
      action: 'DELETE',
      module: 'HardwareInventory',
      record_id: id,
      old_value: existing ? { name: existing.name } : null,
    });
  },
}));