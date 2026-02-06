---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
status: 'complete'
completedAt: '2026-02-05'
inputDocuments: ['product-brief-EnduroRaceManager-2026-02-05.md']
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 0
  projectDocs: 0
classification:
  projectType: 'web_app'
  domain: 'Sports/Event Management'
  complexity: 'medium'
  projectContext: 'greenfield'
---

# Product Requirements Document - EnduroRaceManager

**Author:** ครูA
**Date:** 2026-02-05
**Version:** 1.0 (MVP)

---

## Executive Summary

### Vision
ระบบจัดการแข่ง Enduro แบบครบวงจร ที่แทนที่ Google Sheets workflow ด้วย web application ที่รองรับ real-time results, multi-checkpoint timing, และ multi-class registration

### Product Differentiator
- **Real-time Results** - ผลการแข่งอัพเดททันทีผ่าน Supabase subscriptions
- **Simple Staff Interface** - รหัส 4 หลัก + ปุ่มใหญ่ = ใครก็ใช้ได้
- **Multi-Class Registration** - สมัครหลายรุ่นในครั้งเดียว คำนวณยอดอัตโนมัติ
- **Data Integrity** - Server timestamps + Audit trail = ไม่มีข้อโต้แย้ง

### Target Users
| User Type | Description |
|-----------|-------------|
| **Admin** | ผู้จัดงานแข่ง - สร้าง/จัดการ event ทั้งหมด |
| **Staff** | อาสาสมัครประจำ checkpoint - บันทึกเวลา |
| **Racer** | นักแข่ง - สมัครและดูผล |
| **Viewer** | คนดู/ครอบครัว - ดูผล real-time |

### Tech Stack
- **Frontend:** Next.js + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Real-time)
- **Hosting:** Vercel

---

## Success Criteria

### User Success

**Admin ประสบความสำเร็จเมื่อ:**
- สร้างงานแข่งใหม่ได้ภายใน 10 นาที
- จัดการรุ่น, checkpoint, และ staff access ได้ครบในหน้าเดียว
- ไม่ต้องเปิด Google Sheets อีกเลยตลอดงานแข่ง

**Staff ประสบความสำเร็จเมื่อ:**
- เข้าถึงหน้าจุดได้ด้วยรหัส 4 หลักภายใน 5 วินาที
- บันทึกเวลานักแข่งได้ด้วยการกด 2 ครั้ง (เลือกเบอร์ → กดบันทึก)
- ไม่ต้องถามวิธีใช้เพราะ UI ชัดเจน

**Racer ประสบความสำเร็จเมื่อ:**
- สมัครหลายรุ่นได้ในการกรอกครั้งเดียว
- เห็นยอดรวมคำนวณอัตโนมัติก่อนยืนยัน
- ดูผลการแข่งแบบ real-time ได้ทันทีที่เข้าหน้าผล

**Viewer ประสบความสำเร็จเมื่อ:**
- สแกน QR ที่สนาม → เห็นผลทันที ไม่ต้อง login
- ผลอัพเดทอัตโนมัติไม่ต้อง refresh

### Business Success

**สำหรับโปรเจกต์ส่วนตัวนี้:**
- ใช้งานจริงได้ในงานแข่งแรก
- ลดเวลาจัดการจาก Google Sheets ลง 50%+
- ไม่มีปัญหาเรื่องเวลาผิดพลาด/หาย

### Technical Success

| Metric | Target | วิธีวัด |
|--------|--------|---------|
| Real-time latency | < 2 วินาที | Supabase real-time subscription |
| Uptime วันแข่ง | 99%+ | Vercel status |
| Mobile responsive | ทุกขนาดจอ | Manual testing |
| Data integrity | 100% | Audit trail verification |

---

## Product Scope

### MVP (Must Have)

| หมวด | Features |
|------|----------|
| **Event Management** | สร้าง Event + slug + วันแข่ง + วันรับสมัคร |
| **Class Management** | รุ่น, ค่าสมัคร, รูปแบบเลข, checkpoint mapping |
| **Registration** | สมัครหลายรุ่น, คำนวณยอด, แนบสลิป, QR payment |
| **Checkpoint System** | รหัส 4 หลัก, timestamp, ป้องกันกดซ้ำ |
| **Results** | Real-time display, จัดอันดับตามเวลา |
| **Admin Tools** | DNF/Penalty, แก้ไขเวลา, audit trail |
| **QR Code System** | QR ดูผล + QR แชร์งาน |
| **Thermal Print** | บัตรนักแข่ง 80mm |

