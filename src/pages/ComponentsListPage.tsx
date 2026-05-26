import React, { useMemo, useState, useEffect } from 'react';

import { useStore } from '../store/useStore';

import { useComponentsStore } from '../store/useComponentsStore';

import { Card, CardContent, CardHeader } from '../components/ui/Card';

import { ComponentRelocationDialog } from '../components/ComponentRelocationDialog';

import {

  Table,

  TableBody,

  TableCell,

  TableHead,

  TableHeader,

  TableRow

} from

  '../components/ui/Table';

import { Input } from '../components/ui/Input';

import { Button } from '../components/ui/Button';

import { Badge } from '../components/ui/Badge';

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue

} from

  '../components/ui/Select';

import { Search, Plus, Download, FilterX, ChevronDown, ChevronRight, Eye, Trash2 } from 'lucide-react';

import { getStatusColor } from '../lib/utils';

import { toast } from 'sonner';



const getConditionColor = (condition: string) => {

  switch (condition) {

    case 'working': return 'bg-green-100 text-green-800';

    case 'repairing': return 'bg-yellow-100 text-yellow-800';

    case 'broken': return 'bg-red-100 text-red-800';

    default: return 'bg-gray-100 text-gray-800';

  }

};



export function ComponentsListPage() {

  const { components, fetchComponents, deleteComponent } = useComponentsStore();

  const { componentTypes, currentUser, regions, warehouses, navigate } = useStore();

  const [hardwareInventory, setHardwareInventory] = useState<any[]>([]);

  const [selectedComponentIds, setSelectedComponentIds] = useState<Set<string>>(new Set());

  const [showRelocationDialog, setShowRelocationDialog] = useState(false);

  useEffect(() => {
    const loadHardwareInventory = async () => {
      const { useHardwareInventoryStore } = await import('../store/useHardwareInventoryStore');
      const store = useHardwareInventoryStore.getState();
      setHardwareInventory(store.hardwareInventory);
    };
    loadHardwareInventory();
  }, []);

  const toggleComponentSelection = (componentId: string) => {
    const newSelected = new Set(selectedComponentIds);
    if (newSelected.has(componentId)) {
      newSelected.delete(componentId);
    } else {
      newSelected.add(componentId);
    }
    setSelectedComponentIds(newSelected);
  };

  const toggleSelectAll = () => {
    const allComponentIds = groupedComponents.flatMap(g => g.items.map((item: any) => item.id));
    if (selectedComponentIds.size === allComponentIds.length) {
      setSelectedComponentIds(new Set());
    } else {
      setSelectedComponentIds(new Set(allComponentIds));
    }
  };

  const [search, setSearch] = useState('');

  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [regionFilter, setRegionFilter] = useState<string>('all');

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());



  useEffect(() => {

    fetchComponents();

  }, []);



  // Group components by name, manufacturer, model, part_number

  const groupedComponents = useMemo(() => {

    let result = components.filter((c) => !c.is_deleted);

    // Filter to show only available and installed status, exclude reserved
    result = result.filter((c) => c.status === 'available' || c.status === 'installed');

    // Filter out components installed in reserved inventory items
    result = result.filter((c) => {
      if (c.installed_in_device_id) {
        const device = hardwareInventory?.find((h: any) => h.id === c.installed_in_device_id);
        if (device && device.status === 'reserved') {
          return false;
        }
      }
      return true;
    });



    if (search) {

      const q = search.toLowerCase();

      result = result.filter(

        (c) =>

          c.name.toLowerCase().includes(q) ||

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



    // Group by component specs

    const groups = new Map();

    result.forEach((comp) => {

      const key = `${comp.name}-${comp.manufacturer}-${comp.model}-${comp.part_number}`;

      if (!groups.has(key)) {

        groups.set(key, {

          name: comp.name,

          manufacturer: comp.manufacturer,

          model: comp.model,

          part_number: comp.part_number,

          component_type_id: comp.component_type_id,

          items: []

        });

      }

      groups.get(key).items.push(comp);

    });



    return Array.from(groups.values());

  }, [components, search, typeFilter, regionFilter]);



  const toggleExpand = (key: string) => {

    const newExpanded = new Set(expandedRows);

    if (newExpanded.has(key)) {

      newExpanded.delete(key);

    } else {

      newExpanded.add(key);

    }

    setExpandedRows(newExpanded);

  };



  const getRegionName = (id: string) =>

    regions.find((r) => r.id === id)?.name || '-';

  const getWarehouseName = (id: string) =>

    warehouses.find((w) => w.id === id)?.name || '-';

  const getTypeName = (id: string) =>

    componentTypes.find((ct) => ct.id === id)?.type_name || '-';



  const handleDeleteComponent = async (componentId: string, componentName: string) => {

    if (window.confirm(`Are you sure you want to delete "${componentName}"?`)) {

      try {

        await deleteComponent(componentId);

        toast.success(`${componentName} deleted successfully`);

        fetchComponents();

      } catch (error) {

        console.error('Delete component error:', error);

        toast.error('Failed to delete component');

      }

    }

  }

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

          {selectedComponentIds.size > 0 && (
            <Button
              size="sm"
              onClick={() => setShowRelocationDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Relocate Selected ({selectedComponentIds.size})
            </Button>
          )}

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

                  {componentTypes.filter((ct) => ct.is_active).map((ct) =>

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

                onClick={() => {

                  setSearch('');

                  setTypeFilter('all');

                  setRegionFilter('all');

                }}

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
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={selectedComponentIds.size > 0 &&
                        selectedComponentIds.size === groupedComponents.flatMap(g => g.items).length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4"
                    />
                  </TableHead>

                  <TableHead>Name</TableHead>

                  <TableHead>Type</TableHead>

                  <TableHead>Manufacturer</TableHead>

                  <TableHead>Model</TableHead>

                  <TableHead>Part Number</TableHead>

                  <TableHead className="text-right">Total Quantity</TableHead>

                </TableRow>

              </TableHeader>

              <TableBody>

                {groupedComponents.length === 0 ?

                  <TableRow>

                    <TableCell colSpan={6} className="h-24 text-center">

                      No components found.

                    </TableCell>

                  </TableRow> :



                  groupedComponents.map((group) => {

                    const isExpanded = expandedRows.has(`${group.name}-${group.manufacturer}-${group.model}-${group.part_number}`);

                    const availableCount = group.items.filter((item: any) => item.status === 'available' && item.condition === 'working').length;

                    const totalCount = group.items.length;



                    return (

                      <React.Fragment key={`${group.name}-${group.manufacturer}-${group.model}-${group.part_number}`}>

                        <TableRow

                          className="cursor-pointer hover:bg-muted/50"

                          onClick={() => toggleExpand(`${group.name}-${group.manufacturer}-${group.model}-${group.part_number}`)}>



                          <TableCell>

                            <div className="font-medium flex items-center gap-2">

                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">

                                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}

                              </Button>

                              {group.name}

                            </div>

                          </TableCell>

                          <TableCell>

                            <Badge variant="secondary">

                              {group.component_type_id ? getTypeName(group.component_type_id) : 'Unknown'}

                            </Badge>

                          </TableCell>

                          <TableCell>

                            <div className="text-sm">

                              {group.manufacturer}

                            </div>

                          </TableCell>

                          <TableCell>

                            <div className="text-sm">

                              {group.model}

                            </div>

                          </TableCell>

                          <TableCell>

                            <div className="text-sm">

                              {group.part_number}

                            </div>

                          </TableCell>

                          <TableCell className="text-right font-medium">

                            {totalCount}

                          </TableCell>

                        </TableRow>



                        {/* Expandable Row with Individual Items */}

                        {isExpanded && (

                          <TableRow>

                            <TableCell colSpan={6} className="px-4 py-2 bg-gray-50">

                              <div className="space-y-2">

                                {group.items.map((item: any) => (

                                  <div key={item.id} className="grid grid-cols-8 gap-3 px-3 py-2 bg-white rounded items-center">

                                    <input
                                      type="checkbox"
                                      checked={selectedComponentIds.has(item.id)}
                                      onChange={() => toggleComponentSelection(item.id)}
                                      className="w-4 h-4"
                                    />

                                    <div className="font-medium text-sm col-span-2 truncate" title={group.name}>

                                      {group.name}

                                    </div>

                                    <div className="text-sm">

                                      {getRegionName(item.region_id)}

                                    </div>

                                    <div className="text-sm">

                                      {getWarehouseName(item.warehouse_id)}

                                    </div>

                                    <div className="text-sm">

                                      <Badge className={getStatusColor(item.status)} variant="outline">

                                        {item.status}

                                      </Badge>

                                    </div>

                                    <div className="text-sm">

                                      {item.condition}

                                    </div>

                                    <div className="flex items-center gap-1 justify-end">

                                      <Button

                                        size="sm"

                                        variant="outline"

                                        onClick={(e) => {

                                          e.stopPropagation();

                                          navigate('component-detail', item.id);

                                        }}

                                        className="text-[#3a4a85] h-8 px-2"

                                        title="View Detail"

                                      >

                                        <Eye className="h-3 w-3" />

                                      </Button>



                                      {currentUser?.role === 'Admin' && (
                                        <Button

                                          size="sm"

                                          variant="outline"

                                          onClick={(e) => {

                                            e.stopPropagation();

                                            handleDeleteComponent(item.id, item.name);

                                          }}

                                          className="text-red-600 hover:text-red-700 h-8 px-2"

                                          title="Remove Item"

                                        >

                                          <Trash2 className="h-3 w-3" />

                                        </Button>
                                      )}

                                    </div>

                                  </div>

                                ))}

                              </div>

                            </TableCell>

                          </TableRow>

                        )}

                      </React.Fragment>

                    );

                  })

                }

              </TableBody>

            </Table>

          </div>

        </CardContent>

      </Card>


      {showRelocationDialog && (
        <ComponentRelocationDialog
          open={showRelocationDialog}
          onOpenChange={setShowRelocationDialog}
          selectedComponentIds={Array.from(selectedComponentIds)}
          onSuccess={() => {
            setSelectedComponentIds(new Set());
            fetchComponents();
          }}
        />
      )}

    </div>

  );

}