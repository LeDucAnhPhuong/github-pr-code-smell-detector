"use client";

import { signOut } from "next-auth/react";
import { Github, LogOut } from "lucide-react";
import Image from "next/image";

interface TopBarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function TopBar({ user }: TopBarProps) {
  return (
    <header
      className="flex items-center justify-between px-4 border-b shrink-0"
      style={{
        height: "var(--topbar-height)",
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* GitHub connection status */}
      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
        <Github className="w-3.5 h-3.5" />
        <span>Connected</span>
        <span
          className="w-1.5 h-1.5 rounded-full inline-block"
          style={{ backgroundColor: "var(--color-success)" }}
        />
      </div>

      {/* User info */}
      <div className="flex items-center gap-3">
        <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {user.name ?? user.email}
        </span>
        {user.image && (
          <Image
            src={user.image}
            alt={user.name ?? "avatar"}
            width={28}
            height={28}
            className="rounded-full"
          />
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-xs rounded-md px-2 py-1.5 transition-colors"
          style={{ color: "var(--color-text-muted)" }}
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}
