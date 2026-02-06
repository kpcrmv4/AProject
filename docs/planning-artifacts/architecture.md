---
stepsCompleted: ['step-01-init', 'step-02-context', 'step-03-starter', 'step-04-decisions', 'step-05-patterns', 'step-06-structure', 'step-07-validation', 'step-08-complete']
inputDocuments: ['prd.md', 'product-brief-EnduroRaceManager-2026-02-05.md', 'ux-design-specification.md']
workflowType: 'architecture'
project_name: 'EnduroRaceManager'
user_name: 'ครูA'
date: '2026-02-05'
status: 'complete'
---

# Architecture Decision Document - EnduroRaceManager

_เอกสารนี้กำหนดสถาปัตยกรรมและแนวทางการ implement สำหรับ AI agents เพื่อให้ทำงานร่วมกันได้อย่างสอดคล้อง_

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:** 43 FRs จัดกลุ่มเป็น 8 หมวด

| หมวด | จำนวน FR | ความซับซ้อน |
|------|----------|------------|
| Event Management | 6 FRs | Medium |
| Class Management | 4 FRs | Medium |
| Checkpoint Configuration | 4 FRs | Medium |
| Racer Registration | 7 FRs | High |
| Staff Checkpoint Interface | 6 FRs | Critical |
| Results & Leaderboard | 5 FRs | High |
| Race Control (Admin) | 6 FRs | High |
| QR Code & Printing | 5 FRs | Medium |

**Non-Functional Requirements:**

| Category | Key Requirements |
|----------|-----------------|
| **Performance** | Real-time < 2s, UI response < 500ms |
| **Security** | 4-digit Staff code, RLS, Audit trail |
| **Reliability** | 99%+ uptime race day, 100% data durability |
| **Data Integrity** | Server timestamps, duplicate prevention |

### Scale & Complexity

- **Primary domain:** Full-stack Web Application
- **Complexity level:** Medium
- **Estimated components:** ~30 React components, ~15 API routes, ~10 DB tables
- **Real-time features:** Live leaderboard, timestamp sync
- **Multi-tenancy:** Event-based isolation via RLS

### Technical Constraints & Dependencies

| Constraint | Impact |
|------------|--------|
| **Tech Stack Fixed** | Next.js + Tailwind + Supabase + Vercel |
| **Mobile-first** | Outdoor use, large touch targets |
| **Solo developer** | Managed services only |
| **Real-time required** | Supabase subscriptions |

### Cross-Cutting Concerns

1. **Authentication** - Admin (Supabase Auth) + Staff (4-digit code)
2. **Authorization** - RLS per event
3. **Real-time sync** - All timestamp and result updates
4. **Audit logging** - All admin actions
5. **Error handling** - Graceful degradation for connectivity

---

## Starter Template Evaluation

### Primary Technology Domain

**Full-stack Web Application** with Next.js App Router

### Starter Options Considered

| Option | Pros | Cons |
|--------|------|------|
| `create-next-app` | Official, minimal | No DB setup |
| `create-t3-app` | Full-stack, type-safe | Heavier, learning curve |
| **`create-next-app` + manual Supabase** | Match PRD exactly | Manual setup |

### Selected Starter: create-next-app

**Rationale:**
1. PRD specifies Next.js + Supabase (not Prisma/tRPC)
2. Solo developer - simpler is better
3. Supabase provides its own type generation
4. shadcn/ui จาก UX spec รองรับ Next.js

**Initialization Command:**

```bash
npx create-next-app@latest enduro-race-manager --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Then add dependencies:
npm install @supabase/supabase-js @supabase/ssr
npx shadcn@latest init
```

### Architectural Decisions Provided by Starter

