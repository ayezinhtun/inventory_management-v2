import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Component, RelocationRequest } from '../lib/types';
import { useStore } from './useStore';
import { useComponentsStore } from './useComponentsStore';
import { useHardwareInventoryStore } from './useHardwareInventoryStore';
import { auditLog } from '../lib/auditLog';

interface RelocationState {
  // State
  relocationRequests: RelocationRequest[];

  // Actions
  fetchRelocationRequests: () => Promise<void>;
  createRelocationRequest: (request: Partial<RelocationRequest>) => Promise<void>;
  updateRelocationRequest: (id: string, updates: Partial<RelocationRequest>) => Promise<void>;
  approveRelocationPM: (id: string, comments: string) => void;
  rejectRelocationPM: (id: string, comments: string) => void;
  approveRelocationAdmin: (id: string, comments: string) => void;
  rejectRelocationAdmin: (id: string, comments: string) => void;
  completeRelocation: (id: string, notes: string) => void;
}

// Helper functions
const generateRequestNumber = (prefix: string): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `${prefix}-${year}-${random}`;
};

export const useRelocationStore = create<RelocationState>((set, get) => ({
  // State
  relocationRequests: [],

  // Fetch relocation requests from database
  fetchRelocationRequests: async () => {
    const { data, error } = await supabase
      .from('relocation_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching relocation requests:', error);
      throw error;
    }

    set({ relocationRequests: data as RelocationRequest[] });
  },

  // Create relocation request
  createRelocationRequest: async (request) => {
    const { data, error } = await supabase
      .from('relocation_requests')
      .insert([{
        request_number: request.request_number || generateRequestNumber('RR'),
        requester_id: request.requester_id || '',
        relocation_type: request.relocation_type || 'INVENTORY',
        inventory_id: request.inventory_id || null,
        component_id: request.component_id || null,
        quantity: request.quantity || 1,
        source_region_id: request.source_region_id || null,
        source_warehouse_id: request.source_warehouse_id || null,
        source_server_id: request.source_server_id || null,
        destination_region_id: request.destination_region_id || null,
        destination_warehouse_id: request.destination_warehouse_id || null,
        destination_server_id: request.destination_server_id || null,
        reason: request.reason || '',
        urgency: request.urgency || 'Medium',
        notes: request.notes || '',
        status: request.status || 'Submitted',
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating relocation request:', error);
      throw error;
    }

    // Update local state with created request
    set((s) => ({ relocationRequests: [...s.relocationRequests, data] }));

    // Audit log for request creation
    auditLog({
      action: 'CREATE',
      module: 'Relocation Request',
      record_id: data.id,
      new_value: data
    });
  },

  // Update relocation request
  updateRelocationRequest: async (id, updates) => {
    set((s) => ({
      relocationRequests: s.relocationRequests.map((req) =>
        req.id === id ? { ...req, ...updates, updated_at: new Date().toISOString() } : req
      ),
    }));
  },

  // PM Approve relocation request
  approveRelocationPM: async (id, comments) => {
    const now = new Date().toISOString();
    const currentUser = useStore.getState().currentUser;

    // Update local state first for immediate UI feedback
    set((s) => ({
      relocationRequests: s.relocationRequests.map((r) =>
        r.id === id ?
          {
            ...r,
            status: 'Pending Admin Approval',
            pm_reviewed_by: currentUser?.id || '',
            pm_reviewed_at: now,
            pm_comments: comments || '',
            updated_at: now
          } : r
      )
    }));

    // Persist to database
    try {
      const { error } = await supabase
        .from('relocation_requests')
        .update({
          status: 'Pending Admin Approval',
          pm_reviewed_by: currentUser?.id || '',
          pm_reviewed_at: now,
          pm_comments: comments || '',
          updated_at: now
        })
        .eq('id', id);

      if (error) {
        console.error('Error approving PM request:', error);
        // Revert the local state if database update fails
        const originalRequest = get().relocationRequests.find(r => r.id === id);
        if (originalRequest) {
          set((s) => ({
            relocationRequests: s.relocationRequests.map((r) =>
              r.id === id ? originalRequest : r
            )
          }));
        }
        throw error;
      }

      // Audit log for PM approval
      const updatedRequest = get().relocationRequests.find(r => r.id === id);
      if (updatedRequest) {
        auditLog({
          action: 'UPDATE',
          module: 'Relocation Request',
          record_id: id,
          old_value: { status: 'Pending PM Approval' },
          new_value: {
            status: 'Pending Admin Approval',
            pm_reviewed_by: currentUser?.id,
            pm_comments: comments
          }
        });
      }
    } catch (error) {
      console.error('PM approval failed:', error);
      throw error;
    }
  },

  // PM Reject relocation request
  rejectRelocationPM: async (id, comments) => {
    const now = new Date().toISOString();
    const currentUser = useStore.getState().currentUser;
    const req = get().relocationRequests.find((r) => r.id === id);

    // Update local state first for immediate UI feedback
    set((s) => ({
      relocationRequests: s.relocationRequests.map((r) =>
        r.id === id ?
          {
            ...r,
            status: 'Rejected by PM',
            pm_reviewed_by: currentUser?.id || '',
            pm_reviewed_at: now,
            pm_comments: comments || '',
            updated_at: now
          } : r
      )
    }));

    // Persist to database
    try {
      const { error } = await supabase
        .from('relocation_requests')
        .update({
          status: 'Rejected by PM',
          pm_reviewed_by: currentUser?.id || '',
          pm_reviewed_at: now,
          pm_comments: comments || '',
          updated_at: now
        })
        .eq('id', id);

      if (error) {
        console.error('Error rejecting PM request:', error);
        // Revert the local state if database update fails
        const originalRequest = get().relocationRequests.find(r => r.id === id);
        if (originalRequest) {
          set((s) => ({
            relocationRequests: s.relocationRequests.map((r) =>
              r.id === id ? originalRequest : r
            )
          }));
        }
        throw error;
      }

      // Audit log for PM rejection
      const updatedRequest = get().relocationRequests.find(r => r.id === id);
      if (updatedRequest) {
        auditLog({
          action: 'UPDATE',
          module: 'Relocation Request',
          record_id: id,
          old_value: { status: req?.status || 'Pending PM Approval' },
          new_value: {
            status: 'Rejected by PM',
            pm_reviewed_by: currentUser?.id,
            pm_comments: comments
          }
        });
      }
    } catch (error) {
      console.error('PM rejection failed:', error);
      throw error;
    }
  },

  // Admin Approve relocation request
  approveRelocationAdmin: async (id, comments) => {
    const now = new Date().toISOString();
    const currentUser = useStore.getState().currentUser;

    set((s) => ({
      relocationRequests: s.relocationRequests.map((r) =>
        r.id === id ?
          {
            ...r,
            status: 'Approved',
            admin_reviewed_by: currentUser?.id || '',
            admin_reviewed_at: now,
            admin_comments: comments || '',
            updated_at: now
          } : r
      )
    }));

    // Persist to database
    try {
      const { error } = await supabase
        .from('relocation_requests')
        .update({
          status: 'Approved',
          admin_reviewed_by: currentUser?.id || '',
          admin_reviewed_at: now,
          admin_comments: comments || '',
          updated_at: now
        })
        .eq('id', id);

      if (error) {
        console.error('Error approving admin request:', error);
        throw error;
      }

      // Get the request details for updating inventory/component location
      const request = get().relocationRequests.find((r) => r.id === id);

      if (!request) {
        throw new Error('Request not found');
      }

      // Update the hardware inventory region and warehouse if it's an inventory relocation
      if (request.relocation_type === 'INVENTORY' && request.inventory_id) {
        const { error: inventoryError } = await supabase
          .from('hardware_inventory')
          .update({
            region_id: request.destination_region_id,
            warehouse_id: request.destination_warehouse_id,
            updated_at: now
          })
          .eq('id', request.inventory_id);

        if (inventoryError) {
          console.error('Error updating hardware inventory location:', inventoryError);
          throw inventoryError;
        }
      }

      // Update component location if it's a component relocation
      if (request.relocation_type === 'COMPONENT' && request.component_id) {
        // Check if moving to a server (hardware inventory) or warehouse
        if (request.destination_server_id) {
          // Moving to a server - install the component
          await useComponentsStore.getState().updateComponent(request.component_id, {
            status: 'installed',
            region_id: null,  // Clear region when installed in server
            warehouse_id: null,  // Clear warehouse when installed in server
            installed_in_device_id: request.destination_server_id,
            updated_by: currentUser?.user_id || null,
          });
        } else if (request.destination_warehouse_id) {
          // Moving to a warehouse - update location
          await useComponentsStore.getState().updateComponent(request.component_id, {
            status: 'available',
            region_id: request.destination_region_id,
            warehouse_id: request.destination_warehouse_id,
            installed_in_device_id: null,
            updated_by: currentUser?.user_id || null,
          });
        }
      }

      // Audit log for admin approval
      const updatedRequest = get().relocationRequests.find(r => r.id === id);
      if (updatedRequest) {
        auditLog({
          action: 'UPDATE',
          module: 'Relocation Request',
          record_id: id,
          old_value: { status: 'Pending Admin Approval' },
          new_value: {
            status: 'Approved',
            admin_reviewed_by: currentUser?.id,
            admin_comments: comments,
            destination_region_id: request.destination_region_id,
            destination_warehouse_id: request.destination_warehouse_id
          }
        });
      }
    } catch (error) {
      console.error('Admin approval failed:', error);
      throw error;
    }
  },

  // Admin Reject relocation request
  rejectRelocationAdmin: async (id, comments) => {
    const now = new Date().toISOString();
    const currentUser = useStore.getState().currentUser;

    // Update local state first for immediate UI feedback
    set((s) => ({
      relocationRequests: s.relocationRequests.map((r) =>
        r.id === id ?
          {
            ...r,
            status: 'Rejected by Admin',
            admin_reviewed_by: currentUser?.id || '',
            admin_reviewed_at: now,
            admin_comments: comments || '',
            updated_at: now
          } : r
      )
    }));

    // Persist to database
    try {
      const { error } = await supabase
        .from('relocation_requests')
        .update({
          status: 'Rejected by Admin',
          admin_reviewed_by: currentUser?.id || '',
          admin_reviewed_at: now,
          admin_comments: comments || '',
          updated_at: now
        })
        .eq('id', id);

      if (error) {
        console.error('Error rejecting admin request:', error);
        // Revert the local state if database update fails
        const originalRequest = get().relocationRequests.find(r => r.id === id);
        if (originalRequest) {
          set((s) => ({
            relocationRequests: s.relocationRequests.map((r) =>
              r.id === id ? originalRequest : r
            )
          }));
        }
        throw error;
      }

      // Audit log for admin rejection
      const updatedRequest = get().relocationRequests.find(r => r.id === id);
      if (updatedRequest) {
        auditLog({
          action: 'UPDATE',
          module: 'Relocation Request',
          record_id: id,
          old_value: { status: 'Pending Admin Approval' },
          new_value: {
            status: 'Rejected by Admin',
            admin_reviewed_by: currentUser?.id,
            admin_comments: comments
          }
        });
      }
    } catch (error) {
      console.error('Admin rejection failed:', error);
      throw error;
    }
  },

  // Complete relocation
  completeRelocation: (id, notes) => {
    const now = new Date().toISOString();
    set((s) => ({
      relocationRequests: s.relocationRequests.map((r) =>
        r.id === id ?
          {
            ...r,
            status: 'Completed',
            completed_at: now,
            completion_notes: notes || '',
            updated_at: now
          } : r
      )
    }));
  },
}));