-- ========================================================
-- ⚠️ MASTER SETUP FOR SRM NEST / RATIO-D DATABASE
-- Paste this entire script into your Supabase SQL Editor and hit RUN.
-- This will wipe the public schema and create all tables cleanly.
-- ========================================================

-- 1. Wipe public schema for clean install
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 2. USERS TABLE
CREATE TABLE users (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT,
  year TEXT,
  campus TEXT,
  phone_number TEXT,
  profile_photo TEXT,
  hostel_status TEXT,
  trust_score INTEGER DEFAULT 50,
  
  -- Cache columns for Academia sync caching
  attendance_cache JSONB DEFAULT '[]',
  marks_cache JSONB DEFAULT '[]',
  timetable_cache JSONB DEFAULT '[]',
  courses_cache JSONB DEFAULT '[]',
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ITEMS TABLE (Lost & Found Feed)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('LOST', 'FOUND')),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  photo_url TEXT,
  location TEXT NOT NULL,
  campus TEXT,
  date_time TIMESTAMP WITH TIME ZONE,
  contact_preference TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Claimed', 'Resolved')),
  verification_question TEXT,
  verification_answer TEXT,
  user_email TEXT REFERENCES users(email) ON DELETE CASCADE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  final_claimer_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CLAIMS TABLE (When someone clicks "This is mine")
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  claimer_email TEXT REFERENCES users(email) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. MESSAGES TABLE (Chat between poster and claimer)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  sender_email TEXT REFERENCES users(email) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. PUSH SUBSCRIPTIONS TABLE
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES users(email) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_subscription UNIQUE (user_email, subscription)
);

-- 7. FEEDBACK TABLE
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID,
  claim_id UUID,
  user_email TEXT,
  role TEXT CHECK (role IN ('poster', 'claimer')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  resolution_type TEXT CHECK (resolution_type IN ('handed_over', 'found_it')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. GEARLEND ITEMS TABLE
CREATE TABLE gearlend_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email TEXT REFERENCES users(email) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  photos TEXT[] DEFAULT '{}',
  condition TEXT NOT NULL CHECK (condition IN ('Like New', 'Good', 'Acceptable')),
  available_until TIMESTAMP WITH TIME ZONE,
  location TEXT NOT NULL,
  return_conditions TEXT,
  deposit_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Available' CHECK (status IN ('Available', 'Requested', 'Lent', 'Repair', 'Withdrawn')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. GEARLEND REQUESTS TABLE
CREATE TABLE gearlend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES gearlend_items(id) ON DELETE CASCADE,
  borrower_email TEXT REFERENCES users(email) ON DELETE CASCADE,
  duration TEXT NOT NULL,
  purpose TEXT,
  pickup_time TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Declined', 'PickedUp', 'Returned', 'Cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. GEARLEND REVIEWS TABLE (For Trust Score calculation)
CREATE TABLE gearlend_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES gearlend_requests(id) ON DELETE CASCADE,
  reviewer_email TEXT REFERENCES users(email) ON DELETE CASCADE,
  reviewee_email TEXT REFERENCES users(email) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  was_on_time BOOLEAN DEFAULT TRUE,
  item_condition_after TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. PROJECTMATE PROJECTS TABLE
CREATE TABLE projectmate_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_email TEXT REFERENCES users(email) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  project_type TEXT NOT NULL,
  department_preference TEXT DEFAULT 'Any',
  skills_needed JSONB DEFAULT '[]',
  team_size_total INTEGER NOT NULL,
  team_size_current INTEGER DEFAULT 1,
  project_mode TEXT NOT NULL,
  deadline DATE NOT NULL,
  guide_faculty_name TEXT,
  specific_requirements TEXT,
  status TEXT DEFAULT 'OPEN',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. PROJECTMATE APPLICANTS TABLE
CREATE TABLE projectmate_applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projectmate_projects(id) ON DELETE CASCADE,
  user_email TEXT REFERENCES users(email) ON DELETE CASCADE,
  relevant_skills JSONB DEFAULT '[]',
  role_wanted TEXT NOT NULL,
  motivation TEXT NOT NULL,
  portfolio_link TEXT,
  past_experience TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_email)
);

-- 13. PROJECTMATE GROUP CHAT MESSAGES
CREATE TABLE projectmate_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projectmate_projects(id) ON DELETE CASCADE,
  sender_email TEXT REFERENCES users(email) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'TEXT',
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. ADMIN NOTIFICATIONS BROADCAST TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- info, force_update
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Enable Realtime for Chat (Supabase specific)
DO $$
BEGIN
    -- Add projectmate_messages
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'projectmate_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE projectmate_messages;
    END IF;

    -- Add messages (LostFound chat)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;

    -- Add claims (LostFound claims)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'claims'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE claims;
    END IF;
END $$;

-- 16. RPC Functions
CREATE OR REPLACE FUNCTION increment_project_member_count(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE projectmate_projects
  SET team_size_current = team_size_current + 1
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

-- 17. Disable Row-Level Security (RLS) on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE gearlend_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE gearlend_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE gearlend_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE projectmate_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE projectmate_applicants DISABLE ROW LEVEL SECURITY;
ALTER TABLE projectmate_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- 18. Grant proper permissions to Supabase API roles (anon, authenticated, service_role)
-- Crucial to prevent "permission denied" errors after schema drop/recreation
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
