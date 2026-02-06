import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/types";

type RouteParams = { params: Promise<{ slug: string }> };

// POST /api/events/[slug]/upload-photo — Upload racer photo (public)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const supabase = await createServiceClient();

    // 1. Validate event exists and is published
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, published")
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
        errorResponse("FORBIDDEN", "งานนี้ยังไม่เปิด"),
        { status: 403 }
      );
    }

    // 2. Get file from FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "กรุณาเลือกไฟล์"),
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "ไฟล์ต้องเป็นรูปภาพ"),
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", "ไฟล์ต้องไม่เกิน 5MB"),
        { status: 400 }
      );
    }

    // 3. Upload to racer-photos bucket
    const ext = file.name.split(".").pop() ?? "jpg";
    const filePath = `${event.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("racer-photos")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", uploadError.message),
        { status: 500 }
      );
    }

    // 4. Get public URL
    const { data: urlData } = supabase.storage
      .from("racer-photos")
      .getPublicUrl(filePath);

    return NextResponse.json(successResponse({ url: urlData.publicUrl }));
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
