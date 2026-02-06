import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { editTimestampSchema } from "@/lib/utils/validation";
import { successResponse, errorResponse } from "@/types";

type RouteParams = { params: Promise<{ id: string }> };

// PUT /api/admin/timestamp/[id] — Edit timestamp (admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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
    const parsed = editTimestampSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.issues[0].message),
        { status: 400 }
      );
    }

    // 3. Get the existing timestamp and authorize
    const { data: timestamp, error: tsError } = await supabase
      .from("timestamps")
      .select("*, checkpoints!inner(event_id, events!inner(admin_id))")
      .eq("id", id)
      .single();

    if (tsError || !timestamp) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "ไม่พบ Timestamp"),
        { status: 404 }
      );
    }

    const checkpoint = timestamp.checkpoints as {
      event_id: string;
      events: { admin_id: string };
    };
    if (checkpoint.events.admin_id !== user.id) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "คุณไม่มีสิทธิ์แก้ไข Timestamp นี้"),
        { status: 403 }
      );
    }

    // 4. Execute — update timestamp
    const oldValue = timestamp.recorded_at;
    const serviceClient = await createServiceClient();

    const { data: updated, error: updateError } = await serviceClient
      .from("timestamps")
      .update({ recorded_at: parsed.data.recorded_at })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", updateError.message),
        { status: 500 }
      );
    }

    // 5. Create audit_log with old_value and new_value
    await serviceClient.from("audit_logs").insert({
      event_id: checkpoint.event_id,
      admin_id: user.id,
      action: "edit_timestamp",
      target_type: "timestamp",
      target_id: id,
      old_value: { recorded_at: oldValue },
      new_value: { recorded_at: parsed.data.recorded_at },
      reason: parsed.data.reason,
    });

    return NextResponse.json(successResponse(updated));
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
