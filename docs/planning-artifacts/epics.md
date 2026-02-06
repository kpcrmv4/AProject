---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
status: 'complete'
inputDocuments: ['prd.md', 'architecture.md', 'ux-design-specification.md']
workflowType: 'epics'
project_name: 'EnduroRaceManager'
user_name: 'ครูA'
date: '2026-02-05'
---

# Epics & Stories - EnduroRaceManager

**Author:** ครูA
**Date:** 2026-02-05
**Version:** 1.0 (MVP)

---

## Requirements Summary

### Functional Requirements (43 FRs)

#### Event Management (FR1-FR6)
- FR1: Admin can create a new racing event with name, slug, and race date
- FR2: Admin can set registration open and close dates for an event
- FR3: Admin can upload payment QR code for an event
- FR4: Admin can publish/unpublish an event
- FR5: Admin can view list of all events they manage
- FR6: System generates unique URL slug for each event

#### Class Management (FR7-FR10)
- FR7: Admin can create multiple racing classes within an event
- FR8: Admin can configure class details (name, fee, number range, number format)
- FR9: Admin can map which checkpoints apply to each class
- FR10: Admin can edit or delete classes before registration closes

#### Checkpoint Configuration (FR11-FR14)
- FR11: Admin can create checkpoints for an event with name and order
- FR12: Admin can generate 4-digit access codes for each checkpoint
- FR13: Admin can set access code expiration (end of race day)
- FR14: Admin can regenerate access codes if compromised

#### Racer Registration (FR15-FR21)
- FR15: Racer can view event details and available classes without login
- FR16: Racer can register for multiple classes in single submission
- FR17: Racer can enter personal info (name, team, bike)
- FR18: Racer can see auto-calculated total registration fee
- FR19: Racer can upload payment slip as proof
- FR20: Racer receives assigned race number upon registration
- FR21: System assigns race numbers based on class configuration

#### Staff Checkpoint Interface (FR22-FR27)
- FR22: Staff can access checkpoint interface using 4-digit code
- FR23: Staff can see checkpoint name after authentication
- FR24: Staff can enter racer number using large numeric keypad
- FR25: Staff can record timestamp for a racer passing checkpoint
- FR26: System prevents duplicate timestamp for same racer at same checkpoint
- FR27: System records server timestamp (not device time)

#### Results & Leaderboard (FR28-FR32)
- FR28: Anyone can view live results without login
- FR29: Viewer can filter results by class
- FR30: Results display ranking, racer number, name, and checkpoint times
- FR31: Results update in real-time as timestamps are recorded
- FR32: System calculates rankings based on total time

#### Race Control (FR33-FR38)
- FR33: Admin can view all racers and their current status
- FR34: Admin can mark racer as DNF (Did Not Finish) with reason
- FR35: Admin can add time penalty to a racer with reason
- FR36: Admin can edit recorded timestamps with reason
- FR37: System logs all admin actions to audit trail
- FR38: Admin can view audit trail for any racer

#### QR Code & Printing (FR39-FR43)
- FR39: System generates QR code for event registration page
- FR40: System generates QR code for live results page
- FR41: Admin can download QR codes for printing
- FR42: Admin can print racer card on 80mm thermal printer
- FR43: Racer card displays: number, name, team, bike, classes, QR to results

### Non-Functional Requirements

#### Performance
- Real-time result update < 2 seconds
- Checkpoint UI response < 500ms
- Page load (mobile 4G) < 3 seconds
- Concurrent viewers 100+
- Timestamp recording < 1 second

#### Security
- Admin authentication via Supabase Auth
- Staff access via 4-digit code with expiration
- Data isolation via Row Level Security (RLS)
- Server-generated timestamps only
- Immutable audit trail

#### Reliability
- Race day uptime 99%+
- 100% data durability
- Graceful connection handling with auto-retry
- Daily automatic backups

### Additional Requirements (from Architecture & UX)

#### Architecture Requirements
- Next.js 14+ with App Router
- Supabase PostgreSQL + Auth + Real-time
- TypeScript strict mode
- shadcn/ui component library
- Vercel deployment

