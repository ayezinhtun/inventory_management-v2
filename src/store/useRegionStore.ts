import { create } from "zustand";
import { supabase } from "../lib/supabase";

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
        Payload: Omit<Region, "id" | "created_at" | "updated_at">
    ) => Promise<Region>;

    deleteRegion: (id: string) => Promise<void>;

    updateRegion: (
      id: string, 
      payload: Partial<Omit<Region, 'id' | 'created_at' | 'updated_at'>>,
    ) => Promise<Region>;
}


export const useRegionStore = create<RegionState>((set, get) => ({
  regions: [],
  isLoading: false,
 
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
    return data!;
  },

  //for delete region
  deleteRegion: async (id: string) => {
    const {error} = await supabase.from('regions').delete().eq('id', id);

    if(error) throw error;

    await get().fetchRegions();
  }, 

  // for update region

  updateRegion: async (id: string, payload: Partial<Omit<Region, 'id' | 'created_at' | 'updated_at'>>) => {
    const {data, error} = await supabase
      .from('regions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if(error) throw error;

    await get().fetchRegions();
    return data!;
  }

}));