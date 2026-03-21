import React, { useMemo, Component } from 'react';
import { useStore } from '../store/useStore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from
'../components/ui/Card';
import {
  Server,
  Cpu,
  AlertTriangle,
  Clock,
  Activity,
  DollarSign,
  Users,
  PackageX,
  CheckCircle2 } from
'lucide-react';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent } from
'../components/ui/Chart';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer } from
'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
'../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate, getStatusColor } from '../lib/utils';
export function DashboardPage() {
  const {
    currentUser,
    inventory,
    components,
    inventoryRequests,
    installRequests,
    relocationRequests,
    users,
    auditLogs,
    regions
  } = useStore();
  if (!currentUser) return null;
  const isAdmin = currentUser.role === 'Admin';
  const isPM = currentUser.role === 'PM';
  const isEngineer = currentUser.role === 'Engineer';
  // Role-based filtering
  const filteredInventory = useMemo(() => {
    const active = inventory.filter((i) => !i.is_deleted);
    if (isAdmin) return active;
    if (isPM)
    return active.filter(
      (i) => i.region_id === currentUser.assigned_region_id
    );
    return active.filter((i) => i.region_id === currentUser.assigned_region_id);
  }, [inventory, currentUser, isAdmin, isPM]);
  const filteredComponents = useMemo(() => {
    const active = components.filter((c) => !c.is_deleted);
    if (isAdmin) return active;
    if (isPM)
    return active.filter(
      (c) => c.region_id === currentUser.assigned_region_id
    );
    return active.filter((c) => c.region_id === currentUser.assigned_region_id);
  }, [components, currentUser, isAdmin, isPM]);
  const filteredInstallRequests = useMemo(() => {
    if (isAdmin) return installRequests;
    if (isPM) {
      return installRequests.filter((r) => {
        const requester = users.find((u) => u.id === r.requester_id);
        return requester?.assigned_region_id === currentUser.assigned_region_id;
      });
    }
    return installRequests.filter((r) => r.requester_id === currentUser.id);
  }, [installRequests, currentUser, isAdmin, isPM, users]);
  const filteredRelocationRequests = useMemo(() => {
    if (isAdmin) return relocationRequests;
    if (isPM) {
      return relocationRequests.filter((r) => {
        const requester = users.find((u) => u.id === r.requester_id);
        return requester?.assigned_region_id === currentUser.assigned_region_id;
      });
    }
    return relocationRequests.filter((r) => r.requester_id === currentUser.id);
  }, [relocationRequests, currentUser, isAdmin, isPM, users]);
  const filteredInventoryRequests = useMemo(() => {
    if (isAdmin) return inventoryRequests;
    return inventoryRequests.filter((r) => r.requester_id === currentUser.id);
  }, [inventoryRequests, currentUser, isAdmin]);
  // Metrics
  const totalInventory = filteredInventory.length;
  const totalComponents = filteredComponents.length;
  const brokenItems = filteredInventory.filter(
    (i) => i.status === 'Broken'
  ).length;
  const pendingInstalls = filteredInstallRequests.filter((r) =>
  r.status.includes('Pending')
  ).length;
  const pendingRelocations = filteredRelocationRequests.filter((r) =>
  r.status.includes('Pending')
  ).length;
  const pendingInventoryReqs = filteredInventoryRequests.filter(
    (r) => r.status === 'Pending'
  ).length;
  const totalPendingRequests =
  pendingInstalls + pendingRelocations + pendingInventoryReqs;
  const activeUsers = users.filter((u) => u.is_active).length;
  const totalAssetValue =
  filteredInventory.reduce(
    (sum, item) => sum + (item.purchase_price || 0) * item.quantity,
    0
  ) +
  filteredComponents.reduce(
    (sum, comp) => sum + (comp.purchase_price || 0) * comp.quantity,
    0
  );
  // Chart Data: Inventory by Type
  const inventoryByType = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredInventory.forEach((item) => {
      counts[item.item_type] = (counts[item.item_type] || 0) + item.quantity;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value
    }));
  }, [filteredInventory]);
  const typeConfig = {
    Server: {
      label: 'Server',
      color: 'var(--chart-1)'
    },
    Switch: {
      label: 'Switch',
      color: 'var(--chart-2)'
    },
    Router: {
      label: 'Router',
      color: 'var(--chart-3)'
    },
    Firewall: {
      label: 'Firewall',
      color: 'var(--chart-4)'
    },
    'Storage Array': {
      label: 'Storage Array',
      color: 'var(--chart-5)'
    }
  };
  // Chart Data: Inventory by Region
  const inventoryByRegion = useMemo(() => {
    const counts: Record<string, number> = {};
    const relevantRegions = isAdmin ?
    regions :
    regions.filter((r) => r.id === currentUser.assigned_region_id);
    relevantRegions.forEach((r) => counts[r.name] = 0);
    filteredInventory.forEach((item) => {
      const region = regions.find((r) => r.id === item.region_id);
      if (region && counts[region.name] !== undefined) {
        counts[region.name] += item.quantity;
      }
    });
    return Object.entries(counts).map(([region, count]) => ({
      region,
      count
    }));
  }, [filteredInventory, regions, isAdmin, currentUser]);
  const regionConfig = {
    count: {
      label: 'Items',
      color: 'var(--chart-1)'
    }
  };
  // Chart Data: Request Status (includes all 3 request types)
  const requestStatusData = useMemo(() => {
    const counts = {
      Pending: 0,
      Approved: 0,
      Rejected: 0,
      Completed: 0
    };
    const allReqs = [...filteredInstallRequests, ...filteredRelocationRequests];
    allReqs.forEach((r) => {
      if (r.status.includes('Pending')) counts.Pending++;else
      if (r.status.includes('Approved')) counts.Approved++;else
      if (r.status.includes('Rejected')) counts.Rejected++;else
      if (r.status.includes('Completed') || r.status.includes('Fulfilled'))
      counts.Completed++;
    });
    // Include inventory requests
    filteredInventoryRequests.forEach((r) => {
      if (r.status === 'Pending') counts.Pending++;else
      if (r.status === 'Approved') counts.Approved++;else
      if (r.status === 'Rejected') counts.Rejected++;else
      if (r.status === 'Fulfilled') counts.Completed++;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value
    }));
  }, [
  filteredInstallRequests,
  filteredRelocationRequests,
  filteredInventoryRequests]
  );
  const statusConfig = {
    Pending: {
      label: 'Pending',
      color: 'var(--chart-4)'
    },
    Approved: {
      label: 'Approved',
      color: 'var(--chart-2)'
    },
    Rejected: {
      label: 'Rejected',
      color: 'var(--destructive)'
    },
    Completed: {
      label: 'Completed',
      color: 'var(--chart-1)'
    }
  };
  // Tables Data
  const recentActivity = isAdmin ?
  auditLogs.slice(0, 8) :
  auditLogs.filter((l) => l.user_id === currentUser.id).slice(0, 8);
  const pendingRequestsList = [
  ...filteredInstallRequests,
  ...filteredRelocationRequests,
  ...filteredInventoryRequests].

  filter((r) => r.status.includes('Pending')).
  sort(
    (a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).
  slice(0, 5);
  const lowStockComponents = filteredComponents.
  filter((c) => c.minimum_stock > 0 && c.quantity < c.minimum_stock).
  slice(0, 5);
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-heading">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {currentUser.full_name}. Here's an overview of your{' '}
          {currentUser.role.toLowerCase()} workspace.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Inventory
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInventory}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active node devices
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Components
            </CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalComponents}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tracked hardware
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Requests
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPendingRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting action
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Broken Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{brokenItems}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Needs attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Asset Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalAssetValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated value
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              System accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Inventory by Type</CardTitle>
            <CardDescription>
              Distribution of node-level devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={typeConfig} className="h-[250px] w-full">
              <PieChart>
                <Pie
                  data={inventoryByType}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}>
                  
                  {inventoryByType.map((entry, index) =>
                  <Cell
                    key={`cell-${index}`}
                    fill={`var(--color-${entry.name.replace(' ', '')})`} />

                  )}
                </Pie>
                <Tooltip content={<ChartTooltipContent />} />
                <Legend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Inventory by Region</CardTitle>
            <CardDescription>Device count across locations</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={regionConfig} className="h-[250px] w-full">
              <BarChart
                data={inventoryByRegion}
                margin={{
                  top: 10,
                  right: 10,
                  left: -20,
                  bottom: 0
                }}>
                
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)" />
                
                <XAxis
                  dataKey="region"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12} />
                
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[4, 4, 0, 0]} />
                
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Request Status</CardTitle>
            <CardDescription>All request statuses overview</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusConfig} className="h-[250px] w-full">
              <PieChart>
                <Pie
                  data={requestStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}>
                  
                  {requestStatusData.map((entry, index) =>
                  <Cell
                    key={`cell-${index}`}
                    fill={`var(--color-${entry.name})`} />

                  )}
                </Pie>
                <Tooltip content={<ChartTooltipContent />} />
                <Legend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions across the system</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.length === 0 ?
                <TableRow>
                    <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-6">
                    
                      No recent activity
                    </TableCell>
                  </TableRow> :

                recentActivity.map((log) => {
                  const user = users.find((u) => u.id === log.user_id);
                  return (
                    <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {user?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Badge
                          variant={
                          log.action === 'DELETE' ?
                          'destructive' :
                          log.action === 'CREATE' ?
                          'default' :
                          'secondary'
                          }>
                          
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.module}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(log.timestamp)}
                        </TableCell>
                      </TableRow>);

                })
                }
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4 col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Alerts</CardTitle>
              <CardDescription>
                Components below minimum threshold
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockComponents.length === 0 ?
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                  <PackageX className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">Stock levels are healthy</p>
                </div> :

              <div className="space-y-4">
                  {lowStockComponents.map((comp) =>
                <div
                  key={comp.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {comp.item_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Min: {comp.minimum_stock}
                        </p>
                      </div>
                      <Badge variant="destructive">{comp.quantity} left</Badge>
                    </div>
                )}
                </div>
              }
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Requests</CardTitle>
              <CardDescription>Awaiting approval</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequestsList.length === 0 ?
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">All caught up</p>
                </div> :

              <div className="space-y-4">
                  {pendingRequestsList.map((req) =>
                <div
                  key={req.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {req.request_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(req.created_at)}
                        </p>
                      </div>
                      <Badge
                    className={getStatusColor(req.status)}
                    variant="outline">
                    
                        {req.status}
                      </Badge>
                    </div>
                )}
                </div>
              }
            </CardContent>
          </Card>
        </div>
      </div>
    </div>);

}