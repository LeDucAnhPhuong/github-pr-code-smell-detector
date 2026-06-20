"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const items = [
  {
    q: "PR không thấy comment",
    a: "Repo chưa được chọn khi cài App (vào Configure để thêm), hoặc đã hết hạn mức (quota) tháng này.",
  },
  {
    q: "Comment báo lỗi quyền",
    a: "App thiếu quyền Pull requests/Checks. Gỡ và cài lại App (bản đã cập nhật quyền).",
  },
  {
    q: "Không có Check run",
    a: "Gói hiện tại không bật check annotation, hoặc App thiếu quyền Checks.",
  },
  {
    q: "Bot phân tích nhầm file",
    a: "Chỉnh target/exclude paths trong Repository → Config.",
  },
];

export function Troubleshooting() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div
      className="rounded-lg border divide-y"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
        borderRadius: "var(--radius-card)",
      }}
    >
      {items.map((it, i) => (
        <div key={it.q} style={{ borderColor: "var(--color-border)" }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex items-center justify-between w-full px-4 py-3 text-left text-sm font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            {it.q}
            <ChevronDown
              className="w-4 h-4 transition-transform"
              style={{ transform: open === i ? "rotate(180deg)" : "none", color: "var(--color-text-muted)" }}
            />
          </button>
          {open === i && (
            <p className="px-4 pb-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {it.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
