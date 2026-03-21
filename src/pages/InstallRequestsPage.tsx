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
import { Plus, Wrench, CheckCircle, XCircle, Hammer } from 'lucide-react';
import { formatDate, getStatusColor, getUrgencyColor } from '../lib/utils';
import { toast } from 'sonner';
import type { Urgency } from '../lib/types';
interface InstallRequestsPageProps {
  pmView?: boolean;
  adminView?: boolean;
  physicalView?: boolean;
}
export function InstallRequestsPage({
  pmView,
  adminView,
  physicalView
}: InstallRequestsPageProps) {
  const {
    installRequests,
    currentUser,
    getUserName,
    inventory,
    components,
    approveInstallPM,
    rejectInstallPM,
    approveInstallAdmin,
    rejectInstallAdmin,
    completeInstall,
    createInstallRequest,
    warehouses
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
    component_id: '',
    destination_warehouse_id: '',
    destination_server_id: '',
    quantity: 1,
    purpose: '',
    urgency: 'Medium' as Urgency,
    notes: ''
  });
  if (!currentUser) return null;
  // Filter requests based on view and role
  let visibleRequests = installRequests;
  let pageTitle = 'Install Requests';
  let pageDescription = 'Track your component installation requests';
  if (pmView) {
    pageTitle = 'Install Approvals (PM)';
    pageDescription = 'Review and approve installation requests from your team';
    // PM sees requests from their region
    visibleRequests = installRequests.filter((r) => {
      const requester = useStore.
      getState().
      users.find((u) => u.id === r.requester_id);
      return requester?.assigned_region_id === currentUser.assigned_region_id;
    });
  } else if (adminView) {
    pageTitle = 'Install Approvals (Admin)';
    pageDescription = 'Final review and approval for installation requests';
    // Admin sees all
  } else if (physicalView) {
    pageTitle = 'Physical Installations';
    pageDescription = 'Execute approved physical installation tasks';
    // Engineer sees approved tasks assigned to them
    visibleRequests = installRequests.filter(
      (r) =>
      r.status === 'Approved' && (
      r.assigned_to === currentUser.id || r.requester_id === currentUser.id)
    );
  } else {
    // Default Engineer view
    visibleRequests = installRequests.filter(
      (r) => r.requester_id === currentUser.id
    );
  }
  const handleAction = () => {
    if (!selectedRequest || !reviewAction) return;
    if (pmView) {
      if (reviewAction === 'Approve')
      approveInstallPM(selectedRequest, comments);else
      rejectInstallPM(selectedRequest, comments);
    } else if (adminView) {
      if (reviewAction === 'Approve')
      approveInstallAdmin(selectedRequest, comments);else
      rejectInstallAdmin(selectedRequest, comments);
    } else if (physicalView && reviewAction === 'Complete') {
      completeInstall(selectedRequest, comments);
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
    if (
    !formData.component_id ||
    !formData.destination_warehouse_id ||
    !formData.destination_server_id ||
    !formData.purpose)
    {
      toast.error('Please fill in all required fields');
      return;
    }
    const component = components.find((c) => c.id === formData.component_id);
    if (!component) return;
    createInstallRequest({
      component_id: formData.component_id,
      source_warehouse_id: component.warehouse_id,
      destination_warehouse_id: formData.destination_warehouse_id,
      destination_server_id: formData.destination_server_id,
      quantity: formData.quantity,
      purpose: formData.purpose,
      urgency: formData.urgency,
      notes: formData.notes
    });
    toast.success('Install request created successfully');
    setIsCreateOpen(false);
    setFormData({
      component_id: '',
      destination_warehouse_id: '',
      destination_server_id: '',
      quantity: 1,
      purpose: '',
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
  const getComponentName = (id: string) =>
  components.find((c) => c.id === id)?.item_name || 'Unknown Component';
  const getServerName = (id: string) =>
  inventory.find((i) => i.id === id)?.item_name || 'Unknown Server';
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
                <TableHead>Component</TableHead>
                <TableHead>Target Server</TableHead>
                {(pmView || adminView) && <TableHead>Requester</TableHead>}
                <TableHead>Urgency</TableHead>
                <TableHead>Date</TableHead>
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
                      <div>
                        <p className="font-medium">
                          {getComponentName(req.component_id)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {req.quantity}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getServerName(req.destination_server_id)}
                    </TableCell>
                    {(pmView || adminView) &&
                <TableCell>{getUserName(req.requester_id)}</TableCell>
                }
                    <TableCell>
                      <Badge className={getUrgencyColor(req.urgency)}>
                        {req.urgency}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(req.created_at)}</TableCell>
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
                    
                          <Hammer className="h-4 w-4 mr-1" /> Mark Complete
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
                      <Wrench className="h-8 w-8 mb-2 opacity-20" />
                      <p>No install requests found.</p>
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
              'Provide any installation notes. This will automatically update the inventory system.' :
              'Provide comments for your decision.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={
              reviewAction === 'Complete' ?
              'Installation notes...' :
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
            <DialogTitle>New Install Request</DialogTitle>
            <DialogDescription>
              Request to install a component into a server.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2 md:col-span-2">
                <Label>
                  Component to Install{' '}
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
                          {c.item_name} ({c.part_number})
                        </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) =>
                  handleChange('quantity', Number(e.target.value))
                  } />
                
              </div>
              <div className="space-y-2">
                <Label>
                  Target Warehouse <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.destination_warehouse_id}
                  onValueChange={(v) => {
                    handleChange('destination_warehouse_id', v);
                    handleChange('destination_server_id', '');
                  }}>
                  
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.
                    filter((w) => w.is_active).
                    map((w) =>
                    <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>
                  Target Server <span className="text-destructive">*</span>
                </Label>
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
                      i.warehouse_id === formData.destination_warehouse_id
                    ).
                    map((i) =>
                    <SelectItem key={i.id} value={i.id}>
                          {i.item_name} ({i.serial_number})
                        </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>
                  Purpose <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={formData.purpose}
                  onChange={(e) => handleChange('purpose', e.target.value)}
                  placeholder="Why is this installation needed?"
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