# Blueprint: EnduroRaceManager (Next.js + Supabase)

> **Note:** Always respond in Thai

**Author:** ครูA
**Date:** 2026-02-06
**Version:** 2.0 (Rebuild from Scratch)

---

## 1. Architecture Overview

- **Framework:** Next.js 15.3+ (App Router, TypeScript strict mode) -- ห้ามใช้ 15.1.3 (CVE-2025-66478)
- **Database:** Supabase (PostgreSQL + Auth + Real-time + Storage)
- **Authentication:** Supabase Auth (Admin: Email/Password) + Custom 4-digit code (Staff)
- **Styling:** Tailwind CSS 4 + shadcn/ui (Radix UI primitives)
- **Fonts:** Inter (UI text), JetBrains Mono (numbers/times)
- **State Management:** React Context + Supabase Realtime subscriptions
- **Validation:** Zod schemas
- **File Storage:** Supabase Storage (payment slips, QR codes)
- **Deployment:** Vercel (Edge Runtime, automatic from GitHub)
- **Notifications:** Sonner (Toast)
- **QR Codes:** qrcode library
- **Date/Time:** date-fns

---

## 2. Project Vision

ระบบจัดการแข่ง Enduro แบบครบวงจร ที่แทนที่ Google Sheets workflow ด้วย web application รองรับ:
- **Real-time Results** - ผลอัพเดทภายใน < 2 วินาที ผ่าน Supabase subscriptions
- **Simple Staff Interface** - รหัส 4 หลัก + ปุ่มใหญ่ = ใครก็ใช้ได้ (Tap-Tap-Done)
- **Multi-Class Registration** - สมัครหลายรุ่นครั้งเดียว คำนวณยอดอัตโนมัติ
- **Data Integrity** - Server timestamps + Audit trail = ไม่มีข้อโต้แย้ง
- **QR-First Access** - ทุก entry point มี QR code

### Target Users

| User Type | Description | Access Method |
|-----------|-------------|---------------|
| **Admin** | ผู้จัดงานแข่ง - สร้าง/จัดการ event ทั้งหมด | Supabase Auth (email/password) |
| **Staff** | อาสาสมัครประจำ checkpoint - บันทึกเวลา | 4-digit code (หมดอายุสิ้นวันแข่ง) |
| **Racer** | นักแข่ง - สมัครและดูผล | Public (ไม่ต้อง login) |
| **Viewer** | คนดู/ครอบครัว - ดูผล real-time | Public (QR scan) |

---

## 3. Security & Data Isolation

- **Tenant Isolation:** ทุก table มี `event_id` สำหรับแยกข้อมูลแต่ละงาน
- **Row Level Security (RLS):**
  - Admin: `admin_id = auth.uid()` - จัดการได้เฉพาะ event ตัวเอง
  - Staff: valid checkpoint access code + not expired
  - Public: read-only สำหรับ events (published), results
- **Middleware:** Next.js middleware สำหรับ route protection
- **Timestamp Integrity:** Server-side `NOW()` เท่านั้น (ไม่ใช้ device time)
- **Audit Trail:** Immutable log ทุกการแก้ไขของ Admin
- **Duplicate Prevention:** Unique constraint on `timestamps(checkpoint_id, racer_id)`

---

## 4. Database Schema (SQL)

### 4.1 Core Tables

```sql
-- Events: ข้อมูลหลักของงานแข่ง
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  race_date DATE NOT NULL,
  registration_opens TIMESTAMPTZ,
  registration_closes TIMESTAMPTZ,
  payment_qr_url TEXT,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_events_slug ON events(slug);

-- Classes: รุ่นการแข่งขัน
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fee NUMERIC(10,2) DEFAULT 0,
  number_start INTEGER NOT NULL,
  number_end INTEGER NOT NULL,
  number_format TEXT DEFAULT '000',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checkpoints: จุดจับเวลา
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  access_code TEXT NOT NULL,
  code_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class-Checkpoint Mapping: กำหนดว่ารุ่นไหนผ่าน checkpoint ไหน
CREATE TABLE class_checkpoints (
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, checkpoint_id)
);
```

### 4.2 Registration Tables

```sql
-- Racers: นักแข่ง
CREATE TABLE racers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  team TEXT,
  bike TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Racer-Class Registration: สมัครรุ่น
CREATE TABLE racer_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  racer_id UUID NOT NULL REFERENCES racers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  race_number INTEGER NOT NULL,
  payment_slip_url TEXT,
  confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (class_id, race_number)
);
```

