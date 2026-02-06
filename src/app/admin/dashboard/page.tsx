"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils/format";

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        const json: ApiResponse<Event[]> = await res.json();

        if (json.error) {
          setError(json.error.message);
          return;
        }

        setEvents(json.data);
      } catch {
        setError("ไม่สามารถโหลดข้อมูลได้");
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">แดชบอร์ด</h1>
          <p className="text-muted-foreground">จัดการงานแข่งทั้งหมดของคุณ</p>
        </div>
        <Link href="/admin/events/new">
          <Button className="gap-2">
            <Plus className="size-4" />
            สร้างงานใหม่
          </Button>
        </Link>
      </div>

      {/* Event list */}
      {loading ? (
        <DashboardSkeleton />
      ) : error !== null ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            <p>{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              ลองใหม่
            </Button>
          </CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Calendar className="size-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">ยังไม่มีงานแข่ง</p>
            <Link href="/admin/events/new">
              <Button className="gap-2">
                <Plus className="size-4" />
                สร้างงานใหม่
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/admin/events/${event.slug}`}
            >
              <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{event.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {formatDate(event.race_date)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.published ? (
                        <Badge variant="default" className="bg-emerald-600">
                          เผยแพร่แล้ว
                        </Badge>
                      ) : (
                        <Badge variant="secondary">แบบร่าง</Badge>
                      )}
                      <ChevronRight className="size-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    slug: {event.slug}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
