import React, { useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useDashboardStore } from '../store/useDashboardStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/Table';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Cpu, MapPin, Building2, Users, DollarSign, AlertTriangle,
  PackageX, CheckCircle2, RefreshCw, TrendingUp, Boxes,
  Activity, Layers,
} from 'lucide-react';
import { formatDate } from '../lib/utils';

// ── colour palette used across all charts ────────────────────────────────────
const PALETTE = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
  '#3b82f6', '#8b5cf6', '#14b8a6', '#f97316',
];

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  VIEW:   'bg-gray-100 text-gray-700',
};

function actionColor(action: string) {
  return ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-700';
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function StatCard({
  label, value, sub, icon: Icon, accent = false, warn = false,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
  warn?: boolean;
}) {
  const iconBg = warn
    ? 'bg-red-50 text-red-600'
    : accent
    ? 'bg-primary/10 text-primary'
    : 'bg-muted text-muted-foreground';

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground leading-none truncate">{label}</p>
            <p className="text-2xl font-bold tracking-tight leading-none mt-1.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-[220px] w-full rounded-lg" />;
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
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

  const refresh = useCallback(() => {
    fetchDashboard({ role, regionId });
  }, [role, regionId, fetchDashboard]);

  // Fetch on mount; re-fetch whenever role/region changes
  useEffect(() => { refresh(); }, [refresh]);

  const isAdmin = role === 'Admin';

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Welcome back, <span className="font-medium text-foreground">{userName}</span>
            {' '}·{' '}
            <span className="capitalize">{role}</span> workspace
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline" size="sm"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard
              label="Components"
              value={metrics.totalComponents.toLocaleString()}
              sub={`${metrics.totalQuantity.toLocaleString()} total units`}
              icon={Cpu}
              accent
            />
            <StatCard
              label="Component Types"
              value={metrics.componentTypes}
              sub="Active types"
              icon={Layers}
            />
            <StatCard
              label="Active Regions"
              value={metrics.activeRegions}
              sub={`${metrics.activeWarehouses} warehouses`}
              icon={MapPin}
            />
            <StatCard
              label="Active Users"
              value={metrics.activeUsers}
              sub="System accounts"
              icon={Users}
            />
            <StatCard
              label="Asset Value"
              value={formatCurrency(metrics.totalAssetValue)}
              sub="Estimated"
              icon={DollarSign}
              accent
            />
            <StatCard
              label="Needs Attention"
              value={metrics.brokenComponents + metrics.lowStockCount}
              sub={`${metrics.brokenComponents} broken · ${metrics.lowStockCount} low stock`}
              icon={AlertTriangle}
              warn={metrics.brokenComponents + metrics.lowStockCount > 0}
            />
          </>
        )}
      </div>

      {/* ── Charts ── */}
      <div className="grid gap-4 md:grid-cols-3">

        {/* Component Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Component Status</CardTitle>
            <CardDescription className="text-xs">Working / Broken / Other</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton /> : componentsByStatus.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Activity className="h-8 w-8 opacity-20" />
                <p className="text-xs">No component data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={componentsByStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={80}
                    paddingAngle={3}
                  >
                    {componentsByStatus.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle" iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Components by Region */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Components by Region</CardTitle>
            <CardDescription className="text-xs">Unit count per location</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton /> : componentsByRegion.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <MapPin className="h-8 w-8 opacity-20" />
                <p className="text-xs">No region data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={componentsByRegion}
                  margin={{ top: 4, right: 4, left: -22, bottom: 0 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    type="category" dataKey="region"
                    tickLine={false} axisLine={false} fontSize={10}
                    width={72} tick={{ fill: 'var(--muted-foreground)' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="quantity" name="Units" fill={PALETTE[0]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Components by Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Components by Type</CardTitle>
            <CardDescription className="text-xs">Unit distribution across types</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton /> : componentsByType.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Boxes className="h-8 w-8 opacity-20" />
                <p className="text-xs">No type data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={componentsByType}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={80}
                    paddingAngle={3}
                  >
                    {componentsByType.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle" iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Recent Activity — 2/3 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
                <CardDescription className="text-xs">
                  {isAdmin ? 'Latest actions across the system' : 'Your recent actions'}
                </CardDescription>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="px-6 pb-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Activity className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No activity recorded yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead className="text-right pr-6">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="pl-6 font-medium text-sm py-2.5">
                        {log.user_name}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className={`text-xs ${actionColor(log.action)}`}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm py-2.5">{log.module}</TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right pr-6 py-2.5 whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts — 1/3 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Low Stock Alerts</CardTitle>
                <CardDescription className="text-xs">Below minimum threshold</CardDescription>
              </div>
              <PackageX className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-500 opacity-60" />
                <p className="text-sm font-medium">All stocked up</p>
                <p className="text-xs mt-0.5">No components below minimum</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockItems.map((item) => {
                  const pct = Math.round((item.quantity / item.minimum_stock) * 100);
                  const critical = item.quantity === 0;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg border p-2.5 ${
                        critical ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{item.item_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {item.type_name} · {item.region_name}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs flex-shrink-0 ${
                            critical
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-amber-100 text-amber-700 border-amber-200'
                          }`}
                        >
                          {item.quantity} / {item.minimum_stock}
                        </Badge>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            critical ? 'bg-red-500' : 'bg-amber-500'
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

      {/* ── Quick summary strip (admin only) ── */}
      {isAdmin && !isLoading && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: 'Broken components',
              value: metrics.brokenComponents,
              color: metrics.brokenComponents > 0 ? 'text-red-600' : 'text-emerald-600',
              icon: AlertTriangle,
            },
            {
              label: 'Low stock items',
              value: metrics.lowStockCount,
              color: metrics.lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600',
              icon: PackageX,
            },
            {
              label: 'Total asset value',
              value: formatCurrency(metrics.totalAssetValue),
              color: 'text-foreground',
              icon: DollarSign,
            },
          ].map(({ label, value, color, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${color}`} />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-sm font-semibold ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
