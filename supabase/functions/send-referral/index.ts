import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReferralRequest {
  type: 'email' | 'sms';
  to: string;
  from: string;
  fromUserId: string;
  appUrl: string;
  description: string;
  credentials?: {
    sendgridApiKey?: string;
    twilioFromEmail?: string;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioPhoneNumber?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { type, to, from, fromUserId, appUrl, description, credentials }: ReferralRequest = await req.json();

    if (!type || !to || !from || !fromUserId || !appUrl || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: codeData, error: codeError } = await supabase
      .rpc('generate_referral_code', { user_id: fromUserId });

    if (codeError) {
      console.error('Error generating referral code:', codeError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate referral code' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const referralCode = codeData as string;
    // Use production URL instead of the passed appUrl
    const productionUrl = 'https://employee-management-xb6f.bolt.host';
    const referralLink = `${productionUrl}#/signup?ref=${referralCode}`;

    const { error: linkError } = await supabase
      .from('account_links')
      .insert({
        primary_account_id: fromUserId,
        linked_account_id: fromUserId,
        link_type: 'referral',
        status: 'pending',
        referral_code: referralCode,
        shares_subscription: true
      });

    if (linkError) {
      console.error('Error creating account link:', linkError);
    }

    if (type === 'email') {
      // Get credentials from request or environment variables
      const sendGridApiKey = credentials?.sendgridApiKey || Deno.env.get('SENDGRID_API_KEY');
      const twilioFromEmail = credentials?.twilioFromEmail || Deno.env.get('TWILIO_FROM_EMAIL') || 'noreply@yourdomain.com';

      if (!sendGridApiKey) {
        console.log('SendGrid API key not configured - simulation mode');
        console.log(`Would send email to: ${to}`);
        console.log(`From: ${from}`);
        console.log(`Referral Link: ${referralLink}`);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Email referral created (simulation mode)',
            referralCode: referralCode,
            referralLink: referralLink,
            info: 'To enable real emails, set up SendGrid API key'
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Join KUKI</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">KUKI</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Employee Management Platform</p>
          </div>

          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">You're Invited to Join KUKI!</h2>

            <p style="font-size: 16px; color: #666;">
              <strong>${from}</strong> has invited you to join KUKI, a modern employee management platform.
            </p>

            <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <p style="margin: 0; color: #666; font-style: italic;">"${description}"</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${referralLink}"
                 style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Join KUKI Now
              </a>
            </div>

            <p style="font-size: 14px; color: #888; margin-top: 30px;">
              Or copy and paste this link into your browser:<br>
              <a href="${referralLink}" style="color: #2563eb; word-break: break-all;">${referralLink}</a>
            </p>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
              This invitation was sent by ${from} via KUKI<br>
              If you didn't expect this email, you can safely ignore it.
            </p>
          </div>
        </body>
        </html>
      `;

      const emailText = `You're Invited to Join KUKI!\n\n${from} has invited you to join KUKI, a modern employee management platform.\n\n"${description}"\n\nClick here to join: ${referralLink}\n\nThis invitation was sent by ${from} via KUKI`;

      // Send email via SendGrid
      const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sendGridApiKey}`,
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: to }],
            subject: `${from} invited you to join KUKI`,
          }],
          from: {
            email: twilioFromEmail,
            name: 'KUKI'
          },
          content: [
            {
              type: 'text/plain',
              value: emailText
            },
            {
              type: 'text/html',
              value: emailHtml
            }
          ]
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('SendGrid API error:', errorText);
        console.error('SendGrid status:', emailResponse.status);
        console.error('Using from email:', twilioFromEmail);

        let errorMessage = 'Failed to send email via SendGrid';
        if (emailResponse.status === 403) {
          errorMessage = 'SendGrid API key is invalid or expired. Please check your VITE_SENDGRID_API_KEY.';
        } else if (emailResponse.status === 400) {
          errorMessage = 'Invalid email configuration. Make sure your sender email is verified in SendGrid.';
        }

        return new Response(
          JSON.stringify({
            error: errorMessage,
            details: errorText,
            status: emailResponse.status
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email referral sent successfully via Twilio SendGrid',
          referralCode: referralCode,
          referralLink: referralLink
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } else if (type === 'sms') {
      // Get Twilio credentials from request or environment variables
      const twilioAccountSid = credentials?.twilioAccountSid || Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioAuthToken = credentials?.twilioAuthToken || Deno.env.get('TWILIO_AUTH_TOKEN');
      const twilioPhoneNumber = credentials?.twilioPhoneNumber || Deno.env.get('TWILIO_PHONE_NUMBER');

      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
        console.log('Twilio credentials not configured - simulation mode');
        console.log(`Would send SMS to: ${to}`);
        console.log(`Referral Link: ${referralLink}`);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'SMS referral created (simulation mode)',
            referralCode: referralCode,
            referralLink: referralLink,
            info: 'To enable real SMS, configure Twilio credentials'
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      // Send SMS via Twilio
      const smsMessage = `${from} invites you to join KUKI! Sign up here: ${referralLink}`;

      const smsResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
          },
          body: new URLSearchParams({
            From: twilioPhoneNumber,
            To: to,
            Body: smsMessage,
          }),
        }
      );

      if (!smsResponse.ok) {
        const errorText = await smsResponse.text();
        console.error('Twilio API error:', errorText);
        return new Response(
          JSON.stringify({
            error: 'Failed to send SMS via Twilio',
            details: errorText
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'SMS referral sent successfully via Twilio',
          referralCode: referralCode,
          referralLink: referralLink
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid referral type' }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error processing referral:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
