import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/types";

type RouteParams = { params: Promise<{ slug: string }> };

// GET /api/admin/race-control/[slug] — Get all race control data for an event
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // 2. Authorize — check event ownership
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
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
        errorResponse("FORBIDDEN", "คุณไม่มีสิทธิ์เข้าถึงงานนี้"),
        { status: 403 }
      );
    }

    // 3. Fetch all race control data in parallel (Promise.all)
    const [
      { data: racers, error: racersError },
      { data: timestamps, error: tsError },
      { data: dnfRecords, error: dnfError },
      { data: penalties, error: penError },
      { data: classes, error: classError },
      { data: checkpoints, error: cpError },
    ] = await Promise.all([
      supabase
        .from("racers")
        .select("*, racer_classes(*, classes(*))")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("timestamps")
        .select("*, checkpoints!inner(event_id)")
        .eq("checkpoints.event_id", event.id)
        .order("recorded_at", { ascending: true }),
      supabase
        .from("dnf_records")
        .select("*, racers!inner(event_id)")
        .eq("racers.event_id", event.id),
      supabase
        .from("penalties")
        .select("*, racers!inner(event_id)")
        .eq("racers.event_id", event.id),
      supabase
        .from("classes")
        .select("*")
        .eq("event_id", event.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("checkpoints")
        .select("*")
        .eq("event_id", event.id)
        .order("sort_order", { ascending: true }),
    ]);

    if (racersError || tsError || dnfError || penError || classError || cpError) {
      const firstError =
        racersError || tsError || dnfError || penError || classError || cpError;
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", firstError!.message),
        { status: 500 }
      );
    }

    return NextResponse.json(
      successResponse({
        event,
        racers: racers ?? [],
        timestamps: timestamps ?? [],
        dnf_records: dnfRecords ?? [],
        penalties: penalties ?? [],
        classes: classes ?? [],
        checkpoints: checkpoints ?? [],
      })
    );
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
