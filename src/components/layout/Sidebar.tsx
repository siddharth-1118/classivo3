"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserCircle2,
  GraduationCap,
  Building2,
  CalendarDays,
  Settings,
  ChevronDown,
  ChevronRight,
  X,
  Home,
  CreditCard,
  FileCheck2,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

const navItems: (NavItem | NavGroup)[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: <UserCircle2 className="h-5 w-5" />,
  },
  {
    label: "Grades",
    href: "/grades",
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    label: "Hostel",
    icon: <Building2 className="h-5 w-5" />,
    items: [
      {
        label: "Hostel Booking",
        href: "/hostel/booking",
        icon: <Home className="h-4 w-4" />,
      },
      {
        label: "Payment Confirmation",
        href: "/hostel/payment",
        icon: <CreditCard className="h-4 w-4" />,
      },
      {
        label: "Allotment Order",
        href: "/hostel/allotment",
        icon: <FileCheck2 className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Exam Timetable",
    href: "/exams",
    icon: <CalendarDays className="h-5 w-5" />,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

function isGroup(item: NavItem | NavGroup): item is NavGroup {
  return "items" in item;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({
    Hostel: true,
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some((item) => isActive(item.href));
  };

  React.useEffect(() => {
    navItems.forEach((item) => {
      if (isGroup(item) && isGroupActive(item)) {
        setExpandedGroups((prev) => ({ ...prev, [item.label]: true }));
      }
    });
  }, [pathname]);

  const content = (
    <div className="h-full flex flex-col bg-card border-r border-border">
      <div className="h-16 shrink-0 flex items-center justify-between px-5 border-b border-border/60">
        <Link href="/dashboard" className="flex items-center gap-2.5 group" onClick={onClose}>
          <div className="h-9 w-9 rounded-xl gradient-brand flex items-center justify-center shadow-sm shadow-brand-600/20">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              SRM Student
            </span>
            <span className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
              Companion
            </span>
          </div>
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden h-9 w-9 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
        {navItems.map((item) => {
          if (isGroup(item)) {
            const expanded = expandedGroups[item.label] ?? false;
            const active = isGroupActive(item);
            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(item.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    "hover:bg-accent hover:text-accent-foreground",
                    active
                      ? "text-brand-600 dark:text-brand-400 bg-brand-500/5 dark:bg-brand-500/10"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0 transition-colors",
                      active && "text-brand-600 dark:text-brand-400"
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {expanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                </button>
                {expanded && (
                  <div className="mt-1 ml-5 pl-4 border-l border-border/60 space-y-0.5">
                    {item.items.map((subItem) => {
                      const subActive = isActive(subItem.href);
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all",
                            subActive
                              ? "bg-brand-600 text-white shadow-sm shadow-brand-600/20"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          {subItem.icon}
                          <span>{subItem.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-600/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 p-4 border-t border-border/60">
        <div className="rounded-xl bg-muted/50 p-3.5">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full gradient-brand flex items-center justify-center shrink-0">
              <UserCircle2 className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">Local Storage</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your session is stored only on this device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64 xl:w-72"
        )}
      >
        {content}
      </aside>

      <div
        className={cn(
          "lg:hidden fixed inset-0 z-50 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
        <aside
          className={cn(
            "relative w-72 max-w-[85%] h-full shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {content}
        </aside>
      </div>
    </>
  );
}

export function MobileMenuButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="lg:hidden h-10 w-10 rounded-md border border-border bg-background hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
