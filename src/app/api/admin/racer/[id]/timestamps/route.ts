import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/types";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/admin/racer/[id]/timestamps — Get all timestamps + audit logs for a specific racer
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: racerId } = await params;
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

    // 2. Get racer and authorize — check event ownership
    const { data: racer, error: racerError } = await supabase
      .from("racers")
      .select("*, events!inner(admin_id)")
      .eq("id", racerId)
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
        errorResponse("FORBIDDEN", "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนักแข่งคนนี้"),
        { status: 403 }
      );
    }

    // 3. Fetch timestamps and audit logs in parallel
    const [
      { data: timestamps, error: tsError },
      { data: auditLogs, error: auditError },
    ] = await Promise.all([
      supabase
        .from("timestamps")
        .select("*, checkpoints(id, name, sort_order)")
        .eq("racer_id", racerId)
        .order("recorded_at", { ascending: true }),
      supabase
        .from("audit_logs")
        .select("*")
        .eq("target_id", racerId)
        .order("created_at", { ascending: false }),
    ]);

    if (tsError || auditError) {
      const firstError = tsError || auditError;
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", firstError!.message),
        { status: 500 }
      );
    }

    return NextResponse.json(
      successResponse({
        racer: {
          id: racer.id,
          name: racer.name,
          event_id: racer.event_id,
        },
        timestamps: timestamps ?? [],
        audit_logs: auditLogs ?? [],
      })
    );
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
