"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import type { ApiResponse } from "@/types/api";
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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Timer,
  Calendar,
  User,
  Bike,
  Users,
  Phone,
  Copy,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
} from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import { toast } from "sonner";
import { Toaster } from "sonner";
import QRCode from "qrcode";

type RacerDetail = {
  racer: {
    id: string;
    name: string;
    team: string | null;
    bike: string | null;
    phone: string | null;
    photo_url: string | null;
    short_uid: string;
    created_at: string;
  };
  racer_classes: {
    id: string;
    race_number: number;
    confirmed: boolean;
    payment_slip_url: string | null;
    classes: {
      id: string;
      name: string;
      fee: number;
    };
  }[];
  event: {
    name: string;
    slug: string;
    race_date: string;
  };
};

// --- Phone verification gate ---

function PhoneVerificationForm({
  onVerified,
}: {
  onVerified: (data: RacerDetail) => void;
}) {
  const params = useParams<{ shortUid: string }>();
  const shortUid = params.shortUid;

  const [phoneLast4, setPhoneLast4] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\d{4}$/.test(phoneLast4)) {
      setError("กรุณากรอกตัวเลข 4 หลัก");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `/api/racer/${shortUid}?phone_last4=${phoneLast4}`
      );
      const json: ApiResponse<RacerDetail> = await res.json();

      if (json.error) {
        setError(json.error.message);
        return;
      }

      onVerified(json.data);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
            <Lock className="size-6 text-muted-foreground" />
          </div>
          <CardTitle>ยืนยันตัวตน</CardTitle>
          <CardDescription>
            กรอกเบอร์โทร 4 หลักสุดท้ายที่ใช้สมัคร
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone-last4">เบอร์โทร 4 หลักสุดท้าย</Label>
              <Input
                id="phone-last4"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="xxxx"
                value={phoneLast4}
                onChange={(e) =>
                  setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                className="text-center text-2xl tracking-[0.5em] font-mono"
                disabled={loading}
                autoFocus
              />
            </div>

            {error !== null && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || phoneLast4.length !== 4}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  กำลังตรวจสอบ...
                </>
              ) : (
                "ยืนยัน"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Toaster position="top-center" richColors />
    </div>
  );
}

// --- Racer detail view ---

function RacerDetailView({ data }: { data: RacerDetail }) {
  const params = useParams<{ shortUid: string }>();
  const shortUid = params.shortUid;

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const qrGenerated = useRef(false);

  useEffect(() => {
    if (!qrGenerated.current) {
      qrGenerated.current = true;
      const url = `${window.location.origin}/racer/${shortUid}`;
      QRCode.toDataURL(url, { width: 200, margin: 2 })
        .then(setQrDataUrl)
        .catch(() => {});
    }
  }, [shortUid]);

  function copyLink() {
    const url = `${window.location.origin}/racer/${shortUid}`;
    navigator.clipboard.writeText(url);
    toast.success("คัดลอกลิงก์แล้ว");
  }

  const { racer, racer_classes, event } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Event header */}
      <header className="border-b bg-card px-4 py-4">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <Timer className="size-6 text-emerald-600" />
          <div>
            <h1 className="font-bold">{event.name}</h1>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="size-3" />
              {formatDate(event.race_date)}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">
        <div className="flex flex-col gap-4">
          {/* Racer info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">ข้อมูลนักแข่ง</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {racer.photo_url && (
                <div className="flex justify-center">
                  <img
                    src={racer.photo_url}
                    alt={racer.name}
                    className="h-40 w-40 rounded-lg border object-cover"
                  />
                </div>
              )}

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <User className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">ชื่อ</p>
                    <p className="font-medium">{racer.name}</p>
                  </div>
                </div>

                {racer.team && (
                  <div className="flex items-center gap-3">
                    <Users className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">ทีม</p>
                      <p className="font-medium">{racer.team}</p>
                    </div>
                  </div>
                )}

                {racer.bike && (
                  <div className="flex items-center gap-3">
                    <Bike className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">รถ</p>
                      <p className="font-medium">{racer.bike}</p>
                    </div>
                  </div>
                )}

                {racer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">เบอร์โทร</p>
                      <p className="font-medium">{racer.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Race classes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">รุ่นที่สมัคร</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {racer_classes.map((rc) => (
                <div
                  key={rc.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{rc.classes.name}</p>
                    <p className="text-sm text-muted-foreground">
                      เบอร์{" "}
                      <span className="font-mono font-bold">
                        {rc.race_number}
                      </span>
                    </p>
                  </div>
                  <div>
                    {rc.confirmed ? (
                      <Badge
                        variant="default"
                        className="gap-1 bg-emerald-600"
                      >
                        <CheckCircle2 className="size-3" />
                        ยืนยันแล้ว
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="size-3" />
                        รอยืนยัน
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* QR Code + Link */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">ลิงก์นักแข่ง</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="rounded-lg border"
                />
              )}

              <Separator />

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={copyLink}
              >
                <Copy className="size-4" />
                คัดลอกลิงก์
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}

// --- Main page (gate) ---

export default function RacerDetailPage() {
  const [data, setData] = useState<RacerDetail | null>(null);

  if (!data) {
    return <PhoneVerificationForm onVerified={setData} />;
  }

  return <RacerDetailView data={data} />;
}