### Growth Features (Post-MVP)

| Feature | Priority |
|---------|----------|
| Export PDF/Excel | Medium |
| ประวัตินักแข่งข้ามงาน | Low |
| สถิติ/กราฟ | Low |

### Vision (Future)

- รองรับหลายประเภทการแข่ง (Motocross, Supercross)
- Integration กับ LINE สำหรับ notification
- Mobile app สำหรับ Staff (offline capability)

### MVP Strategy

**Approach:** Problem-Solving MVP - แก้ปัญหา Google Sheets workflow
**Resources:** Solo developer, Next.js + Supabase stack
**Timeline:** ก่อนงานแข่งถัดไป

### Risk Mitigation

| Risk Type | Risk | Mitigation |
|-----------|------|------------|
| Technical | Real-time sync failure | Supabase built-in retry |
| Technical | Poor connectivity | UI shows status + retry |
| Resource | Solo dev | Managed services (Supabase, Vercel) |

---

## User Journeys

### Journey 1: Admin - สร้างงานแข่งใหม่

**Persona:** ครูA - ผู้จัดงานแข่ง Enduro มืออาชีพ จัดงานเดือนละครั้ง

**Story:**
1. **Opening:** ครูA นั่งอยู่ที่บ้าน งานหน้าอีก 3 สัปดาห์ ต้องเปิดรับสมัคร
2. **Actions:**
   - กด "สร้างงานแข่งใหม่"
   - กรอกชื่องาน → ระบบ auto-generate slug
   - กำหนดวันแข่ง, วันเปิด-ปิดรับสมัคร
   - เพิ่มรุ่นการแข่ง 25 รุ่น (ค่าสมัคร, ช่วงเบอร์)
   - เพิ่ม checkpoint 5 จุด
   - กำหนด checkpoint mapping แต่ละรุ่น
   - อัพโหลด QR Code โอนเงิน
3. **Climax:** กดปุ่ม "เผยแพร่" → ได้ URL + QR Code สำหรับแชร์
4. **Resolution:** แชร์ลิงก์ใน LINE รอรับสมัครได้เลย

---

### Journey 2: Racer - สมัครแข่งหลายรุ่น

**Persona:** ดำ - นักแข่ง Enduro วัย 35 ปี ขับ Husqvarna 300TE

**Story:**
1. **Opening:** ดำเห็นโพสต์ในกลุ่ม LINE คลิกลิงก์จากมือถือ
2. **Actions:**
   - เห็นรายละเอียดงาน วันแข่ง
   - กรอกข้อมูล: ชื่อ, ทีม, รถ
   - เลือกรุ่น: OPEN 200cc+, Enduro รถนอก, 30ปีขึ้นไป, ท่องเที่ยว
   - ระบบคำนวณยอด: 2,000 บาท
   - โอนเงินผ่าน QR Code
   - แนบสลิป กดยืนยัน
3. **Climax:** ระบบแสดง "สมัครสำเร็จ! เบอร์รถ: 20"
4. **Resolution:** บันทึก screenshot รอวันแข่ง

---

### Journey 3: Staff - บันทึกเวลาที่ Checkpoint

**Persona:** หนุ่ม - เพื่อนของผู้จัด ไม่ถนัดเทคโนโลยี

**Story:**
1. **Opening:** วันแข่ง หนุ่มดูแล Checkpoint 2 ได้รับรหัส "4729"
2. **Actions:**
   - เปิด Chrome พิมพ์ URL
   - ใส่รหัส 4729 → เข้าหน้า Checkpoint 2
   - เห็นปุ่มตัวเลขใหญ่ + ปุ่ม "บันทึก" สีเขียว
   - นักแข่งเบอร์ 20 มาถึง
   - กด 0-2-0 แล้วกด "บันทึก"
3. **Climax:** กดบันทึกเบอร์ซ้ำ → ระบบแจ้ง "ไม่สามารถบันทึกซ้ำ"
4. **Resolution:** ทำงานได้ตลอดวันโดยไม่ต้องถามใคร

---

### Journey 4: Viewer - ดูผลการแข่งแบบ Real-time

**Persona:** แม่ของนักแข่ง - มาเชียร์ลูกที่สนาม

