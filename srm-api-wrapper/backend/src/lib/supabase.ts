import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://jhcadspkcnbewnvdakax.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY2Fkc3BrY25iZXdudmRha2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MTcxMDAsImV4cCI6MjA5Njk5MzEwMH0.RPs69xkSV8Pop5ec5sSF_lizu7tQlLdJ6U9CHBuz8a8";

if (!SUPABASE_URL) {
  console.warn("[SUPABASE WARNING] SUPABASE_URL is not set!");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});
