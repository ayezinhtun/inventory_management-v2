import React, { useMemo, useState, useEffect } from 'react';

import { exportToExcel, importFromExcel } from '../lib/exportUtils';


import { useStore } from '../store/useStore';

import { useComponentsStore } from '../store/useComponentsStore';

import { Card, CardContent, CardHeader } from '../components/ui/Card';

import { ComponentRelocationDialog } from '../components/ComponentRelocationDialog';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../components/ui/Dialog';

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

import { Search, Plus, Download, FilterX, ChevronDown, ChevronRight, Eye, Trash2, Package, AlertTriangle, Loader2, Puzzle, Upload, XCircle, File, FileSpreadsheet, Component } from 'lucide-react';

import { getStatusColor } from '../lib/utils';

import { toast } from 'sonner';
import { Checkbox } from '../components/ui/Checkbox';

const getConditionColor = (condition: string) => {

  switch (condition) {

    case 'working': return 'bg-green-100 text-green-800';

    case 'repairing': return 'bg-yellow-100 text-yellow-800';

    case 'broken': return 'bg-red-100 text-red-800';

    default: return 'bg-gray-100 text-gray-800';

  }

};



export function ComponentsListPage() {

  const { components, fetchComponents, deleteComponent, createComponent } = useComponentsStore();

  const { componentTypes, currentUser, regions, warehouses, navigate } = useStore();

  const [hardwareInventory, setHardwareInventory] = useState<any[]>([]);

  const [selectedComponentIds, setSelectedComponentIds] = useState<Set<string>>(new Set());

  const [showRelocationDialog, setShowRelocationDialog] = useState(false);

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidationErrorDialog, setShowValidationErrorDialog] = useState(false);
  const [validatedData, setValidatedData] = useState<any[]>([]);

  // Define valid component status and condition values
  const VALID_STATUSES = ['available', 'installed', 'reserved', 'broken'];
  const VALID_CONDITIONS = ['working', 'broken'];

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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



  // Data is already fetched by fetchAppData() in useStore.ts during app initialization



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



  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteComponent(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted successfully`);
      setDeleteTarget(null);
      fetchComponents();
    } catch (error) {
      console.error('Delete component error:', error);
      toast.error('Failed to delete component');
    } finally {
      setDeleteLoading(false);
    }
  }

  const transformSpecificationsForExport = (specs: { [key: string]: any }, componentTypeId: string | null): { [key: string]: any } => {
    const transformedSpecs: { [key: string]: any } = {};

    // Get the component type to access its fields
    const componentType = componentTypeId ? componentTypes.find(ct => ct.id === componentTypeId) : null;
    const fieldMap = new Map(
      componentType?.fields?.map((field) => [field.id, field.label]) || []
    );

    for (const key in specs) {
      if (Object.prototype.hasOwnProperty.call(specs, key)) {
        // Use the field label if found, otherwise keep the original key
        const label = fieldMap.get(key) || key;
        transformedSpecs[label] = specs[key];
      }
    }
    return transformedSpecs;
  };

  const transformSpecificationsForImport = (specs: { [key: string]: any }, componentTypeId: string | null, itemName: string): { [key: string]: any } => {
    const transformedSpecs: { [key: string]: any } = {};

    // Get the component type to access its fields
    const componentType = componentTypeId ? componentTypes.find(ct => ct.id === componentTypeId) : null;
    const fieldMap = new Map(
      componentType?.fields?.map((field) => [field.label, field.id]) || []
    );

    for (const key in specs) {
      if (Object.prototype.hasOwnProperty.call(specs, key)) {
        // Use the field ID if label is found, otherwise keep the original key
        const fieldId = fieldMap.get(key);
        if (fieldId) {
          transformedSpecs[fieldId] = specs[key];
        } else {
          // Unknown field - keep original key and log warning
          console.warn(`[Import] Unknown specification field "${key}" for component "${itemName}" (Component Type: ${componentType?.type_name || 'N/A'}). Field will be saved as-is.`);
          transformedSpecs[key] = specs[key];
        }
      }
    }
    return transformedSpecs;
  };

  const validateImportData = (importedData: any[]): { valid: boolean, errors: string[], validData: any[] } => {
    const errors: string[] = [];
    const validData: any[] = [];

    importedData.forEach((item, index) => {
      const rowNumber = index + 2; // Excel rows are 1-indexed, header is row 1
      const itemName = (item as any).name || (item as any)['Name'] || `Row ${rowNumber}`;
      const rowErrors: string[] = [];

      // Validate required field: Name
      if (!itemName || itemName === `Row ${rowNumber}`) {
        rowErrors.push('Missing required field: Name');
      }

      // Validate required field: Component Type
      const componentTypeName = (item as any).component_type_id || (item as any)['Component Type ID'] || (item as any)['Component Type'] || (item as any).component_type || '';
      if (!componentTypeName) {
        rowErrors.push('Missing required field: Component Type');
      } else {
        const componentType = componentTypes.find(ct =>
          ct.type_name === componentTypeName || ct.id === componentTypeName
        );
        if (!componentType) {
          rowErrors.push(`Component Type "${componentTypeName}" not found in database`);
        }
      }

      // Validate required field: Region
      const regionName = (item as any).region_id || (item as any)['Region ID'] || (item as any)['Region'] || (item as any).region || '';
      if (!regionName) {
        rowErrors.push('Missing required field: Region');
      } else {
        const region = regions.find(r =>
          r.name === regionName || r.id === regionName
        );
        if (!region) {
          rowErrors.push(`Region "${regionName}" not found in database`);
        }
      }

      // Validate required field: Warehouse
      const warehouseName = (item as any).warehouse_id || (item as any)['Warehouse ID'] || (item as any)['Warehouse'] || (item as any).warehouse || '';
      if (!warehouseName) {
        rowErrors.push('Missing required field: Warehouse');
      } else {
        const warehouse = warehouses.find(w =>
          w.name === warehouseName || w.id === warehouseName
        );
        if (!warehouse) {
          rowErrors.push(`Warehouse "${warehouseName}" not found in database`);
        } else if (regionName) {
          // Check if warehouse belongs to the selected region
          const region = regions.find(r =>
            r.name === regionName || r.id === regionName
          );
          if (region && warehouse.region_id !== region.id) {
            const warehouseRegion = regions.find(r => r.id === warehouse.region_id);
            rowErrors.push(`Warehouse "${warehouseName}" is in region "${warehouseRegion?.name || warehouse.region_id}", but selected region is "${regionName}"`);
          }
        }
      }

      // Validate Specifications fields
      const specValue = (item as any).specifications || (item as any)['Specifications'] || (item as any).specification || (item as any)['Specification'] || {};
      let specsObj = typeof specValue === 'string' ? {} : specValue;

      try {
        if (typeof specValue === 'string') {
          specsObj = JSON.parse(specValue);
        }
      } catch (e) {
        rowErrors.push('Invalid JSON format in Specifications field');
      }

      // Validate Status
      const status = (item as any).status || (item as any)['Status'] || '';
      if (status && !VALID_STATUSES.includes(status)) {
        rowErrors.push(`Invalid Status "${status}". Valid statuses are: ${VALID_STATUSES.join(', ')}`);
      }

      // Validate Condition
      const condition = (item as any).condition || (item as any)['Condition'] || '';
      if (condition && !VALID_CONDITIONS.includes(condition)) {
        rowErrors.push(`Invalid Condition "${condition}". Valid conditions are: ${VALID_CONDITIONS.join(', ')}`);
      }

      // Validate Quantity
      const quantity = (item as any).quantity || (item as any)['Quantity'] || 1;
      if (quantity && (isNaN(Number(quantity)) || Number(quantity) < 1)) {
        rowErrors.push('Quantity must be a positive number');
      }

      // Check required specification fields based on component type
      if (componentTypeName) {
        const componentType = componentTypes.find(ct =>
          ct.type_name === componentTypeName || ct.id === componentTypeName
        );

        if (componentType && componentType.requires_specification && componentType.fields && componentType.fields.length > 0) {
          const validFieldLabels = new Set(componentType.fields.map(f => f.label));
          const validFieldIds = new Set(componentType.fields.map(f => f.id));

          // Check for required specification fields and validate field types
          componentType.fields.forEach(field => {
            const fieldValue = specsObj[field.id] || specsObj[field.label];

            // Check required fields
            if (field.required) {
              if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
                rowErrors.push(`Missing required specification field: ${field.label}`);
              }
            }

            // Validate field type if value is present
            if (fieldValue && (typeof fieldValue === 'string' && fieldValue.trim() !== '')) {
              if (field.field_type === 'number') {
                if (Number.isNaN(Number(fieldValue))) {
                  rowErrors.push(`Specification field "${field.label}" must be a number, but received: "${fieldValue}"`);
                }
              } else if (field.field_type === 'date') {
                const dateValue = new Date(fieldValue);
                if (isNaN(dateValue.getTime())) {
                  rowErrors.push(`Specification field "${field.label}" must be a valid date, but received: "${fieldValue}"`);
                }
              } else if (field.field_type === 'dropdown') {
                const validOptions = field.options || [];
                if (validOptions.length > 0 && !validOptions.includes(fieldValue)) {
                  rowErrors.push(`Specification field "${field.label}" must be one of: ${validOptions.join(', ')}, but received: "${fieldValue}"`);
                }
              }
            }
          });

          // Note: Custom specification fields (not defined in type management) are allowed
          // Only predefined fields are validated for required status and field types
        }
      }

      // Collect errors for this row
      if (rowErrors.length > 0) {
        errors.push(`Row ${rowNumber} (${itemName}): ${rowErrors.join('; ')}`);
      } else {
        validData.push(item);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      validData
    };
  };

  const handleExportComponents = () => {
    const exportData = components
      .filter((c) => !c.is_deleted)
      .map((component) => ({
        name: component.name,
        component_type: getTypeName(component.component_type_id || ''),
        manufacturer: component.manufacturer,
        part_number: component.part_number,
        compatible_with: component.compatible_with || '',
        status: component.status,
        condition: component.condition,
        region: getRegionName(component.region_id || ''),
        warehouse: getWarehouseName(component.warehouse_id || ''),
        specifications: JSON.stringify(transformSpecificationsForExport(component.specifications || {}, component.component_type_id)),
      }));

    exportToExcel({
      data: exportData,
      columns: [
        { header: 'Name', key: 'name' },
        { header: 'Component Type', key: 'component_type' },
        { header: 'Manufacturer', key: 'manufacturer' },
        { header: 'Part Number', key: 'part_number' },
        { header: 'Compatible With', key: 'compatible_with' },
        { header: 'Status', key: 'status' },
        { header: 'Condition', key: 'condition' },
        { header: 'Region', key: 'region' },
        { header: 'Warehouse', key: 'warehouse' },
        { header: 'Specifications', key: 'specifications' },
      ],
      filename: 'components',
      title: 'Components Export',
    });

  };


  const handleImportComponents = async () => {
    if (!importFile) {
      toast.error('Please select a file to import');
      return;
    }

    setIsImporting(true);
    try {
      const importedData = await importFromExcel<any[]>(importFile);

      if (!importedData || importedData.length === 0) {
        toast.error('No data found in the file');
        setIsImporting(false);
        return;
      }

      // Validate data first
      const validation = validateImportData(importedData);

      if (!validation.valid) {
        // Show validation errors
        setValidationErrors(validation.errors);
        setValidatedData(validation.validData);
        setShowValidationErrorDialog(true);
        setIsImporting(false);
        return;
      }

      // If all data is valid, proceed with import
      await proceedWithImport(importedData);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import components');
      setIsImporting(false);
    }
  };

  const proceedWithImport = async (dataToImport: any[]) => {
    setIsImporting(true);
    try {
      let successCount = 0;
      const errorMessages: string[] = [];

      for (const item of dataToImport) {
        try {
          const itemName = (item as any).name || (item as any)['Name'] || '';

          // Map names to IDs
          const componentTypeName = (item as any).component_type_id || (item as any)['Component Type ID'] || (item as any)['Component Type'] || (item as any).component_type || '';
          const regionName = (item as any).region_id || (item as any)['Region ID'] || (item as any)['Region'] || (item as any).region || '';
          const warehouseName = (item as any).warehouse_id || (item as any)['Warehouse ID'] || (item as any)['Warehouse'] || (item as any).warehouse || '';

          const componentType = componentTypeName
            ? componentTypes.find(ct => ct.type_name === componentTypeName || ct.id === componentTypeName)
            : null;

          const region = regionName
            ? regions.find(r => r.name === regionName || r.id === regionName)
            : null;

          const warehouse = warehouseName
            ? warehouses.find(w => w.name === warehouseName || w.id === warehouseName)
            : null;

          const componentData = {
            name: itemName,
            component_type_id: componentType?.id || null,
            manufacturer: (item as any).manufacturer || (item as any)['Manufacturer'] || '',
            part_number: (item as any).part_number || (item as any)['Part Number'] || '',
            compatible_with: (item as any).compatible_with || (item as any)['Compatible With'] || '',
            status: (item as any).status || (item as any)['Status'] || 'available',
            condition: (item as any).condition || (item as any)['Condition'] || 'working',
            region_id: region?.id || null,
            warehouse_id: warehouse?.id || null,
            specifications: (() => {
              const specValue = (item as any).specifications || (item as any)['Specifications'] || (item as any).specification || (item as any)['Specification'] || {};
              return typeof specValue === 'string'
                ? transformSpecificationsForImport(JSON.parse(specValue), componentType?.id || null, itemName)
                : transformSpecificationsForImport(specValue || {}, componentType?.id || null, itemName);
            })(),
            created_by: currentUser?.user_id || null,
            installed_in_device_id: null,
            updated_by: null,
            quantity: Number((item as any).quantity || (item as any)['Quantity'] || 1),
          };

          // Save component to database
          await createComponent(componentData);

          successCount++;
        } catch (error) {
          console.error('Error importing component:', error);
          errorMessages.push(`Failed to import: ${(item as any).name || (item as any)['Name'] || 'Unknown'}`);
        }
      }

      // Show error summary if there were errors
      if (errorMessages.length > 0) {
        toast.error(`Import completed with ${errorMessages.length} error(s). Check console for details.`);
        console.error('Import errors:', errorMessages);
      }

      if (successCount > 0) {
        await fetchComponents(); // Refresh to get latest data
        toast.success(`Imported ${successCount} components successfully`);
        setShowImportDialog(false);
        setImportFile(null);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import components');
    } finally {
      setIsImporting(false);
    }
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

          {/* <Button variant="outline" size="sm">

            <Download className="mr-2 h-4 w-4" /> Export

          </Button> */}

          {(currentUser?.role === "Admin" ||
            currentUser?.role === "Engineer") &&
            selectedComponentIds.size > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowRelocationDialog(true)}
              >
                <Component className="h-4 w-4 mr-2" />
                Relocate ({selectedComponentIds.size})

              </Button>

            )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportComponents}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>

            {currentUser?.role === 'Admin' && (
              <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
                <Upload className="mr-2 h-4 w-4" /> Import
              </Button>
            )}
          </div>


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

                placeholder="Search by name, or part number..."

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
                    <div className='col-span-2 flex items-center gap-2'>
                      {(currentUser?.role === "Admin" ||
                        currentUser?.role === "Engineer") && (
                          <Checkbox
                            checked={
                              selectedComponentIds.size > 0 &&
                              selectedComponentIds.size === groupedComponents.flatMap(g => g.items).length
                            }
                            onCheckedChange={(checked) => {
                              const allIds = groupedComponents.flatMap(g => g.items.map((i: any) => i.id));

                              if (checked) {
                                setSelectedComponentIds(new Set(allIds));
                              } else {
                                setSelectedComponentIds(new Set());
                              }
                            }}
                          />
                        )}
                      Name
                    </div>

                  </TableHead>


                  <TableHead>Type</TableHead>

                  <TableHead>Manufacturer</TableHead>

                  {/* <TableHead>Model</TableHead> */}

                  <TableHead>Part Number</TableHead>

                  <TableHead>Total Quantity</TableHead>

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

                          {/* <TableCell>

                            <div className="text-sm">

                              {group.model}

                            </div>

                          </TableCell> */}

                          <TableCell>

                            <div className="text-sm">

                              {group.part_number}

                            </div>

                          </TableCell>

                          <TableCell className="font-medium">

                            {totalCount}

                          </TableCell>

                        </TableRow>



                        {/* Expandable Row with Individual Items */}

                        {isExpanded && (

                          <TableRow>

                            <TableCell colSpan={7} className="px-4 py-2 bg-gray-50">

                              <div className="space-y-2">

                                {group.items.map((item: any) => (

                                  <div
                                    key={item.id}
                                    className="grid grid-cols-7 gap-2 px-3 py-2 bg-white rounded items-center cursor-pointer hover:bg-muted/50"
                                    onClick={() => {
                                      if (currentUser?.role === "Admin" || currentUser?.role === "Engineer") {
                                        const newSelected = new Set(selectedComponentIds);
                                        if (newSelected.has(item.id)) {
                                          newSelected.delete(item.id);
                                        } else {
                                          newSelected.add(item.id);
                                        }
                                        setSelectedComponentIds(newSelected);
                                      }
                                    }}
                                  >

                                    <div className='col-span-2 flex items-center gap-2' onClick={(e) => e.stopPropagation()}>
                                      {(currentUser?.role === "Admin" ||
                                        currentUser?.role === "Engineer") && (
                                          <Checkbox
                                            checked={selectedComponentIds.has(item.id)}
                                            onCheckedChange={(checked) => {
                                              const newSelected = new Set(selectedComponentIds);

                                              if (checked) {
                                                newSelected.add(item.id);
                                              } else {
                                                newSelected.delete(item.id);
                                              }

                                              setSelectedComponentIds(newSelected);
                                            }}
                                          />
                                        )}

                                      <div className="text-sm font-medium truncate" title={group.name}>

                                        {group.name}

                                      </div>
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

                                            setDeleteTarget({ id: item.id, name: item.name });

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

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="w-full max-w-lg overflow-auto">
          <DialogHeader className="overflow-hidden">
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Component
            </DialogTitle>
            <DialogDescription className="break-words overflow-hidden" style={{ overflowWrap: 'anywhere' }}>
              Are you sure you want to delete{' '}
              <strong className="break-all" style={{ overflowWrap: 'anywhere' }}>{deleteTarget?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="w-full max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Components from Excel</DialogTitle>
            <DialogDescription>
              Upload an Excel file with component data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!importFile ? (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-500 transition-colors cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                    setImportFile(file);
                  }
                }}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-12 w-12 text-gray-400" />
                  <p className="text-gray-500 text-sm">Drag and drop file</p>
                  <p className="text-gray-400 text-xs">or</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById('file-input')?.click();
                    }}
                  >
                    BROWSE
                  </Button>
                </div>
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
              </div>
            ) : (
              <div className="border-2 border-gray-300 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{importFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setImportFile(null)}
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImportDialog(false);
              setImportFile(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleImportComponents} disabled={!importFile || isImporting}>
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation Error Dialog */}
      <Dialog open={showValidationErrorDialog} onOpenChange={setShowValidationErrorDialog}>
        <DialogContent className="w-full max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Import Validation Errors
            </DialogTitle>
            <DialogDescription>
              The following data in your Excel file does not match the database. Please fix these errors before importing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <p className="text-sm font-medium text-destructive mb-2">
                Found {validationErrors.length} error(s) in {validationErrors.length + validatedData.length} row(s)
              </p>
              <div className="max-h-60 overflow-auto space-y-2">
                {validationErrors.map((error, index) => (
                  <div key={index} className="text-sm text-destructive bg-background p-2 rounded border border-destructive/20">
                    {error}
                  </div>
                ))}
              </div>
            </div>

            {validatedData.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-sm font-medium text-green-800 mb-2">
                  {validatedData.length} row(s) are valid and can be imported
                </p>
                <p className="text-xs text-green-700">
                  You can choose to import only the valid rows or cancel and fix all errors.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowValidationErrorDialog(false);
              setValidationErrors([]);
              setValidatedData([]);
            }}>
              Cancel
            </Button>
            {validatedData.length > 0 && (
              <Button onClick={async () => {
                setShowValidationErrorDialog(false);
                await proceedWithImport(validatedData);
              }}>
                Import Valid Rows Only ({validatedData.length})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>

  );

}