/**
 * Dashboard store — fetches all metrics directly from Supabase.
 * No mock data. All numbers are real.
 */
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalComponents: number;    // unique component records
  totalQuantity: number;      // sum of all quantities
  componentTypes: number;     // active component type count
  totalRegions: number;       // all regions
  activeRegions: number;      // active regions
  totalWarehouses: number;    // all warehouses
  activeWarehouses: number;   // active warehouses
  totalCustomers: number;     // all customers
  activeUsers: number;        // active user accounts
  totalAssetValue: number;    // sum(purchase_price * quantity)
  brokenComponents: number;
  lowStockCount: number;
}

export interface ActivityEntry {
  id: string;
  user_id: string | null;
  user_name: string;
  action: string;
  module: string;
  record_id: string | null;
  timestamp: string;
}

export interface LowStockItem {
  id: string;
  item_name: string;
  quantity: number;
  minimum_stock: number;
  type_name: string;
  region_name: string;
}

export interface ChartPoint   { name: string; value: number }
export interface RegionPoint  { region: string; count: number; quantity: number }

interface DashboardState {
  metrics: DashboardMetrics;
  recentActivity: ActivityEntry[];
  lowStockItems: LowStockItem[];
  componentsByType: ChartPoint[];
  componentsByRegion: RegionPoint[];
  componentsByStatus: ChartPoint[];
  isLoading: boolean;
  lastUpdated: Date | null;