#### UX Requirements
- Mobile-first outdoor design
- 48px minimum touch targets (64px for Staff)
- WCAG AAA contrast for outdoor visibility
- "Tap-Tap-Done" Staff interface
- Optimistic UI with pending states
- Real-time LiveBadge status indicator

#### Custom Components Required
- NumberPad (Staff timestamp input)
- LiveBadge (Connection status)
- HistoryStrip (Recent recordings)
- LeaderboardRow (Animated rankings)
- ClassSelector (Multi-select registration)

---

## Epic Overview

| Epic | Name | Priority | FRs Covered | Complexity |
|------|------|----------|-------------|------------|
| E1 | Foundation & Setup | P0 | - | Medium |
| E2 | Event Management | P0 | FR1-FR6 | Medium |
| E3 | Class & Checkpoint Configuration | P0 | FR7-FR14 | High |
| E4 | Staff Checkpoint Interface | P0 | FR22-FR27 | Critical |
| E5 | Racer Registration | P1 | FR15-FR21 | High |
| E6 | Live Results & Leaderboard | P1 | FR28-FR32 | High |
| E7 | Race Control & Admin | P1 | FR33-FR38 | Medium |
| E8 | QR Codes & Printing | P2 | FR39-FR43 | Low |

---

## Epic 1: Foundation & Setup

**Goal:** ตั้งค่าโครงสร้างพื้นฐานของระบบ รวมถึง database schema, authentication, และ project structure

**User Value:** เป็นรากฐานที่จำเป็นเพื่อให้ระบบทำงานได้

### Stories

#### E1-S1: Project Initialization

**Story:** As a developer, I want to initialize the project with the correct stack so that development can begin

**Acceptance Criteria:**
```gherkin
Given the project requirements
When I initialize the project
Then Next.js 14+ is set up with TypeScript and App Router
And Tailwind CSS is configured
And shadcn/ui is initialized
And Supabase client is configured
And environment variables are set up
And project structure follows architecture document
```

**Technical Notes:**
- Use `create-next-app@latest` with TypeScript, Tailwind, App Router, src directory
- Initialize shadcn/ui with default configuration
- Configure Supabase client and server utilities
- Set up environment variables template

---

#### E1-S2: Database Schema Setup

**Story:** As a developer, I want to create the database schema so that data can be stored properly

**Acceptance Criteria:**
```gherkin
Given the Supabase project
When I run migrations
Then all tables are created (events, classes, checkpoints, class_checkpoints, racers, racer_classes, timestamps, audit_logs, dnf_records, penalties)
And foreign keys are properly configured
And indexes are created for frequently queried columns
And unique constraints prevent duplicate data
```

**Technical Notes:**
- Create migrations in `supabase/migrations/`
- Include proper indexes on `events.slug`, `timestamps(checkpoint_id, racer_id)`
- Add unique constraint on `timestamps(checkpoint_id, racer_id)`

---

#### E1-S3: Row Level Security Policies

**Story:** As a developer, I want to implement RLS policies so that data is properly isolated

**Acceptance Criteria:**
```gherkin
Given RLS is enabled
When an admin queries events
Then they only see their own events

Given a staff member with valid code
When they record timestamps
Then they can only write to their assigned checkpoint

Given a public user
When they view results
Then they can read but not modify data
```

**Technical Notes:**
- Admin policies based on `auth.uid() = admin_id`
- Staff policies based on valid checkpoint access code
- Public read policies for events, results

---

#### E1-S4: Admin Authentication

**Story:** As an admin, I want to log in securely so that I can manage my events

**Acceptance Criteria:**
```gherkin
Given I am on the admin login page
When I enter valid email and password
Then I am authenticated via Supabase Auth
And redirected to the admin dashboard
And my session is persisted

Given I am not authenticated
When I try to access admin routes
Then I am redirected to the login page
```

**Technical Notes:**
- Use Supabase Auth with email/password
- Implement middleware for protected routes
- Store session in cookies via `@supabase/ssr`

---

## Epic 2: Event Management

**Goal:** Admin สามารถสร้างและจัดการงานแข่งขันได้

**User Value:** ผู้จัดงานสามารถสร้างและเผยแพร่งานแข่งได้อย่างรวดเร็ว

