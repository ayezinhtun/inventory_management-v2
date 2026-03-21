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
  Cpu,
  MapPin,
  Calendar,
  Shield,
  Activity,
  Server } from
'lucide-react';
import { formatDate, formatCurrency, getStatusColor } from '../lib/utils';
import { toast } from 'sonner';
export function ComponentDetailPage() {
  const {
    components,
    inventory,
    auditLogs,
    selectedId,
    navigate,
    currentUser,
    getRegionName,
    getWarehouseName,
    getComponentTypeName,
    deleteComponent
  } = useStore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  if (!selectedId) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">No component selected.</p>
        <Button onClick={() => navigate('components')} className="mt-4">
          Back to Components
        </Button>
      </div>);

  }
  const component = components.find((c) => c.id === selectedId);
  if (!component || component.is_deleted) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">
          Component not found or has been deleted.
        </p>
        <Button onClick={() => navigate('components')} className="mt-4">
          Back to Components
        </Button>
      </div>);

  }
  const installedIn = component.installed_in_device_id ?
  inventory.find((i) => i.id === component.installed_in_device_id) :
  null;
  const itemHistory = auditLogs.filter((log) => log.record_id === component.id);
  const handleDelete = () => {
    if (component.installed_in_device_id) {
      toast.error(
        'Cannot delete: Component is currently installed in a device. Please remove it first.'
      );
      setIsDeleteDialogOpen(false);
      return;
    }
    // In a real app, we'd also check for pending requests here
    deleteComponent(component.id);
    toast.success('Component deleted successfully');
    navigate('components');
  };
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('components')}>
            
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight font-heading">
                {component.item_name}
              </h1>
              <Badge variant="outline">
                {getComponentTypeName(component.component_type_id)}
              </Badge>
              <Badge className={getStatusColor(component.status)}>
                {component.status}
              </Badge>
              <Badge variant="secondary">{component.condition}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {component.manufacturer} {component.model} • PN:{' '}
              {component.part_number || '—'}
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
                    the component and remove its data from our servers.
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
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="specifications">Specifications</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-muted-foreground" />
                  Location & Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Region:</span>
                  <span className="col-span-2 font-medium">
                    {getRegionName(component.region_id)}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Warehouse:</span>
                  <span className="col-span-2 font-medium">
                    {getWarehouseName(component.warehouse_id)}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Installed In:</span>
                  <span className="col-span-2 font-medium">
                    {installedIn ?
                    <button
                      className="text-primary hover:underline flex items-center"
                      onClick={() =>
                      navigate('inventory-detail', installedIn.id)
                      }>
                      
                        <Server className="h-3 w-3 mr-1" />
                        {installedIn.item_name}
                      </button> :

                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      
                        In Stock
                      </Badge>
                    }
                  </span>
                </div>
                {installedIn &&
                <div className="grid grid-cols-3 text-sm">
                    <span className="text-muted-foreground">Slot:</span>
                    <span className="col-span-2 font-medium">
                      {component.device_slot || '—'}
                    </span>
                  </div>
                }
                {!installedIn &&
                <div className="grid grid-cols-3 text-sm">
                    <span className="text-muted-foreground">Bin Location:</span>
                    <span className="col-span-2 font-medium">
                      {component.bin_location || '—'}
                    </span>
                  </div>
                }
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Cpu className="h-5 w-5 mr-2 text-muted-foreground" />
                  Stock Levels
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Total Qty:</span>
                  <span className="col-span-2 font-medium text-lg">
                    {component.quantity}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Reserved:</span>
                  <span className="col-span-2 font-medium">
                    {component.reserved_quantity}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Available:</span>
                  <span className="col-span-2 font-medium text-emerald-600">
                    {Math.max(
                      0,
                      component.quantity - component.reserved_quantity
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Min Stock:</span>
                  <span className="col-span-2 font-medium">
                    {component.minimum_stock}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Reorder Qty:</span>
                  <span className="col-span-2 font-medium">
                    {component.reorder_quantity}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                  Purchase & Warranty
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="col-span-2 font-medium">
                    {formatDate(component.purchase_date)}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="col-span-2 font-medium">
                    {formatCurrency(component.purchase_price)}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Vendor:</span>
                  <span className="col-span-2 font-medium">
                    {component.vendor || '—'}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">PO Number:</span>
                  <span className="col-span-2 font-medium">
                    {component.purchase_order_number || '—'}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Warranty:</span>
                  <span className="col-span-2 font-medium">
                    {component.warranty_expiry_date ?
                    <span
                      className={
                      new Date(component.warranty_expiry_date) < new Date() ?
                      'text-destructive' :
                      ''
                      }>
                      
                        {formatDate(component.warranty_expiry_date)}
                      </span> :

                    component.warranty_type || '—'
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-muted-foreground" />
                  Testing & Compatibility
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Tested:</span>
                  {component.tested ?
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    
                      Yes
                    </Badge> :

                  <Badge
                    variant="outline"
                    className="bg-gray-50 text-gray-700 border-gray-200">
                    
                      No
                    </Badge>
                  }
                  {component.tested && component.test_date &&
                  <span className="text-xs text-muted-foreground ml-2">
                      on {formatDate(component.test_date)}
                    </span>
                  }
                </div>

                {component.test_results &&
                <div>
                    <p className="text-sm font-medium mb-1">Test Results:</p>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border">
                      {component.test_results}
                    </p>
                  </div>
                }

                {component.compatible_with &&
                <div>
                    <p className="text-sm font-medium mb-1">Compatible With:</p>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border">
                      {component.compatible_with}
                    </p>
                  </div>
                }
              </CardContent>
            </Card>

            {component.notes &&
            <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-md border min-h-[100px]">
                    {component.notes}
                  </p>
                </CardContent>
              </Card>
            }
          </div>
        </TabsContent>

        <TabsContent value="specifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Component Specifications</CardTitle>
              <CardDescription>
                Detailed technical specifications for this component
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                {Object.entries(component.specifications || {}).map(
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
                {Object.keys(component.specifications || {}).length === 0 &&
                <p className="text-muted-foreground text-sm col-span-full">
                    No specifications recorded.
                  </p>
                }
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>
                Audit log of changes to this component
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