### 4.3 Timing Tables

```sql
-- Timestamps: บันทึกเวลาที่ checkpoint
CREATE TABLE timestamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  racer_id UUID NOT NULL REFERENCES racers(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (checkpoint_id, racer_id)
);
CREATE INDEX idx_timestamps_checkpoint ON timestamps(checkpoint_id);
CREATE INDEX idx_timestamps_racer ON timestamps(racer_id);
```

### 4.4 Admin Action Tables

```sql
-- Audit Logs: บันทึกทุกการกระทำของ Admin (immutable)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DNF Records: Did Not Finish
CREATE TABLE dnf_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  racer_id UUID NOT NULL REFERENCES racers(id) ON DELETE CASCADE,
  checkpoint_id UUID REFERENCES checkpoints(id),
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (racer_id)
);

-- Penalties: Time Penalties
CREATE TABLE penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  racer_id UUID NOT NULL REFERENCES racers(id) ON DELETE CASCADE,
  seconds INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.5 Entity Relationships

```
auth.users ──1:N──> events (admin_id)
events ──1:N──> classes
events ──1:N──> checkpoints
events ──1:N──> racers
classes ──N:M──> checkpoints (via class_checkpoints)
racers ──1:N──> racer_classes
classes ──1:N──> racer_classes
checkpoints ──1:N──> timestamps
racers ──1:N──> timestamps
racers ──1:1──> dnf_records
racers ──1:N──> penalties
events ──1:N──> audit_logs
```

---

## 5. UI Design System

### Color Palette

| Token | Color | Hex | Usage |
|-------|-------|-----|-------|
| primary | emerald-600 | #059669 | Actions, success, primary buttons |
| secondary | slate-700 | #334155 | Text, secondary UI |
| success | green-500 | #22c55e | Confirmations, recorded |
| warning | amber-500 | #f59e0b | Syncing, pending |
| error | red-500 | #ef4444 | Errors, DNF, duplicates |
| background | slate-50 | #f8fafc | Page background |
| surface | white | #ffffff | Cards, inputs |

### Typography

- **Sans:** Inter (UI text) - base 18px
- **Mono:** JetBrains Mono (numbers, times) - display 48px
- **Contrast:** WCAG AAA (7:1 ratio) สำหรับใช้งานกลางแดด

### Touch Targets & Spacing

| Context | Size |
|---------|------|
| Primary action (Staff) | 64px x 64px |
| Secondary action | 48px x 48px |
| Navigation | 44px x 44px |
| Base spacing unit | 8px |
| Border radius | 8px |

### Responsive Breakpoints

| Breakpoint | Width | Primary Use |
|------------|-------|-------------|
| Mobile | < 768px | Staff, Viewer, Racer (primary) |
| Tablet | 768px - 1024px | Admin |
| Desktop | > 1024px | Admin (full) |

---

## 6. Custom Components

### NumberPad (Staff - CRITICAL)

ปุ่มตัวเลขขนาดใหญ่สำหรับบันทึกเบอร์รถ

```
Props:
- value: string
- onChange: (value: string) => void
- onSubmit: () => void
- disabled?: boolean
- maxLength?: number (default: 3)

Specs:
- Button size: 64px x 64px minimum
- Display font: 48px JetBrains Mono
- Gap: 8px between buttons
- Feedback: Haptic on tap, green flash on confirm
- Layout: 3x4 grid + 0 + backspace + confirm
```

### LiveBadge (Connection Status)

```
Props:
- status: 'live' | 'syncing' | 'offline' | 'error'
- size?: 'sm' | 'md' | 'lg'
- showLabel?: boolean

Variants:
- live: green-500, pulse animation
- syncing: amber-500, spin animation
- offline: red-500, no animation
- error: red-600, no animation
```

### HistoryStrip (Recent Recordings)

```
Props:
- entries: Array<{ id, number, status: 'synced' | 'pending' }>
- onUndo?: (id: string) => void
- maxItems?: number (default: 5)

Specs:
- Show last 5 entries
- Slide-left animation on new entry
- 5-second undo window
- Format: "{number} ✓" or "{number} ⚠"
```

### LeaderboardRow (Animated Rankings)

```
Props:
- rank: number
- previousRank?: number
- racerNumber: string
- time: string
- gap?: string
- status: 'active' | 'dnf' | 'pending'
- isUpdated?: boolean

