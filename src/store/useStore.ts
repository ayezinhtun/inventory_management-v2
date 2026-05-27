import { create } from 'zustand';
import type {
  User,
  Region,
  Warehouse,
  Rack,
  ComponentType,
  UserRole,
  AuditLog,
  Notification
} from '../lib/types';


import { generateId, generateRequestNumber } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { auditLog } from '../lib/auditLog';
import { useUsersStore } from './useUsersStore';
import { useReservationsStore } from './useReservationStore';

// ---- Navigation / Page State ----
export type Page =
  'login' |
  'signup' |
  'dashboard' |
  'inventory' |
  'inventory-add' |
  'inventory-detail' |
  'components' |
  'components-add' |
  'component-detail' |
  'type-management' |
  'regions' |
  'warehouses' |
  'racks' |
  'inventory-requests' |
  'inventory-request-detail' |
  'install-requests' |
  'install-request-detail' |
  'install-pm' |
  'install-admin' |
  'physical-install' |
  'relocation-requests' |
  'relocation-request-detail' |
  'relocation-pm' |
  'relocation-admin' |
  'relocation-engineer' |
  'physical-relocation' |
  'admin-relocation' |
  'reserved-stock' |
  'customer-inventory' |
  'customers' |
  'vendors' |
  'purchase-orders' |
  'goods-receipt' |
  'rma' |
  'disposal' |
  'stocktake' |
  'maintenance' |
  'users' |
  'audit-log' |
  'notifications-page' |
  'mail' |
  'reports' |
  'settings' |
  'forgot-password' |
  'verify-code' |
  'reset-password' |
  'password-reset-success';

interface AppState {
  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  isAppDataLoading: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;


