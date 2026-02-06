import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { penaltySchema } from "@/lib/utils/validation";
import { successResponse, errorResponse } from "@/types";

// POST /api/admin/penalty — Add time penalty (admin only)
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
    const parsed = penaltySchema.safeParse(body);
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

    // 4. Execute — insert penalty
    const serviceClient = await createServiceClient();

    const { data: penalty, error: insertError } = await serviceClient
      .from("penalties")
      .insert({
        racer_id: parsed.data.racer_id,
        seconds: parsed.data.seconds,
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
      action: "add_penalty",
      target_type: "racer",
      target_id: parsed.data.racer_id,
      old_value: null,
      new_value: { seconds: parsed.data.seconds, reason: parsed.data.reason },
      reason: parsed.data.reason,
    });

    return NextResponse.json(successResponse(penalty), { status: 201 });
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
