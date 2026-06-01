import React, { useState, Component, useEffect } from "react";
import { useStore } from "../store/useStore";
import { useHardwareInventoryStore } from "../store/useHardwareInventoryStore";
import { useComponentsStore } from "../store/useComponentsStore";
import { useReservationsStore } from "../store/useReservationStore";
import { useRelocationStore } from "../store/useRelocationStore";
import { RelocationRequestDialog } from "../components/RelocationRequestDialog";
import { ComponentRelocationDialog } from "../components/ComponentRelocationDialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/Table";
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
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  Server,
  MapPin,
  Calendar,
  Shield,
  Cpu,
  Activity,
  Eye,
  Bookmark,
  History,
  ArrowRight,
  Check,
  Puzzle,
} from "lucide-react";
import { Checkbox } from "../components/ui/Checkbox";
import { formatDate, formatCurrency, getStatusColor } from "../lib/utils";
import { toast } from "sonner";
export function InventoryDetailPage() {
  const { hardwareInventory, fetchHardwareInventory, deleteHardwareInventory, updateHardwareInventory } =
    useHardwareInventoryStore();
  const { components } = useComponentsStore();
  const { createReservation } = useReservationsStore();
  const { relocationRequests, fetchRelocationRequests, createBatchComponentRelocationRequests } = useRelocationStore();
  const {
    auditLogs,
    selectedId,
    navigate,
    currentUser,
    getRegionName,
    getWarehouseName,
    getComponentTypeName,
    getUserName,
    regions,
    getWarehousesByRegion,
  } = useStore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isRelocationDialogOpen, setIsRelocationDialogOpen] = useState(false);
  const [isReserveDialogOpen, setIsReserveDialogOpen] = useState(false);
  const [reserveNote, setReserveNote] = useState("");
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<any>(null);

  // Multi-select for batch component relocation
  const [selectedComponentIds, setSelectedComponentIds] = useState<Set<string>>(new Set());
  const [isBatchRelocationDialogOpen, setIsBatchRelocationDialogOpen] = useState(false);

  // Data is already fetched by fetchAppData() in useStore.ts during app initialization
  // Relocation requests need to be fetched separately
  useEffect(() => {
    fetchRelocationRequests();
  }, []);

  // Restore selectedId from sessionStorage immediately
  const effectiveSelectedId =
    selectedId || sessionStorage.getItem("ims-selected-id");

  // Trigger navigation if ID was restored from sessionStorage
  useEffect(() => {
    if (!selectedId && effectiveSelectedId) {
      navigate("inventory-detail", effectiveSelectedId);
    }
  }, [selectedId, effectiveSelectedId, navigate]);

  if (!effectiveSelectedId) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">No item selected.</p>
        <Button onClick={() => navigate("inventory")} className="mt-4">
          Back to Inventory
        </Button>
      </div>
    );
  }

  const item = hardwareInventory.find((i) => i.id === effectiveSelectedId);

  // Show loading if hardwareInventory is empty but we have an ID
  if (hardwareInventory.length === 0 && effectiveSelectedId) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!item || item.is_deleted) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">
          Item not found or has been deleted.
        </p>
        <Button onClick={() => navigate("inventory")} className="mt-4">
          Back to Inventory
        </Button>
      </div>
    );
  }
  const installedComponents = components.filter(
    (c) => c.installed_in_device_id === item.id && !c.is_deleted,
  );
  // Get relocation requests for this inventory item
  const itemRelocationHistory = relocationRequests.filter(req => req.inventory_id === item.id);

  // Get all record_ids that have this inventory_id or server_id in their audit logs
  const relatedRecordIds = new Set(
    auditLogs
      .filter(log =>
        log.new_value?.inventory_id === item.id ||
        log.old_value?.inventory_id === item.id ||
        log.new_value?.source_server_id === item.id ||
        log.old_value?.source_server_id === item.id ||
        log.new_value?.destination_server_id === item.id ||
        log.old_value?.destination_server_id === item.id
      )
      .map(log => log.record_id)
  );

  // Add relocation request IDs that are linked to this inventory item
  const relatedRelocationRequestIds = relocationRequests
    .filter(req => req.inventory_id === item.id)
    .map(req => req.id);
  relatedRelocationRequestIds.forEach(id => relatedRecordIds.add(id));

  const itemHistory = auditLogs.filter((log) =>
    (log.record_id === item.id || relatedRecordIds.has(log.record_id)) &&
    // Exclude component-specific logs
    !log.new_value?.component_id &&
    !log.old_value?.component_id
  );
  console.log('=== Inventory History Debug ===');
  console.log('Inventory ID:', item.id);
  console.log('Inventory Name:', item.name);
  console.log('Total Audit Logs:', auditLogs.length);
  console.log('Related Record IDs:', Array.from(relatedRecordIds));
  console.log('Filtered History Count:', itemHistory.length);
  console.log('Sample Audit Logs:', auditLogs.slice(0, 5).map(l => ({
    id: l.id,
    record_id: l.record_id,
    module: l.module,
    action: l.action,
    new_value_inventory_id: l.new_value?.inventory_id,
    new_value_source_server_id: l.new_value?.source_server_id,
    new_value_destination_server_id: l.new_value?.destination_server_id,
    new_value_component_id: l.new_value?.component_id
  })));
  console.log('Matching Logs:', itemHistory.map(l => ({
    id: l.id,
    record_id: l.record_id,
    module: l.module,
    action: l.action
  })));
  const handleDelete = () => {
    if (installedComponents.length > 0) {
      toast.error(
        `Cannot delete: ${installedComponents.length} components are currently installed in this device.`,
      );
      setIsDeleteDialogOpen(false);
      return;
    }
    // In a real app, we'd also check for pending requests here
    deleteHardwareInventory(item.id);
    toast.success("Item deleted successfully");
    navigate("inventory");
  };

  const handleReserveInventory = async () => {
    if (!reserveNote.trim()) {
      toast.error("Please enter a note for the reservation");
      return;
    }

    try {
      // Create reservation (reserved_by is automatically set to authenticated user ID)
      await createReservation({
        component_id: null,
        hardware_inventory_id: item.id,
        note: reserveNote,
      });

      // Update inventory status to reserved
      await updateHardwareInventory(item.id, {
        status: "reserved",
      });

      toast.success("Inventory item reserved successfully");
      setIsReserveDialogOpen(false);
      setReserveNote("");
    } catch (error) {
      console.error("Error reserving inventory:", error);
      toast.error("Failed to reserve inventory");
    }
  };

  const handleBatchRelocationSuccess = () => {
    setSelectedComponentIds(new Set());
    fetchRelocationRequests();
  };
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("inventory")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight font-heading">
                {item.name}
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

        {(currentUser?.role === "Admin" || currentUser?.role === "PM") && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("inventory-add", effectiveSelectedId)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>

            {(currentUser?.role === "Admin") && (
              <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
              >
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
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            {/* <TabsTrigger value="network">Network</TabsTrigger> */}
            <TabsTrigger value="components">
              Components
              <Badge variant="secondary" className="ml-2 bg-background/50">
                {installedComponents.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            {(currentUser?.role === "Admin" ||
              currentUser?.role === "Engineer") &&
              item.status !== 'reserved' && (
                <Button
                  variant="outline"
                  onClick={() => setIsRelocationDialogOpen(true)}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Relocate
                </Button>
              )}

            {currentUser?.role === "Admin" &&
              item.status !== 'reserved' && (
                <Button variant="outline" onClick={() => setIsReserveDialogOpen(true)}>
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
                  <Server className="h-5 w-5 mr-2 text-muted-foreground" />
                  Basic Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="col-span-2 font-medium">{item.name}</span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="col-span-2 font-medium">
                    {item.item_type}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Manufacturer:</span>
                  <span className="col-span-2 font-medium">
                    {item.manufacturer}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Model:</span>
                  <span className="col-span-2 font-medium">{item.model}</span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Serial:</span>
                  <span className="col-span-2 font-medium font-mono">
                    {item.serial_number}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Asset Tag:</span>
                  <span className="col-span-2 font-medium">
                    {item.asset_tag || "—"}
                  </span>
                </div>
              </CardContent>
            </Card>

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
                    {item.region_id ? getRegionName(item.region_id) : "—"}
                  </span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Warehouse:</span>
                  <span className="col-span-2 font-medium">
                    {item.warehouse_id
                      ? getWarehouseName(item.warehouse_id)
                      : "—"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-muted-foreground" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="col-span-2 font-medium">{item.status}</span>
                </div>
                <div className="grid grid-cols-3 text-sm">
                  <span className="text-muted-foreground">Condition:</span>
                  <span className="col-span-2 font-medium">
                    {item.condition}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="specifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Hardware Specifications</CardTitle>
              <CardDescription>
                Detailed technical specifications for this{" "}
                {item.item_type.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                {Object.entries(item.specifications || {}).map(
                  ([key, value]) => (
                    <div key={key} className="border-b border-border/50 pb-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        {key.replace(/_/g, " ")}
                      </p>
                      <p className="font-medium text-sm">
                        {Array.isArray(value)
                          ? value.join(", ")
                          : String(value || "—")}
                      </p>
                    </div>
                  ),
                )}
                {Object.keys(item.specifications || {}).length === 0 && (
                  <p className="text-muted-foreground text-sm col-span-full">
                    No specifications recorded.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* <TabsContent value="network" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Network Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                {Object.entries(item.network_config || {}).map(
                  ([key, value]) => (
                    <div key={key} className="border-b border-border/50 pb-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        {key.replace(/_/g, " ")}
                      </p>
                      <p className="font-medium text-sm font-mono">
                        {String(value || "—")}
                      </p>
                    </div>
                  ),
                )}
                {Object.keys(item.network_config || {}).length === 0 && (
                  <p className="text-muted-foreground text-sm col-span-full">
                    No network configuration recorded.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent> */}

        <TabsContent value="components" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Installed Components</CardTitle>
                <CardDescription>
                  Hardware components currently installed in this device
                </CardDescription>
              </div>
              {(currentUser?.role === "Admin" ||
                currentUser?.role === "Engineer") && (
                  <>
                    {selectedComponentIds.size > 0 && (
                      <div>
                        <Button
                          variant="outline"
                          onClick={() => setIsBatchRelocationDialogOpen(true)}
                        >
                          <Puzzle className="h-4 w-4 mr-2" />
                          Relocate ({selectedComponentIds.size})

                        </Button>
                      </div>

                    )}
                  </>
                )}
            </CardHeader>
            <CardContent>
              {installedComponents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedComponentIds.size === installedComponents.length && installedComponents.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedComponentIds(new Set(installedComponents.map(c => c.id)));
                            } else {
                              setSelectedComponentIds(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Component</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Manufacturer</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Part Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installedComponents.map((comp) => (
                      <TableRow
                        key={comp.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          if (currentUser?.role === "Admin" || currentUser?.role === "Engineer") {
                            const newSelected = new Set(selectedComponentIds);
                            if (newSelected.has(comp.id)) {
                              newSelected.delete(comp.id);
                            } else {
                              newSelected.add(comp.id);
                            }
                            setSelectedComponentIds(newSelected);
                          }
                        }}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedComponentIds.has(comp.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedComponentIds);
                              if (checked) {
                                newSelected.add(comp.id);
                              } else {
                                newSelected.delete(comp.id);
                              }
                              setSelectedComponentIds(newSelected);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {comp.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getComponentTypeName(comp.component_type_id || '')}
                          </Badge>
                        </TableCell>
                        <TableCell>{comp.manufacturer || "—"}</TableCell>
                        <TableCell>{comp.model || "—"}</TableCell>
                        <TableCell>{comp.part_number || "—"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(comp.status)}>
                            {comp.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              navigate("component-detail", comp.id)
                            }
                            className="text-[#3a4a85] h-8 px-2"
                            title="View Detail"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Cpu className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No components currently installed.</p>
                </div>
              )}
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
                Relocation request history for this inventory item
              </CardDescription>
            </CardHeader>

            <CardContent>
              {itemRelocationHistory.length > 0 ? (
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
                      {itemRelocationHistory.map((req, idx) => {
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
                            <td className="px-4 py-3 text-sm max-w-[180px] truncate" title={fromLabel}>
                              {fromLabel}
                            </td>
                            <td className="px-4 py-3 text-sm max-w-[180px] truncate" title={toLabel}>
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
                    History is recorded when relocation requests are created for this item.
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

      <RelocationRequestDialog
        open={isRelocationDialogOpen}
        onOpenChange={setIsRelocationDialogOpen}
        inventoryId={item.id}
        sourceRegionId={item.region_id || ""}
        sourceWarehouseId={item.warehouse_id || ""}
      />

      {/* Reserve Dialog */}
      <Dialog
        open={isReserveDialogOpen}
        onOpenChange={setIsReserveDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reserve Inventory Item</DialogTitle>
            <DialogDescription>
              Add a note explaining why this inventory item is being reserved
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reservation Note</label>
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
              onClick={handleReserveInventory}
              disabled={!reserveNote.trim()}
            >
              Reserve
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Component Relocation Dialog */}
      <ComponentRelocationDialog
        open={isBatchRelocationDialogOpen}
        onOpenChange={setIsBatchRelocationDialogOpen}
        selectedComponentIds={Array.from(selectedComponentIds)}
        onSuccess={handleBatchRelocationSuccess}
      />
    </div>
  );
}
