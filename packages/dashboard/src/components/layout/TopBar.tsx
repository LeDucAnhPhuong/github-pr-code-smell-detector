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
    <header className="topbar">
      {/* GitHub connection status */}
      <div className="status">
        <Github className="w-3.5 h-3.5" />
        <span>Connected</span>
        <span className="dot" style={{ background: "var(--ok-dot)" }} />
      </div>

      {/* User info */}
      <div className="row" style={{ gap: 12 }}>
        <span className="secondary" style={{ fontSize: 12.5 }}>
          {user.name ?? user.email}
        </span>
        {user.image ? (
          <Image src={user.image} alt={user.name ?? "avatar"} width={26} height={26} className="avatar" />
        ) : (
          <span className="avatar">{(user.name ?? user.email ?? "U").slice(0, 2).toUpperCase()}</span>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn btn-ghost btn-sm"
          title="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}
