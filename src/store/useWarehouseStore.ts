import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { Payload } from "recharts/types/component/DefaultLegendContent";


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
        Payload: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>
    ) => Promise<Warehouse>;

    deleteWarehouse: (id: string) => Promise<void>;

    updateWarehouse: (
        id: string, 
        payload: Partial<Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>>
    ) => Promise<Warehouse>;

}

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
    warehouses: [],
    isLoading: false, 

    fetchWarehouses: async () => {
        set({ isLoading: true });

        const {data, error} = await supabase
            .from('warehouses')
            .select('*')
            .order('name', {ascending: true});

        if(error) {
            console.error("Error fetching warehouses:", error);
            set({isLoading: false});
            return;
        }

        set({warehouses: data || [], isLoading: false});
    }, 

    addWarehouses: async(payload) => {
        const {data, error} = await supabase
            .from('warehouses')
            .insert([payload])
            .select()
            .single();
        
        if(error) throw error;
        await get().fetchWarehouses();
        return data!;
    },

    deleteWarehouse: async(id: string) => {
        const {error} = await supabase
            .from('warehouses')
            .delete()
            .eq('id', id);

        if(error) throw error;
        await get().fetchWarehouses();
    }, 

    updateWarehouse: async(id: string, payload: Partial<Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>>) => {
        const {data, error} = await supabase
            .from('warehouses')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        
        if(error) throw error;

        await get().fetchWarehouses();
        return data!;
    }
}
))
