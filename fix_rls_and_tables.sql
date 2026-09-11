-- ==========================================
-- 🛠️ Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Create the missing push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES users(email) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_subscription UNIQUE (user_email, subscription)
);

-- 2. Disable Row-Level Security (RLS) on all tables
-- This ensures the backend API can perform actions without being blocked by RLS policies
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE gearlend_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE gearlend_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE gearlend_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE projectmate_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE projectmate_applicants DISABLE ROW LEVEL SECURITY;
ALTER TABLE projectmate_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;
