import React, { useEffect, useCallback, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useDashboardStore } from '../store/useDashboardStore';
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
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Cpu, MapPin, Building2, Users, DollarSign, AlertTriangle,
  PackageX, CheckCircle2, RefreshCw, TrendingUp, Boxes,
  Activity, Layers, UserCheck, Globe, ArrowUpRight, Clock,
  Warehouse, ShieldAlert,
} from 'lucide-react';
import { formatDate } from '../lib/utils';

// ── colour palette ────────────────────────────────────────────────────────────
const PALETTE = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
  '#3b82f6', '#8b5cf6', '#14b8a6', '#f97316',
];

const STATUS_COLORS: Record<string, string> = {
  Working:     '#22c55e',
  'In Use':    '#6366f1',
  Available:   '#3b82f6',
  Reserved:    '#f59e0b',
  Broken:      '#ef4444',
  Maintenance: '#f97316',
  Retired:     '#8b5cf6',
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  UPDATE: 'bg-blue-100 text-blue-800 border-blue-200',
  DELETE: 'bg-red-100 text-red-800 border-red-200',
  VIEW:   'bg-gray-100 text-gray-700 border-gray-200',
};
function actionColor(a: string) { return ACTION_COLORS[a] ?? 'bg-gray-100 text-gray-700 border-gray-200'; }

// ── helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

