/**
 * Dashboard — redesigned with real Supabase data.
 * Inspired by shadcnblocks dashboard-3 / dashboard-5.
 * Layout: welcome banner → 4 KPI cards → big chart + widgets → table + feed
 */
import React, { useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useDashboardStore } from '../store/useDashboardStore';
import { useStore } from '../store/useStore';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/Table';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  RefreshCw, Cpu, Users, DollarSign, AlertTriangle,
  ArrowUpRight, ArrowDownRight, TrendingUp, PackageX,
  CheckCircle2, Globe, Warehouse, Layers, Clock,
  Activity, BarChart2, Download,
} from 'lucide-react';
import { formatDate } from '../lib/utils';

// ── Palette ───────────────────────────────────────────────────────────────────
const PRIMARY   = '#6366f1';
const SECONDARY = '#a5b4fc';
const PALETTE   = ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#14b8a6','#f97316'];

const STATUS_COLORS: Record<string, string> = {
  Working:     '#22c55e',
  'In Use':    '#6366f1',
  Available:   '#3b82f6',
  Reserved:    '#f59e0b',
  Broken:      '#ef4444',
  Maintenance: '#f97316',
  Retired:     '#8b5cf6',
};

const ACTION_BADGE: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  UPDATE: 'bg-blue-100   text-blue-800   border-blue-200',
  DELETE: 'bg-red-100    text-red-800    border-red-200',
  VIEW:   'bg-gray-100   text-gray-600   border-gray-200',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtCurrency(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function delta(current: number, prev: number) {
  if (prev === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100);
}

function DeltaBadge({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {up
        ? <ArrowUpRight   className="h-3.5 w-3.5" />
        : <ArrowDownRight className="h-3.5 w-3.5" />}
      {Math.abs(pct)}%
    </span>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold mb-1.5 text-foreground">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }} className="flex gap-1.5">
          <span>{p.name}:</span>
          <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ── KPI Card (large top cards matching dashboard-3 style) ─────────────────────
function KpiCard({
  label, value, sub, pct, icon: Icon, wide = false,
}: {
  label: string; value: React.ReactNode; sub?: string;
  pct?: number; icon: React.ElementType; wide?: boolean;
}) {
  return (
    <Card className={`relative overflow-hidden ${wide ? 'sm:col-span-2' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="text-3xl font-extrabold tracking-tight leading-none">{value}</p>
            <div className="flex items-center gap-2 pt-1">
              {pct !== undefined && <DeltaBadge pct={pct} />}
              {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function Skel({ h = 'h-32' }: { h?: string }) {
  return <Card><CardContent className="p-5"><Skeleton className={`${h} w-full rounded`} /></CardContent></Card>;
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { profile } = useAuthStore();
  const { navigate } = useStore();
  const {
    metrics, recentActivity, lowStockItems,
    componentsByType, componentsByRegion, componentsByStatus,
    monthlyTrend, isLoading, lastUpdated, fetchDashboard,
  } = useDashboardStore();

  const role     = profile?.role     ?? 'Engineer';
  const regionId = profile?.region_id ?? null;
  const firstName = (profile?.name ?? 'User').split(' ')[0];
  const isAdmin   = role === 'Admin';

  const refresh = useCallback(() => fetchDashboard({ role, regionId }), [role, regionId, fetchDashboard]);
  useEffect(() => { refresh(); }, [refresh]);

  // Month-over-month deltas
  const compDelta     = delta(metrics.componentsThisMonth, metrics.componentsLastMonth);
  const custDelta     = delta(metrics.customersThisMonth, metrics.customersLastMonth);
  const auditDelta    = delta(metrics.auditThisMonth, metrics.auditLastMonth);
  const totalUnits    = metrics.totalQuantity;
  const hasAlerts     = metrics.brokenComponents + metrics.lowStockCount;

  // Component status total for percentage
  const statusTotal   = componentsByStatus.reduce((s, c) => s + c.value, 0);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1600px] mx-auto">

      {/* ── 1. WELCOME BANNER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Welcome back, <span className="text-primary">{firstName}!</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hasAlerts > 0 ? (
              <>
                Today you have{' '}
                {metrics.lowStockCount > 0 && (
                  <strong className="text-amber-600">{metrics.lowStockCount} low stock item{metrics.lowStockCount !== 1 ? 's' : ''}</strong>
                )}
                {metrics.lowStockCount > 0 && metrics.brokenComponents > 0 && ' and '}
                {metrics.brokenComponents > 0 && (
                  <strong className="text-red-600">{metrics.brokenComponents} broken component{metrics.brokenComponents !== 1 ? 's' : ''}</strong>
                )}
                {' '}to address.
              </>
            ) : (
              'All systems operating normally. No alerts today.'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden md:block flex items-center gap-1">
              <Clock className="inline h-3 w-3 mr-0.5" />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('components')}>
            <BarChart2 className="h-3.5 w-3.5 mr-1.5" />
            Components
          </Button>
          <Button size="sm" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── 2. FOUR KPI CARDS ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skel key={i} h="h-24" />)
        ) : (
          <>
            <KpiCard
              label="Total Asset Value"
              value={fmtCurrency(metrics.totalAssetValue)}
              sub="vs last month"
              pct={compDelta}
              icon={DollarSign}
            />
            <KpiCard
              label="Total Components"
              value={metrics.totalComponents.toLocaleString()}
              pct={compDelta}
              sub={`${metrics.componentsThisMonth} added this month`}
              icon={Cpu}
            />
            <KpiCard
              label="Total Customers"
              value={metrics.totalCustomers.toLocaleString()}
              pct={custDelta}
              sub={`${metrics.customersThisMonth} new this month`}
              icon={Users}
            />
            <KpiCard
              label="Needs Attention"
              value={hasAlerts}
              sub={`${metrics.brokenComponents} broken · ${metrics.lowStockCount} low stock`}
              icon={AlertTriangle}
            />
          </>
        )}
      </div>

      {/* ── 3. MAIN CHART + RIGHT WIDGETS ── */}
      <div className="grid gap-4 xl:grid-cols-3">

        {/* Big area chart — 2/3 */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold">
                  Inventory Additions
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Components added per month — last 6 months
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                  This Year
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 inline-block" />
                  Prev Year
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full rounded-lg" />
            ) : monthlyTrend.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground">
                <Activity className="h-8 w-8 opacity-20" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradThis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"   stopColor={PRIMARY}   stopOpacity={0.25} />
                      <stop offset="95%"  stopColor={PRIMARY}   stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gradPrev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"   stopColor="#94a3b8"  stopOpacity={0.2}  />
                      <stop offset="95%"  stopColor="#94a3b8"  stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="prevValue" name="Prev Year" stroke="#94a3b8" strokeWidth={2} fill="url(#gradPrev)" dot={false} strokeDasharray="4 3" />
                  <Area type="monotone" dataKey="value"     name="This Year" stroke={PRIMARY}  strokeWidth={2.5} fill="url(#gradThis)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Right column widgets — 1/3 */}
        <div className="flex flex-col gap-4">

          {/* Component Status breakdown */}
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Component Status</CardTitle>
              <CardDescription className="text-xs">
                {statusTotal.toLocaleString()} total records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2.5">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
                </div>
              ) : componentsByStatus.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No data yet</p>
              ) : (
                <div className="space-y-2.5">
                  {componentsByStatus.slice(0, 6).map((s) => {
                    const pct = statusTotal > 0 ? Math.round((s.value / statusTotal) * 100) : 0;
                    const color = STATUS_COLORS[s.name] ?? PALETTE[0];
                    return (
                      <div key={s.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: color }} />
                            {s.name}
                          </span>
                          <span className="tabular-nums font-medium">
                            {s.value.toLocaleString()} <span className="text-muted-foreground">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Infrastructure quick stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Infrastructure</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {[
                { label: 'Active Regions',    value: metrics.activeRegions,    total: metrics.totalRegions,    icon: Globe     },
                { label: 'Active Warehouses', value: metrics.activeWarehouses, total: metrics.totalWarehouses, icon: Warehouse },
                { label: 'Component Types',   value: metrics.componentTypes,   total: null,                    icon: Layers    },
                { label: 'Active Users',      value: metrics.activeUsers,      total: null,                    icon: Users     },
              ].map(({ label, value, total, icon: Icon }, i) => (
                <div key={label} className={`flex items-center justify-between px-5 py-2.5 ${i < 3 ? 'border-b' : ''}`}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    {label}
                  </div>
                  <span className="text-sm font-bold tabular-nums">
                    {isLoading ? '—' : value}
                    {total !== null && !isLoading && (
                      <span className="text-muted-foreground font-normal text-xs">/{total}</span>
                    )}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── 4. BOTTOM ROW: Table + Feed ── */}
      <div className="grid gap-4 xl:grid-cols-3">

        {/* Recent Audit Log — 2/3 */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-0 border-b">
            <div className="flex items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">Recent Activity</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {metrics.auditThisMonth} actions this month
                  {metrics.auditLastMonth > 0 && (
                    <> · <DeltaBadge pct={auditDelta} /></>
                  )}
                </CardDescription>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="px-6 py-4 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="flex flex-col items-center py-14 text-muted-foreground gap-2">
                <Activity className="h-10 w-10 opacity-15" />
                <p className="text-sm">No activity recorded yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6 text-xs w-[140px]">User</TableHead>
                    <TableHead className="text-xs w-[80px]">Action</TableHead>
                    <TableHead className="text-xs">Module</TableHead>
                    <TableHead className="text-xs text-right pr-6 whitespace-nowrap">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((log) => (
                    <TableRow key={log.id} className="text-sm">
                      <TableCell className="pl-6 py-2.5 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {log.user_name.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate max-w-[90px] text-xs">{log.user_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className={`text-[10px] font-semibold px-1.5 py-0.5 ${ACTION_BADGE[log.action] ?? ACTION_BADGE.VIEW}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-muted-foreground">{log.module}</TableCell>
                      <TableCell className="py-2.5 text-right pr-6 text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Right: Components by Type + Low Stock — 1/3 */}
        <div className="flex flex-col gap-4">

          {/* Components by Type donut */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">By Component Type</CardTitle>
              <CardDescription className="text-xs">Unit distribution</CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
              {isLoading ? (
                <Skeleton className="h-[180px] w-full rounded" />
              ) : componentsByType.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No type data yet</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={componentsByType} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={64} paddingAngle={2}>
                        {componentsByType.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-1">
                    {componentsByType.slice(0, 5).map((t, i) => {
                      const total = componentsByType.reduce((s, x) => s + x.value, 0);
                      const pct   = total > 0 ? Math.round((t.value / total) * 100) : 0;
                      return (
                        <div key={t.name} className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1.5 truncate max-w-[130px]">
                            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                            {t.name}
                          </span>
                          <span className="tabular-nums text-muted-foreground">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Low stock alerts */}
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Low Stock</CardTitle>
                  <CardDescription className="text-xs">Below minimum threshold</CardDescription>
                </div>
                <PackageX className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : lowStockItems.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-60 mb-1.5" />
                  <p className="text-xs font-medium text-foreground">All stocked up</p>
                  <p className="text-[10px] mt-0.5">No items below minimum</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lowStockItems.slice(0, 5).map((item) => {
                    const pct   = Math.round((item.quantity / Math.max(item.minimum_stock, 1)) * 100);
                    const empty = item.quantity === 0;
                    return (
                      <div key={item.id} className={`rounded-lg border p-2.5 ${empty ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/30'}`}>
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold truncate leading-tight">{item.item_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{item.region_name}</p>
                          </div>
                          <span className={`text-[11px] font-bold flex-shrink-0 tabular-nums ${empty ? 'text-red-600' : 'text-amber-600'}`}>
                            {item.quantity}/{item.minimum_stock}
                          </span>
                        </div>
                        <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${empty ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── 5. REGION PERFORMANCE (admin only) ── */}
      {isAdmin && componentsByRegion.length > 0 && !isLoading && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Region Performance</CardTitle>
            <CardDescription className="text-xs">Unit count and component records per region</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={componentsByRegion} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="region" tickLine={false} axisLine={false} fontSize={11} width={90} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="quantity" name="Units"   fill={PRIMARY}   radius={[0, 4, 4, 0]} maxBarSize={20} />
                <Bar dataKey="count"    name="Records" fill={SECONDARY} radius={[0, 4, 4, 0]} maxBarSize={20} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
