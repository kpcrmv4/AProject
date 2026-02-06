"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Checkpoint } from "@/types";
import type { ApiResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Copy,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils/format";
import { toast } from "sonner";

function CheckpointsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

type CheckpointFormData = {
  name: string;
  sort_order: string;
};

const EMPTY_FORM: CheckpointFormData = {
  name: "",
  sort_order: "1",
};

export default function CheckpointsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(
    null
  );
  const [form, setForm] = useState<CheckpointFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchCheckpoints = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${slug}/checkpoints`);
      const json: ApiResponse<Checkpoint[]> = await res.json();

      if (json.error) {
        setError(json.error.message);
        return;
      }

      setCheckpoints(json.data);
    } catch {
      setError("ไม่สามารถโหลดข้อมูล Checkpoint ได้");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchCheckpoints();
  }, [fetchCheckpoints]);

  function openCreateDialog() {
    setEditingCheckpoint(null);
    setForm({
      ...EMPTY_FORM,
      sort_order: String(checkpoints.length + 1),
    });
    setDialogOpen(true);
  }

  function openEditDialog(cp: Checkpoint) {
    setEditingCheckpoint(cp);
    setForm({
      name: cp.name,
      sort_order: String(cp.sort_order),
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: form.name,
      sort_order: Number(form.sort_order),
    };

    try {
      const url =
        editingCheckpoint !== null
          ? `/api/events/${slug}/checkpoints/${editingCheckpoint.id}`
          : `/api/events/${slug}/checkpoints`;

      const method = editingCheckpoint !== null ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse<Checkpoint> = await res.json();

      if (json.error) {
        toast.error(json.error.message);
        setSubmitting(false);
        return;
      }

      toast.success(
        editingCheckpoint !== null
          ? "แก้ไข Checkpoint สำเร็จ"
          : "สร้าง Checkpoint สำเร็จ"
      );
      setDialogOpen(false);
      fetchCheckpoints();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("คัดลอกรหัสแล้ว");
    } catch {
      toast.error("ไม่สามารถคัดลอกได้");
    }
  }

  async function handleRegenerateCode(checkpointId: string) {
    if (!confirm("ต้องการสร้างรหัสใหม่หรือไม่? รหัสเดิมจะใช้ไม่ได้")) return;

    try {
      const res = await fetch(
        `/api/events/${slug}/checkpoints/${checkpointId}/regenerate`,
        { method: "POST" }
      );

      const json: ApiResponse<Checkpoint> = await res.json();

      if (json.error) {
        toast.error(json.error.message);
        return;
      }

      toast.success("สร้างรหัสใหม่สำเร็จ");
      fetchCheckpoints();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
  }

  function isExpired(expiresAt: string): boolean {
    return new Date(expiresAt) < new Date();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href={`/admin/events/${slug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          กลับหน้างาน
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Checkpoints</h1>
          <p className="text-muted-foreground">จุดจับเวลาและรหัสเข้าถึง</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="size-4" />
              เพิ่ม Checkpoint
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCheckpoint !== null
                  ? "แก้ไข Checkpoint"
                  : "เพิ่ม Checkpoint ใหม่"}
              </DialogTitle>
              <DialogDescription>
                กำหนดชื่อและลำดับของจุดจับเวลา
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cp-name">ชื่อ Checkpoint *</Label>
                <Input
                  id="cp-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="เช่น Start, CP1, Finish"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="cp-sort">ลำดับ</Label>
                <Input
                  id="cp-sort"
                  type="number"
                  min="1"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sort_order: e.target.value }))
                  }
                  disabled={submitting}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : editingCheckpoint !== null ? (
                    "บันทึก"
                  ) : (
                    "เพิ่ม Checkpoint"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Checkpoint list */}
      {loading ? (
        <CheckpointsSkeleton />
      ) : error !== null ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : checkpoints.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            ยังไม่มี Checkpoint กดปุ่ม &quot;เพิ่ม Checkpoint&quot; เพื่อเริ่มต้น
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {checkpoints.map((cp) => {
            const expired = isExpired(cp.code_expires_at);
            return (
              <Card key={cp.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {cp.sort_order}. {cp.name}
                        </CardTitle>
                      </div>
                      <CardDescription className="flex flex-wrap items-center gap-2">
                        <span>
                          รหัสเข้าถึง:{" "}
                          <code className="rounded bg-muted px-2 py-0.5 font-mono text-base font-bold">
                            {cp.access_code}
                          </code>
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => handleCopyCode(cp.access_code)}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                        {expired ? (
                          <Badge variant="destructive">หมดอายุ</Badge>
                        ) : (
                          <Badge variant="secondary">
                            หมดอายุ: {formatDateTime(cp.code_expires_at)}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="สร้างรหัสใหม่"
                        onClick={() => handleRegenerateCode(cp.id)}
                      >
                        <RefreshCw className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(cp)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