**FRs Covered:** FR1, FR2, FR3, FR4, FR5, FR6

### Stories

#### E2-S1: Create Event

**Story:** As an admin, I want to create a new racing event so that racers can register

**Acceptance Criteria:**
```gherkin
Given I am logged in as admin
When I fill in event name "Enduro Challenge 2026"
Then system auto-generates slug "enduro-challenge-2026"
And I can set race date

When I set registration dates
Then I can set open date and close date
And close date must be before or equal to race date

When I submit the form
Then event is created in database
And I am redirected to event detail page
```

**Technical Notes:**
- Auto-generate slug from name using slugify
- Validate date logic (open < close <= race)
- Create in `/api/events/` POST route

---

#### E2-S2: Upload Payment QR Code

**Story:** As an admin, I want to upload a payment QR code so that racers can pay registration fees

**Acceptance Criteria:**
```gherkin
Given I am on event settings page
When I upload a QR code image
Then image is stored in Supabase Storage
And URL is saved to event record

When racers view registration page
Then they see the payment QR code
```

**Technical Notes:**
- Use Supabase Storage for image upload
- Accept PNG, JPG formats
- Resize/compress if needed

---

#### E2-S3: Publish/Unpublish Event

**Story:** As an admin, I want to publish my event so that it becomes visible to racers

**Acceptance Criteria:**
```gherkin
Given I have created an event
When I click "Publish"
Then event status changes to published
And event is visible at public URL /{slug}

Given event is published
When I click "Unpublish"
Then event is no longer visible publicly
And existing registrations remain intact
```

**Technical Notes:**
- Toggle `published` boolean field
- Public routes check `published = true`

---

#### E2-S4: View Event List

**Story:** As an admin, I want to see all my events so that I can manage them

**Acceptance Criteria:**
```gherkin
Given I am on admin dashboard
When events are loaded
Then I see list of my events with name, date, status
And events are sorted by race date (upcoming first)
And I can click to view event details
```

**Technical Notes:**
- Query events where `admin_id = auth.uid()`
- Include racer count aggregate
- Show published/draft status badge

---

## Epic 3: Class & Checkpoint Configuration

**Goal:** Admin สามารถกำหนดรุ่นการแข่งขันและ checkpoint ได้

**User Value:** ระบบรองรับหลายรุ่น หลาย checkpoint ตาม format งานแข่งจริง

**FRs Covered:** FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14

### Stories

#### E3-S1: Create Racing Classes

**Story:** As an admin, I want to create racing classes so that racers can register for specific categories

**Acceptance Criteria:**
```gherkin
Given I am on event configuration page
When I add a new class
Then I can enter class name, fee, number range start, number range end
And I can select number format (e.g., "001", "1", "A001")

When I have multiple classes
Then I can reorder them by drag-drop
And I can edit or delete classes (if no registrations)
```

**Technical Notes:**
- Store in `classes` table with `event_id` foreign key
- Number range used for auto-assignment
- Prevent delete if `racer_classes` exist

---

#### E3-S2: Create Checkpoints

**Story:** As an admin, I want to create checkpoints so that times can be recorded at each station

**Acceptance Criteria:**
```gherkin
Given I am on event configuration page
When I add a checkpoint
Then I can enter checkpoint name and order
And system generates a 4-digit access code

When I view checkpoints
Then I see all checkpoints with their access codes
And I can regenerate any compromised code
```

**Technical Notes:**
- Generate random 4-digit code (1000-9999)
- Store `code_expires_at` as end of race day (23:59:59)
- Allow regeneration which invalidates old code

---

#### E3-S3: Map Classes to Checkpoints

**Story:** As an admin, I want to map which checkpoints apply to each class so that different classes can have different routes

**Acceptance Criteria:**
```gherkin
Given I have classes and checkpoints
When I configure checkpoint mapping
Then I can select which checkpoints apply to each class
And this affects which times are used for ranking

When a checkpoint is not mapped to a class
Then timestamps for that class at that checkpoint are ignored in ranking
```

**Technical Notes:**
- Store in `class_checkpoints` junction table
- Used in ranking calculation query

