import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { auditLog } from "../lib/auditLog";

export interface Warehouse {
    id: string;
    name: string;
    region_id: string;
    address: string;
    contact_person: string;
    phone: string;
    status: string;
    created_at: string;
    updated_at: string;
}

interface WarehouseState {
    warehouses: Warehouse[];
    isLoading: boolean;

    fetchWarehouses: () => Promise<void>;

    addWarehouses: (
        payload: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>
    ) => Promise<Warehouse>;

    deleteWarehouse: (id: string) => Promise<void>;

    updateWarehouse: (
        id: string,
        payload: Partial<Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>>
    ) => Promise<Warehouse>;
}

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
    warehouses: [],
    isLoading: true,

    fetchWarehouses: async () => {
        set({ isLoading: true });
        const { data, error } = await supabase
            .from('warehouses')
            .select('*')
            .order('name', { ascending: true });
        if (error) {
            console.error("Error fetching warehouses:", error);
            set({ isLoading: false });
            return;
        }
        set({ warehouses: data || [], isLoading: false });
    },

    addWarehouses: async (payload) => {
        const { data, error } = await supabase
            .from('warehouses')
            .insert([payload])
            .select()
            .single();
        if (error) throw error;

        auditLog({ action: 'CREATE', module: 'Warehouses', record_id: data!.id, new_value: data! });

        await get().fetchWarehouses();
        return data!;
    },

    deleteWarehouse: async (id: string) => {
        const existing = get().warehouses.find((w) => w.id === id);

        const { error } = await supabase
            .from('warehouses')
            .delete()
            .eq('id', id);
        if (error) throw error;

        auditLog({ action: 'DELETE', module: 'Warehouses', record_id: id, old_value: existing ?? null });

        await get().fetchWarehouses();
    },

    updateWarehouse: async (id: string, payload: Partial<Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>>) => {
        const existing = get().warehouses.find((w) => w.id === id);

        const { data, error } = await supabase
            .from('warehouses')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;

        auditLog({ action: 'UPDATE', module: 'Warehouses', record_id: id, old_value: existing ?? null, new_value: data! });

        await get().fetchWarehouses();
        return data!;
    },
}));
