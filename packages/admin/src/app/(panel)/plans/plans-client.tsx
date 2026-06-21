"use client";

import * as React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
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

interface Plan {
  id: string;
  name: string;
  price: number;
  repositoryLimit: number;
  analysisQuota: number;
  hasCheckAnnotations: boolean;
  hasHistoricalReports: boolean;
  isActive: boolean;
}

const API = "/api/plans";
const empty = {
  name: "",
  price: "0",
  repositoryLimit: "0",
  analysisQuota: "0",
  hasCheckAnnotations: false,
  hasHistoricalReports: false,
  isActive: true,
};

export function PlansClient({ initial }: { initial: Plan[] }) {
  const [items, setItems] = React.useState<Plan[]>(initial);
  const [busy, setBusy] = React.useState(false);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Plan | null>(null);
  const [form, setForm] = React.useState({ ...empty });

  const [deleting, setDeleting] = React.useState<Plan | null>(null);

  async function reload() {
    const rows = await apiSend<Array<Omit<Plan, "price"> & { price: string | number }>>(API, "GET");
    setItems(rows.map((r) => ({ ...r, price: Number(r.price) })));
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  }

  function openEdit(p: Plan) {
    setEditing(p);
    setForm({
      name: p.name,
      price: String(p.price),
      repositoryLimit: String(p.repositoryLimit),
      analysisQuota: String(p.analysisQuota),
      hasCheckAnnotations: p.hasCheckAnnotations,
      hasHistoricalReports: p.hasHistoricalReports,
      isActive: p.isActive,
    });
    setOpen(true);
  }

  async function submit() {
    if (!form.name.trim()) {
      toast.error("Tên gói là bắt buộc.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      price: Number(form.price) || 0,
      repositoryLimit: parseInt(form.repositoryLimit, 10) || 0,
      analysisQuota: parseInt(form.analysisQuota, 10) || 0,
      hasCheckAnnotations: form.hasCheckAnnotations,
      hasHistoricalReports: form.hasHistoricalReports,
      isActive: form.isActive,
    };
    setBusy(true);
    try {
      if (editing) {
        await apiSend(API, "PATCH", { id: editing.id, ...payload });
        toast.success("Đã cập nhật gói.");
      } else {
        await apiSend(API, "POST", payload);
        toast.success("Đã tạo gói.");
      }
      setOpen(false);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(p: Plan, value: boolean) {
    setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, isActive: value } : x)));
    try {
      await apiSend(API, "PATCH", { id: p.id, isActive: value });
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
      toast.success("Đã xóa gói.");
      setDeleting(null);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Plans</h1>
          <p className="text-sm text-muted-foreground">Gói đăng ký dịch vụ.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tạo gói
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Giá</TableHead>
              <TableHead>Giới hạn repo</TableHead>
              <TableHead>Quota phân tích</TableHead>
              <TableHead>Tính năng</TableHead>
              <TableHead>Hoạt động</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Chưa có gói nào.
                </TableCell>
              </TableRow>
            )}
            {items.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.price === 0 ? "Miễn phí" : `${p.price.toLocaleString("vi-VN")}₫/tháng`}</TableCell>
                <TableCell className="text-muted-foreground">{p.repositoryLimit}</TableCell>
                <TableCell className="text-muted-foreground">{p.analysisQuota.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {p.hasCheckAnnotations && <Badge variant="secondary">Check annotations</Badge>}
                    {p.hasHistoricalReports && <Badge variant="secondary">Historical reports</Badge>}
                    {!p.hasCheckAnnotations && !p.hasHistoricalReports && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Switch checked={p.isActive} onCheckedChange={(v) => toggleActive(p, v)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Sửa">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleting(p)}
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
            <DialogTitle>{editing ? "Sửa gói" : "Tạo gói"}</DialogTitle>
            <DialogDescription>Cấu hình giới hạn và tính năng của gói.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pl-name">Tên</Label>
                <Input id="pl-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pl-price">Giá (VND/tháng)</Label>
                <Input
                  id="pl-price"
                  type="number"
                  min="0"
                  step="1000"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pl-repo">Giới hạn repo</Label>
                <Input
                  id="pl-repo"
                  type="number"
                  min="0"
                  value={form.repositoryLimit}
                  onChange={(e) => setForm({ ...form, repositoryLimit: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pl-quota">Quota phân tích</Label>
                <Input
                  id="pl-quota"
                  type="number"
                  min="0"
                  value={form.analysisQuota}
                  onChange={(e) => setForm({ ...form, analysisQuota: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="pl-checks"
                checked={form.hasCheckAnnotations}
                onCheckedChange={(v) => setForm({ ...form, hasCheckAnnotations: v })}
              />
              <Label htmlFor="pl-checks">Check annotations</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="pl-reports"
                checked={form.hasHistoricalReports}
                onCheckedChange={(v) => setForm({ ...form, hasHistoricalReports: v })}
              />
              <Label htmlFor="pl-reports">Historical reports</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="pl-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <Label htmlFor="pl-active">Hoạt động</Label>
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
            <DialogTitle>Xóa gói?</DialogTitle>
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
