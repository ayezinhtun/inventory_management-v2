import React, { useState, Component } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
'../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
'../components/ui/Dialog';
import { Textarea } from '../components/ui/Textarea';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { ScrollArea } from '../components/ui/ScrollArea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'../components/ui/Select';
import { Plus, ArrowRightLeft, CheckCircle, XCircle, Truck } from 'lucide-react';
import { formatDate, getStatusColor, getUrgencyColor } from '../lib/utils';
import { toast } from 'sonner';
import type { Urgency, RelocationType } from '../lib/types';
interface RelocationRequestsPageProps {
  pmView?: boolean;
  adminView?: boolean;
  physicalView?: boolean;
}
export function RelocationRequestsPage({
  pmView,
  adminView,
  physicalView
}: RelocationRequestsPageProps) {
  const {
    relocationRequests,
    currentUser,
    getUserName,
    inventory,
    components,
    getWarehouseName,
    approveRelocationPM,
    rejectRelocationPM,
    approveRelocationAdmin,
    rejectRelocationAdmin,
    completeRelocation,
    createRelocationRequest,
    regions,
    getWarehousesByRegion
  } = useStore();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<
    'Approve' | 'Reject' | 'Complete' | null>(
    null);
  // Create Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    relocation_type: 'INVENTORY' as RelocationType,
    inventory_id: '',
    component_id: '',
    quantity: 1,
    destination_region_id: '',
    destination_warehouse_id: '',
    destination_server_id: '',
    reason: '',
    urgency: 'Medium' as Urgency,
    notes: ''
  });
  if (!currentUser) return null;
  // Filter requests based on view and role
  let visibleRequests = relocationRequests;
  let pageTitle = 'Relocation Requests';
  let pageDescription = 'Track your inventory and component relocation requests';
  if (pmView) {
    pageTitle = 'Relocation Approvals (PM)';
    pageDescription = 'Review and approve relocation requests from your team';
    visibleRequests = relocationRequests.filter((r) => {
      const requester = useStore.
      getState().
      users.find((u) => u.id === r.requester_id);
      return requester?.assigned_region_id === currentUser.assigned_region_id;
    });
  } else if (adminView) {
    pageTitle = 'Relocation Approvals (Admin)';
    pageDescription = 'Final review and approval for relocation requests';
  } else if (physicalView) {
    pageTitle = 'Physical Relocations';
    pageDescription = 'Execute approved physical relocation tasks';
    visibleRequests = relocationRequests.filter(
      (r) =>
      r.status === 'Approved' && (
      r.assigned_to === currentUser.id || r.requester_id === currentUser.id)
    );
  } else {
    // Default Engineer view
    visibleRequests = relocationRequests.filter(
      (r) => r.requester_id === currentUser.id
    );
  }
  const handleAction = () => {
    if (!selectedRequest || !reviewAction) return;
    if (pmView) {
      if (reviewAction === 'Approve')
      approveRelocationPM(selectedRequest, comments);else
      rejectRelocationPM(selectedRequest, comments);
    } else if (adminView) {
      if (reviewAction === 'Approve')
      approveRelocationAdmin(selectedRequest, comments);else
      rejectRelocationAdmin(selectedRequest, comments);
    } else if (physicalView && reviewAction === 'Complete') {
      completeRelocation(selectedRequest, comments);
    }
    toast.success(`Request ${reviewAction.toLowerCase()}d successfully`);
    setIsReviewDialogOpen(false);
    setSelectedRequest(null);
    setComments('');
    setReviewAction(null);
  };
  const openDialog = (
  id: string,
  action: 'Approve' | 'Reject' | 'Complete') =>
  {
    setSelectedRequest(id);
    setReviewAction(action);
    setComments('');
    setIsReviewDialogOpen(true);
  };
  const handleCreate = () => {
    const isInventory = formData.relocation_type === 'INVENTORY';
    if (
    isInventory && !formData.inventory_id ||
    !isInventory && !formData.component_id ||
    !formData.destination_region_id ||
    !formData.destination_warehouse_id ||
    !formData.reason)
    {
      toast.error('Please fill in all required fields');
      return;
    }
    let sourceRegion = '';
    let sourceWarehouse = '';
    if (isInventory) {
      const item = inventory.find((i) => i.id === formData.inventory_id);
      if (item) {
        sourceRegion = item.region_id;
        sourceWarehouse = item.warehouse_id;
      }
    } else {
      const comp = components.find((c) => c.id === formData.component_id);
      if (comp) {
        sourceRegion = comp.region_id;
        sourceWarehouse = comp.warehouse_id;
      }
    }
    createRelocationRequest({
      relocation_type: formData.relocation_type,
      inventory_id: isInventory ? formData.inventory_id : null,
      component_id: !isInventory ? formData.component_id : null,
      quantity: formData.quantity,
      source_region_id: sourceRegion,
      source_warehouse_id: sourceWarehouse,
      destination_region_id: formData.destination_region_id,
      destination_warehouse_id: formData.destination_warehouse_id,
      destination_server_id:
      !isInventory && formData.destination_server_id ?
      formData.destination_server_id :
      null,
      reason: formData.reason,
      urgency: formData.urgency,
      notes: formData.notes
    });
    toast.success('Relocation request created successfully');
    setIsCreateOpen(false);
    setFormData({
      relocation_type: 'INVENTORY',
      inventory_id: '',
      component_id: '',
      quantity: 1,
      destination_region_id: '',
      destination_warehouse_id: '',
      destination_server_id: '',
      reason: '',
      urgency: 'Medium',
      notes: ''
    });
  };
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };
  const getItemName = (req: any) => {
    if (req.relocation_type === 'INVENTORY') {
      return (
        inventory.find((i) => i.id === req.inventory_id)?.item_name ||
        'Unknown Item');

    }
    return (
      components.find((c) => c.id === req.component_id)?.item_name ||
      'Unknown Component');

  };
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            {pageTitle}
          </h1>
          <p className="text-muted-foreground">{pageDescription}</p>
        </div>

        {!pmView &&
        !adminView &&
        !physicalView &&
        currentUser.role === 'Engineer' &&
        <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
        }
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>From → To</TableHead>
                {(pmView || adminView) && <TableHead>Requester</TableHead>}
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRequests.length > 0 ?
              visibleRequests.map((req) =>
              <TableRow key={req.id}>
                    <TableCell className="font-medium">
                      {req.request_number}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{req.relocation_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{getItemName(req)}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {req.quantity}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-muted-foreground">From: </span>
                        {getWarehouseName(req.source_warehouse_id)}
                        <br />
                        <span className="text-muted-foreground">To: </span>
                        {getWarehouseName(req.destination_warehouse_id)}
                      </div>
                    </TableCell>
                    {(pmView || adminView) &&
                <TableCell>{getUserName(req.requester_id)}</TableCell>
                }
                    <TableCell>
                      <Badge className={getUrgencyColor(req.urgency)}>
                        {req.urgency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(req.status)}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {pmView && req.status === 'Pending PM Approval' ?
                  <div className="flex justify-end gap-2">
                          <Button
                      size="sm"
                      variant="outline"
                      className="text-emerald-600"
                      onClick={() => openDialog(req.id, 'Approve')}>
                      
                            <CheckCircle className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => openDialog(req.id, 'Reject')}>
                      
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div> :
                  adminView &&
                  req.status === 'Pending Admin Approval' ?
                  <div className="flex justify-end gap-2">
                          <Button
                      size="sm"
                      variant="outline"
                      className="text-emerald-600"
                      onClick={() => openDialog(req.id, 'Approve')}>
                      
                            <CheckCircle className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => openDialog(req.id, 'Reject')}>
                      
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div> :
                  physicalView && req.status === 'Approved' ?
                  <Button
                    size="sm"
                    onClick={() => openDialog(req.id, 'Complete')}>
                    
                          <Truck className="h-4 w-4 mr-1" /> Mark Complete
                        </Button> :

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toast.info('View details coming soon')}>
                    
                          View
                        </Button>
                  }
                    </TableCell>
                  </TableRow>
              ) :

              <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <ArrowRightLeft className="h-8 w-8 mb-2 opacity-20" />
                      <p>No relocation requests found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewAction} Request</DialogTitle>
            <DialogDescription>
              {reviewAction === 'Complete' ?
              'Provide any relocation notes. This will automatically update the inventory system locations.' :
              'Provide comments for your decision.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={
              reviewAction === 'Complete' ?
              'Relocation notes...' :
              'Enter your comments here...'
              }
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4} />
            
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReviewDialogOpen(false)}>
              
              Cancel
            </Button>
            <Button
              variant={reviewAction === 'Reject' ? 'destructive' : 'default'}
              onClick={handleAction}>
              
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
                    handleChange('relocation_type', v);
                    handleChange('inventory_id', '');
                    handleChange('component_id', '');
                  }}>
                  
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVENTORY">Inventory Device</SelectItem>
                    <SelectItem value="COMPONENT">Component</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.relocation_type === 'INVENTORY' ?
              <div className="space-y-2 md:col-span-2">
                  <Label>
                    Item to Relocate <span className="text-destructive">*</span>
                  </Label>
                  <Select
                  value={formData.inventory_id}
                  onValueChange={(v) => handleChange('inventory_id', v)}>
                  
                    <SelectTrigger>
                      <SelectValue placeholder="Select inventory item" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventory.
                    filter((i) => !i.is_deleted).
                    map((i) =>
                    <SelectItem key={i.id} value={i.id}>
                            {i.item_name} ({i.serial_number}) - Currently at{' '}
                            {getWarehouseName(i.warehouse_id)}
                          </SelectItem>
                    )}
                    </SelectContent>
                  </Select>
                </div> :

              <div className="space-y-2 md:col-span-2">
                  <Label>
                    Component to Relocate{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                  value={formData.component_id}
                  onValueChange={(v) => handleChange('component_id', v)}>
                  
                    <SelectTrigger>
                      <SelectValue placeholder="Select component" />
                    </SelectTrigger>
                    <SelectContent>
                      {components.
                    filter((c) => !c.is_deleted).
                    map((c) =>
                    <SelectItem key={c.id} value={c.id}>
                            {c.item_name} ({c.part_number}) - Currently at{' '}
                            {getWarehouseName(c.warehouse_id)}
                          </SelectItem>
                    )}
                    </SelectContent>
                  </Select>
                </div>
              }

              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) =>
                  handleChange('quantity', Number(e.target.value))
                  }
                  disabled={formData.relocation_type === 'INVENTORY'} />
                
              </div>

              <div className="space-y-2">
                <Label>
                  Destination Region <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.destination_region_id}
                  onValueChange={(v) => {
                    handleChange('destination_region_id', v);
                    handleChange('destination_warehouse_id', '');
                    handleChange('destination_server_id', '');
                  }}>
                  
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.
                    filter((r) => r.is_active).
                    map((r) =>
                    <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Destination Warehouse{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.destination_warehouse_id}
                  onValueChange={(v) => {
                    handleChange('destination_warehouse_id', v);
                    handleChange('destination_server_id', '');
                  }}
                  disabled={!formData.destination_region_id}>
                  
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {getWarehousesByRegion(formData.destination_region_id).map(
                      (w) =>
                      <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>

                    )}
                  </SelectContent>
                </Select>
              </div>

              {formData.relocation_type === 'COMPONENT' &&
              <div className="space-y-2">
                  <Label>Destination Server (Optional)</Label>
                  <Select
                  value={formData.destination_server_id}
                  onValueChange={(v) =>
                  handleChange('destination_server_id', v)
                  }
                  disabled={!formData.destination_warehouse_id}>
                  
                    <SelectTrigger>
                      <SelectValue placeholder="Select server" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventory.
                    filter(
                      (i) =>
                      !i.is_deleted &&
                      i.warehouse_id ===
                      formData.destination_warehouse_id
                    ).
                    map((i) =>
                    <SelectItem key={i.id} value={i.id}>
                            {i.item_name} ({i.serial_number})
                          </SelectItem>
                    )}
                    </SelectContent>
                  </Select>
                </div>
              }

              <div className="space-y-2 md:col-span-2">
                <Label>
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => handleChange('reason', e.target.value)}
                  placeholder="Why is this relocation needed?"
                  rows={2} />
                
              </div>

              <div className="space-y-2">
                <Label>Urgency</Label>
                <Select
                  value={formData.urgency}
                  onValueChange={(v) => handleChange('urgency', v)}>
                  
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
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Additional instructions or notes..."
                  rows={2} />
                
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
    </div>);

}