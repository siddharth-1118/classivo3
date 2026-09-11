-- ==========================================
-- CLASSIVO CUSTOM TIMETABLE & CLASS TIMING PERSISTENCE TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_custom_classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_key TEXT UNIQUE NOT NULL,
    custom_classes JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookup by student key / email / registration number
CREATE INDEX IF NOT EXISTS idx_user_custom_classes_key ON public.user_custom_classes (student_key);

-- Enable RLS
ALTER TABLE public.user_custom_classes ENABLE ROW LEVEL SECURITY;

-- Allow public/authenticated read and write (keyed by student_key)
CREATE POLICY "Allow public read custom classes" 
    ON public.user_custom_classes 
    FOR SELECT 
    USING (true);

CREATE POLICY "Allow public insert/update custom classes" 
    ON public.user_custom_classes 
    FOR ALL 
    USING (true)
    WITH CHECK (true);