---

#### E3-S4: Manage Access Code Expiration

**Story:** As an admin, I want access codes to expire at end of race day so that security is maintained

**Acceptance Criteria:**
```gherkin
Given a checkpoint has an access code
When code expiration is reached
Then staff cannot use that code to access the checkpoint

Given I need to extend access
When I regenerate the code
Then new code is created with new expiration
```

**Technical Notes:**
- Check `code_expires_at >= NOW()` in validation
- Default expiration: race_date 23:59:59

---

## Epic 4: Staff Checkpoint Interface

**Goal:** Staff สามารถบันทึกเวลานักแข่งได้อย่างรวดเร็วและถูกต้อง

**User Value:** การบันทึกเวลาที่รวดเร็ว ง่าย ไม่ต้องเรียนรู้

**FRs Covered:** FR22, FR23, FR24, FR25, FR26, FR27

**Priority:** CRITICAL - หัวใจของระบบ

### Stories

#### E4-S1: Staff Code Authentication

**Story:** As a staff member, I want to access my checkpoint using a 4-digit code so that I can start recording

**Acceptance Criteria:**
```gherkin
Given I am on the staff access page
When I enter a valid 4-digit code
Then I am granted access to the associated checkpoint
And I see the checkpoint name displayed
And my session is saved for the day

Given I enter an invalid or expired code
When I submit
Then I see an error message "รหัสไม่ถูกต้องหรือหมดอายุ"
And I can retry
```

**Technical Notes:**
- Validate against `checkpoints` table
- Check `code_expires_at >= NOW()`
- Store checkpoint_id in session/cookie

---

#### E4-S2: Number Pad Interface

**Story:** As a staff member, I want to enter racer numbers using a large number pad so that I can record quickly even with gloves

**Acceptance Criteria:**
```gherkin
Given I am on the checkpoint interface
When I see the number pad
Then buttons are at least 64px × 64px
And display shows entered number in large font (48px)

When I tap number buttons
Then the number appears in display
And I feel haptic feedback (if supported)

When I tap backspace
Then last digit is removed

When I tap clear
Then display is cleared
```

**Technical Notes:**
- Use NumberPad custom component from UX spec
- 64px minimum button size
- JetBrains Mono font for numbers
- Haptic via Vibration API

---

#### E4-S3: Record Timestamp

**Story:** As a staff member, I want to record a timestamp when a racer passes so that their time is captured

**Acceptance Criteria:**
```gherkin
Given I have entered racer number "053"
When I tap the green checkmark button
Then timestamp is recorded with server time (not device time)
And green flash animation plays
And haptic feedback fires
And number moves to history strip
And display clears for next entry

Given I successfully recorded
When I look at history strip
Then I see "053 ✓" as most recent entry
And I see sync status (synced/pending)
```

**Technical Notes:**
- POST to `/api/staff/timestamp/`
- Server uses `NOW()` for timestamp
- Optimistic UI: show success immediately
- Queue failed requests for retry

---

#### E4-S4: Prevent Duplicate Timestamps

**Story:** As a staff member, I want the system to prevent duplicate entries so that data integrity is maintained

**Acceptance Criteria:**
```gherkin
Given racer 053 already has a timestamp at my checkpoint
When I try to record 053 again
Then system shows error "เบอร์ 053 บันทึกแล้ว"
And error is displayed clearly (red, shake animation)
And display is NOT cleared (allow correction)

Given the duplicate prevention
When I review audit trail
Then original timestamp remains unchanged
```

**Technical Notes:**
- Unique constraint on `timestamps(checkpoint_id, racer_id)`
- Return 409 Conflict from API
- Show modal with existing timestamp info

---

#### E4-S5: History Strip with Undo

**Story:** As a staff member, I want to see recent recordings and undo mistakes so that errors can be corrected quickly

**Acceptance Criteria:**
```gherkin
Given I have recorded several racers
When I look at history strip
Then I see last 5 entries with number and status
And entries animate in from right

Given I made a mistake within 5 seconds
When I tap on the entry
Then I see undo option
And if I undo, the timestamp is deleted
And entry is removed from history

Given more than 5 seconds passed
When I tap on the entry
Then undo is not available
And message shows "ติดต่อ Admin เพื่อแก้ไข"
```

