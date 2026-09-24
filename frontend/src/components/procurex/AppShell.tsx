import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  BarChart3,
  FileText,
  Sparkles,
  Building2,
  Bell,
  Search,
  Command as CmdIcon,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  Building,
  Check,
  FolderKanban,
  LayoutGrid,
  CheckSquare,
  Wallet,
  PieChart,
  TrendingUp,
  CreditCard,
  FolderClosed,
  FolderOpen,
  Handshake,
  GitBranch,
  Layers,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { clearSession, getSession, findSupplier, syncSession, saveSupplier, getRole } from "@/lib/auth-store";
import { SupplierStagingScreen } from "./SupplierStagingScreen";

const ProcurementIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
    <path d="M4 7l8-4 8 4-8 4-8-4z" />
    <path d="M4 12l8 4 8-4" />
    <path d="M4 17l8 4 8-4" />
  </svg>
);

type NavSubItem = {
  to: string;
  label: string;
  icon: any;
  badge?: "NEW";
  children?: { to: string; label: string }[];
};

type MainSection = {
  id: "project" | "finance" | "procurement" | "sales";
  label: string;
  icon: any;
  items: NavSubItem[];
};

const SECTIONS: MainSection[] = [
  {
    id: "project",
    label: "Project",
    icon: FolderKanban,
    items: [
      { to: "/project/project-360", label: "Project 360", icon: LayoutGrid },
      { to: "/project/portfolio-command", label: "Portfolio Command", icon: Layers },
      { to: "/project/planning", label: "Project Planning", icon: GitBranch, badge: "NEW" },
      { to: "/project/hse", label: "HSE", icon: ShieldAlert },
      { to: "/project/quality", label: "Quality", icon: CheckSquare },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: Wallet,
    items: [
      { to: "/finance/budget-pro", label: "Budget Pro", icon: PieChart },
      { to: "/finance/cashflow-forecasting", label: "cashflow forecasting", icon: TrendingUp },
      { to: "/finance/billing-and-cash", label: "Billing and cash", icon: CreditCard },
    ],
  },
  {
    id: "procurement",
    label: "Procurement",
    icon: ProcurementIcon,
    items: [
      { to: "/", label: "Supplier 360", icon: LayoutDashboard },
      {
        to: "/supplier-portal",
        label: "Supplier Portal",
        icon: FolderClosed,
        children: [
          { to: "/supplier-portal/rfq", label: "Request for Quotation" },
          { to: "/supplier-portal/quotations", label: "Supplier Quotation" },
          { to: "/supplier-portal/purchase-orders", label: "Purchase Orders" },
          { to: "/supplier-portal/invoices", label: "Invoices" },
        ],
      },
      { to: "/avl", label: "AVL Module", icon: ShieldCheck },
      { to: "/spend-analytics", label: "Spend Analytics", icon: BarChart3, badge: "NEW" },
      { to: "/contracts", label: "Contract Lifecycle", icon: FileText },
      { to: "/procurement-ai", label: "Procurement AI", icon: Sparkles, badge: "NEW" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    icon: Handshake,
    items: [
      { to: "/sales/dashboard", label: "Sales dashboard", icon: BarChart3 },
      { to: "/sales/tender-pipeline", label: "Tender Pipeline", icon: GitBranch },
    ],
  },
];

export function AppShell({
  title,
  breadcrumb,
  children,
}: {
  title: string;
  breadcrumb?: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  const refreshSession = () => {
    setLoading(true);
    syncSession().then((supplier) => {
      setSessionUser(supplier);
      setLoading(false);
      if (!supplier) {
        navigate({ to: "/auth", replace: true });
      }
    });
  };

  useEffect(() => {
    refreshSession();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="relative size-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Syncing portal session...</p>
      </div>
    );
  }

  // Intercept staging/workflow states (Draft, Pending Approval, Rejected, Suspended)
  if (sessionUser && ["Draft", "Pending Approval", "Rejected", "Suspended"].includes(sessionUser.status)) {
    return (
      <SupplierStagingScreen 
        supplier={sessionUser} 
        onRefreshSession={refreshSession} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className={`transition-all duration-200 ${collapsed ? "lg:pl-16" : "lg:pl-60"}`}>
        <TopNav title={title} breadcrumb={breadcrumb} onMenuClick={() => setMobileOpen(true)} />
        {children}
      </div>
    </div>
  );
}

function Sidebar({
  mobileOpen,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const role = getRole();
  
  const showAll = role !== "Supplier";
  const filteredSections = showAll 
    ? SECTIONS 
    : SECTIONS.filter(s => s.id === "procurement").map(s => ({
        ...s,
        items: s.items.filter(item => item.to === "/supplier-portal")
      }));

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    project: false,
    finance: false,
    procurement: true,
    sales: false,
    supplierPortal: true,
  });

  // Auto-expand active section on page load / path change
  useEffect(() => {
    if (pathname.startsWith("/project")) {
      setExpandedSections(prev => ({ ...prev, project: true }));
    } else if (pathname.startsWith("/finance")) {
      setExpandedSections(prev => ({ ...prev, finance: true }));
    } else if (pathname.startsWith("/sales")) {
      setExpandedSections(prev => ({ ...prev, sales: true }));
    } else if (
      pathname.startsWith("/supplier-portal") ||
      pathname === "/" ||
      pathname === "/avl" ||
      pathname === "/spend-analytics" ||
      pathname === "/contracts" ||
      pathname === "/procurement-ai"
    ) {
      setExpandedSections(prev => ({ ...prev, procurement: true }));
      if (pathname.startsWith("/supplier-portal")) {
        setExpandedSections(prev => ({ ...prev, supplierPortal: true }));
      }
    }
  }, [pathname]);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-surface-panel/60 transition-all duration-200 lg:translate-x-0 ${
          mobileOpen 
            ? "translate-x-0 w-60" 
            : collapsed 
              ? "-translate-x-full lg:translate-x-0 lg:w-16 w-60" 
              : "-translate-x-full lg:translate-x-0 lg:w-60 w-60"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Link to={role === "Supplier" ? "/supplier-portal" : "/"} className="flex items-center gap-2 overflow-hidden">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background shrink-0">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 7l8-4 8 4-8 4-8-4z" />
                <path d="M4 12l8 4 8-4" />
                <path d="M4 17l8 4 8-4" />
              </svg>
            </div>
            {!collapsed && (
              <span className="text-[15px] font-semibold tracking-tight transition-opacity duration-200 font-sans">
                ProcureX
              </span>
            )}
          </Link>
          <div className="flex items-center gap-1">
            {/* Desktop Collapse Button */}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 transition-colors"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto p-3 scrollbar-thin">
          {!collapsed && (
            <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 transition-opacity duration-200">
              {role === "Supplier" ? "Supplier Portal" : "Workspace"}
            </div>
          )}
          
          {filteredSections.map((sec) => {
            const isExpanded = expandedSections[sec.id];
            const IconComponent = sec.icon;

            return (
              <div key={sec.id} className="space-y-1">
                {/* Section Header */}
                <button
                  onClick={() => {
                    if (collapsed) {
                      onToggleCollapse();
                      setExpandedSections((prev) => ({ ...prev, [sec.id]: true }));
                    } else {
                      setExpandedSections((prev) => ({ ...prev, [sec.id]: !prev[sec.id] }));
                    }
                  }}
                  title={collapsed ? sec.label : undefined}
                  className={`flex w-full items-center rounded-lg px-2.5 py-2 text-xs font-semibold tracking-wider uppercase text-muted-foreground/75 hover:bg-muted/40 hover:text-foreground transition-all duration-200 ${
                    collapsed ? "justify-center" : "justify-between"
                  } ${
                    !collapsed && isExpanded ? "text-foreground" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconComponent className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                    {!collapsed && <span className="truncate tracking-wider font-semibold">{sec.label}</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-200 ${
                        isExpanded ? "" : "-rotate-90"
                      }`}
                    />
                  )}
                </button>

                {/* Sub-items list */}
                {isExpanded && !collapsed && (
                  <div className="ml-4 mt-0.5 space-y-1 border-l border-border/60 pl-3 transition-all duration-200 animate-in fade-in slide-in-from-top-1">
                    {sec.items.map((item) => {
                      if (item.children) {
                        const isPortalExpanded = expandedSections.supplierPortal;
                        const PortalIcon = isPortalExpanded ? FolderOpen : FolderClosed;
                        const isPortalActive = pathname.startsWith(item.to);
                        
                        return (
                          <div key={item.to} className="space-y-0.5">
                            <button
                              onClick={() => {
                                setExpandedSections((prev) => ({
                                  ...prev,
                                  supplierPortal: !prev.supplierPortal,
                                }));
                              }}
                              className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors ${
                                isPortalActive
                                  ? "bg-muted text-foreground"
                                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                              }`}
                            >
                              <PortalIcon className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                              <span className="flex-1 truncate text-left">{item.label}</span>
                              <ChevronDown
                                className={`h-3 w-3 shrink-0 text-muted-foreground/50 transition-transform duration-200 ${
                                  isPortalExpanded ? "" : "-rotate-90"
                                }`}
                              />
                            </button>
                            {isPortalExpanded && (
                              <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border/40 pl-2.5 animate-in fade-in slide-in-from-top-1">
                                {item.children.map((child) => {
                                  const childActive = pathname === child.to;
                                  return (
                                    <Link
                                      key={child.to}
                                      to={child.to}
                                      onClick={onClose}
                                      className={`block rounded-md px-2 py-1 text-xs transition-colors ${
                                        childActive
                                          ? "bg-primary/10 font-semibold text-primary"
                                          : "text-muted-foreground/90 hover:bg-muted/20 hover:text-foreground"
                                      }`}
                                    >
                                      {child.label}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                      const SubIcon = item.icon;

                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={onClose}
                          className={`group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-all ${
                            active
                              ? "bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/10"
                              : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                          }`}
                        >
                          <SubIcon className="h-4 w-4 shrink-0 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`rounded-full px-1.5 py-[0.5px] text-[8px] font-bold uppercase tracking-wider ${
                                active
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "border border-info/30 bg-info/10 text-info"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

function TopNav({
  title,
  breadcrumb,
  onMenuClick,
}: {
  title: string;
  breadcrumb?: string;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <button
          onClick={onMenuClick}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="hidden min-w-0 items-center gap-2 text-sm text-muted-foreground md:flex">
          <span>Dashboard</span>
          <span className="text-border">/</span>
          <span className="truncate font-medium text-foreground">{breadcrumb ?? title}</span>
        </div>
        <div className="flex-1" />
        <div className="relative hidden w-full max-w-sm md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-14 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <CmdIcon className="h-3 w-3" />K
          </kbd>
        </div>
        <button className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
        </button>
        <UserMenu />
      </div>
    </header>
  );
}

function UserMenu() {
  const navigate = useNavigate();
  const email = getSession();
  const supplier = email ? findSupplier(email) : undefined;
  const initials = (supplier?.supplierName ?? email ?? "AK")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-foreground to-muted-foreground text-xs font-semibold text-background outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {initials || "AK"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <div className="text-sm font-medium text-foreground">
            {supplier?.supplierName ?? "Supplier"}
          </div>
          <div className="truncate text-xs text-muted-foreground">{email ?? "guest"}</div>
        </div>
        <DropdownMenuItem
          onClick={async () => {
            await clearSession();
            navigate({ to: "/auth" });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-[22px] font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function useAuthGuard() {
  const navigate = useNavigate();
  if (typeof window !== "undefined" && !getSession()) {
    navigate({ to: "/auth", replace: true });
    return false;
  }
  return true;
}