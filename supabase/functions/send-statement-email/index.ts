import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  htmlContent?: string;
  textContent: string;
  userName?: string;
  credentials?: {
    sendgridApiKey?: string;
    twilioFromEmail?: string;
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
    const { to, subject, textContent, userName, credentials }: EmailRequest = await req.json();

    if (!to || !subject || !textContent) {
      return new Response(
        JSON.stringify({ error: "Email, subject, and content are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const sendgridApiKey = credentials?.sendgridApiKey || Deno.env.get("SENDGRID_API_KEY");
    const fromEmail = credentials?.twilioFromEmail || Deno.env.get("SENDGRID_FROM_EMAIL") || Deno.env.get("TWILIO_FROM_EMAIL") || "noreply@kukiapp.com";

    if (!sendgridApiKey) {
      return new Response(
        JSON.stringify({
          error: "Email service not configured. Please set up SENDGRID_API_KEY environment variable or pass credentials"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(textContent);
    const base64PDF = btoa(String.fromCharCode(...uint8Array));

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your KUKI Statement</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">KUKI</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Employee Management Platform</p>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Your Statement is Ready</h2>

          <p style="font-size: 16px; color: #666;">
            ${userName ? `Hello <strong>${userName}</strong>,` : 'Hello,'}
          </p>

          <p style="font-size: 16px; color: #666;">
            Your requested statement has been generated and is attached to this email as a document.
          </p>

          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb;">
            <h3 style="margin: 0 0 10px 0; color: #2563eb; font-size: 16px;">Statement Details</h3>
            <p style="margin: 5px 0; color: #666; font-size: 14px;">
              <strong>Subject:</strong> ${subject}
            </p>
            <p style="margin: 5px 0; color: #666; font-size: 14px;">
              <strong>Generated:</strong> ${new Date().toLocaleString()}
            </p>
          </div>

          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #60a5fa;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              📎 Please find your statement attached as a text file.
            </p>
          </div>

          <div style="margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px;">
            <p style="font-size: 14px; color: #666; margin: 0 0 10px 0;">
              <strong>Need help?</strong>
            </p>
            <p style="font-size: 14px; color: #888; margin: 0;">
              If you have any questions about your statement, please contact your employer or visit your KUKI dashboard.
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

          <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
            This email was sent from KUKI Employee Management Platform<br>
            You received this because you requested a statement to be emailed to you.<br>
            If you did not request this, please contact your administrator.
          </p>
        </div>

        <div style="text-align: center; margin-top: 20px; padding: 20px;">
          <p style="font-size: 11px; color: #999; margin: 0;">
            © ${new Date().getFullYear()} KUKI. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;

    const emailText = `Your KUKI Statement

${userName ? `Hello ${userName},` : 'Hello,'}

Your requested statement has been generated and is attached to this email.

Statement Details:
- Subject: ${subject}
- Generated: ${new Date().toLocaleString()}

Please find your statement attached.

Need help? If you have any questions about your statement, please contact your employer or visit your KUKI dashboard.

---
This email was sent from KUKI Employee Management Platform
© ${new Date().getFullYear()} KUKI. All rights reserved.`;

    const emailBody = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject,
        },
      ],
      from: { email: fromEmail, name: "KUKI Statement Service" },
      content: [
        {
          type: "text/plain",
          value: emailText,
        },
        {
          type: "text/html",
          value: emailHtml,
        },
      ],
      attachments: [
        {
          content: base64PDF,
          filename: `statement_${new Date().toISOString().split('T')[0]}.txt`,
          type: "text/plain",
          disposition: "attachment"
        }
      ]
    };

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sendgridApiKey}`,
      },
      body: JSON.stringify(emailBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('SendGrid error:', errorData);
      return new Response(
        JSON.stringify({ error: "Failed to send email via SendGrid", details: errorData }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Statement email sent successfully with attachment" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
