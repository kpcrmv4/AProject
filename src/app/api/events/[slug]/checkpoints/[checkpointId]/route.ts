import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckpointSchema } from "@/lib/utils/validation";
import { successResponse, errorResponse } from "@/types";

type RouteParams = { params: Promise<{ slug: string; checkpointId: string }> };

// PUT /api/events/[slug]/checkpoints/[checkpointId] — Update checkpoint (admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // 2. Validate input
    const body = await request.json();
    const parsed = createCheckpointSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.issues[0].message),
        { status: 400 }
      );
    }

    // 3. Authorize — check event ownership
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, admin_id")
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

    // 4. Execute update
    const { data: updated, error: updateError } = await supabase
      .from("checkpoints")
      .update({
        name: parsed.data.name,
        sort_order: parsed.data.sort_order,
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

// DELETE /api/events/[slug]/checkpoints/[checkpointId] — Delete checkpoint (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
      .select("id, admin_id")
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
        errorResponse("FORBIDDEN", "คุณไม่มีสิทธิ์ลบ Checkpoint ในงานนี้"),
        { status: 403 }
      );
    }

    // 3. Execute delete
    const { error: deleteError } = await supabase
      .from("checkpoints")
      .delete()
      .eq("id", checkpointId)
      .eq("event_id", event.id);

    if (deleteError) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", deleteError.message),
        { status: 500 }
      );
    }

    return NextResponse.json(successResponse({ deleted: true }));
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
