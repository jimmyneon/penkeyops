# Penkey Ops — Café Operations & Compliance App

A mobile-first Progressive Web App (PWA) for café operations management, built with Next.js, Supabase, and Tailwind CSS.

## 🎯 Purpose

Penkey Ops replaces paper checklists and ensures all daily operational, hygiene, and compliance tasks are completed on time. The system guides staff behavior through structure and reminders, not surveillance.

**Core Principle:** Make doing the right thing easier than ignoring it.

## ✨ Key Features

### For Staff
- **Shift Management** - Start/complete opening, mid, and closing shifts
- **Template-Driven Checklists** - Progressive task flow with priority levels (P1/P2/P3)
- **Temperature Logging** - Quick entry for fridge temps, hot holding, probe calibration
- **Quick Actions** - Fast access to common tasks (temp logs, incident reports, deliveries, waste)
- **Real-time Updates** - Live task status across devices
- **Mobile-First Design** - Large touch targets, clear typography, optimized for arm's length viewing

### For Admins
- **Template Builder** - Create and manage reusable checklists
- **Schedule Management** - Set due times, grace periods, dependencies
- **Compliance Reports** - Export data for EHJ inspections
- **User Management** - Assign roles and sites
- **Audit Trail** - Complete history of all actions (no deletions allowed)

### System Features
- **PWA Installable** - Add to home screen on mobile devices
- **Offline Capable** - Queue submissions when offline, sync when back online
- **Magic Link Auth** - Passwordless login via email
- **Shared Device Mode** - Quick staff switching after initial login
- **Push Notifications** - Jittered reminders for overdue tasks
- **Row-Level Security** - Data isolation per site via Supabase RLS

## 🛠 Tech Stack

- **Frontend:** Next.js 15 (App Router), React, TypeScript
- **Styling:** Tailwind CSS, Poppins font
- **Backend:** Supabase (PostgreSQL, Auth, RLS, Edge Functions)
- **Deployment:** Vercel
- **Icons:** Lucide React
- **Date Handling:** date-fns

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd penkey-ops
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Project Settings > API
   - Copy your Project URL and anon/public key

4. **Configure environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. **Run database migrations**
   
   In your Supabase SQL Editor, run the migration files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_helper_functions.sql`

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open the app**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
penkey-ops/
├── app/                      # Next.js App Router pages
│   ├── auth/                # Authentication pages
│   ├── page.tsx             # Staff dashboard
│   └── layout.tsx           # Root layout with PWA metadata
├── components/
│   ├── staff/               # Staff-facing components
│   │   ├── ShiftControls.tsx
│   │   ├── TaskList.tsx
│   │   ├── TemperatureLog.tsx
│   │   └── QuickActions.tsx
│   └── ui/                  # Reusable UI components
│       ├── Button.tsx
│       └── Card.tsx
├── hooks/                   # Custom React hooks
│   ├── useUser.ts
│   └── useShiftSession.ts
├── lib/
│   └── supabase/           # Supabase client configuration
│       ├── client.ts
│       ├── server.ts
│       └── middleware.ts
├── supabase/
│   └── migrations/         # Database schema and migrations
├── types/
│   └── database.ts         # TypeScript database types
├── utils/                  # Utility functions
│   ├── cn.ts              # Class name merger
│   └── date.ts            # Date formatting helpers
├── public/
│   └── manifest.json      # PWA manifest
└── middleware.ts          # Auth middleware
```

## 🗄 Database Schema

### Core Tables
- **users** - Staff and admin accounts
- **sites** - Café locations
- **shift_sessions** - Opening/closing shift records
- **templates** - Reusable checklist templates
- **template_items** - Individual tasks within templates
- **checklist_instances** - Active checklists for a shift
- **checklist_results** - Task completion records
- **log_entries** - Temperature, safety, delivery logs
- **incidents** - Issue reports
- **notifications** - Push notification queue
- **audit_trail** - Complete action history

### Key Features
- **Enums:** user_role, priority_level, evidence_type, task_status
- **RLS Policies:** Site-based data isolation
- **Helper Functions:** Checklist creation, shift validation, overdue task detection
- **Triggers:** Auto-update timestamps, audit trail creation

## 🎨 Design System

### Colors
- **Primary (Orange):** `#FF6B35` - Action buttons, highlights
- **Navy:** `#1A2332` - Structure, navigation, text
- **Teal:** `#2A9D8F` - Secondary actions
- **Cream:** `#F8F5F2` - Background (warm, non-clinical)
- **Black:** `#000000` - High-contrast text

### Typography
- **Font:** Poppins (300, 400, 500, 600, 700)
- **Approach:** Large, readable at arm's length

### Touch Targets
- Minimum 44px × 44px for all interactive elements
- Generous padding and spacing

## 🔐 Authentication Flow

1. User enters email on `/auth/login`
2. Supabase sends magic link email
3. User clicks link → redirected to `/auth/callback`
4. Callback exchanges code for session
5. User redirected to `/` (staff dashboard)

### Shared Device Mode
After first login, staff can quickly switch users without re-authenticating (implementation pending).

## 📱 PWA Configuration

The app is installable as a Progressive Web App:

- **Manifest:** `/public/manifest.json`
- **Theme Color:** Orange (`#FF6B35`)
- **Display Mode:** Standalone
- **Orientation:** Portrait
- **Background:** Cream (`#F8F5F2`)

### Installing on Mobile
1. Open the app in a mobile browser
2. Tap the browser menu
3. Select "Add to Home Screen"
4. The app will open in fullscreen mode

## 🔄 Shift Workflow

1. **Start Shift** - Staff selects shift type (opening/mid/closing)
2. **Auto-Create Checklists** - System generates tasks from templates
3. **Complete Tasks** - Staff works through prioritized list
4. **Log Temperatures** - Quick access via Quick Actions
5. **Complete Shift** - Only allowed when all critical tasks done

## 📊 Task Priority System

- **P1 (High):** Critical safety/compliance tasks
- **P2 (Medium):** Important operational tasks
- **P3 (Low):** Nice-to-have tasks

Tasks can be:
- **Completed** - Marked done with optional evidence
- **Blocked** - Cannot complete with reason
- **Pending** - Not yet started
- **Overdue** - Past due time + grace period

## 🚧 Roadmap / Pending Features

- [ ] Admin dashboard and template builder UI
- [ ] Incident reporting form
- [ ] Delivery check logging
- [ ] Waste logging
- [ ] Web Push notifications (VAPID setup)
- [ ] Offline sync queue
- [ ] CSV/PDF export for compliance
- [ ] Shared device quick-switch
- [ ] Photo evidence upload
- [ ] Weekly/monthly recurring templates

## 🧪 Testing

```bash
# Run linter
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## 📦 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production
```env
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For setup assistance, see `SETUP.md` or contact your administrator.

---

**Built with ❤️ for café teams who deserve better tools.**
