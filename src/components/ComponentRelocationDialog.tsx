import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
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
  const { profile } = useAuthStore();
  const { createBatchComponentRelocationRequests } = useRelocationStore();
  const { regions } = useRegionStore();
  const { warehouses } = useWarehouseStore();
  const { components } = useComponentsStore();
  const { hardwareInventory } = useHardwareInventoryStore();

  const [relocationType, setRelocationType] = useState<'WAREHOUSE' | 'HARDWARE'>('WAREHOUSE');
  const [formData, setFormData] = useState({
    destination_region_id: '',
    destination_warehouse_id: '',
    destination_server_id: '',
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
    (h) => h.warehouse_id === formData.destination_warehouse_id &&
      h.region_id === formData.destination_region_id &&
      h.status === 'available' &&
      !h.is_deleted
  )

  const handleSubmit = async () => {
    // Check if any selected components are reserved
    const reservedComponents = selectedComponents.filter(c => c.status === 'reserved');
    if (reservedComponents.length > 0) {
      const componentNames = reservedComponents.map(c => c.name).join(', ');
      toast.error(`The following components are reserved and cannot be relocated: ${componentNames}. Please release the reservation first.`);
      return;
    }

    // Validate based on relocation type
    if (relocationType === 'WAREHOUSE') {
      if (!formData.destination_region_id || !formData.destination_warehouse_id || !formData.reason) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Check if components are already in the selected warehouse
      const componentsInSameWarehouse = selectedComponents.filter(
        c => c.warehouse_id === formData.destination_warehouse_id
      );
      if (componentsInSameWarehouse.length > 0) {
        const componentNames = componentsInSameWarehouse.map(c => c.name).join(', ');
        toast.error(`The following components are already in the selected warehouse: ${componentNames}. Please select a different destination.`);
        return;
      }
    } else {
      if (!formData.destination_server_id || !formData.reason) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Check if components are already installed in the selected hardware
      const componentsInSameHardware = selectedComponents.filter(
        c => c.installed_in_device_id === formData.destination_server_id
      );
      if (componentsInSameHardware.length > 0) {
        const componentNames = componentsInSameHardware.map(c => c.name).join(', ');
        toast.error(`The following components are already installed in the selected hardware: ${componentNames}. Please select a different destination.`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const requestData: any = {
        componentIds: selectedComponentIds,
        reason: formData.reason,
        urgency: formData.urgency,
        notes: formData.notes,
        requester_id: profile?.id || '',
      };

      if (relocationType === 'WAREHOUSE') {
        requestData.destination_warehouse_id = formData.destination_warehouse_id;
        const destinationWarehouse = warehouses.find(w => w.id === formData.destination_warehouse_id);
        requestData.destination_region_id = destinationWarehouse?.region_id || '';
        requestData.destination_server_id = null;
      } else {
        requestData.destination_server_id = formData.destination_server_id;
        const destinationHardware = hardwareInventory.find(h => h.id === formData.destination_server_id);
        requestData.destination_region_id = destinationHardware?.region_id || '';
        requestData.destination_warehouse_id = destinationHardware?.warehouse_id || '';
      }

      await createBatchComponentRelocationRequests(requestData);

      toast.success(`Relocation request submitted for ${selectedComponentIds.length} components`);
      onSuccess();
      onOpenChange(false);
      setFormData({
        destination_region_id: '',
        destination_warehouse_id: '',
        destination_server_id: '',
        reason: '',
        urgency: 'Medium',
        notes: '',
      });
      setRelocationType('WAREHOUSE');
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
              <div key={comp.id} className="text-sm">
                <span>{comp.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Relocation Type</Label>
            <Select
              value={relocationType}
              onValueChange={(value) => {
                setRelocationType(value as 'WAREHOUSE' | 'HARDWARE');
                setFormData(prev => ({
                  ...prev,
                  destination_region_id: '',
                  destination_warehouse_id: '',
                  destination_server_id: '',
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select relocation type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                <SelectItem value="HARDWARE">Hardware Inventory</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {relocationType === 'WAREHOUSE' ? (
            <>
              <div className="space-y-2">
                <Label>Destination Region <span className="text-destructive">*</span></Label>
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
                    <SelectValue
                      placeholder="Select destination region"
                      displayValue={formData.destination_region_id ? regions.find(r => r.id === formData.destination_region_id)?.name : undefined}
                    />
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
                <Label>Destination Warehouse <span className="text-destructive">*</span></Label>
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
                    <SelectValue
                      placeholder="Select destination warehouse"
                      displayValue={formData.destination_warehouse_id ? filteredWarehouses.find(w => w.id === formData.destination_warehouse_id)?.name : undefined}
                    />
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
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Destination Region <span className="text-destructive">*</span></Label>
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
                    <SelectValue
                      placeholder="Select destination region"
                      displayValue={formData.destination_region_id ? regions.find(r => r.id === formData.destination_region_id)?.name : undefined}
                    />
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
                <Label>Destination Warehouse <span className="text-destructive">*</span></Label>
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
                    <SelectValue
                      placeholder="Select destination warehouse"
                      displayValue={formData.destination_warehouse_id ? filteredWarehouses.find(w => w.id === formData.destination_warehouse_id)?.name : undefined}
                    />
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

              <div className="space-y-2">
                <Label>Destination Hardware <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.destination_server_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, destination_server_id: value }))}
                  disabled={!formData.destination_warehouse_id}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder="Select destination hardware"
                      displayValue={formData.destination_server_id ? filteredServers.find(h => h.id === formData.destination_server_id)?.name : undefined}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredServers.map((hardware) => (
                      <SelectItem key={hardware.id} value={hardware.id}>
                        {hardware.name} ({hardware.item_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Reason for Relocation <span className="text-destructive">*</span></Label>
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
              {submitting ? 'Submitting...' : `Relocate`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}