**Technical Notes:**
- HistoryStrip custom component
- 5 second undo window
- Undo requires DELETE to `/api/staff/timestamp/[id]`

---

#### E4-S6: Connection Status Indicator

**Story:** As a staff member, I want to see connection status so that I know if my recordings are syncing

**Acceptance Criteria:**
```gherkin
Given I am on checkpoint interface
When connection is good
Then LiveBadge shows green "LIVE" with pulse animation

When connection is lost
When I record a timestamp
Then LiveBadge shows amber "SYNCING"
And timestamp is queued locally
And system auto-retries

When connection is restored
Then queued timestamps sync
And LiveBadge returns to green "LIVE"
And history entries update from pending to synced
```

**Technical Notes:**
- LiveBadge custom component
- Use navigator.onLine + periodic ping
- Queue in IndexedDB or localStorage

---

## Epic 5: Racer Registration

**Goal:** นักแข่งสามารถสมัครแข่งหลายรุ่นได้ในครั้งเดียว

**User Value:** การสมัครที่ง่าย รวดเร็ว ไม่ต้อง login

**FRs Covered:** FR15, FR16, FR17, FR18, FR19, FR20, FR21

### Stories

#### E5-S1: View Event Details (Public)

**Story:** As a racer, I want to view event details without logging in so that I can decide to register

**Acceptance Criteria:**
```gherkin
Given event is published
When I access /{slug}
Then I see event name, date, location description
And I see list of available classes with fees
And I see registration deadline
And I do NOT need to log in
```

**Technical Notes:**
- Public route `app/(public)/[slug]/page.tsx`
- Check `published = true`
- Show countdown to registration close

---

#### E5-S2: Multi-Class Registration

**Story:** As a racer, I want to register for multiple classes at once so that I don't have to fill forms repeatedly

**Acceptance Criteria:**
```gherkin
Given I am on registration form
When I select multiple classes using checkboxes
Then total fee auto-calculates and displays
And I see breakdown of selected classes

When I change selection
Then total updates immediately (no page reload)
```

**Technical Notes:**
- ClassSelector custom component
- Real-time total calculation
- Minimum 1 class required validation

---

#### E5-S3: Enter Personal Information

**Story:** As a racer, I want to enter my details once so that I can complete registration

**Acceptance Criteria:**
```gherkin
Given I am on registration form
When I enter my details
Then I can fill: name (required), team (optional), bike (optional)
And form validates on blur and submit
And errors show inline under fields

When I submit with valid data
Then my information is saved
```

**Technical Notes:**
- Use Zod for validation
- Store in `racers` table
- Phone/email optional for MVP

---

#### E5-S4: Auto-Calculate Total Fee

**Story:** As a racer, I want to see the total fee calculated automatically so that I know how much to pay

**Acceptance Criteria:**
```gherkin
Given I have selected classes
When I view the fee section
Then I see itemized list of selected classes with individual fees
And I see total sum
And total updates instantly when selection changes
```

**Technical Notes:**
- Sum fees from selected classes
- Display in Thai Baht format (฿)
- Sticky at bottom of form on mobile

---

#### E5-S5: Upload Payment Slip

**Story:** As a racer, I want to upload my payment slip so that my registration can be confirmed

**Acceptance Criteria:**
```gherkin
Given I have filled registration form
When I upload payment slip image
Then image is uploaded to Supabase Storage
And I see preview of uploaded image
And I can replace if wrong image

When I submit registration
Then slip URL is saved with my registration
```

**Technical Notes:**
- Accept PNG, JPG, HEIC
- Max file size 5MB
- Compress if needed before upload

---

#### E5-S6: Receive Race Number

**Story:** As a racer, I want to receive my race number upon registration so that I know my assigned number

**Acceptance Criteria:**
```gherkin
Given I submitted registration successfully
When registration is created
Then system assigns race number based on class configuration
And I see success screen with my number displayed large
And I can save/screenshot the confirmation

Given I registered for multiple classes
When numbers are assigned
Then I may get same number for all classes (if ranges overlap)
Or different numbers per class (if ranges don't overlap)
```

