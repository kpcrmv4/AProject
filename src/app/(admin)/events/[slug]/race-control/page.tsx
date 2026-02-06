"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { ApiResponse } from "@/types/api";
import type { RankedRacer } from "@/lib/utils/calculate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Search,
  AlertTriangle,
  Clock,
  Ban,
  Loader2,
  History,
  Wifi,
  WifiOff,
} from "lucide-react";
import { formatDuration, formatTimeShort } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// --- Sub-components for composition ---

type RacerStatusBadgeProps = {
  status: "racing" | "finished" | "dnf";
};

function RacerStatusBadge({ status }: RacerStatusBadgeProps) {
  switch (status) {
    case "finished":
      return (
        <Badge variant="default" className="bg-emerald-600">
          Finished
        </Badge>
      );
    case "dnf":
      return <Badge variant="destructive">DNF</Badge>;
    case "racing":
      return (
        <Badge variant="secondary" className="animate-pulse">
          Racing
        </Badge>
      );
  }
}

type LiveConnectionBadgeProps = {
  connected: boolean;
};

function LiveConnectionBadge({ connected }: LiveConnectionBadgeProps) {
  return connected ? (
    <Badge variant="default" className="gap-1 bg-emerald-600">
      <Wifi className="size-3" />
      Live
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1">
      <WifiOff className="size-3" />
      Offline
    </Badge>
  );
}

// --- Modal components ---

type DnfModalProps = {
  open: boolean;
  onClose: () => void;
  racerName: string;
  onSubmit: (reason: string) => Promise<void>;
};

