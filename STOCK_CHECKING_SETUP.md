# Stock Checking System - Setup & Usage Guide

## Overview
Complete stock checking system for Pen-Key Déli-caf using OpenAI Vision to scan handwritten stock sheets. Generates pull lists, prep needs, and orders in ~10 minutes.

## Features Implemented

### 1. Database Schema
**Migration:** `017_stock_checking.sql`

**Tables:**
- `items` - Master list with par levels, thresholds, suppliers
- `stock_sessions` - Tracks each stock check session
- `stock_counts` - Parsed counts from scans
- `stock_current` - Source of truth for current stock
- `stock_movements` - Audit log of freezer→service transfers

**Two-Bucket System:**
- Freezer items: `freezer_count` + `service_count`
- Non-freezer items: `service_count` only

### 2. User Flow

**Main Page:** `/ops/stock-checking`
- Dynamic button changes based on session status
- Progress indicator (Print → Scan → Apply)
- Reset and manual entry options

**Workflow:**
1. **Start Session** → Creates new session
2. **Download Template** → Generates PDF with QR code
3. **Print & Fill** → Staff writes counts by hand
4. **Scan Sheet** → Camera capture with quality checks
5. **Review** → Edit flagged items (low confidence)
6. **Apply** → Updates stock, generates lists
7. **View Results** → Tonight/Morning/Prep/Orders/Bulk tabs

### 3. PDF Template Generator
**Route:** `/api/stock-checking/generate-pdf`

**Features:**
- A4 format with QR code for scanning
- Corner markers for alignment
- Sections: Freezer (Bulk), Service/Fridge, Dry/Retail
- Item ID in brackets for AI parsing
- Large count boxes for handwriting

**Dependencies:** `pdfkit`, `qrcode`

### 4. Camera Scan & AI Parsing
**Page:** `/ops/stock-checking/[session_id]/scan`
**API:** `/api/stock-checking/scan`

**Quality Checks:**
- Brightness threshold (50-230)
- Blur detection (variance of Laplacian)
- Image downscaling (1920px, JPEG 0.75)

**OpenAI Integration:**
- Model: `gpt-4o-mini` (vision)
- `store: false` - Images NOT stored
- Strict JSON schema with confidence scores
- Validates item_ids against database

**Response Format:**
```json
{
  "confidence": 0.95,
  "counts": {
    "FREEZER": { "FRZ_HOG_PORK_PORT": 15 },
    "SERVICE": { "FRZ_HOG_PORK_PORT": 8 }
  },
  "row_confidence": { ... },
  "issues": [...]
}
```

### 5. Review & Edit
**Page:** `/ops/stock-checking/[session_id]/review`

**Features:**
- Show flagged items (confidence < 0.75) by default
- Toggle to show all items
- +/- buttons and direct input for editing
- Confidence indicators
- Batch apply to stock_current

### 6. Apply & Calculate
**API:** `/api/stock-checking/apply`

**Calculations:**

**A) Tonight Pull (Defrost)**
- Items with `pull_timing = 'night_before'`
- `pull_qty = min(service_par_tomorrow - service_count, freezer_count)`
- Warnings if insufficient freezer stock

**B) Morning Pull**
- Items with `pull_timing = 'morning'`
- Same calculation as tonight pull

**C) Prep List**
- All items where `service_count < service_par_tomorrow`
- Shows current, target, and prep_needed

**D) Order List**
- `total_on_hand = freezer_count + service_count`
- `order_needed = max(0, order_par - total_on_hand)`
- Grouped by supplier

**E) Bulk Prep Triggers**
- Items where `freezer_count < bulk_trigger_level`
- `batches_needed = ceil((trigger - current) / batch_yield)`

### 7. Results Page
**Page:** `/ops/stock-checking/[session_id]/results`

**Tabs:**
- **Tonight** - Defrost items with "Confirm Pulled" buttons
- **Morning** - Morning pull items
- **Prep** - Service targets and prep needs
- **Orders** - Grouped by supplier
- **Bulk Prep** - Low freezer warnings with batch calculations

**Confirm Pull:**
- Records movement in `stock_movements`
- Updates `stock_current` (freezer → service)
- Prevents negative stock

### 8. Admin Interface
**Page:** `/ops/stock-checking/admin`

**Features:**
- CRUD for items
- Edit par levels, thresholds, suppliers
- Set pull timing, batch yields
- Sort order for sheet ordering
- Active/inactive toggle

### 9. Manual Entry Fallback
**Page:** `/ops/stock-checking/[session_id]/manual`

**Features:**
- Simple form for all items
- Direct number input
- Saves as `source: 'manual'` with confidence 1.0
- Proceeds to review page

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Setup Steps

### 1. Run Migration
```sql
-- In Supabase SQL Editor
-- Run: supabase/migrations/017_stock_checking.sql
```

### 2. Install Dependencies
```bash
npm install pdfkit qrcode openai @types/pdfkit @types/qrcode
```

### 3. Enable pg_cron (Optional)
For future scheduled tasks, enable in Supabase Dashboard:
Database > Extensions > pg_cron

### 4. Seed Items
Use admin interface at `/ops/stock-checking/admin` or run:
```sql
INSERT INTO items (item_id, name, location, unit, supplier, is_freezer_item, service_par_tomorrow, order_par, pull_timing, batch_yield, sort_order)
VALUES
  ('FRZ_HOG_PORK', 'Hog Roast Pork', 'freezer', 'portions', 'butcher', true, 20, 50, 'night_before', 12, 1),
  ('SVC_MILK', 'Milk Bottles', 'fridge', 'bottles', 'dairy', false, 12, 20, 'morning', 0, 2);
```

### 5. Initialize Stock Current
```sql
INSERT INTO stock_current (item_id, freezer_count, service_count)
SELECT item_id, 0, 0 FROM items WHERE active = true
ON CONFLICT (item_id) DO NOTHING;
```

## Usage Tips

### For Best Scan Results:
1. Use good, even lighting (no shadows/glare)
2. Keep sheet flat with all corners visible
3. Hold camera steady directly above
4. Ensure handwriting is clear and legible
5. Use dark pen/marker for contrast

### Par Level Guidelines:
- **Service Par Tomorrow:** Target ready-for-service for next day
- **Order Par:** Minimum total on hand (service + freezer)
- **Freezer Low Threshold:** Warning level for freezer bucket
- **Bulk Trigger Level:** When to schedule bulk prep batches
- **Batch Yield:** How many portions per batch cook

### Pull Timing:
- **Night Before:** Items that need overnight defrost
- **Morning:** Items that can be pulled same-day

## Troubleshooting

### Scan Quality Issues
- **Too dark:** Improve lighting
- **Too bright:** Reduce glare, move away from direct light
- **Blurry:** Hold camera steady, ensure focus
- **Low confidence:** Use manual entry or rescan

### Missing Items on Sheet
- Check `active = true` in items table
- Verify `sort_order` for sheet ordering
- Regenerate PDF template

### Incorrect Calculations
- Verify par levels in admin interface
- Check `stock_current` values
- Ensure item configuration (is_freezer_item, pull_timing)

## Mobile-First Design
- Large tap targets (min 44px)
- Single column layouts
- Sticky headers
- Bottom-fixed action buttons
- Responsive typography
- Touch-friendly controls

## Security Notes
- Images never stored (OpenAI `store: false`)
- RLS policies on all tables
- Service role key for server-side operations
- Authenticated users only

## Future Enhancements
- Barcode scanning for items
- Historical trend analysis
- Waste tracking integration
- Automated ordering (API to suppliers)
- Multi-site support
- Scheduled reminders (pg_cron)
