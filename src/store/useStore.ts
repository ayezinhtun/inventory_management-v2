import { create } from 'zustand';
import type {
  User,
  Region,
  Warehouse,
  Rack,
  ComponentType,
  InventoryItem,
  Component,
  ComponentHistory,
  InventoryRequest,
  InstallRequest,
  RelocationRequest,
  Customer,
  Vendor,
  AuditLog,
  Notification,
  ReservedStock,
  MaintenanceTask,
  PurchaseOrder,
  GoodsReceipt,
  RMARecord,
  DisposalRecord,
  StocktakeRecord,
  UserRole
} from
  '../lib/types';
import {
  mockUsers,
  mockRegions,
  mockWarehouses,
  mockRacks,
  mockComponentTypes,
  mockInventory,
  mockComponents,
  mockInventoryRequests,
  mockInstallRequests,
  mockRelocationRequests,
  mockCustomers,
  mockVendors,
  mockAuditLogs,
  mockNotifications,
  mockReservedStock,
  mockMaintenanceTasks,
  mockPurchaseOrders,
  mockGoodsReceipts,
  mockRMARecords,
  mockDisposalRecords,
  mockStocktakeRecords
} from
  '../lib/mock-data';
import { generateId, generateRequestNumber } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { auditLog } from '../lib/auditLog';

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

  // Data
  users: User[];
  regions: Region[];
  warehouses: Warehouse[];
  racks: Rack[];
  componentTypes: ComponentType[];
  inventory: InventoryItem[];
  components: Component[];
  inventoryRequests: InventoryRequest[];
  installRequests: InstallRequest[];
  relocationRequests: RelocationRequest[];
  customers: Customer[];
  vendors: Vendor[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  reservedStock: ReservedStock[];
  maintenanceTasks: MaintenanceTask[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  rmaRecords: RMARecord[];
  disposalRecords: DisposalRecord[];
  stocktakeRecords: StocktakeRecord[];
  componentHistory: ComponentHistory[];

  // CRUD helpers — Inventory
  addInventoryItem: (
    item: Omit<
      InventoryItem,
      'id' | 'created_at' | 'updated_at' | 'is_deleted'>)

    => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;

  // CRUD helpers — Components
  addComponent: (
    item: Omit<Component, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>)
    => void;
  updateComponent: (id: string, updates: Partial<Component>) => void;
  deleteComponent: (id: string) => void;

  // CRUD helpers — Regions
  addRegion: (r: Omit<Region, 'id' | 'created_at' | 'updated_at'>) => void;
  updateRegion: (id: string, updates: Partial<Region>) => void;
  deleteRegion: (id: string) => void;

  // CRUD helpers — Warehouses
  addWarehouse: (w: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>) => void;
  updateWarehouse: (id: string, updates: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;

  // CRUD helpers — Racks
  addRack: (r: Omit<Rack, 'id' | 'created_at' | 'updated_at'>) => void;
  updateRack: (id: string, updates: Partial<Rack>) => void;
  deleteRack: (id: string) => void;

  // CRUD helpers — Component Types
  addComponentType: (
    ct: Omit<ComponentType, 'id' | 'created_at' | 'updated_at'>)
    => void;
  updateComponentType: (id: string, updates: Partial<ComponentType>) => void;
  deleteComponentType: (id: string) => void;

  // CRUD helpers — Users
  addUser: (u: Omit<User, 'id' | 'created_at' | 'updated_at'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;

  // CRUD helpers — Vendors
  addVendor: (v: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>) => void;
  updateVendor: (id: string, updates: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;

  // CRUD helpers — Customers
  addCustomer: (c: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // CRUD helpers — Purchase Orders
  addPurchaseOrder: (
    po: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at'>)
    => void;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void;

  // CRUD helpers — Goods Receipts
  addGoodsReceipt: (
    gr: Omit<GoodsReceipt, 'id' | 'created_at' | 'updated_at'>)
    => void;
  updateGoodsReceipt: (id: string, updates: Partial<GoodsReceipt>) => void;

  // CRUD helpers — RMA
  addRMARecord: (
    rma: Omit<RMARecord, 'id' | 'created_at' | 'updated_at'>)
    => void;
  updateRMARecord: (id: string, updates: Partial<RMARecord>) => void;

  // CRUD helpers — Disposal
  addDisposalRecord: (
    d: Omit<DisposalRecord, 'id' | 'created_at' | 'updated_at'>)
    => void;
  updateDisposalRecord: (id: string, updates: Partial<DisposalRecord>) => void;

  // CRUD helpers — Reserved Stock
  addReservedStock: (
    rs: Omit<ReservedStock, 'id' | 'created_at' | 'updated_at'>)
    => void;
  updateReservedStock: (id: string, updates: Partial<ReservedStock>) => void;
  releaseReservedStock: (id: string) => void;

  // CRUD helpers — Maintenance
  addMaintenanceTask: (
    mt: Omit<MaintenanceTask, 'id' | 'created_at' | 'updated_at'>)
    => void;
  updateMaintenanceTask: (id: string, updates: Partial<MaintenanceTask>) => void;

  // CRUD helpers — Stocktake
  addStocktakeRecord: (
    st: Omit<StocktakeRecord, 'id' | 'created_at' | 'updated_at'>)
    => void;
  updateStocktakeRecord: (id: string, updates: Partial<StocktakeRecord>) => void;

  // Request actions
  createInventoryRequest: (req: Partial<InventoryRequest>) => void;
  updateInventoryRequestStatus: (
    id: string,
    status: string,
    response?: string)
    => void;

  // RElocation Request
  createRelocationRequest: (request: Partial<RelocationRequest>) => Promise<void>;
  updateRelocationRequest: (id: string, updates: Partial<RelocationRequest>) => Promise<void>;

  createInstallRequest: (req: Partial<InstallRequest>) => void;
  approveInstallPM: (id: string, comments: string) => void;
  rejectInstallPM: (id: string, comments: string) => void;
  approveInstallAdmin: (id: string, comments: string) => void;
  rejectInstallAdmin: (id: string, comments: string) => void;
  completeInstall: (id: string, notes: string) => void;

  approveRelocationPM: (id: string, comments: string) => void;
  rejectRelocationPM: (id: string, comments: string) => void;
  approveRelocationAdmin: (id: string, comments: string) => void;
  rejectRelocationAdmin: (id: string, comments: string) => void;
  completeRelocation: (id: string, notes: string) => void;

  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (n: Omit<Notification, 'id' | 'created_at'>) => void;

  // Component History
  addComponentHistory: (entry: Omit<ComponentHistory, 'id' | 'moved_at'>) => void;

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
  getVendorName: (id: string) => string;

  // Data loading
  fetchAppData: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  // Auth
  currentUser: null,
  isAuthenticated: false,
  login: (username, password) => {
    const user = get().users.find(
      (u) =>
        u.username === username && u.password_hash === password && u.is_active
    );
    if (user) {
      set({
        currentUser: user,
        isAuthenticated: true,
        currentPage: 'dashboard'
      });
      return true;
    }
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

  // Data
  users: mockUsers,
  regions: mockRegions,
  warehouses: mockWarehouses,
  racks: mockRacks,
  componentTypes: mockComponentTypes,
  inventory: mockInventory,
  components: mockComponents,
  inventoryRequests: mockInventoryRequests,
  installRequests: mockInstallRequests,
  relocationRequests: mockRelocationRequests,
  customers: mockCustomers,
  vendors: mockVendors,
  auditLogs: mockAuditLogs,
  notifications: mockNotifications,
  reservedStock: mockReservedStock,
  maintenanceTasks: mockMaintenanceTasks,
  purchaseOrders: mockPurchaseOrders,
  goodsReceipts: mockGoodsReceipts,
  rmaRecords: mockRMARecords,
  disposalRecords: mockDisposalRecords,
  stocktakeRecords: mockStocktakeRecords,
  componentHistory: [],

  // CRUD — Inventory
  addInventoryItem: (item) => {
    const now = new Date().toISOString();
    const newItem: InventoryItem = {
      ...item,
      id: generateId(),
      created_at: now,
      updated_at: now,
      is_deleted: false
    } as InventoryItem;
    set((s) => ({ inventory: [...s.inventory, newItem] }));
    get().addAuditLog({
      user_id: get().currentUser?.id || '',
      action: 'CREATE',
      module: 'Inventory',
      record_id: newItem.id,
      old_value: null,
      new_value: { item_name: newItem.item_name },
      ip_address: '127.0.0.1'
    });
  },
  updateInventoryItem: (id, updates) => {
    const now = new Date().toISOString();
    const existing = get().inventory.find((i) => i.id === id);
    set((s) => ({
      inventory: s.inventory.map((i) =>
        i.id === id ?
          {
            ...i,
            ...updates,
            updated_at: now,
            updated_by: get().currentUser?.id || null
          } :
          i
      )
    }));
    auditLog({
      action: 'UPDATE',
      module: 'Hardware Inventory',
      record_id: id,
      old_value: existing ? { item_name: existing.item_name, status: (existing as any).status, quantity: (existing as any).quantity } : null,
      new_value: updates as Record<string, unknown>,
    });
  },
  deleteInventoryItem: (id) => {
    set((s) => ({
      inventory: s.inventory.map((i) =>
        i.id === id ? { ...i, is_deleted: true } : i
      )
    }));
    get().addAuditLog({
      user_id: get().currentUser?.id || '',
      action: 'DELETE',
      module: 'Inventory',
      record_id: id,
      old_value: { id },
      new_value: null,
      ip_address: '127.0.0.1'
    });
  },

  // CRUD — Components
  addComponent: (item) => {
    const now = new Date().toISOString();
    const newComp: Component = {
      ...item,
      id: generateId(),
      created_at: now,
      updated_at: now,
      is_deleted: false
    } as Component;
    set((s) => ({ components: [...s.components, newComp] }));
    get().addAuditLog({
      user_id: get().currentUser?.id || '',
      action: 'CREATE',
      module: 'Component',
      record_id: newComp.id,
      old_value: null,
      new_value: { item_name: newComp.item_name },
      ip_address: '127.0.0.1'
    });
    get().addComponentHistory({
      component_id: newComp.id,
      movement_type: 'CREATED',
      from_region_id: null,
      from_warehouse_id: null,
      from_device_id: null,
      to_region_id: newComp.region_id || null,
      to_warehouse_id: newComp.warehouse_id || null,
      to_device_id: newComp.installed_in_device_id || null,
      moved_by: get().currentUser?.id || '',
      related_request_id: null,
      related_request_type: null,
      notes: 'Component added to inventory',
    });
  },
  updateComponent: (id, updates) => {
    const now = new Date().toISOString();
    set((s) => ({
      components: s.components.map((c) =>
        c.id === id ? { ...c, ...updates, updated_at: now } : c
      )
    }));
  },
  deleteComponent: (id) => {
    set((s) => ({
      components: s.components.map((c) =>
        c.id === id ? { ...c, is_deleted: true } : c
      )
    }));
  },


  // For Relocation
  createRelocationRequest: async (request) => {
    const newRequest: RelocationRequest = {
      id: generateId(),
      request_number: request.request_number || generateRequestNumber('RR'),
      requester_id: request.requester_id || '',
      relocation_type: request.relocation_type || 'INVENTORY',
      inventory_id: request.inventory_id || null,
      component_id: request.component_id || null,
      quantity: request.quantity || 1,
      source_region_id: request.source_region_id || '',
      source_warehouse_id: request.source_warehouse_id || '',
      destination_region_id: request.destination_region_id || '',
      destination_warehouse_id: request.destination_warehouse_id || '',
      destination_server_id: request.destination_server_id || null,
      reason: request.reason || '',
      urgency: request.urgency || 'Medium',
      notes: request.notes || '',
      status: request.status || 'Submitted',
      pm_reviewed_by: null,
      pm_reviewed_at: null,
      pm_comments: '',
      admin_reviewed_by: null,
      admin_reviewed_at: null,
      admin_comments: '',
      assigned_to: null,
      completed_by: null,
      completed_at: null,
      completion_notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    set((s) => ({ relocationRequests: [...s.relocationRequests, newRequest] }));
  },

  updateRelocationRequest: async (id, updates) => {
    set((s) => ({
      relocationRequests: s.relocationRequests.map((req) =>
        req.id === id ? { ...req, ...updates, updated_at: new Date().toISOString() } : req
      ),
    }));
  },

  // CRUD — Regions
  addRegion: (r) => {
    const now = new Date().toISOString();
    set((s) => ({
      regions: [
        ...s.regions,
        { ...r, id: generateId(), created_at: now, updated_at: now } as Region]

    }));
  },
  updateRegion: (id, updates) =>
    set((s) => ({
      regions: s.regions.map((r) =>
        r.id === id ?
          { ...r, ...updates, updated_at: new Date().toISOString() } :
          r
      )
    })),
  deleteRegion: (id) =>
    set((s) => ({ regions: s.regions.filter((r) => r.id !== id) })),

  // CRUD — Warehouses
  addWarehouse: (w) => {
    const now = new Date().toISOString();
    set((s) => ({
      warehouses: [
        ...s.warehouses,
        {
          ...w,
          id: generateId(),
          created_at: now,
          updated_at: now
        } as Warehouse]

    }));
  },
  updateWarehouse: (id, updates) =>
    set((s) => ({
      warehouses: s.warehouses.map((w) =>
        w.id === id ?
          { ...w, ...updates, updated_at: new Date().toISOString() } :
          w
      )
    })),
  deleteWarehouse: (id) =>
    set((s) => ({ warehouses: s.warehouses.filter((w) => w.id !== id) })),

  // CRUD — Racks
  addRack: (r) => {
    const now = new Date().toISOString();
    set((s) => ({
      racks: [
        ...s.racks,
        { ...r, id: generateId(), created_at: now, updated_at: now } as Rack]

    }));
  },
  updateRack: (id, updates) =>
    set((s) => ({
      racks: s.racks.map((r) =>
        r.id === id ?
          { ...r, ...updates, updated_at: new Date().toISOString() } :
          r
      )
    })),
  deleteRack: (id) =>
    set((s) => ({ racks: s.racks.filter((r) => r.id !== id) })),

  // CRUD — Component Types
  addComponentType: (ct) => {
    const now = new Date().toISOString();
    const optimistic: ComponentType = { ...ct, id: generateId(), created_at: now, updated_at: now, fields: ct.fields ?? [] } as ComponentType;
    set((s) => ({ componentTypes: [...s.componentTypes, optimistic] }));
    // Persist to DB
    (async () => {
      const { data, error } = await supabase.from('component_types').insert({
        type_name: ct.type_name,
        category: ct.category,
        description: ct.description,
        requires_specification: ct.requires_specification,
        is_active: ct.is_active,
        fields: ct.fields ?? [],
        created_by: ct.created_by || null,
      }).select().single();
      if (!error && data) {
        // Replace optimistic record with real DB record
        set((s) => ({
          componentTypes: s.componentTypes.map((c) => c.id === optimistic.id ? data as ComponentType : c),
        }));
        auditLog({ action: 'CREATE', module: 'Type Management', record_id: data.id, new_value: { type_name: (data as any).type_name } });
      }
    })().catch(() => { });
  },
  updateComponentType: (id, updates) => {
    const existing = get().componentTypes.find((ct) => ct.id === id);
    set((s) => ({
      componentTypes: s.componentTypes.map((ct) =>
        ct.id === id ? { ...ct, ...updates, updated_at: new Date().toISOString() } : ct
      ),
    }));
    // Persist to DB
    (async () => {
      await supabase.from('component_types').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      auditLog({
        action: 'UPDATE', module: 'Type Management', record_id: id,
        old_value: existing ? { type_name: existing.type_name } : null,
        new_value: updates as Record<string, unknown>,
      });
    })().catch(() => { });
  },
  deleteComponentType: (id) => {
    const existing = get().componentTypes.find((ct) => ct.id === id);
    set((s) => ({ componentTypes: s.componentTypes.filter((ct) => ct.id !== id) }));
    // Persist to DB
    (async () => {
      await supabase.from('component_types').delete().eq('id', id);
      auditLog({ action: 'DELETE', module: 'Type Management', record_id: id, old_value: existing ? { type_name: existing.type_name } : null });
    })().catch(() => { });
  },

  // CRUD — Users
  addUser: (u) => {
    const now = new Date().toISOString();
    set((s) => ({
      users: [
        ...s.users,
        { ...u, id: generateId(), created_at: now, updated_at: now } as User]

    }));
  },
  updateUser: (id, updates) =>
    set((s) => ({
      users: s.users.map((u) =>
        u.id === id ?
          { ...u, ...updates, updated_at: new Date().toISOString() } :
          u
      )
    })),

  // CRUD — Vendors
  addVendor: (v) => {
    const now = new Date().toISOString();
    const newVendor = {
      ...v,
      id: generateId(),
      created_at: now,
      updated_at: now
    } as Vendor;
    set((s) => ({ vendors: [...s.vendors, newVendor] }));
    get().addAuditLog({
      user_id: get().currentUser?.id || '',
      action: 'CREATE',
      module: 'Vendor',
      record_id: newVendor.id,
      old_value: null,
      new_value: { vendor_name: newVendor.vendor_name },
      ip_address: '127.0.0.1'
    });
  },
  updateVendor: (id, updates) => {
    set((s) => ({
      vendors: s.vendors.map((v) =>
        v.id === id ?
          { ...v, ...updates, updated_at: new Date().toISOString() } :
          v
      )
    }));
  },
  deleteVendor: (id) => {
    set((s) => ({ vendors: s.vendors.filter((v) => v.id !== id) }));
  },

  // CRUD — Customers
  addCustomer: (c) => {
    const now = new Date().toISOString();
    const newCust = {
      ...c,
      id: generateId(),
      created_at: now,
      updated_at: now
    } as Customer;
    set((s) => ({ customers: [...s.customers, newCust] }));
    get().addAuditLog({
      user_id: get().currentUser?.id || '',
      action: 'CREATE',
      module: 'Customer',
      record_id: newCust.id,
      old_value: null,
      new_value: { customer_name: newCust.customer_name },
      ip_address: '127.0.0.1'
    });
  },
  updateCustomer: (id, updates) => {
    set((s) => ({
      customers: s.customers.map((c) =>
        c.id === id ?
          { ...c, ...updates, updated_at: new Date().toISOString() } :
          c
      )
    }));
  },
  deleteCustomer: (id) => {
    set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }));
  },

  // CRUD — Purchase Orders
  addPurchaseOrder: (po) => {
    const now = new Date().toISOString();
    const newPO = {
      ...po,
      id: generateId(),
      created_at: now,
      updated_at: now
    } as PurchaseOrder;
    set((s) => ({ purchaseOrders: [...s.purchaseOrders, newPO] }));
    get().addAuditLog({
      user_id: get().currentUser?.id || '',
      action: 'CREATE',
      module: 'PurchaseOrder',
      record_id: newPO.id,
      old_value: null,
      new_value: { po_number: newPO.po_number },
      ip_address: '127.0.0.1'
    });
  },
  updatePurchaseOrder: (id, updates) => {
    set((s) => ({
      purchaseOrders: s.purchaseOrders.map((po) =>
        po.id === id ?
          { ...po, ...updates, updated_at: new Date().toISOString() } :
          po
      )
    }));
  },

  // CRUD — Goods Receipts
  addGoodsReceipt: (gr) => {
    const now = new Date().toISOString();
    const newGR = {
      ...gr,
      id: generateId(),
      created_at: now,
      updated_at: now
    } as GoodsReceipt;
    set((s) => ({ goodsReceipts: [...s.goodsReceipts, newGR] }));
  },
  updateGoodsReceipt: (id, updates) => {
    set((s) => ({
      goodsReceipts: s.goodsReceipts.map((gr) =>
        gr.id === id ?
          { ...gr, ...updates, updated_at: new Date().toISOString() } :
          gr
      )
    }));
  },

  // CRUD — RMA
  addRMARecord: (rma) => {
    const now = new Date().toISOString();
    const newRMA = {
      ...rma,
      id: generateId(),
      created_at: now,
      updated_at: now
    } as RMARecord;
    set((s) => ({ rmaRecords: [...s.rmaRecords, newRMA] }));
    get().addAuditLog({
      user_id: get().currentUser?.id || '',
      action: 'CREATE',
      module: 'RMA',
      record_id: newRMA.id,
      old_value: null,
      new_value: { rma_number: newRMA.rma_number },
      ip_address: '127.0.0.1'
    });
  },
  updateRMARecord: (id, updates) => {
    set((s) => ({
      rmaRecords: s.rmaRecords.map((r) =>
        r.id === id ?
          { ...r, ...updates, updated_at: new Date().toISOString() } :
          r
      )
    }));
  },

  // CRUD — Disposal
  addDisposalRecord: (disp) => {
    const now = new Date().toISOString();
    const newDisp = {
      ...disp,
      id: generateId(),
      created_at: now,
      updated_at: now
    } as DisposalRecord;
    set((s) => ({ disposalRecords: [...s.disposalRecords, newDisp] }));
    get().addAuditLog({
      user_id: get().currentUser?.id || '',
      action: 'CREATE',
      module: 'Disposal',
      record_id: newDisp.id,
      old_value: null,
      new_value: { disposal_number: newDisp.disposal_number },
      ip_address: '127.0.0.1'
    });
  },
  updateDisposalRecord: (id, updates) => {
    set((s) => ({
      disposalRecords: s.disposalRecords.map((d) =>
        d.id === id ?
          { ...d, ...updates, updated_at: new Date().toISOString() } :
          d
      )
    }));
  },

  // CRUD — Reserved Stock
  addReservedStock: (rs) => {
    const now = new Date().toISOString();
    const newRS = {
      ...rs,
      id: generateId(),
      created_at: now,
      updated_at: now
    } as ReservedStock;
    set((s) => ({ reservedStock: [...s.reservedStock, newRS] }));
  },
  updateReservedStock: (id, updates) => {
    set((s) => ({
      reservedStock: s.reservedStock.map((rs) =>
        rs.id === id ?
          { ...rs, ...updates, updated_at: new Date().toISOString() } :
          rs
      )
    }));
  },
  releaseReservedStock: (id) => {
    set((s) => ({
      reservedStock: s.reservedStock.map((rs) =>
        rs.id === id ?
          { ...rs, status: 'Released', updated_at: new Date().toISOString() } :
          rs
      )
    }));
  },

  // CRUD — Maintenance
  addMaintenanceTask: (mt) => {
    const now = new Date().toISOString();
    const newMT = {
      ...mt,
      id: generateId(),
      created_at: now,
      updated_at: now
    } as MaintenanceTask;
    set((s) => ({ maintenanceTasks: [...s.maintenanceTasks, newMT] }));
  },
  updateMaintenanceTask: (id, updates) => {
    set((s) => ({
      maintenanceTasks: s.maintenanceTasks.map((mt) =>
        mt.id === id ?
          { ...mt, ...updates, updated_at: new Date().toISOString() } :
          mt
      )
    }));
  },

  // CRUD — Stocktake
  addStocktakeRecord: (st) => {
    const now = new Date().toISOString();
    const newST = {
      ...st,
      id: generateId(),
      created_at: now,
      updated_at: now
    } as StocktakeRecord;
    set((s) => ({ stocktakeRecords: [...s.stocktakeRecords, newST] }));
  },
  updateStocktakeRecord: (id, updates) => {
    set((s) => ({
      stocktakeRecords: s.stocktakeRecords.map((st) =>
        st.id === id ?
          { ...st, ...updates, updated_at: new Date().toISOString() } :
          st
      )
    }));
  },

  // Inventory Requests
  createInventoryRequest: (req) => {
    const now = new Date().toISOString();
    const newReq: InventoryRequest = {
      id: generateId(),
      request_number: generateRequestNumber('IR'),
      requester_id: get().currentUser?.id || '',
      requested_item: '',
      item_type: '',
      manufacturer: '',
      model: '',
      specifications: '',
      quantity: 1,
      estimated_unit_cost: null,
      estimated_total_cost: null,
      purpose: '',
      business_justification: '',
      urgency: 'Medium',
      required_by: null,
      budget_code: '',
      project_name: '',
      preferred_vendor: '',
      status: 'Pending',
      admin_response: '',
      reviewed_by: null,
      reviewed_at: null,
      created_at: now,
      updated_at: now,
      ...req
    } as InventoryRequest;
    set((s) => ({ inventoryRequests: [...s.inventoryRequests, newReq] }));
    // Notify admins
    const requester = get().currentUser;
    const admins = get().users.filter((u) => u.role === 'Admin' && u.is_active);
    admins.forEach((admin) => {
      get().addNotification({
        user_id: admin.id,
        message: `New inventory request ${newReq.request_number} from ${requester?.full_name} requires your review`,
        notification_type: 'inventory',
        related_request_type: 'inventory',
        related_request_id: newReq.id,
        is_read: false
      });
    });
  },
  updateInventoryRequestStatus: (id, status, response) => {
    const req = get().inventoryRequests.find((r) => r.id === id);
    set((s) => ({
      inventoryRequests: s.inventoryRequests.map((r) =>
        r.id === id ?
          {
            ...r,
            status: status as any,
            admin_response: response || r.admin_response,
            reviewed_by: get().currentUser?.id || null,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } :
          r
      )
    }));
    if (req) {
      get().addNotification({
        user_id: req.requester_id,
        message: `Your inventory request ${req.request_number} has been ${status.toLowerCase()}. ${response ? `Response: ${response}` : ''}`,
        notification_type: 'inventory',
        related_request_type: 'inventory',
        related_request_id: id,
        is_read: false
      });
    }
  },

  // Install Requests
  createInstallRequest: (req) => {
    const now = new Date().toISOString();
    const newReq: InstallRequest = {
      id: generateId(),
      request_number: generateRequestNumber('ISR'),
      requester_id: get().currentUser?.id || '',
      component_id: '',
      source_warehouse_id: '',
      destination_warehouse_id: '',
      destination_server_id: '',
      quantity: 1,
      purpose: '',
      urgency: 'Medium',
      notes: '',
      status: 'Pending PM Approval',
      pm_reviewed_by: null,
      pm_reviewed_at: null,
      pm_comments: '',
      admin_reviewed_by: null,
      admin_reviewed_at: null,
      admin_comments: '',
      assigned_to: get().currentUser?.id || null,
      completed_by: null,
      completed_at: null,
      completion_notes: '',
      created_at: now,
      updated_at: now,
      ...req
    } as InstallRequest;
    set((s) => ({ installRequests: [...s.installRequests, newReq] }));
    // Notify PM
    const requester = get().currentUser;
    const pms = get().users.filter(
      (u) =>
        u.role === 'PM' &&
        u.assigned_region_id === requester?.assigned_region_id
    );
    pms.forEach((pm) => {
      get().addNotification({
        user_id: pm.id,
        message: `New install request ${newReq.request_number} from ${requester?.full_name} requires your approval`,
        notification_type: 'install',
        related_request_type: 'install',
        related_request_id: newReq.id,
        is_read: false
      });
    });
  },
  approveInstallPM: (id, comments) => {
    const now = new Date().toISOString();
    set((s) => ({
      installRequests: s.installRequests.map((r) =>
        r.id === id ?
          {
            ...r,
            status: 'Pending Admin Approval' as any,
            pm_reviewed_by: get().currentUser?.id || null,
            pm_reviewed_at: now,
            pm_comments: comments,
            updated_at: now
          } :
          r
      )
    }));
    const req = get().installRequests.find((r) => r.id === id);
    if (req) {
      // Notify all admins
      const admins = get().users.filter(
        (u) => u.role === 'Admin' && u.is_active
      );
      admins.forEach((admin) => {
        get().addNotification({
          user_id: admin.id,
          message: `Install request ${req.request_number} approved by PM, awaiting your approval`,
          notification_type: 'install',
          related_request_type: 'install',
          related_request_id: id,
          is_read: false
        });
      });
    }
  },
  rejectInstallPM: (id, comments) => {
    const now = new Date().toISOString();
    const req = get().installRequests.find((r) => r.id === id);
    set((s) => ({
      installRequests: s.installRequests.map((r) =>
        r.id === id ?
          {
            ...r,
            status: 'Rejected by PM' as any,
            pm_reviewed_by: get().currentUser?.id || null,
            pm_reviewed_at: now,
            pm_comments: comments,
            updated_at: now
          } :
          r
      )
    }));
    if (req) {
      get().addNotification({
        user_id: req.requester_id,
        message: `Your install request ${req.request_number} has been rejected by PM. Reason: ${comments || 'No comments'}`,
        notification_type: 'install',
        related_request_type: 'install',
        related_request_id: id,
        is_read: false
      });
    }
  },
  approveInstallAdmin: (id, comments) => {
    const now = new Date().toISOString();
    set((s) => ({
      installRequests: s.installRequests.map((r) =>
        r.id === id ?
          {
            ...r,
            status: 'Approved' as any,
            admin_reviewed_by: get().currentUser?.id || null,
            admin_reviewed_at: now,
            admin_comments: comments,
            updated_at: now
          } :
          r
      )
    }));
    const req = get().installRequests.find((r) => r.id === id);
    if (req) {
      get().addNotification({
        user_id: req.requester_id,
        message: `Your install request ${req.request_number} has been approved. Please proceed with physical installation.`,
        notification_type: 'install',
        related_request_type: 'install',
        related_request_id: id,
        is_read: false
      });
    }
  },
  rejectInstallAdmin: (id, comments) => {
    const now = new Date().toISOString();
    const req = get().installRequests.find((r) => r.id === id);
    set((s) => ({
      installRequests: s.installRequests.map((r) =>
        r.id === id ?
          {
            ...r,
            status: 'Rejected by Admin' as any,
            admin_reviewed_by: get().currentUser?.id || null,
            admin_reviewed_at: now,
            admin_comments: comments,
            updated_at: now
          } :
          r
      )
    }));
    if (req) {
      get().addNotification({
        user_id: req.requester_id,
        message: `Your install request ${req.request_number} has been rejected by Admin. Reason: ${comments || 'No comments'}`,
        notification_type: 'install',
        related_request_type: 'install',
        related_request_id: id,
        is_read: false
      });
    }
  },
  completeInstall: (id, notes) => {
    const now = new Date().toISOString();
    const req = get().installRequests.find((r) => r.id === id);
    if (req) {
      // Update request status
      set((s) => ({
        installRequests: s.installRequests.map((r) =>
          r.id === id ?
            {
              ...r,
              status: 'Completed' as any,
              completed_by: get().currentUser?.id || null,
              completed_at: now,
              completion_notes: notes,
              updated_at: now
            } :
            r
        )
      }));
      // Auto-update: move component to destination server
      const comp = get().components.find((c) => c.id === req.component_id);
      if (comp) {
        get().updateComponent(comp.id, {
          installed_in_device_id: req.destination_server_id,
          warehouse_id: req.destination_warehouse_id,
          quantity: Math.max(0, comp.quantity - req.quantity)
        });
        get().addComponentHistory({
          component_id: comp.id,
          movement_type: 'INSTALLED',
          from_region_id: comp.region_id || null,
          from_warehouse_id: comp.warehouse_id || null,
          from_device_id: comp.installed_in_device_id || null,
          to_region_id: null,
          to_warehouse_id: req.destination_warehouse_id || null,
          to_device_id: req.destination_server_id || null,
          moved_by: get().currentUser?.id || '',
          related_request_id: id,
          related_request_type: 'install',
          notes: notes || '',
        });
      }
      // Notify admins and requester
      const admins = get().users.filter(
        (u) => u.role === 'Admin' && u.is_active
      );
      admins.forEach((admin) => {
        get().addNotification({
          user_id: admin.id,
          message: `Install request ${req.request_number} has been completed`,
          notification_type: 'install',
          related_request_type: 'install',
          related_request_id: id,
          is_read: false
        });
      });
      if (req.requester_id !== get().currentUser?.id) {
        get().addNotification({
          user_id: req.requester_id,
          message: `Your install request ${req.request_number} has been completed`,
          notification_type: 'install',
          related_request_type: 'install',
          related_request_id: id,
          is_read: false
        });
      }
    }
  },

  // Relocation Requests
  createRelocationRequest: (req) => {
    const now = new Date().toISOString();
    const newReq: RelocationRequest = {
      id: generateId(),
      request_number: generateRequestNumber('RR'),
      requester_id: get().currentUser?.id || '',
      relocation_type: 'INVENTORY',
      inventory_id: null,
      component_id: null,
      quantity: 1,
      source_region_id: '',
      source_warehouse_id: '',
      destination_region_id: '',
      destination_warehouse_id: '',
      destination_server_id: null,
      reason: '',
      urgency: 'Medium',
      notes: '',
      status: 'Pending PM Approval',
      pm_reviewed_by: null,
      pm_reviewed_at: null,
      pm_comments: '',
      admin_reviewed_by: null,
      admin_reviewed_at: null,
      admin_comments: '',
      assigned_to: get().currentUser?.id || null,
      completed_by: null,
      completed_at: null,
      completion_notes: '',
      created_at: now,
      updated_at: now,
      ...req
    } as RelocationRequest;
    set((s) => ({ relocationRequests: [...s.relocationRequests, newReq] }));
    // Notify PM
    const requester = get().currentUser;
    const pms = get().users.filter(
      (u) =>
        u.role === 'PM' &&
        u.assigned_region_id === requester?.assigned_region_id
    );
    pms.forEach((pm) => {
      get().addNotification({
        user_id: pm.id,
        message: `New relocation request ${newReq.request_number} from ${requester?.full_name} requires your approval`,
        notification_type: 'relocation',
        related_request_type: 'relocation',
        related_request_id: newReq.id,
        is_read: false
      });
    });
  },
  rejectRelocationPM: (id, comments) => {
    const now = new Date().toISOString();
    const req = get().relocationRequests.find((r) => r.id === id);
    set((s) => ({
      relocationRequests: s.relocationRequests.map((r) =>
        r.id === id ?
          {
            ...r,
            status: 'Rejected by PM' as any,
            pm_reviewed_by: get().currentUser?.id || null,
            pm_reviewed_at: now,
            pm_comments: comments,
            updated_at: now
          } :
          r
      )
    }));
    if (req) {
      get().addNotification({
        user_id: req.requester_id,
        message: `Your relocation request ${req.request_number} has been rejected by PM. Reason: ${comments || 'No comments'}`,
        notification_type: 'relocation',
        related_request_type: 'relocation',
        related_request_id: id,
        is_read: false
      });
    }
  },
  approveRelocationPM: (id, comments) => {
    const now = new Date().toISOString();
    set((s) => ({
      relocationRequests: s.relocationRequests.map((r) =>
        r.id === id ?
          {
            ...r,
            status: 'Pending Admin Approval' as any,
            pm_reviewed_by: get().currentUser?.id || null,
            pm_reviewed_at: now,
            pm_comments: comments,
            updated_at: now
          } :
          r
      )
    }));
    const req = get().relocationRequests.find((r) => r.id === id);
    if (req) {
      const admins = get().users.filter(
        (u) => u.role === 'Admin' && u.is_active
      );
      admins.forEach((admin) => {
        get().addNotification({
          user_id: admin.id,
          message: `Relocation request ${req.request_number} approved by PM, awaiting your approval`,
          notification_type: 'relocation',
          related_request_type: 'relocation',
          related_request_id: id,
          is_read: false
        });
      });
    }
  },
  approveRelocationAdmin: (id, comments) => {
    const now = new Date().toISOString();
    set((s) => ({
      relocationRequests: s.relocationRequests.map((r) =>
        r.id === id ?
          {
            ...r,
            status: 'Approved' as any,
            admin_reviewed_by: get().currentUser?.id || null,
            admin_reviewed_at: now,
            admin_comments: comments,
            updated_at: now
          } :
          r
      )
    }));
    const req = get().relocationRequests.find((r) => r.id === id);
    if (req) {
      get().addNotification({
        user_id: req.requester_id,
        message: `Your relocation request ${req.request_number} has been approved. Please proceed with physical relocation.`,
        notification_type: 'relocation',
        related_request_type: 'relocation',
        related_request_id: id,
        is_read: false
      });
    }
  },
  rejectRelocationAdmin: (id, comments) => {
    const now = new Date().toISOString();
    const req = get().relocationRequests.find((r) => r.id === id);
    set((s) => ({
      relocationRequests: s.relocationRequests.map((r) =>
        r.id === id ?
          {
            ...r,
            status: 'Rejected by Admin' as any,
            admin_reviewed_by: get().currentUser?.id || null,
            admin_reviewed_at: now,
            admin_comments: comments,
            updated_at: now
          } :
          r
      )
    }));
    if (req) {
      get().addNotification({
        user_id: req.requester_id,
        message: `Your relocation request ${req.request_number} has been rejected by Admin. Reason: ${comments || 'No comments'}`,
        notification_type: 'relocation',
        related_request_type: 'relocation',
        related_request_id: id,
        is_read: false
      });
    }
  },
  completeRelocation: (id, notes) => {
    const now = new Date().toISOString();
    const req = get().relocationRequests.find((r) => r.id === id);
    if (req) {
      set((s) => ({
        relocationRequests: s.relocationRequests.map((r) =>
          r.id === id ?
            {
              ...r,
              status: 'Completed' as any,
              completed_by: get().currentUser?.id || null,
              completed_at: now,
              completion_notes: notes,
              updated_at: now
            } :
            r
        )
      }));
      // Auto-update location
      if (req.relocation_type === 'INVENTORY' && req.inventory_id) {
        get().updateInventoryItem(req.inventory_id, {
          region_id: req.destination_region_id,
          warehouse_id: req.destination_warehouse_id
        });
      } else if (req.relocation_type === 'COMPONENT' && req.component_id) {
        const comp = get().components.find((c) => c.id === req.component_id);
        if (req.destination_server_id) {
          get().updateComponent(req.component_id, {
            installed_in_device_id: req.destination_server_id
          });
          if (comp) {
            get().addComponentHistory({
              component_id: comp.id,
              movement_type: 'INSTALLED',
              from_region_id: comp.region_id || null,
              from_warehouse_id: comp.warehouse_id || null,
              from_device_id: comp.installed_in_device_id || null,
              to_region_id: req.destination_region_id || null,
              to_warehouse_id: req.destination_warehouse_id || null,
              to_device_id: req.destination_server_id,
              moved_by: get().currentUser?.id || '',
              related_request_id: id,
              related_request_type: 'relocation',
              notes: notes || '',
            });
          }
        } else {
          get().updateComponent(req.component_id, {
            installed_in_device_id: null,
            region_id: req.destination_region_id,
            warehouse_id: req.destination_warehouse_id
          });
          if (comp) {
            get().addComponentHistory({
              component_id: comp.id,
              movement_type: 'RELOCATED',
              from_region_id: comp.region_id || null,
              from_warehouse_id: comp.warehouse_id || null,
              from_device_id: comp.installed_in_device_id || null,
              to_region_id: req.destination_region_id || null,
              to_warehouse_id: req.destination_warehouse_id || null,
              to_device_id: null,
              moved_by: get().currentUser?.id || '',
              related_request_id: id,
              related_request_type: 'relocation',
              notes: notes || '',
            });
          }
        }
      }
      // Notify admins and requester
      const admins = get().users.filter(
        (u) => u.role === 'Admin' && u.is_active
      );
      admins.forEach((admin) => {
        get().addNotification({
          user_id: admin.id,
          message: `Relocation request ${req.request_number} has been completed`,
          notification_type: 'relocation',
          related_request_type: 'relocation',
          related_request_id: id,
          is_read: false
        });
      });
      if (req.requester_id !== get().currentUser?.id) {
        get().addNotification({
          user_id: req.requester_id,
          message: `Your relocation request ${req.request_number} has been completed`,
          notification_type: 'relocation',
          related_request_type: 'relocation',
          related_request_id: id,
          is_read: false
        });
      }
    }
  },

  // Notifications
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      )
    })),
  markAllNotificationsRead: () => {
    const userId = get().currentUser?.id;
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.user_id === userId ? { ...n, is_read: true } : n
      )
    }));
  },
  addNotification: (n) => {
    set((s) => ({
      notifications: [
        ...s.notifications,
        { ...n, id: generateId(), created_at: new Date().toISOString() }]

    }));
  },

  // Component History
  addComponentHistory: (entry) => {
    set((s) => ({
      componentHistory: [
        { ...entry, id: generateId(), moved_at: new Date().toISOString() },
        ...s.componentHistory,
      ],
    }));
  },

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
  getUserName: (id) => get().users.find((u) => u.id === id)?.full_name || '—',
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
  getVendorName: (id) =>
    get().vendors.find((v) => v.id === id)?.vendor_name || '—',

  // ── Load shared reference data from Supabase ──────────────────────────────
  fetchAppData: async () => {
    set({ isAppDataLoading: true });
    try {
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

      // Components
      const { useComponentsStore } = await import('./useComponentsStore');
      await useComponentsStore.getState().fetchComponents();

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