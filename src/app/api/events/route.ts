import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEventSchema } from "@/lib/utils/validation";
import { successResponse, errorResponse } from "@/types";
import slugify from "slugify";

// GET /api/events — List admin's events (auth required)
export async function GET() {
  try {
    const supabase = await createClient();
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

    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .eq("admin_id", user.id)
      .order("race_date", { ascending: false });

    if (error) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", error.message),
        { status: 500 }
      );
    }

    return NextResponse.json(successResponse(events));
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}

// POST /api/events — Create event (auth required)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
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

    // Validate input
    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.issues[0].message),
        { status: 400 }
      );
    }

    // Generate unique slug
    let slug = slugify(parsed.data.name, { lower: true, strict: true });

    // Check if slug already exists, append number if needed
    const { data: existing } = await supabase
      .from("events")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        admin_id: user.id,
        slug,
        name: parsed.data.name,
        race_date: parsed.data.race_date,
        registration_opens: parsed.data.registration_opens ?? null,
        registration_closes: parsed.data.registration_closes ?? null,
        published: false,
        payment_qr_url: null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", error.message),
        { status: 500 }
      );
    }

    return NextResponse.json(successResponse(event), { status: 201 });
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
