import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyOTPRequest {
  phone: string;
  otp_code: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { phone, otp_code }: VerifyOTPRequest = await req.json();

    if (!phone || !otp_code) {
      return new Response(
        JSON.stringify({ error: "Phone and OTP code are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Find the latest non-verified OTP for this phone
    const findResponse = await fetch(
      `${supabaseUrl}/rest/v1/otp_verifications?phone=eq.${encodeURIComponent(phone)}&verified=eq.false&order=created_at.desc&limit=1`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!findResponse.ok) {
      throw new Error("Failed to find OTP");
    }

    const otpRecords = await findResponse.json();

    if (otpRecords.length === 0) {
      return new Response(
        JSON.stringify({ error: "No OTP found. Please request a new one." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const otpRecord = otpRecords[0];

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "OTP has expired. Please request a new one." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check max attempts
    if (otpRecord.attempts >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many failed attempts. Please request a new OTP." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify OTP code
    if (otpRecord.otp_code !== otp_code) {
      // Increment attempts
      await fetch(`${supabaseUrl}/rest/v1/otp_verifications?id=eq.${otpRecord.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          attempts: otpRecord.attempts + 1,
        }),
      });

      return new Response(
        JSON.stringify({
          error: "Invalid OTP code",
          attemptsRemaining: 2 - otpRecord.attempts
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Mark OTP as verified
    await fetch(`${supabaseUrl}/rest/v1/otp_verifications?id=eq.${otpRecord.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        verified: true,
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP verified successfully",
        phone: phone,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in verify-otp:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to verify OTP"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
