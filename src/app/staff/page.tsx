"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NumberPad } from "@/components/custom/NumberPad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "sonner";

export default function StaffAccessPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [validating, setValidating] = useState(false);

  async function handleSubmit(value: string) {
    if (value.length !== 4) {
      toast.error("รหัสต้องเป็นตัวเลข 4 หลัก");
      return;
    }

    setValidating(true);

    try {
      const res = await fetch(`/api/staff/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });

      const json = await res.json();

      if (json.error) {
        toast.error(json.error.message ?? "รหัสไม่ถูกต้องหรือหมดอายุ");
        setCode("");
        setValidating(false);
        return;
      }

      // Valid code, redirect to staff checkpoint interface
      router.push(`/staff/${value}`);
    } catch {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
      setCode("");
      setValidating(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex items-center gap-2">
            <Timer className="size-8 text-emerald-600" />
            <span className="text-xl font-bold">Staff</span>
          </div>
          <CardTitle className="text-2xl">เข้าสู่ระบบ Staff</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            กรอกรหัส 4 หลักที่ได้รับจากผู้จัด
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            Checkpoint Access
          </Badge>

          <NumberPad
            value={code}
            onChange={setCode}
            onSubmit={handleSubmit}
            disabled={validating}
            maxLength={4}
          />

          {validating ? (
            <p className="text-sm text-muted-foreground animate-pulse">
              กำลังตรวจสอบรหัส...
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Toaster position="top-center" richColors />
    </div>
  );
}
