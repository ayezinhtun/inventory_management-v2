import React, { useState, useMemo, useEffect } from 'react';
import { useRelocationStore } from '../store/useRelocationStore';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Textarea } from '../components/ui/Textarea';
import { toast } from 'sonner';
import { CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useHardwareInventoryStore } from '../store/useHardwareInventoryStore';
import { useComponentsStore } from '../store/useComponentsStore';
import { getStatusColor } from '../lib/utils';

export function AdminRelocationPage() {
  console.log('AdminRelocationPage - Component mounted');

  const {
    relocationRequests,
    approveRelocationAdminBatch,
    rejectRelocationAdminBatch,
    fetchRelocationRequests,
  } = useRelocationStore();

  const { currentUser, getUserName, getWarehouseName, getRegionName, warehouses } = useStore();
  const { hardwareInventory } = useHardwareInventoryStore();
  const { components } = useComponentsStore();

  // Fetch relocation requests on component mount
  useEffect(() => {
    console.log('AdminRelocationPage - useEffect called, fetching requests...');
    fetchRelocationRequests();
  }, [fetchRelocationRequests]);
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  console.log('AdminRelocationPage - Total relocation requests:', relocationRequests.length);

  const pendingAdminRequests = relocationRequests.filter(
    req =>
      req.status === 'Pending Admin Approval' ||
      req.status === 'Approved' ||
      req.status === 'Rejected by Admin'
  );

  console.log('AdminRelocationPage - Pending Admin Approval requests:', pendingAdminRequests.length);

  // Helper functions to match PM view
  const getItemName = (req: any) => {
    if (req.relocation_type === 'COMPONENT') {
      const component = components.find(c => c.id === req.component_id);
      return component ? component.name : req.component_id;
    } else {
      const inventory = hardwareInventory.find(i => i.id === req.inventory_id);
      return inventory ? inventory.name : req.inventory_id;
    }
  };

  const getLocationDisplay = (serverId: string | null, warehouseId: string | null, regionId: string | null) => {
    if (serverId) {
      return hardwareInventory.find((i) => i.id === serverId)?.name ?? "Unknown Device";
    } else if (warehouseId) {
      const warehouseName = getWarehouseName(warehouseId);
      const warehouse = warehouses.find((w: any) => w.id === warehouseId);
      const regionName = warehouse ? getRegionName(warehouse.region_id) : "";
      return `${warehouseName}(${regionName})`;
    } else if (regionId) {
      return getRegionName(regionId);
    } else {
      return "—";
    }
  };

  const getBatchStatus = (requests: any[]) => {
    const statuses = requests.map((r) => r.status);
    const uniqueStatuses = new Set(statuses);
    if (uniqueStatuses.size === 1) {
      return statuses[0];
    }
    return "Mixed";
  };

  // Group by time window and destination for batch display
  const groupedRequests = useMemo(() => {
    const groups = new Map();
    pendingAdminRequests.forEach((req) => {
      // Create a key based on destination and time window (1 minute)
      const timeWindow = Math.floor(new Date(req.created_at).getTime() / 60000); // 1 minute window
      const key = `${req.destination_region_id}-${req.destination_warehouse_id}-${req.destination_server_id || 'none'}-${timeWindow}`;

      if (!groups.has(key)) {
        groups.set(key, {
          destination_region_id: req.destination_region_id,
          destination_warehouse_id: req.destination_warehouse_id,
          destination_server_id: req.destination_server_id,
          relocation_type: req.relocation_type,
          urgency: req.urgency,
          reason: req.reason,
          pm_comments: req.pm_comments,
          requests: []
        });
      }
      groups.get(key).requests.push(req);
    });
    const result = Array.from(groups.values());
    console.log('AdminRelocationPage - Grouped requests:', result.length);
    return result;
  }, [pendingAdminRequests]);

  const toggleBatchExpand = (groupKey: string) => {
    const newExpanded = new Set(expandedBatches);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedBatches(newExpanded);
  };

  const handleAdminApprove = async (groupKey: string) => {
    try {
      const group = groupedRequests.find(g => {
        const timeWindow = Math.floor(new Date(g.requests[0].created_at).getTime() / 60000);
        const key = `${g.destination_region_id}-${g.destination_warehouse_id}-${g.destination_server_id || 'none'}-${timeWindow}`;
        return key === groupKey;
      });
      if (group) {
        // Only approve requests with "Pending Admin Approval" status
        const pendingRequests = group.requests.filter((r: any) => r.status === 'Pending Admin Approval');
        if (pendingRequests.length === 0) {
          toast.error('No pending admin approval requests in this batch');
          return;
        }
        const requestIds = pendingRequests.map((r: any) => r.id);
        await approveRelocationAdminBatch(requestIds, comments[groupKey] || '');
        toast.success('Batch relocation approved and components updated');
      }
    } catch (error) {
      toast.error('Failed to approve batch relocation');
    }
  };

  const handleAdminReject = async (groupKey: string) => {
    try {
      const group = groupedRequests.find(g => {
        const timeWindow = Math.floor(new Date(g.requests[0].created_at).getTime() / 60000);
        const key = `${g.destination_region_id}-${g.destination_warehouse_id}-${g.destination_server_id || 'none'}-${timeWindow}`;
        return key === groupKey;
      });
      if (group) {
        // Only reject requests with "Pending Admin Approval" status
        const pendingRequests = group.requests.filter((r: any) => r.status === 'Pending Admin Approval');
        if (pendingRequests.length === 0) {
          toast.error('No pending admin approval requests in this batch');
          return;
        }
        const requestIds = pendingRequests.map((r: any) => r.id);
        await rejectRelocationAdminBatch(requestIds, comments[groupKey] || '');
        toast.success('Batch relocation request rejected');
      }
    } catch (error) {
      toast.error('Failed to reject batch request');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Relocation Requests</h1>
        <p className="text-muted-foreground">Review and complete relocation requests</p>
      </div>

      <Card className='border border-0 p-0 m-0'>
        <CardContent className='p-0 m-0'>
          {groupedRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pending requests</p>
          ) : (
            <div className="space-y-2">
              {groupedRequests.map((group) => {
                const timeWindow = Math.floor(new Date(group.requests[0].created_at).getTime() / 60000);
                const groupKey = `${group.destination_region_id}-${group.destination_warehouse_id}-${group.destination_server_id || 'none'}-${timeWindow}`;
                const isExpanded = expandedBatches.has(groupKey);
                return (
                  <div key={groupKey} className="border rounded-md">
                    <div className="p-4 cursor-pointer hover:bg-muted/50" onClick={() => toggleBatchExpand(groupKey)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </Button>
                          <div>
                            <p className="font-medium">Relocation Request</p>
                          </div>
                        </div>
                        <Badge
                          className={getStatusColor(getBatchStatus(group.requests))}
                          variant="outline"
                        >
                          {getBatchStatus(group.requests)}
                        </Badge>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t p-4 space-y-4">
                        {/* Individual requests list with table-like UI */}
                        <div className="space-y-2">
                          {/* <p className="font-medium text-sm">
                            Individual Requests
                          </p> */}
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

                        <div className="grid grid-cols-3 gap-4">
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
                            <p className="text-sm break-words">{group.reason}</p>
                          </div>
                          {group.requests[0]?.notes && (
                            <div>
                              <p className="font-medium">Additional Notes</p>
                              <p className="text-sm break-words">{group.requests[0]?.notes}</p>
                            </div>
                          )}
                          {group.requests[0]?.pm_comments && (
                            <div>
                              <p className="font-medium">PM Comments</p>
                              <p className="text-sm break-words">{group.requests[0]?.pm_comments}</p>
                            </div>
                          )}
                          {group.requests[0]?.admin_comments && (
                            <div>
                              <p className="font-medium">Admin Comments</p>
                              <p className="text-sm break-words">{group.requests[0]?.admin_comments}</p>
                            </div>
                          )}
                        </div>


                        {group.requests.some((r: any) => r.status === 'Pending Admin Approval') && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Admin Comments</label>
                            <Textarea
                              value={comments[groupKey] || ''}
                              onChange={(e) => setComments(prev => ({ ...prev, [groupKey]: e.target.value }))}
                              placeholder="Add comments for your decision..."
                              rows={2}
                            />
                          </div>
                        )}


                        <div className="flex gap-2">
                          {group.requests.some((r: any) => r.status === 'Pending Admin Approval') && (
                            <>
                              <Button
                                onClick={() => handleAdminApprove(groupKey)}
                                className="flex items-center gap-2"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleAdminReject(groupKey)}
                                className="flex items-center gap-2"
                              >
                                <XCircle className="h-4 w-4" />
                                Reject
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}