Specs:
- Slide animation on rank change (300ms)
- Yellow flash on update (500ms)
- DNF: strikethrough + red badge
```

### ClassSelector (Multi-select Registration)

```
Props:
- classes: Array<{ id, name, fee }>
- selected: string[]
- onChange: (selected: string[]) => void
- currency?: string (default: '฿')

Specs:
- Checkbox multi-select
- Auto-calculate total (sticky at bottom on mobile)
- Minimum 1 class required
```

---

## 7. Project Structure

```
enduro-race-manager/
├── .env.local
├── .env.example
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── components.json              # shadcn/ui config
├── package.json
│
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Landing/redirect
│   │   │
│   │   ├── (public)/                   # Public routes (no auth)
│   │   │   └── [slug]/
│   │   │       ├── page.tsx            # Event info + registration
│   │   │       └── results/
│   │   │           └── page.tsx        # Live results
│   │   │
│   │   ├── staff/                      # Staff checkpoint interface
│   │   │   └── [code]/
│   │   │       └── page.tsx            # NumberPad + HistoryStrip
│   │   │
│   │   ├── (admin)/                    # Admin routes (auth required)
│   │   │   ├── layout.tsx              # Admin layout + auth check
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   └── events/
│   │   │       ├── page.tsx            # Event list
│   │   │       ├── new/
│   │   │       │   └── page.tsx        # Create event
│   │   │       └── [slug]/
│   │   │           ├── page.tsx        # Event detail/config
│   │   │           ├── classes/
│   │   │           │   └── page.tsx
│   │   │           ├── checkpoints/
│   │   │           │   └── page.tsx
│   │   │           ├── racers/
│   │   │           │   └── page.tsx
│   │   │           └── race-control/
│   │   │               └── page.tsx    # DNF, Penalty, Edit
│   │   │
│   │   └── api/
│   │       ├── events/
│   │       │   ├── route.ts            # GET (list), POST (create)
│   │       │   └── [slug]/
│   │       │       ├── route.ts        # GET, PUT, DELETE
│   │       │       ├── classes/route.ts
│   │       │       ├── checkpoints/route.ts
│   │       │       └── racers/route.ts
│   │       ├── staff/
│   │       │   ├── auth/route.ts       # POST (validate 4-digit code)
│   │       │   └── timestamp/route.ts  # POST (record), DELETE (undo)
│   │       ├── results/
│   │       │   └── [slug]/route.ts     # GET (public results)
│   │       └── admin/
│   │           ├── dnf/route.ts        # POST
│   │           ├── penalty/route.ts    # POST
│   │           └── timestamp/[id]/route.ts  # PUT (edit with reason)
│   │
│   ├── components/
│   │   ├── ui/                         # shadcn/ui (button, input, card, etc.)
│   │   ├── custom/                     # Custom components
│   │   │   ├── NumberPad.tsx
│   │   │   ├── LiveBadge.tsx
│   │   │   ├── HistoryStrip.tsx
│   │   │   ├── LeaderboardRow.tsx
│   │   │   └── ClassSelector.tsx
│   │   ├── features/
│   │   │   ├── events/                 # EventCard, EventForm, EventList
│   │   │   ├── registration/           # RegistrationForm, PaymentUpload
│   │   │   ├── checkpoint/             # CheckpointInterface, TimestampList
│   │   │   ├── results/                # Leaderboard, ClassFilter
│   │   │   └── admin/                  # RaceControl, DNFModal, AuditLog
│   │   └── layout/                     # Header, AdminNav, Footer
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser client
│   │   │   ├── server.ts               # Server client
│   │   │   ├── middleware.ts            # Auth middleware helper
│   │   │   └── types.ts                # Generated types
│   │   ├── utils/
│   │   │   ├── format.ts               # Date/time formatting
│   │   │   ├── calculate.ts            # Ranking calculations
│   │   │   └── validation.ts           # Zod schemas
│   │   └── hooks/
│   │       ├── useRealtime.ts           # Supabase subscription hook
│   │       ├── useStaffAuth.ts          # Staff 4-digit code auth
│   │       └── useEventData.ts          # Event data fetching
│   │
│   ├── types/
│   │   ├── database.ts                  # Supabase generated types
│   │   ├── api.ts                       # API request/response types
│   │   └── index.ts                     # Re-exports
│   │
│   └── middleware.ts                    # Next.js middleware (route protection)
│
├── supabase/
│   ├── config.toml
│   ├── seed.sql
│   └── migrations/
│       ├── 00001_initial_schema.sql
│       ├── 00002_rls_policies.sql
│       └── 00003_functions.sql
│
└── public/
    └── favicon.ico