**Technical Notes:**
- Auto-assign from class number range
- Start from lowest available in range
- Store in `racer_classes.race_number`

---

## Epic 6: Live Results & Leaderboard

**Goal:** ทุกคนสามารถดูผลการแข่งแบบ real-time ได้

**User Value:** ความตื่นเต้นจากการเห็นผลสดๆ อัพเดททันที

**FRs Covered:** FR28, FR29, FR30, FR31, FR32

### Stories

#### E6-S1: Public Results Page

**Story:** As a viewer, I want to view live results without logging in so that I can follow the race

**Acceptance Criteria:**
```gherkin
Given event has results
When I access /{slug}/results
Then I see leaderboard with rankings
And I do NOT need to log in
And page works on mobile

When no results yet
Then I see "รอผลการแข่งขัน" with auto-refresh indicator
```

**Technical Notes:**
- Public route `app/(public)/[slug]/results/page.tsx`
- Initial load from server
- Supabase subscription for updates

---

#### E6-S2: Filter by Class

**Story:** As a viewer, I want to filter results by class so that I can see specific categories

**Acceptance Criteria:**
```gherkin
Given I am on results page
When I tap class filter
Then I see list of available classes
And I can select one class to filter

When class is selected
Then leaderboard shows only that class
And URL updates to /{slug}/results?class={classId}
And filter persists on refresh
```

**Technical Notes:**
- Use Tabs component for class filter
- Update URL query param
- Initial class from URL or "All"

---

#### E6-S3: Display Rankings

**Story:** As a viewer, I want to see clear rankings so that I understand race positions

**Acceptance Criteria:**
```gherkin
Given results are displayed
When I view leaderboard
Then I see: rank, race number, racer name, checkpoint times, total time
And rankings are sorted by total time (fastest first)
And DNF racers shown at bottom with DNF badge

When race is ongoing
Then I see which checkpoint each racer last passed
```

**Technical Notes:**
- LeaderboardRow custom component
- Calculate total time from checkpoints mapped to class
- Show gap to leader for 2nd place onwards

---

#### E6-S4: Real-time Updates

**Story:** As a viewer, I want results to update automatically so that I see changes immediately

**Acceptance Criteria:**
```gherkin
Given I am viewing results
When a new timestamp is recorded
Then my view updates within 2 seconds
And updated row highlights briefly (yellow flash)
And if rank changes, row animates to new position

When I lose connection
Then LiveBadge shows offline status
And message shows "กำลังเชื่อมต่อใหม่..."
And reconnects automatically
```

**Technical Notes:**
- Supabase real-time subscription on `timestamps` table
- LeaderboardRow animation on rank change
- Reconnection logic with exponential backoff

---

#### E6-S5: Calculate Rankings

**Story:** As the system, I want to calculate rankings accurately so that results are correct

**Acceptance Criteria:**
```gherkin
Given racer has timestamps at mapped checkpoints
When ranking is calculated
Then total time = sum of (checkpoint time - start time) for mapped checkpoints
And racers sorted by total time ascending

Given racer has penalty
When ranking is calculated
Then penalty seconds are added to total time

Given racer is DNF
When ranking is calculated
Then racer is excluded from ranking and shown at bottom
```

**Technical Notes:**
- Calculation in database view or function
- Consider only checkpoints mapped to racer's class
- Handle missing checkpoints (still racing)

---

## Epic 7: Race Control & Admin

**Goal:** Admin สามารถควบคุมการแข่งและแก้ไขข้อมูลได้

**User Value:** ความยืดหยุ่นในการจัดการและแก้ไขปัญหาระหว่างแข่ง

**FRs Covered:** FR33, FR34, FR35, FR36, FR37, FR38

### Stories

#### E7-S1: View All Racers Status

**Story:** As an admin, I want to see all racers and their current status so that I can monitor the race

**Acceptance Criteria:**
```gherkin
Given I am on race control page
When data loads
Then I see all racers with: number, name, class(es), current checkpoint, status
And I can search by number or name
And I can filter by class or status

When a racer passes checkpoint
Then their status updates in real-time
```

