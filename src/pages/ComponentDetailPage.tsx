import React, { useState, useEffect } from "react";



import { useStore } from "../store/useStore";



import { useComponentsStore } from "../store/useComponentsStore";



import { useReservationsStore } from "../store/useReservationStore";



import {

  Card,

  CardContent,

  CardDescription,

  CardHeader,

  CardTitle,

} from "../components/ui/Card";



import { Button } from "../components/ui/Button";



import { Badge } from "../components/ui/Badge";



import {

  Tabs,

  TabsContent,

  TabsList,

  TabsTrigger,

} from "../components/ui/Tabs";



import {

  AlertDialog,

  AlertDialogAction,

  AlertDialogCancel,

  AlertDialogContent,

  AlertDialogDescription,

  AlertDialogFooter,

  AlertDialogHeader,

  AlertDialogTitle,

  AlertDialogTrigger,

} from "../components/ui/AlertDialog";



import {

  Dialog,

  DialogContent,

  DialogHeader,

  DialogTitle,

  DialogDescription,

} from "../components/ui/Dialog";



import { Label } from "../components/ui/Label";



import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

} from "../components/ui/Select";



import { useHardwareInventoryStore } from "../store/useHardwareInventoryStore";



import { useRelocationStore } from "../store/useRelocationStore";



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

  MoveRight,

  Activity,

  Lock,

  Bookmark,

} from "lucide-react";



import { formatDate, formatCurrency, getStatusColor } from "../lib/utils";



import { toast } from "sonner";



import type { AuditLog } from "../lib/types";



