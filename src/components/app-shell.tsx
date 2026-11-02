import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, FileText, Truck, FileSpreadsheet, Scale, Clock, CheckSquare, ShoppingCart, Star, Users, Settings, LogOut, Hexagon, Package, Inbox,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-me";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/status-badge";
import { PurchasingNotifications } from "@/components/purchasing-notifications";

const purchaserNav = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Purchase Requests", url: "/requests", icon: FileText },
  { title: "Suppliers", url: "/suppliers", icon: Truck },
  { title: "Quotations", url: "/quotations", icon: FileSpreadsheet },
  { title: "Vendor Comparison", url: "/comparison", icon: Scale },
  { title: "Awaiting Responses", url: "/awaiting", icon: Clock },
  { title: "Approvals", url: "/approvals", icon: CheckSquare },
  { title: "Purchase Orders", url: "/orders", icon: ShoppingCart },
  { title: "Vendor Ratings", url: "/ratings", icon: Star },
  { title: "Company & Members", url: "/company", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;
const supplierNav = [
  { title: "Company Profile", url: "/supplier", icon: Package },
  { title: "RFQs & Quotations", url: "/supplier/rfqs", icon: Inbox },
  { title: "Settings", url: "/settings", icon: Settings },
] as const;

function Nav({ supplier }: { supplier: boolean }) {
  const { state } = useSidebar();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const items = supplier ? supplierNav : purchaserNav;
  return (
    <SidebarMenu className="gap-1">
      {items.map((i) => (
        <SidebarMenuItem key={i.url}>
          <SidebarMenuButton asChild isActive={path === i.url || (i.url !== "/supplier" && path.startsWith(i.url + "/"))} tooltip={i.title}>
            <Link to={i.url} className="h-9 rounded-lg font-medium data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-[inset_3px_0_0_var(--sidebar-primary)]"><i.icon className="h-4 w-4" />{state !== "collapsed" && <span>{i.title}</span>}</Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function AppShell() {
  const { data: me, isLoading } = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const supplier = me?.profile?.account_type === "supplier";

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon" className="no-print">
          <SidebarHeader>
            <Link to={supplier ? "/supplier" : "/dashboard"} className="flex items-center gap-2.5 px-2 py-2 font-display text-lg font-bold text-foreground">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-sm"><Hexagon className="h-4 w-4" /></span><span className="truncate group-data-[collapsible=icon]:hidden">Nexora</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup><SidebarGroupContent><Nav supplier={supplier} /></SidebarGroupContent></SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu><SidebarMenuItem><SidebarMenuButton onClick={signOut} tooltip="Log out"><LogOut className="h-4 w-4" /><span>Log out</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print flex h-14 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur md:px-6">
            <SidebarTrigger />
            <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              {supplier ? me?.supplier?.company_name : me?.company?.name}
              {me?.membership && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-medium capitalize text-accent-foreground">{me.membership.role}</span>}
            </div>
            <span className="hidden text-sm text-muted-foreground sm:inline">{me?.email}</span>
            <PurchasingNotifications />
            <Button variant="ghost" size="sm" onClick={signOut}>Log out</Button>
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8 lg:p-10">{isLoading ? <Loading /> : <Outlet />}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
