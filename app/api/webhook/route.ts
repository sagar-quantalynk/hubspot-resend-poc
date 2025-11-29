import { NextRequest, NextResponse } from "next/server";

interface WebhookEntry {
  id: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

// In-memory storage for last 5 webhooks (resets on server restart)
const webhookStorage: WebhookEntry[] = [];
const MAX_WEBHOOKS = 5;

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    const entry: WebhookEntry = {
      id: crypto.randomUUID(),
      payload,
      receivedAt: new Date().toISOString(),
    };

    // Add to beginning of array
    webhookStorage.unshift(entry);

    // Keep only last 5
    if (webhookStorage.length > MAX_WEBHOOKS) {
      webhookStorage.pop();
    }

    console.log("Webhook received:", JSON.stringify(entry, null, 2));

    return NextResponse.json({
      success: true,
      message: "Webhook received successfully",
      id: entry.id,
      receivedAt: entry.receivedAt,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process webhook",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    webhooks: webhookStorage,
    count: webhookStorage.length,
  });
}
