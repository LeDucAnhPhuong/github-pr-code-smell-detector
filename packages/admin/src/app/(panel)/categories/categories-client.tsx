"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

import { apiSend } from "@/lib/client-api";
import { SeverityBadge } from "@/components/severity-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Severity = "error" | "warning" | "info";
interface Category {
  id: string;
  name: string;
  description: string | null;
  defaultSeverity: Severity;
  isActive: boolean;
  rules: number;
}

const API = "/api/categories";

export function CategoriesClient({ initial }: { initial: Category[] }) {
  const [items, setItems] = React.useState<Category[]>(initial);
  const [search, setSearch] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // create/edit dialog state
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [severity, setSeverity] = React.useState<Severity>("warning");
  const [active, setActive] = React.useState(true);

  // delete dialog state
  const [deleting, setDeleting] = React.useState<Category | null>(null);

  async function reload() {
    setItems(await apiSend<Category[]>(API, "GET").then((rows) =>
      // GET returns prisma rows with _count; normalize shape
      (rows as unknown as Array<Category & { _count?: { rules: number } }>).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        defaultSeverity: r.defaultSeverity,
        isActive: r.isActive,
        rules: r._count?.rules ?? r.rules ?? 0,
      }))
    ));
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setSeverity("warning");
    setActive(true);
    setOpen(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setName(c.name);
    setDescription(c.description ?? "");
    setSeverity(c.defaultSeverity);
    setActive(c.isActive);
    setOpen(true);
  }

  async function submit() {
    if (!name.trim()) {
      toast.error("Tên category là bắt buộc.");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await apiSend(API, "PATCH", {
          id: editing.id,
          description,
          defaultSeverity: severity,
          isActive: active,
        });
        toast.success("Đã cập nhật category.");
      } else {
        await apiSend(API, "POST", {
          name: name.trim(),
          description: description || undefined,
          defaultSeverity: severity,
          isActive: active,
        });
        toast.success("Đã tạo category.");
      }
      setOpen(false);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c: Category, value: boolean) {
    setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, isActive: value } : x)));
    try {
      await apiSend(API, "PATCH", { id: c.id, isActive: value });
    } catch (e) {
      toast.error((e as Error).message);
      await reload();
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiSend(API, "DELETE", { id: deleting.id });
      toast.success("Đã xóa category.");
      setDeleting(null);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const filtered = items.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">Nhóm phân loại rule.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tạo category
        </Button>
      </div>

      <Card>
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Rules</TableHead>
              <TableHead>Severity mặc định</TableHead>
              <TableHead>Hoạt động</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Không có category nào.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {c.description ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{c.rules}</TableCell>
                <TableCell>
                  <SeverityBadge severity={c.defaultSeverity} />
                </TableCell>
                <TableCell>
                  <Switch checked={c.isActive} onCheckedChange={(v) => toggleActive(c, v)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Sửa">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleting(c)}
                      aria-label="Xóa"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa category" : "Tạo category"}</DialogTitle>
            <DialogDescription>
              {editing ? "Cập nhật thông tin category." : "Thêm một nhóm phân loại rule mới."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Tên</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!!editing}
                placeholder="vd: Maintainability"
              />
              {editing && <p className="text-xs text-muted-foreground">Không thể đổi tên (khóa định danh).</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Mô tả</Label>
              <Textarea id="cat-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Severity mặc định</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">error</SelectItem>
                  <SelectItem value="warning">warning</SelectItem>
                  <SelectItem value="info">info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="cat-active" checked={active} onCheckedChange={setActive} />
              <Label htmlFor="cat-active">Hoạt động</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Hủy
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa category?</DialogTitle>
            <DialogDescription>
              Bạn sắp xóa <b>{deleting?.name}</b>. Hành động không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
              {busy ? "Đang xóa…" : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
