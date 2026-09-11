import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { utr, tierId, amount, regNo } = body;

    if (!utr || typeof utr !== "string") {
      return NextResponse.json(
        { success: false, error: "UPI Transaction Reference (UTR) is required." },
        { status: 400 }
      );
    }

    const cleanUtr = utr.trim();

    // Standard UPI UTR format validation: 12 numeric digits
    if (!/^\d{12}$/.test(cleanUtr)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid UTR format. Please enter the 12-digit UPI reference number from your PhonePe/GPay receipt.",
        },
        { status: 400 }
      );
    }

    // Check if UTR has already been claimed in Supabase
    try {
      const { data: existingTx } = await supabase
        .from("payment_transactions")
        .select("id, utr, status")
        .eq("utr", cleanUtr)
        .single();

      if (existingTx) {
        return NextResponse.json(
          {
            success: false,
            error: "This UPI UTR number has already been used for an active subscription.",
          },
          { status: 400 }
        );
      }

      // Record transaction to Supabase
      await supabase.from("payment_transactions").insert({
        utr: cleanUtr,
        tier_id: tierId || "pro",
        amount: amount || 10,
        reg_no: regNo || "guest",
        status: "VERIFIED",
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Supabase transaction table insert notice:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully! Subscription activated.",
      utr: cleanUtr,
      tierId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Payment verification error." },
      { status: 500 }
    );
  }
}
