import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import webpush from "web-push";

const DEFAULT_VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const DEFAULT_VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";

try {
  if (DEFAULT_VAPID_PUBLIC && DEFAULT_VAPID_PRIVATE) {
    webpush.setVapidDetails(
      "mailto:admin@classivo.com",
      DEFAULT_VAPID_PUBLIC,
      DEFAULT_VAPID_PRIVATE
    );
  }
} catch (e) {
  console.warn("VAPID setup notice:", e);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, message, type = "broadcast", url, min_version, adminKey } = body;

    const expectedKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "";
    if (!expectedKey || adminKey !== expectedKey) {
      return NextResponse.json({ success: false, message: "Invalid admin key" }, { status: 403 });
    }

    if (!title || !message) {
      return NextResponse.json({ success: false, message: "Title and message are required" }, { status: 400 });
    }

    const payload = {
      title,
      message,
      type,
      url: url || null,
      min_version: min_version || null,
    };

    // 1. Insert into Supabase notifications table
    const { data: dbData, error: dbErr } = await supabase
      .from("notifications")
      .insert([payload])
      .select();

    if (dbErr) {
      console.error("Supabase notification insert error:", dbErr);
    }

    // 2. Broadcast via Supabase Realtime Channel
    try {
      const channel = supabase.channel("broadcasts");
      await new Promise<void>((resolve) => {
        channel.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.send({
              type: "broadcast",
              event: "admin_message",
              payload,
            });
            resolve();
          }
        });
        setTimeout(resolve, 2000);
      });
    } catch (realtimeErr) {
      console.warn("Realtime broadcast notice:", realtimeErr);
    }

    // 3. Web Push to closed browsers via WebPush VAPID
    let pushSentCount = 0;
    try {
      const { data: subs } = await supabase.from("push_subscriptions").select("*");
      if (subs && subs.length > 0) {
        const pushPayload = JSON.stringify({
          title,
          body: message,
          message,
          icon: "/icons/icon-192.png",
          url: url || "/",
        });

        await Promise.all(
          subs.map(async (subRecord: any) => {
            try {
              const subObj = subRecord.subscription || subRecord;
              if (subObj && subObj.endpoint) {
                await webpush.sendNotification(subObj, pushPayload);
                pushSentCount++;
              }
            } catch (err: any) {
              if (err?.statusCode === 410 || err?.statusCode === 404) {
                await supabase.from("push_subscriptions").delete().eq("id", subRecord.id);
              }
            }
          })
        );
      }
    } catch (pushErr) {
      console.warn("WebPush send notice:", pushErr);
    }

    return NextResponse.json({
      success: true,
      message: `Notification broadcasted to online clients and ${pushSentCount} background push devices!`,
      record: dbData ? dbData[0] : null,
      pushSentCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to send broadcast notification" },
      { status: 500 }
    );
  }
}
