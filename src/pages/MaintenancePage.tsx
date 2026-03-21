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
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Textarea } from '../components/ui/Textarea';
import { ScrollArea } from '../components/ui/ScrollArea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'../components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
'../components/ui/Dialog';
import { Plus, Wrench } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { toast } from 'sonner';
import type { Urgency } from '../lib/types';
export function MaintenancePage() {
  const {
    maintenanceTasks,
    users,
    currentUser,
    getUserName,
    addMaintenanceTask
  } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Form state
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('Preventive');
  const [priority, setPriority] = useState<Urgency>('Medium');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [duration, setDuration] = useState(60);
  const [assignedTo, setAssignedTo] = useState('');
  const [recurrence, setRecurrence] = useState('None');
  if (currentUser?.role !== 'Admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">
          You do not have permission to view this page.
        </p>
      </div>);

  }
  const engineers = users.filter((u) => u.role === 'Engineer');
  const handleSave = () => {
    if (!taskName || !description) {
      toast.error('Please fill out task name and description');
      return;
    }
    addMaintenanceTask({
      task_name: taskName,
      description,
      inventory_id: null,
      component_id: null,
      maintenance_type: maintenanceType,
      priority,
      scheduled_date: new Date(scheduledDate).toISOString(),
      estimated_duration_minutes: duration,
      assigned_to: assignedTo || null,
      recurrence,
      status: 'Scheduled',
      completion_notes: '',
      created_by: currentUser.id
    });
    toast.success('Maintenance task scheduled');
    setIsDialogOpen(false);
    resetForm();
  };
  const resetForm = () => {
    setTaskName('');
    setDescription('');
    setMaintenanceType('Preventive');
    setPriority('Medium');
    setScheduledDate(new Date().toISOString().split('T')[0]);
    setDuration(60);
    setAssignedTo('');
    setRecurrence('None');
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Scheduled':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Scheduled
          </Badge>);

      case 'In Progress':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            In Progress
          </Badge>);

      case 'Completed':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Completed
          </Badge>);

      case 'Overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'Cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Emergency':
      case 'Critical':
        return <Badge variant="destructive">{priority}</Badge>;
      case 'High':
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            {priority}
          </Badge>);

      case 'Medium':
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {priority}
          </Badge>);

      case 'Low':
        return <Badge variant="secondary">{priority}</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-heading">
            Maintenance
          </h1>
          <p className="text-muted-foreground">
            Schedule and track hardware maintenance tasks
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Task
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenanceTasks.length > 0 ?
              maintenanceTasks.map((task) =>
              <TableRow key={task.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Wrench className="h-4 w-4 mr-2 text-muted-foreground" />
                        {task.task_name}
                      </div>
                    </TableCell>
                    <TableCell>{task.maintenance_type}</TableCell>
                    <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                    <TableCell>{formatDate(task.scheduled_date)}</TableCell>
                    <TableCell>{task.estimated_duration_minutes} min</TableCell>
                    <TableCell>
                      {task.assigned_to ?
                  getUserName(task.assigned_to) :
                  'Unassigned'}
                    </TableCell>
                    <TableCell>{getStatusBadge(task.status)}</TableCell>
                  </TableRow>
              ) :

              <TableRow>
                  <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground">
                  
                    No maintenance tasks found.
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Maintenance Task</DialogTitle>
            <DialogDescription>
              Create a new preventive or corrective maintenance task.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Task Name *</Label>
                <Input
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="e.g., Quarterly Server Cleaning" />
                
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Maintenance Type</Label>
                  <Select
                    value={maintenanceType}
                    onValueChange={setMaintenanceType}>
                    
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Preventive">Preventive</SelectItem>
                      <SelectItem value="Corrective">Corrective</SelectItem>
                      <SelectItem value="Inspection">Inspection</SelectItem>
                      <SelectItem value="Upgrade">Upgrade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(v: Urgency) => setPriority(v)}>
                    
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Scheduled Date</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)} />
                  
                </div>
                <div className="space-y-2">
                  <Label>Est. Duration (minutes)</Label>
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))} />
                  
                </div>
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      {engineers.map((e) =>
                      <SelectItem key={e.id} value={e.id}>
                          {e.full_name}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Recurrence</Label>
                  <Select value={recurrence} onValueChange={setRecurrence}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                      <SelectItem value="Annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  placeholder="Detailed instructions for the task..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4} />
                
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Schedule Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}