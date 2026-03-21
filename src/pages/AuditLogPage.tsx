import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent } from '../components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
'../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'../components/ui/Select';
import { formatDateTime } from '../lib/utils';
export function AuditLogPage() {
  const { auditLogs, currentUser, getUserName } = useStore();
  const [actionFilter, setActionFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  if (!currentUser) return null;
  // Filter logs based on role and filters
  let visibleLogs =
  currentUser.role === 'Admin' ?
  auditLogs :
  auditLogs.filter((log) => log.user_id === currentUser.id);
  if (actionFilter !== 'all') {
    visibleLogs = visibleLogs.filter((log) => log.action === actionFilter);
  }
  if (moduleFilter !== 'all') {
    visibleLogs = visibleLogs.filter((log) => log.module === moduleFilter);
  }
  // Get unique modules for filter
  const modules = Array.from(new Set(auditLogs.map((l) => l.module))).sort();
  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-100 text-emerald-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const formatDetails = (log: any) => {
    if (log.action === 'CREATE') {
      return `Created new record in ${log.module}`;
    }
    if (log.action === 'DELETE') {
      return `Deleted record from ${log.module}`;
    }
    // For UPDATE, try to show what changed
    if (log.old_value && log.new_value) {
      const changedKeys = Object.keys(log.new_value).filter(
        (key) =>
        JSON.stringify(log.old_value[key]) !==
        JSON.stringify(log.new_value[key])
      );
      if (changedKeys.length > 0) {
        if (changedKeys.includes('status')) {
          return `Updated status to ${log.new_value.status}`;
        }
        if (changedKeys.includes('quantity')) {
          return `Updated quantity to ${log.new_value.quantity}`;
        }
        return `Updated fields: ${changedKeys.join(', ')}`;
      }
    }
    return 'Updated record';
  };
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Audit Log
          </h1>
          <p className="text-muted-foreground">
            {currentUser.role === 'Admin' ?
            'Track all system activities and changes' :
            'View your recent activities'}
          </p>
        </div>

        <div className="flex gap-2">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="CREATE">Create</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
            </SelectContent>
          </Select>

          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {modules.map((m) =>
              <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleLogs.length > 0 ?
              visibleLogs.map((log) =>
              <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(log.timestamp)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getUserName(log.user_id)}
                    </TableCell>
                    <TableCell>
                      <Badge
                    variant="outline"
                    className={getActionColor(log.action)}>
                    
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.module}</TableCell>
                    <TableCell className="text-sm">
                      {formatDetails(log)}
                    </TableCell>
                  </TableRow>
              ) :

              <TableRow>
                  <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground">
                  
                    No audit logs found matching your filters.
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>);

}