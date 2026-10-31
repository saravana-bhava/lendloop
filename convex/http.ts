import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import crypto from "node:crypto";

const http = httpRouter();

function verifyHmac(payload: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const cleanSig = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  
  const bufA = Buffer.from(cleanSig, "hex");
  const bufB = Buffer.from(expected, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Endpoint: GET /api/loans/overdue
 * Called daily by n8n Scheduled Workflow.
 * Returns active loans that passed their return date.
 */
http.route({
  path: "/api/loans/overdue",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.CONVEX_INTERNAL_API_SECRET || "replace-with-a-secure-internal-api-secret";

    if (authHeader !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid secret" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Fetch all approved loans and filter overdue
    const loans = await ctx.runQuery(api.requests.getAllLoansInternal, {});
    const overdue = loans.filter((l: any) => l.status === "approved" && l.endDate < todayStr);

    // Data minimization: Return only IDs, dates, and notification targets
    const sanitized = overdue.map((l: any) => ({
      requestId: l._id,
      toolName: l.toolName,
      borrowerId: l.borrowerId,
      borrowerName: l.borrowerName,
      ownerId: l.ownerId,
      startDate: l.startDate,
      endDate: l.endDate,
      reminderCount: l.reminderCount || 0,
      lastReminderSentAt: l.lastReminderSentAt || null,
    }));

    return new Response(JSON.stringify({ count: sanitized.length, overdue: sanitized }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * Endpoint: POST /api/loans/reminder-sent
 * Write-back from n8n after dispatching a reminder notification.
 * IDEMPOTENT: Prevents duplicate reminders or double-counting on retries.
 * Cryptographically verified via HMAC-SHA256 signature.
 */
http.route({
  path: "/api/loans/reminder-sent",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const signature = request.headers.get("X-LendLoop-Signature");
    const secret = process.env.N8N_WEBHOOK_SECRET || "replace-with-a-high-entropy-64-character-hex-secret";

    // HMAC Signature Validation
    if (!verifyHmac(rawBody, signature, secret)) {
      return new Response(JSON.stringify({ error: "Forbidden: HMAC signature mismatch" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = JSON.parse(rawBody);
    const { requestId, idempotentKey } = data;

    if (!requestId || !idempotentKey) {
      return new Response(JSON.stringify({ error: "Missing required fields: requestId, idempotentKey" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await ctx.runMutation(api.requests.recordReminderSentInternal, {
      requestId,
      idempotentKey,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
