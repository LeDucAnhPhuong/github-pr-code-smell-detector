import { cn } from "@/lib/utils";

type Severity = "error" | "warning" | "info";

const styles: Record<Severity, string> = {
  error: "bg-[var(--sev-high-bg,#FEF2F2)] text-[var(--sev-high-ink,#B42318)] border-[#FECDCA] dark:bg-transparent dark:text-red-400 dark:border-red-900",
  warning: "bg-[#FFFBEB] text-[#B54708] border-[#FEDF89] dark:bg-transparent dark:text-amber-400 dark:border-amber-900",
  info: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE] dark:bg-transparent dark:text-blue-400 dark:border-blue-900",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
        styles[severity]
      )}
    >
      {severity}
    </span>
  );
}
