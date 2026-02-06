"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Event } from "@/types";
import type { ApiResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";

// Lazy load QR code generation (Rule 18.2)
const QRCodeCanvas = dynamic(
  () => import("qrcode").then(() => ({ default: QRRenderer })),
  {
    ssr: false,
    loading: () => <Skeleton className="size-48" />,
  }
);

function QRRenderer({
  value,
  canvasRef,
}: {
  value: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  useEffect(() => {
    async function renderQR() {
      const QRCode = await import("qrcode");
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, value, {
          width: 256,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
      }
    }
    renderQR();
  }, [value, canvasRef]);

  return <canvas ref={canvasRef} className="rounded-lg" />;
}

type QRCardProps = {
  title: string;
  description: string;
  url: string;
};

function QRCard({ title, description, url }: QRCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error("ไม่สามารถดาวน์โหลดได้");
      return;
    }

    const link = document.createElement("a");
    link.download = `${title.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("ดาวน์โหลด QR สำเร็จ");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <QRCodeCanvas value={url} canvasRef={canvasRef} />
        <p className="break-all text-center text-xs text-muted-foreground">
          {url}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload}>
            <Download className="size-4" />
            ดาวน์โหลด PNG
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                toast.success("คัดลอก URL แล้ว");
              } catch {
                toast.error("ไม่สามารถคัดลอกได้");
              }
            }}
          >
            คัดลอก URL
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QRCodesSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <Skeleton className="size-48" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <Skeleton className="size-48" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function QRCodesPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${slug}`);
      const json: ApiResponse<Event> = await res.json();

      if (json.error) {
        setError(json.error.message);
        return;
      }

      setEvent(json.data);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";

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

      <div>
        <h1 className="text-2xl font-bold">QR Codes</h1>
        <p className="text-muted-foreground">
          QR Code สำหรับลงทะเบียนและดูผลแข่ง
        </p>
      </div>

      {loading ? (
        <QRCodesSkeleton />
      ) : error !== null || event === null ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            {error ?? "ไม่พบข้อมูลงาน"}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <QRCard
            title="หน้าลงทะเบียน"
            description="สแกนเพื่อเข้าหน้าสมัครแข่ง"
            url={`${baseUrl}/${slug}`}
          />
          <QRCard
            title="ผลแข่งสด"
            description="สแกนเพื่อดูผลแข่ง real-time"
            url={`${baseUrl}/${slug}/results`}
          />
        </div>
      )}
    </div>
  );
}