  // Navigation
  currentPage: Page;
  selectedId: string | null;
  navigate: (page: Page, id?: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Search
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;

  // Data - Only keep essential reference data in main store
  users: User[];
  regions: Region[];
  warehouses: Warehouse[];
  racks: Rack[];
  componentTypes: ComponentType[];
  auditLogs: AuditLog[];
  notifications: Notification[];

  // CRUD helpers - Only keep reference data CRUD
  // Inventory, Components, and other data handled by separate stores

  // CRUD helpers - Handled by separate stores
  // Regions: useRegionStore
  // Warehouses: useWarehouseStore
  // Users: useUsersStore
  // Components: useComponentsStore
  // Hardware Inventory: useHardwareInventoryStore
  // Notifications: useNotificationsStore

  // CRUD helpers — Component Types
  addComponentType: (type: Omit<ComponentType, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateComponentType: (id: string, updates: Partial<ComponentType>) => Promise<void>;
  deleteComponentType: (id: string) => Promise<void>;

  // CRUD helpers - Only keep reference data CRUD
  // Other data handled by separate stores

  // Request actions - Handled by separate stores

  // Notifications - Handled by useNotificationsStore

  // Component History - Handled by separate store

  // Audit
  addAuditLog: (entry: Omit<AuditLog, 'id' | 'timestamp'>) => void;

  // Helpers
  getRegionName: (id: string) => string;
  getWarehouseName: (id: string) => string;
  getRackName: (id: string) => string;
  getUserName: (id: string) => string;
  getComponentTypeName: (id: string) => string;
  getWarehousesByRegion: (regionId: string) => Warehouse[];
  getRacksByWarehouse: (warehouseId: string) => Rack[];
  getUnreadNotificationCount: () => number;
  // getVendorName - Handled by separate store

  // Data loading
  fetchAppData: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  // Auth
  currentUser: null,
  isAuthenticated: false,
  login: () => {
    // Login is handled by useAuthStore
    return false;
  },
  logout: () =>
    set({
      currentUser: null,
      isAuthenticated: false,
      currentPage: 'login',
      selectedId: null
    }),

  isAppDataLoading: false,

  // Navigation
  currentPage: 'login',
  selectedId: null,
  navigate: (page, id = null) => {
    // Persist page and selectedId so a browser refresh restores the same view
    try {
      sessionStorage.setItem('ims-current-page', page);
      if (id) sessionStorage.setItem('ims-selected-id', id);
      else sessionStorage.removeItem('ims-selected-id');
    } catch { }
    set({ currentPage: page, selectedId: id });
  },
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Search
  globalSearch: '',
  setGlobalSearch: (q) => set({ globalSearch: q }),
  commandOpen: false,
  setCommandOpen: (open) => set({ commandOpen: open }),

  // Data - Use empty arrays, will be populated by fetchAppData
  users: [],
  regions: [],
  warehouses: [],
  racks: [],
  componentTypes: [],
  auditLogs: [],
  notifications: [],

  // CRUD — Inventory - Handled by useHardwareInventoryStore
  // CRUD — Components - Handled by useComponentsStore


  // CRUD — Regions - Handled by useRegionStore
  // CRUD — Warehouses - Handled by useWarehouseStore
  // CRUD — Racks - Handled by useWarehouseStore (racks are part of warehouse management)

  // CRUD — Component Types
  addComponentType: async (type: Omit<ComponentType, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('component_types')
      .insert({
        ...type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    
    set((s) => ({ componentTypes: [...s.componentTypes, data as ComponentType] }));
    
    auditLog({
      action: 'CREATE',
      module: 'Component Types',
      record_id: data.id,
      new_value: { type_name: type.type_name, category: type.category },
    });
  },
  updateComponentType: async (id: string, updates: Partial<ComponentType>) => {
    const existing = get().componentTypes.find((ct) => ct.id === id);
    
    const { error } = await supabase
      .from('component_types')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
    
    set((s) => ({
      componentTypes: s.componentTypes.map((ct) =>
        ct.id === id ? { ...ct, ...updates, updated_at: new Date().toISOString() } : ct
      ),
    }));
    
    auditLog({
      action: 'UPDATE',
      module: 'Component Types',
      record_id: id,
      old_value: existing ? { type_name: existing.type_name } : null,
      new_value: updates,
    });
  },
  deleteComponentType: async (id: string) => {
    const existing = get().componentTypes.find((ct) => ct.id === id);
    
    const { error } = await supabase
      .from('component_types')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    set((s) => ({ componentTypes: s.componentTypes.filter((ct) => ct.id !== id) }));
    
    auditLog({
      action: 'DELETE',
      module: 'Component Types',
      record_id: id,
      old_value: existing ? { type_name: existing.type_name } : null,
    });
  },

  // CRUD — Users - Handled by useUsersStore

  // CRUD — Vendors - Handled by separate store

  // CRUD — Customers - Handled by separate store

  // CRUD — Purchase Orders - Handled by separate store
  // CRUD — Goods Receipts - Handled by separate store
  // CRUD — RMA - Handled by separate store

  // CRUD — Disposal - Handled by separate store
  // CRUD — Reserved Stock - Handled by separate store
  // CRUD — Maintenance - Handled by separate store
  // CRUD — Stocktake - Handled by separate store

  // Inventory Requests - Handled by separate store
  // Install Requests - Handled by separate store



  // Notifications - Handled by useNotificationsStore

  // Component History - Handled by separate store

  // Audit
  addAuditLog: (entry) => {
    const now = new Date().toISOString();
    const log: AuditLog = { ...entry, id: generateId(), timestamp: now };
    set((s) => ({ auditLogs: [log, ...s.auditLogs] }));
    // Persist to DB (fire-and-forget)
    (async () => {
      await supabase.from('audit_logs').insert({
        user_id: entry.user_id || null,
        action: entry.action,
        module: entry.module,
        record_id: entry.record_id || null,
        old_value: entry.old_value,
        new_value: entry.new_value,
        ip_address: entry.ip_address || '—',
        timestamp: now,
      });
    })().catch(() => { });
  },

  // Helpers
  getRegionName: (id) => get().regions.find((r) => r.id === id)?.name || '—',
  getWarehouseName: (id) =>
    get().warehouses.find((w) => w.id === id)?.name || '—',
  getRackName: (id) => get().racks.find((r) => r.id === id)?.name || '—',
  getUserName: (id) => {
    const users = useUsersStore.getState().users;
    const user = users.find(u => u.id === id || u.user_id === id);
    return user?.name || '—';
  },
  getComponentTypeName: (id) =>
    get().componentTypes.find((ct) => ct.id === id)?.type_name || '—',
  getWarehousesByRegion: (regionId) =>
    get().warehouses.filter((w) => w.region_id === regionId && w.is_active),
  getRacksByWarehouse: (warehouseId) =>
    get().racks.filter((r) => r.warehouse_id === warehouseId && r.is_active),
  getUnreadNotificationCount: () => {
    const userId = get().currentUser?.id;
    return get().notifications.filter((n) => n.user_id === userId && !n.is_read).
      length;
  },

  // getVendorName - Handled by separate store

  // ── Load shared reference data from Supabase ──────────────────────────────
  fetchAppData: async () => {
    set({ isAppDataLoading: true });
    try {
      // Users - Use separate useUsersStore
      const { useUsersStore } = await import('./useUsersStore');
      await useUsersStore.getState().fetchUsers();


      // Regions
      const { data: regionsRaw } = await supabase
        .from('regions')
        .select('*')
        .order('name', { ascending: true });

      if (regionsRaw) {
        const regions: Region[] = regionsRaw.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description ?? null,
          is_active: r.status === 'active',
          created_at: r.created_at,
          updated_at: r.updated_at,
        }));
        set({ regions });
      }

      // Warehouses
      const { data: warehousesRaw } = await supabase
        .from('warehouses')
        .select('*')
        .order('name', { ascending: true });

      if (warehousesRaw) {
        const warehouses: Warehouse[] = warehousesRaw.map((w: any) => ({
          id: w.id,
          name: w.name,
          region_id: w.region_id,
          address: w.address ?? null,
          contact_person: w.contact_person ?? null,
          contact_phone: w.phone ?? null,
          is_active: w.status === 'active',
          created_at: w.created_at,
          updated_at: w.updated_at,
        }));
        set({ warehouses });
      }

      // Component Types
      const { data: typesRaw } = await supabase
        .from('component_types')
        .select('*')
        .order('type_name', { ascending: true });

      if (typesRaw) {
        set({ componentTypes: typesRaw as ComponentType[] });
      }

      // Let separate stores handle their own data
      const { useHardwareInventoryStore } = await import('./useHardwareInventoryStore');
      await useHardwareInventoryStore.getState().fetchHardwareInventory();

      const { useComponentsStore } = await import('./useComponentsStore');

      await useComponentsStore.getState().fetchComponents();

      await useReservationsStore.getState().fetchReservations();

      // Audit Logs (most recent 500)
      const { data: logsRaw } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);

      if (logsRaw) {
        set({ auditLogs: logsRaw as AuditLog[] });
      }
    } catch (err) {
      console.error('[fetchAppData] Error loading reference data:', err);
      throw err;
    } finally {
      set({ isAppDataLoading: false });
    }
  },



}));

