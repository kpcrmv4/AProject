"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Racer, RacerClass, RaceClass } from "@/types";
import type { ApiResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Copy,
  ExternalLink,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

type RacerWithClasses = Racer & {
  racer_classes: (RacerClass & { classes: RaceClass })[];
};

function ApprovalsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export default function ApprovalsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [racers, setRacers] = useState<RacerWithClasses[]>([]);
  const [classes, setClasses] = useState<RaceClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState("all");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [confirmedResult, setConfirmedResult] = useState<{
    shortUid: string;
    racerName: string;
    qrDataUrl: string;
  } | null>(null);

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
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter to only show racers with at least one unconfirmed class
  const pendingRacers = useMemo(() => {
    return racers.filter((racer) =>
      racer.racer_classes.some((rc) => {
        const matchesClass =
          classFilter === "all" || rc.class_id === classFilter;
        return !rc.confirmed && matchesClass;
      })
    );
  }, [racers, classFilter]);

  async function handleConfirm(racerClassId: string, racerName: string) {
    setConfirmingId(racerClassId);
    try {
      const res = await fetch(
        `/api/events/${slug}/racer-classes/${racerClassId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmed: true }),
        }
      );

      const json: ApiResponse<{ short_uid?: string }> = await res.json();

      if (json.error) {
        toast.error(json.error.message);
        return;
      }

      toast.success("ยืนยันการสมัครแล้ว");

      // If short_uid was generated, show QR dialog
      if (json.data.short_uid) {
        const url = `${window.location.origin}/racer/${json.data.short_uid}`;
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 200,
          margin: 2,
        });
        setConfirmedResult({
          shortUid: json.data.short_uid,
          racerName,
          qrDataUrl,
        });
      }

      fetchData();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setConfirmingId(null);
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
        <h1 className="text-2xl font-bold">อนุมัติการสมัคร</h1>
        <p className="text-muted-foreground">
          ตรวจสลิปและยืนยันการสมัคร ({pendingRacers.length} รายการรอยืนยัน)
        </p>
      </div>

      {/* Class filter */}
      <div className="flex">
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

      {/* Pending registrations */}
      {loading ? (
        <ApprovalsSkeleton />
      ) : error !== null ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : pendingRacers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            ไม่มีรายการรอยืนยัน
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              รอยืนยัน {pendingRacers.length} คน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>เบอร์โทร</TableHead>
                    <TableHead>รุ่น / เบอร์</TableHead>
                    <TableHead>สลิป</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRacers.map((racer) => {
                    const pendingClasses = racer.racer_classes.filter(
                      (rc) =>
                        !rc.confirmed &&
                        (classFilter === "all" ||
                          rc.class_id === classFilter)
                    );

                    return pendingClasses.map((rc) => (
                      <TableRow key={rc.id}>
                        <TableCell className="font-medium">
                          {racer.name}
                        </TableCell>
                        <TableCell>
                          {racer.phone ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="size-3" />
                              {racer.phone}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="secondary" className="text-xs">
                              {rc.classes?.name ?? "N/A"}
                            </Badge>
                            <span className="ml-2 font-mono text-sm font-bold">
                              #{rc.race_number}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {rc.payment_slip_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs"
                              onClick={() => setSlipUrl(rc.payment_slip_url)}
                            >
                              <ImageIcon className="size-3" />
                              ดูสลิป
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              ไม่มีสลิป
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="gap-1"
                            disabled={confirmingId === rc.id}
                            onClick={() =>
                              handleConfirm(rc.id, racer.name)
                            }
                          >
                            {confirmingId === rc.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="size-3" />
                            )}
                            ยืนยัน
                          </Button>
                        </TableCell>
                      </TableRow>
                    ));
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment slip dialog */}
      <Dialog open={slipUrl !== null} onOpenChange={() => setSlipUrl(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>สลิปการโอนเงิน</DialogTitle>
          </DialogHeader>
          {slipUrl !== null && (
            <img
              src={slipUrl}
              alt="สลิปโอนเงิน"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmed result dialog (shows QR + link) */}
      <Dialog
        open={confirmedResult !== null}
        onOpenChange={() => setConfirmedResult(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันสำเร็จ!</DialogTitle>
          </DialogHeader>
          {confirmedResult !== null && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground">
                ลิงก์สำหรับ <strong>{confirmedResult.racerName}</strong>
              </p>
              <img
                src={confirmedResult.qrDataUrl}
                alt="QR Code"
                className="rounded-lg border"
              />
              <div className="flex w-full gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-1"
                  onClick={() => {
                    const url = `${window.location.origin}/racer/${confirmedResult.shortUid}`;
                    navigator.clipboard.writeText(url);
                    toast.success("คัดลอกลิงก์แล้ว");
                  }}
                >
                  <Copy className="size-3" />
                  คัดลอกลิงก์
                </Button>
                <Link
                  href={`/racer/${confirmedResult.shortUid}`}
                  target="_blank"
                >
                  <Button variant="outline" className="gap-1">
                    <ExternalLink className="size-3" />
                    เปิด
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