```

---

## 8. API Routes

### Response Format Standard

```typescript
// ทุก API ใช้ format เดียวกัน
type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string } }

// HTTP Status
// 200 - Success
// 201 - Created
// 400 - Validation error
// 401 - Unauthorized
// 403 - Forbidden
// 404 - Not found
// 409 - Conflict (duplicate)
// 500 - Server error
```

### Routes Summary

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/events` | GET, POST | List/Create events | Admin |
| `/api/events/[slug]` | GET, PUT, DELETE | Event CRUD | Admin (write), Public (read) |
| `/api/events/[slug]/classes` | GET, POST, PUT, DELETE | Class management | Admin |
| `/api/events/[slug]/checkpoints` | GET, POST, PUT, DELETE | Checkpoint management | Admin |
| `/api/events/[slug]/racers` | GET, POST | Registration | Admin (GET), Public (POST) |
| `/api/staff/auth` | POST | Validate 4-digit code | Public |
| `/api/staff/timestamp` | POST, DELETE | Record/Undo timestamp | Staff (valid code) |
| `/api/results/[slug]` | GET | Public results + rankings | Public |
| `/api/admin/dnf` | POST | Mark racer as DNF | Admin |
| `/api/admin/penalty` | POST | Add time penalty | Admin |
| `/api/admin/timestamp/[id]` | PUT | Edit timestamp with reason | Admin |

---

## 9. Real-time Subscriptions

```typescript
// Supabase Realtime channels
'timestamps:INSERT'  // Staff บันทึกเวลาใหม่ → อัพเดท results
'timestamps:UPDATE'  // Admin แก้ไขเวลา → อัพเดท results
'racers:INSERT'      // สมัครใหม่ → อัพเดท racer list
'dnf_records:INSERT' // Mark DNF → อัพเดท results

// Pattern: Optimistic UI
// 1. แสดง success ทันที
// 2. ส่งข้อมูลไป server
// 3. ถ้า error → revert + แสดง error
```

---

