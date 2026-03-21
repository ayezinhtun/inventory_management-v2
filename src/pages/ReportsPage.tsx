import React, { Component } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter } from
'../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Download,
  FileText,
  BarChart3,
  Activity,
  ShieldAlert,
  Package,
  Server } from
'lucide-react';
import { toast } from 'sonner';
export function ReportsPage() {
  const handleExport = (format: string, reportName: string) => {
    toast.success(`Exporting ${reportName} as ${format}...`);
    // Simulate export delay
    setTimeout(() => {
      toast.success(`${reportName} exported successfully`);
    }, 1500);
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