  fetchDashboard: (opts?: { role?: string; regionId?: string | null }) => Promise<void>;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const EMPTY_METRICS: DashboardMetrics = {
  totalComponents: 0, totalQuantity: 0, componentTypes: 0,
  totalRegions: 0,    activeRegions: 0,
  totalWarehouses: 0, activeWarehouses: 0,
  totalCustomers: 0,  activeUsers: 0,
  totalAssetValue: 0, brokenComponents: 0, lowStockCount: 0,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useDashboardStore = create<DashboardState>((set) => ({
  metrics:            EMPTY_METRICS,
  recentActivity:     [],
  lowStockItems:      [],
  componentsByType:   [],
  componentsByRegion: [],
  componentsByStatus: [],
  isLoading:          false,
  lastUpdated:        null,

  fetchDashboard: async ({ role = 'Engineer', regionId = null } = {}) => {
    set({ isLoading: true });
    try {
      // ── 1. Parallel queries ────────────────────────────────────────────────
      let compQuery = supabase
        .from('components')
        .select(
          'id, item_name, component_type_id, region_id, quantity, minimum_stock, status, purchase_price'
        )
        .eq('is_deleted', false);

      // Non-admins only see their own region
      if (role !== 'Admin' && regionId) {
        compQuery = compQuery.eq('region_id', regionId);
      }

      const [
        { data: compsRaw,      error: compErr },
        { data: typesRaw },
        { data: regionsRaw },
        { data: warehousesRaw },
        { count: userCount },
        { count: customerCount },
        { data: logsRaw },
      ] = await Promise.all([
        compQuery,
        supabase.from('component_types').select('id, type_name').eq('is_active', true),
        supabase.from('regions').select('id, name, status'),
        supabase.from('warehouses').select('id, status'),
        supabase.from('user_profiles').select('user_id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase
          .from('audit_logs')
          .select('id, user_id, action, module, record_id, timestamp')
          .order('timestamp', { ascending: false })
          .limit(12),
      ]);

      if (compErr) throw compErr;

      const comps      = compsRaw      ?? [];
      const types      = typesRaw      ?? [];
      const regions    = regionsRaw    ?? [];
      const warehouses = warehousesRaw ?? [];
      const logs       = logsRaw       ?? [];

      // ── 2. Resolve user names for audit log ────────────────────────────────
      const userIds = [...new Set(logs.map((l: any) => l.user_id).filter(Boolean))];
      const nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, name')
          .in('user_id', userIds);
        (profiles ?? []).forEach((p: any) => { nameMap[p.user_id] = p.name; });
      }

      // ── 3. Metrics ─────────────────────────────────────────────────────────
      const totalComponents  = comps.length;
      const totalQuantity    = comps.reduce((s: number, c: any) => s + (c.quantity ?? 0), 0);
      const totalAssetValue  = comps.reduce((s: number, c: any) =>
        s + ((c.purchase_price ?? 0) * (c.quantity ?? 0)), 0);
      const brokenComponents = comps.filter((c: any) => c.status === 'Broken').length;
      const lowStock         = comps.filter((c: any) =>
        (c.minimum_stock ?? 0) > 0 && c.quantity < c.minimum_stock);

      const activeRegions    = regions.filter((r: any) => r.status === 'active').length;
      const activeWarehouses = warehouses.filter((w: any) => w.status === 'active').length;

      // ── 4. Charts ──────────────────────────────────────────────────────────

      // By type
      const typeAcc: Record<string, { name: string; qty: number }> = {};
      comps.forEach((c: any) => {
        const tid = c.component_type_id;
        if (!tid) {
          typeAcc['__none'] ??= { name: 'Unassigned', qty: 0 };
          typeAcc['__none'].qty += c.quantity ?? 0;
          return;
        }
        typeAcc[tid] ??= { name: types.find((t: any) => t.id === tid)?.type_name ?? 'Unknown', qty: 0 };
        typeAcc[tid].qty += c.quantity ?? 0;
      });
      const componentsByType = Object.values(typeAcc)
        .map((t) => ({ name: t.name, value: t.qty }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      // By region (show all regions, zero-count ones included)
      const regionAcc: Record<string, { name: string; count: number; qty: number }> = {};
      regions.forEach((r: any) => { regionAcc[r.id] = { name: r.name, count: 0, qty: 0 }; });
      comps.forEach((c: any) => {
        if (c.region_id && regionAcc[c.region_id]) {
          regionAcc[c.region_id].count++;
          regionAcc[c.region_id].qty += c.quantity ?? 0;
        }
      });
      const componentsByRegion = Object.values(regionAcc)
        .map((r) => ({ region: r.name, count: r.count, quantity: r.qty }))
        .sort((a, b) => b.quantity - a.quantity);

      // By status
      const statusAcc: Record<string, number> = {};
      comps.forEach((c: any) => {
        const s = c.status ?? 'Unknown';
        statusAcc[s] = (statusAcc[s] ?? 0) + 1;
      });
      const componentsByStatus = Object.entries(statusAcc)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // ── 5. Low stock items (sorted: most critical first) ───────────────────
      const lowStockItems = lowStock
        .sort((a: any, b: any) =>
          (a.quantity / Math.max(a.minimum_stock, 1)) -
          (b.quantity / Math.max(b.minimum_stock, 1))
        )
        .slice(0, 8)
        .map((c: any) => ({
          id: c.id,
          item_name: c.item_name,
          quantity: c.quantity,
          minimum_stock: c.minimum_stock,
          type_name:   types.find((t: any) => t.id === c.component_type_id)?.type_name ?? '—',
          region_name: regions.find((r: any) => r.id === c.region_id)?.name ?? '—',
        }));

      // ── 6. Recent activity ─────────────────────────────────────────────────
      const recentActivity: ActivityEntry[] = logs.map((l: any) => ({
        id:        l.id,
        user_id:   l.user_id,
        user_name: l.user_id ? (nameMap[l.user_id] ?? 'Unknown') : 'System',
        action:    l.action,
        module:    l.module,
        record_id: l.record_id,
        timestamp: l.timestamp,
      }));

      // ── 7. Commit ──────────────────────────────────────────────────────────
      set({
        metrics: {
          totalComponents,
          totalQuantity,
          componentTypes:   types.length,
          totalRegions:     regions.length,
          activeRegions,
          totalWarehouses:  warehouses.length,
          activeWarehouses,
          totalCustomers:   customerCount ?? 0,
          activeUsers:      userCount ?? 0,
          totalAssetValue,
          brokenComponents,
          lowStockCount:    lowStock.length,
        },
        componentsByType,
        componentsByRegion,
        componentsByStatus,
        lowStockItems,
        recentActivity,
        lastUpdated: new Date(),
        isLoading: false,
      });
    } catch (err) {
      console.error('[Dashboard] fetchDashboard error:', err);
      set({ isLoading: false });
    }
  },
}));