## 10. Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=        # Server-only: admin operations
```

---

## 11. Functional Requirements (43 FRs)

### Event Management (FR1-FR6)
- FR1: Admin สร้าง event ใหม่ (ชื่อ, slug, วันแข่ง)
- FR2: Admin กำหนดวันเปิด-ปิดรับสมัคร
- FR3: Admin อัพโหลด QR Code การชำระเงิน
- FR4: Admin เผยแพร่/ซ่อน event
- FR5: Admin ดูรายการ events ทั้งหมด
- FR6: ระบบสร้าง unique URL slug อัตโนมัติ

### Class Management (FR7-FR10)
- FR7: Admin สร้างหลายรุ่นต่อ event
- FR8: Admin กำหนดรายละเอียดรุ่น (ชื่อ, ค่าสมัคร, ช่วงเบอร์, format เบอร์)
- FR9: Admin กำหนดว่ารุ่นไหนผ่าน checkpoint ไหน
- FR10: Admin แก้ไข/ลบรุ่นก่อนปิดรับสมัคร

### Checkpoint Configuration (FR11-FR14)
- FR11: Admin สร้าง checkpoint (ชื่อ, ลำดับ)
- FR12: ระบบสร้างรหัส 4 หลักให้ checkpoint
- FR13: Admin กำหนดวันหมดอายุรหัส (สิ้นวันแข่ง)
- FR14: Admin สร้างรหัสใหม่ได้ถ้ารหัสเก่าถูกเปิดเผย

### Racer Registration (FR15-FR21)
- FR15: นักแข่งดูรายละเอียด event ได้โดยไม่ต้อง login
- FR16: นักแข่งสมัครหลายรุ่นในครั้งเดียว
- FR17: นักแข่งกรอกข้อมูล (ชื่อ, ทีม, รถ)
- FR18: ระบบคำนวณยอดค่าสมัครอัตโนมัติ
- FR19: นักแข่งแนบสลิปโอนเงิน
- FR20: ระบบกำหนดเบอร์รถอัตโนมัติ
- FR21: เบอร์รถกำหนดจาก class configuration

### Staff Checkpoint Interface (FR22-FR27) - CRITICAL
- FR22: Staff เข้าด้วยรหัส 4 หลัก
- FR23: Staff เห็นชื่อ checkpoint หลัง auth
- FR24: Staff กดเบอร์รถด้วย NumberPad ปุ่มใหญ่
- FR25: Staff บันทึก timestamp ให้นักแข่ง
- FR26: ระบบป้องกันบันทึกซ้ำ (unique constraint)
- FR27: ระบบใช้เวลา server (ไม่ใช่เวลา device)

### Results & Leaderboard (FR28-FR32)
- FR28: ทุกคนดูผลได้โดยไม่ต้อง login
- FR29: กรองผลตามรุ่นได้
- FR30: แสดง อันดับ, เบอร์, ชื่อ, เวลา checkpoint
- FR31: ผลอัพเดท real-time เมื่อบันทึกเวลาใหม่
- FR32: คำนวณอันดับจากเวลารวม

### Race Control (FR33-FR38)
- FR33: Admin ดูสถานะนักแข่งทั้งหมด
- FR34: Admin mark DNF พร้อมเหตุผล
- FR35: Admin เพิ่ม time penalty พร้อมเหตุผล
- FR36: Admin แก้ไข timestamp พร้อมเหตุผล
- FR37: ระบบ log ทุกการกระทำของ Admin
- FR38: Admin ดู audit trail ของนักแข่งได้

### QR Code & Printing (FR39-FR43)
- FR39: ระบบสร้าง QR สำหรับหน้าสมัคร
- FR40: ระบบสร้าง QR สำหรับหน้าผล
- FR41: Admin download QR เป็น PNG
- FR42: Admin พิมพ์บัตรนักแข่ง 80mm thermal
- FR43: บัตรแสดง: เบอร์, ชื่อ, ทีม, รถ, รุ่น, QR

---

## 12. Non-Functional Requirements

### Performance

| Metric | Target |
|--------|--------|
| Real-time update | < 2 seconds |
| Staff UI response | < 500ms |
| Page load (mobile 4G) | < 3 seconds |
| Concurrent viewers | 100+ |
| FCP | < 1.5s |
| TTI | < 3s |

### Security

| Requirement | Implementation |
|-------------|----------------|
| Admin auth | Supabase Auth (email/password) |
| Staff access | 4-digit code + expiration |
| Data isolation | RLS per event |
| Timestamp integrity | Server NOW() only |
| Edit protection | Admin-only + mandatory reason |
| Audit trail | Immutable log |

### Reliability

| Requirement | Target |
|-------------|--------|
| Race day uptime | 99%+ |
| Data durability | 100% (no data loss) |
| Connection handling | Graceful degradation + auto-retry |

---

## 13. Implementation Phases

### Phase 1: Foundation (P0)

**Stories:** E1-S1 → E1-S4

| Task | Details |
|------|---------|
| Project init | `create-next-app@latest` + TypeScript + Tailwind + App Router |
| Supabase setup | `@supabase/supabase-js` + `@supabase/ssr` |
| shadcn/ui init | Default config + customize theme |
| Database schema | Run all migrations (10 tables) |
| RLS policies | Admin, Staff, Public policies |
| Admin auth | Supabase Auth login/logout + middleware |
| Environment | `.env.local` + `.env.example` |

### Phase 2: Staff Checkpoint Interface (P0 - CRITICAL)

**Stories:** E4-S1 → E4-S6

| Task | Details |
|------|---------|
| Staff code auth | POST `/api/staff/auth` + session/cookie |
| NumberPad component | 64px buttons, JetBrains Mono display |
| Record timestamp | POST `/api/staff/timestamp` with server NOW() |
| Duplicate prevention | 409 Conflict response + error UI |
| HistoryStrip | Last 5 entries + 5s undo window |
| LiveBadge | Connection status indicator |

### Phase 3: Event Management (P0)

**Stories:** E2-S1, E2-S3, E2-S4

| Task | Details |
|------|---------|
| Create event | Form + auto-slug generation |
| Publish/unpublish | Toggle published boolean |
| Event list | Admin dashboard with event cards |

### Phase 4: Class & Checkpoint Config (P0)

**Stories:** E3-S1 → E3-S3

| Task | Details |
|------|---------|
| Create classes | CRUD + fee + number range |
| Create checkpoints | CRUD + auto-generate 4-digit code |
| Class-checkpoint mapping | Junction table management |

### Phase 5: Racer Registration (P1)

**Stories:** E5-S1 → E5-S6

| Task | Details |
|------|---------|
| Event details page | Public `/{slug}` page |
| Registration form | RegistrationForm + ClassSelector |
| Auto-calculate fee | Real-time total computation |
| Payment slip upload | Supabase Storage upload |
| Auto-assign number | Based on class number range |

### Phase 6: Live Results & Leaderboard (P1)

**Stories:** E6-S1 → E6-S5

| Task | Details |
|------|---------|
| Public results page | `/{slug}/results` |
| Class filter | Tabs component |
| LeaderboardRow | Animated rank changes |
| Real-time subscription | Supabase realtime on timestamps |
| Ranking calculation | Total time + penalties - DNF excluded |

### Phase 7: Race Control (P1)

**Stories:** E7-S1 → E7-S5

| Task | Details |
|------|---------|
| Racer status view | Real-time dashboard |
| Mark DNF | Modal + reason + audit log |
| Add penalty | Seconds + reason + audit log |
| Edit timestamp | Old/new value + reason + audit log |
| Audit trail view | Immutable history per racer |

### Phase 8: QR & Printing (P2)

**Stories:** E8-S1 → E8-S4

| Task | Details |
|------|---------|
| Generate QR codes | Registration + Results URLs |
| Download QR | High-res PNG (1000x1000) |
| Payment QR upload | E2-S2 |
| Thermal print card | 80mm layout + browser print API |
| Batch print | Multi-select + page breaks |

---

## 14. Naming Conventions

### Database
| Element | Convention | Example |
|---------|------------|---------|
| Tables | snake_case, plural | `events`, `racers` |
| Columns | snake_case | `race_date`, `admin_id` |
| Foreign keys | `{table}_id` | `event_id`, `racer_id` |
| Indexes | `idx_{table}_{column}` | `idx_events_slug` |

### API
| Element | Convention | Example |
|---------|------------|---------|
| Routes | kebab-case, plural | `/api/events`, `/api/race-control` |
| Params | camelCase | `eventSlug`, `racerId` |
| Query | camelCase | `?classId=1&status=active` |

### Code
| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `NumberPad`, `LeaderboardRow` |
| Files (components) | PascalCase | `NumberPad.tsx` |
| Hooks | camelCase + use | `useRealtime`, `useStaffAuth` |
| Utils | camelCase | `formatTime`, `calculateRank` |
| Types | PascalCase | `Event`, `Racer`, `Timestamp` |
| Constants | SCREAMING_SNAKE | `MAX_CLASSES`, `UNDO_WINDOW_MS` |

---

## 15. Race Day Flow

| ขั้นตอน | รายละเอียด |
|---------|------------|
| **การออกตัว** | ทีละคน (interval start) |
| **จำนวนรอบ** | รอบเดียว |
| **Checkpoint** | ยืดหยุ่น - ใช้ร่วมกันหรือแยกตามรุ่นก็ได้ |
| **เวลา** | Timestamp จริงที่แต่ละจุด |
| **การจัดอันดับ** | เวลารวมน้อยสุด (Finish - Start) |

### Racer Card Print Format (80mm Thermal)

```
┌─────────────────────────────┐
│  [ชื่องานแข่ง]               │
├─────────────────────────────┤
│  เบอร์รถ     [XXX]          │
│  ชื่อ        [ชื่อนักแข่ง]    │
│  ทีม         [ชื่อทีม]       │
│  รถแข่ง      [รุ่นรถ]        │
│  รุ่นแข่งขัน  [1.3.8.18]    │
│  ยอดรวม      [XXXX] บ.     │
├─────────────────────────────┤
│  ที่  รุ่นที่  ชื่อรุ่น        │
│  [รายการรุ่นที่สมัคร]        │
├─────────────────────────────┤
│  ลงชื่อกรรมการ    ลงชื่อนักแข่ง│
│       [QR Code]            │
└─────────────────────────────┘
```

---

## 16. Story Points Summary

| Epic | Stories | Points | Priority |
|------|---------|--------|----------|
| E1: Foundation & Setup | 4 | 13 | P0 |
| E2: Event Management | 4 | 8 | P0 |
| E3: Class & Checkpoint | 4 | 10 | P0 |
| E4: Staff Checkpoint (CRITICAL) | 6 | 21 | P0 |
| E5: Racer Registration | 6 | 15 | P1 |
| E6: Live Results | 5 | 13 | P1 |
| E7: Race Control | 5 | 13 | P1 |
| E8: QR & Printing | 4 | 8 | P2 |
| **Total** | **38** | **101** | |

---

## 17. Quick Start Commands

```bash
# 1. Create Next.js project (ใช้ @latest เสมอ เพื่อหลีกเลี่ยง CVE)
npx create-next-app@latest enduro-race-manager --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# 2. Install dependencies
cd enduro-race-manager
npm install @supabase/supabase-js @supabase/ssr
npm install zod date-fns sonner qrcode
npm install -D @types/qrcode

