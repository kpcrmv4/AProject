import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { staffAuthSchema } from "@/lib/utils/validation";
import { successResponse, errorResponse } from "@/types";

// POST /api/staff/auth — Validate 4-digit staff code
export async function POST(request: NextRequest) {
  try {
    // 1. Validate input
    const body = await request.json();
    const parsed = staffAuthSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.issues[0].message),
        { status: 400 }
      );
    }

    // 2. Use service role client (bypass RLS)
    const supabase = await createServiceClient();

    // 3. Check against checkpoints table
    const { data: checkpoint, error } = await supabase
      .from("checkpoints")
      .select("*, events(id, name, slug, race_date)")
      .eq("access_code", parsed.data.code)
      .gte("code_expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", error.message),
        { status: 500 }
      );
    }

    if (!checkpoint) {
      return NextResponse.json(
        errorResponse("UNAUTHORIZED", "รหัสไม่ถูกต้องหรือหมดอายุแล้ว"),
        { status: 401 }
      );
    }

    return NextResponse.json(
      successResponse({
        checkpoint_id: checkpoint.id,
        checkpoint_name: checkpoint.name,
        event: checkpoint.events,
      })
    );
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
