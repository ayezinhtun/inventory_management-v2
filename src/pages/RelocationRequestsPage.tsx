import React, { useState, Component, useEffect, useMemo } from "react";
import { useStore } from "../store/useStore";
import { useRelocationStore } from "../store/useRelocationStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/Dialog";
import { Textarea } from "../components/ui/Textarea";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { ScrollArea } from "../components/ui/ScrollArea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/Select";
import {
  Plus,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  Truck,
  ChevronDown,
  ChevronRight,
  Wrench,
} from "lucide-react";
import { formatDate, getStatusColor, getUrgencyColor } from "../lib/utils";
import { toast } from "sonner";
import type { Urgency, RelocationType } from "../lib/types";
import { useHardwareInventoryStore } from "../store/useHardwareInventoryStore";
import { useComponentsStore } from "../store/useComponentsStore";

interface RelocationRequestsPageProps {
  pmView?: boolean;
  adminView?: boolean;
  engineerView?: boolean;
}
export function RelocationRequestsPage({
  pmView,
  adminView,
  engineerView,
}: RelocationRequestsPageProps) {
  const {
    currentUser,
    getUserName,
    getWarehouseName,
    getRegionName,
    regions,
    warehouses,
    getWarehousesByRegion,
    fetchAppData,
  } = useStore();

  const { hardwareInventory } = useHardwareInventoryStore();
  const { components } = useComponentsStore();

  const {
    relocationRequests,
    approveRelocationPM,
    rejectRelocationPM,
    approveRelocationAdmin,
    rejectRelocationAdmin,
    approveRelocationPMBatch,
    rejectRelocationPMBatch,
    completeRelocation,
    createRelocationRequest,
    fetchRelocationRequests,
  } = useRelocationStore();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [comments, setComments] = useState("");
  const [batchComments, setBatchComments] = useState<{ [key: string]: string }>(
    {},
  );
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(
    new Set(),
  );
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<
    "Approve" | "Reject" | "Complete" | null
  >(null);

  // Fetch hardware inventory on component mount
  useEffect(() => {
    const { fetchHardwareInventory } = useHardwareInventoryStore.getState();
    fetchHardwareInventory();
  }, []);

  useEffect(() => {
    const { fetchComponents } = useComponentsStore.getState();
    fetchComponents();
  }, []);

  // Fetch app data (including users) on component mount
  useEffect(() => {
    fetchAppData();
  }, [fetchAppData]);

  // Fetch relocation requests on component mount
  useEffect(() => {
    fetchRelocationRequests();
  }, [fetchRelocationRequests]);

  // Create Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    relocation_type: "INVENTORY" as RelocationType,
    inventory_id: "",
    component_id: "",
    quantity: 1,
    destination_region_id: "",
    destination_warehouse_id: "",
    destination_server_id: "",
    reason: "",
    urgency: "Medium" as Urgency,
    notes: "",
  });

  if (!currentUser) return null;

  // Filter requests based on view and role
  let visibleRequests = relocationRequests;
  let pageTitle = "Relocation Requests";
  let pageDescription =
    "Track your inventory and component relocation requests";

  if (pmView) {
    pageTitle = "PM Relocation Requests";
    pageDescription = "View pending PM approval and PM-approved requests";
    visibleRequests = relocationRequests.filter(
      (r) =>
        r.status === "Pending PM Approval" ||
        r.status === "Pending Admin Approval" ||
        r.status === "Approved" ||
        r.status === "Rejected by PM" ||
        r.status === "Rejected by Admin",
    );
  } else if (adminView) {
    pageTitle = "Admin Relocation Requests";
    pageDescription = "View requests pending admin approval";

    visibleRequests = relocationRequests.filter(
      (r) =>
        r.status === "Pending Admin Approval" ||
        r.status === "Approved" ||
        r.status === "Rejected by Admin",
    );
  } else if (engineerView) {
    pageTitle = "Engineer Relocation Requests";
    pageDescription = "View your relocation requests and assigned tasks";
    // Engineer should see "Pending PM Approval" requests (their own or assigned)
    visibleRequests = relocationRequests.filter(
      (r) =>
        r.requester_id === currentUser.id ||
        r.assigned_to === currentUser.id ||
        r.status === "Pending PM Approval", // Engineers can see pending PM approvals
    );
  } else {
    // Default view - show all requests
    visibleRequests = relocationRequests;
  }

  // Group all PM-relevant requests by time window and destination for batch display
  const pendingPMRequests = visibleRequests.filter(
    (r) =>
      r.status === "Pending PM Approval" ||
      r.status === "Pending Admin Approval" ||
      r.status === "Approved" ||
      r.status === "Rejected by PM" ||
      r.status === "Rejected by Admin",
  );
  const groupedPMRequests = useMemo(() => {
    const groups = new Map();
    pendingPMRequests.forEach((req: any) => {
      // Create a key based on destination and time window (1 minute)
      const timeWindow = Math.floor(new Date(req.created_at).getTime() / 60000); // 1 minute window
      const key = `${req.destination_region_id}-${req.destination_warehouse_id}-${req.destination_server_id || "none"}-${timeWindow}`;

      if (!groups.has(key)) {
        groups.set(key, {
          destination_region_id: req.destination_region_id,
          destination_warehouse_id: req.destination_warehouse_id,
          destination_server_id: req.destination_server_id,
          relocation_type: req.relocation_type,
          urgency: req.urgency,
          reason: req.reason,
          requests: [],
        });
      }
      groups.get(key).requests.push(req);
    });
    return Array.from(groups.values());
  }, [pendingPMRequests]);

  // Group engineer requests by time window and destination for batch display
  const engineerRequests = engineerView ? visibleRequests : [];
  const groupedEngineerRequests = useMemo(() => {
    const groups = new Map();
    engineerRequests.forEach((req: any) => {
      // Create a key based on destination and time window (1 minute)
      const timeWindow = Math.floor(new Date(req.created_at).getTime() / 60000); // 1 minute window
      const key = `${req.destination_region_id}-${req.destination_warehouse_id}-${req.destination_server_id || "none"}-${timeWindow}`;

      if (!groups.has(key)) {
        groups.set(key, {
          destination_region_id: req.destination_region_id,
          destination_warehouse_id: req.destination_warehouse_id,
          destination_server_id: req.destination_server_id,
          relocation_type: req.relocation_type,
          urgency: req.urgency,
          reason: req.reason,
          requests: [],
        });
      }
      groups.get(key).requests.push(req);
    });
    return Array.from(groups.values());
  }, [engineerRequests]);

  const toggleBatchExpand = (groupKey: string) => {
    const newExpanded = new Set(expandedBatches);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedBatches(newExpanded);
  };

  const handlePMApproveBatch = async (groupKey: string) => {
    try {
      const group = groupedPMRequests.find((g) => {
        const timeWindow = Math.floor(
          new Date(g.requests[0].created_at).getTime() / 60000,
        );
        const key = `${g.destination_region_id}-${g.destination_warehouse_id}-${g.destination_server_id || "none"}-${timeWindow}`;
        return key === groupKey;
      });
      if (group) {
        // Only approve requests with "Pending PM Approval" status
        const pendingRequests = group.requests.filter((r: any) => r.status === "Pending PM Approval");
        if (pendingRequests.length === 0) {
          toast.error("No pending PM approval requests in this batch");
          return;
        }
        const requestIds = pendingRequests.map((r: any) => r.id);
        await approveRelocationPMBatch(
          requestIds,
          batchComments[groupKey] || "",
        );
        toast.success("Batch relocation approved");
      }
    } catch (error) {
      toast.error("Failed to approve batch relocation");
    }
  };

  const handlePMRejectBatch = async (groupKey: string) => {
    try {
      const group = groupedPMRequests.find((g) => {
        const timeWindow = Math.floor(
          new Date(g.requests[0].created_at).getTime() / 60000,
        );
        const key = `${g.destination_region_id}-${g.destination_warehouse_id}-${g.destination_server_id || "none"}-${timeWindow}`;
        return key === groupKey;
      });
      if (group) {
        // Only reject requests with "Pending PM Approval" status
        const pendingRequests = group.requests.filter((r: any) => r.status === "Pending PM Approval");
        if (pendingRequests.length === 0) {
          toast.error("No pending PM approval requests in this batch");
          return;
        }
        const requestIds = pendingRequests.map((r: any) => r.id);
        await rejectRelocationPMBatch(
          requestIds,
          batchComments[groupKey] || "",
        );
        toast.success("Batch relocation request rejected");
      }
    } catch (error) {
      toast.error("Failed to reject batch request");
    }
  };

  const handleAction = async () => {
    if (!selectedRequest || !reviewAction) return;
    try {
      if (pmView) {
        if (reviewAction === "Approve")
          await approveRelocationPM(selectedRequest, comments);
        else await rejectRelocationPM(selectedRequest, comments);
        console.log("Comments being sent:", comments);
      } else if (adminView) {
        if (reviewAction === "Approve")
          await approveRelocationAdmin(selectedRequest, comments);
        else await rejectRelocationAdmin(selectedRequest, comments);
        console.log("Comments being sent:", comments);
      }
      toast.success(`Request ${reviewAction.toLowerCase()}d successfully`);
      setIsReviewDialogOpen(false);
      setSelectedRequest(null);
      setComments("");
      setReviewAction(null);
    } catch (error) {
      console.error("Action failed:", error);
      toast.error(`Failed to ${reviewAction.toLowerCase()} request`);
    }
  };
  const openDialog = (
    id: string,
    action: "Approve" | "Reject" | "Complete",
  ) => {
    setSelectedRequest(id);
    setReviewAction(action);
    setComments("");
    setIsReviewDialogOpen(true);
  };
  const handleCreate = () => {
    const isInventory = formData.relocation_type === "INVENTORY";
    if (
      (isInventory && !formData.inventory_id) ||
      (!isInventory && !formData.component_id) ||
      !formData.destination_region_id ||
      !formData.destination_warehouse_id ||
      !formData.reason
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    let sourceRegion = "";
    let sourceWarehouse = "";
    let sourceServer = "";
    if (isInventory) {
      const item = hardwareInventory.find(
        (i) => i.id === formData.inventory_id,
      );
      if (item) {
        sourceRegion = item.region_id || "";
        sourceWarehouse = item.warehouse_id || "";
      }
    } else {
      console.log("Components array length:", components.length);
      console.log("Selected component_id:", formData.component_id);
      const comp = components.find((c) => c.id === formData.component_id);
      console.log("Found component:", comp);
      if (comp) {
        console.log(
          "Component installed_in_device_id:",
          comp.installed_in_device_id,
        );
      }
      if (comp) {
        sourceRegion = comp.region_id || "";
        sourceWarehouse = comp.warehouse_id || "";
        sourceServer = comp.installed_in_device_id || "";
      }
    }
    createRelocationRequest({
      relocation_type: formData.relocation_type,
      inventory_id: isInventory ? formData.inventory_id : null,
      component_id: !isInventory ? formData.component_id : null,
      quantity: formData.quantity,
      source_region_id: sourceRegion,
      source_warehouse_id: sourceWarehouse,
      source_server_id: sourceServer,
      destination_region_id: formData.destination_region_id,
      destination_warehouse_id: formData.destination_warehouse_id,
      destination_server_id:
        !isInventory && formData.destination_server_id
          ? formData.destination_server_id
          : null,
      reason: formData.reason,
      urgency: formData.urgency,
      notes: formData.notes,
    });
    toast.success("Relocation request created successfully");
    setIsCreateOpen(false);
    setFormData({
      relocation_type: "INVENTORY",
      inventory_id: "",
      component_id: "",
      quantity: 1,
      destination_region_id: "",
      destination_warehouse_id: "",
      destination_server_id: "",
      reason: "",
      urgency: "Medium",
      notes: "",
    });
  };
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const getItemName = (req: any) => {
    if (req.relocation_type === "INVENTORY") {
      const item = hardwareInventory.find((i) => i.id === req.inventory_id);
      return item?.name || "Unknown Item";
    }

    const comp = components.find((c) => c.id === req.component_id);
    return comp?.name || "Unknown Component";
  };

  const getLocationDisplay = (
    serverId: string | null,
    warehouseId: string | null,
    regionId: string | null,
  ) => {
    if (serverId) {
      return (
        hardwareInventory.find((i) => i.id === serverId)?.name ??
        "Unknown Device"
      );
    } else if (warehouseId) {
      const warehouseName = getWarehouseName(warehouseId!);
      const warehouse = warehouses.find((w) => w.id === warehouseId);
      const regionName = warehouse ? getRegionName(warehouse.region_id) : "";
      return `${warehouseName}(${regionName})`;
    } else if (regionId) {
      return getRegionName(regionId);
    } else {
      return "—";
    }
  };

  const getComment = (req: any) => {
    // Engineer
    if (!pmView && !adminView) {
      if (req.status === "Rejected by PM") return req.pm_comments;

      if (req.status === "Approved" || req.status === "Rejected by Admin")
        return req.admin_comments;
    }

    // Admin
    if (adminView) {
      if (req.status === "Pending Admin Approval" || req.status === "Approved")
        return req.pm_comments;
    }

    // PM
    if (pmView) {
      if (req.status === "Approved" || req.status === "Rejected by Admin" || req.status === "Pending Admin Approval")
        return req.admin_comments;
    }

    return "-";
  };

  // Check if any request has comments
  const hasComments = visibleRequests.some((req) => {
    const comment = getComment(req);
    return comment && comment !== "-";
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            {pageTitle}
          </h1>
          <p className="text-muted-foreground">{pageDescription}</p>
        </div>

        {/* {!pmView && !adminView && currentUser.role === "Engineer" && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        )} */}
      </div>

      {/* Batch Section for PM View - Shows all statuses */}
      {pmView && groupedPMRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              All Requests (Batch)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groupedPMRequests.map((group) => {
                const timeWindow = Math.floor(
                  new Date(group.requests[0].created_at).getTime() / 60000,
                );
                const groupKey = `${group.destination_region_id}-${group.destination_warehouse_id}-${group.destination_server_id || "none"}-${timeWindow}`;
                const isExpanded = expandedBatches.has(groupKey);
                return (
                  <div key={groupKey} className="border rounded-lg">
                    <div
                      className="p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleBatchExpand(groupKey)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </Button>
                          <div>
                            <p className="font-medium">Batch Request</p>
                            <p className="text-sm text-muted-foreground">
                              {group.requests.length}{" "}
                              {group.relocation_type.toLowerCase()}(s)
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{group.urgency}</Badge>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t p-4 space-y-4">
                        {/* Individual requests list with table-like UI */}
                        <div className="space-y-2">
                          <p className="font-medium text-sm">
                            Individual Requests
                          </p>
                          <div className="border rounded overflow-x-auto">
                            <div className="grid grid-cols-5 gap-2 p-2 bg-muted text-xs font-medium text-muted-foreground min-w-[800px]">
                              <div>Request #</div>
                              <div>Item</div>
                              <div>From → To</div>
                              <div>Requester</div>
                              <div>Status</div>
                            </div>
                            {group.requests.map((req: any) => (
                              <div
                                key={req.id}
                                className="grid grid-cols-5 gap-2 p-2 border-t text-xs items-start min-w-[800px]"
                              >
                                <div className="font-medium">
                                  {req.request_number}
                                </div>
                                <div>
                                  {getItemName(req)}
                                </div>
                                <div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      From:{" "}
                                    </span>
                                    {getLocationDisplay(
                                      req.source_server_id,
                                      req.source_warehouse_id,
                                      req.source_region_id,
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      To:{" "}
                                    </span>
                                    {getLocationDisplay(
                                      req.destination_server_id,
                                      req.destination_warehouse_id,
                                      req.destination_region_id,
                                    )}
                                  </div>
                                </div>
                                <div>
                                  {getUserName(req.requester_id)}
                                </div>
                                {/* <div className="col-span-1">
                                  <Badge
                                    className={getUrgencyColor(req.urgency)}
                                    variant="outline"
                                  >
                                    {req.urgency}
                                  </Badge>
                                </div> */}
                                <div>
                                  <Badge
                                    className={getStatusColor(req.status)}
                                    variant="outline"
                                  >
                                    {req.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="font-medium">Type</p>
                            <Badge variant="outline">
                              {group.relocation_type}
                            </Badge>
                          </div>
                          <div>
                            <p className="font-medium">Items Count</p>
                            <p className="text-sm">{group.requests.length}</p>
                          </div>
                          <div>
                            <p className="font-medium">Reason</p>
                            <p className="text-sm">{group.reason}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            PM Comments
                          </label>
                          <Textarea
                            value={batchComments[groupKey] || ""}
                            onChange={(e) =>
                              setBatchComments((prev) => ({
                                ...prev,
                                [groupKey]: e.target.value,
                              }))
                            }
                            placeholder="Add comments for your decision..."
                            rows={2}
                          />
                        </div>

                        <div className="flex gap-2">
                          {group.requests.some((r: any) => r.status === "Pending PM Approval") && (
                            <>
                              <Button
                                onClick={() => handlePMApproveBatch(groupKey)}
                                className="flex items-center gap-2"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Approve Batch
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handlePMRejectBatch(groupKey)}
                                className="flex items-center gap-2"
                              >
                                <XCircle className="h-4 w-4" />
                                Reject Batch
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engineer View - Batch format without approve/reject buttons */}
      {engineerView && groupedEngineerRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              My Requests (Batch)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groupedEngineerRequests.map((group) => {
                const timeWindow = Math.floor(
                  new Date(group.requests[0].created_at).getTime() / 60000,
                );
                const groupKey = `${group.destination_region_id}-${group.destination_warehouse_id}-${group.destination_server_id || "none"}-${timeWindow}`;
                const isExpanded = expandedBatches.has(groupKey);
                return (
                  <div key={groupKey} className="border rounded-lg">
                    <div
                      className="p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleBatchExpand(groupKey)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </Button>
                          <div>
                            <p className="font-medium">Batch Request</p>
                            <p className="text-sm text-muted-foreground">
                              {group.requests.length}{" "}
                              {group.relocation_type.toLowerCase()}(s)
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{group.urgency}</Badge>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t p-4 space-y-4">
                        {/* Individual requests list with table-like UI */}
                        <div className="space-y-2">
                          <p className="font-medium text-sm">
                            Individual Requests
                          </p>
                          <div className="border rounded overflow-x-auto">
                            <div className="grid grid-cols-5 gap-2 p-2 bg-muted text-xs font-medium text-muted-foreground min-w-[800px]">
                              <div>Request #</div>
                              <div>Item</div>
                              <div>From → To</div>
                              <div>Status</div>
                              <div>Comments</div>
                            </div>
                            {group.requests.map((req: any) => (
                              <div
                                key={req.id}
                                className="grid grid-cols-5 gap-2 p-2 border-t text-xs items-start min-w-[800px]"
                              >
                                <div className="font-medium">
                                  {req.request_number}
                                </div>
                                <div>
                                  {getItemName(req)}
                                </div>
                                <div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      From:{" "}
                                    </span>
                                    {getLocationDisplay(
                                      req.source_server_id,
                                      req.source_warehouse_id,
                                      req.source_region_id,
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      To:{" "}
                                    </span>
                                    {getLocationDisplay(
                                      req.destination_server_id,
                                      req.destination_warehouse_id,
                                      req.destination_region_id,
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <Badge
                                    className={getStatusColor(req.status)}
                                    variant="outline"
                                  >
                                    {req.status}
                                  </Badge>
                                </div>
                                <div className="text-sm">
                                  {getComment(req)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="font-medium">Type</p>
                            <Badge variant="outline">
                              {group.relocation_type}
                            </Badge>
                          </div>
                          <div>
                            <p className="font-medium">Items Count</p>
                            <p className="text-sm">{group.requests.length}</p>
                          </div>
                          <div>
                            <p className="font-medium">Reason</p>
                            <p className="text-sm">{group.reason}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewAction} Request</DialogTitle>
            <DialogDescription>
              {reviewAction === "Complete"
                ? "Provide any relocation notes. This will automatically update the inventory system locations."
                : "Provide comments for your decision."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={
                reviewAction === "Complete"
                  ? "Relocation notes..."
                  : "Enter your comments here..."
              }
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReviewDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant={reviewAction === "Reject" ? "destructive" : "default"}
              onClick={handleAction}
            >
              Confirm {reviewAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Relocation Request</DialogTitle>
            <DialogDescription>
              Request to move inventory or components to a new location.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Relocation Type</Label>
                <Select
                  value={formData.relocation_type}
                  onValueChange={(v) => {
                    handleChange("relocation_type", v);
                    handleChange("inventory_id", "");
                    handleChange("component_id", "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVENTORY">Inventory Device</SelectItem>
                    <SelectItem value="COMPONENT">Component</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.relocation_type === "INVENTORY" ? (
                <div className="space-y-2 md:col-span-2">
                  <Label>
                    Item to Relocate <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.inventory_id}
                    onValueChange={(v) => handleChange("inventory_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select inventory item" />
                    </SelectTrigger>
                    <SelectContent>
                      {hardwareInventory
                        .filter((i) => !i.is_deleted)
                        .map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.name} ({i.serial_number}) - Currently at{" "}
                            {getWarehouseName(i.warehouse_id || "")}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2 md:col-span-2">
                  <Label>
                    Component to Relocate{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.component_id}
                    onValueChange={(v) => handleChange("component_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select component" />
                    </SelectTrigger>
                    <SelectContent>
                      {components
                        .filter((c) => !c.is_deleted)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.part_number}) - Currently at{" "}
                            {getWarehouseName(c.warehouse_id || "")}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    handleChange("quantity", Number(e.target.value))
                  }
                  disabled={formData.relocation_type === "INVENTORY"}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Destination Region <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.destination_region_id}
                  onValueChange={(v) => {
                    handleChange("destination_region_id", v);
                    handleChange("destination_warehouse_id", "");
                    handleChange("destination_server_id", "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions
                      .filter((r) => r.is_active)
                      .map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Destination Warehouse{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.destination_warehouse_id}
                  onValueChange={(v) => {
                    handleChange("destination_warehouse_id", v);
                    handleChange("destination_server_id", "");
                  }}
                  disabled={!formData.destination_region_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {getWarehousesByRegion(formData.destination_region_id).map(
                      (w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              {formData.relocation_type === "COMPONENT" && (
                <div className="space-y-2">
                  <Label>Destination Server (Optional)</Label>
                  <Select
                    value={formData.destination_server_id}
                    onValueChange={(v) =>
                      handleChange("destination_server_id", v)
                    }
                    disabled={!formData.destination_warehouse_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select server" />
                    </SelectTrigger>
                    <SelectContent>
                      {hardwareInventory
                        .filter(
                          (i) =>
                            !i.is_deleted &&
                            i.warehouse_id ===
                              formData.destination_warehouse_id,
                        )
                        .map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.name} ({i.serial_number})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label>
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => handleChange("reason", e.target.value)}
                  placeholder="Why is this relocation needed?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Urgency</Label>
                <Select
                  value={formData.urgency}
                  onValueChange={(v) => handleChange("urgency", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Additional instructions or notes..."
                  rows={2}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