# 3. Initialize shadcn/ui
npx shadcn@latest init

# 4. Add shadcn components
npx shadcn@latest add button input card badge table dialog form checkbox tabs toast

# 5. Initialize Supabase (local dev)
npx supabase init

# 6. Set up environment
cp .env.example .env.local
# Fill in Supabase credentials
```

> **IMPORTANT:** ห้ามใช้ Next.js 15.1.3 - Vercel จะบล็อก deploy เพราะ CVE-2025-66478
> ใช้ `@latest` เสมอ หรืออย่างน้อย 15.3+

---

## 18. Implementation Rules (จาก Agent Skills)

> กฎเหล่านี้มาจาก React Best Practices, Composition Patterns, และ Web Design skills
> ต้องปฏิบัติตามทุกข้อระหว่าง implement

### 18.1 Eliminating Waterfalls [CRITICAL]

```typescript
// ❌ BAD: Sequential awaits = waterfall
const events = await fetchEvents()
const classes = await fetchClasses(events[0].id)
const racers = await fetchRacers(events[0].id)

// ✅ GOOD: Parallel fetching with Promise.all()
const [events, classes, racers] = await Promise.all([
  fetchEvents(),
  fetchClasses(eventId),
  fetchRacers(eventId)
])
```

**กฎ:**
- ใช้ `Promise.all()` สำหรับ async operations ที่ไม่ขึ้นต่อกัน
- Defer await: ย้าย await ไปที่จุดที่ใช้จริง ไม่ใช่ตอนเริ่มต้น function
- ใช้ Suspense boundaries สำหรับ streaming content จาก server
- ห้าม sequential await ใน API routes เมื่อ data ไม่ขึ้นต่อกัน

### 18.2 Bundle Size Optimization [CRITICAL]

```typescript
// ❌ BAD: Barrel file imports (ดึง module ทั้งหมด)
import { Calendar, Clock, User } from 'lucide-react'
import { format } from 'date-fns'

