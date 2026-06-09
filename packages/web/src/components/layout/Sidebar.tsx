"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  FileText,
  CreditCard,
  User,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/repositories", label: "Repositories", icon: GitBranch },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/account", label: "Account", icon: User },
];

const adminNav = [{ href: "/admin/rules", label: "Admin", icon: Shield }];

interface SidebarProps {
  isAdmin?: boolean;
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="flex flex-col border-r shrink-0 transition-all duration-200"
      style={{
        width: collapsed ? "56px" : "var(--sidebar-width)",
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-3 border-b"
        style={{
          height: "var(--topbar-height)",
          borderColor: "var(--color-border)",
        }}
      >
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
            Code Smell Detector
          </span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className="flex items-center gap-2.5 mx-2 my-0.5 px-2.5 py-2 rounded-md text-sm transition-colors"
              style={{
                backgroundColor: active ? "var(--color-surface-muted)" : "transparent",
                color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                fontWeight: active ? 500 : 400,
              }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div
              className="mx-4 my-2 border-t"
              style={{ borderColor: "var(--color-border)" }}
            />
            {adminNav.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className="flex items-center gap-2.5 mx-2 my-0.5 px-2.5 py-2 rounded-md text-sm transition-colors"
                  style={{
                    backgroundColor: active ? "var(--color-surface-muted)" : "transparent",
                    color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t" style={{ borderColor: "var(--color-border)" }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-8 h-8 rounded-md ml-auto transition-colors"
          style={{ color: "var(--color-text-muted)" }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
