import React, { Component, useEffect } from 'react';
import { useStore } from './store/useStore';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { InventoryListPage } from './pages/InventoryListPage';
import { ComponentsListPage } from './pages/ComponentsListPage';
import { InventoryDetailPage } from './pages/InventoryDetailPage';
import { InventoryAddPage } from './pages/InventoryAddPage';
import { ComponentsAddPage } from './pages/ComponentsAddPage';
import { InventoryRequestsPage } from './pages/InventoryRequestsPage';
import { InstallRequestsPage } from './pages/InstallRequestsPage';
import { RelocationRequestsPage } from './pages/RelocationRequestsPage';
import { RegionsPage } from './pages/RegionsPage';
import { WarehousesPage } from './pages/WarehousesPage';
import { RacksPage } from './pages/RacksPage';
import { TypeManagementPage } from './pages/TypeManagementPage';
import { UsersPage } from './pages/UsersPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ComponentDetailPage } from './pages/ComponentDetailPage';
import { VendorsPage } from './pages/VendorsPage';
import { ReservedStockPage } from './pages/ReservedStockPage';
import { CustomersPage } from './pages/CustomersPage';
import { ReportsPage } from './pages/ReportsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { GoodsReceiptPage } from './pages/GoodsReceiptPage';
import { RMAPage } from './pages/RMAPage';
import { DisposalPage } from './pages/DisposalPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { StocktakePage } from './pages/StocktakePage';
import { AppSidebar } from './components/layout/AppSidebar';
import { CommandSearch } from './components/shared/CommandSearch';
import { SignupPage } from './pages/SignupPage';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger
} from
  './components/ui/Sidebar';
import { Toaster } from './components/ui/Sonner';
import { TooltipProvider } from './components/ui/Tooltip';
import { Separator } from './components/ui/Separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from
  './components/ui/Breadcrumb';
import { Button } from './components/ui/Button';
import { Bell, Search, User as UserIcon, LogOut, Settings, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from
  './components/ui/DropdownMenu';
import { Avatar, AvatarFallback } from './components/ui/Avatar';
import { Badge } from './components/ui/Badge';
import { getInitials } from './lib/utils';
import { useAuthStore } from './store/useAuthStore';
export function App() {
  const {
    isAuthenticated,
    currentPage,
    currentUser,
    navigate,
    setCommandOpen,
    getUnreadNotificationCount
  } = useStore();


  const { user, profile, checkSession, isLoading: authLoading, logout } = useAuthStore();

  useEffect(() => {
    const path = window.location.pathname;

    if (path === '/signup') {
      navigate('signup');
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);



  if (currentPage === 'signup') {
    return (
      <TooltipProvider>
        <SignupPage />
        <Toaster position="top-right" richColors />
      </TooltipProvider>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If not authenticated, show login page
  if (!user) {

    return (
      <TooltipProvider>
        <LoginPage />
        <Toaster position="top-right" richColors />
      </TooltipProvider>);

  }




  // If authenticated but missing role/region/warehouse, show empty state
  if (!profile || !profile.role) {
    return (
      <TooltipProvider>
        <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
          <div className="max-w-md text-center space-y-4 bg-background p-8 rounded-xl border shadow-sm">
            <h2 className="text-2xl font-bold text-destructive">
              Access Restricted
            </h2>
            <p className="text-muted-foreground">
              Please contact Admin to assign your role, region, and warehouse.
            </p>
            <button
              onClick={() => {
                logout();
                navigate('login');
              }}
              className="text-sm text-primary hover:underline mt-4 inline-block">

              Return to Login
            </button>
          </div>
        </div>
        <Toaster position="top-right" richColors />
      </TooltipProvider>);

  }
  // Render the appropriate page based on state
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'inventory':
        return <InventoryListPage />;
      case 'inventory-detail':
        return <InventoryDetailPage />;
      case 'components':
        return <ComponentsListPage />;
      case 'inventory-requests':
        return <InventoryRequestsPage />;
      case 'install-requests':
        return <InstallRequestsPage />;
      case 'install-pm':
        return <InstallRequestsPage pmView />;
      case 'install-admin':
        return <InstallRequestsPage adminView />;
      case 'physical-install':
        return <InstallRequestsPage physicalView />;
      case 'relocation-requests':
        return <RelocationRequestsPage />;
      case 'relocation-pm':
        return <RelocationRequestsPage pmView />;
      case 'relocation-admin':
        return <RelocationRequestsPage adminView />;
      case 'physical-relocation':
        return <RelocationRequestsPage physicalView />;
      case 'regions':
        return <RegionsPage />;
      case 'warehouses':
        return <WarehousesPage />;
      case 'racks':
        return <RacksPage />;
      case 'type-management':
        return <TypeManagementPage />;
      case 'users':
        return <UsersPage />;
      case 'signup':
        return <SignupPage />;
      case 'audit-log':
        return <AuditLogPage />;
      case 'notifications-page':
        return <NotificationsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'component-detail':
        return <ComponentDetailPage />;
      case 'vendors':
        return <VendorsPage />;
      case 'reserved-stock':
        return <ReservedStockPage />;
      case 'customers':
        return <CustomersPage />;
      case 'reports':
        return <ReportsPage />;
      case 'inventory-add':
        return <InventoryAddPage />;
      case 'components-add':
        return <ComponentsAddPage />;
      case 'purchase-orders':
        return <PurchaseOrdersPage />;
      case 'goods-receipt':
        return <GoodsReceiptPage />;
      case 'rma':
        return <RMAPage />;
      case 'disposal':
        return <DisposalPage />;
      case 'maintenance':
        return <MaintenancePage />;
      case 'stocktake':
        return <StocktakePage />;
      // Map all other routes to PlaceholderPage for now
      case 'customer-inventory':
        return <PlaceholderPage />;
      default:
        return <PlaceholderPage />;
    }
  };
  // Format breadcrumb based on current page
  const formatBreadcrumb = (page: string) => {
    return page.
      split('-').
      map((word) => word.charAt(0).toUpperCase() + word.slice(1)).
      join(' ');
  };
  const unreadCount = getUnreadNotificationCount();
  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background text-foreground">
          <AppSidebar />

          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate('dashboard');
                        }}>

                        1CNG
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {formatBreadcrumb(currentPage)}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex text-muted-foreground w-64 justify-start"
                  onClick={() => setCommandOpen(true)}>

                  <Search className="mr-2 h-4 w-4" />
                  Search...
                  <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setCommandOpen(true)}>

                  <Search className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => navigate('notifications-page')}>

                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 &&
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-destructive"></span>
                  }
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full ml-2">

                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {currentUser ?
                            getInitials(currentUser.full_name) :
                            'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-40 -ml-28" align="end">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {currentUser?.full_name}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {currentUser?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <Badge
                        variant="secondary"
                        className="w-full justify-center">

                        {currentUser?.role}
                      </Badge>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            <main className="flex-1 overflow-auto bg-muted/10">
              {renderPage()}
            </main>
          </SidebarInset>
        </div>

        <CommandSearch />
      </SidebarProvider>
      <Toaster position="top-right" richColors />
    </TooltipProvider>);

}