// ✅ GOOD: Direct imports (ดึงเฉพาะที่ใช้)
import Calendar from 'lucide-react/dist/esm/icons/calendar'
import Clock from 'lucide-react/dist/esm/icons/clock'
import User from 'lucide-react/dist/esm/icons/user'
import { format } from 'date-fns/format'
```

**กฎ:**
- ห้าม import จาก barrel files (โดยเฉพาะ lucide-react, date-fns, @radix-ui)
- หรือใช้ `optimizePackageImports` ใน next.config.ts:
  ```typescript
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns']
  }
  ```
- ใช้ `next/dynamic` สำหรับ heavy components (QR generator, print layout)
- Defer third-party scripts (analytics) หลัง hydration
- Preload on hover/focus สำหรับ perceived speed

### 18.3 Server Action Security [CRITICAL]

```typescript
// ❌ BAD: Server Action ไม่มี auth check
'use server'
async function deleteEvent(eventId: string) {
  await supabase.from('events').delete().eq('id', eventId)
}

// ✅ GOOD: Auth check ภายใน Server Action ทุกครั้ง
'use server'
async function deleteEvent(eventId: string) {
  // 1. Validate input
  const parsed = z.string().uuid().safeParse(eventId)
  if (!parsed.success) throw new Error('Invalid event ID')

  // 2. Authenticate
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 3. Authorize (ต้องเป็นเจ้าของ event)
  const { data: event } = await supabase
    .from('events').select('admin_id').eq('id', eventId).single()
  if (event?.admin_id !== user.id) throw new Error('Forbidden')

  // 4. Execute
  await supabase.from('events').delete().eq('id', eventId)
}
```

**กฎ:**
- Server Actions เป็น public endpoints → ต้อง auth ภายในทุกครั้ง
- ห้ามพึ่ง middleware, layout guards, หรือ page-level checks เพียงอย่างเดียว
- ทุก Server Action ต้องทำ: Input validation → Authentication → Authorization → Mutation

### 18.4 Composition Patterns [HIGH]

```typescript
// ❌ BAD: Boolean prop explosion
<EventForm
  isEditing={true}
  isPublished={false}
  isDraft={true}
  showQR={false}
  showClasses={true}
/>

