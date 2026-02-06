import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { registrationSchema } from "@/lib/utils/validation";
import { successResponse, errorResponse } from "@/types";

type RouteParams = { params: Promise<{ slug: string }> };

// GET /api/events/[slug]/racers — List racers for event (with their classes)
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

    const { data: racers, error } = await supabase
      .from("racers")
      .select("*, racer_classes(*, classes(*))")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", error.message),
        { status: 500 }
      );
    }

    return NextResponse.json(successResponse(racers));
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}

// POST /api/events/[slug]/racers — Register racer (public, event must be published + registration open)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    // 1. Validate input
    const body = await request.json();
    const parsed = registrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.issues[0].message),
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 2. Check event exists, is published, and registration is open
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

    if (!event.published) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "งานนี้ยังไม่เปิดรับสมัคร"),
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    if (event.registration_opens && now < event.registration_opens) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "ยังไม่ถึงช่วงเปิดรับสมัคร"),
        { status: 403 }
      );
    }
    if (event.registration_closes && now > event.registration_closes) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "ปิดรับสมัครแล้ว"),
        { status: 403 }
      );
    }

    // 3. Use service client for transaction-like operations (bypass RLS for rpc)
    const serviceClient = await createServiceClient();

    // 4. Create racer
    const { data: racer, error: racerError } = await serviceClient
      .from("racers")
      .insert({
        event_id: event.id,
        name: parsed.data.name,
        team: parsed.data.team ?? null,
        bike: parsed.data.bike ?? null,
        phone: parsed.data.phone ?? null,
      })
      .select()
      .single();

    if (racerError) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", racerError.message),
        { status: 500 }
      );
    }

    // 5. Create racer_classes with auto-assigned race numbers
    const racerClassRows = [];
    for (const classId of parsed.data.class_ids) {
      // Call database function to get next race number
      const { data: raceNumber, error: rpcError } = await serviceClient
        .rpc("get_next_race_number", { p_class_id: classId });

      if (rpcError) {
        // Cleanup: delete the racer we just created
        await serviceClient.from("racers").delete().eq("id", racer.id);
        return NextResponse.json(
          errorResponse("INTERNAL_ERROR", rpcError.message),
          { status: 500 }
        );
      }

      racerClassRows.push({
        racer_id: racer.id,
        class_id: classId,
        race_number: raceNumber as number,
        payment_slip_url: (body.payment_slip_url as string) ?? null,
        confirmed: false,
      });
    }

    const { data: racerClasses, error: rcError } = await serviceClient
      .from("racer_classes")
      .insert(racerClassRows)
      .select("*, classes(*)");

    if (rcError) {
      // Cleanup: delete the racer we just created
      await serviceClient.from("racers").delete().eq("id", racer.id);
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", rcError.message),
        { status: 500 }
      );
    }

    return NextResponse.json(
      successResponse({ ...racer, racer_classes: racerClasses }),
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
