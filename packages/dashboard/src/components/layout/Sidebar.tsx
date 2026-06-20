"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  FileText,
  CreditCard,
  User,
  Shield,
  Rocket,
} from "lucide-react";

const groups: { label: string; items: { href: string; label: string; icon: React.ElementType }[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/setup", label: "Hướng dẫn cài đặt", icon: Rocket },
      { href: "/repositories", label: "Repositories", icon: GitBranch },
      { href: "/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/billing", label: "Billing", icon: CreditCard },
      { href: "/account", label: "Account", icon: User },
    ],
  },
];

const adminGroup = {
  label: "Admin",
  items: [{ href: "/admin/rules", label: "Rules & catalog", icon: Shield }],
};

interface SidebarProps {
  isAdmin?: boolean;
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const allGroups = isAdmin ? [...groups, adminGroup] : groups;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="sidebar">
      <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
        <Image
          src="/logo.png"
          alt="MergeTrack"
          width={24}
          height={24}
          className="brand-logo"
          priority
        />
        <span style={{ fontSize: 13, fontWeight: 600 }}>MergeTrack</span>
      </Link>

      <nav className="nav">
        {allGroups.map((group) => (
          <div key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={`nav-item ${isActive(href) ? "active" : ""}`}>
                <Icon />
                <span>{label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
