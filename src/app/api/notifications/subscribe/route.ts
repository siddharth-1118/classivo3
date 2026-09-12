import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, user_email } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ success: false, message: "Subscription payload required" }, { status: 400 });
    }

    const endpoint = subscription.endpoint;

    // Save / Upsert push subscription into Supabase push_subscriptions table
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          endpoint,
          subscription: subscription,
          user_email: user_email || "unknown",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      )
      .select();

    if (error) {
      console.error("Supabase push subscription insert notice:", error);
    }

    return NextResponse.json({ success: true, message: "Push subscription registered" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Failed to register subscription" }, { status: 500 });
  }
}
