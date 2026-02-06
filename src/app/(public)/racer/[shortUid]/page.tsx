"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import type { ApiResponse } from "@/types/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

function RacerDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export default function RacerDetailPage() {
  const params = useParams<{ shortUid: string }>();
  const shortUid = params.shortUid;

  const [data, setData] = useState<RacerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const qrGenerated = useRef(false);

  useEffect(() => {
    async function fetchRacer() {
      try {
        const res = await fetch(`/api/racer/${shortUid}`);
        const json: ApiResponse<RacerDetail> = await res.json();

        if (json.error) {
          setError(json.error.message);
          return;
        }

        setData(json.data);
      } catch {
        setError("ไม่สามารถโหลดข้อมูลได้");
      } finally {
        setLoading(false);
      }
    }

    fetchRacer();
  }, [shortUid]);

  useEffect(() => {
    if (data && !qrGenerated.current) {
      qrGenerated.current = true;
      const url = `${window.location.origin}/racer/${shortUid}`;
      QRCode.toDataURL(url, { width: 200, margin: 2 }).then(setQrDataUrl).catch(() => {});
    }
  }, [data, shortUid]);

  function copyLink() {
    const url = `${window.location.origin}/racer/${shortUid}`;
    navigator.clipboard.writeText(url);
    toast.success("คัดลอกลิงก์แล้ว");
  }

  if (loading) {
    return <RacerDetailSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="py-8 text-center">
            <p className="text-destructive">{error ?? "ไม่พบข้อมูลนักแข่ง"}</p>
          </CardContent>
        </Card>
        <Toaster position="top-center" richColors />
      </div>
    );
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
