// ============================================================
// 1CNG Inventory Management System — Core Type Definitions
// ============================================================

// --- Enums / Unions ---
export type UserRole = 'Admin' | 'PM' | 'Engineer';
export type ItemType =
  'Server' |
  'Switch' |
  'Router' |
  'Firewall' |
  'Storage Array';

export type Urgency = 'Emergency' | 'Critical' | 'High' | 'Medium' | 'Low';

export type ItemStatus = 'available' | 'installed' | 'reserved' | 'broken';
export type ItemCondition = 'working' | 'broken';

export type InventoryRequestStatus =
  'Draft' |
  'Submitted' |
  'Pending' |
  'Approved' |
  'Rejected' |
  'Fulfilled' |
  'Cancelled';

export type InstallRequestStatus =
  'Draft' |
  'Submitted' |
  'Pending PM Approval' |
  'Rejected by PM' |
  'Pending Admin Approval' |
  'Rejected by Admin' |
  'Approved' |
  'Scheduled' |
  'In Progress' |
  'Testing' |
  'Completed' |
  'Failed' |
  'Rolled Back';

export type RelocationRequestStatus =
  'Draft' |
  'Submitted' |
  'Pending PM Approval' |
  'Rejected by PM' |
  'Pending Admin Approval' |
  'Rejected by Admin' |
  'Approved' |
  'Scheduled' |
  'In Progress' |
  'Completed' |
  'Failed' |
  'Rolled Back';

export type RelocationType = 'INVENTORY' | 'COMPONENT';

export type ReservationStatus = 'active' | 'released';

export type POStatus =
  'Draft' |
  'Submitted' |
  'Approved' |
  'Ordered' |
  'Partially Received' |
  'Fully Received' |
  'Cancelled';

export type RMAStatus =
  'Initiated' |
  'Shipped' |
  'Received by Vendor' |
  'In Process' |
  'Resolved' |
  'Closed';

export type DisposalStatus = 'Pending' | 'Approved' | 'Disposed' | 'Cancelled';
export type MaintenanceStatus =
  'Scheduled' |
  'In Progress' |
  'Completed' |
  'Overdue' |
  'Cancelled';
export type CheckoutStatus = 'Checked Out' | 'Returned' | 'Overdue' | 'Lost';
export type StocktakeStatus =
  'Planned' |
  'In Progress' |
  'Completed' |
  'Cancelled';
export type ReservedStockStatus = 'Active' | 'Released' | 'Expired';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type ComponentMovementType = 'CREATED' | 'INSTALLED' | 'UNINSTALLED' | 'RELOCATED';
export type NotificationType = 'install' | 'relocation' | 'inventory';

export type GoodsReceiptStatus =
  'Pending' |
  'Partially Received' |
  'Fully Received' |
  'Rejected';

