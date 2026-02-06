import { z } from "zod";

// Event schemas
export const createEventSchema = z.object({
  name: z.string().min(1, "กรุณาใส่ชื่องาน"),
  race_date: z.string().min(1, "กรุณาเลือกวันแข่ง"),
  registration_opens: z.string().nullable().optional(),
  registration_closes: z.string().nullable().optional(),
});

export const updateEventSchema = createEventSchema.partial();

// Class schemas
export const createClassSchema = z.object({
  name: z.string().min(1, "กรุณาใส่ชื่อรุ่น"),
  fee: z.coerce.number().min(0, "ค่าสมัครต้อง >= 0"),
  number_start: z.coerce.number().int().min(1),
  number_end: z.coerce.number().int().min(1),
  number_format: z.string().default("000"),
  sort_order: z.coerce.number().int().default(0),
});

// Checkpoint schemas
export const createCheckpointSchema = z.object({
  name: z.string().min(1, "กรุณาใส่ชื่อ Checkpoint"),
  sort_order: z.coerce.number().int().min(1),
});

// Registration schemas
export const registrationSchema = z.object({
  name: z.string().min(1, "กรุณาใส่ชื่อ-นามสกุล"),
  team: z.string().optional(),
  bike: z.string().optional(),
  phone: z.string().optional(),
  class_ids: z.array(z.string()).min(1, "กรุณาเลือกอย่างน้อย 1 รุ่น"),
});

// Staff auth schema
export const staffAuthSchema = z.object({
  code: z
    .string()
    .length(4, "รหัสต้อง 4 หลัก")
    .regex(/^\d{4}$/, "รหัสต้องเป็นตัวเลข 4 หลัก"),
});

// Timestamp schemas
export const recordTimestampSchema = z.object({
  checkpoint_id: z.string().uuid(),
  racer_number: z.coerce.number().int().min(1, "เบอร์รถไม่ถูกต้อง"),
});

// DNF schema
export const dnfSchema = z.object({
  racer_id: z.string().uuid(),
  checkpoint_id: z.string().uuid().optional(),
  reason: z.string().min(1, "กรุณาระบุเหตุผล"),
});

// Penalty schema
export const penaltySchema = z.object({
  racer_id: z.string().uuid(),
  seconds: z.coerce.number().int().min(1, "เวลา penalty ต้อง >= 1 วินาที"),
  reason: z.string().min(1, "กรุณาระบุเหตุผล"),
});

// Edit timestamp schema
export const editTimestampSchema = z.object({
  recorded_at: z.string().min(1, "กรุณาใส่เวลาที่ต้องการแก้ไข"),
  reason: z.string().min(1, "กรุณาระบุเหตุผลการแก้ไข"),
});
