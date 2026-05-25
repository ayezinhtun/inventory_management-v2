import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useHardwareInventoryStore } from '../store/useHardwareInventoryStore';
import { useRegionStore } from '../store/useRegionStore';
import { useWarehouseStore } from '../store/useWarehouseStore';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/Select';
import { Search, Plus, FilterX, ChevronDown, ChevronRight, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { HardwareInventory } from '../lib/types';

export function InventoryListPage() {
  const { hardwareInventory, fetchHardwareInventory, deleteHardwareInventory, isLoading } = useHardwareInventoryStore();
  const { regions } = useRegionStore();
  const { warehouses } = useWarehouseStore();
  const { navigate, currentUser } = useStore();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  useEffect(() => {
    fetchHardwareInventory();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'reserved': return 'bg-purple-100 text-purple-800';
      case 'disposed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'working': return 'bg-green-100 text-green-800';
      case 'repairing': return 'bg-yellow-100 text-yellow-800';
      case 'broken': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredHardware = useMemo(() => {
    let result = hardwareInventory.filter((h) => !h.is_deleted);

    // Filter to show only available and installed status, exclude reserved
    result = result.filter((h) => h.status === 'available' || h.status === 'installed');

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.serial_number.toLowerCase().includes(q) ||
          h.model.toLowerCase().includes(q) ||
          h.manufacturer.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((h) => h.item_type === typeFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((h) => h.status === statusFilter);
    }

    if (regionFilter !== 'all') {
      result = result.filter((h) => h.region_id === regionFilter);
    }

    return result;
  }, [hardwareInventory, search, typeFilter, statusFilter, regionFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteHardwareInventory(id);
        toast.success(`${name} deleted successfully`);
      } catch (error) {
        toast.error('Failed to delete hardware');
      }
    }
  };

  const getRegionName = (id: string | null) => {
    return regions.find((r) => r.id === id)?.name || 'Unknown';
  };

  const getWarehouseName = (id: string | null) => {
    return warehouses.find((w) => w.id === id)?.name || 'Unknown';
  };

  const uniqueTypes = useMemo(() => {
    return [...new Set(hardwareInventory.map(h => h.item_type))];
  }, [hardwareInventory]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hardware Inventory</h1>
          <p className="text-muted-foreground">Manage your hardware assets</p>
        </div>
        {currentUser?.role === 'Admin' && (
          <Button onClick={() => navigate('inventory-add')}>
            <Plus className="mr-2 h-4 w-4" /> Add Hardware
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, serial, model..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions.filter((r) => r.is_active).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSearch('');
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setRegionFilter('all');
                }}
                title="Clear filters"
              >
                <FilterX className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHardware.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No hardware found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHardware.map((hardware) => {
                    return (
                      <TableRow key={hardware.id}>
                        <TableCell>
                          <div className="font-medium">{hardware.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{hardware.item_type}</Badge>
                        </TableCell>
                        <TableCell>{hardware.manufacturer}</TableCell>
                        <TableCell>{hardware.model}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {hardware.serial_number}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(hardware.status)} variant="outline">
                            {hardware.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getConditionColor(hardware.condition)} variant="outline">
                            {hardware.condition}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate('inventory-detail', hardware.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {currentUser?.role === 'Admin' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(hardware.id, hardware.name)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}