// --- Core Entities ---
export interface User {
  id: string;
  user_id: string;
  name: string;
  full_name: string;
  email: string;
  role: UserRole;
  region_id: string | null;
  warehouse_id: string | null;
  assigned_region_ids?: string[];
  assigned_warehouse_ids?: string[];
  status: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Region {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  region_id: string;
  address?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Rack {
  id: string;
  name: string;
  warehouse_id: string;
  location: string;
  total_units: number;
  used_units: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormField {
  id: string;
  label: string;
  field_type: 'text' | 'number' | 'date' | 'time' | 'dropdown';
  required: boolean;
  options?: string[]; // Choices for dropdown type
}

export interface ComponentType {
  id: string;
  type_name: string;
  category: string;
  description: string;
  requires_specification: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  fields: FormField[];
}

export interface HardwareInventory {
  id: string;
  name: string;
  item_type: string;
  specifications: Record<string, any>;
  manufacturer: string;
  model?: string;
  serial_number: string;
  asset_tag: string;
  status: 'available' | 'installed' | 'reserved';
  condition: 'working' | 'broken';
  region_id: string | null;
  warehouse_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}


export interface Component {
  id: string;
  name: string;
  component_type_id: string | null;
  specifications: Record<string, any>;
  manufacturer: string;
  model?: string;
  part_number: string;
  compatible_with: string;
  status: 'available' | 'installed' | 'reserved' | 'broken';
  condition: 'working' | 'broken';
  region_id: string | null;
  warehouse_id: string | null;
  installed_in_device_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface InventoryRequest {
  id: string;
  request_number: string;
  requester_id: string;
  requested_item: string;
  item_type: string;
  manufacturer: string;
  model: string;
  specifications: string;
  quantity: number;
  estimated_unit_cost: number | null;
  estimated_total_cost: number | null;
  purpose: string;
  business_justification: string;
  urgency: Urgency;
  required_by: string | null;
  budget_code: string;
  project_name: string;
  preferred_vendor: string;
  status: InventoryRequestStatus;
  admin_response: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstallRequest {
  id: string;
  request_number: string;
  requester_id: string;
  component_id: string;
  source_warehouse_id: string;
  destination_warehouse_id: string;
  destination_server_id: string;
  quantity: number;
  purpose: string;
  urgency: Urgency;
  notes: string;
  status: InstallRequestStatus;
  pm_reviewed_by: string | null;
  pm_reviewed_at: string | null;
  pm_comments: string;
  admin_reviewed_by: string | null;
  admin_reviewed_at: string | null;
  admin_comments: string;
  assigned_to: string | null;
  completed_by: string | null;
  completed_at: string | null;
  completion_notes: string;
  created_at: string;
  updated_at: string;
}

export interface RelocationRequest {
  id: string;
  request_number: string;
  requester_id: string;
  relocation_type: RelocationType;
  inventory_id: string | null;
  component_id: string | null;
  quantity: number;
  source_region_id: string;
  source_warehouse_id: string;
  source_server_id: string | null;
  destination_region_id: string;
  destination_warehouse_id: string;
  destination_server_id: string | null;
  reason: string;
  urgency: Urgency;
  notes: string;
  status: RelocationRequestStatus;
  pm_reviewed_by: string | null;
  pm_reviewed_at: string | null;
  pm_comments: string;
  admin_reviewed_by: string | null;
  admin_reviewed_at: string | null;
  admin_comments: string;
  assigned_to: string | null;
  completed_by: string | null;
  completed_at: string | null;
  completion_notes: string;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  component_id: string | null; 
  hardware_inventory_id: string | null; 
  reserved_by: string | null; 
  note: string; 
  reserved_at: string; 
  released_at: string | null; 
  status: ReservationStatus;
}

export interface Customer {
  id: string;
  customer_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  customer_type: string;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  vendor_name: string;
  vendor_code: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  vendor_type: string;
  payment_terms: string;
  lead_time_days: number;
  rating: number;
  is_preferred: boolean;
  products_services: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  order_date: string;
  expected_delivery_date: string | null;
  status: POStatus;
  line_items: any[];
  subtotal: number;
  tax: number;
  shipping_cost: number;
  total_amount: number;
  payment_terms: string;
  notes: string;
  requested_by: string;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservedStock {
  id: string;
  inventory_id: string | null;
  component_id: string | null;
  quantity_reserved: number;
  reserved_for: string;
  reserved_by: string;
  reservation_date: string;
  expected_release_date: string | null;
  status: ReservedStockStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ComponentHistory {
  id: string;
  component_id: string;
  movement_type: ComponentMovementType;
  from_region_id: string | null;
  from_warehouse_id: string | null;
  from_device_id: string | null;
  to_region_id: string | null;
  to_warehouse_id: string | null;
  to_device_id: string | null;
  moved_by: string;
  related_request_id: string | null;
  related_request_type: 'install' | 'relocation' | null;
  notes: string;
  moved_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: AuditAction;
  module: string;
  record_id: string;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  ip_address: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  notification_type: NotificationType;
  related_request_type: string;
  related_request_id: string;
  is_read: boolean;
  created_at: string;
}

export interface MaintenanceTask {
  id: string;
  task_name: string;
  description: string;
  inventory_id: string | null;
  component_id: string | null;
  maintenance_type: string;
  priority: Urgency;
  scheduled_date: string;
  estimated_duration_minutes: number;
  assigned_to: string | null;
  recurrence: string;
  status: MaintenanceStatus;
  completion_notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GoodsReceipt {
  id: string;
  receipt_number: string;
  po_id: string;
  received_by: string;
  received_date: string;
  line_items: {
    item_name: string;
    expected_qty: number;
    received_qty: number;
    condition: ItemCondition;
    notes: string;
  }[];
  status: GoodsReceiptStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface RMARecord {
  id: string;
  rma_number: string;
  vendor_id: string;
  inventory_id: string | null;
  component_id: string | null;
  item_name: string;
  reason: string;
  quantity: number;
  status: RMAStatus;
  shipped_date: string | null;
  received_date: string | null;
  resolution: string;
  tracking_number: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DisposalRecord {
  id: string;
  disposal_number: string;
  inventory_id: string | null;
  component_id: string | null;
  item_name: string;
  reason: string;
  disposal_method: string;
  quantity: number;
  status: DisposalStatus;
  approved_by: string | null;
  disposed_date: string | null;
  certificate_number: string;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface StocktakeRecord {
  id: string;
  stocktake_number: string;
  warehouse_id: string;
  scheduled_date: string;
  completed_date: string | null;
  assigned_to: string | null;
  status: StocktakeStatus;
  items: {
    item_id: string;
    item_name: string;
    expected_qty: number;
    actual_qty: number;
    discrepancy: number;
    notes: string;
  }[];
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// --- Navigation ---
export interface NavItem {
  label: string;
  icon: string;
  path: string;
  roles: UserRole[];
  children?: NavItem[];
  badge?: number;
}

// --- Dashboard ---
export interface DashboardMetric {
  label: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  icon: string;
}