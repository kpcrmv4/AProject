import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/types";

type RouteParams = { params: Promise<{ slug: string }> };

// POST /api/events/[slug]/payment-qr — Upload payment QR (admin only)
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
        errorResponse("FORBIDDEN", "คุณไม่มีสิทธิ์จัดการงานนี้"),
        { status: 403 }
      );
    }

    // 3. Get uploaded file from FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "กรุณาเลือกไฟล์"),
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "ไฟล์ต้องเป็นรูปภาพ"),
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "ไฟล์ต้องไม่เกิน 5MB"),
        { status: 400 }
      );
    }

    // 4. Upload to Supabase Storage
    const ext = file.name.split(".").pop() ?? "png";
    const filePath = `payment-qr/${event.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("events")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", uploadError.message),
        { status: 500 }
      );
    }

    // 5. Get public URL
    const { data: urlData } = supabase.storage
      .from("events")
      .getPublicUrl(filePath);

    // 6. Update event with QR URL
    const { data: updated, error: updateError } = await supabase
      .from("events")
      .update({
        payment_qr_url: urlData.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", updateError.message),
        { status: 500 }
      );
    }

    return NextResponse.json(
      successResponse({ url: updated.payment_qr_url })
    );
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
