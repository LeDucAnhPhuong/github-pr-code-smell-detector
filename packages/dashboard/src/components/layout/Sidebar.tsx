"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  GitBranch,
  FileText,
  CreditCard,
  User,
  Shield,
  Rocket,
} from "lucide-react";

// Admin now lives in its own app (packages/admin, port 3002).
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3002";

interface SidebarProps {
  isAdmin?: boolean;
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const groups: { label: string; items: { href: string; label: string; icon: React.ElementType }[] }[] = [
    {
      label: t("groupOverview"),
      items: [
        { href: "/", label: t("dashboard"), icon: LayoutDashboard },
        { href: "/setup", label: t("setup"), icon: Rocket },
        { href: "/repositories", label: t("repositories"), icon: GitBranch },
        { href: "/reports", label: t("reports"), icon: FileText },
      ],
    },
    {
      label: t("groupAccount"),
      items: [
        { href: "/billing", label: t("billing"), icon: CreditCard },
        { href: "/account", label: t("account"), icon: User },
      ],
    },
  ];

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
        {groups.map((group) => (
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
        {isAdmin && (
          <div>
            <div className="nav-label">{t("admin")}</div>
            <a href={ADMIN_URL} className="nav-item" target="_blank" rel="noreferrer">
              <Shield />
              <span>{t("adminPanel")}</span>
            </a>
          </div>
        )}
      </nav>
    </aside>
  );
}
