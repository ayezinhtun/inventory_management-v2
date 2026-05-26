import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useRelocationStore } from '../store/useRelocationStore';
import { useRegionStore } from '../store/useRegionStore';
import { useWarehouseStore } from '../store/useWarehouseStore';
import { useComponentsStore } from '../store/useComponentsStore';
import { useHardwareInventoryStore } from '../store/useHardwareInventoryStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { Textarea } from './ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select';
import { toast } from 'sonner';
import type { Urgency } from '../lib/types';

interface ComponentRelocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedComponentIds: string[];
  onSuccess: () => void;
}

export function ComponentRelocationDialog({
  open,
  onOpenChange,
  selectedComponentIds,
  onSuccess,
}: ComponentRelocationDialogProps) {
  const { currentUser } = useStore();
  const { createBatchComponentRelocationRequests } = useRelocationStore();
  const { regions } = useRegionStore();
  const { warehouses } = useWarehouseStore();
  const { components } = useComponentsStore();
  const { hardwareInventory } = useHardwareInventoryStore();

  const [formData, setFormData] = useState({
    destination_region_id: '',
    destination_warehouse_id: '',
    destination_server_id: '',
    install_in_server: false,
    reason: '',
    urgency: 'Medium' as Urgency,
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    useRegionStore.getState().fetchRegions();
    useWarehouseStore.getState().fetchWarehouses();
    useHardwareInventoryStore.getState().fetchHardwareInventory();
  }, []);

  const selectedComponents = components.filter(c => selectedComponentIds.includes(c.id));
  const filteredWarehouses = warehouses.filter(
    (w) => w.region_id === formData.destination_region_id && w.status === 'active'
  );
  const filteredServers = hardwareInventory.filter(
    (h) => h.warehouse_id === formData.destination_warehouse_id && h.status === 'available'
  );

  const handleSubmit = async () => {
    if (!formData.destination_region_id || !formData.destination_warehouse_id || !formData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.install_in_server && !formData.destination_server_id) {
      toast.error('Please select a server to install components into');
      return;
    }

    setSubmitting(true);

    try {
      await createBatchComponentRelocationRequests({
        componentIds: selectedComponentIds,
        destination_region_id: formData.destination_region_id,
        destination_warehouse_id: formData.destination_warehouse_id,
        destination_server_id: formData.install_in_server ? formData.destination_server_id : null,
        reason: formData.reason,
        urgency: formData.urgency,
        notes: formData.notes,
        requester_id: currentUser?.id || '',
      });

      toast.success(`Relocation request submitted for ${selectedComponentIds.length} components`);
      onSuccess();
      onOpenChange(false);
      setFormData({
        destination_region_id: '',
        destination_warehouse_id: '',
        destination_server_id: '',
        install_in_server: false,
        reason: '',
        urgency: 'Medium',
        notes: '',
      });
    } catch (error) {
      console.error('Error submitting relocation request:', error);
      toast.error('Failed to submit relocation request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relocate {selectedComponentIds.length} Components</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 mb-4">
          <Label>Selected Components</Label>
          <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
            {selectedComponents.map(comp => (
              <div key={comp.id} className="text-sm flex justify-between">
                <span>{comp.name}</span>
                <span className="text-muted-foreground">{comp.part_number}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Destination Region *</Label>
            <Select
              value={formData.destination_region_id}
              onValueChange={(value) => {
                setFormData(prev => ({ 
                  ...prev, 
                  destination_region_id: value, 
                  destination_warehouse_id: '',
                  destination_server_id: '' 
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select destination region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Destination Warehouse *</Label>
            <Select
              value={formData.destination_warehouse_id}
              onValueChange={(value) => {
                setFormData(prev => ({ 
                  ...prev, 
                  destination_warehouse_id: value, 
                  destination_server_id: '' 
                }));
              }}
              disabled={!formData.destination_region_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select destination warehouse" />
              </SelectTrigger>
              <SelectContent>
                {filteredWarehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="install-in-server"
              checked={formData.install_in_server}
              onChange={(e) => {
                setFormData(prev => ({ 
                  ...prev, 
                  install_in_server: e.target.checked,
                  destination_server_id: ''
                }));
              }}
              className="w-4 h-4"
            />
            <Label htmlFor="install-in-server" className="cursor-pointer">
              Install components in hardware inventory (server/device)
            </Label>
          </div>

          {formData.install_in_server && (
            <div className="space-y-2">
              <Label>Destination Server *</Label>
              <Select
                value={formData.destination_server_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, destination_server_id: value }))}
                disabled={!formData.destination_warehouse_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination server" />
                </SelectTrigger>
                <SelectContent>
                  {filteredServers.map((server) => (
                    <SelectItem key={server.id} value={server.id}>
                      {server.name} ({server.serial_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason for Relocation *</Label>
            <Textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Explain why these components need to be relocated..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Urgency</Label>
            <Select
              value={formData.urgency}
              onValueChange={(value) => setFormData(prev => ({ ...prev, urgency: value as Urgency }))}
            >
              <SelectTrigger>
                <SelectValue />
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
            <Label>Additional Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional information..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : `Submit Request (${selectedComponentIds.length} components)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}