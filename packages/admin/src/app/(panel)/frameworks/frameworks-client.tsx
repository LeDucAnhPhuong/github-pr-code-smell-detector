"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

import { apiSend } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface Framework {
  id: string;
  name: string;
  supportedExtensions: string[];
  isActive: boolean;
  rules: number;
}

const API = "/api/frameworks";

function parseExt(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

export function FrameworksClient({ initial }: { initial: Framework[] }) {
  const [items, setItems] = React.useState<Framework[]>(initial);
  const [search, setSearch] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Framework | null>(null);
  const [name, setName] = React.useState("");
  const [ext, setExt] = React.useState("");
  const [active, setActive] = React.useState(true);

  const [deleting, setDeleting] = React.useState<Framework | null>(null);

  async function reload() {
    const rows = await apiSend<Array<Framework & { _count?: { rules: number } }>>(API, "GET");
    setItems(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        supportedExtensions: r.supportedExtensions,
        isActive: r.isActive,
        rules: r._count?.rules ?? r.rules ?? 0,
      }))
    );
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setExt("");
    setActive(true);
    setOpen(true);
  }

  function openEdit(f: Framework) {
    setEditing(f);
    setName(f.name);
    setExt(f.supportedExtensions.join(", "));
    setActive(f.isActive);
    setOpen(true);
  }

  async function submit() {
    if (!name.trim()) {
      toast.error("Tên framework là bắt buộc.");
      return;
    }
    const extensions = parseExt(ext);
    setBusy(true);
    try {
      if (editing) {
        await apiSend(API, "PATCH", { id: editing.id, supportedExtensions: extensions, isActive: active });
        toast.success("Đã cập nhật framework.");
      } else {
        await apiSend(API, "POST", { name: name.trim(), supportedExtensions: extensions, isActive: active });
        toast.success("Đã tạo framework.");
      }
      setOpen(false);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(f: Framework, value: boolean) {
    setItems((prev) => prev.map((x) => (x.id === f.id ? { ...x, isActive: value } : x)));
    try {
      await apiSend(API, "PATCH", { id: f.id, isActive: value });
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
      toast.success("Đã xóa framework.");
      setDeleting(null);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const filtered = items.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Frameworks</h1>
          <p className="text-sm text-muted-foreground">Ngôn ngữ / framework được hỗ trợ.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tạo framework
        </Button>
      </div>

      <Card>
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Tìm theo tên…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Phần mở rộng</TableHead>
              <TableHead>Rules</TableHead>
              <TableHead>Hoạt động</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Không có framework nào.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {f.supportedExtensions.length === 0 && <span className="text-muted-foreground">—</span>}
                    {f.supportedExtensions.map((e) => (
                      <Badge key={e} variant="secondary" className="font-mono">
                        {e}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{f.rules}</TableCell>
                <TableCell>
                  <Switch checked={f.isActive} onCheckedChange={(v) => toggleActive(f, v)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(f)} aria-label="Sửa">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleting(f)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa framework" : "Tạo framework"}</DialogTitle>
            <DialogDescription>
              {editing ? "Cập nhật phần mở rộng được hỗ trợ." : "Thêm framework/ngôn ngữ mới."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fw-name">Tên</Label>
              <Input
                id="fw-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!!editing}
                placeholder="vd: React"
              />
              {editing && <p className="text-xs text-muted-foreground">Không thể đổi tên (khóa định danh).</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fw-ext">Phần mở rộng</Label>
              <Input
                id="fw-ext"
                value={ext}
                onChange={(e) => setExt(e.target.value)}
                placeholder=".jsx, .tsx, .js"
              />
              <p className="text-xs text-muted-foreground">Ngăn cách bằng dấu phẩy hoặc khoảng trắng.</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="fw-active" checked={active} onCheckedChange={setActive} />
              <Label htmlFor="fw-active">Hoạt động</Label>
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

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa framework?</DialogTitle>
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