**Story:**
1. **Opening:** แม่เห็นป้าย QR Code ที่โต๊ะลงทะเบียน
2. **Actions:**
   - สแกน QR Code
   - เลือกรุ่น "OPEN 200cc+"
   - เห็นตารางผล: อันดับ, เบอร์, ชื่อ, เวลา
   - ลูกชาย (เบอร์ 20) อยู่อันดับ 5
   - ดูอยู่ 2 นาที → เวลา CP3 อัพเดท → ลูกชายขึ้นอันดับ 3!
3. **Climax:** เสียงเชียร์ดังทั้งสนาม ทุกคนเห็นผลพร้อมกัน
4. **Resolution:** ถ่ายรูปหน้าจอส่งกลุ่มครอบครัว

---

### Journey 5: Admin - จัดการ DNF และแก้ไขเวลา

**Persona:** ครูA - Admin วันแข่ง

**Story:**
1. **Opening:** Staff โทรมาบอกนักแข่งเบอร์ 15 รถพัง DNF ที่ CP2
2. **Actions:**
   - เปิดหน้า Admin "Race Control"
   - ค้นหาเบอร์ 15
   - กดปุ่ม "Mark as DNF"
   - ระบุเหตุผล: "รถพัง CP2"
   - บันทึก
3. **Climax:** ผลอัพเดททันที - เบอร์ 15 แสดง "DNF"
4. **Resolution:** Audit trail บันทึก: "Admin marked #015 as DNF"

---

### Journey Requirements Summary

| Journey | Required Capabilities |
|---------|----------------------|
| Admin - สร้างงาน | Event CRUD, Class config, Checkpoint setup, QR generation |
| Racer - สมัคร | Multi-class registration, Auto-calculate, Payment slip upload |
| Staff - บันทึกเวลา | 4-digit access, Large button UI, Timestamp, Duplicate prevention |
| Viewer - ดูผล | Public results page, Real-time updates, Filter by class |
| Admin - DNF | Race control panel, DNF/Penalty, Edit timestamps, Audit trail |

---

## Domain-Specific Requirements

### Data Integrity
- Timestamp accuracy เป็นหัวใจของระบบ - ต้องบันทึกเวลาจริงจาก server
- Audit trail สำหรับทุกการแก้ไข - ป้องกันข้อร้องเรียนและพิสูจน์ความโปร่งใส

### Real-time Synchronization
- Multiple Staff บันทึกพร้อมกันจากหลาย Checkpoint
- Supabase real-time subscriptions สำหรับ live results
- Conflict resolution: ใช้ server timestamp เป็น source of truth

### Mobile-First Outdoor Design
- UI ต้องมองเห็นได้กลางแดด (high contrast)
- ปุ่มขนาดใหญ่สำหรับใช้งานด้วยถุงมือ
- Graceful handling เมื่อสัญญาณไม่เสถียร

### Access Control Model
- 4-digit access code สำหรับ Staff (หมดอายุสิ้นวันแข่ง)
- Admin authentication ผ่าน Supabase Auth
- Row Level Security (RLS) ป้องกันการเข้าถึงข้าม Event

---

## Web App Specific Requirements

### Project-Type Overview
- **Architecture:** Single Page Application (SPA) with Next.js App Router
- **Hosting:** Vercel (edge deployment)
- **Backend:** Supabase (PostgreSQL + Auth + Real-time)

### Browser Support Matrix

| Browser | Priority | Minimum Version |
|---------|----------|-----------------|
| Chrome Mobile | Primary | Latest 2 versions |
| Safari iOS | Primary | iOS 15+ |
| Chrome Desktop | Secondary | Latest 2 versions |
| Safari Desktop | Secondary | Latest 2 versions |
| Firefox | Low | Latest version |

### Responsive Design
- **Mobile-first approach** - Staff และ Viewers ใช้มือถือเป็นหลัก
- **Breakpoints:**
  - Mobile: < 768px (Primary)
  - Tablet: 768px - 1024px
  - Desktop: > 1024px (Admin primarily)
- **Touch targets:** Minimum 48x48px สำหรับปุ่มสำคัญ

### Performance Targets

| Metric | Target | Priority |
|--------|--------|----------|
| First Contentful Paint | < 1.5s | High |
| Time to Interactive | < 3s | High |
| Real-time latency | < 2s | Critical |
| Lighthouse Performance | > 80 | Medium |

### SEO Strategy
- **Low priority** - ระบบใช้งานภายในเป็นหลัก
- Event pages: Basic meta tags สำหรับ social sharing
- Results pages: No index (dynamic content)
- QR code เป็นช่องทางหลักในการเข้าถึง

