import React, { useState } from 'react';

import { useStore } from '../store/useStore';

import { useComponentsStore } from '../store/useComponentsStore';

import {

  Card,

  CardContent,

  CardDescription,

  CardHeader,

  CardTitle

} from

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

  AlertDialogTrigger

} from

  '../components/ui/AlertDialog';

import {

  Dialog,

  DialogContent,

  DialogHeader,

  DialogTitle

} from

  '../components/ui/Dialog';

import {

  ArrowLeft,

  ArrowRight,

  Edit,

  Trash2,

  Cpu,

  MapPin,

  Calendar,

  Shield,

  History,

  Server,

  Package,

  MoveRight

} from

  'lucide-react';

import { formatDate, formatCurrency, getStatusColor } from '../lib/utils';

import { toast } from 'sonner';

import type { ComponentHistory } from '../lib/types';

export function ComponentDetailPage() {

  // Always call all hooks first, in the same order

  const { components, deleteComponent } = useComponentsStore();

  const {

    inventory,

    componentHistory,

    selectedId,

    navigate,

    currentUser,

    getRegionName,

    getWarehouseName,

    getComponentTypeName,

    getUserName,

    componentTypes

  } = useStore();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<ComponentHistory | null>(null);

  

  // Early returns after all hooks are called

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

  const itemHistory = componentHistory.filter((h) => h.component_id === component.id);



  const handleDelete = async () => {

    if (component.installed_in_device_id) {

      toast.error('Cannot delete component that is installed in a device');

      return;

    }



    try {

      await deleteComponent(component.id);

      toast.success('Component deleted successfully');

      navigate('components');

    } catch (error) {

      console.error('Delete component error:', error);

      toast.error('Failed to delete component');

    }

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

                {component.name}

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

              onClick={() => {

                window.location.href = '/components/add?mode=edit&componentId=' + component.id;

              }}>



              <Edit className="h-4 w-4 mr-2" />

              Edit

            </Button>

            <AlertDialog

              open={isDeleteDialogOpen}

              onOpenChange={setIsDeleteDialogOpen}>



              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>

                <AlertDialogTrigger>

                  <Button variant="destructive">

                    <Trash2 className="h-4 w-4 mr-2" />

                    Delete

                  </Button>

                </AlertDialogTrigger>

              </AlertDialog>



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

                    className="bg-destructive text-white hover:bg-destructive/90">



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

                  <span className="text-muted-foreground">Status:</span>

                  <span className="col-span-2 font-medium">

                    {component.status}

                  </span>

                </div>

                <div className="grid grid-cols-3 text-sm">

                  <span className="text-muted-foreground">Condition:</span>

                  <span className="col-span-2 font-medium">

                    {component.condition}

                  </span>

                </div>

              </CardContent>

            </Card>



            <Card>

              <CardHeader className="pb-3">

                <CardTitle className="text-lg flex items-center">

                  <Cpu className="h-5 w-5 mr-2 text-muted-foreground" />

                  Component Details

                </CardTitle>

              </CardHeader>

              <CardContent className="space-y-2">

                <div className="grid grid-cols-3 text-sm">

                  <span className="text-muted-foreground">Manufacturer:</span>

                  <span className="col-span-2 font-medium">

                    {component.manufacturer}

                  </span>

                </div>

                <div className="grid grid-cols-3 text-sm">

                  <span className="text-muted-foreground">Model:</span>

                  <span className="col-span-2 font-medium">

                    {component.model}

                  </span>

                </div>

                <div className="grid grid-cols-3 text-sm">

                  <span className="text-muted-foreground">Part Number:</span>

                  <span className="col-span-2 font-medium">

                    {component.part_number}

                  </span>

                </div>

                <div className="grid grid-cols-3 text-sm">

                  <span className="text-muted-foreground">Compatible With:</span>

                  <span className="col-span-2 font-medium">

                    {component.compatible_with || '—'}

                  </span>

                </div>

              </CardContent>

            </Card>



            <Card>

              <CardHeader className="pb-3">

                <CardTitle className="text-lg flex items-center">

                  <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />

                  Timestamps

                </CardTitle>

              </CardHeader>

              <CardContent className="space-y-2">

                <div className="grid grid-cols-3 text-sm">

                  <span className="text-muted-foreground">Created:</span>

                  <span className="col-span-2 font-medium">

                    {formatDate(component.created_at)}

                  </span>

                </div>

                <div className="grid grid-cols-3 text-sm">

                  <span className="text-muted-foreground">Updated:</span>

                  <span className="col-span-2 font-medium">

                    {formatDate(component.updated_at)}

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

                  Compatibility

                </CardTitle>

              </CardHeader>

              <CardContent className="space-y-4">

                {component.compatible_with ?

                  <div>

                    <p className="text-sm font-medium mb-1">Compatible With:</p>

                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border">

                      {component.compatible_with}

                    </p>

                  </div>

                  :

                  <p className="text-sm text-muted-foreground">

                    No compatibility information recorded.

                  </p>

                }

              </CardContent>

            </Card>





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

                {(() => {

                  const componentType = componentTypes.find(

                    (ct) => ct.id === component.component_type_id

                  );

                  const fieldMap = new Map(

                    componentType?.fields?.map((field) => [field.id, field.label]) || []

                  );



                  return Object.entries(component.specifications || {}).map(

                    ([key, value]) => {

                      const label = fieldMap.get(key) || key.replace(/_/g, ' ');

                      return (

                        <div key={key} className="border-b border-border/50 pb-2">

                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">

                            {label}

                          </p>

                          <p className="font-medium text-sm">

                            {Array.isArray(value) ?

                              value.join(', ') :

                              String(value || '—')}

                          </p>

                        </div>

                      );

                    }

                  );

                })()}

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

              <CardTitle className="flex items-center gap-2">

                <History className="h-5 w-5 text-muted-foreground" />

                Movement History

              </CardTitle>

              <CardDescription>

                Full location movement trail for this component

              </CardDescription>

            </CardHeader>

            <CardContent>

              {itemHistory.length > 0 ? (

                <div className="rounded-md border overflow-hidden">

                  <table className="w-full text-sm">

                    <thead>

                      <tr className="bg-muted/50 border-b">

                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date & Time</th>

                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>

                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">From</th>

                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">To</th>

                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Moved By</th>

                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Request</th>

                        <th className="px-4 py-3"></th>

                      </tr>

                    </thead>

                    <tbody>

                      {itemHistory.map((entry, idx) => {

                        const fromLabel = entry.from_device_id

                          ? `Device: ${inventory.find((i) => i.id === entry.from_device_id)?.item_name ?? entry.from_device_id}`

                          : entry.from_warehouse_id

                            ? `${getRegionName(entry.from_region_id ?? '')} › ${getWarehouseName(entry.from_warehouse_id)}`

                            : '—';

                        const toLabel = entry.to_device_id

                          ? `Device: ${inventory.find((i) => i.id === entry.to_device_id)?.item_name ?? entry.to_device_id}`

                          : entry.to_warehouse_id

                            ? `${getRegionName(entry.to_region_id ?? '')} › ${getWarehouseName(entry.to_warehouse_id)}`

                            : entry.to_region_id

                              ? getRegionName(entry.to_region_id)

                              : '—';

                        return (

                          <tr

                            key={entry.id}

                            className={`border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}

                            onClick={() => setSelectedHistoryEntry(entry)}

                          >

                            <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">

                              {new Date(entry.moved_at).toLocaleString()}

                            </td>

                            <td className="px-4 py-3">

                              <Badge

                                variant="outline"

                                className={

                                  entry.movement_type === 'CREATED'

                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'

                                    : entry.movement_type === 'INSTALLED'

                                      ? 'bg-blue-50 text-blue-700 border-blue-200'

                                      : entry.movement_type === 'UNINSTALLED'

                                        ? 'bg-amber-50 text-amber-700 border-amber-200'

                                        : 'bg-purple-50 text-purple-700 border-purple-200'

                                }

                              >

                                {entry.movement_type}

                              </Badge>

                            </td>

                            <td className="px-4 py-3 text-sm max-w-[180px] truncate" title={fromLabel}>

                              {fromLabel}

                            </td>

                            <td className="px-4 py-3 text-sm max-w-[180px] truncate" title={toLabel}>

                              {toLabel}

                            </td>

                            <td className="px-4 py-3 text-sm">

                              {getUserName(entry.moved_by)}

                            </td>

                            <td className="px-4 py-3 text-xs text-muted-foreground">

                              {entry.related_request_type && entry.related_request_id

                                ? <span className="capitalize">{entry.related_request_type}</span>

                                : '—'}

                            </td>

                            <td className="px-4 py-3 text-right">

                              <ArrowRight className="h-4 w-4 text-muted-foreground inline-block" />

                            </td>

                          </tr>

                        );

                      })}

                    </tbody>

                  </table>

                </div>

              ) : (

                <div className="text-center py-12 text-muted-foreground">

                  <History className="h-10 w-10 mx-auto mb-3 opacity-30" />

                  <p className="font-medium">No movement history yet.</p>

                  <p className="text-xs mt-1">History is recorded when this component is created, installed, or relocated.</p>

                </div>

              )}

            </CardContent>

          </Card>

        </TabsContent>

      </Tabs>



      {/* History detail drill-down dialog */}

      {selectedHistoryEntry && (() => {

        const entry = selectedHistoryEntry;

        const fromDevice = entry.from_device_id ? inventory.find((i) => i.id === entry.from_device_id) : null;

        const toDevice = entry.to_device_id ? inventory.find((i) => i.id === entry.to_device_id) : null;

        return (

          <Dialog open={!!selectedHistoryEntry} onOpenChange={(open) => { if (!open) setSelectedHistoryEntry(null); }}>

            <DialogContent className="max-w-lg">

              <DialogHeader>

                <DialogTitle className="flex items-center gap-2">

                  <MoveRight className="h-5 w-5 text-muted-foreground" />

                  Movement Detail

                </DialogTitle>

              </DialogHeader>

              <div className="space-y-4 pt-2">

                <div className="flex items-center gap-2">

                  <Badge

                    variant="outline"

                    className={

                      entry.movement_type === 'CREATED'

                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'

                        : entry.movement_type === 'INSTALLED'

                          ? 'bg-blue-50 text-blue-700 border-blue-200'

                          : entry.movement_type === 'UNINSTALLED'

                            ? 'bg-amber-50 text-amber-700 border-amber-200'

                            : 'bg-purple-50 text-purple-700 border-purple-200'

                    }

                  >

                    {entry.movement_type}

                  </Badge>

                  <span className="text-sm text-muted-foreground">

                    {new Date(entry.moved_at).toLocaleString()}

                  </span>

                </div>



                <div className="grid grid-cols-2 gap-4">

                  <div className="rounded-lg border p-3 space-y-1">

                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">From</p>

                    {entry.from_device_id ? (

                      <>

                        <div className="flex items-center gap-1 text-sm">

                          <Server className="h-3.5 w-3.5 text-muted-foreground" />

                          <span className="font-medium">{fromDevice?.item_name ?? '—'}</span>

                        </div>

                        <p className="text-xs text-muted-foreground">{fromDevice?.item_type}</p>

                      </>

                    ) : entry.from_warehouse_id ? (

                      <>

                        <div className="flex items-center gap-1 text-sm">

                          <Package className="h-3.5 w-3.5 text-muted-foreground" />

                          <span className="font-medium">{getWarehouseName(entry.from_warehouse_id)}</span>

                        </div>

                        <p className="text-xs text-muted-foreground">{getRegionName(entry.from_region_id ?? '')}</p>

                      </>

                    ) : (

                      <p className="text-sm text-muted-foreground">—</p>

                    )}

                  </div>



                  <div className="rounded-lg border p-3 space-y-1">

                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">To</p>

                    {entry.to_device_id ? (

                      <>

                        <div className="flex items-center gap-1 text-sm">

                          <Server className="h-3.5 w-3.5 text-muted-foreground" />

                          <span className="font-medium">{toDevice?.item_name ?? '—'}</span>

                        </div>

                        <p className="text-xs text-muted-foreground">{toDevice?.item_type}</p>

                      </>

                    ) : entry.to_warehouse_id ? (

                      <>

                        <div className="flex items-center gap-1 text-sm">

                          <Package className="h-3.5 w-3.5 text-muted-foreground" />

                          <span className="font-medium">{getWarehouseName(entry.to_warehouse_id)}</span>

                        </div>

                        <p className="text-xs text-muted-foreground">{getRegionName(entry.to_region_id ?? '')}</p>

                      </>

                    ) : entry.to_region_id ? (

                      <div className="flex items-center gap-1 text-sm">

                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />

                        <span className="font-medium">{getRegionName(entry.to_region_id)}</span>

                      </div>

                    ) : (

                      <p className="text-sm text-muted-foreground">—</p>

                    )}

                  </div>

                </div>



                <div className="rounded-lg border p-3 space-y-2">

                  <div className="grid grid-cols-2 text-sm">

                    <span className="text-muted-foreground">Moved by</span>

                    <span className="font-medium">{getUserName(entry.moved_by)}</span>

                  </div>

                  {entry.related_request_type && (

                    <div className="grid grid-cols-2 text-sm">

                      <span className="text-muted-foreground">Request type</span>

                      <span className="font-medium capitalize">{entry.related_request_type}</span>

                    </div>

                  )}

                  {entry.notes && (

                    <div className="grid grid-cols-2 text-sm">

                      <span className="text-muted-foreground">Notes</span>

                      <span className="font-medium">{entry.notes}</span>

                    </div>

                  )}

                </div>

              </div>

            </DialogContent>

          </Dialog>

        );

      })()}

    </div>);



}