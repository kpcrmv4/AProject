import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckpointSchema } from "@/lib/utils/validation";
import { generateAccessCode } from "@/lib/utils/format";
import { successResponse, errorResponse } from "@/types";

type RouteParams = { params: Promise<{ slug: string }> };

// GET /api/events/[slug]/checkpoints — List checkpoints for event
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

    const { data: checkpoints, error } = await supabase
      .from("checkpoints")
      .select("*")
      .eq("event_id", event.id)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", error.message),
        { status: 500 }
      );
    }

    return NextResponse.json(successResponse(checkpoints));
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}

// POST /api/events/[slug]/checkpoints — Create checkpoint (admin only)
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

    // 4. Execute — auto-generate 4-digit access code, expires end of race day
    const accessCode = generateAccessCode();
    const codeExpiresAt = `${event.race_date}T23:59:59`;

    const { data: checkpoint, error: insertError } = await supabase
      .from("checkpoints")
      .insert({
        event_id: event.id,
        name: parsed.data.name,
        sort_order: parsed.data.sort_order,
        access_code: accessCode,
        code_expires_at: codeExpiresAt,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", insertError.message),
        { status: 500 }
      );
    }

    return NextResponse.json(successResponse(checkpoint), { status: 201 });
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
