import { NavLink, Outlet } from "react-router-dom";
import {
  BarChart3,
  Briefcase,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Package,
  PackagePlus,
  Settings,
  Tag,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { useCurrentUserQuery, useLogoutMutation } from "@/lib/api/hooks";
import { ROLE_LABEL } from "@/lib/status";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Role } from "@/lib/types";
import type { ApiUser } from "@/lib/api/types";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

interface NavItem {
  to: string;
  label: string;
  short?: string;
  icon: LucideIcon;
  roles?: Role[];
  end?: boolean;
}

const NAV: NavItem[] = [
  {
    to: "/",
    label: "Dashboard",
    short: "Início",
    icon: LayoutDashboard,
    roles: ["owner"],
    end: true,
  },
  { to: "/estoque", label: "Estoque", short: "Estoque", icon: Package },
  {
    to: "/consignacao",
    label: "Consignação",
    short: "Consign.",
    icon: Briefcase,
  },
  {
    to: "/consignacao/nova",
    label: "Nova consignação",
    short: "Nova",
    icon: PackagePlus,
  },
  { to: "/etiquetagem", label: "Etiquetagem", short: "Etiqueta", icon: Tag },
  {
    to: "/relatorios",
    label: "Relatórios",
    short: "Relatórios",
    icon: BarChart3,
    roles: ["owner"],
  },
  {
    to: "/configuracoes",
    label: "Configurações",
    short: "Configurações",
    icon: Settings,
    roles: ["owner"],
  },
];

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-accent text-gold"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )
      }
    >
      <item.icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  );
}

function BottomLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] leading-tight transition-colors",
          isActive
            ? "text-gold"
            : "text-muted-foreground hover:text-foreground",
        )
      }
    >
      <item.icon className="h-5 w-5" />
      <span className="max-w-full truncate whitespace-nowrap">
        {item.short ?? item.label}
      </span>
    </NavLink>
  );
}

export function AppShell() {
  const currentUser = useCurrentUserQuery();
  const logoutMutation = useLogoutMutation();
  const user = currentUser.data?.user;
  if (!user) return null;

  const items = NAV.filter((i) => !i.roles || i.roles.includes(user.role));
  const primary = items.slice(0, 5);
  const more = items.slice(5);
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onError: () =>
        toast.error("A sessão foi encerrada neste dispositivo, mas não foi possível confirmar a revogação no servidor."),
    });
  };

  return (
    <div className="flex h-full">
      {/* Sidebar — desktop */}
      <aside className="no-print hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="px-5 pb-5 pt-6">
          <Logo />
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {items.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/40 font-serif text-sm text-gold">
              {user.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {ROLE_LABEL[user.role]}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="mt-1 w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Coluna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabeçalho — mobile */}
        <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
          <Logo size="sm" />
          <MoreSheet
            items={more}
            session={user}
            onLogout={handleLogout}
            logoutPending={logoutMutation.isPending}
          />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-7">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Barra inferior — mobile */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t bg-background md:hidden">
        {primary.map((item) => (
          <BottomLink key={item.to} item={item} />
        ))}
        {more.length > 0 && (
          <MoreSheet
            items={more}
            trigger={
              <span className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-5 w-5" />
                Mais
              </span>
            }
            session={user}
            onLogout={handleLogout}
            logoutPending={logoutMutation.isPending}
          />
        )}
      </nav>
    </div>
  );
}

function MoreSheet({
  items,
  trigger,
  session,
  onLogout,
  logoutPending,
}: {
  items: NavItem[];
  trigger?: React.ReactNode;
  session: ApiUser;
  onLogout: () => void;
  logoutPending: boolean;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Menu"
            className="text-muted-foreground"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="gap-0 rounded-t-xl px-4 pb-6 pt-3">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <SheetHeader className="mb-3 text-left">
          <SheetTitle className="text-base">
            {session.name}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {ROLE_LABEL[session.role]}
            </span>
          </SheetTitle>
        </SheetHeader>
        {items.length > 0 && (
          <>
            <div className="flex flex-col">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm",
                      isActive
                        ? "bg-accent text-gold"
                        : "text-muted-foreground hover:text-foreground",
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </div>
            <Separator className="my-2" />
          </>
        )}
        <button
          onClick={onLogout}
          disabled={logoutPending}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </SheetContent>
    </Sheet>
  );
}
