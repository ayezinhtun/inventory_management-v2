import { create } from 'zustand';

import { supabase } from '../lib/supabase';

import type { Reservation } from '../lib/types';

import { auditLog } from '../lib/auditLog';



interface ReservationsState {

    reservations: Reservation[];

    isLoading: boolean;

    fetchReservations: () => Promise<void>;

    createReservation: (data: Omit<Reservation, 'id' | 'reserved_at' | 'released_at' | 'status' | 'reserved_by'>) => Promise<void>;

    releaseReservation: (id: string, componentId?: string, hardwareId?: string) => Promise<void>;

    deleteReservation: (id: string, componentId?: string, hardwareId?: string) => Promise<void>;

}



export const useReservationsStore = create<ReservationsState>((set, get) => ({

    reservations: [],

    isLoading: false,



    fetchReservations: async () => {

        set({ isLoading: true });

        try {

            const { data, error } = await supabase

                .from('reservations')

                .select('*')

                .order('reserved_at', { ascending: false });



            if (error) throw error;

            set({ reservations: data || [] });

        } catch (error) {

            console.error('Error fetching reservations:', error);

        } finally {

            set({ isLoading: false });

        }

    },



    createReservation: async (data) => {

        try {

            // Get the current authenticated user's ID from Supabase

            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError) throw userError;

            if (!user) throw new Error('User not authenticated');



            // Check if there's already an active reservation for this item

            let existingReservation;

            if (data.component_id) {

                const { data: existing } = await supabase

                    .from('reservations')

                    .select('*')

                    .eq('component_id', data.component_id)

                    .eq('status', 'active')

                    .single();

                existingReservation = existing;

            } else if (data.hardware_inventory_id) {

                const { data: existing } = await supabase

                    .from('reservations')

                    .select('*')

                    .eq('hardware_inventory_id', data.hardware_inventory_id)

                    .eq('status', 'active')

                    .single();

                existingReservation = existing;

            }



            if (existingReservation) {

                throw new Error('This item is already reserved. Please release the existing reservation first.');

            }



            const { data: newReservation, error } = await supabase

                .from('reservations')

                .insert({

                    component_id: data.component_id,

                    hardware_inventory_id: data.hardware_inventory_id,

                    reserved_by: user.id, // Use the actual auth user ID

                    note: data.note,

                })

                .select()

                .single();



            if (error) throw error;



            set((state) => ({

                reservations: [newReservation, ...state.reservations],

            }));



            // Log audit for reservation creation

            auditLog({

                action: 'CREATE',

                module: 'Reservations',

                record_id: newReservation.id,

                new_value: {

                    component_id: data.component_id,

                    hardware_inventory_id: data.hardware_inventory_id,

                    note: data.note,

                },

            });

        } catch (error) {

            console.error('Error creating reservation:', error);

            throw error;

        }

    },



    releaseReservation: async (id, componentId, hardwareId) => {

        try {

            // Update reservation status

            const { error } = await supabase

                .from('reservations')

                .update({

                    status: 'released',

                    released_at: new Date().toISOString(),

                })

                .eq('id', id);



            if (error) throw error;



            // Update component/inventory status back to available

            if (componentId) {

                const { useComponentsStore } = await import('./useComponentsStore');

                await useComponentsStore.getState().updateComponent(componentId, {

                    status: 'available',

                });

            }



            if (hardwareId) {

                const { useHardwareInventoryStore } = await import('./useHardwareInventoryStore');

                await useHardwareInventoryStore.getState().updateHardwareInventory(hardwareId, {

                    status: 'available',

                });

            }



            set((state) => ({

                reservations: state.reservations.map((r) =>

                    r.id === id ? { ...r, status: 'released', released_at: new Date().toISOString() } : r

                ),

            }));



            // Log audit for reservation release

            auditLog({

                action: 'UPDATE',

                module: 'Reservations',

                record_id: id,

                new_value: { status: 'released' },

            });

        } catch (error) {

            console.error('Error releasing reservation:', error);

            throw error;

        }

    },



    deleteReservation: async (id, componentId, hardwareId) => {

        try {

            // Delete the reservation

            const { error } = await supabase

                .from('reservations')

                .delete()

                .eq('id', id);



            if (error) throw error;



            // Update component/inventory status back to available if it was reserved

            if (componentId) {

                const { useComponentsStore } = await import('./useComponentsStore');

                await useComponentsStore.getState().updateComponent(componentId, {

                    status: 'available',

                });

            }



            if (hardwareId) {

                const { useHardwareInventoryStore } = await import('./useHardwareInventoryStore');

                await useHardwareInventoryStore.getState().updateHardwareInventory(hardwareId, {

                    status: 'available',

                });

            }



            // Remove from local state

            set((state) => ({

                reservations: state.reservations.filter((r) => r.id !== id),

            }));

        } catch (error) {

            console.error('Error deleting reservation:', error);

            throw error;

        }

    },

}));