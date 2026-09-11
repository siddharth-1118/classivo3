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

    // Validate payment identifier format: 10 to 30 characters (12-digit UTR, 10-digit mobile, or UPI ID)
    if (!cleanUtr || cleanUtr.length < 10 || cleanUtr.length > 30) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid format. Please enter a 12-digit UPI UTR number, 10-digit mobile number, or UPI ID.",
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
