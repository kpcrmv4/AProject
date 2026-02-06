"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Event } from "@/types";
import type { ApiResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, Save, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [registrationOpens, setRegistrationOpens] = useState("");
  const [registrationCloses, setRegistrationCloses] = useState("");
  const [published, setPublished] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Convert ISO timestamp to datetime-local format (yyyy-MM-ddThh:mm)
  function toDatetimeLocal(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${slug}`);
      const json: ApiResponse<Event> = await res.json();

      if (json.error) {
        setError(json.error.message);
        return;
      }

      const e = json.data;
      setEvent(e);
      setName(e.name);
      setRaceDate(e.race_date);
      setRegistrationOpens(toDatetimeLocal(e.registration_opens));
      setRegistrationCloses(toDatetimeLocal(e.registration_closes));
      setPublished(e.published);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/events/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          race_date: raceDate,
          registration_opens: registrationOpens
            ? new Date(registrationOpens).toISOString()
            : null,
          registration_closes: registrationCloses
            ? new Date(registrationCloses).toISOString()
            : null,
        }),
      });

      const json: ApiResponse<Event> = await res.json();

      if (json.error) {
        toast.error(json.error.message);
        return;
      }

      setEvent(json.data);
      toast.success("บันทึกการตั้งค่าสำเร็จ");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish() {
    try {
      const res = await fetch(`/api/events/${slug}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !published }),
      });

      const json: ApiResponse<Event> = await res.json();

      if (json.error) {
        toast.error(json.error.message);
        return;
      }

      setPublished(!published);
      toast.success(!published ? "เผยแพร่งานแล้ว" : "ยกเลิกการเผยแพร่แล้ว");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
  }

  async function handleUploadQR(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/events/${slug}/payment-qr`, {
        method: "POST",
        body: formData,
      });

      const json: ApiResponse<{ url: string }> = await res.json();

      if (json.error) {
        toast.error(json.error.message);
        return;
      }

      toast.success("อัพโหลด QR สำเร็จ");
      fetchEvent();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <SettingsSkeleton />;
  }

  if (error !== null || event === null) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          {error ?? "ไม่พบข้อมูลงาน"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
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

      <h1 className="text-2xl font-bold">ตั้งค่างาน</h1>

      {/* Event info form */}
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลงาน</CardTitle>
          <CardDescription>แก้ไขชื่อและวันที่</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">ชื่องาน</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={saving}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="race-date">วันแข่ง</Label>
              <Input
                id="race-date"
                type="date"
                value={raceDate}
                onChange={(e) => setRaceDate(e.target.value)}
                required
                disabled={saving}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="reg-opens">เปิดรับสมัคร</Label>
              <Input
                id="reg-opens"
                type="datetime-local"
                value={registrationOpens}
                onChange={(e) => setRegistrationOpens(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="reg-closes">ปิดรับสมัคร</Label>
              <Input
                id="reg-closes"
                type="datetime-local"
                value={registrationCloses}
                onChange={(e) => setRegistrationCloses(e.target.value)}
                disabled={saving}
              />
            </div>

            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              บันทึก
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Publish toggle */}
      <Card>
        <CardHeader>
          <CardTitle>สถานะการเผยแพร่</CardTitle>
          <CardDescription>
            เมื่อเผยแพร่ สาธารณะจะเห็นงานและสมัครได้
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {published ? "เผยแพร่แล้ว" : "แบบร่าง"}
              </p>
              <p className="text-sm text-muted-foreground">
                {published
                  ? "หน้าลงทะเบียนและผลสดเปิดให้สาธารณะ"
                  : "เฉพาะ Admin เท่านั้นที่เห็น"}
              </p>
            </div>
            <Switch
              checked={published}
              onCheckedChange={handleTogglePublish}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Payment QR upload */}
      <Card>
        <CardHeader>
          <CardTitle>QR ชำระเงิน</CardTitle>
          <CardDescription>
            อัพโหลดรูป QR Code สำหรับชำระค่าสมัคร
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {event.payment_qr_url !== null ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={event.payment_qr_url}
                  alt="Payment QR"
                  className="max-w-[200px] rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    // Could call delete endpoint
                    toast.info("ฟีเจอร์ลบ QR จะเพิ่มภายหลัง");
                  }}
                >
                  <Trash2 className="size-3" />
                  ลบ QR
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                ยังไม่ได้อัพโหลด QR ชำระเงิน
              </p>
            )}

            <div>
              <Label
                htmlFor="qr-upload"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm transition-colors hover:bg-accent"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {uploading ? "กำลังอัพโหลด..." : "เลือกไฟล์ QR"}
              </Label>
              <Input
                id="qr-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadQR}
                disabled={uploading}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