function DnfModal({ open, onClose, racerName, onSubmit }: DnfModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(reason);
    setSubmitting(false);
    setReason("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="size-5 text-destructive" />
            Mark DNF
          </DialogTitle>
          <DialogDescription>
            บันทึก DNF สำหรับ {racerName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="dnf-reason">เหตุผล *</Label>
            <Textarea
              id="dnf-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผล เช่น รถเสีย, บาดเจ็บ, สละสิทธิ์"
              required
              disabled={submitting}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={submitting || reason.trim() === ""}
            >
              {submitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              ยืนยัน DNF
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type PenaltyModalProps = {
  open: boolean;
  onClose: () => void;
  racerName: string;
  onSubmit: (seconds: number, reason: string) => Promise<void>;
};

function PenaltyModal({
  open,
  onClose,
  racerName,
  onSubmit,
}: PenaltyModalProps) {
  const [seconds, setSeconds] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(Number(seconds), reason);
    setSubmitting(false);
    setSeconds("");
    setReason("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="size-5 text-orange-500" />
            เพิ่ม Penalty
          </DialogTitle>
          <DialogDescription>
            เพิ่มเวลา penalty สำหรับ {racerName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="penalty-seconds">เวลา penalty (วินาที) *</Label>
            <Input
              id="penalty-seconds"
              type="number"
              min="1"
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              placeholder="เช่น 30, 60, 120"
              required
              disabled={submitting}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="penalty-reason">เหตุผล *</Label>
            <Textarea
              id="penalty-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผล เช่น ลัดเส้นทาง, ฝ่าฝืนกติกา"
              required
              disabled={submitting}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={
                submitting || seconds === "" || reason.trim() === ""
              }
            >
              {submitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              เพิ่ม Penalty
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type EditTimestampModalProps = {
  open: boolean;
  onClose: () => void;
  racerName: string;
  timestampId: string;
  currentTime: string;
  onSubmit: (newTime: string, reason: string) => Promise<void>;
};

function EditTimestampModal({
  open,
  onClose,
  racerName,
  currentTime,
  onSubmit,
}: EditTimestampModalProps) {
  const [newTime, setNewTime] = useState(currentTime);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(newTime, reason);
    setSubmitting(false);
    setReason("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="size-5 text-blue-500" />
            แก้ไขเวลา
          </DialogTitle>
          <DialogDescription>
            แก้ไขเวลาสำหรับ {racerName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-time">เวลาใหม่ *</Label>
            <Input
              id="new-time"
              type="datetime-local"
              step="0.001"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-reason">เหตุผล *</Label>
            <Textarea
              id="edit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผลการแก้ไข"
              required
              disabled={submitting}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={submitting || reason.trim() === ""}
            >
              {submitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              บันทึก
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type AuditEntry = {
  id: string;
  action: string;
  reason: string | null;
  created_at: string;
};

type AuditTrailModalProps = {
  open: boolean;
  onClose: () => void;
  racerName: string;
  entries: AuditEntry[];
  loading: boolean;
};

function AuditTrailModal({
  open,
  onClose,
  racerName,
  entries,
  loading,
}: AuditTrailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-5" />
            Audit Trail - {racerName}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            ยังไม่มีบันทึก
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{entry.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimeShort(entry.created_at)}
                  </span>
                </div>
                {entry.reason !== null ? (
                  <p className="mt-1 text-muted-foreground">
                    เหตุผล: {entry.reason}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- Skeleton ---

function RaceControlSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

// --- Main page ---

export default function RaceControlPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [rankings, setRankings] = useState<RankedRacer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [connected, setConnected] = useState(false);

  // Modal states (composition: each modal is separate)
  const [dnfTarget, setDnfTarget] = useState<RankedRacer | null>(null);
  const [penaltyTarget, setPenaltyTarget] = useState<RankedRacer | null>(null);
  const [editTimestampTarget, setEditTimestampTarget] = useState<{
    racer: RankedRacer;
    timestampId: string;
    currentTime: string;
  } | null>(null);
  const [auditTarget, setAuditTarget] = useState<RankedRacer | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchRankings = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${slug}/race-control`);
      const json: ApiResponse<RankedRacer[]> = await res.json();

      if (json.error) {
        setError(json.error.message);
        return;
      }

      setRankings(json.data);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  // Initial fetch
  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`race-control-${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "timestamps" },
        () => {
          fetchRankings();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dnf_records" },
        () => {
          fetchRankings();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "penalties" },
        () => {
          fetchRankings();
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug, fetchRankings]);

  // Filtered rankings
  const filteredRankings = useMemo(() => {
    if (search === "") return rankings;
    const searchLower = search.toLowerCase();
    return rankings.filter(
      (r) =>
        r.racer_name.toLowerCase().includes(searchLower) ||
        String(r.racer_number).includes(search)
    );
  }, [rankings, search]);

  // Stats
  const stats = useMemo(() => {
    const racing = rankings.filter((r) => r.status === "racing").length;
    const finished = rankings.filter((r) => r.status === "finished").length;
    const dnf = rankings.filter((r) => r.status === "dnf").length;
    return { racing, finished, dnf, total: rankings.length };
  }, [rankings]);

  // Handlers
  async function handleDnf(reason: string) {
    if (dnfTarget === null) return;
    try {
      const res = await fetch(`/api/events/${slug}/dnf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          racer_id: dnfTarget.racer_id,
          reason,
        }),
      });
      const json: ApiResponse<unknown> = await res.json();
      if (json.error) {
        toast.error(json.error.message);
        return;
      }
      toast.success("บันทึก DNF สำเร็จ");
      fetchRankings();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
  }

  async function handlePenalty(seconds: number, reason: string) {
    if (penaltyTarget === null) return;
    try {
      const res = await fetch(`/api/events/${slug}/penalties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          racer_id: penaltyTarget.racer_id,
          seconds,
          reason,
        }),
      });
      const json: ApiResponse<unknown> = await res.json();
      if (json.error) {
        toast.error(json.error.message);
        return;
      }
      toast.success("เพิ่ม Penalty สำเร็จ");
      fetchRankings();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
  }

  async function handleEditTimestamp(newTime: string, reason: string) {
    if (editTimestampTarget === null) return;
    try {
      const res = await fetch(
        `/api/events/${slug}/timestamps/${editTimestampTarget.timestampId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recorded_at: newTime,
            reason,
          }),
        }
      );
      const json: ApiResponse<unknown> = await res.json();
      if (json.error) {
        toast.error(json.error.message);
        return;
      }
      toast.success("แก้ไขเวลาสำเร็จ");
      fetchRankings();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
  }

  async function openAuditTrail(racer: RankedRacer) {
    setAuditTarget(racer);
    setAuditLoading(true);
    try {
      const res = await fetch(
        `/api/events/${slug}/audit-logs?target_id=${racer.racer_id}`
      );
      const json: ApiResponse<AuditEntry[]> = await res.json();
      setAuditEntries(json.error ? [] : json.data);
    } catch {
      setAuditEntries([]);
    } finally {
      setAuditLoading(false);
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
          <h1 className="text-2xl font-bold">ควบคุมการแข่ง</h1>
          <p className="text-muted-foreground">
            ติดตามสถานะนักแข่ง real-time
          </p>
        </div>
        <LiveConnectionBadge connected={connected} />
      </div>

      {loading ? (
        <RaceControlSkeleton />
      ) : error !== null ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            <AlertTriangle className="mx-auto mb-2 size-8" />
            <p>{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setLoading(true);
                setError(null);
                fetchRankings();
              }}
            >
              ลองใหม่
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>ทั้งหมด</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>กำลังแข่ง</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  {stats.racing}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>เข้าเส้นชัย</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-600">
                  {stats.finished}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>DNF</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-destructive">
                  {stats.dnf}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ค้นหาเบอร์หรือชื่อ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Racer table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">อันดับ</TableHead>
                      <TableHead className="w-20">เบอร์</TableHead>
                      <TableHead>ชื่อ</TableHead>
                      <TableHead className="hidden md:table-cell">
                        รุ่น
                      </TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        เวลารวม
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Penalty
                      </TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRankings.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-8 text-center text-muted-foreground"
                        >
                          {rankings.length === 0
                            ? "ยังไม่มีนักแข่ง"
                            : "ไม่พบผลลัพธ์"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRankings.map((racer) => (
                        <TableRow key={racer.racer_id}>
                          <TableCell className="font-mono font-bold">
                            {racer.rank !== null ? `#${racer.rank}` : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-lg font-bold">
                            {racer.racer_number}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {racer.racer_name}
                              </p>
                              {racer.team !== null ? (
                                <p className="text-xs text-muted-foreground">
                                  {racer.team}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="secondary" className="text-xs">
                              {racer.class_name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <RacerStatusBadge status={racer.status} />
                          </TableCell>
                          <TableCell className="hidden sm:table-cell font-mono">
                            {racer.final_seconds !== null
                              ? formatDuration(racer.final_seconds)
                              : "-"}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell font-mono">
                            {racer.penalty_seconds > 0
                              ? `+${racer.penalty_seconds}s`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Mark DNF"
                                onClick={() => setDnfTarget(racer)}
                                disabled={racer.status === "dnf"}
                              >
                                <Ban className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Add Penalty"
                                onClick={() => setPenaltyTarget(racer)}
                                disabled={racer.status === "dnf"}
                              >
                                <Clock className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Audit Trail"
                                onClick={() => openAuditTrail(racer)}
                              >
                                <History className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modals */}
      <DnfModal
        open={dnfTarget !== null}
        onClose={() => setDnfTarget(null)}
        racerName={dnfTarget?.racer_name ?? ""}
        onSubmit={handleDnf}
      />

      <PenaltyModal
        open={penaltyTarget !== null}
        onClose={() => setPenaltyTarget(null)}
        racerName={penaltyTarget?.racer_name ?? ""}
        onSubmit={handlePenalty}
      />

      {editTimestampTarget !== null ? (
        <EditTimestampModal
          open={true}
          onClose={() => setEditTimestampTarget(null)}
          racerName={editTimestampTarget.racer.racer_name}
          timestampId={editTimestampTarget.timestampId}
          currentTime={editTimestampTarget.currentTime}
          onSubmit={handleEditTimestamp}
        />
      ) : null}

      <AuditTrailModal
        open={auditTarget !== null}
        onClose={() => setAuditTarget(null)}
        racerName={auditTarget?.racer_name ?? ""}
        entries={auditEntries}
        loading={auditLoading}
      />
    </div>
  );
}
