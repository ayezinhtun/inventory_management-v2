import React, { useMemo, useState, Component } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
'../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'../components/ui/Select';
import { Search, Plus, Download, FilterX, AlertCircle } from 'lucide-react';
import { getStatusColor } from '../lib/utils';
export function ComponentsListPage() {
  const {
    components,
    componentTypes,
    currentUser,
    regions,
    warehouses,
    inventory,
    navigate
  } = useStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const filteredComponents = useMemo(() => {
    let result = components.filter((c) => !c.is_deleted);
    // Role-based filtering
    if (currentUser?.role !== 'Admin') {
      if (currentUser?.assigned_region_id) {
        result = result.filter(
          (c) => c.region_id === currentUser.assigned_region_id
        );
      }
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
        c.item_name.toLowerCase().includes(q) ||
        c.part_number.toLowerCase().includes(q) ||
        c.model.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'all') {
      result = result.filter((c) => c.component_type_id === typeFilter);
    }
    if (regionFilter !== 'all') {
      result = result.filter((c) => c.region_id === regionFilter);
    }
    return result;
  }, [components, search, typeFilter, regionFilter, currentUser]);
  const getRegionName = (id: string) =>
  regions.find((r) => r.id === id)?.name || 'Unknown';
  const getWarehouseName = (id: string) =>
  warehouses.find((w) => w.id === id)?.name || 'Unknown';
  const getTypeName = (id: string) =>
  componentTypes.find((ct) => ct.id === id)?.type_name || 'Unknown';
  const getDeviceName = (id: string | null) => {
    if (!id) return 'In Warehouse';
    const device = inventory.find((i) => i.id === id);
    return device ? device.item_name : 'Unknown Device';
  };
  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setRegionFilter('all');
  };
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Components
          </h1>
          <p className="text-muted-foreground">
            Manage hardware components (RAM, CPU, SSD, etc.)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          {currentUser?.role === 'Admin' &&
          <Button size="sm" onClick={() => navigate('components-add')}>
              <Plus className="mr-2 h-4 w-4" /> Add Component
            </Button>
          }
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, model, or part number..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)} />
              
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Component Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {componentTypes.
                  filter((ct) => ct.is_active).
                  map((ct) =>
                  <SelectItem key={ct.id} value={ct.id}>
                        {ct.type_name}
                      </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {currentUser?.role === 'Admin' &&
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions.map((r) =>
                  <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                  )}
                  </SelectContent>
                </Select>
              }

              <Button
                variant="ghost"
                size="icon"
                onClick={clearFilters}
                title="Clear filters">
                
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
                  <TableHead>Name & Part No</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location / Installed In</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComponents.length === 0 ?
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No components found.
                    </TableCell>
                  </TableRow> :

                filteredComponents.map((comp) => {
                  const isLowStock =
                  comp.minimum_stock > 0 &&
                  comp.quantity < comp.minimum_stock;
                  const available = comp.quantity - comp.reserved_quantity;
                  return (
                    <TableRow
                      key={comp.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate('component-detail', comp.id)}>
                      
                        <TableCell>
                          <div className="font-medium flex items-center gap-2">
                            {comp.item_name}
                            {isLowStock &&
                          <AlertCircle
                            className="h-4 w-4 text-destructive"
                            title="Low Stock" />

                          }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {comp.manufacturer} {comp.part_number}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getTypeName(comp.component_type_id)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {comp.installed_in_device_id ?
                        <div>
                              <div className="text-sm font-medium">
                                {getDeviceName(comp.installed_in_device_id)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Slot: {comp.device_slot || 'N/A'}
                              </div>
                            </div> :

                        <div>
                              <div className="text-sm">
                                {getWarehouseName(comp.warehouse_id)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getRegionName(comp.region_id)}
                              </div>
                            </div>
                        }
                        </TableCell>
                        <TableCell>
                          <Badge
                          className={getStatusColor(comp.status)}
                          variant="outline">
                          
                            {comp.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                          className={
                          available === 0 ?
                          'text-destructive font-bold' :
                          ''
                          }>
                          
                            {available}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {comp.quantity}
                        </TableCell>
                      </TableRow>);

                })
                }
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground flex justify-between items-center">
            <span>Showing {filteredComponents.length} components</span>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>Indicates low stock</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>);

}