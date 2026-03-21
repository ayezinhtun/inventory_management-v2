import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from
'../components/ui/Card';
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
  DialogTitle,
  DialogTrigger } from
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
import { Plus, FileText, CheckCircle, XCircle } from 'lucide-react';
import {
  formatDate,
  formatCurrency,
  getStatusColor,
  getUrgencyColor } from
'../lib/utils';
import { toast } from 'sonner';
import type { Urgency } from '../lib/types';
export function InventoryRequestsPage() {
  const {
    inventoryRequests,
    currentUser,
    getUserName,
    updateInventoryRequestStatus,
    createInventoryRequest
  } = useStore();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'Approve' | 'Reject' | null>(
    null
  );
  // Create Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    requested_item: '',
    item_type: 'Server',
    manufacturer: '',
    model: '',
    specifications: '',
    quantity: 1,
    estimated_unit_cost: '',
    purpose: '',
    business_justification: '',
    urgency: 'Medium' as Urgency,
    required_by: '',
    budget_code: '',
    project_name: '',
    preferred_vendor: ''
  });
  if (!currentUser) return null;
  // Filter requests based on role
  const visibleRequests =
  currentUser.role === 'Admin' ?
  inventoryRequests :
  currentUser.role === 'PM' ?
  inventoryRequests.filter((r) => {
    const requester = useStore.
    getState().
    users.find((u) => u.id === r.requester_id);
    return (
      r.requester_id === currentUser.id ||
      requester?.assigned_region_id === currentUser.assigned_region_id);

  }) :
  inventoryRequests.filter((r) => r.requester_id === currentUser.id);
  const handleReview = () => {
    if (!selectedRequest || !reviewAction) return;
    const status = reviewAction === 'Approve' ? 'Approved' : 'Rejected';
    updateInventoryRequestStatus(selectedRequest, status, adminResponse);
    toast.success(`Request ${status.toLowerCase()} successfully`);
    setIsReviewDialogOpen(false);
    setSelectedRequest(null);
    setAdminResponse('');
    setReviewAction(null);
  };
  const openReviewDialog = (id: string, action: 'Approve' | 'Reject') => {
    setSelectedRequest(id);
    setReviewAction(action);
    setAdminResponse('');
    setIsReviewDialogOpen(true);
  };
  const handleCreate = () => {
    if (!formData.requested_item || !formData.purpose) {
      toast.error('Please fill in all required fields');
      return;
    }
    const unitCost = Number(formData.estimated_unit_cost) || 0;
    const totalCost = unitCost * formData.quantity;
    createInventoryRequest({
      requested_item: formData.requested_item,
      item_type: formData.item_type,
      manufacturer: formData.manufacturer,
      model: formData.model,
      specifications: formData.specifications,
      quantity: formData.quantity,
      estimated_unit_cost: unitCost > 0 ? unitCost : null,
      estimated_total_cost: totalCost > 0 ? totalCost : null,
      purpose: formData.purpose,
      business_justification: formData.business_justification,
      urgency: formData.urgency,
      required_by: formData.required_by || null,
      budget_code: formData.budget_code,
      project_name: formData.project_name,
      preferred_vendor: formData.preferred_vendor
    });
    toast.success('Inventory request created successfully');
    setIsCreateOpen(false);
    setFormData({
      requested_item: '',
      item_type: 'Server',
      manufacturer: '',
      model: '',
      specifications: '',
      quantity: 1,
      estimated_unit_cost: '',
      purpose: '',
      business_justification: '',
      urgency: 'Medium',
      required_by: '',
      budget_code: '',
      project_name: '',
      preferred_vendor: ''
    });
  };
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Inventory Requests
          </h1>
          <p className="text-muted-foreground">
            {currentUser.role === 'Admin' ?
            'Manage requests for new inventory procurement' :
            currentUser.role === 'PM' ?
            'Review inventory requests from your team' :
            'Track your requests for new inventory items'}
          </p>
        </div>

        {currentUser.role === 'Engineer' &&
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
                <TableHead>Item</TableHead>
                {(currentUser.role === 'Admin' ||
                currentUser.role === 'PM') &&
                <TableHead>Requester</TableHead>
                }
                <TableHead>Qty</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                {currentUser.role === 'Admin' &&
                <TableHead className="text-right">Actions</TableHead>
                }
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
                        <p className="font-medium">{req.requested_item}</p>
                        <p className="text-xs text-muted-foreground">
                          {req.item_type}
                        </p>
                      </div>
                    </TableCell>
                    {(currentUser.role === 'Admin' ||
                currentUser.role === 'PM') &&
                <TableCell>{getUserName(req.requester_id)}</TableCell>
                }
                    <TableCell>{req.quantity}</TableCell>
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
                    {currentUser.role === 'Admin' &&
                <TableCell className="text-right">
                        {req.status === 'Pending' ?
                  <div className="flex justify-end gap-2">
                            <Button
                      size="sm"
                      variant="outline"
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={() =>
                      openReviewDialog(req.id, 'Approve')
                      }>
                      
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => openReviewDialog(req.id, 'Reject')}>
                      
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div> :

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                    toast.info('View details coming soon')
                    }>
                    
                            View
                          </Button>
                  }
                      </TableCell>
                }
                  </TableRow>
              ) :

              <TableRow>
                  <TableCell
                  colSpan={
                  currentUser.role === 'Admin' ?
                  8 :
                  currentUser.role === 'PM' ?
                  7 :
                  6
                  }
                  className="h-32 text-center">
                  
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FileText className="h-8 w-8 mb-2 opacity-20" />
                      <p>No inventory requests found.</p>
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
              Provide comments for your decision. These will be visible to the
              requester.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter your response/comments here..."
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
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
              onClick={handleReview}>
              
              Confirm {reviewAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Inventory Request</DialogTitle>
            <DialogDescription>
              Submit a request for new hardware procurement.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>
                  Requested Item <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.requested_item}
                  onChange={(e) =>
                  handleChange('requested_item', e.target.value)
                  }
                  placeholder="e.g. Database Server" />
                
              </div>
              <div className="space-y-2">
                <Label>Item Type</Label>
                <Select
                  value={formData.item_type}
                  onValueChange={(v) => handleChange('item_type', v)}>
                  
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Server">Server</SelectItem>
                    <SelectItem value="Switch">Switch</SelectItem>
                    <SelectItem value="Router">Router</SelectItem>
                    <SelectItem value="Firewall">Firewall</SelectItem>
                    <SelectItem value="Storage Array">Storage Array</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Manufacturer</Label>
                <Input
                  value={formData.manufacturer}
                  onChange={(e) => handleChange('manufacturer', e.target.value)}
                  placeholder="e.g. Dell" />
                
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  placeholder="e.g. PowerEdge R740" />
                
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
                <Label>Estimated Unit Cost (USD)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.estimated_unit_cost}
                  onChange={(e) =>
                  handleChange('estimated_unit_cost', e.target.value)
                  }
                  placeholder="0.00" />
                
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Specifications</Label>
                <Textarea
                  value={formData.specifications}
                  onChange={(e) =>
                  handleChange('specifications', e.target.value)
                  }
                  placeholder="Required specs (CPU, RAM, Storage, etc.)"
                  rows={2} />
                
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>
                  Purpose <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={formData.purpose}
                  onChange={(e) => handleChange('purpose', e.target.value)}
                  placeholder="Why is this item needed?"
                  rows={2} />
                
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Business Justification</Label>
                <Textarea
                  value={formData.business_justification}
                  onChange={(e) =>
                  handleChange('business_justification', e.target.value)
                  }
                  placeholder="Business impact or ROI"
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
              <div className="space-y-2">
                <Label>Required By Date</Label>
                <Input
                  type="date"
                  value={formData.required_by}
                  onChange={(e) => handleChange('required_by', e.target.value)} />
                
              </div>
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input
                  value={formData.project_name}
                  onChange={(e) => handleChange('project_name', e.target.value)}
                  placeholder="e.g. Q3 Expansion" />
                
              </div>
              <div className="space-y-2">
                <Label>Budget Code</Label>
                <Input
                  value={formData.budget_code}
                  onChange={(e) => handleChange('budget_code', e.target.value)}
                  placeholder="e.g. IT-2026-CAPEX" />
                
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Preferred Vendor</Label>
                <Input
                  value={formData.preferred_vendor}
                  onChange={(e) =>
                  handleChange('preferred_vendor', e.target.value)
                  }
                  placeholder="e.g. Dell Direct" />
                
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