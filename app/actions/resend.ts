"use server";

import { Resend } from "resend";

interface ResendResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export async function sendTestEmail(toEmail: string): Promise<ResendResponse> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      message: "Resend API key is not configured",
    };
  }

  if (!toEmail || !toEmail.includes("@")) {
    return {
      success: false,
      message: "Please enter a valid email address",
    };
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: "QuantaLynk <noreply@updates.quantalynk.com>",
      to: toEmail,
      subject: "QuantaLynk POC - Test Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #6366f1;">QuantaLynk POC</h1>
          <p style="font-size: 16px; color: #374151;">
            This is a test email sent from the HubSpot + Resend integration POC.
          </p>
          <p style="font-size: 14px; color: #6b7280;">
            If you received this email, the Resend integration is working correctly!
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            Sent at: ${new Date().toISOString()}
          </p>
        </div>
      `,
    });

    if (error) {
      return {
        success: false,
        message: error.message || "Failed to send email",
        data: error as unknown as Record<string, unknown>,
      };
    }

    return {
      success: true,
      message: `Test email sent successfully to ${toEmail}!`,
      data: { id: data?.id, sentTo: toEmail },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