// ── Skeleton blocks ───────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <Card><CardContent className="p-5"><Skeleton className="h-16 w-full rounded" /></CardContent></Card>
  );
}
function ChartSkeleton({ h = 220 }: { h?: number }) {
  return <Skeleton className={`w-full rounded-lg`} style={{ height: h }} />;
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Hero Metric Card (large, distinct) ────────────────────────────────────────
function HeroCard({
  label, value, sub, icon: Icon, color = 'indigo', trend,
}: {
  label: string; value: React.ReactNode; sub?: string;
  icon: React.ElementType; color?: 'indigo' | 'emerald' | 'amber' | 'red' | 'blue' | 'violet';
  trend?: string;
}) {
  const colors = {
    indigo:  { bg: 'bg-indigo-500',  light: 'bg-indigo-50  text-indigo-600',  text: 'text-indigo-600'  },
    emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600' },
    amber:   { bg: 'bg-amber-500',   light: 'bg-amber-50   text-amber-600',   text: 'text-amber-600'   },
    red:     { bg: 'bg-red-500',     light: 'bg-red-50     text-red-600',     text: 'text-red-600'     },
    blue:    { bg: 'bg-blue-500',    light: 'bg-blue-50    text-blue-600',    text: 'text-blue-600'    },
    violet:  { bg: 'bg-violet-500',  light: 'bg-violet-50  text-violet-600',  text: 'text-violet-600'  },
  };
  const c = colors[color];
  return (
    <Card className="relative overflow-hidden border-0 shadow-sm">
      {/* accent stripe */}
      <div className={`absolute inset-y-0 left-0 w-1 ${c.bg}`} />
      <CardContent className="pl-6 pr-5 py-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5 min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-extrabold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            {trend && (
              <div className={`inline-flex items-center gap-1 text-xs font-medium ${c.text}`}>
                <ArrowUpRight className="h-3 w-3" />
                {trend}
              </div>
            )}
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${c.light}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Compact Metric Tile (small, grid use) ─────────────────────────────────────
function MetricTile({
  label, value, icon: Icon, sub, warn = false, muted = false,
}: {
  label: string; value: React.ReactNode; icon: React.ElementType;
  sub?: string; warn?: boolean; muted?: boolean;
}) {
  return (
    <Card className={warn ? 'border-red-200 bg-red-50/40' : muted ? 'border-dashed' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            warn ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground'
          }`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className={`text-xl font-bold leading-none mt-0.5 ${warn ? 'text-red-600' : ''}`}>{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Alert Tile (for broken/low stock callout) ─────────────────────────────────
function AlertTile({
  count, label, sub, color,
}: {
  count: number; label: string; sub: string; color: 'red' | 'amber';
}) {
  const cls = color === 'red'
    ? { border: 'border-red-200', bg: 'bg-red-50', icon: 'text-red-500', num: 'text-red-600' }
    : { border: 'border-amber-200', bg: 'bg-amber-50', icon: 'text-amber-500', num: 'text-amber-600' };
  return (
    <div className={`rounded-xl border ${cls.border} ${cls.bg} p-4 flex items-center gap-3`}>
      <ShieldAlert className={`h-8 w-8 flex-shrink-0 ${cls.icon}`} />
      <div>
        <p className={`text-2xl font-extrabold leading-none ${cls.num}`}>{count}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyChart({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground gap-2">
      <Icon className="h-10 w-10 opacity-15" />
      <p className="text-xs">{text}</p>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { profile } = useAuthStore();
  const {
    metrics, recentActivity, lowStockItems,
    componentsByType, componentsByRegion, componentsByStatus,
    isLoading, lastUpdated, fetchDashboard,
  } = useDashboardStore();

  const role     = profile?.role     ?? 'Engineer';
  const regionId = profile?.region_id ?? null;
  const userName = profile?.name     ?? 'User';
  const isAdmin  = role === 'Admin';

  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');

  const refresh = useCallback(() => {
    fetchDashboard({ role, regionId });
  }, [role, regionId, fetchDashboard]);

  useEffect(() => { refresh(); }, [refresh]);

  const hasAlerts = metrics.brokenComponents > 0 || metrics.lowStockCount > 0;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Good {getGreeting()}, <span className="text-primary">{userName.split(' ')[0]}</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
              {role}
            </span>
            {lastUpdated && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <Clock className="h-3 w-3 opacity-50" />
                <span className="text-xs text-muted-foreground/70">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex rounded-lg border bg-muted p-0.5 text-xs">
            {(['overview', 'analytics'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize transition-all ${
                  activeTab === t
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── ALERTS BANNER (only if issues exist) ── */}
      {!isLoading && hasAlerts && (
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.brokenComponents > 0 && (
            <AlertTile
              count={metrics.brokenComponents}
              label="Broken Components"
              sub="Require maintenance or replacement"
              color="red"
            />
          )}
          {metrics.lowStockCount > 0 && (
            <AlertTile
              count={metrics.lowStockCount}
              label="Low Stock Items"
              sub="Below minimum threshold — reorder needed"
              color="amber"
            />
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* OVERVIEW TAB                                                            */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          {/* ── Priority 1: Hero KPIs ── */}
          <section className="space-y-2">
            <SectionLabel icon={TrendingUp} label="Key Metrics" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              ) : (
                <>
                  <HeroCard
                    label="Total Components"
                    value={metrics.totalComponents.toLocaleString()}
                    sub={`${metrics.totalQuantity.toLocaleString()} total units across all locations`}
                    icon={Cpu}
                    color="indigo"
                    trend="Live inventory"
                  />
                  <HeroCard
                    label="Total Asset Value"
                    value={formatCurrency(metrics.totalAssetValue)}
                    sub="Based on purchase price × quantity"
                    icon={DollarSign}
                    color="emerald"
                    trend="Estimated"
                  />
                  <HeroCard
                    label="Active Users"
                    value={metrics.activeUsers}
                    sub={`${metrics.componentTypes} active component types`}
                    icon={UserCheck}
                    color="blue"
                  />
                  <HeroCard
                    label="Total Customers"
                    value={metrics.totalCustomers.toLocaleString()}
                    sub="Registered in the system"
                    icon={Users}
                    color="violet"
                  />
                </>
              )}
            </div>
          </section>

          {/* ── Priority 2: Infrastructure Metrics ── */}
          <section className="space-y-2">
            <SectionLabel icon={Globe} label="Infrastructure" />
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              ) : (
                <>
                  <MetricTile
                    label="Regions"
                    value={metrics.totalRegions}
                    sub={`${metrics.activeRegions} active`}
                    icon={Globe}
                  />
                  <MetricTile
                    label="Warehouses"
                    value={metrics.totalWarehouses}
                    sub={`${metrics.activeWarehouses} active`}
                    icon={Warehouse}
                  />
                  <MetricTile
                    label="Component Types"
                    value={metrics.componentTypes}
                    sub="Active types"
                    icon={Layers}
                  />
                  <MetricTile
                    label="Total Units"
                    value={metrics.totalQuantity.toLocaleString()}
                    sub="All locations"
                    icon={Boxes}
                  />
                  <MetricTile
                    label="Broken"
                    value={metrics.brokenComponents}
                    sub="Need attention"
                    icon={AlertTriangle}
                    warn={metrics.brokenComponents > 0}
                  />
                  <MetricTile
                    label="Low Stock"
                    value={metrics.lowStockCount}
                    sub="Below minimum"
                    icon={PackageX}
                    warn={metrics.lowStockCount > 0}
                  />
                </>
              )}
            </div>
          </section>

          {/* ── Bottom: Activity + Low Stock ── */}
          <section className="space-y-2">
            <SectionLabel icon={Activity} label="Activity & Alerts" />
            <div className="grid gap-4 lg:grid-cols-3">

              {/* Recent Activity — 2/3 */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {isAdmin ? 'Latest system actions' : 'Your recent actions'}
                      </CardDescription>
                    </div>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="px-6 py-4 space-y-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-9 w-full" />
                      ))}
                    </div>
                  ) : recentActivity.length === 0 ? (
                    <EmptyChart icon={Activity} text="No activity recorded yet" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="pl-6 text-xs">User</TableHead>
                          <TableHead className="text-xs">Action</TableHead>
                          <TableHead className="text-xs">Module</TableHead>
                          <TableHead className="text-right pr-6 text-xs">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentActivity.map((log) => (
                          <TableRow key={log.id} className="text-sm">
                            <TableCell className="pl-6 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0">
                                  {log.user_name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium truncate max-w-[100px]">{log.user_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <Badge variant="outline" className={`text-[10px] font-semibold px-1.5 ${actionColor(log.action)}`}>
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5 text-muted-foreground text-xs">{log.module}</TableCell>
                            <TableCell className="text-[11px] text-muted-foreground text-right pr-6 py-2.5 whitespace-nowrap">
                              {formatDate(log.timestamp)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Low Stock — 1/3 */}
              <Card>
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">Low Stock Alerts</CardTitle>
                      <CardDescription className="text-xs mt-0.5">Below minimum threshold</CardDescription>
                    </div>
                    <PackageX className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {isLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                    </div>
                  ) : lowStockItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-10 w-10 mb-2 text-emerald-500 opacity-60" />
                      <p className="text-sm font-semibold text-foreground">All stocked up</p>
                      <p className="text-xs mt-0.5">No items below minimum</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lowStockItems.map((item) => {
                        const pct = Math.round((item.quantity / Math.max(item.minimum_stock, 1)) * 100);
                        const empty = item.quantity === 0;
                        return (
                          <div
                            key={item.id}
                            className={`rounded-lg border p-2.5 ${
                              empty ? 'border-red-200 bg-red-50/60' : 'border-amber-200 bg-amber-50/40'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold truncate leading-tight">{item.item_name}</p>
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                  {item.type_name} · {item.region_name}
                                </p>
                              </div>
                              <span className={`text-xs font-bold flex-shrink-0 tabular-nums ${
                                empty ? 'text-red-600' : 'text-amber-600'
                              }`}>
                                {item.quantity}/{item.minimum_stock}
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  empty ? 'bg-red-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* ANALYTICS TAB                                                           */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <>
          {/* Row 1: Status donut + Region bar */}
          <section className="space-y-2">
            <SectionLabel icon={Boxes} label="Component Distribution" />
            <div className="grid gap-4 lg:grid-cols-5">

              {/* Status donut — 2/5 */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">By Status</CardTitle>
                  <CardDescription className="text-xs">Component condition overview</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? <ChartSkeleton /> :
                   componentsByStatus.length === 0 ? <EmptyChart icon={Activity} text="No component data" /> : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={componentsByStatus}
                          dataKey="value" nameKey="name"
                          cx="50%" cy="45%"
                          innerRadius={60} outerRadius={88}
                          paddingAngle={3}
                        >
                          {componentsByStatus.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={STATUS_COLORS[entry.name] ?? PALETTE[i % PALETTE.length]}
                              strokeWidth={0}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Region bar — 3/5 */}
              <Card className="lg:col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Units by Region</CardTitle>
                  <CardDescription className="text-xs">Inventory distribution across locations</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? <ChartSkeleton /> :
                   componentsByRegion.length === 0 ? <EmptyChart icon={MapPin} text="No region data" /> : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={componentsByRegion}
                        margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                        <YAxis
                          type="category" dataKey="region"
                          tickLine={false} axisLine={false} fontSize={10}
                          width={80} tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="quantity" name="Units" fill={PALETTE[0]} radius={[0, 6, 6, 0]} maxBarSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Row 2: Type donut + Region components count */}
          <section className="grid gap-4 lg:grid-cols-5">

            {/* Type donut — 2/5 */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">By Component Type</CardTitle>
                <CardDescription className="text-xs">Unit distribution across types</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? <ChartSkeleton /> :
                 componentsByType.length === 0 ? <EmptyChart icon={Boxes} text="No type data" /> : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={componentsByType}
                        dataKey="value" nameKey="name"
                        cx="50%" cy="45%"
                        innerRadius={60} outerRadius={88}
                        paddingAngle={3}
                      >
                        {componentsByType.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Region breakdown table — 3/5 */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-semibold">Region Breakdown</CardTitle>
                <CardDescription className="text-xs">Component records + unit count per region</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="px-6 py-4 space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : componentsByRegion.length === 0 ? (
                  <EmptyChart icon={MapPin} text="No region data" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-6 text-xs">Region</TableHead>
                        <TableHead className="text-xs text-right">Records</TableHead>
                        <TableHead className="text-xs text-right pr-6">Units</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {componentsByRegion.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="pl-6 py-2.5">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                style={{ background: PALETTE[i % PALETTE.length] }}
                              />
                              <span className="text-sm font-medium">{r.region}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-2.5 text-sm tabular-nums">
                            {r.count.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right py-2.5 pr-6 text-sm tabular-nums font-semibold">
                            {r.quantity.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
