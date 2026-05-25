import React, { Component, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useHardwareInventoryStore } from '../store/useHardwareInventoryStore';
import { useRegionStore } from '../store/useRegionStore';
import { useWarehouseStore } from '../store/useWarehouseStore';
import { useComponentsStore } from '../store/useComponentsStore';
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
import { data } from 'react-router-dom';
import { it } from 'node:test';
export function ReportsPage() {
  const { hardwareInventory, fetchHardwareInventory } = useHardwareInventoryStore();
  const { regions, fetchRegions } = useRegionStore();
  const { warehouses, fetchWarehouses } = useWarehouseStore();
  const { components, fetchComponents } = useComponentsStore();

  useEffect(() => {
    fetchHardwareInventory();
    fetchRegions();
    fetchWarehouses();
    fetchComponents();
  }, []);

  const getRegionName = (id: string | null) => {
    return regions.find((r) => r.id === id)?.name || 'Unknown';
  };

  const getWarehouseName = (id: string | null) => {
    return warehouses.find((w) => w.id === id)?.name || 'Unknown';
  };

  const getInstalledComponents = (devieId: string) => {
    return components
      .filter(c => c.installed_in_device_id === devieId && !c.is_deleted)
      .map(c => `${c.name} (${c.model})`)
      .join(', ');
  };


  const handleExport = (format: string, reportName: string) => {
    if (reportName === 'Inventory Summary') {
      const data = hardwareInventory.filter(h => !h.is_deleted);

      if (format === 'CSV') {
        exportToCSV(data);
      } else if (format === 'Excel') {
        exportToExcel(data);
      } else if (format === 'PDF') {
        exportToPDF(data);
      }
    } else {
      toast.success(`${reportName} report exported as ${format}`);
    }
  };

  const exportToCSV = (data: any[]) => {
    const headers = ['Name', 'Type', 'Manufacturer', 'Serial Number', 'Asset Tag', 'Status', 'Condition', 'Region', 'Warehouse', 'Installed Components', 'Create Date'];
    const rows = data.map(item => [
      item.name,
      item.item_type,
      item.manufacturer,
      item.model,
      item.serial_number,
      item.asset_tag,
      item.status,
      item.condition,
      getRegionName(item.region_id),
      getWarehouseName(item.warehouse_id),
      getInstalledComponents(item.id),
      new Date(item.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory-summary-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV exported successfully');
  };


  const exportToExcel = (data: any[]) => {
    const headers = ['Name', 'Type', 'Manufacturer', 'Model', 'Serial Number', 'Asset Tag', 'Status', 'Condition', 'Region', 'Warehouse', 'Installed Components', 'Created Date'];
    const rows = data.map(item => [
      item.name,
      item.item_type,
      item.manufacturer,
      item.model,
      item.serial_number,
      item.asset_tag,
      item.status,
      item.condition,
      getRegionName(item.region_id),
      getWarehouseName(item.warehouse_id),
      getInstalledComponents(item.id),
      new Date(item.created_at).toLocaleDateString()
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Summary');
    XLSX.writeFile(workbook, `inventory-summary-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel exported successfully');

  };


  const exportToPDF = (data: any[]) => {
    const headers = ['Name', 'Type', 'Manufacturer', 'Model', 'Serial Number', 'Asset Tag', 'Status', 'Condition', 'Region', 'Warehouse', 'Installed Components', 'Created Date'];
    const rows = data.map(item => [
      item.name,
      item.item_type,
      item.manufacturer,
      item.model,
      item.serial_number,
      item.asset_tag,
      item.status,
      item.condition,
      getRegionName(item.region_id),
      getWarehouseName(item.warehouse_id),
      getInstalledComponents(item.id),
      new Date(item.created_at).toLocaleDateString()
    ]);

    let content = `
    <html>
    <head>
      <title>Inventory Summary Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style>
    </head>
    <body>
      <h1>Inventory Summary Report</h1>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              ${row.map(cell => `<td>${cell}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
      toast.success('PDF generated successfully');
    } else {
      toast.error('Failed to open print window');
    }
  }


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
      title: 'Warranty Report',
      description:
        'Items by warranty status (active, expiring soon, expired) with details.',
      icon: <ShieldAlert className="h-8 w-8 text-red-500" />
    },
    {
      title: 'Rack Utilization',
      description: 'Capacity usage and available space by warehouse and rack.',
      icon: <BarChart3 className="h-8 w-8 text-indigo-500" />
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