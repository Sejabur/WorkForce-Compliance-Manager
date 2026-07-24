-- WorkForce Compliance Manager PostgreSQL DDL Schema & Enterprise RBAC Policies
-- Target DB: Supabase PostgreSQL 15+

-- 1. Create Employees Table
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    max_weekly_hours INTEGER NOT NULL DEFAULT 40 CHECK (max_weekly_hours BETWEEN 1 AND 80),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Shifts Table
CREATE TABLE IF NOT EXISTS public.shifts (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    required_role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Published' CHECK (status IN ('Draft', 'Published')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Configurable Policy Engine Parameters Table
CREATE TABLE IF NOT EXISTS public.policies (
    id TEXT PRIMARY KEY DEFAULT 'corporate_policy_v1',
    max_weekly_hours INTEGER NOT NULL DEFAULT 40 CHECK (max_weekly_hours BETWEEN 1 AND 80),
    min_rest_hours INTEGER NOT NULL DEFAULT 10 CHECK (min_rest_hours BETWEEN 1 AND 24),
    max_consecutive_days INTEGER NOT NULL DEFAULT 7 CHECK (max_consecutive_days BETWEEN 1 AND 14),
    max_shifts_per_day INTEGER NOT NULL DEFAULT 1 CHECK (max_shifts_per_day BETWEEN 1 AND 4),
    enforce_role_coverage BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default Policy Row if Not Exists
INSERT INTO public.policies (id, max_weekly_hours, min_rest_hours, max_consecutive_days, max_shifts_per_day, enforce_role_coverage)
VALUES ('corporate_policy_v1', 40, 10, 7, 1, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. Enable Row Level Security (RLS) on All Tables (Enterprise Security Architecture)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

-- 5. Define Enterprise RBAC RLS Security Policies
-- Policy A: Read Access (Public / All Authenticated Users)
CREATE POLICY "Allow read access to workforce roster" ON public.employees
    FOR SELECT USING (true);

CREATE POLICY "Allow read access to shift schedules" ON public.shifts
    FOR SELECT USING (true);

CREATE POLICY "Allow read access to corporate policy thresholds" ON public.policies
    FOR SELECT USING (true);

-- Policy B: Operations Manager & Admin Write Access to Employees and Shifts
CREATE POLICY "Allow roster modifications for Manager and Admin roles" ON public.employees
    FOR ALL USING (auth.jwt() ->> 'role' IN ('Admin', 'Manager'));

CREATE POLICY "Allow shift modifications for Manager and Admin roles" ON public.shifts
    FOR ALL USING (auth.jwt() ->> 'role' IN ('Admin', 'Manager'));

-- Policy C: Exclusive Executive Admin Write Access to Corporate Policy Rules
CREATE POLICY "Allow policy configuration edits strictly for Executive Admin role" ON public.policies
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'Admin');

-- Create Performance Indexes for Fast Weekly Shift & Date Queries
CREATE INDEX IF NOT EXISTS idx_shifts_date ON public.shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_emp_date ON public.shifts(employee_id, shift_date);