**Technical Notes:**
- Admin route `app/(admin)/events/[slug]/race-control/page.tsx`
- Real-time subscription for updates
- Status: "Racing", "Finished", "DNF"

---

#### E7-S2: Mark Racer as DNF

**Story:** As an admin, I want to mark a racer as DNF so that they are excluded from rankings

**Acceptance Criteria:**
```gherkin
Given I am on race control
When I select a racer and click "Mark DNF"
Then modal appears asking for reason
And reason is required

When I submit with reason
Then racer is marked as DNF
And results update immediately
And audit log entry is created
```

**Technical Notes:**
- Store in `dnf_records` table
- Require `reason` field
- Create audit log entry

---

#### E7-S3: Add Time Penalty

**Story:** As an admin, I want to add time penalties so that rule violations are reflected in results

**Acceptance Criteria:**
```gherkin
Given I am on race control
When I select a racer and click "Add Penalty"
Then modal appears with: seconds input, reason input
And both are required

When I submit penalty
Then penalty is saved
And racer's total time is recalculated
And audit log entry is created
```

**Technical Notes:**
- Store in `penalties` table
- Penalty added to total time in ranking calc
- Support multiple penalties per racer

---

#### E7-S4: Edit Recorded Timestamps

**Story:** As an admin, I want to edit timestamps so that recording errors can be corrected

**Acceptance Criteria:**
```gherkin
Given I am on race control
When I view a racer's timestamps
Then I can click edit on any timestamp

When I change the timestamp
Then I must provide a reason
And new value is saved
And old value is preserved in audit log
And results recalculate immediately
```

**Technical Notes:**
- Store original in `audit_logs.old_value`
- Update `timestamps` record
- Recalculate rankings

---

#### E7-S5: Audit Trail

**Story:** As an admin, I want to view audit trail so that all changes are traceable

**Acceptance Criteria:**
```gherkin
Given I am on race control
When I view a racer's audit history
Then I see all admin actions: edits, DNF, penalties
And each entry shows: action, old value, new value, reason, admin, timestamp

When I need to review decisions
Then audit trail provides complete history
```

**Technical Notes:**
- Query `audit_logs` by racer_id
- Include admin user info
- Immutable (no delete/edit of audit logs)

---

## Epic 8: QR Codes & Printing

**Goal:** สร้าง QR codes และพิมพ์บัตรนักแข่ง

**User Value:** การเข้าถึงที่สะดวก และบัตรจริงสำหรับวันแข่ง

**FRs Covered:** FR39, FR40, FR41, FR42, FR43

### Stories

#### E8-S1: Generate Event QR Codes

**Story:** As an admin, I want to generate QR codes so that racers can easily access the event

**Acceptance Criteria:**
```gherkin
Given I have an event
When I request QR codes
Then system generates: registration QR, results QR
And QR codes encode full URLs
And I can preview QR codes on screen
```

**Technical Notes:**
- Use qrcode library to generate
- Registration: `{domain}/{slug}`
- Results: `{domain}/{slug}/results`

---

#### E8-S2: Download QR Codes

**Story:** As an admin, I want to download QR codes so that I can print them for the event

**Acceptance Criteria:**
```gherkin
Given QR codes are generated
When I click download
Then I get high-resolution PNG files
And files are sized for print (300dpi)
And filenames are descriptive (event-registration-qr.png)
```

**Technical Notes:**
- Generate at 1000x1000px minimum
- Include event name as label below QR
- ZIP if multiple files

---

#### E8-S3: Print Racer Card (Thermal 80mm)

**Story:** As an admin, I want to print racer cards so that racers have physical identification

**Acceptance Criteria:**
```gherkin
Given a racer is registered
When I click print card
Then system generates card layout for 80mm thermal printer
And card shows: race number (large), name, team, bike, class(es)
And card includes QR code to results page

When I print
Then card fits 80mm width
And prints correctly on thermal printer
```

**Technical Notes:**
- Generate HTML optimized for 80mm width (~302px at 96dpi)
- Use browser print API
- Test with common thermal printers (Xprinter, etc.)

---

#### E8-S4: Batch Print Cards

