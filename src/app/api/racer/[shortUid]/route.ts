import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/types";

type RouteParams = { params: Promise<{ shortUid: string }> };

// GET /api/racer/[shortUid]?phone_last4=xxxx — Public racer detail by short UID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { shortUid } = await params;
    const phoneLast4 = request.nextUrl.searchParams.get("phone_last4");

    // Require phone_last4 verification
    if (!phoneLast4 || !/^\d{4}$/.test(phoneLast4)) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "กรุณากรอกเบอร์โทร 4 หลักสุดท้าย"),
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Look up racer by short_uid
    const { data: racer, error: racerError } = await supabase
      .from("racers")
      .select(
        "id, name, team, bike, phone, photo_url, short_uid, created_at, event_id, events!inner(id, name, slug, race_date, published)"
      )
      .eq("short_uid", shortUid)
      .single();

    if (racerError || !racer) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "ไม่พบข้อมูลนักแข่ง"),
        { status: 404 }
      );
    }

    // 2. Verify phone last 4 digits
    const racerPhone = (racer.phone ?? "").replace(/\D/g, "");
    if (racerPhone.length < 4 || racerPhone.slice(-4) !== phoneLast4) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "เบอร์โทรไม่ถูกต้อง"),
        { status: 403 }
      );
    }

    // 3. Check event is published
    const event = racer.events as {
      id: string;
      name: string;
      slug: string;
      race_date: string;
      published: boolean;
    };

    if (!event.published) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "ไม่พบข้อมูลนักแข่ง"),
        { status: 404 }
      );
    }

    // 4. Get racer's class registrations
    const { data: racerClasses, error: rcError } = await supabase
      .from("racer_classes")
      .select("*, classes(*)")
      .eq("racer_id", racer.id);

    if (rcError) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", rcError.message),
        { status: 500 }
      );
    }

    return NextResponse.json(
      successResponse({
        racer: {
          id: racer.id,
          name: racer.name,
          team: racer.team,
          bike: racer.bike,
          phone: racer.phone,
          photo_url: racer.photo_url,
          short_uid: racer.short_uid,
          created_at: racer.created_at,
        },
        racer_classes: racerClasses ?? [],
        event: {
          name: event.name,
          slug: event.slug,
          race_date: event.race_date,
        },
      })
    );
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
