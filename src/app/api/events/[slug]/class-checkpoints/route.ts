import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/types";
import { z } from "zod";

type RouteParams = { params: Promise<{ slug: string }> };

const setClassCheckpointsSchema = z.object({
  class_id: z.string().uuid("class_id ต้องเป็น UUID"),
  checkpoint_ids: z.array(z.string().uuid("checkpoint_id ต้องเป็น UUID")),
});

// GET /api/events/[slug]/class-checkpoints — List mappings
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    // Resolve event by slug
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("slug", slug)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "ไม่พบงานแข่ง"),
        { status: 404 }
      );
    }

    // Get all checkpoints for this event to filter class_checkpoints
    const { data: checkpoints, error: cpError } = await supabase
      .from("checkpoints")
      .select("id")
      .eq("event_id", event.id);

    if (cpError) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", cpError.message),
        { status: 500 }
      );
    }

    const checkpointIds = (checkpoints ?? []).map((cp) => cp.id);

    if (checkpointIds.length === 0) {
      return NextResponse.json(successResponse([]));
    }

    const { data: mappings, error } = await supabase
      .from("class_checkpoints")
      .select("*")
      .in("checkpoint_id", checkpointIds);

    if (error) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", error.message),
        { status: 500 }
      );
    }

    return NextResponse.json(successResponse(mappings));
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}

// POST /api/events/[slug]/class-checkpoints — Set mappings (admin only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
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
    const parsed = setClassCheckpointsSchema.safeParse(body);
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
        errorResponse("FORBIDDEN", "คุณไม่มีสิทธิ์จัดการงานนี้"),
        { status: 403 }
      );
    }

    // 4. Execute — delete old mappings for this class, then insert new ones
    const { error: deleteError } = await supabase
      .from("class_checkpoints")
      .delete()
      .eq("class_id", parsed.data.class_id);

    if (deleteError) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", deleteError.message),
        { status: 500 }
      );
    }

    if (parsed.data.checkpoint_ids.length > 0) {
      const rows = parsed.data.checkpoint_ids.map((checkpoint_id) => ({
        class_id: parsed.data.class_id,
        checkpoint_id,
      }));

      const { error: insertError } = await supabase
        .from("class_checkpoints")
        .insert(rows);

      if (insertError) {
        return NextResponse.json(
          errorResponse("INTERNAL_ERROR", insertError.message),
          { status: 500 }
        );
      }
    }

    // Return the new mappings
    const { data: mappings, error: fetchError } = await supabase
      .from("class_checkpoints")
      .select("*")
      .eq("class_id", parsed.data.class_id);

    if (fetchError) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", fetchError.message),
        { status: 500 }
      );
    }

    return NextResponse.json(successResponse(mappings), { status: 201 });
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
