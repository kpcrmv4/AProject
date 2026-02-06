import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { dnfSchema } from "@/lib/utils/validation";
import { successResponse, errorResponse } from "@/types";

// POST /api/admin/dnf — Mark racer as DNF (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        errorResponse("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ"),
        { status: 401 }
      );
    }

    // 2. Validate input
    const body = await request.json();
    const parsed = dnfSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.issues[0].message),
        { status: 400 }
      );
    }

    // 3. Authorize — check that the racer belongs to an event the admin owns
    const { data: racer, error: racerError } = await supabase
      .from("racers")
      .select("id, event_id, events!inner(admin_id)")
      .eq("id", parsed.data.racer_id)
      .single();

    if (racerError || !racer) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "ไม่พบนักแข่ง"),
        { status: 404 }
      );
    }

    const eventAdminId = (racer.events as { admin_id: string }).admin_id;
    if (eventAdminId !== user.id) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "คุณไม่มีสิทธิ์จัดการนักแข่งคนนี้"),
        { status: 403 }
      );
    }

    // 4. Execute — insert dnf_record
    const serviceClient = await createServiceClient();

    const { data: dnfRecord, error: insertError } = await serviceClient
      .from("dnf_records")
      .insert({
        racer_id: parsed.data.racer_id,
        checkpoint_id: parsed.data.checkpoint_id ?? null,
        reason: parsed.data.reason,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", insertError.message),
        { status: 500 }
      );
    }

    // 5. Create audit_log entry
    await serviceClient.from("audit_logs").insert({
      event_id: racer.event_id,
      admin_id: user.id,
      action: "mark_dnf",
      target_type: "racer",
      target_id: parsed.data.racer_id,
      old_value: null,
      new_value: { reason: parsed.data.reason, checkpoint_id: parsed.data.checkpoint_id ?? null },
      reason: parsed.data.reason,
    });

    return NextResponse.json(successResponse(dnfRecord), { status: 201 });
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
