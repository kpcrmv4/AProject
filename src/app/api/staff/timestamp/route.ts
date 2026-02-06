import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { recordTimestampSchema } from "@/lib/utils/validation";
import { successResponse, errorResponse } from "@/types";
import { z } from "zod";

const deleteTimestampSchema = z.object({
  timestamp_id: z.string().uuid("timestamp_id ต้องเป็น UUID"),
});

// POST /api/staff/timestamp — Record timestamp
export async function POST(request: NextRequest) {
  try {
    // 1. Validate input
    const body = await request.json();
    const parsed = recordTimestampSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.issues[0].message),
        { status: 400 }
      );
    }

    // 2. Use service role client (bypass RLS)
    const supabase = await createServiceClient();

    // 3. Validate checkpoint exists and get event_id
    const { data: checkpoint, error: cpError } = await supabase
      .from("checkpoints")
      .select("id, event_id")
      .eq("id", parsed.data.checkpoint_id)
      .single();

    if (cpError || !checkpoint) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "ไม่พบ Checkpoint"),
        { status: 404 }
      );
    }

    // 4. Find racer by number in the event
    const { data: racerClass, error: rcError } = await supabase
      .from("racer_classes")
      .select("racer_id, racers!inner(id, event_id, name)")
      .eq("race_number", parsed.data.racer_number)
      .eq("racers.event_id", checkpoint.event_id)
      .maybeSingle();

    if (rcError || !racerClass) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", `ไม่พบนักแข่งหมายเลข ${parsed.data.racer_number} ในงานนี้`),
        { status: 404 }
      );
    }

    // 5. Use record_timestamp() database function (server time)
    const { data: timestamp, error: rpcError } = await supabase
      .rpc("record_timestamp", {
        p_checkpoint_id: parsed.data.checkpoint_id,
        p_racer_id: racerClass.racer_id,
      });

    if (rpcError) {
      // Check for duplicate (unique constraint violation)
      if (rpcError.code === "23505") {
        return NextResponse.json(
          errorResponse("CONFLICT", "นักแข่งคนนี้ผ่าน Checkpoint นี้แล้ว"),
          { status: 409 }
        );
      }
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", rpcError.message),
        { status: 500 }
      );
    }

    return NextResponse.json(successResponse(timestamp), { status: 201 });
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}

// DELETE /api/staff/timestamp — Undo timestamp (within 5 seconds)
export async function DELETE(request: NextRequest) {
  try {
    // 1. Validate input
    const body = await request.json();
    const parsed = deleteTimestampSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", parsed.error.issues[0].message),
        { status: 400 }
      );
    }

    // 2. Use service role client (bypass RLS)
    const supabase = await createServiceClient();

    // 3. Get the timestamp and check if within 5 seconds
    const { data: timestamp, error: fetchError } = await supabase
      .from("timestamps")
      .select("*")
      .eq("id", parsed.data.timestamp_id)
      .single();

    if (fetchError || !timestamp) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "ไม่พบ Timestamp"),
        { status: 404 }
      );
    }

    // Check created_at is within 5 seconds
    const createdAt = new Date(timestamp.created_at).getTime();
    const now = Date.now();
    const diffSeconds = (now - createdAt) / 1000;

    if (diffSeconds > 5) {
      return NextResponse.json(
        errorResponse("FORBIDDEN", "เกิน 5 วินาทีแล้ว ไม่สามารถยกเลิกได้"),
        { status: 403 }
      );
    }

    // 4. Delete timestamp
    const { error: deleteError } = await supabase
      .from("timestamps")
      .delete()
      .eq("id", parsed.data.timestamp_id);

    if (deleteError) {
      return NextResponse.json(
        errorResponse("INTERNAL_ERROR", deleteError.message),
        { status: 500 }
      );
    }

    return NextResponse.json(successResponse({ deleted: true }));
  } catch {
    return NextResponse.json(
      errorResponse("INTERNAL_ERROR", "เกิดข้อผิดพลาด"),
      { status: 500 }
    );
  }
}
