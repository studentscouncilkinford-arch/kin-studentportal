# Kinford Student Portal

Admin-first, Supabase-backed student management and academic results portal for Kinford.

## 🚀 Stack & Technologies

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide Icons
- **Database & Backend**: [Supabase](https://supabase.com/) (PostgreSQL + Row-Level Security)
- **Notifications**: Sonner

---

## 🎨 Design System

- **Background**: Pure White (`#FFFFFF`)
- **Primary Accent**: Maroon (`#A22538`) with darker maroon hover (`#851b2c`)
- **Secondary Accent**: Gold (`#EEB540`)
- **Sidebar**: Fixed ~250px left sidebar, active maroon indicator + tint, mobile collapsible drawer
- **Cards**: Clean white cards with `border-gray-200` and subtle shadows

---

## 🔐 Admin Authentication

The portal features a client-side admin gate protecting all routes:
- **Admin Password**: `kinkin99`
- Redirects to `/dashboard` upon login.
- Protected routes redirect unauthenticated visitors to `/`.

---

## 📦 Features & Pages

1. **Login Page (`/`)**: Centered card with Kinford branding, single password input with visibility toggle, inline error messages.
2. **Dashboard (`/dashboard`)**:
   - Welcome Admin banner
   - 4 Stat Cards: Total Students, Total Classes, Results Published, Pending Reviews
   - Quick action shortcuts
   - Recent Activity log section
3. **Users Page (`/users`)**:
   - Live students table with Class, Roll Number, and Status badge
   - Search bar filtering by name, roll number, or class
   - Add Student modal with dynamic Class selector and status toggle
   - Edit Student modal
   - Delete Student confirmation dialog
4. **Classes Page (`/classes`)**:
   - Academic class cards displaying Name, Section, and Student Count
   - Add Class & Edit Class modal
   - Interactive class card: click any card to view all students enrolled in that class
   - Delete Class confirmation
5. **Results Page (`/results`)**:
   - Academic results table with student names, subjects, scores, and grade badges
   - Dynamic filters by Class and Subject, plus search query
   - Add Result form with searchable Student selector, subject, score, auto/manual grade calculation, and date
   - Edit & Delete result actions
   - Disabled "Bulk Upload — Coming Soon" placeholder

---

## 🗄️ Supabase Database Schema

```sql
-- Classes table
CREATE TABLE classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  section TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Students table
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  roll_number TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Results table
CREATE TABLE results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  score NUMERIC,
  grade TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row-Level Security
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all classes" ON classes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all students" ON students FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all results" ON results FOR ALL USING (true) WITH CHECK (true);
```

---

## 🛠️ Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://erpldcmiqeffqcjacxzr.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ZFw6dLN5D9M_8FmNwRTs7w_454FZ_5-
   DATABASE_URL=postgresql://postgres:TsKSCkinfEODUD@db.erpldcmiqeffqcjacxzr.supabase.co:5432/postgres
   ```

3. **Run database migration (if needed)**:
   ```bash
   npm run db:migrate
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.
