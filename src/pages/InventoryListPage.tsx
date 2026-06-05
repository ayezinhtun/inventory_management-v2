import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { exportToExcel, importFromExcel } from '../lib/exportUtils';
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
import { Search, Plus, FilterX, ChevronDown, ChevronRight, Eye, Trash2, AlertTriangle, Loader2, Download, Upload, FileSpreadsheet, XCircle, File } from 'lucide-react';
import { toast } from 'sonner';
import type { HardwareInventory } from '../lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../components/ui/Dialog';
import { Label } from '../components/ui/Label';

export function InventoryListPage() {
  const { hardwareInventory, fetchHardwareInventory, deleteHardwareInventory, createHardwareInventory, isLoading } = useHardwareInventoryStore();
  const { regions } = useRegionStore();
  const { warehouses } = useWarehouseStore();
  const { navigate, currentUser } = useStore();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  //Import / Export state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidationErrorDialog, setShowValidationErrorDialog] = useState(false);
  const [validatedData, setValidatedData] = useState<any[]>([]);
  const [showImportErrorDialog, setShowImportErrorDialog] = useState(false);
  const [importErrorMessages, setImportErrorMessages] = useState<string[]>([]);

  // Define valid hardware types
  const VALID_HARDWARE_TYPES = ['Server', 'Laptop', 'Desktop', 'Router', 'Switch', 'Storage', 'Network', 'Other'];

  // Data is already fetched by fetchAppData() in useStore.ts during app initialization

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
          // h.model.toLowerCase().includes(q) ||
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

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteHardwareInventory(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted successfully`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error('Failed to delete hardware');
    } finally {
      setDeleteLoading(false);
    }
  }

  const getRegionName = (id: string | null) => {
    return regions.find((r) => r.id === id)?.name || 'Unknown';
  };

  const getWarehouseName = (id: string | null) => {
    return warehouses.find((w) => w.id === id)?.name || 'Unknown';
  };

  const uniqueTypes = useMemo(() => {
    return [...new Set(hardwareInventory.map(h => h.item_type))];
  }, [hardwareInventory]);

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
      } else if (!itemName.trim()) {
        rowErrors.push('Name cannot be empty or whitespace only');
      } else {
        // Check for duplicate name in existing hardware inventory
        const existingHardware = hardwareInventory.find(h => 
          h.name.toLowerCase() === itemName.toLowerCase() && !h.is_deleted
        );
        if (existingHardware) {
          rowErrors.push(`Hardware name "${itemName}" already exists in inventory`);
        }
      }

      // Validate required field: Item Type
      const itemType = (item as any).item_type || (item as any)['Item Type'] || (item as any).type || '';
      if (!itemType) {
        rowErrors.push('Missing required field: Item Type');
      } else if (!VALID_HARDWARE_TYPES.includes(itemType)) {
        rowErrors.push(`Invalid Item Type "${itemType}". Valid types are: ${VALID_HARDWARE_TYPES.join(', ')}`);
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

      // Validate Serial Number
      const serialNumber = (item as any).serial_number || (item as any)['Serial Number'] || '';
      if (!serialNumber) {
        rowErrors.push('Missing required field: Serial Number');
      }

      // Validate Specifications
      const specValue = (item as any).specifications || (item as any)['Specifications'] || (item as any).specification || (item as any)['Specification'] || {};
      let specsObj = typeof specValue === 'string' ? {} : specValue;

      try {
        if (typeof specValue === 'string') {
          specsObj = JSON.parse(specValue);
        }
      } catch (e) {
        rowErrors.push('Invalid JSON format in Specifications field');
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

  const handleExportHardware = () => {
    const exportData = hardwareInventory
      .filter((h) => !h.is_deleted)
      .map((hardware) => ({
        name: hardware.name,
        item_type: hardware.item_type,
        manufacturer: hardware.manufacturer,
        serial_number: hardware.serial_number,
        asset_tag: hardware.asset_tag || '',
        status: hardware.status,
        condition: hardware.condition,
        region: getRegionName(hardware.region_id || ''),
        warehouse: getWarehouseName(hardware.warehouse_id || ''),
        specifications: JSON.stringify(hardware.specifications || {}),
      }));

    exportToExcel({
      data: exportData,
      columns: [
        { header: 'Name', key: 'name' },
        { header: 'Item Type', key: 'item_type' },
        { header: 'Manufacturer', key: 'manufacturer' },
        { header: 'Serial Number', key: 'serial_number' },
        { header: 'Asset Tag', key: 'asset_tag' },
        { header: 'Status', key: 'status' },
        { header: 'Condition', key: 'condition' },
        { header: 'Region', key: 'region' },
        { header: 'Warehouse', key: 'warehouse' },
        { header: 'Specifications', key: 'specifications' },
      ],
      filename: 'hardware-inventory',
      title: 'Hardware Inventory Export',
    });
  };

  const handleImportHardware = async () => {
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
      toast.error('Failed to import hardware inventory');
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
          const itemType = (item as any).item_type || (item as any)['Item Type'] || (item as any).type || '';
          const regionName = (item as any).region_id || (item as any)['Region ID'] || (item as any)['Region'] || (item as any).region || '';
          const warehouseName = (item as any).warehouse_id || (item as any)['Warehouse ID'] || (item as any)['Warehouse'] || (item as any).warehouse || '';

          const region = regionName
            ? regions.find(r => r.name === regionName || r.id === regionName)
            : null;

          const warehouse = warehouseName
            ? warehouses.find(w => w.name === warehouseName || w.id === warehouseName)
            : null;

          const hardwareData = {
            name: itemName,
            item_type: itemType,
            manufacturer: (item as any).manufacturer || (item as any)['Manufacturer'] || '',
            serial_number: (item as any).serial_number || (item as any)['Serial Number'] || '',
            asset_tag: (item as any).asset_tag || (item as any)['Asset Tag'] || '',
            status: (item as any).status || (item as any)['Status'] || 'available',
            condition: (item as any).condition || (item as any)['Condition'] || 'working',
            region_id: region?.id || null,
            warehouse_id: warehouse?.id || null,
            specifications: (() => {
              const specValue = (item as any).specifications || (item as any)['Specifications'] || (item as any).specification || (item as any)['Specification'] || {};
              return typeof specValue === 'string'
                ? JSON.parse(specValue)
                : specValue || {};
            })(),
            created_by: currentUser?.user_id || null,
            updated_by: null,
          };

          // Save hardware to database
          await createHardwareInventory(hardwareData);

          successCount++;
        } catch (error: any) {
          console.error('Error importing hardware:', error);
          const itemName = (item as any).name || (item as any)['Name'] || 'Unknown';
          const errorMessage = error?.message || 'Unknown error';
          errorMessages.push(`${itemName}: ${errorMessage}`);
        }
      }

      // Show error summary if there were errors
      if (errorMessages.length > 0) {
        setImportErrorMessages(errorMessages);
        setShowImportErrorDialog(true);
        toast.error(`Import completed with ${errorMessages.length} error(s).`);
      }

      if (successCount > 0) {
        await fetchHardwareInventory(); // Refresh to get latest data
        toast.success(`Imported ${successCount} hardware items successfully`);
        setShowImportDialog(false);
        setImportFile(null);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import hardware inventory');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hardware Inventory</h1>
          <p className="text-muted-foreground">Manage your hardware assets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportHardware}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>

          {currentUser?.role === 'Admin' && (
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
          )}

          {currentUser?.role === 'Admin' && (
            <Button onClick={() => navigate('inventory-add')}>
              <Plus className="mr-2 h-4 w-4" /> Add Hardware
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, serial..."
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
                  <SelectValue placeholder="Region" displayValue={regionFilter !== 'all' ? getRegionName(regionFilter) : undefined} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions.filter((r) => r.status === 'active').map((r) => (
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
                  {/* <TableHead>Model</TableHead> */}
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
                        {/* <TableCell>{hardware.model}</TableCell> */}
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
                                onClick={() => setDeleteTarget({ id: hardware.id, name: hardware.name })}
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

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="w-full max-w-lg overflow-auto">
          <DialogHeader className="overflow-hidden">
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Hardware
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


      {/* ── Import Dialog ── */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="w-full max-w-lg overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Import Hardware Inventory
            </DialogTitle>
            <DialogDescription>
              Upload an Excel file to import hardware inventory items. 
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
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium mb-2">Valid Item Types:</p>
              <p className="text-muted-foreground">{VALID_HARDWARE_TYPES.join(', ')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImportDialog(false);
              setImportFile(null);
            }} disabled={isImporting}>
              Cancel
            </Button>
            <Button onClick={handleImportHardware} disabled={!importFile || isImporting}>
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Validation Error Dialog ── */}
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
            }} disabled={isImporting}>
              Cancel
            </Button>
            {validatedData.length > 0 && (
              <Button onClick={async () => {
                setShowValidationErrorDialog(false);
                await proceedWithImport(validatedData);
              }} disabled={isImporting}>
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Import Valid Data Only ({validatedData.length})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import Error Dialog ── */}
      <Dialog open={showImportErrorDialog} onOpenChange={setShowImportErrorDialog}>
        <DialogContent className="w-full max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Import Errors
            </DialogTitle>
            <DialogDescription>
              The following items failed to import. Please check the errors and try again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <p className="text-sm font-medium text-destructive mb-2">
                {importErrorMessages.length} item(s) failed to import
              </p>
              <div className="max-h-60 overflow-auto space-y-2">
                {importErrorMessages.map((error, index) => (
                  <div key={index} className="text-sm text-destructive bg-background p-2 rounded border border-destructive/20">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImportErrorDialog(false);
              setImportErrorMessages([]);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}