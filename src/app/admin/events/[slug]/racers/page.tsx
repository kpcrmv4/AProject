"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Racer, RacerClass, RaceClass } from "@/types";
import type { ApiResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ArrowLeft, Search, CheckCircle2, XCircle, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type RacerWithClasses = Racer & {
  racer_classes: (RacerClass & { class: RaceClass })[];
  short_uid?: string | null;
};

function RacersSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export default function RacersPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [racers, setRacers] = useState<RacerWithClasses[]>([]);
  const [classes, setClasses] = useState<RaceClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");

  const fetchData = useCallback(async () => {
    try {
      const [racersRes, classesRes] = await Promise.all([
        fetch(`/api/events/${slug}/racers`),
        fetch(`/api/events/${slug}/classes`),
      ]);

      const racersJson: ApiResponse<RacerWithClasses[]> =
        await racersRes.json();
      const classesJson: ApiResponse<RaceClass[]> = await classesRes.json();

      if (racersJson.error) {
        setError(racersJson.error.message);
        return;
      }

      setRacers(racersJson.data);
      setClasses(classesJson.error ? [] : classesJson.data);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลนักแข่งได้");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRacers = useMemo(() => {
    const searchLower = search.toLowerCase();

    return racers.filter((racer) => {
      // Search filter
      const matchesSearch =
        search === "" ||
        racer.name.toLowerCase().includes(searchLower) ||
        (racer.team !== null &&
          racer.team.toLowerCase().includes(searchLower)) ||
        racer.racer_classes.some((rc) =>
          String(rc.race_number).includes(search)
        );

      // Class filter
      const matchesClass =
        classFilter === "all" ||
        racer.racer_classes.some((rc) => rc.class_id === classFilter);

      return matchesSearch && matchesClass;
    });
  }, [racers, search, classFilter]);

  async function toggleConfirm(
    racerClassId: string,
    currentConfirmed: boolean
  ) {
    try {
      const res = await fetch(
        `/api/events/${slug}/racer-classes/${racerClassId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmed: !currentConfirmed }),
        }
      );

      const json: ApiResponse<RacerClass> = await res.json();

      if (json.error) {
        toast.error(json.error.message);
        return;
      }

      toast.success(
        !currentConfirmed ? "ยืนยันการสมัครแล้ว" : "ยกเลิกการยืนยัน"
      );
      fetchData();
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
      <div>
        <h1 className="text-2xl font-bold">นักแข่ง</h1>
        <p className="text-muted-foreground">
          รายชื่อนักแข่งทั้งหมด ({racers.length} คน)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อ, ทีม, เบอร์..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="ทุกรุ่น" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกรุ่น</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Racer table */}
      {loading ? (
        <RacersSkeleton />
      ) : error !== null ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : racers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            ยังไม่มีนักแข่งสมัคร
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              แสดง {filteredRacers.length} จาก {racers.length} คน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เบอร์</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead className="hidden sm:table-cell">ทีม</TableHead>
                    <TableHead>รุ่น</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>ลิงก์</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRacers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-muted-foreground"
                      >
                        ไม่พบผลลัพธ์
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRacers.map((racer) => (
                      <TableRow key={racer.id}>
                        <TableCell className="font-mono font-bold">
                          {racer.racer_classes
                            .map((rc) => rc.race_number)
                            .join(", ")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {racer.name}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {racer.team !== null ? racer.team : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {racer.racer_classes.map((rc) => (
                              <Badge
                                key={rc.id}
                                variant="secondary"
                                className="text-xs"
                              >
                                {rc.class?.name ?? "N/A"}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {racer.racer_classes.map((rc) => (
                            <div key={rc.id} className="flex items-center gap-1">
                              {rc.confirmed ? (
                                <Badge
                                  variant="default"
                                  className="gap-1 bg-emerald-600 text-xs"
                                >
                                  <CheckCircle2 className="size-3" />
                                  ยืนยันแล้ว
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="gap-1 text-xs"
                                >
                                  <XCircle className="size-3" />
                                  รอยืนยัน
                                </Badge>
                              )}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell>
                          {racer.short_uid ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs"
                                onClick={() => {
                                  const url = `${window.location.origin}/racer/${racer.short_uid}`;
                                  navigator.clipboard.writeText(url);
                                  toast.success("คัดลอกลิงก์แล้ว");
                                }}
                              >
                                <Copy className="size-3" />
                                คัดลอก
                              </Button>
                              <Link
                                href={`/racer/${racer.short_uid}`}
                                target="_blank"
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                >
                                  <ExternalLink className="size-3" />
                                </Button>
                              </Link>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {racer.racer_classes.map((rc) => (
                            <Button
                              key={rc.id}
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                toggleConfirm(rc.id, rc.confirmed)
                              }
                            >
                              {rc.confirmed ? "ยกเลิก" : "ยืนยัน"}
                            </Button>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
