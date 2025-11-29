"use server";

interface HubSpotContactData {
  email: string;
  firstName: string;
  lastName: string;
}

interface StepResult {
  step: string;
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

interface DiagnosticFlowResult {
  success: boolean;
  message: string;
  steps: StepResult[];
  summary?: {
    contact: { id: string; email: string; firstName: string; lastName: string };
    deal: { id: string; name: string };
    association: string;
    emailSent: boolean;
    emailId?: string;
  };
}

const getAccessToken = () => process.env.HUBSPOT_ACCESS_TOKEN;

// Step 1: Create Contact
async function createContact(
  formData: HubSpotContactData
): Promise<StepResult> {
  const accessToken = getAccessToken();

  try {
    const response = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          properties: {
            email: formData.email,
            firstname: formData.firstName,
            lastname: formData.lastName,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        step: "Create Contact",
        success: false,
        message: data.message || `HubSpot API error: ${response.status}`,
        data,
      };
    }

    return {
      step: "Create Contact",
      success: true,
      message: `Contact created (ID: ${data.id})`,
      data: {
        id: data.id,
        email: data.properties?.email,
        firstName: data.properties?.firstname,
        lastName: data.properties?.lastname,
      },
    };
  } catch (error) {
    return {
      step: "Create Contact",
      success: false,
      message: error instanceof Error ? error.message : "Failed to create contact",
    };
  }
}

// Step 2: Create Deal
async function createDeal(
  firstName: string,
  lastName: string
): Promise<StepResult> {
  const accessToken = getAccessToken();
  const dealName = `Diagnostic - ${firstName} ${lastName}`;

  try {
    const response = await fetch(
      "https://api.hubapi.com/crm/v3/objects/deals",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          properties: {
            dealname: dealName,
            pipeline: "default",
            dealstage: "appointmentscheduled",
            amount: "0",
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        step: "Create Deal",
        success: false,
        message: data.message || `HubSpot API error: ${response.status}`,
        data,
      };
    }

    return {
      step: "Create Deal",
      success: true,
      message: `Deal created (ID: ${data.id}, Name: "${dealName}")`,
      data: {
        id: data.id,
        name: dealName,
        pipeline: data.properties?.pipeline,
        dealstage: data.properties?.dealstage,
      },
    };
  } catch (error) {
    return {
      step: "Create Deal",
      success: false,
      message: error instanceof Error ? error.message : "Failed to create deal",
    };
  }
}

// Step 3: Associate Deal to Contact
async function associateDealToContact(
  dealId: string,
  contactId: string
): Promise<StepResult> {
  const accessToken = getAccessToken();

  try {
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        step: "Associate Deal to Contact",
        success: false,
        message: data.message || `HubSpot API error: ${response.status}`,
        data,
      };
    }

    return {
      step: "Associate Deal to Contact",
      success: true,
      message: `Deal ${dealId} associated to Contact ${contactId}`,
      data: { dealId, contactId },
    };
  } catch (error) {
    return {
      step: "Associate Deal to Contact",
      success: false,
      message: error instanceof Error ? error.message : "Failed to associate deal to contact",
    };
  }
}