### Accessibility Level
- **Target:** WCAG 2.1 Level A (functional)
- High contrast mode สำหรับใช้งานกลางแจ้ง
- Large touch targets สำหรับถุงมือ
- Clear visual feedback สำหรับทุก action

---

## Functional Requirements

### Event Management

- FR1: Admin can create a new racing event with name, slug, and race date
- FR2: Admin can set registration open and close dates for an event
- FR3: Admin can upload payment QR code for an event
- FR4: Admin can publish/unpublish an event
- FR5: Admin can view list of all events they manage
- FR6: System generates unique URL slug for each event

### Class Management

- FR7: Admin can create multiple racing classes within an event
- FR8: Admin can configure class details (name, fee, number range, number format)
- FR9: Admin can map which checkpoints apply to each class
- FR10: Admin can edit or delete classes before registration closes

### Checkpoint Configuration

- FR11: Admin can create checkpoints for an event with name and order
- FR12: Admin can generate 4-digit access codes for each checkpoint
- FR13: Admin can set access code expiration (end of race day)
- FR14: Admin can regenerate access codes if compromised

### Racer Registration

- FR15: Racer can view event details and available classes without login
- FR16: Racer can register for multiple classes in single submission
- FR17: Racer can enter personal info (name, team, bike)
- FR18: Racer can see auto-calculated total registration fee
- FR19: Racer can upload payment slip as proof
- FR20: Racer receives assigned race number upon registration
- FR21: System assigns race numbers based on class configuration

### Staff Checkpoint Interface

- FR22: Staff can access checkpoint interface using 4-digit code
- FR23: Staff can see checkpoint name after authentication
- FR24: Staff can enter racer number using large numeric keypad
- FR25: Staff can record timestamp for a racer passing checkpoint
- FR26: System prevents duplicate timestamp for same racer at same checkpoint
- FR27: System records server timestamp (not device time)

### Results & Leaderboard

- FR28: Anyone can view live results without login
- FR29: Viewer can filter results by class
- FR30: Results display ranking, racer number, name, and checkpoint times
- FR31: Results update in real-time as timestamps are recorded
- FR32: System calculates rankings based on total time

### Race Control (Admin)

- FR33: Admin can view all racers and their current status
- FR34: Admin can mark racer as DNF (Did Not Finish) with reason
- FR35: Admin can add time penalty to a racer with reason
- FR36: Admin can edit recorded timestamps with reason
- FR37: System logs all admin actions to audit trail
- FR38: Admin can view audit trail for any racer

### QR Code & Sharing

- FR39: System generates QR code for event registration page
- FR40: System generates QR code for live results page
- FR41: Admin can download QR codes for printing

### Printing

- FR42: Admin can print racer card on 80mm thermal printer
- FR43: Racer card displays: number, name, team, bike, classes, QR to results

---

## Non-Functional Requirements

### Performance

| Requirement | Target | Context |
|-------------|--------|---------|
| Real-time result update | < 2 seconds | From timestamp record to viewer screen |
| Checkpoint UI response | < 500ms | Staff button press feedback |
| Page load (mobile 4G) | < 3 seconds | Results page for viewers |
| Concurrent viewers | 100+ | Race day peak at results page |
| Timestamp recording | < 1 second | Staff can rapidly record multiple racers |

### Security

| Requirement | Implementation |
|-------------|----------------|
| Admin authentication | Supabase Auth (email/password) |
| Staff access | 4-digit code with expiration (end of race day) |
| Data isolation | Row Level Security (RLS) - events isolated |
| Timestamp integrity | Server-generated timestamps only |
| Edit protection | Admin-only timestamp edits with mandatory reason |
| Audit trail | Immutable log of all data modifications |

### Reliability

| Requirement | Target | Mitigation |
|-------------|--------|------------|
| Race day uptime | 99%+ | Vercel edge deployment + Supabase managed |
| Data durability | 100% | No timestamp can be lost once recorded |
| Connection handling | Graceful | UI shows connection status, retries automatically |
| Backup | Daily | Supabase automatic backups |

### Data Integrity

| Requirement | Description |
|-------------|-------------|
| Timestamp source of truth | Server timestamp (NOW()), not device time |
| Duplicate prevention | Unique constraint on racer+checkpoint |
| Edit traceability | All changes logged with who, when, why |
| Referential integrity | Foreign keys enforced at database level |

