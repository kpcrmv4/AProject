import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/types";

type RouteParams = { params: Promise<{ slug: string; racerClassId: string }> };

// PATCH /api/events/[slug]/racer-classes/[racerClassId] — Confirm/unconfirm registration (admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug, racerClassId } = await params;
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
    const confirmed = body.confirmed;
    if (typeof confirmed !== "boolean") {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "confirmed ต้องเป็น boolean"),
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
        errorResponse("FORBIDDEN", "คุณไม่มีสิทธิ์จัดการงานนี้"),
        { status: 403 }
      );
    }

    // 4. Verify racer_class belongs to this event
    const { data: racerClass, error: rcError } = await supabase
      .from("racer_classes")
      .select("id, racer_id, racers!inner(event_id, short_uid)")
      .eq("id", racerClassId)
      .single();

    if (rcError || !racerClass) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "ไม่พบข้อมูลการสมัคร"),
        { status: 404 }
      );
    }

    const racerData = racerClass.racers as { event_id: string; short_uid: string | null };
    if (racerData.event_id !== event.id) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "ข้อมูลไม่ตรงกับงานนี้"),
        { status: 403 }
      );
    }

    // 5. Update confirmed status
    const { data: updated, error: updateError } = await supabase
      .from("racer_classes")
      .update({ confirmed })
      .eq("id", racerClassId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", updateError.message),
        { status: 500 }
      );
    }

    // 6. Generate short_uid for the racer if confirming and not yet assigned
    let shortUid = racerData.short_uid;
    if (confirmed && !shortUid) {
      const serviceClient = await createServiceClient();
      const { data: uid, error: uidError } = await serviceClient.rpc(
        "generate_short_uid"
      );

      if (!uidError && uid) {
        shortUid = uid as string;
        await serviceClient
          .from("racers")
          .update({ short_uid: shortUid })
          .eq("id", racerClass.racer_id);
      }
    }

    return NextResponse.json(
      successResponse({ ...updated, short_uid: shortUid })
    );
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
