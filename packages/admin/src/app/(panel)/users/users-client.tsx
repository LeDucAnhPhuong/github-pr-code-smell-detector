"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { apiSend } from "@/lib/client-api";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Role = "USER" | "ADMIN";
interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: Role;
  createdAt: string;
  repositories: number;
  planName: string | null;
  subscriptionStatus: string | null;
}

export function UsersClient({
  initial,
  currentUserId,
}: {
  initial: AdminUser[];
  currentUserId: string;
}) {
  const [items, setItems] = React.useState<AdminUser[]>(initial);
  const [search, setSearch] = React.useState("");
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function changeRole(u: AdminUser, role: Role) {
    if (role === u.role) return;
    if (u.id === currentUserId && role !== "ADMIN") {
      toast.error("Không thể tự hạ quyền chính mình.");
      return;
    }
    setPendingId(u.id);
    const prev = items;
    setItems((list) => list.map((x) => (x.id === u.id ? { ...x, role } : x)));
    try {
      await apiSend("/api/users", "PATCH", { id: u.id, role });
      toast.success(`Đã đổi quyền ${u.email ?? u.name ?? u.id} → ${role}.`);
    } catch (e) {
      setItems(prev);
      toast.error((e as Error).message);
    } finally {
      setPendingId(null);
    }
  }

  const filtered = items.filter((u) => {
    const q = search.toLowerCase();
    return (u.email ?? "").toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q);
  });

  function initials(u: AdminUser) {
    return (u.name ?? u.email ?? "U")
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">Quản lý người dùng và phân quyền.</p>
      </div>

      <Card>
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo email / tên…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người dùng</TableHead>
              <TableHead>Quyền</TableHead>
              <TableHead>Gói</TableHead>
              <TableHead>Repos</TableHead>
              <TableHead>Ngày tạo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Không có người dùng nào.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {u.image && <AvatarImage src={u.image} alt={u.name ?? ""} />}
                      <AvatarFallback>{initials(u)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{u.name ?? "—"}</span>
                        {u.id === currentUserId && (
                          <Badge variant="secondary" className="text-[10px]">
                            bạn
                          </Badge>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{u.email ?? "—"}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={u.role}
                    onValueChange={(v) => changeRole(u, v as Role)}
                    disabled={pendingId === u.id}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">USER</SelectItem>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {u.planName ?? "—"}
                  {u.subscriptionStatus && u.subscriptionStatus !== "ACTIVE" && (
                    <span className="ml-1 text-xs">({u.subscriptionStatus})</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{u.repositories}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
