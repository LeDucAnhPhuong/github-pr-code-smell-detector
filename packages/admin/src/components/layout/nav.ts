import { LayoutDashboard, FolderTree, Boxes, CreditCard, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/frameworks", label: "Frameworks", icon: Boxes },
  { href: "/plans", label: "Plans", icon: CreditCard },
  { href: "/users", label: "Users", icon: Users },
];
