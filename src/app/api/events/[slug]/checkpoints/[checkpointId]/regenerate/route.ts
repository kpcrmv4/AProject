import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAccessCode } from "@/lib/utils/format";
import { successResponse, errorResponse } from "@/types";

type RouteParams = { params: Promise<{ slug: string; checkpointId: string }> };

// POST /api/events/[slug]/checkpoints/[checkpointId]/regenerate — Regenerate access code
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug, checkpointId } = await params;
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

    // 2. Authorize — check event ownership
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, admin_id, race_date")
      .eq("slug", slug)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "ไม่พบงานแข่ง"),
        { status: 404 }
      );
    }

    if (event.admin_id !== user.id) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "คุณไม่มีสิทธิ์จัดการ Checkpoint ในงานนี้"),
        { status: 403 }
      );
    }

    // 3. Generate new code
    const newCode = generateAccessCode();
    const codeExpiresAt = `${event.race_date}T23:59:59+07:00`;

    const { data: updated, error: updateError } = await supabase
      .from("checkpoints")
      .update({
        access_code: newCode,
        code_expires_at: codeExpiresAt,
      })
      .eq("id", checkpointId)
      .eq("event_id", event.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", updateError.message),
        { status: 500 }
      );
    }

    return NextResponse.json(successResponse(updated));
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
