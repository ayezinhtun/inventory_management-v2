import React, { useState, Component } from 'react';
import { useStore } from '../store/useStore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from
'../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
'../components/ui/Table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger } from
'../components/ui/AlertDialog';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Server,
  MapPin,
  Calendar,
  Shield,
  Cpu,
  Activity } from
'lucide-react';
import { formatDate, formatCurrency, getStatusColor } from '../lib/utils';
import { toast } from 'sonner';
export function InventoryDetailPage() {
  const {
    inventory,
    components,
    auditLogs,
    selectedId,
    navigate,
    currentUser,
    getRegionName,
    getWarehouseName,
    getRackName,
    deleteInventoryItem
  } = useStore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  if (!selectedId) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">No item selected.</p>
        <Button onClick={() => navigate('inventory')} className="mt-4">
          Back to Inventory
        </Button>
      </div>);

  }
  const item = inventory.find((i) => i.id === selectedId);
  if (!item || item.is_deleted) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">
          Item not found or has been deleted.
        </p>
        <Button onClick={() => navigate('inventory')} className="mt-4">
          Back to Inventory
        </Button>
      </div>);

  }
  const installedComponents = components.filter(
    (c) => c.installed_in_device_id === item.id && !c.is_deleted
  );
  const itemHistory = auditLogs.filter((log) => log.record_id === item.id);
  const handleDelete = () => {
    if (installedComponents.length > 0) {
      toast.error(
        `Cannot delete: ${installedComponents.length} components are currently installed in this device.`
      );
      setIsDeleteDialogOpen(false);
      return;
    }
    // In a real app, we'd also check for pending requests here
    deleteInventoryItem(item.id);
    toast.success('Item deleted successfully');
    navigate('inventory');
  };
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('inventory')}>
            
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight font-heading">
                {item.item_name}
              </h1>
              <Badge variant="outline">{item.item_type}</Badge>
              <Badge className={getStatusColor(item.status)}>
                {item.status}
              </Badge>
              <Badge variant="secondary">{item.condition}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {item.manufacturer} {item.model} • SN: {item.serial_number}
            </p>
          </div>
        </div>

        {currentUser?.role === 'Admin' &&
        <div className="flex items-center gap-2">
            <Button
            variant="outline"
            onClick={() => toast.info('Edit feature coming soon')}>
            
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}>
            
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the inventory item and remove its data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="specifications">Specifications</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="components">
            Components
            <Badge variant="secondary" className="ml-2 bg-background/50">
              {installedComponents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-muted-foreground" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Region:</span>
                  <span className="col-span-2 font-medium">
                    {getRegionName(item.region_id)}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Warehouse:</span>
                  <span className="col-span-2 font-medium">
                    {getWarehouseName(item.warehouse_id)}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Rack:</span>
                  <span className="col-span-2 font-medium">
                    {item.rack_id ? getRackName(item.rack_id) : '—'}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Position:</span>
                  <span className="col-span-2 font-medium">
                    {item.rack_position || '—'}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Room:</span>
                  <span className="col-span-2 font-medium">
                    {item.room || '—'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                  Purchase Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="col-span-2 font-medium">
                    {formatDate(item.purchase_date)}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="col-span-2 font-medium">
                    {formatCurrency(item.purchase_price)}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Vendor:</span>
                  <span className="col-span-2 font-medium">
                    {item.vendor || '—'}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Asset Tag:</span>
                  <span className="col-span-2 font-medium">
                    {item.asset_tag || '—'}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Ownership:</span>
                  <span className="col-span-2 font-medium">
                    {item.ownership?.owned_by || 'Company Owned'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-muted-foreground" />
                  Warranty & Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Expires:</span>
                  <span className="col-span-2 font-medium">
                    {item.warranty_expiry_date ?
                    <span
                      className={
                      new Date(item.warranty_expiry_date) < new Date() ?
                      'text-destructive' :
                      ''
                      }>
                      
                        {formatDate(item.warranty_expiry_date)}
                      </span> :

                    '—'
                    }
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Schedule:</span>
                  <span className="col-span-2 font-medium">
                    {item.maintenance?.schedule || '—'}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Last Maint:</span>
                  <span className="col-span-2 font-medium">
                    {formatDate(item.maintenance?.last_date)}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Deployed:</span>
                  <span className="col-span-2 font-medium">
                    {formatDate(item.lifecycle?.deployment_date)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {item.notes &&
          <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {item.notes}
                </p>
              </CardContent>
            </Card>
          }
        </TabsContent>

        <TabsContent value="specifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Hardware Specifications</CardTitle>
              <CardDescription>
                Detailed technical specifications for this{' '}
                {item.item_type.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                {Object.entries(item.specifications || {}).map(
                  ([key, value]) =>
                  <div key={key} className="border-b border-border/50 pb-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="font-medium text-sm">
                        {Array.isArray(value) ?
                      value.join(', ') :
                      String(value || '—')}
                      </p>
                    </div>

                )}
                {Object.keys(item.specifications || {}).length === 0 &&
                <p className="text-muted-foreground text-sm col-span-full">
                    No specifications recorded.
                  </p>
                }
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Network Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                {Object.entries(item.network_config || {}).map(
                  ([key, value]) =>
                  <div key={key} className="border-b border-border/50 pb-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="font-medium text-sm font-mono">
                        {String(value || '—')}
                      </p>
                    </div>

                )}
                {Object.keys(item.network_config || {}).length === 0 &&
                <p className="text-muted-foreground text-sm col-span-full">
                    No network configuration recorded.
                  </p>
                }
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Installed Components</CardTitle>
                <CardDescription>
                  Hardware components currently installed in this device
                </CardDescription>
              </div>
              {currentUser?.role === 'Admin' &&
              <Button
                size="sm"
                onClick={() =>
                toast.info('Install component feature coming soon')
                }>
                
                  Install Component
                </Button>
              }
            </CardHeader>
            <CardContent>
              {installedComponents.length > 0 ?
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Slot</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installedComponents.map((comp) =>
                  <TableRow key={comp.id}>
                        <TableCell className="font-medium">
                          {comp.item_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {comp.component_type_id}
                          </Badge>
                        </TableCell>
                        <TableCell>{comp.device_slot || '—'}</TableCell>
                        <TableCell>{comp.quantity}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(comp.status)}>
                            {comp.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                  )}
                  </TableBody>
                </Table> :

              <div className="text-center py-8 text-muted-foreground">
                  <Cpu className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No components currently installed.</p>
                </div>
              }
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>
                Audit log of changes to this item
              </CardDescription>
            </CardHeader>
            <CardContent>
              {itemHistory.length > 0 ?
              <div className="space-y-4">
                  {itemHistory.map((log) =>
                <div
                  key={log.id}
                  className="flex gap-4 p-4 rounded-lg border bg-muted/30">
                  
                      <div className="mt-0.5">
                        <Activity className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {log.action} by User {log.user_id}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {JSON.stringify(log.new_value || log.old_value)}
                        </p>
                      </div>
                    </div>
                )}
                </div> :

              <div className="text-center py-8 text-muted-foreground">
                  <p>No history recorded yet.</p>
                </div>
              }
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>);

}