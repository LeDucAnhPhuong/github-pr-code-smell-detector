import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm mb-4">
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center gap-1">
          {idx > 0 && (
            <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--color-border)" }} />
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="transition-colors hover:underline"
              style={{ color: "var(--color-primary)" }}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ color: "var(--color-text-secondary)" }}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
