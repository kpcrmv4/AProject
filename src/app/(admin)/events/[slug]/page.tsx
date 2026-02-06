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
import { Separator } from "@/components/ui/separator";
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}

const NAV_LINKS = [
  { href: "classes", label: "รุ่นการแข่ง", icon: Layers, desc: "จัดการรุ่นและค่าสมัคร" },
  { href: "checkpoints", label: "Checkpoints", icon: MapPin, desc: "จุดจับเวลาและรหัสเข้าถึง" },
  { href: "class-checkpoints", label: "เส้นทางรุ่น", icon: Flag, desc: "กำหนด checkpoint ต่อรุ่น" },
  { href: "racers", label: "นักแข่ง", icon: Users, desc: "รายชื่อและยืนยันการสมัคร" },
  { href: "race-control", label: "ควบคุมการแข่ง", icon: Gamepad2, desc: "ติดตามสถานะ real-time" },
  { href: "settings", label: "ตั้งค่า", icon: Settings, desc: "แก้ไขข้อมูลงาน" },
  { href: "qr-codes", label: "QR Codes", icon: QrCode, desc: "QR สำหรับลงทะเบียนและดูผล" },
  { href: "print", label: "พิมพ์บัตร", icon: Printer, desc: "พิมพ์บัตรนักแข่ง 80mm" },
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

      {/* Event header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-muted-foreground">{formatDate(event.race_date)}</p>
        </div>
        <div className="flex items-center gap-2">
          {event.published ? (
            <Badge variant="default" className="bg-emerald-600">
              เผยแพร่แล้ว
            </Badge>
          ) : (
            <Badge variant="secondary">แบบร่าง</Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>นักแข่ง</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.racerCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>รุ่นการแข่ง</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.classCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Checkpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.checkpointCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={`/admin/events/${slug}/${link.href}`}>
            <Card className="cursor-pointer transition-colors hover:bg-accent/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <link.icon className="size-5 text-emerald-600" />
                  <CardTitle className="text-base">{link.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
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