// ✅ GOOD: Compound components + explicit variants
<EventForm.Create>
  <EventForm.BasicInfo />
  <EventForm.ClassConfig />
  <EventForm.CheckpointConfig />
  <EventForm.Actions />
</EventForm.Create>

// หรือ explicit variants
<CreateEventForm />
<EditEventForm event={event} />
```

**กฎ:**
- ห้ามสะสม boolean props → ใช้ composition หรือ explicit variants แทน
- ใช้ Compound Components สำหรับ complex UI (EventForm, RaceControl)
- ใช้ children แทน renderX props
- Lift state เข้า Provider เมื่อ siblings ต้องการ shared state
- Define generic Context interfaces (State, Actions, Meta)

### 18.5 Re-render Prevention [MEDIUM]

```typescript
// ❌ BAD: Derived state in useEffect
const [total, setTotal] = useState(0)
useEffect(() => {
  setTotal(selectedClasses.reduce((sum, c) => sum + c.fee, 0))
}, [selectedClasses])

// ✅ GOOD: Calculate during render
const total = selectedClasses.reduce((sum, c) => sum + c.fee, 0)
```

**กฎ:**
- คำนวณ derived state ระหว่าง render ไม่ใช่ใน useEffect
- ใช้ functional setState: `setState(prev => ...)` สำหรับ stable callbacks
- ใช้ lazy state initialization: `useState(() => expensiveComputation())`
- ใช้ useRef สำหรับ transient values ที่ไม่ต้อง re-render
- ใช้ startTransition สำหรับ non-urgent updates (filter changes, search)
- ห้าม useMemo สำหรับ simple expressions ที่ return primitives

### 18.6 Suspense & Streaming [HIGH]

```typescript
// ✅ GOOD: Suspense boundaries สำหรับ data-heavy sections
export default function ResultsPage() {
  return (
    <div>
      <h1>ผลการแข่งขัน</h1>
      <Suspense fallback={<LeaderboardSkeleton />}>
        <Leaderboard slug={slug} />
      </Suspense>
    </div>
  )
}
```

**กฎ:**
- ใช้ Suspense boundary รอบ data-fetching components
- Skeleton screens (ไม่ใช่ spinners) สำหรับ loading states
- Server Components เป็น default → Client Components เฉพาะที่จำเป็น
- ใช้ `React.cache()` สำหรับ server-side deduplication
- ใช้ `after()` สำหรับ non-blocking operations (audit logging)

### 18.7 Client-Side Performance [MEDIUM]

**กฎ:**
- ใช้ Set/Map สำหรับ O(1) lookups แทน Array.includes()
- Build index maps สำหรับ repeated lookups (racer lookup by number)
- ใช้ passive event listeners สำหรับ scroll events
- Cache localStorage reads (staff session)
- ใช้ toSorted() แทน sort() เพื่อ immutability

### 18.8 Rendering [MEDIUM]

```typescript
// ❌ BAD: Falsy && rendering
{racerCount && <Badge>{racerCount}</Badge>}
// renders "0" when racerCount is 0

// ✅ GOOD: Explicit conditional
{racerCount > 0 ? <Badge>{racerCount}</Badge> : null}
```

**กฎ:**
- ใช้ ternary ไม่ใช่ `&&` สำหรับ conditional rendering (ป้องกัน render 0/false)
- Hoist static JSX นอก component (ไม่ recreate ทุก render)
- ใช้ CSS `content-visibility: auto` สำหรับ long lists (leaderboard)
- Animate wrapper div ไม่ใช่ SVG element โดยตรง

### 18.9 Project-Specific Rules

**สำหรับ EnduroRaceManager โดยเฉพาะ:**

| Component | Rule |
|-----------|------|
| **NumberPad** | ใช้ useRef สำหรับ input value (ไม่ re-render ทุกกด) |
| **Leaderboard** | ใช้ index Map สำหรับ racer lookup by number |
| **ClassSelector** | คำนวณ total เป็น derived state (ไม่ใช่ useEffect) |
| **LiveBadge** | ใช้ useRef สำหรับ connection status (transient value) |
| **Results page** | Suspense boundary + skeleton screen |
| **Race Control** | Promise.all() สำหรับ parallel data fetching |
| **API routes** | Auth check ภายในทุก route handler |
| **QR Generator** | next/dynamic lazy load (heavy library) |
| **date-fns** | Direct import หรือ optimizePackageImports |
| **lucide-react** | Direct import หรือ optimizePackageImports |

---

**Last Updated:** 2026-02-06
