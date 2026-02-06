import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/types";
import { calculateRankings } from "@/lib/utils/calculate";

type RouteParams = { params: Promise<{ slug: string }> };

// GET /api/results/[slug] — Public results
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const classIdFilter = searchParams.get("class_id");

    // Resolve event by slug (must be published for public access)
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name, slug, race_date, published")
      .eq("slug", slug)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "ไม่พบงานแข่ง"),
        { status: 404 }
      );
    }

    if (!event.published) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "ไม่พบงานแข่ง"),
        { status: 404 }
      );
    }

    // Parallel fetch all needed data (Rule 18.1)
    const [
      { data: racerClasses, error: rcError },
      { data: timestamps, error: tsError },
      { data: penalties, error: penError },
      { data: dnfRecords, error: dnfError },
      { data: checkpoints, error: cpError },
    ] = await Promise.all([
      supabase
        .from("racer_classes")
        .select("*, racers!inner(id, name, team, event_id), classes!inner(id, name)")
        .eq("racers.event_id", event.id),
      supabase
        .from("timestamps")
        .select("*, checkpoints!inner(event_id)")
        .eq("checkpoints.event_id", event.id),
      supabase
        .from("penalties")
        .select("*, racers!inner(event_id)")
        .eq("racers.event_id", event.id),
      supabase
        .from("dnf_records")
        .select("*, racers!inner(event_id)")
        .eq("racers.event_id", event.id),
      supabase
        .from("checkpoints")
        .select("id, name, sort_order")
        .eq("event_id", event.id)
        .order("sort_order", { ascending: true }),
    ]);

    if (rcError || tsError || penError || dnfError || cpError) {
      const firstError = rcError || tsError || penError || dnfError || cpError;
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", firstError!.message),
        { status: 500 }
      );
    }

    // Transform racer_classes into the format needed by calculateRankings
    const racers = (racerClasses ?? []).map((rc) => ({
      id: (rc.racers as { id: string; name: string; team: string | null; event_id: string }).id,
      name: (rc.racers as { id: string; name: string; team: string | null; event_id: string }).name,
      race_number: rc.race_number,
      team: (rc.racers as { id: string; name: string; team: string | null; event_id: string }).team,
      class_id: (rc.classes as { id: string; name: string }).id,
      class_name: (rc.classes as { id: string; name: string }).name,
    }));

    // Transform timestamps
    const cleanTimestamps = (timestamps ?? []).map((ts) => ({
      id: ts.id,
      checkpoint_id: ts.checkpoint_id,
      racer_id: ts.racer_id,
      recorded_at: ts.recorded_at,
      recorded_by: ts.recorded_by,
      created_at: ts.created_at,
    }));

    // Transform penalties
    const cleanPenalties = (penalties ?? []).map((p) => ({
      id: p.id,
      racer_id: p.racer_id,
      seconds: p.seconds,
      reason: p.reason,
      created_by: p.created_by,
      created_at: p.created_at,
    }));

    // Transform dnf_records
    const cleanDnfRecords = (dnfRecords ?? []).map((d) => ({
      id: d.id,
      racer_id: d.racer_id,
      checkpoint_id: d.checkpoint_id,
      reason: d.reason,
      created_by: d.created_by,
      created_at: d.created_at,
    }));

    // Checkpoint order
    const checkpointOrder = (checkpoints ?? []).map((cp) => ({
      id: cp.id,
      name: cp.name,
    }));

    // Calculate rankings
    let rankings = calculateRankings(
      racers,
      cleanTimestamps,
      cleanPenalties,
      cleanDnfRecords,
      checkpointOrder
    );

    // Optionally filter by class_id
    if (classIdFilter) {
      rankings = rankings.filter((r) => r.class_id === classIdFilter);
    }

    return NextResponse.json(
      successResponse({
        event: {
          id: event.id,
          name: event.name,
          slug: event.slug,
          race_date: event.race_date,
        },
        checkpoints: checkpointOrder,
        rankings,
      })
    );
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
