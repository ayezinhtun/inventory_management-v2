import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { auditLog } from "../lib/auditLog";

export interface Region {
    id: string;
    name: string;
    description: string;
    status: string;
    created_at: string;
    updated_at: string;
}

interface RegionState {
    regions: Region[];
    isLoading: boolean;

    fetchRegions: () => Promise<void>;

    addRegion: (
        payload: Omit<Region, "id" | "created_at" | "updated_at">
    ) => Promise<Region>;

    deleteRegion: (id: string) => Promise<void>;

    updateRegion: (
      id: string,
      payload: Partial<Omit<Region, 'id' | 'created_at' | 'updated_at'>>,
    ) => Promise<Region>;
}

export const useRegionStore = create<RegionState>((set, get) => ({
  regions: [],
  isLoading: true,

  fetchRegions: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from("regions")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      console.error("Error fetching regions:", error);
      set({ isLoading: false });
      return;
    }
    set({ regions: data || [], isLoading: false });
  },

  addRegion: async (payload) => {
    const { data, error } = await supabase
      .from("regions")
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    await get().fetchRegions();

    auditLog({ action: 'CREATE', module: 'Regions', record_id: data!.id, new_value: data! });

    return data!;
  },

  deleteRegion: async (id: string) => {
    const existing = get().regions.find((r) => r.id === id);

    const { error } = await supabase.from('regions').delete().eq('id', id);
    if (error) throw error;

    auditLog({ action: 'DELETE', module: 'Regions', record_id: id, old_value: existing ?? null });

    await get().fetchRegions();
  },

  updateRegion: async (id: string, payload: Partial<Omit<Region, 'id' | 'created_at' | 'updated_at'>>) => {
    const existing = get().regions.find((r) => r.id === id);

    const { data, error } = await supabase
      .from('regions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    auditLog({ action: 'UPDATE', module: 'Regions', record_id: id, old_value: existing ?? null, new_value: data! });

    await get().fetchRegions();
    return data!;
  },
}));