// Step 4: Send Confirmation Email (calls Resend)
async function sendConfirmationEmail(
  toEmail: string,
  contactData: { email: string; firstName: string; lastName: string },
  dealData: { id: string; name: string }
): Promise<StepResult> {
  // Import dynamically to avoid circular dependency
  const { Resend } = await import("resend");
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      step: "Send Confirmation Email",
      success: false,
      message: "Resend API key is not configured",
    };
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: "QuantaLynk Diagnostic <noreply@updates.quantalynk.com>",
      to: toEmail,
      subject: `QuantaLynk Diagnostic - Results for ${contactData.firstName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1f2937; color: #f3f4f6;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #818cf8; margin: 0;">
              <span style="color: #818cf8;">Quanta</span><span style="color: #a78bfa;">Lynk</span>
            </h1>
            <p style="color: #9ca3af; margin-top: 5px;">Diagnostic Results</p>
          </div>

          <div style="background: #374151; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #10b981; margin-top: 0; font-size: 18px;">✓ Diagnostic Complete</h2>
            <p style="color: #d1d5db; margin-bottom: 0;">
              Your diagnostic has been processed successfully. Below are your results.
            </p>
          </div>

          <div style="background: #374151; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #f97316; margin-top: 0; font-size: 16px;">Contact Information</h3>
            <table style="width: 100%; color: #d1d5db;">
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">Name:</td>
                <td style="padding: 8px 0; text-align: right;">${contactData.firstName} ${contactData.lastName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">Email:</td>
                <td style="padding: 8px 0; text-align: right;">${contactData.email}</td>
              </tr>
            </table>
          </div>

          <div style="background: #374151; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #818cf8; margin-top: 0; font-size: 16px;">Deal Created</h3>
            <table style="width: 100%; color: #d1d5db;">
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">Deal Name:</td>
                <td style="padding: 8px 0; text-align: right;">${dealData.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">Deal ID:</td>
                <td style="padding: 8px 0; text-align: right; font-family: monospace;">${dealData.id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #9ca3af;">Status:</td>
                <td style="padding: 8px 0; text-align: right;"><span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Active</span></td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            <p>This is an automated message from QuantaLynk Diagnostic Tool.</p>
            <p>Sent at: ${new Date().toISOString()}</p>
          </div>
        </div>
      `,
    });

    if (error) {
      return {
        step: "Send Confirmation Email",
        success: false,
        message: error.message || "Failed to send email",
        data: error as unknown as Record<string, unknown>,
      };
    }

    return {
      step: "Send Confirmation Email",
      success: true,
      message: `Confirmation email sent to ${toEmail}`,
      data: { id: data?.id, sentTo: toEmail },
    };
  } catch (error) {
    return {
      step: "Send Confirmation Email",
      success: false,
      message: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

// Main function: Run Full Diagnostic Flow
export async function runDiagnosticFlow(
  formData: HubSpotContactData,
  notificationEmail: string
): Promise<DiagnosticFlowResult> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    return {
      success: false,
      message: "HubSpot access token is not configured",
      steps: [],
    };
  }

  const steps: StepResult[] = [];

  // Step 1: Create Contact
  const contactResult = await createContact(formData);
  steps.push(contactResult);

  if (!contactResult.success) {
    return {
      success: false,
      message: "Flow failed at: Create Contact",
      steps,
    };
  }

  const contactId = contactResult.data?.id as string;
  const contactData = {
    email: formData.email,
    firstName: formData.firstName,
    lastName: formData.lastName,
  };

  // Step 2: Create Deal
  const dealResult = await createDeal(formData.firstName, formData.lastName);
  steps.push(dealResult);

  if (!dealResult.success) {
    return {
      success: false,
      message: "Flow failed at: Create Deal",
      steps,
    };
  }

  const dealId = dealResult.data?.id as string;
  const dealName = dealResult.data?.name as string;

  // Step 3: Associate Deal to Contact
  const associationResult = await associateDealToContact(dealId, contactId);
  steps.push(associationResult);

  if (!associationResult.success) {
    return {
      success: false,
      message: "Flow failed at: Associate Deal to Contact",
      steps,
    };
  }

  // Step 4: Send Confirmation Email
  const emailResult = await sendConfirmationEmail(
    notificationEmail,
    contactData,
    { id: dealId, name: dealName }
  );
  steps.push(emailResult);

  const allSuccessful = steps.every((s) => s.success);

  return {
    success: allSuccessful,
    message: allSuccessful
      ? "Full diagnostic flow completed successfully!"
      : "Flow completed with some errors",
    steps,
    summary: {
      contact: {
        id: contactId,
        email: contactData.email,
        firstName: contactData.firstName,
        lastName: contactData.lastName,
      },
      deal: {
        id: dealId,
        name: dealName,
      },
      association: associationResult.success ? "success" : "failed",
      emailSent: emailResult.success,
      emailId: emailResult.data?.id as string | undefined,
    },
  };
}

// Keep the simple contact creation for backwards compatibility
export async function createHubSpotContact(
  formData: HubSpotContactData
): Promise<{ success: boolean; message: string; data?: Record<string, unknown> }> {
  const result = await createContact(formData);
  return {
    success: result.success,
    message: result.message,
    data: result.data,
  };
}
