import React, { Component, useEffect } from 'react';
import { useHardwareInventoryStore } from '../store/useHardwareInventoryStore';
import { useRegionStore } from '../store/useRegionStore';
import { useWarehouseStore } from '../store/useWarehouseStore';
import { useComponentsStore } from '../store/useComponentsStore';
import { useRelocationStore } from '../store/useRelocationStore';
import { useUsersStore } from '../store/useUsersStore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from
  '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Download,
  FileText,
  BarChart3,
  Activity,
  ShieldAlert,
  Package,
  Server
} from
  'lucide-react';
import { toast } from 'sonner';
import { exportData, ExportColumn } from '../lib/exportUtils';
export function ReportsPage() {
  const { hardwareInventory, fetchHardwareInventory } = useHardwareInventoryStore();
  const { regions, fetchRegions } = useRegionStore();
  const { warehouses, fetchWarehouses } = useWarehouseStore();
  const { components, fetchComponents } = useComponentsStore();
  const { relocationRequests, fetchRelocationRequests } = useRelocationStore();
  const { users, fetchUsers } = useUsersStore();

  // Data is already fetched by fetchAppData() in useStore.ts during app initialization
  // Relocation requests need to be fetched separately
  useEffect(() => {
    fetchRelocationRequests();
  }, []);

  const getRegionName = (id: string | null) => {
    return regions.find((r) => r.id === id)?.name || '-';
  };

  const getWarehouseName = (id: string | null) => {
    return warehouses.find((w) => w.id === id)?.name || '-';
  };

  const getInstalledComponents = (devieId: string) => {
    return components
      .filter(c => c.installed_in_device_id === devieId && !c.is_deleted)
      .map(c => c.name)
      .join(', ');
  };

  const getInstalledDeviceName = (componentId: string) => {
    const component = components.find(c => c.id === componentId);
    if (!component || !component.installed_in_device_id) return 'Not Installed';
    const device = hardwareInventory.find(h => h.id === component.installed_in_device_id);
    return device ? device.name : 'Unknown Device';
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return '-';
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown User';
  };

  const getServerName = (serverId: string | null) => {
    if (!serverId) return '-';
    const server = hardwareInventory.find(h => h.id === serverId);
    return server ? server.name : 'Unknown Server';
  };

  const getItemName = (request: any) => {
    if (request.relocation_type === 'INVENTORY' && request.inventory_id) {
      const item = hardwareInventory.find(h => h.id === request.inventory_id);
      return item ? item.name : 'Unknown Item';
    } else if (request.relocation_type === 'COMPONENT' && request.component_id) {
      const component = components.find(c => c.id === request.component_id);
      return component ? component.name : 'Unknown Component';
    }
    return '-';
  };


  const handleExport = (format: 'CSV' | 'Excel' | 'PDF', reportName: string) => {
    if (reportName === 'Inventory Summary') {
      const data = hardwareInventory.filter(h => !h.is_deleted);

      const columns: ExportColumn[] = [
        { header: 'Model', key: 'name' },
        { header: 'Type', key: 'item_type' },
        { header: 'Hostname', key: 'hostname'},
        { header: 'Manufacturer', key: 'manufacturer' },
        { header: 'Serial Number', key: 'serial_number' },
        { header: 'Asset Tag', key: 'asset_tag' },
        { header: 'Status', key: 'status' },
        { header: 'Condition', key: 'condition' },
        { header: 'Region', key: 'region_id', formatter: (value) => getRegionName(value) },
        { header: 'Warehouse', key: 'warehouse_id', formatter: (value) => getWarehouseName(value) },
        { header: 'Installed Components', key: 'id', formatter: (value, row) => getInstalledComponents(row.id) },
        { header: 'Created Date', key: 'created_at', formatter: (value) => new Date(value).toLocaleDateString() }
      ];

      exportData(format, {
        data,
        columns,
        filename: 'inventory-summary',
        title: 'Inventory Summary Report'
      });
    } else if (reportName === 'Component Summary') {
      const data = components.filter(c => !c.is_deleted);

      const columns: ExportColumn[] = [
        { header: 'Name', key: 'name' },
        { header: 'Hostname', key: 'hostname'},
        { header: 'Manufacturer', key: 'manufacturer' },
        { header: 'Part Number', key: 'part_number' },
        { header: 'Status', key: 'status' },
        { header: 'Condition', key: 'condition' },
        { header: 'Region', key: 'region_id', formatter: (value) => getRegionName(value) },
        { header: 'Warehouse', key: 'warehouse_id', formatter: (value) => getWarehouseName(value) },
        { header: 'Installed In Device', key: 'id', formatter: (value) => getInstalledDeviceName(value) },
        { header: 'Compatible With', key: 'compatible_with' },
        { header: 'Created Date', key: 'created_at', formatter: (value) => new Date(value).toLocaleDateString() }
      ];

      exportData(format, {
        data,
        columns,
        filename: 'component-summary',
        title: 'Component Summary Report'
      });
    } else if (reportName === 'Item Movement History') {
      const data = relocationRequests;

      const columns: ExportColumn[] = [
        { header: 'Request Number', key: 'request_number' },
        { header: 'Type', key: 'relocation_type' },
        { header: 'Item Name', key: 'id', formatter: (value, row) => getItemName(row) },
        { header: 'Status', key: 'status' },
        { header: 'Created By', key: 'requester_id', formatter: (value) => getUserName(value) },
        { header: 'Created Date', key: 'created_at', formatter: (value) => new Date(value).toLocaleDateString() },
        { header: 'From Region', key: 'source_region_id', formatter: (value) => getRegionName(value) },
        { header: 'From Warehouse', key: 'source_warehouse_id', formatter: (value) => getWarehouseName(value) },
        { header: 'From Server', key: 'source_server_id', formatter: (value) => getServerName(value) },
        { header: 'To Region', key: 'destination_region_id', formatter: (value) => getRegionName(value) },
        { header: 'To Warehouse', key: 'destination_warehouse_id', formatter: (value) => getWarehouseName(value) },
        { header: 'To Server', key: 'destination_server_id', formatter: (value) => getServerName(value) },
        { header: 'PM Reviewed By', key: 'pm_reviewed_by', formatter: (value) => getUserName(value) },
        { header: 'PM Review Date', key: 'pm_reviewed_at', formatter: (value) => value ? new Date(value).toLocaleDateString() : '-' },
        { header: 'PM Comments', key: 'pm_comments' },
        { header: 'Admin Reviewed By', key: 'admin_reviewed_by', formatter: (value) => getUserName(value) },
        { header: 'Admin Review Date', key: 'admin_reviewed_at', formatter: (value) => value ? new Date(value).toLocaleDateString() : '-' },
        { header: 'Admin Comments', key: 'admin_comments' },
        { header: 'Completed By', key: 'completed_by', formatter: (value) => getUserName(value) },
        { header: 'Completed Date', key: 'completed_at', formatter: (value) => value ? new Date(value).toLocaleDateString() : '-' },
        { header: 'Reason', key: 'reason' },
        { header: 'Urgency', key: 'urgency' }
      ];

      exportData(format, {
        data,
        columns,
        filename: 'item-movement-history',
        title: 'Item Movement History Report'
      });
    } else if (reportName === 'Pending Requests') {
      const data = relocationRequests.filter(r => r.status === 'Pending PM Approval' || r.status === 'Pending Admin Approval');

      const columns: ExportColumn[] = [
        { header: 'Request Number', key: 'request_number' },
        { header: 'Type', key: 'relocation_type' },
        { header: 'Item Name', key: 'id', formatter: (value, row) => getItemName(row) },
        { header: 'Status', key: 'status' },
        { header: 'Created By', key: 'requester_id', formatter: (value) => getUserName(value) },
        { header: 'Created Date', key: 'created_at', formatter: (value) => new Date(value).toLocaleDateString() },
        {
          header: 'Days Pending', key: 'created_at', formatter: (value) => {
            const created = new Date(value);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - created.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays.toString();
          }
        },
        { header: 'From Region', key: 'source_region_id', formatter: (value) => getRegionName(value) },
        { header: 'From Warehouse', key: 'source_warehouse_id', formatter: (value) => getWarehouseName(value) },
        { header: 'To Region', key: 'destination_region_id', formatter: (value) => getRegionName(value) },
        { header: 'To Warehouse', key: 'destination_warehouse_id', formatter: (value) => getWarehouseName(value) },
        { header: 'Reason', key: 'reason' },
        { header: 'Urgency', key: 'urgency' }
      ];

      exportData(format, {
        data,
        columns,
        filename: 'pending-requests',
        title: 'Pending Requests Report'
      });
    } else if (reportName === 'Component Installation Report') {
      const data = components.filter(c => !c.is_deleted && c.installed_in_device_id);

      const columns: ExportColumn[] = [
        { header: 'Component Name', key: 'name' },
        { header: 'Hostname', key: 'hostname' },
        { header: 'Manufacturer', key: 'manufacturer' },
        { header: 'Part Number', key: 'part_number' },
        { header: 'Status', key: 'status' },
        { header: 'Condition', key: 'condition' },
        { header: 'Installed In Device', key: 'id', formatter: (value, row) => getInstalledDeviceName(row.id) },
        { header: 'Region', key: 'region_id', formatter: (value) => getRegionName(value) },
        { header: 'Warehouse', key: 'warehouse_id', formatter: (value) => getWarehouseName(value) },
        { header: 'Created Date', key: 'created_at', formatter: (value) => new Date(value).toLocaleDateString() }
      ];

      exportData(format, {
        data,
        columns,
        filename: 'component-installation',
        title: 'Component Installation Report'
      });
    } else if (reportName === 'Component Status Report') {
      const data = components.filter(c => !c.is_deleted);

      const columns: ExportColumn[] = [
        { header: 'Component Name', key: 'name' },
        { header: 'Hostname', key: 'hostname' },
        { header: 'Manufacturer', key: 'manufacturer' },
        { header: 'Part Number', key: 'part_number' },
        { header: 'Status', key: 'status' },
        { header: 'Condition', key: 'condition' },
        { header: 'Installed In Device', key: 'id', formatter: (value, row) => getInstalledDeviceName(row.id) },
        { header: 'Region', key: 'region_id', formatter: (value) => getRegionName(value) },
        { header: 'Warehouse', key: 'warehouse_id', formatter: (value) => getWarehouseName(value) },
        { header: 'Compatible With', key: 'compatible_with' },
        { header: 'Created Date', key: 'created_at', formatter: (value) => new Date(value).toLocaleDateString() }
      ];

      exportData(format, {
        data,
        columns,
        filename: 'component-status',
        title: 'Component Status Report'
      });
    } else {
      toast.success(`${reportName} report exported as ${format}`);
    }
  };


  const reports = [
    {
      title: 'Inventory Summary',
      description:
        'Complete list of all inventory items with quantities, values, and conditions.',
      icon: <Server className="h-8 w-8 text-blue-500" />
    },
    {
      title: 'Component Summary',
      description:
        'List of all components with locations, installed devices, and stock levels.',
      icon: <Package className="h-8 w-8 text-emerald-500" />
    },
    {
      title: 'Item Movement History',
      description:
        'Complete relocation and installation history of items within a date range.',
      icon: <Activity className="h-8 w-8 text-purple-500" />
    },
    {
      title: 'Pending Requests',
      description:
        'All pending requests across all types with aging information.',
      icon: <FileText className="h-8 w-8 text-amber-500" />
    },
    {
      title: 'Component Installation Report',
      description:
        'List of all components showing which devices they are installed in.',
      icon: <Package className="h-8 w-8 text-red-500" />
    },
    {
      title: 'Component Status Report',
      description: 'Components grouped by status (Available, Installed, Damaged, etc.).',
      icon: <Activity className="h-8 w-8 text-indigo-500" />
    }];

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-heading">
          Reports
        </h1>
        <p className="text-muted-foreground">
          Generate and export system reports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report, index) =>
          <Card key={index} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-muted rounded-lg">{report.icon}</div>
                <CardTitle className="text-xl">{report.title}</CardTitle>
              </div>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {/* Could add date range pickers or filters here in the future */}
            </CardContent>
            <CardFooter className="flex gap-2 border-t pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleExport('CSV', report.title)}>

                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleExport('Excel', report.title)}>

                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleExport('PDF', report.title)}>

                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>);

}