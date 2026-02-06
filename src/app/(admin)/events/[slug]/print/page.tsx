"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Racer, RacerClass, RaceClass } from "@/types";
import type { ApiResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Printer } from "lucide-react";
import { formatRaceNumber } from "@/lib/utils/format";

type RacerWithClasses = Racer & {
  racer_classes: (RacerClass & { class: RaceClass })[];
};

type PrintableRacer = {
  racerId: string;
  name: string;
  team: string | null;
  raceNumber: number;
  className: string;
  numberFormat: string;
};

function PrintSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}

// Racer card component for print (80mm thermal)
function RacerCard({ racer, eventName }: { racer: PrintableRacer; eventName: string }) {
  return (
    <div
      className="racer-card flex flex-col border border-black bg-white p-2"
      style={{
        width: "72mm",
        minHeight: "40mm",
        fontFamily: "'JetBrains Mono', monospace",
        pageBreakInside: "avoid",
      }}
    >
      {/* Event name */}
      <div
        className="mb-1 truncate text-center text-xs font-bold"
        style={{ fontSize: "8pt" }}
      >
        {eventName}
      </div>

      {/* Race number - BIG */}
      <div
        className="text-center font-bold leading-none"
        style={{ fontSize: "36pt" }}
      >
        {formatRaceNumber(racer.raceNumber, racer.numberFormat)}
      </div>

      {/* Racer name */}
      <div
        className="mt-1 truncate text-center font-bold"
        style={{ fontSize: "10pt" }}
      >
        {racer.name}
      </div>

      {/* Team */}
      {racer.team !== null ? (
        <div
          className="truncate text-center text-gray-600"
          style={{ fontSize: "8pt" }}
        >
          {racer.team}
        </div>
      ) : null}

      {/* Class */}
      <div
        className="mt-1 text-center font-bold"
        style={{ fontSize: "9pt" }}
      >
        {racer.className}
      </div>
    </div>
  );
}

export default function PrintPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [racers, setRacers] = useState<RacerWithClasses[]>([]);
  const [classes, setClasses] = useState<RaceClass[]>([]);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [classFilter, setClassFilter] = useState("all");
  const [confirmedOnly, setConfirmedOnly] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [eventRes, racersRes, classesRes] = await Promise.all([
        fetch(`/api/events/${slug}`),
        fetch(`/api/events/${slug}/racers`),
        fetch(`/api/events/${slug}/classes`),
      ]);

      const eventJson = await eventRes.json();
      const racersJson: ApiResponse<RacerWithClasses[]> =
        await racersRes.json();
      const classesJson: ApiResponse<RaceClass[]> = await classesRes.json();

      if (racersJson.error) {
        setError(racersJson.error.message);
        return;
      }

      setEventName(eventJson.data?.name ?? "");
      setRacers(racersJson.data);
      setClasses(classesJson.error ? [] : classesJson.data);
    } catch {
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build printable list
  const printableRacers: PrintableRacer[] = useMemo(() => {
    const result: PrintableRacer[] = [];

    for (const racer of racers) {
      for (const rc of racer.racer_classes) {
        // Class filter
        if (classFilter !== "all" && rc.class_id !== classFilter) continue;
        // Confirmed filter
        if (confirmedOnly && !rc.confirmed) continue;

        result.push({
          racerId: racer.id,
          name: racer.name,
          team: racer.team,
          raceNumber: rc.race_number,
          className: rc.class?.name ?? "N/A",
          numberFormat: rc.class?.number_format ?? "000",
        });
      }
    }

    // Sort by race number
    result.sort((a, b) => a.raceNumber - b.raceNumber);
    return result;
  }, [racers, classFilter, confirmedOnly]);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Controls - hidden when printing */}
      <div className="print:hidden">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Link
            href={`/admin/events/${slug}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            กลับหน้างาน
          </Link>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">พิมพ์บัตรนักแข่ง</h1>
            <p className="text-muted-foreground">
              พิมพ์บนกระดาษ 80mm (thermal printer)
            </p>
          </div>
          <Button
            className="gap-2"
            onClick={handlePrint}
            disabled={printableRacers.length === 0}
          >
            <Printer className="size-4" />
            พิมพ์ ({printableRacers.length} ใบ)
          </Button>
        </div>

        {/* Filters */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">ตัวกรอง</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-2">
                <Label>รุ่น</Label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="ทุกรุ่น" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกรุ่น</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="confirmed-only"
                  checked={confirmedOnly}
                  onCheckedChange={(checked) =>
                    setConfirmedOnly(checked === true)
                  }
                />
                <Label htmlFor="confirmed-only">
                  เฉพาะที่ยืนยันแล้ว
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print preview / print area */}
      {loading ? (
        <div className="print:hidden">
          <PrintSkeleton />
        </div>
      ) : error !== null ? (
        <div className="print:hidden">
          <Card>
            <CardContent className="py-8 text-center text-destructive">
              {error}
            </CardContent>
          </Card>
        </div>
      ) : printableRacers.length === 0 ? (
        <div className="print:hidden">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              ไม่มีนักแข่งตามเงื่อนไขที่เลือก
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-4 print:block print:gap-0">
          {printableRacers.map((racer, index) => (
            <div
              key={`${racer.racerId}-${racer.raceNumber}-${index}`}
              className="print:mb-1"
              style={{ pageBreakAfter: "auto" }}
            >
              <RacerCard racer={racer} eventName={eventName} />
            </div>
          ))}
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .racer-card,
          .racer-card * {
            visibility: visible;
          }
          @page {
            size: 80mm auto;
            margin: 2mm;
          }
        }
      `}</style>
    </div>
  );
}