export function ComponentDetailPage() {

  // Always call all hooks first, in the same order



  const { components, deleteComponent, updateComponent } = useComponentsStore();



  const {

    auditLogs,



    selectedId,



    navigate,



    currentUser,



    getRegionName,



    getWarehouseName,



    getComponentTypeName,



    getUserName,



    componentTypes,



    warehouses,

  } = useStore();



  const { createReservation } = useReservationsStore();



  const { hardwareInventory } = useHardwareInventoryStore();
  const { relocationRequests, fetchRelocationRequests } = useRelocationStore();



  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);



  const [isRelocateDialogOpen, setIsRelocateDialogOpen] = useState(false);

  const [isReserveDialogOpen, setIsReserveDialogOpen] = useState(false);



  const [reserveNote, setReserveNote] = useState("");

  const [relocationType, setRelocationType] = useState<

    "WAREHOUSE" | "HARDWARE"

  >("WAREHOUSE");

  const [selectedDestination, setSelectedDestination] = useState<string>("");

  const [relocationReason, setRelocationReason] = useState("");

  const [relocationUrgency, setRelocationUrgency] = useState("Medium");

  const [relocationNotes, setRelocationNotes] = useState("");

  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<AuditLog | null>(null);

  // Fetch relocation requests
  useEffect(() => {
    fetchRelocationRequests();
  }, []);



  // Early returns after all hooks are called



  if (!selectedId) {

    return (

      <div className="p-6 text-center">

        <p className="text-muted-foreground">No component selected.</p>



        <Button onClick={() => navigate("components")} className="mt-4">

          Back to Components

        </Button>

      </div>

    );

  }



  const component = components.find((c) => c.id === selectedId);



  if (!component || component.is_deleted) {

    return (

      <div className="p-6 text-center">

        <p className="text-muted-foreground">

          Component not found or has been deleted.

        </p>



        <Button onClick={() => navigate("components")} className="mt-4">

          Back to Components

        </Button>

      </div>

    );

  }



  const installedIn = component.installed_in_device_id

    ? hardwareInventory.find((i) => i.id === component.installed_in_device_id)

    : null;



  const getInstalledInLabel = () => {

    if (component.status !== "installed" || !component.installed_in_device_id) {

      return "—";

    }



    return installedIn?.name ?? "Unknown Device";

  };



  // Get relocation requests for this component
  const componentRelocationHistory = relocationRequests.filter(req => req.component_id === component.id);

  // Get all record_ids that have this component_id in their audit logs
  const relatedRecordIds = new Set(
    auditLogs
      .filter(log => log.new_value?.component_id === component.id || log.old_value?.component_id === component.id)
      .map(log => log.record_id)
  );

  const itemHistory = auditLogs.filter((log) =>
    log.record_id === component.id ||
    relatedRecordIds.has(log.record_id)
  );
  console.log('=== Component History Debug ===');
  console.log('Component ID:', component.id);
  console.log('Component Name:', component.name);
  console.log('Total Audit Logs:', auditLogs.length);
  console.log('Related Record IDs:', Array.from(relatedRecordIds));
  console.log('Filtered History Count:', itemHistory.length);
  console.log('Sample Audit Logs:', auditLogs.slice(0, 5).map(l => ({
    id: l.id,
    record_id: l.record_id,
    module: l.module,
    action: l.action,
    new_value_component_id: l.new_value?.component_id
  })));
  console.log('Matching Logs:', itemHistory.map(l => ({
    id: l.id,
    record_id: l.record_id,
    module: l.module,
    action: l.action,
    new_value_component_id: l.new_value?.component_id
  })));



  const handleDelete = async () => {

    if (component.installed_in_device_id) {

      toast.error("Cannot delete component that is installed in a device");



      return;

    }



    try {

      await deleteComponent(component.id);



      toast.success("Component deleted successfully");



      navigate("components");

    } catch (error) {

      console.error("Delete component error:", error);



      toast.error("Failed to delete component");

    }

  };



  const handleRelocateComponent = async () => {

    if (!selectedDestination) {

      console.log("No destination selected, returning");

      return;

    }



    try {

      const { createRelocationRequest } = useRelocationStore.getState();

      let relocationData: any = {

        requester_id: currentUser?.id || "",

        relocation_type: "COMPONENT",

        component_id: component.id,

        reason: relocationReason || `Relocate component ${component.name}`,

        urgency: relocationUrgency as

          | "Emergency"

          | "Critical"

          | "High"

          | "Medium"

          | "Low",

        notes: relocationNotes,

        status: "Pending PM Approval",

      };



      // Set source based on component location

      if (component.installed_in_device_id) {

        relocationData.source_server_id = component.installed_in_device_id;

        relocationData.source_warehouse_id = null;

        relocationData.source_region_id = null;

      } else {

        relocationData.source_server_id = null;

        relocationData.source_warehouse_id = component.warehouse_id;

        if (component.warehouse_id) {

          const sourceWarehouse = warehouses.find(

            (w) => w.id === component.warehouse_id,

          );

          relocationData.source_region_id = sourceWarehouse?.region_id || null;

        } else {

          relocationData.source_region_id = null;

        }

      }



      if (relocationType === "WAREHOUSE") {

        // Component to warehouse relocation

        relocationData.destination_type = "WAREHOUSE";

        relocationData.destination_warehouse_id = selectedDestination || null;

        relocationData.destination_server_id = null;

        const destinationWarehouse = warehouses.find(

          (w) => w.id === selectedDestination,

        );

        relocationData.destination_region_id =

          destinationWarehouse?.region_id || null;

      } else {

        // Component to hardware installation

        relocationData.destination_type = "HARDWARE";

        relocationData.destination_warehouse_id = null;

        relocationData.destination_server_id = selectedDestination || null;

        const destinationServer = hardwareInventory.find(

          (i) => i.id === selectedDestination,

        );

        const destinationWarehouse = destinationServer

          ? warehouses.find((w) => w.id === destinationServer.warehouse_id)

          : null;

        relocationData.destination_region_id =

          destinationWarehouse?.region_id || null;

      }



      console.log("Creating relocation request with data:", relocationData);

      await createRelocationRequest(relocationData);

      console.log("Relocation request created successfully");



      console.log("About to show success toast");

      // Add a small delay to ensure toast shows

      setTimeout(() => {

        toast.success("Component relocation request submitted");

        console.log("Success toast called");

      }, 100);

      setIsRelocateDialogOpen(false);

      console.log("Dialog closed");

      // Reset form state

      setRelocationReason("");

      setRelocationUrgency("Medium");

      setRelocationNotes("");

      setSelectedDestination("");

      setRelocationType("WAREHOUSE");

    } catch (error) {

      console.error("Error submitting relocation request:", error);

      toast.error("Failed to submit relocation request");

    }

  };



  const handleReserveComponent = async () => {

    if (!reserveNote.trim()) {

      toast.error("Please enter a note for the reservation");

      return;

    }



    try {

      // Create reservation (reserved_by is automatically set to authenticated user ID)

      await createReservation({

        component_id: component.id,

        hardware_inventory_id: null,

        note: reserveNote,

      });



      // Update component status to reserved

      await updateComponent(component.id, {

        status: "reserved",

      });



      toast.success("Component reserved successfully");

      setIsReserveDialogOpen(false);

      setReserveNote("");

    } catch (error) {

      console.error("Error reserving component:", error);

      toast.error("Failed to reserve component");

    }

  };



  return (

    <div className="p-6 max-w-[1600px] mx-auto space-y-6">

      <div className="flex items-start justify-between">

        <div className="flex items-start space-x-4">

          <Button

            variant="ghost"

            size="icon"

            onClick={() => navigate("components")}

          >

            <ArrowLeft className="h-5 w-5" />

          </Button>



          <div>

            <div className="flex items-start gap-3">

              <div className="min-w-0">
                <h1 className="text-3xl font-bold tracking-tight font-heading break-words max-w-[600px]">

                  {component.name}

                </h1>
              </div>

              <div className="flex items-center gap-1">
                <Badge variant="outline">

                  {getComponentTypeName(component.component_type_id || '')}

                </Badge>



                <Badge className={getStatusColor(component.status)}>

                  {component.status}

                </Badge>



                <Badge variant="secondary">{component.condition}</Badge>
              </div>

            </div>



            <p className="text-muted-foreground mt-1 break-words max-w-[600px]">

              {component.manufacturer} {component.model} • PN:{" "}

              {component.part_number || "—"}

            </p>


          </div>

        </div>



        {(currentUser?.role === "Admin" || currentUser?.role === "PM") && (

          <div className="flex items-center gap-2">

            <Button

              variant="outline"

              onClick={() => navigate("components-add", component.id)}

            >

              <Edit className="h-4 w-4 mr-2" />

              Edit

            </Button>



            {(currentUser?.role === "Admin") && (
              <AlertDialog

                open={isDeleteDialogOpen}

                onOpenChange={setIsDeleteDialogOpen}

              >

                <AlertDialog

                  open={isDeleteDialogOpen}

                  onOpenChange={setIsDeleteDialogOpen}

                >

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

                      className="bg-destructive text-white hover:bg-destructive/90"

                    >

                      Delete

                    </AlertDialogAction>

                  </AlertDialogFooter>

                </AlertDialogContent>

              </AlertDialog>

            )}
          </div>

        )}

      </div>



      <Tabs defaultValue="overview" className="w-full">

        <div className="flex items-center justify-between">

          <TabsList className="grid w-full grid-cols-3 max-w-md">

            <TabsTrigger value="overview">Overview</TabsTrigger>



            <TabsTrigger value="specifications">Specifications</TabsTrigger>



            <TabsTrigger value="history">History</TabsTrigger>

          </TabsList>



          <div className="flex items-center gap-3">

            {/* {component.status !== 'reserved' && (

              <Button

                variant="outline"

                onClick={() => setIsRelocateDialogOpen(true)}

              >

                <Package className="h-4 w-4 mr-2" />

                Relocate

              </Button>

            )} */}



            {currentUser?.role === "Admin" && component.status === 'available' && (

              <Button onClick={() => setIsReserveDialogOpen(true)} variant="outline">

                <Bookmark className="h-4 w-4 mr-2" />

                Reserve

              </Button>

            )}

          </div>

        </div>



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

                    {getRegionName(component.region_id || '')}

                  </span>

                </div>



                <div className="grid grid-cols-3 text-sm">

                  <span className="text-muted-foreground">Warehouse:</span>



                  <span className="col-span-2 font-medium">

                    {getWarehouseName(component.warehouse_id || '')}

                  </span>

                </div>



                <div className="grid grid-cols-3 text-sm">

                  <span className="text-muted-foreground">Status:</span>



                  <span className="col-span-2 font-medium">
                    <Badge className={getStatusColor(component.status)}>
                      {component.status}
                    </Badge>
                  </span>

                </div>



                <div className="grid grid-cols-3 text-sm">

                  <span className="text-muted-foreground">Installed In:</span>

                  <span className="col-span-2 font-medium">

                    {getInstalledInLabel()}

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



                {/* <div className="grid grid-cols-3 text-sm">

                  <span className="text-muted-foreground">Model:</span>



                  <span className="col-span-2 font-medium">

                    {component.model}

                  </span>

                </div> */}



                <div className="grid grid-cols-3 text-sm">

                  <span className="text-muted-foreground">Part Number:</span>



                  <span className="col-span-2 font-medium">

                    {component.part_number}

                  </span>

                </div>



                <div className="grid grid-cols-3 text-sm">

                  <span className="text-muted-foreground">

                    Compatible With:

                  </span>



                  <span className="col-span-2 font-medium">

                    {component.compatible_with || "—"}

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

                {component.compatible_with ? (

                  <div>

                    <p className="text-sm font-medium mb-1">Compatible With:</p>



                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border">

                      {component.compatible_with}

                    </p>

                  </div>

                ) : (

                  <p className="text-sm text-muted-foreground">

                    No compatibility information recorded.

                  </p>

                )}

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

                    (ct) => ct.id === component.component_type_id,

                  );



                  const fieldMap = new Map(

                    componentType?.fields?.map((field) => [

                      field.id,

                      field.label,

                    ]) || [],

                  );



                  return Object.entries(component.specifications || {}).map(

                    ([key, value]) => {

                      const label = fieldMap.get(key) || key.replace(/_/g, " ");



                      return (

                        <div

                          key={key}

                          className="border-b border-border/50 pb-2"

                        >

                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">

                            {label}

                          </p>



                          <p className="font-medium text-sm">

                            {Array.isArray(value)

                              ? value.join(", ")

                              : String(value || "—")}

                          </p>

                        </div>

                      );

                    },

                  );

                })()}



                {Object.keys(component.specifications || {}).length === 0 && (

                  <p className="text-muted-foreground text-sm col-span-full">

                    No specifications recorded.

                  </p>

                )}

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
                Relocation request history for this component
              </CardDescription>
            </CardHeader>

            <CardContent>
              {componentRelocationHistory.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Request Number
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          From
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          To
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Requested By
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Created Date
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          PM Approval
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Admin Approval
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {componentRelocationHistory.map((req, idx) => {
                        const fromLabel = req.source_server_id
                          ? `Device: ${hardwareInventory.find((i) => i.id === req.source_server_id)?.name ?? req.source_server_id}`
                          : req.source_warehouse_id
                            ? `${getRegionName(req.source_region_id ?? "")} › ${getWarehouseName(req.source_warehouse_id)}`
                            : getRegionName(req.source_region_id) || "—";

                        const toLabel = req.destination_server_id
                          ? `Device: ${hardwareInventory.find((i) => i.id === req.destination_server_id)?.name ?? req.destination_server_id}`
                          : req.destination_warehouse_id
                            ? `${getRegionName(req.destination_region_id ?? "")} › ${getWarehouseName(req.destination_warehouse_id)}`
                            : getRegionName(req.destination_region_id) || "—";

                        const statusColor = req.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : req.status === 'Approved' ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : req.status.includes('Rejected') ? 'bg-red-50 text-red-700 border-red-200'
                              : req.status.includes('Pending') ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200';

                        return (
                          <tr
                            key={req.id}
                            className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                          >
                            <td className="px-4 py-3 text-sm font-medium">
                              {req.request_number}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={statusColor}>
                                {req.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm min-w-[200px] break-words" title={fromLabel}>
                              {fromLabel}
                            </td>
                            <td className="px-4 py-3 text-sm min-w-[200px] break-words" title={toLabel}>
                              {toLabel}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {getUserName(req.requester_id)}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {formatDate(req.created_at)}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {req.pm_reviewed_by ? (
                                <div className="space-y-1">
                                  <div className="font-medium">{getUserName(req.pm_reviewed_by)}</div>
                                  {req.pm_reviewed_at && <div className="text-muted-foreground">{formatDate(req.pm_reviewed_at)}</div>}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {req.admin_reviewed_by ? (
                                <div className="space-y-1">
                                  <div className="font-medium">{getUserName(req.admin_reviewed_by)}</div>
                                  {req.admin_reviewed_at && <div className="text-muted-foreground">{formatDate(req.admin_reviewed_at)}</div>}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
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
                  <p className="font-medium">No relocation history yet.</p>
                  <p className="text-xs mt-1">
                    History is recorded when relocation requests are created for this component.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>



      {/* History detail drill-down dialog */}



      {selectedHistoryEntry &&

        (() => {

          const entry = selectedHistoryEntry;



          return (

            <Dialog

              open={!!selectedHistoryEntry}

              onOpenChange={(open) => {

                if (!open) setSelectedHistoryEntry(null);

              }}

            >

              <DialogContent className="max-w-lg">

                <DialogHeader>

                  <DialogTitle className="flex items-center gap-2">

                    <Activity className="h-5 w-5 text-muted-foreground" />

                    Audit Log Detail

                  </DialogTitle>

                </DialogHeader>



                <div className="space-y-4 pt-2">

                  <div className="flex items-center gap-2">

                    <Badge

                      variant="outline"

                      className={

                        entry.action === "CREATE"

                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"

                          : entry.action === "UPDATE"

                            ? "bg-blue-50 text-blue-700 border-blue-200"

                            : entry.action === "DELETE"

                              ? "bg-red-50 text-red-700 border-red-200"

                              : "bg-gray-50 text-gray-700 border-gray-200"

                      }

                    >

                      {entry.action}

                    </Badge>



                    <span className="text-sm text-muted-foreground">

                      {new Date(entry.timestamp).toLocaleString()}

                    </span>

                  </div>



                  <div className="rounded-lg border p-3 space-y-2">

                    <div className="grid grid-cols-2 text-sm">

                      <span className="text-muted-foreground">Module</span>

                      <span className="font-medium">{entry.module}</span>

                    </div>



                    <div className="grid grid-cols-2 text-sm">

                      <span className="text-muted-foreground">User</span>

                      <span className="font-medium">{getUserName(entry.user_id)}</span>

                    </div>



                    <div className="grid grid-cols-2 text-sm">

                      <span className="text-muted-foreground">IP Address</span>

                      <span className="font-medium">{entry.ip_address}</span>

                    </div>

                  </div>



                  {entry.old_value && (

                    <div className="rounded-lg border p-3 space-y-2">

                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">

                        Old Value

                      </p>

                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap break-all">

                        {JSON.stringify(entry.old_value, null, 2)}

                      </pre>

                    </div>

                  )}



                  {entry.new_value && (

                    <div className="rounded-lg border p-3 space-y-2">

                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">

                        New Value

                      </p>

                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap break-all">

                        {JSON.stringify(entry.new_value, null, 2)}

                      </pre>

                    </div>

                  )}

                </div>

              </DialogContent>

            </Dialog>

          );

        })()}



      <Dialog

        open={isRelocateDialogOpen}

        onOpenChange={setIsRelocateDialogOpen}

      >

        <DialogContent>

          <DialogHeader>

            <DialogTitle>Relocate Component</DialogTitle>

            <DialogDescription>

              Select destination for component relocation

            </DialogDescription>

          </DialogHeader>



          {/* Relocation Type Selection */}

          <div className="space-y-2">

            <Label>Relocation Type</Label>

            <Select

              value={relocationType}

              onValueChange={(value) =>

                setRelocationType(value as "WAREHOUSE" | "HARDWARE")

              }

            >

              <SelectTrigger>

                {relocationType === "WAREHOUSE"

                  ? "Warehouse"

                  : "Hardware Inventory"}

              </SelectTrigger>

              <SelectContent>

                <SelectItem value="WAREHOUSE">Warehouse</SelectItem>

                <SelectItem value="HARDWARE">Hardware Inventory</SelectItem>

              </SelectContent>

            </Select>

          </div>



          {/* Destination Selection - Conditional */}

          {relocationType === "WAREHOUSE" ? (

            <div className="space-y-2">

              <Label>Destination Warehouse</Label>

              <Select

                value={selectedDestination}

                onValueChange={setSelectedDestination}

              >

                <SelectTrigger>

                  {selectedDestination

                    ? warehouses.find((w) => w.id === selectedDestination)

                      ?.name || "Select warehouse"

                    : "Select warehouse"}

                </SelectTrigger>

                <SelectContent>

                  {warehouses.map((w) => (

                    <SelectItem key={w.id} value={w.id}>

                      {w.name} ({getRegionName(w.region_id)})

                    </SelectItem>

                  ))}

                </SelectContent>

              </Select>

            </div>

          ) : (

            <div className="space-y-2">

              <Label>Destination Hardware</Label>

              <Select

                value={selectedDestination}

                onValueChange={setSelectedDestination}

              >

                <SelectTrigger>

                  {selectedDestination

                    ? hardwareInventory.find(

                      (h) => h.id === selectedDestination,

                    )?.name || "Select hardware"

                    : "Select hardware"}

                </SelectTrigger>

                <SelectContent>

                  {hardwareInventory.map((h) => (

                    <SelectItem key={h.id} value={h.id}>

                      {h.name} ({h.item_type})

                    </SelectItem>

                  ))}

                </SelectContent>

              </Select>

            </div>

          )}



          <div className="space-y-4">

            {/* Reason */}

            <div className="space-y-2">

              <Label>Reason</Label>

              <textarea

                className="w-full p-2 border rounded-md"

                rows={3}

                placeholder="Enter reason for relocation..."

                value={relocationReason}

                onChange={(e) => setRelocationReason(e.target.value)}

              />

            </div>



            {/* Urgency */}

            <div className="space-y-2">

              <Label>Urgency</Label>

              <Select

                value={relocationUrgency}

                onValueChange={setRelocationUrgency}

              >

                <SelectTrigger>{relocationUrgency}</SelectTrigger>

                <SelectContent>

                  <SelectItem value="Emergency">Emergency</SelectItem>

                  <SelectItem value="Critical">Critical</SelectItem>

                  <SelectItem value="High">High</SelectItem>

                  <SelectItem value="Medium">Medium</SelectItem>

                  <SelectItem value="Low">Low</SelectItem>

                </SelectContent>

              </Select>

            </div>



            {/* Notes */}

            <div className="space-y-2">

              <Label>Additional Notes</Label>

              <textarea

                className="w-full p-2 border rounded-md"

                rows={2}

                placeholder="Additional notes (optional)..."

                value={relocationNotes}

                onChange={(e) => setRelocationNotes(e.target.value)}

              />

            </div>

          </div>



          {/* Dialog Actions */}

          <div className="flex justify-end gap-2 pt-4">

            <Button

              variant="outline"

              onClick={() => setIsRelocateDialogOpen(false)}

            >

              Cancel

            </Button>

            <Button

              onClick={handleRelocateComponent}

              disabled={!selectedDestination}

            >

              Submit Relocation

            </Button>

          </div>

        </DialogContent>

      </Dialog>



      {/* Reserve Dialog */}

      <Dialog

        open={isReserveDialogOpen}

        onOpenChange={setIsReserveDialogOpen}

      >

        <DialogContent>

          <DialogHeader>

            <DialogTitle>Reserve Component</DialogTitle>

            <DialogDescription>

              Add a note explaining why this component is being reserved

            </DialogDescription>

          </DialogHeader>



          <div className="space-y-4">

            <div className="space-y-2">

              <Label>Note <span className="text-destructive">*</span></Label>

              <textarea

                className="w-full p-2 border rounded-md"

                rows={4}

                placeholder="Enter reason for reservation..."

                value={reserveNote}

                onChange={(e) => setReserveNote(e.target.value)}

              />

            </div>

          </div>



          <div className="flex justify-end gap-2 pt-4">

            <Button

              variant="outline"

              onClick={() => setIsReserveDialogOpen(false)}

            >

              Cancel

            </Button>

            <Button

              onClick={handleReserveComponent}

              disabled={!reserveNote.trim()}

            >

              Reserve

            </Button>

          </div>

        </DialogContent>

      </Dialog>

    </div>





  );

}

