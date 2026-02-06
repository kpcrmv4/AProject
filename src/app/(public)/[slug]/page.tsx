"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Event, RaceClass, Racer, RacerClass } from "@/types";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  Timer,
  Calendar,
  Upload,
  Loader2,
  CheckCircle2,
  BarChart3,
  Image as ImageIcon,
  Users,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";
import { Toaster } from "sonner";

// --- Types ---

type RacerWithClasses = Racer & {
  racer_classes: (RacerClass & { classes: RaceClass })[];
};

// --- Sub-components ---

type ClassSelectorProps = {
  classes: RaceClass[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

function ClassSelector({
  classes,
  selectedIds,
  onChange,
  disabled = false,
}: ClassSelectorProps) {
  function toggleClass(classId: string) {
    if (selectedIds.includes(classId)) {
      onChange(selectedIds.filter((id) => id !== classId));
    } else {
      onChange([...selectedIds, classId]);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {classes.map((cls) => {
        const isSelected = selectedIds.includes(cls.id);
        return (
          <label
            key={cls.id}
            className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
              isSelected
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                : "hover:bg-accent"
            } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleClass(cls.id)}
                disabled={disabled}
              />
              <div>
                <p className="font-medium">{cls.name}</p>
                <p className="text-xs text-muted-foreground">
                  เบอร์ {cls.number_start}-{cls.number_end}
                </p>
              </div>
            </div>
            <span className="font-mono font-bold text-emerald-600">
              {formatCurrency(cls.fee)}
            </span>
          </label>
        );
      })}
    </div>
  );
}

// --- Registration status helpers ---

function getRegistrationStatus(event: Event): "open" | "closed" | "upcoming" {
  const now = new Date();

  if (event.registration_closes !== null) {
    const closes = new Date(event.registration_closes);
    if (now > closes) return "closed";
  }

  if (event.registration_opens !== null) {
    const opens = new Date(event.registration_opens);
    if (now < opens) return "upcoming";
  }

  return "open";
}

function RegistrationStatusBadge({ status }: { status: "open" | "closed" | "upcoming" }) {
  switch (status) {
    case "open":
      return (
        <Badge variant="default" className="bg-emerald-600">
          เปิดรับสมัคร
        </Badge>
      );
    case "closed":
      return <Badge variant="destructive">ปิดรับสมัครแล้ว</Badge>;
    case "upcoming":
      return <Badge variant="secondary">ยังไม่เปิดรับสมัคร</Badge>;
  }
}

// --- Skeletons ---

function PublicEventSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// --- Registered racers table ---

function RegisteredRacersSection({
  racers,
  classes,
}: {
  racers: RacerWithClasses[];
  classes: RaceClass[];
}) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const racersByClass = useMemo(() => {
    if (!selectedClassId) return [];
    return racers.filter((r) =>
      r.racer_classes.some((rc) => rc.class_id === selectedClassId)
    );
  }, [racers, selectedClassId]);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cls of classes) {
      counts[cls.id] = racers.filter((r) =>
        r.racer_classes.some((rc) => rc.class_id === cls.id)
      ).length;
    }
    return counts;
  }, [racers, classes]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="size-5 text-emerald-600" />
          <CardTitle>รายชื่อผู้สมัคร</CardTitle>
        </div>
        <CardDescription>
          เลือกรุ่นเพื่อดูรายชื่อ (สมัครแล้ว {racers.length} คน)
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Class filter buttons */}
        <div className="flex flex-wrap gap-2">
          {classes.map((cls) => (
            <Button
              key={cls.id}
              variant={selectedClassId === cls.id ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setSelectedClassId(
                  selectedClassId === cls.id ? null : cls.id
                )
              }
              className="gap-1"
            >
              {cls.name}
              <Badge
                variant="secondary"
                className="ml-1 h-5 min-w-[20px] px-1 text-xs"
              >
                {classCounts[cls.id] ?? 0}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Racer table */}
        {selectedClassId !== null ? (
          racersByClass.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              ยังไม่มีผู้สมัครในรุ่นนี้
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">เบอร์</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead className="w-16 text-center">รูป</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {racersByClass.map((racer) => {
                    const rc = racer.racer_classes.find(
                      (r) => r.class_id === selectedClassId
                    );
                    return (
                      <TableRow key={racer.id}>
                        <TableCell className="font-mono font-bold">
                          {rc?.race_number ?? "-"}
                        </TableCell>
                        <TableCell>{racer.name}</TableCell>
                        <TableCell className="text-center">
                          {racer.photo_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => setPhotoUrl(racer.photo_url)}
                            >
                              <ImageIcon className="size-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            กดเลือกรุ่นด้านบนเพื่อดูรายชื่อ
          </p>
        )}

        {/* Photo dialog */}
        <Dialog open={photoUrl !== null} onOpenChange={() => setPhotoUrl(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>รูปนักแข่ง</DialogTitle>
            </DialogHeader>
            {photoUrl !== null && (
              <img
                src={photoUrl}
                alt="รูปนักแข่ง"
                className="w-full rounded-lg"
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// --- Main page ---

export default function PublicEventPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [event, setEvent] = useState<Event | null>(null);
  const [classes, setClasses] = useState<RaceClass[]>([]);
  const [racers, setRacers] = useState<RacerWithClasses[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Registration form
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [bike, setBike] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [racerPhoto, setRacerPhoto] = useState<File | null>(null);
  const [paymentSlip, setPaymentSlip] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [eventRes, classesRes, racersRes] = await Promise.all([
        fetch(`/api/events/${slug}`),
        fetch(`/api/events/${slug}/classes`),
        fetch(`/api/events/${slug}/racers`),
      ]);

      const eventJson: ApiResponse<Event> = await eventRes.json();
      const classesJson: ApiResponse<RaceClass[]> = await classesRes.json();
      const racersJson: ApiResponse<RacerWithClasses[]> = await racersRes.json();

      if (eventJson.error) {
        setError(eventJson.error.message);
        return;
      }

      setEvent(eventJson.data);
      setClasses(classesJson.error ? [] : classesJson.data);
      setRacers(racersJson.error ? [] : racersJson.data);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const registrationStatus = event !== null ? getRegistrationStatus(event) : "closed";

  const totalFee = useMemo(() => {
    return classes
      .filter((cls) => selectedClassIds.includes(cls.id))
      .reduce((sum, cls) => sum + cls.fee, 0);
  }, [classes, selectedClassIds]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (selectedClassIds.length === 0) {
      toast.error("กรุณาเลือกอย่างน้อย 1 รุ่น");
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Upload racer photo if provided
      let photoUrl: string | undefined;
      if (racerPhoto !== null) {
        const photoFormData = new FormData();
        photoFormData.append("file", racerPhoto);

        const photoRes = await fetch(`/api/events/${slug}/upload-photo`, {
          method: "POST",
          body: photoFormData,
        });

        const photoJson = await photoRes.json();
        if (photoJson.data?.url) {
          photoUrl = photoJson.data.url;
        }
      }

      // Step 2: Register racer
      const res = await fetch(`/api/events/${slug}/racers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          team: team || undefined,
          bike: bike || undefined,
          phone: phone || undefined,
          class_ids: selectedClassIds,
          photo_url: photoUrl,
        }),
      });

      const json: ApiResponse<{ id: string }> = await res.json();

      if (json.error) {
        toast.error(json.error.message);
        setSubmitting(false);
        return;
      }

      // Step 3: Upload payment slip if provided
      if (paymentSlip !== null) {
        const formData = new FormData();
        formData.append("file", paymentSlip);
        formData.append("racer_id", json.data.id);

        await fetch(`/api/events/${slug}/upload-slip`, {
          method: "POST",
          body: formData,
        });
      }

      toast.success("สมัครสำเร็จ!");
      setRegistered(true);
    } catch {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <PublicEventSkeleton />;
  }

  if (error !== null || event === null) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="py-8 text-center">
            <p className="text-destructive">{error ?? "ไม่พบงานแข่ง"}</p>
          </CardContent>
        </Card>
        <Toaster position="top-center" richColors />
      </div>
    );
  }

  // Success state
  if (registered) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="size-16 text-emerald-600" />
            <h2 className="text-2xl font-bold">สมัครสำเร็จ!</h2>
            <p className="text-muted-foreground">
              รอผู้จัดยืนยันการชำระเงิน คุณจะได้รับเบอร์แข่งเมื่อยืนยันแล้ว
            </p>
            <Link href={`/${slug}/results`}>
              <Button variant="outline" className="gap-2">
                <BarChart3 className="size-4" />
                ดูผลแข่งสด
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Toaster position="top-center" richColors />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Event header */}
      <header className="border-b bg-card px-4 py-6">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <Timer className="size-8 text-emerald-600" />
            <div>
              <h1 className="text-2xl font-bold">{event.name}</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4" />
                {formatDate(event.race_date)}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <RegistrationStatusBadge status={registrationStatus} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="flex flex-col gap-6">
          {registrationStatus !== "open" ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  {registrationStatus === "closed"
                    ? "การรับสมัครปิดแล้ว"
                    : "การรับสมัครยังไม่เปิด"}
                </p>
                <Link href={`/${slug}/results`}>
                  <Button variant="outline" className="mt-4 gap-2">
                    <BarChart3 className="size-4" />
                    ดูผลแข่งสด
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-6">
              {/* Personal info */}
              <Card>
                <CardHeader>
                  <CardTitle>ข้อมูลนักแข่ง</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="racer-name">ชื่อ-นามสกุล *</Label>
                    <Input
                      id="racer-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ชื่อจริง นามสกุล"
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="racer-team">ทีม</Label>
                    <Input
                      id="racer-team"
                      value={team}
                      onChange={(e) => setTeam(e.target.value)}
                      placeholder="ชื่อทีม (ถ้ามี)"
                      disabled={submitting}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="racer-bike">รถ</Label>
                    <Input
                      id="racer-bike"
                      value={bike}
                      onChange={(e) => setBike(e.target.value)}
                      placeholder="ยี่ห้อ/รุ่น"
                      disabled={submitting}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="racer-phone">เบอร์โทร</Label>
                    <Input
                      id="racer-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0xx-xxx-xxxx"
                      disabled={submitting}
                    />
                  </div>

                  {/* Racer photo upload */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="photo-upload">รูปนักแข่ง</Label>
                    <div>
                      <Label
                        htmlFor="photo-upload"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm transition-colors hover:bg-accent"
                      >
                        <Upload className="size-4" />
                        {racerPhoto !== null
                          ? racerPhoto.name
                          : "เลือกรูปนักแข่ง"}
                      </Label>
                      <Input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          setRacerPhoto(e.target.files?.[0] ?? null)
                        }
                        disabled={submitting}
                      />
                    </div>
                    {racerPhoto !== null && (
                      <img
                        src={URL.createObjectURL(racerPhoto)}
                        alt="Preview"
                        className="mt-1 h-32 w-32 rounded-lg border object-cover"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Class selection */}
              <Card>
                <CardHeader>
                  <CardTitle>เลือกรุ่น *</CardTitle>
                  <CardDescription>เลือกได้หลายรุ่น</CardDescription>
                </CardHeader>
                <CardContent>
                  {classes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      ยังไม่มีรุ่นเปิดให้สมัคร
                    </p>
                  ) : (
                    <ClassSelector
                      classes={classes}
                      selectedIds={selectedClassIds}
                      onChange={setSelectedClassIds}
                      disabled={submitting}
                    />
                  )}

                  {selectedClassIds.length > 0 ? (
                    <div className="mt-4 flex items-center justify-between rounded-lg bg-muted p-3">
                      <span className="text-sm font-medium">ยอดรวม</span>
                      <span className="font-mono text-lg font-bold text-emerald-600">
                        {formatCurrency(totalFee)}
                      </span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Payment */}
              {event.payment_qr_url !== null ? (
                <Card>
                  <CardHeader>
                    <CardTitle>ชำระเงิน</CardTitle>
                    <CardDescription>
                      สแกน QR Code เพื่อชำระค่าสมัคร แล้วอัพโหลดสลิป
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4">
                    <img
                      src={event.payment_qr_url}
                      alt="Payment QR"
                      className="max-w-[200px] rounded-lg border"
                    />

                    <Separator />

                    <div className="w-full">
                      <Label htmlFor="slip-upload">อัพโหลดสลิปการโอน</Label>
                      <div className="mt-2">
                        <Label
                          htmlFor="slip-upload"
                          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm transition-colors hover:bg-accent"
                        >
                          <Upload className="size-4" />
                          {paymentSlip !== null
                            ? paymentSlip.name
                            : "เลือกไฟล์สลิป"}
                        </Label>
                        <Input
                          id="slip-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            setPaymentSlip(e.target.files?.[0] ?? null)
                          }
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                disabled={submitting || selectedClassIds.length === 0}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    กำลังสมัคร...
                  </>
                ) : (
                  "สมัครแข่ง"
                )}
              </Button>
            </form>
          )}

          {/* Registered racers section */}
          {racers.length > 0 && classes.length > 0 && (
            <RegisteredRacersSection racers={racers} classes={classes} />
          )}
        </div>
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}
