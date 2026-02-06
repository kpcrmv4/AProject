"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Event } from "@/types";
import type { ApiResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Users,
  Flag,
  MapPin,
  Settings,
  QrCode,
  Printer,
  Gamepad2,
  Layers,
  ClipboardCheck,
  Calendar,
} from "lucide-react";
import { formatDate } from "@/lib/utils/format";

type EventStats = {
  racerCount: number;
  classCount: number;
  checkpointCount: number;
};

function EventDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}

const NAV_LINKS = [
  { href: "classes", label: "รุ่นการแข่ง", icon: Layers, desc: "จัดการรุ่นและค่าสมัคร", color: "text-blue-500", bg: "bg-blue-500/10" },
  { href: "checkpoints", label: "Checkpoints", icon: MapPin, desc: "จุดจับเวลาและรหัสเข้าถึง", color: "text-rose-500", bg: "bg-rose-500/10" },
  { href: "class-checkpoints", label: "เส้นทางรุ่น", icon: Flag, desc: "กำหนด checkpoint ต่อรุ่น", color: "text-amber-500", bg: "bg-amber-500/10" },
  { href: "racers", label: "นักแข่ง", icon: Users, desc: "รายชื่อและยืนยันการสมัคร", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { href: "approvals", label: "อนุมัติสมัคร", icon: ClipboardCheck, desc: "ตรวจสลิปและยืนยันการสมัคร", color: "text-violet-500", bg: "bg-violet-500/10" },
  { href: "race-control", label: "ควบคุมการแข่ง", icon: Gamepad2, desc: "ติดตามสถานะ real-time", color: "text-orange-500", bg: "bg-orange-500/10" },
  { href: "settings", label: "ตั้งค่า", icon: Settings, desc: "แก้ไขข้อมูลงาน", color: "text-slate-500", bg: "bg-slate-500/10" },
  { href: "qr-codes", label: "QR Codes", icon: QrCode, desc: "QR สำหรับลงทะเบียนและดูผล", color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { href: "print", label: "พิมพ์บัตร", icon: Printer, desc: "พิมพ์บัตรนักแข่ง 80mm", color: "text-pink-500", bg: "bg-pink-500/10" },
];

export default function EventDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<EventStats>({
    racerCount: 0,
    classCount: 0,
    checkpointCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${slug}`);
        const json: ApiResponse<Event> = await res.json();

        if (json.error) {
          setError(json.error.message);
          setLoading(false);
          return;
        }

        setEvent(json.data);

        // Fetch stats in parallel
        const [classesRes, checkpointsRes, racersRes] = await Promise.all([
          fetch(`/api/events/${slug}/classes`).catch(() => null),
          fetch(`/api/events/${slug}/checkpoints`).catch(() => null),
          fetch(`/api/events/${slug}/racers`).catch(() => null),
        ]);

        const classesJson = classesRes
          ? await classesRes.json().catch(() => ({ data: [] }))
          : { data: [] };
        const checkpointsJson = checkpointsRes
          ? await checkpointsRes.json().catch(() => ({ data: [] }))
          : { data: [] };
        const racersJson = racersRes
          ? await racersRes.json().catch(() => ({ data: [] }))
          : { data: [] };

        setStats({
          classCount: Array.isArray(classesJson.data)
            ? classesJson.data.length
            : 0,
          checkpointCount: Array.isArray(checkpointsJson.data)
            ? checkpointsJson.data.length
            : 0,
          racerCount: Array.isArray(racersJson.data)
            ? racersJson.data.length
            : 0,
        });
      } catch {
        setError("ไม่สามารถโหลดข้อมูลได้");
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [slug]);

  if (loading) {
    return <EventDetailSkeleton />;
  }

  if (error !== null || event === null) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          <p>{error ?? "ไม่พบข้อมูลงานแข่ง"}</p>
          <Link href="/admin/dashboard">
            <Button variant="outline" className="mt-4">
              กลับหน้าแดชบอร์ด
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          กลับหน้าแดชบอร์ด
        </Link>
      </div>

      {/* Event header card */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 dark:border-emerald-900 dark:from-emerald-950/50 dark:to-teal-950/50">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Calendar className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">{event.name}</h1>
              <p className="text-sm text-muted-foreground">
                {formatDate(event.race_date)}
              </p>
            </div>
          </div>
          <div>
            {event.published ? (
              <Badge variant="default" className="bg-emerald-600">
                เผยแพร่แล้ว
              </Badge>
            ) : (
              <Badge variant="secondary">แบบร่าง</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-emerald-200 dark:border-emerald-900">
          <CardContent className="flex flex-col items-center py-4">
            <p className="text-3xl font-bold text-emerald-600">
              {stats.racerCount}
            </p>
            <p className="text-xs text-muted-foreground">นักแข่ง</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-900">
          <CardContent className="flex flex-col items-center py-4">
            <p className="text-3xl font-bold text-blue-600">
              {stats.classCount}
            </p>
            <p className="text-xs text-muted-foreground">รุ่นการแข่ง</p>
          </CardContent>
        </Card>
        <Card className="border-rose-200 dark:border-rose-900">
          <CardContent className="flex flex-col items-center py-4">
            <p className="text-3xl font-bold text-rose-600">
              {stats.checkpointCount}
            </p>
            <p className="text-xs text-muted-foreground">Checkpoints</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation grid — 2 cols on mobile, 3 on lg */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={`/admin/events/${slug}/${link.href}`}>
            <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5">
              <CardContent className="flex flex-col items-center gap-2 py-5 text-center">
                <div
                  className={`flex size-10 items-center justify-center rounded-xl ${link.bg}`}
                >
                  <link.icon className={`size-5 ${link.color}`} />
                </div>
                <CardTitle className="text-sm">{link.label}</CardTitle>
                <CardDescription className="text-[11px] leading-tight">
                  {link.desc}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
