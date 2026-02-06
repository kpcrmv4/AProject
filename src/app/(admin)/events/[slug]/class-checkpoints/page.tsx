"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { RaceClass, Checkpoint } from "@/types";
import type { ApiResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

type ClassCheckpointMapping = {
  class_id: string;
  checkpoint_id: string;
};

function MappingSkeleton() {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClassCheckpointsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [classes, setClasses] = useState<RaceClass[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [mappings, setMappings] = useState<ClassCheckpointMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [classesRes, checkpointsRes, mappingsRes] = await Promise.all([
        fetch(`/api/events/${slug}/classes`),
        fetch(`/api/events/${slug}/checkpoints`),
        fetch(`/api/events/${slug}/class-checkpoints`),
      ]);

      const classesJson: ApiResponse<RaceClass[]> = await classesRes.json();
      const checkpointsJson: ApiResponse<Checkpoint[]> =
        await checkpointsRes.json();
      const mappingsJson: ApiResponse<ClassCheckpointMapping[]> =
        await mappingsRes.json();

      if (classesJson.error) {
        setError(classesJson.error.message);
        return;
      }
      if (checkpointsJson.error) {
        setError(checkpointsJson.error.message);
        return;
      }

      setClasses(classesJson.data);
      setCheckpoints(checkpointsJson.data);
      setMappings(mappingsJson.error ? [] : mappingsJson.data);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function isChecked(classId: string, checkpointId: string): boolean {
    return mappings.some(
      (m) => m.class_id === classId && m.checkpoint_id === checkpointId
    );
  }

  function toggleMapping(classId: string, checkpointId: string) {
    setMappings((prev) => {
      const exists = prev.some(
        (m) => m.class_id === classId && m.checkpoint_id === checkpointId
      );
      if (exists) {
        return prev.filter(
          (m) =>
            !(m.class_id === classId && m.checkpoint_id === checkpointId)
        );
      }
      return [...prev, { class_id: classId, checkpoint_id: checkpointId }];
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${slug}/class-checkpoints`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings }),
      });

      const json: ApiResponse<ClassCheckpointMapping[]> = await res.json();

      if (json.error) {
        toast.error(json.error.message);
        return;
      }

      toast.success("บันทึกเส้นทางสำเร็จ");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
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
          <h1 className="text-2xl font-bold">เส้นทางรุ่น</h1>
          <p className="text-muted-foreground">
            กำหนดว่าแต่ละรุ่นผ่าน Checkpoint ใดบ้าง
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              กำลังบันทึก...
            </>
          ) : (
            <>
              <Save className="size-4" />
              บันทึก
            </>
          )}
        </Button>
      </div>

      {/* Matrix */}
      {loading ? (
        <MappingSkeleton />
      ) : error !== null ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : classes.length === 0 || checkpoints.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {classes.length === 0
              ? "กรุณาสร้างรุ่นก่อน"
              : "กรุณาสร้าง Checkpoint ก่อน"}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              เลือก Checkpoint ที่แต่ละรุ่นต้องผ่าน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium">รุ่น</th>
                    {checkpoints.map((cp) => (
                      <th
                        key={cp.id}
                        className="px-3 py-2 text-center font-medium"
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs text-muted-foreground">
                            {cp.sort_order}
                          </span>
                          <span>{cp.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls) => (
                    <tr key={cls.id} className="border-b last:border-0">
                      <td className="px-3 py-3 font-medium">{cls.name}</td>
                      {checkpoints.map((cp) => (
                        <td key={cp.id} className="px-3 py-3 text-center">
                          <Checkbox
                            checked={isChecked(cls.id, cp.id)}
                            onCheckedChange={() =>
                              toggleMapping(cls.id, cp.id)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
