"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Event } from "@/types";
import type { ApiResponse } from "@/types/api";
import slugify from "slugify";

export default function NewEventPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [registrationOpens, setRegistrationOpens] = useState("");
  const [registrationCloses, setRegistrationCloses] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewSlug = name
    ? slugify(name, { lower: true, strict: true })
    : "---";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          race_date: raceDate,
          registration_opens: registrationOpens || null,
          registration_closes: registrationCloses || null,
        }),
      });

      const json: ApiResponse<Event> = await res.json();

      if (json.error) {
        setError(json.error.message);
        setLoading(false);
        return;
      }

      router.push(`/admin/events/${json.data.slug}`);
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          กลับหน้าแดชบอร์ด
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">สร้างงานแข่งใหม่</CardTitle>
          <CardDescription>
            กรอกข้อมูลเบื้องต้น สามารถแก้ไขเพิ่มเติมได้ภายหลัง
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Event name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">ชื่องาน *</Label>
              <Input
                id="name"
                type="text"
                placeholder="เช่น Enduro สนามที่ 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Slug: <code className="font-mono">{previewSlug}</code>
              </p>
            </div>

            {/* Race date */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="race_date">วันแข่ง *</Label>
              <Input
                id="race_date"
                type="date"
                value={raceDate}
                onChange={(e) => setRaceDate(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Registration opens */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="registration_opens">เปิดรับสมัคร</Label>
              <Input
                id="registration_opens"
                type="datetime-local"
                value={registrationOpens}
                onChange={(e) => setRegistrationOpens(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Registration closes */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="registration_closes">ปิดรับสมัคร</Label>
              <Input
                id="registration_closes"
                type="datetime-local"
                value={registrationCloses}
                onChange={(e) => setRegistrationCloses(e.target.value)}
                disabled={loading}
              />
            </div>

            {error !== null ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  กำลังสร้าง...
                </>
              ) : (
                "สร้างงาน"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
