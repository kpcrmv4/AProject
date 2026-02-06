import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Timer, Users, QrCode, BarChart3 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Hero */}
      <header className="flex flex-col items-center gap-6 px-4 py-16 text-center sm:py-24">
        <div className="flex items-center gap-3">
          <Timer className="size-10 text-emerald-600" />
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            EnduroRaceManager
          </h1>
        </div>
        <p className="max-w-xl text-lg text-muted-foreground">
          ระบบจัดการแข่ง Enduro แบบครบวงจร จับเวลา Real-time,
          ลงทะเบียนออนไลน์, และดูผลสดผ่าน QR Code
        </p>
        <div className="flex gap-4">
          <Link href="/login">
            <Button size="lg" className="gap-2">
              เข้าสู่ระบบผู้จัด
            </Button>
          </Link>
        </div>
      </header>

      {/* Features */}
      <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <Timer className="mb-2 size-8 text-emerald-600" />
            <CardTitle className="text-lg">จับเวลา Real-time</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Staff กดบันทึกเวลาด้วยรหัส 4 หลัก ผลอัพเดทภายใน 2 วินาที
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <Users className="mb-2 size-8 text-blue-600" />
            <CardTitle className="text-lg">ลงทะเบียนออนไลน์</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              สมัครหลายรุ่นครั้งเดียว คำนวณยอดอัตโนมัติ อัพโหลดสลิป
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <QrCode className="mb-2 size-8 text-purple-600" />
            <CardTitle className="text-lg">QR-First Access</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              ทุก entry point มี QR code สแกนเข้าลงทะเบียนและดูผลได้ทันที
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <BarChart3 className="mb-2 size-8 text-orange-600" />
            <CardTitle className="text-lg">ผลแข่งสด</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Leaderboard อัพเดทอัตโนมัติ กรองตามรุ่น พร้อม Audit Trail
            </CardDescription>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t py-6 text-center text-sm text-muted-foreground">
        <p>EnduroRaceManager v2.0 &mdash; สร้างโดย ครูA</p>
      </footer>
    </div>
  );
}
