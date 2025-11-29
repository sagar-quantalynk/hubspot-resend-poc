"use client";

import { useState, useEffect, useCallback } from "react";
import { runDiagnosticFlow } from "./actions/hubspot";
import { sendTestEmail } from "./actions/resend";

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

interface WebhookEntry {
  id: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

export default function Home() {
  // Diagnostic Flow State
  const [diagnosticForm, setDiagnosticForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
  });
  const [notificationEmail, setNotificationEmail] = useState("sagar@quantalynk.com");
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticFlowResult | null>(null);

  // Standalone Email Test State
  const [resendEmail, setResendEmail] = useState("sagar@quantalynk.com");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendResponse, setResendResponse] = useState<{
    success: boolean;
    message: string;
    data?: Record<string, unknown>;
  } | null>(null);

  // Webhook State
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookResponse, setWebhookResponse] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhook`
      : "https://hubspot-resend-poc.vercel.app/api/webhook";

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/webhook");
      const data = await res.json();
      if (data.success) {
        setWebhooks(data.webhooks);
      }
    } catch (error) {
      console.error("Failed to fetch webhooks:", error);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  // Run Full Diagnostic Flow
  const handleDiagnosticSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDiagnosticLoading(true);
    setDiagnosticResult(null);

    try {
      const result = await runDiagnosticFlow(diagnosticForm, notificationEmail);
      setDiagnosticResult(result);
      if (result.success) {
        setDiagnosticForm({ email: "", firstName: "", lastName: "" });
      }
    } catch {
      setDiagnosticResult({
        success: false,
        message: "An unexpected error occurred",
        steps: [],
      });
    } finally {
      setDiagnosticLoading(false);
    }
  };

  // Standalone Email Test
  const handleResendSubmit = async () => {
    setResendLoading(true);
    setResendResponse(null);

    try {
      const result = await sendTestEmail(resendEmail);
      setResendResponse(result);
    } catch {
      setResendResponse({
        success: false,
        message: "An unexpected error occurred",
      });
    } finally {
      setResendLoading(false);
    }
  };

  // Test Webhook
  const handleTestWebhook = async () => {
    setWebhookLoading(true);
    setWebhookResponse(null);

    const samplePayload = {
      event: "contact.created",
      data: {
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
      },
      timestamp: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(samplePayload),
      });
      const data = await res.json();
      setWebhookResponse({
        success: data.success,
        message: data.message,
      });
      await fetchWebhooks();
    } catch {
      setWebhookResponse({
        success: false,
        message: "Failed to send test webhook",
      });
    } finally {
      setWebhookLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy");
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">
            <span className="text-indigo-400">Quanta</span>
            <span className="text-purple-400">Lynk</span>
          </h1>
          <p className="text-gray-400">
            Full Diagnostic Flow: Contact → Deal → Association → Email
          </p>
        </header>

        {/* Full Diagnostic Flow Card - Full Width */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-indigo-500/20 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-orange-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Full Diagnostic Flow
              </h2>
              <p className="text-sm text-gray-400">
                Creates Contact + Deal + Association + Sends Email
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Form */}
            <form onSubmit={handleDiagnosticSubmit} className="space-y-4">
              <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-sm text-gray-400 mb-1"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="contact-email"
                      required
                      value={diagnosticForm.email}
                      onChange={(e) =>
                        setDiagnosticForm({ ...diagnosticForm, email: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="firstName"
                        className="block text-sm text-gray-400 mb-1"
                      >
                        First Name
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        required
                        value={diagnosticForm.firstName}
                        onChange={(e) =>
                          setDiagnosticForm({ ...diagnosticForm, firstName: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="lastName"
                        className="block text-sm text-gray-400 mb-1"
                      >
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        required
                        value={diagnosticForm.lastName}
                        onChange={(e) =>
                          setDiagnosticForm({ ...diagnosticForm, lastName: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/30 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">
                  Notification Settings
                </h3>
                <div>
                  <label
                    htmlFor="notification-email"
                    className="block text-sm text-gray-400 mb-1"
                  >
                    Send results to:
                  </label>
                  <input
                    type="email"
                    id="notification-email"
                    required
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={diagnosticLoading}
                className="w-full py-4 px-4 bg-gradient-to-r from-orange-500 via-pink-500 to-indigo-500 text-white font-medium rounded-lg hover:from-orange-600 hover:via-pink-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-lg"
              >
                {diagnosticLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Running Diagnostic Flow...
                  </span>
                ) : (
                  "Run Full Diagnostic Flow"
                )}
              </button>
            </form>

            {/* Right: Results */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-3">
                Flow Results
              </h3>
              <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4 min-h-[300px]">
                {!diagnosticResult ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm py-12">
                    <svg
                      className="w-12 h-12 mb-3 opacity-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <p>Fill out the form and run the diagnostic</p>
                    <p className="text-xs mt-1">Results will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Steps */}
                    {diagnosticResult.steps.map((step, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          step.success
                            ? "bg-green-500/10 border border-green-500/30"
                            : "bg-red-500/10 border border-red-500/30"
                        }`}
                      >
                        <span className="mt-0.5">
                          {step.success ? (
                            <svg
                              className="w-5 h-5 text-green-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5 text-red-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              step.success ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {step.step}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {step.message}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Summary */}
                    {diagnosticResult.summary && (
                      <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">
                          Summary
                        </h4>
                        <pre className="text-xs text-gray-400 overflow-x-auto">
                          {JSON.stringify(diagnosticResult.summary, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Cards Container */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Standalone Resend Test Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Standalone Email Test
                </h2>
                <p className="text-sm text-gray-400">Test Resend independently</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-700/30 rounded-lg p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">From:</span>
                    <span className="text-white">noreply@updates.quantalynk.com</span>
                  </div>
                  <div>
                    <label
                      htmlFor="resend-email"
                      className="block text-gray-400 mb-1"
                    >
                      To:
                    </label>
                    <input
                      type="email"
                      id="resend-email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleResendSubmit}
                disabled={resendLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {resendLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  "Send Test Email"
                )}
              </button>

              {resendResponse && (
                <div
                  className={`p-4 rounded-lg ${
                    resendResponse.success
                      ? "bg-green-500/10 border border-green-500/30"
                      : "bg-red-500/10 border border-red-500/30"
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      resendResponse.success ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {resendResponse.success ? "✓ Success" : "✗ Error"}
                  </p>
                  <p className="text-sm text-gray-300 mt-1">
                    {resendResponse.message}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Webhook Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Webhook Receiver
                </h2>
                <p className="text-sm text-gray-400">Test incoming webhooks</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Webhook URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-xs font-mono"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <button
                onClick={handleTestWebhook}
                disabled={webhookLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {webhookLoading ? "Sending..." : "Test Webhook"}
              </button>

              {webhookResponse && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    webhookResponse.success
                      ? "bg-green-500/10 border border-green-500/30 text-green-400"
                      : "bg-red-500/10 border border-red-500/30 text-red-400"
                  }`}
                >
                  {webhookResponse.success ? "✓" : "✗"} {webhookResponse.message}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Recent Webhooks</span>
                  <span className="text-xs text-gray-500">{webhooks.length}/5</span>
                </div>
                <div className="bg-gray-900/50 rounded-lg border border-gray-700 h-32 overflow-y-auto">
                  {webhooks.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 text-xs">
                      No webhooks yet
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-700">
                      {webhooks.slice(0, 3).map((webhook) => (
                        <div key={webhook.id} className="p-2 text-xs">
                          <div className="flex justify-between text-gray-500">
                            <span className="font-mono">{webhook.id.slice(0, 8)}...</span>
                            <span>{formatTimestamp(webhook.receivedAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500">
          <p>QuantaLynk Integration POC • Full Diagnostic Flow Demo</p>
        </footer>
      </div>
    </main>
  );
}
