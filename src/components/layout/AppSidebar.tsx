import React from "react";
import { useStore } from "../../store/useStore";
import { useAuthStore } from "../../store/useAuthStore";
import logo from '../../assets/image/logo.png';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "../ui/Sidebar";
import { Avatar, AvatarFallback } from "../ui/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/DropdownMenu";
import { getInitials } from "../../lib/utils";
import {
  LayoutDashboard,
  Server,
  Cpu,
  MapPin,
  Building2,
  ClipboardList,
  Wrench,
  ArrowRightLeft,
  Users,
  Settings,
  LogOut,
  Bell,
  FileText,
  ShieldAlert,
  ShoppingCart,
  PackageCheck,
  RefreshCw,
  Trash2,
  CalendarClock,
  Activity,
  BoxIcon,
  Mail,
} from "lucide-react";
export function AppSidebar() {
  const {
    currentUser,
    currentPage,
    navigate,
    getUnreadNotificationCount,
  } = useStore();
  const { logout } = useAuthStore();
  if (!currentUser) return null;
  const role = currentUser.role;
  const unreadCount = getUnreadNotificationCount();
  // Define navigation structure based on roles
  const navGroups = [
    {
      label: "Overview",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          roles: ["Admin", "PM", "Engineer"],
        },
        {
          id: "notifications-page",
          label: "Notifications",
          icon: Bell,
          roles: ["Admin", "PM", "Engineer"],
          badge: unreadCount > 0 ? unreadCount : undefined,
        },
      ],
    },
    {
      label: "Inventory",
      items: [
        {
          id: "inventory",
          label: "Hardware Inventory",
          icon: Server,
          roles: ["Admin", "PM", "Engineer"],
        },
        {
          id: "components",
          label: "Components",
          icon: Cpu,
          roles: ["Admin", "PM", "Engineer"],
        },
        {
          id: "reserved-stock",
          label: "Reserved Stock",
          icon: BoxIcon,
          roles: ["Admin"],
        },
        // {
        //   id: "racks",
        //   label: "Racks & Capacity",
        //   icon: Building2,
        //   roles: ["Admin", "PM", "Engineer"],
        // },
      ],
    },
    {
      label: "Requests",
      items: [
       /* This part of the code defines an item in the navigation structure for the "Requests" section
       of the sidebar. Here's what each property represents: */
        // {
        //   id: "inventory-requests",
        //   label: "Inventory Requests",
        //   icon: ShoppingCart,
        //   roles: ["Admin", "PM", "Engineer"],
        // },
        // {
        //   id: "install-requests",
        //   label: "Install Requests",
        //   icon: Wrench,
        //   roles: ["Engineer"],
        // },
        // {
        //   id: "install-pm",
        //   label: "Install Approvals",
        //   icon: ClipboardList,
        //   roles: ["PM"],
        // },
        // {
        //   id: "install-admin",
        //   label: "Install Approvals",
        //   icon: ClipboardList,
        //   roles: ["Admin"],
        // },
        {
          id: "relocation-requests",
          label: "Relocation Requests",
          icon: ArrowRightLeft,
          roles: ["Engineer"],
        },
        {
          id: "relocation-pm",
          label: "Relocation Approvals",
          icon: ClipboardList,
          roles: ["PM"],
        },
        {
          id: "relocation-admin",
          label: "Relocation Approvals",
          icon: ClipboardList,
          roles: ["Admin"],
        },
      ],
    },
    {
      label: "Operations",
      items: [
        // {
        //   id: "physical-install",
        //   label: "Physical Installs",
        //   icon: Wrench,
        //   roles: ["Admin", "PM", "Engineer"],
        // },
        // {
        //   id: "physical-relocation",
        //   label: "Physical Relocations",
        //   icon: ArrowRightLeft,
        //   roles: ["Admin", "PM", "Engineer"],
        // },
        // {
        //   id: "maintenance",
        //   label: "Maintenance",
        //   icon: CalendarClock,
        //   roles: ["Admin"],
        // },
        // {
        //   id: "stocktake",
        //   label: "Stocktake",
        //   icon: Activity,
        //   roles: ["Admin"],
        // },
      ],
    },
    {
      label: "Procurement & Lifecycle",
      items: [
        // {
        //   id: "vendors",
        //   label: "Vendors",
        //   icon: Building2,
        //   roles: ["Admin"],
        // },
        // {
        //   id: "purchase-orders",
        //   label: "Purchase Orders",
        //   icon: FileText,
        //   roles: ["Admin"],
        // },
        // {
        //   id: "goods-receipt",
        //   label: "Goods Receipt",
        //   icon: PackageCheck,
        //   roles: ["Admin"],
        // },
        // {
        //   id: "rma",
        //   label: "RMA Management",
        //   icon: RefreshCw,
        //   roles: ["Admin"],
        // },
        // {
        //   id: "disposal",
        //   label: "Disposal & Write-off",
        //   icon: Trash2,
        //   roles: ["Admin"],
        // },
      ],
    },
    {
      label: "Administration",
      items: [
        {
          id: "regions",
          label: "Regions",
          icon: MapPin,
          roles: ["Admin"],
        },
        {
          id: "warehouses",
          label: "Warehouses",
          icon: Building2,
          roles: ["Admin"],
        },
        {
          id: "type-management",
          label: "Type Management",
          icon: Settings,
          roles: ["Admin"],
        },
        {
          id: "customers",
          label: "Customers",
          icon: Users,
          roles: ["Admin"],
        },
        {
          id: "users",
          label: "User Management",
          icon: Users,
          roles: ["Admin"],
        },
        // {
        //   id: "mail",
        //   label: "Mail",
        //   icon: Mail,
        //   roles: ["Admin"],
        // },
        {
          id: "audit-log",
          label: "Audit Log",
          icon: ShieldAlert,
          roles: ["Admin", "Engineer", "PM"],
        },
        {
          id: "reports",
          label: "Reports",
          icon: FileText,
          roles: ["Admin", "PM"],
        },
        {
          id: "settings",
          label: "Settings",
          icon: Settings,
          roles: ["Admin", "PM", "Engineer"],
        },
      ],
    },
  ];

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b border-border/50 py-4">
        <div className="flex items-center gap-2 items-start px-2">
          <div className="w-28 p-1.5 rounded-md flex-shrink-0">
            <img src={logo} alt="" />
          </div>
          <div className="flex items-center gap-2 overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="font-heading font-bold text-lg leading-tight truncate">
              1CNG
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">
              IMS
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group, idx) => {
          // Filter items based on user role
          const visibleItems = group.items.filter((item) =>
            item.roles.includes(role),
          );
          if (visibleItems.length === 0) return null;
          return (
            <SidebarGroup key={idx}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={
                          currentPage === item.id ||
                          currentPage.startsWith(`${item.id}-`)
                        }
                        onClick={() => navigate(item.id as any)}
                        tooltip={item.label}
                      >
                        <item.icon className="w-4 h-4" />
                        <div className="flex items-center justify-between flex-1 ml-1">
                          <span>{item.label}</span>

                          {item.badge && (
                            <SidebarMenuBadge className="bg-primary text-primary-foreground">
                              {item.badge}
                            </SidebarMenuBadge>
                          )}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="w-full justify-start data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-md">
                <AvatarFallback className="rounded-md bg-primary/10 text-primary text-xs">
                  {getInitials(currentUser.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start overflow-hidden group-data-[collapsible=icon]:hidden ml-2">
                <span className="text-sm font-medium truncate w-full">
                  {currentUser.full_name}
                </span>
                <span className="text-xs text-muted-foreground truncate w-full">
                  {currentUser.role}
                </span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="right"
            className="w-56"
            sideOffset={8}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {currentUser.full_name}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {currentUser.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
