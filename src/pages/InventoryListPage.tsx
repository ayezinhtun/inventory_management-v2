import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
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
import { Search, Plus, Download, FilterX } from 'lucide-react';
import { getStatusColor } from '../lib/utils';
export function InventoryListPage() {
  const { inventory, currentUser, regions, warehouses, navigate } = useStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const filteredInventory = useMemo(() => {
    let result = inventory.filter((i) => !i.is_deleted);
    // Role-based filtering
    if (currentUser?.role !== 'Admin') {
      if (currentUser?.assigned_region_id) {
        result = result.filter(
          (i) => i.region_id === currentUser.assigned_region_id
        );
      }
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
        i.item_name.toLowerCase().includes(q) ||
        i.serial_number.toLowerCase().includes(q) ||
        i.model.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'all') {
      result = result.filter((i) => i.item_type === typeFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter((i) => i.status === statusFilter);
    }
    if (regionFilter !== 'all') {
      result = result.filter((i) => i.region_id === regionFilter);
    }
    return result;
  }, [inventory, search, typeFilter, statusFilter, regionFilter, currentUser]);
  const getRegionName = (id: string) =>
  regions.find((r) => r.id === id)?.name || 'Unknown';
  const getWarehouseName = (id: string) =>
  warehouses.find((w) => w.id === id)?.name || 'Unknown';
  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
    setRegionFilter('all');
  };
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Hardware Inventory
          </h1>
          <p className="text-muted-foreground">
            Manage node-level devices (Servers, Switches, Routers, etc.)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          {currentUser?.role === 'Admin' &&
          <Button size="sm" onClick={() => navigate('inventory-add')}>
              <Plus className="mr-2 h-4 w-4" /> Add Inventory
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
                placeholder="Search by name, model, or serial..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)} />
              
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Server">Server</SelectItem>
                  <SelectItem value="Switch">Switch</SelectItem>
                  <SelectItem value="Router">Router</SelectItem>
                  <SelectItem value="Firewall">Firewall</SelectItem>
                  <SelectItem value="Storage Array">Storage Array</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Working">Working</SelectItem>
                  <SelectItem value="Broken">Broken</SelectItem>
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
                  <TableHead>Name & Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length === 0 ?
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No inventory items found.
                    </TableCell>
                  </TableRow> :

                filteredInventory.map((item) =>
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate('inventory-detail', item.id)}>
                  
                      <TableCell>
                        <div className="font-medium">{item.item_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.manufacturer} {item.model}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.item_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.serial_number}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {getWarehouseName(item.warehouse_id)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getRegionName(item.region_id)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge
                        className={getStatusColor(item.status)}
                        variant="outline">
                        
                            {item.status}
                          </Badge>
                          {item.quantity === 0 ?
                      <Badge
                        variant="destructive"
                        className="text-[10px] h-4 px-1">
                        
                              OUT OF STOCK
                            </Badge> :
                      item.reserved_quantity >= item.quantity ?
                      <Badge
                        className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-[10px] h-4 px-1"
                        variant="outline">
                        
                              FULLY RESERVED
                            </Badge> :

                      <Badge
                        className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] h-4 px-1"
                        variant="outline">
                        
                              AVAILABLE
                            </Badge>
                      }
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.quantity}
                      </TableCell>
                    </TableRow>
                )
                }
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredInventory.length} items
          </div>
        </CardContent>
      </Card>
    </div>);

}