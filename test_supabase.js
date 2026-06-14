const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://dlyvdubzimlkqkyhgmwc.supabase.co";
const supabaseAnonKey = "sb_publishable_dVSdEZMmevTu41KfEaVqXA_nt9ccrlS";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Testing Supabase connection...");

  try {
    // Test items table
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .limit(1);

    if (itemsError) {
      console.error("Error fetching items:", itemsError);
    } else {
      console.log("Successfully fetched items:", items);
    }

    // Test inserting a notification
    const { data: notif, error: notifError } = await supabase
      .from('notifications')
      .insert([{
        title: "Test Notification",
        message: "This is a test notification from the migration verification script.",
        type: "admin-broadcast"
      }])
      .select();

    if (notifError) {
      console.error("Error inserting notification:", notifError);
    } else {
      console.log("Successfully inserted notification:", notif);
    }
  } catch (e) {
    console.error("Unexpected error:", e);
  }
}

test();
