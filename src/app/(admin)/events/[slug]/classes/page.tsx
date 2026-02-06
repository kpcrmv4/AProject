"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { RaceClass } from "@/types";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";

function ClassesSkeleton() {
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

type ClassFormData = {
  name: string;
  fee: string;
  number_start: string;
  number_end: string;
  number_format: string;
  sort_order: string;
};

const EMPTY_FORM: ClassFormData = {
  name: "",
  fee: "0",
  number_start: "1",
  number_end: "99",
  number_format: "000",
  sort_order: "0",
};

export default function ClassesPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [classes, setClasses] = useState<RaceClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<RaceClass | null>(null);
  const [form, setForm] = useState<ClassFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${slug}/classes`);
      const json: ApiResponse<RaceClass[]> = await res.json();

      if (json.error) {
        setError(json.error.message);
        return;
      }

      setClasses(json.data);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลรุ่นได้");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  function openCreateDialog() {
    setEditingClass(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(cls: RaceClass) {
    setEditingClass(cls);
    setForm({
      name: cls.name,
      fee: String(cls.fee),
      number_start: String(cls.number_start),
      number_end: String(cls.number_end),
      number_format: cls.number_format,
      sort_order: String(cls.sort_order),
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: form.name,
      fee: Number(form.fee),
      number_start: Number(form.number_start),
      number_end: Number(form.number_end),
      number_format: form.number_format,
      sort_order: Number(form.sort_order),
    };

    try {
      const url = editingClass !== null
        ? `/api/events/${slug}/classes/${editingClass.id}`
        : `/api/events/${slug}/classes`;

      const method = editingClass !== null ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse<RaceClass> = await res.json();

      if (json.error) {
        toast.error(json.error.message);
        setSubmitting(false);
        return;
      }

      toast.success(
        editingClass !== null ? "แก้ไขรุ่นสำเร็จ" : "สร้างรุ่นสำเร็จ"
      );
      setDialogOpen(false);
      fetchClasses();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(classId: string) {
    if (!confirm("ต้องการลบรุ่นนี้หรือไม่?")) return;

    try {
      const res = await fetch(`/api/events/${slug}/classes/${classId}`, {
        method: "DELETE",
      });

      const json: ApiResponse<{ deleted: boolean }> = await res.json();

      if (json.error) {
        toast.error(json.error.message);
        return;
      }

      toast.success("ลบรุ่นสำเร็จ");
      fetchClasses();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
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
          <h1 className="text-2xl font-bold">รุ่นการแข่ง</h1>
          <p className="text-muted-foreground">จัดการรุ่นและค่าสมัคร</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="size-4" />
              เพิ่มรุ่น
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClass !== null ? "แก้ไขรุ่น" : "เพิ่มรุ่นใหม่"}
              </DialogTitle>
              <DialogDescription>
                กำหนดชื่อรุ่น ค่าสมัคร และช่วงหมายเลข
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="class-name">ชื่อรุ่น *</Label>
                <Input
                  id="class-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="เช่น Expert, Beginner"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="class-fee">ค่าสมัคร (บาท)</Label>
                <Input
                  id="class-fee"
                  type="number"
                  min="0"
                  value={form.fee}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fee: e.target.value }))
                  }
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="number-start">เลขเริ่มต้น</Label>
                  <Input
                    id="number-start"
                    type="number"
                    min="1"
                    value={form.number_start}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, number_start: e.target.value }))
                    }
                    disabled={submitting}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="number-end">เลขสิ้นสุด</Label>
                  <Input
                    id="number-end"
                    type="number"
                    min="1"
                    value={form.number_end}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, number_end: e.target.value }))
                    }
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="number-format">รูปแบบเลข</Label>
                  <Input
                    id="number-format"
                    value={form.number_format}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, number_format: e.target.value }))
                    }
                    placeholder="000"
                    disabled={submitting}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="sort-order">ลำดับ</Label>
                  <Input
                    id="sort-order"
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sort_order: e.target.value }))
                    }
                    disabled={submitting}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : editingClass !== null ? (
                    "บันทึก"
                  ) : (
                    "เพิ่มรุ่น"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Class list */}
      {loading ? (
        <ClassesSkeleton />
      ) : error !== null ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            ยังไม่มีรุ่นการแข่ง กดปุ่ม &quot;เพิ่มรุ่น&quot; เพื่อเริ่มต้น
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {classes.map((cls) => (
            <Card key={cls.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{cls.name}</CardTitle>
                    <CardDescription>
                      ค่าสมัคร: {formatCurrency(cls.fee)} | เบอร์:{" "}
                      {cls.number_start}-{cls.number_end} | รูปแบบ:{" "}
                      {cls.number_format}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(cls)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDelete(cls.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