**Story:** As an admin, I want to print multiple cards at once so that registration day is efficient

**Acceptance Criteria:**
```gherkin
Given I have multiple registered racers
When I select multiple racers
Then I can batch print their cards
And cards print one per page/receipt
And I can filter which racers to print (confirmed only, by class, etc.)
```

**Technical Notes:**
- Generate multi-page print layout
- Page break between cards
- Progress indicator for large batches

---

## Implementation Priority

### Phase 1: MVP Core (P0)
1. **E1**: Foundation & Setup (all stories)
2. **E4**: Staff Checkpoint Interface (all stories) - CRITICAL
3. **E2**: Event Management (E2-S1, E2-S3, E2-S4)
4. **E3**: Class & Checkpoint Configuration (E3-S1, E3-S2, E3-S3)

### Phase 2: Complete MVP (P1)
5. **E5**: Racer Registration (all stories)
6. **E6**: Live Results & Leaderboard (all stories)
7. **E7**: Race Control & Admin (all stories)

### Phase 3: Polish (P2)
8. **E2**: Event Management (E2-S2 - Payment QR)
9. **E3**: Class & Checkpoint Configuration (E3-S4)
10. **E8**: QR Codes & Printing (all stories)

---

## Story Points Summary

| Epic | Stories | Total Points |
|------|---------|--------------|
| E1: Foundation | 4 | 13 |
| E2: Event Management | 4 | 8 |
| E3: Class & Checkpoint | 4 | 10 |
| E4: Staff Checkpoint | 6 | 21 |
| E5: Racer Registration | 6 | 15 |
| E6: Live Results | 5 | 13 |
| E7: Race Control | 5 | 13 |
| E8: QR & Printing | 4 | 8 |
| **Total** | **38** | **101** |

---

## Cross-Epic Dependencies

```
E1 (Foundation) ──┬──> E2 (Event Management)
                  │
                  ├──> E3 (Class & Checkpoint)
                  │
                  └──> E4 (Staff Checkpoint)

E2 + E3 ──────────┬──> E5 (Registration)
                  │
                  └──> E4 (Staff Checkpoint)

E4 + E5 ──────────────> E6 (Results)

E6 ───────────────────> E7 (Race Control)

E2 + E5 ──────────────> E8 (QR & Printing)
```

---

## Technical Notes

### Database Schema Summary

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `events` | Event master | id, slug, name, race_date, admin_id, published |
| `classes` | Racing categories | id, event_id, name, fee, number_start, number_end |
| `checkpoints` | Timing stations | id, event_id, name, order, access_code, code_expires_at |
| `class_checkpoints` | Class-CP mapping | class_id, checkpoint_id |
| `racers` | Registered racers | id, event_id, name, team, bike |
| `racer_classes` | Racer-class registration | racer_id, class_id, race_number, payment_slip_url |
| `timestamps` | Time recordings | id, checkpoint_id, racer_id, recorded_at |
| `audit_logs` | Admin action log | id, action, target_type, target_id, old_value, new_value, reason |
| `dnf_records` | DNF markers | id, racer_id, reason |
| `penalties` | Time penalties | id, racer_id, seconds, reason |

### API Routes Summary

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/events` | GET, POST | List/Create events |
| `/api/events/[slug]` | GET, PUT, DELETE | Event CRUD |
| `/api/events/[slug]/classes` | GET, POST | Class management |
| `/api/events/[slug]/checkpoints` | GET, POST | Checkpoint management |
| `/api/events/[slug]/racers` | GET, POST | Registration |
| `/api/staff/auth` | POST | Staff code validation |
| `/api/staff/timestamp` | POST, DELETE | Record/Undo timestamp |
| `/api/results/[slug]` | GET | Public results |
| `/api/admin/dnf` | POST | Mark DNF |
| `/api/admin/penalty` | POST | Add penalty |
| `/api/admin/timestamp/[id]` | PUT | Edit timestamp |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-05 | Initial Epics & Stories Document |

---

*เอกสารนี้กำหนด Epics และ Stories ที่สมบูรณ์สำหรับ EnduroRaceManager ใช้เป็น reference หลักสำหรับการ implement และ sprint planning*