| Decision | Value |
|----------|-------|
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS |
| **Build Tool** | Next.js (Turbopack dev) |
| **Routing** | App Router |
| **Directory** | src/ directory enabled |
| **Import Alias** | @/* |

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Database schema design
- Authentication flow
- Real-time subscription architecture

**Important Decisions (Shape Architecture):**
- State management approach
- API route organization
- Component architecture

### Data Architecture

**Database:** Supabase PostgreSQL

**Schema Design:**

```sql
-- Core tables
events (id, slug, name, race_date, registration_opens, registration_closes, payment_qr_url, published, admin_id)
classes (id, event_id, name, fee, number_start, number_end, number_format)
checkpoints (id, event_id, name, order, access_code, code_expires_at)
class_checkpoints (class_id, checkpoint_id) -- mapping

-- Registration
racers (id, event_id, name, team, bike, created_at)
racer_classes (racer_id, class_id, race_number, payment_slip_url, confirmed)

-- Timing
timestamps (id, checkpoint_id, racer_id, recorded_at, recorded_by)
audit_logs (id, event_id, action, target_type, target_id, old_value, new_value, reason, admin_id, created_at)

-- Admin actions
dnf_records (id, racer_id, checkpoint_id, reason, created_at)
penalties (id, racer_id, seconds, reason, created_at)
```

**Data Validation:** Zod schemas + Database constraints

**Migration Approach:** Supabase migrations via CLI

### Authentication & Security

**Authentication Method:**

| User Type | Method | Implementation |
|-----------|--------|----------------|
| **Admin** | Supabase Auth | Email/Password |
| **Staff** | 4-digit code | Custom validation + session |
| **Racer/Viewer** | None | Public access |

**Authorization Pattern:**

```typescript
// Row Level Security
-- Events: admin can manage their events
CREATE POLICY "admin_events" ON events
  USING (admin_id = auth.uid());

-- Timestamps: staff with valid code
CREATE POLICY "staff_timestamps" ON timestamps
  USING (checkpoint_id IN (SELECT id FROM checkpoints WHERE access_code = current_setting('app.access_code')));
```

**Security Middleware:**
- Supabase middleware for admin routes
- Custom staff code validation middleware

### API & Communication

**API Design:** Next.js Route Handlers (REST-like)

**API Routes Structure:**

```
/api/
├── events/
│   ├── route.ts          # GET (list), POST (create)
│   └── [slug]/
│       ├── route.ts      # GET, PUT, DELETE
│       ├── classes/
│       ├── checkpoints/
│       └── racers/
├── staff/
│   ├── auth/route.ts     # POST (validate code)
│   └── timestamp/route.ts # POST (record)
├── results/
│   └── [slug]/route.ts   # GET (public)
└── admin/
    ├── dnf/route.ts
    └── penalty/route.ts
```

**Error Handling Standard:**

```typescript
// API Response Format
type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string } }

// HTTP Status Usage
200 - Success
201 - Created
400 - Validation error
401 - Unauthorized
403 - Forbidden
404 - Not found
500 - Server error
```

### Frontend Architecture

**State Management:** React Context + Supabase Realtime

| State Type | Solution |
|------------|----------|
| **Server state** | Supabase client + React Query (optional) |
| **Auth state** | Supabase Auth context |
| **UI state** | React useState/useReducer |
| **Real-time** | Supabase subscriptions |

**Component Architecture:**
- Feature-based organization
- Compound components สำหรับ complex UI
- Server Components เป็น default
- Client Components เฉพาะที่จำเป็น (interactivity)

### Infrastructure & Deployment

**Hosting:** Vercel (automatic from GitHub)

**Environment Configuration:**

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**CI/CD:** Vercel automatic deployment
- Preview deployments for PRs
- Production deployment on main branch

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database Naming:**

| Element | Convention | Example |
|---------|------------|---------|
| Tables | snake_case, plural | `events`, `racers` |
| Columns | snake_case | `race_date`, `admin_id` |
| Foreign keys | `{table}_id` | `event_id`, `racer_id` |
| Indexes | `idx_{table}_{column}` | `idx_events_slug` |

**API Naming:**

| Element | Convention | Example |
|---------|------------|---------|
| Routes | kebab-case, plural | `/api/events`, `/api/race-control` |
| Parameters | camelCase | `eventSlug`, `racerId` |
| Query params | camelCase | `?classId=1&status=active` |

**Code Naming:**

| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `NumberPad`, `LeaderboardRow` |
| Files | PascalCase for components | `NumberPad.tsx` |
| Hooks | camelCase with use prefix | `useEventData`, `useRealtime` |
| Utils | camelCase | `formatTime`, `calculateRank` |
| Types | PascalCase | `Event`, `Racer`, `Timestamp` |
| Constants | SCREAMING_SNAKE | `MAX_CLASSES`, `DEFAULT_TIMEOUT` |

### Structure Patterns

**Component Organization:**

```
components/
├── ui/           # shadcn/ui components
├── forms/        # Form components
├── features/     # Feature-specific components
│   ├── events/
│   ├── registration/
│   ├── checkpoint/
│   └── results/
└── layout/       # Layout components
```

**Test Organization:**

```
__tests__/
├── components/   # Component tests
├── api/          # API route tests
├── lib/          # Utility tests
└── e2e/          # End-to-end tests
```

### Format Patterns

**API Response Format:**

```typescript
// Success
{ data: { ... }, error: null }

// Error
{ data: null, error: { code: "VALIDATION_ERROR", message: "..." } }
```

**Date Format:**
- Database: ISO 8601 string
- API: ISO 8601 string
- Display: Thai locale format

**JSON Field Naming:** camelCase in API responses

### Communication Patterns

**Real-time Subscriptions:**

```typescript
// Naming: {table}:{event}
'timestamps:INSERT'
'timestamps:UPDATE'
'racers:INSERT'
```

**State Update Pattern:**
- Optimistic updates สำหรับ user actions
- Revert on error
- Show pending state

### Process Patterns

**Error Handling:**

```typescript
// Component level
try {
  await action()
  toast.success("บันทึกสำเร็จ")
} catch (error) {
  toast.error(getErrorMessage(error))
}

// API level
if (!valid) {
  return NextResponse.json(
    { data: null, error: { code: "VALIDATION_ERROR", message: "..." } },
    { status: 400 }
  )
}
```

**Loading States:**
- Skeleton screens for initial load
- Inline spinners for actions
- Optimistic UI for real-time

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
enduro-race-manager/
├── README.md
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── components.json              # shadcn/ui config
├── .env.local
├── .env.example
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Landing/redirect
│   │   │
│   │   ├── (public)/                   # Public routes (no auth)
│   │   │   ├── [slug]/
│   │   │   │   ├── page.tsx            # Event info + registration
│   │   │   │   └── results/
│   │   │   │       └── page.tsx        # Live results
│   │   │   └── staff/
│   │   │       └── [code]/
│   │   │           └── page.tsx        # Staff checkpoint interface
│   │   │
│   │   ├── (admin)/                    # Admin routes (auth required)
│   │   │   ├── layout.tsx              # Admin layout with auth check
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── events/
│   │   │   │   ├── page.tsx            # Event list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx        # Create event
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx        # Event detail
│   │   │   │       ├── classes/
│   │   │   │       ├── checkpoints/
│   │   │   │       ├── racers/
│   │   │   │       └── race-control/
│   │   │   │           └── page.tsx
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   │
│   │   └── api/
│   │       ├── events/
│   │       │   ├── route.ts
│   │       │   └── [slug]/
│   │       │       ├── route.ts
│   │       │       ├── classes/route.ts
│   │       │       ├── checkpoints/route.ts
│   │       │       └── racers/route.ts
│   │       ├── staff/
│   │       │   ├── auth/route.ts
│   │       │   └── timestamp/route.ts
│   │       ├── results/
│   │       │   └── [slug]/route.ts
│   │       └── admin/
│   │           ├── dnf/route.ts
│   │           ├── penalty/route.ts
│   │           └── timestamp/route.ts
│   │
│   ├── components/
│   │   ├── ui/                         # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── toast.tsx
│   │   │
│   │   ├── custom/                     # Custom components from UX spec
│   │   │   ├── NumberPad.tsx
│   │   │   ├── LiveBadge.tsx
│   │   │   ├── HistoryStrip.tsx
│   │   │   ├── LeaderboardRow.tsx
│   │   │   └── ClassSelector.tsx
│   │   │
│   │   ├── features/
│   │   │   ├── events/
│   │   │   │   ├── EventCard.tsx
│   │   │   │   ├── EventForm.tsx
│   │   │   │   └── EventList.tsx
│   │   │   ├── registration/
│   │   │   │   ├── RegistrationForm.tsx
│   │   │   │   └── PaymentUpload.tsx
│   │   │   ├── checkpoint/
│   │   │   │   ├── CheckpointInterface.tsx
│   │   │   │   └── TimestampList.tsx
│   │   │   ├── results/
│   │   │   │   ├── Leaderboard.tsx
│   │   │   │   └── ClassFilter.tsx
│   │   │   └── admin/
│   │   │       ├── RaceControl.tsx
│   │   │       ├── DNFModal.tsx
│   │   │       └── AuditLog.tsx
│   │   │
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── AdminNav.tsx
│   │       └── Footer.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Browser client
│   │   │   ├── server.ts               # Server client
│   │   │   ├── middleware.ts           # Auth middleware
│   │   │   └── types.ts                # Generated types
│   │   ├── utils/
│   │   │   ├── format.ts               # Date/time formatting
│   │   │   ├── calculate.ts            # Ranking calculations
│   │   │   └── validation.ts           # Zod schemas
│   │   └── hooks/
│   │       ├── useRealtime.ts
│   │       ├── useStaffAuth.ts
│   │       └── useEventData.ts
│   │
│   ├── types/
│   │   ├── database.ts                 # Supabase generated types
│   │   ├── api.ts                      # API types
│   │   └── index.ts                    # Re-exports
│   │
│   └── middleware.ts                   # Next.js middleware
│
├── supabase/
│   ├── config.toml
│   ├── seed.sql
│   └── migrations/
│       ├── 00001_initial_schema.sql
│       ├── 00002_rls_policies.sql
│       └── 00003_functions.sql
│
├── public/
│   ├── favicon.ico
│   └── images/
│
└── __tests__/
    ├── components/
    ├── api/
    └── e2e/
```

### Architectural Boundaries

**API Boundaries:**

| Boundary | Public | Staff | Admin |
|----------|--------|-------|-------|
| Event info | ✅ | ✅ | ✅ |
| Registration | ✅ | - | ✅ |
| Timestamps | - | ✅ (own CP) | ✅ |
| Race control | - | - | ✅ |
| Results | ✅ | ✅ | ✅ |

**Data Boundaries:**
- RLS enforces event isolation
- Staff can only access assigned checkpoint
- Admin can only access own events

### Requirements to Structure Mapping

| Feature | Components | API Routes | DB Tables |
|---------|------------|------------|-----------|
| Event Management | `features/events/` | `/api/events/` | `events`, `classes`, `checkpoints` |
| Registration | `features/registration/` | `/api/events/[slug]/racers/` | `racers`, `racer_classes` |
| Staff Checkpoint | `custom/NumberPad`, `features/checkpoint/` | `/api/staff/` | `timestamps` |
| Live Results | `custom/LeaderboardRow`, `features/results/` | `/api/results/` | View |
| Race Control | `features/admin/` | `/api/admin/` | `dnf_records`, `penalties`, `audit_logs` |

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
- Next.js + Supabase + Vercel = proven stack
- shadcn/ui + Tailwind = seamless integration
- TypeScript throughout = type safety

**Pattern Consistency:**
- Naming conventions consistent across DB/API/Code
- Component patterns align with React best practices
- Real-time patterns leverage Supabase natively

### Requirements Coverage Validation ✅

| FR Category | Coverage | Notes |
|-------------|----------|-------|
| Event Management | ✅ Complete | FR1-FR6 mapped to `/api/events/` |
| Class Management | ✅ Complete | FR7-FR10 mapped to classes routes |
| Checkpoint Config | ✅ Complete | FR11-FR14 mapped to checkpoints routes |
| Registration | ✅ Complete | FR15-FR21 mapped to registration |
| Staff Interface | ✅ Complete | FR22-FR27 mapped to staff routes |
| Results | ✅ Complete | FR28-FR32 mapped to results + realtime |
| Race Control | ✅ Complete | FR33-FR38 mapped to admin routes |
| QR/Printing | ✅ Complete | FR39-FR43 mapped to utility functions |

### Implementation Readiness Validation ✅

**AI Agent Guidelines:**

1. ทำตาม architectural decisions ทุกข้อ
2. ใช้ naming patterns ที่กำหนด
3. เคารพ project structure และ boundaries
4. ใช้เอกสารนี้เป็น reference หลัก

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Security considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

---

## Implementation Handoff

### First Implementation Priority

```bash
# 1. Create Next.js project
npx create-next-app@latest enduro-race-manager --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# 2. Initialize Supabase
npx supabase init

# 3. Initialize shadcn/ui
npx shadcn@latest init

# 4. Add Supabase client
npm install @supabase/supabase-js @supabase/ssr
```

### Implementation Order

1. **Phase 1:** Database schema + Supabase setup
2. **Phase 2:** Admin auth + Event CRUD
3. **Phase 3:** Staff checkpoint interface (NumberPad)
4. **Phase 4:** Registration flow
5. **Phase 5:** Live results + Real-time
6. **Phase 6:** Race control + Audit

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-05 | Initial Architecture Document |

---

*เอกสารนี้กำหนดสถาปัตยกรรมที่สมบูรณ์สำหรับ EnduroRaceManager ใช้เป็น reference หลักสำหรับการ implement ทั้งหมด*
