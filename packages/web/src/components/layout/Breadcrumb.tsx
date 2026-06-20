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
    <nav className="crumb" style={{ marginBottom: 12 }}>
      {items.map((item, idx) => (
        <span key={idx} className="row" style={{ gap: 7 }}>
          {idx > 0 && <ChevronRight className="w-3 h-3" style={{ color: "var(--border-strong)" }} />}
          {item.href ? (
            <Link href={item.href} className="link">
              {item.label}
            </Link>
          ) : (
            <b>{item.label}</b>
          )}
        </span>
      ))}
    </nav>
  );
}
