import React, { useState } from 'react';

import { useStore } from '../store/useStore';

import { useReservationsStore } from '../store/useReservationStore';

import { useComponentsStore } from '../store/useComponentsStore';

import { useHardwareInventoryStore } from '../store/useHardwareInventoryStore';

import { Card, CardContent } from '../components/ui/Card';

import {

  Table,

  TableBody,

  TableCell,

  TableHead,

  TableHeader,

  TableRow } from '../components/ui/Table';

import { Button } from '../components/ui/Button';

import { Badge } from '../components/ui/Badge';

import { Label } from '../components/ui/Label';

import { Plus, BoxIcon, Edit, Trash2, Activity, Eye } from 'lucide-react';

import { formatDate, getStatusColor } from '../lib/utils';

import { toast } from 'sonner';

import type { Reservation } from '../lib/types';

export function ReservedStockPage() {

  const {

    getUserName,

    currentUser,

    navigate,

  } = useStore();

  const { reservations, releaseReservation, fetchReservations, deleteReservation } = useReservationsStore();

  const { components, fetchComponents, updateComponent } = useComponentsStore();

  const { hardwareInventory, fetchHardwareInventory, updateHardwareInventory } = useHardwareInventoryStore();

  if (currentUser?.role !== 'Admin') {

    return (

      <div className="p-6 text-center">

        <p className="text-destructive">

          You do not have permission to view this page.

        </p>

      </div>);

  }



  const getItemName = (rs: Reservation) => {

    if (rs.component_id) {

      return components.find((c) => c.id === rs.component_id)?.name || 'Unknown Component';

    }

    if (rs.hardware_inventory_id) {

      return hardwareInventory.find((h) => h.id === rs.hardware_inventory_id)?.name || 'Unknown Item';

    }

    return 'Unknown Item';

  };



  const getItemType = (rs: Reservation) => {

    return rs.component_id ? 'Component' : 'Hardware Inventory';

  };



  const handleInUse = async (rs: Reservation) => {

    try {

      await releaseReservation(rs.id, rs.component_id || undefined, rs.hardware_inventory_id || undefined);

      toast.success('Item marked as in use and removed from reservations');

    } catch (error) {

      console.error('Error marking item as in use:', error);

      toast.error('Failed to mark item as in use');

    }

  };

  const handleViewDetail = (rs: Reservation) => {
    if (rs.component_id) {
      navigate('component-detail', rs.component_id);
    } else if (rs.hardware_inventory_id) {
      navigate('inventory-detail', rs.hardware_inventory_id);
    }
  };

  const handleDelete = async (rs: Reservation) => {
    if (window.confirm(`Are you sure you want to delete this reservation for "${getItemName(rs)}"?`)) {
      try {
        await deleteReservation(rs.id, rs.component_id || undefined, rs.hardware_inventory_id || undefined);
        toast.success('Reservation deleted successfully');
      } catch (error) {
        console.error('Error deleting reservation:', error);
        toast.error('Failed to delete reservation');
      }
    }
  };

  return (

    <div className="p-6 max-w-[1600px] mx-auto space-y-6">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

        <div>

          <h1 className="text-3xl font-bold tracking-tight font-heading">

            Reservations

          </h1>

          <p className="text-muted-foreground">

            View and manage reserved components and hardware inventory

          </p>

        </div>

      </div>



      <Card>

        <CardContent className="p-0">

          <Table>

            <TableHeader>

              <TableRow>

                <TableHead>Item</TableHead>

                <TableHead>Type</TableHead>

                <TableHead>Note</TableHead>

                <TableHead>Reserved By</TableHead>

                <TableHead>Date</TableHead>

                <TableHead>Status</TableHead>

                <TableHead className="text-right">Actions</TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {reservations.length > 0 ?

              reservations.map((rs) =>

              <TableRow key={rs.id}>

                    <TableCell>

                      <div className="flex items-center font-medium">

                        {getItemName(rs)}

                      </div>

                    </TableCell>

                    <TableCell>

                      <Badge variant="outline">

                        {getItemType(rs)}

                      </Badge>

                    </TableCell>

                    <TableCell className="max-w-[200px] truncate" title={rs.note}>

                      {rs.note}

                    </TableCell>

                    <TableCell>{getUserName(rs.reserved_by || '')}</TableCell>

                    <TableCell>

                      <div className="text-sm">

                        <div>{formatDate(rs.reserved_at)}</div>

                        {rs.released_at &&

                    <div className="text-xs text-muted-foreground">

                            Released: {formatDate(rs.released_at)}

                          </div>

                    }

                      </div>

                    </TableCell>

                    <TableCell>

                      <Badge

                    variant="outline"

                    className={getStatusColor(rs.status)}>

                        {rs.status}

                      </Badge>

                    </TableCell>

                    <TableCell className="text-right">

                      <div className="flex justify-end gap-2">

                        

                        {rs.status === 'active' && (

                          <Button

                            size="icon"

                            variant="outline"

                            onClick={() => handleInUse(rs)}

                            title="Mark as In Use"

                          >

                            <Activity className="h-4 w-4" />

                          </Button>

                        )}

                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleViewDetail(rs)}
                          title="View Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button

                          size="icon"

                          variant="ghost"

                          className="text-destructive hover:text-destructive hover:bg-destructive/10"

                          onClick={() => handleDelete(rs)}

                        >

                          <Trash2 className="h-4 w-4" />

                        </Button>

                      </div>

                    </TableCell>

                  </TableRow>

              ) :

              <TableRow>

                  <TableCell

                  colSpan={7}

                  className="text-center py-8 text-muted-foreground">

                    No reservations found.

                  </TableCell>

                </TableRow>

              }

            </TableBody>

          </Table>

        </CardContent>

      </Card>

    </div>

  );

}