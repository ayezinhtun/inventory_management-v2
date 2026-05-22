import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useRelocationStore } from '../store/useRelocationStore';
import { useRegionStore } from '../store/useRegionStore';
import { useWarehouseStore } from '../store/useWarehouseStore';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/Select';
import { toast } from 'sonner';
import type { RelocationRequest, Urgency } from '../lib/types';

interface RelocationRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    inventoryId: string;
    sourceRegionId: string;
    sourceWarehouseId: string;
}

export function RelocationRequestDialog({
    open,
    onOpenChange,
    inventoryId,
    sourceRegionId,
    sourceWarehouseId,
}: RelocationRequestDialogProps) {
    const { currentUser } = useStore();
    const { createRelocationRequest } = useRelocationStore();
    const { regions } = useRegionStore();
    const { warehouses } = useWarehouseStore();

    const [formData, setFormData] = useState({
        destination_region_id: '',
        destination_warehouse_id: '',
        reason: '',
        urgency: 'Medium' as Urgency,
        notes: '',
    });

    const [submitting, setSubmitting] = useState(false);

    const { fetchRegions } = useRegionStore();
    const { fetchWarehouses } = useWarehouseStore();

    useEffect(() => {
        fetchRegions();
        fetchWarehouses();
    }, [fetchRegions, fetchWarehouses]);

    const filteredWarehouses = warehouses.filter(
        (w) => w.region_id === formData.destination_region_id && w.status === 'active'
    );

    const handleSubmit = async () => {

        if (!formData.destination_region_id || !formData.destination_warehouse_id || !formData.reason) {
            
            toast.error('Please fill in all required fields');
            return;
        }

        setSubmitting(true);

        try {

            const relocationRequest: Partial<RelocationRequest> = {
                request_number: `RR-${new Date().getFullYear()}-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`,
                requester_id: currentUser?.id || '',
                relocation_type: 'INVENTORY',
                inventory_id: inventoryId,
                quantity: 1,
                source_region_id: sourceRegionId,
                source_warehouse_id: sourceWarehouseId,
                destination_region_id: formData.destination_region_id,
                destination_warehouse_id: formData.destination_warehouse_id,
                reason: formData.reason,
                urgency: formData.urgency,
                notes: formData.notes,
                status: 'Pending PM Approval',
            };

            console.log('📋 Complete relocation request data:', JSON.stringify(relocationRequest, null, 2));
            console.log('🔄 Calling createRelocationRequest from store...');

            // Call the store function to create relocation request
            await createRelocationRequest(relocationRequest);

            console.log('✅ Relocation request created successfully');
            toast.success('Relocation request submitted for PM approval');
            onOpenChange(false);
            setFormData({
                destination_region_id: '',
                destination_warehouse_id: '',
                reason: '',
                urgency: 'Medium',
                notes: '',
            });
        } catch (error) {
            console.error('❌ Error submitting relocation request:', error);
            console.error('❌ Error type:', typeof error);
            console.error('❌ Error message:', (error as any)?.message);
            console.error('❌ Error code:', (error as any)?.code);
            console.error('❌ Error details:', (error as any)?.details);
            console.error('❌ Error hint:', (error as any)?.hint);
            console.error('❌ Full error object:', JSON.stringify(error, null, 2));

            toast.error(`Failed to submit relocation request: ${(error as any)?.message || 'Unknown error'}`);
        } finally {
            console.log('🏁 handleSubmit function completed');
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Request Inventory Relocation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Destination Region *</Label>
                        <Select
                            value={formData.destination_region_id}
                            onValueChange={(value) => {
                                setFormData(prev => ({ ...prev, destination_region_id: value, destination_warehouse_id: '' }));
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
                            onValueChange={(value) => setFormData(prev => ({ ...prev, destination_warehouse_id: value }))}
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

                    <div className="space-y-2">
                        <Label>Reason for Relocation *</Label>
                        <Textarea
                            value={formData.reason}
                            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                            placeholder="Explain why this inventory needs to be relocated..."
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
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}