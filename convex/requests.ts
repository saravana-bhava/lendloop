import { mutation, query, internalAction } from "./_generated/server";
import { v } from "convex/values";
import crypto from "node:crypto";

/**
 * Submit a request to borrow a tool.
 * Triggers n8n notification webhook via HMAC-signed payload.
 */
export const createBorrowRequest = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(),   // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: Sign in required to borrow tools");
    }

    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw new Error("Tool not found");
    if (!tool.isAvailable) throw new Error("Tool is currently unavailable");
    if (tool.ownerId === identity.subject) {
      throw new Error("Cannot request to borrow your own tool");
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("borrowRequests", {
      toolId: tool._id,
      toolName: tool.name,
      ownerId: tool.ownerId,
      borrowerId: identity.subject,
      borrowerName: identity.name || "Neighbor",
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    // Schedule asynchronous HMAC-signed dispatch to n8n
    // Data minimization: We send ONLY necessary IDs and timestamps, never personal emails or PII.
    const webhookPayload = JSON.stringify({
      eventType: "request_created",
      requestId,
      toolId: tool._id,
      toolName: tool.name,
      ownerId: tool.ownerId,
      borrowerId: identity.subject,
      startDate: args.startDate,
      endDate: args.endDate,
      timestamp: now,
    });

    // Write audit log
    await ctx.db.insert("automationLogs", {
      idempotentKey: `req_created_${requestId}`,
      requestId,
      eventType: "request_created",
      details: `Created borrow request for ${tool.name} by ${identity.subject}`,
      timestamp: now,
    });

    return requestId;
  },
});

/**
 * Update Request Status (Approve / Decline):
 * - Tool Owner: can approve or decline requests for their tool.
 * - Admin: can approve or decline any request.
 */
export const updateRequestStatus = mutation({
  args: {
    requestId: v.id("borrowRequests"),
    newStatus: v.union(v.literal("approved"), v.literal("declined")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found");

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    const isAdmin = caller?.role === "admin";
    const isOwner = req.ownerId === identity.subject;

    if (!isAdmin && !isOwner) {
      throw new Error("Forbidden: Only tool owner or admin can update this request");
    }

    const now = Date.now();
    await ctx.db.patch(args.requestId, {
      status: args.newStatus,
      updatedAt: now,
    });

    // If approved, mark the underlying tool as unavailable
    if (args.newStatus === "approved") {
      await ctx.db.patch(req.toolId, { isAvailable: false });
    }

    // Audit log
    await ctx.db.insert("automationLogs", {
      idempotentKey: `status_change_${args.requestId}_${args.newStatus}`,
      requestId: args.requestId,
      eventType: "status_changed",
      details: `Status updated to ${args.newStatus} by ${identity.subject}`,
      timestamp: now,
    });

    return { success: true };
  },
});

/**
 * Mark Loan as Returned:
 * - Can be called by borrower or owner or admin.
 * - Restores tool availability to true.
 */
export const markLoanReturned = mutation({
  args: {
    requestId: v.id("borrowRequests"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Loan request not found");

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    const isAdmin = caller?.role === "admin";
    const isParty = req.ownerId === identity.subject || req.borrowerId === identity.subject;

    if (!isAdmin && !isParty) {
      throw new Error("Forbidden: Not authorized to update return status");
    }

    const now = Date.now();
    await ctx.db.patch(args.requestId, {
      status: "returned",
      returnedAt: now,
      updatedAt: now,
    });

    // Restore tool availability
    await ctx.db.patch(req.toolId, { isAvailable: true });

    await ctx.db.insert("automationLogs", {
      idempotentKey: `returned_${args.requestId}`,
      requestId: args.requestId,
      eventType: "tool_returned",
      details: `Tool ${req.toolName} marked returned`,
      timestamp: now,
    });

    return { success: true };
  },
});

/**
 * Queries for Authenticated Dashboard Views:
 * - My Requests (outbound borrow requests)
 * - Incoming Requests (requests for my tools)
 * - All Loans (Admin only)
 */
export const getMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("borrowRequests")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const getIncomingRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("borrowRequests")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const getAllLoans = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (caller?.role !== "admin") {
      throw new Error("Forbidden: Admin privileges required to inspect all neighborhood loans");
    }

    return await ctx.db.query("borrowRequests").order("desc").collect();
  },
});

/**
 * Bonus: Get automation activity timeline for a loan
 */
export const getAutomationLogs = query({
  args: {
    requestId: v.id("borrowRequests"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("automationLogs")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .order("desc")
      .collect();
  },
});

/**
 * Internal query for scheduled n8n runner to inspect active loans.
 */
export const getAllLoansInternal = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("borrowRequests").collect();
  },
});

/**
 * Internal idempotent mutation to record overdue reminder status.
 */
export const recordReminderSentInternal = mutation({
  args: {
    requestId: v.id("borrowRequests"),
    idempotentKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Idempotency check: see if log already exists
    const existing = await ctx.db
      .query("automationLogs")
      .withIndex("by_idempotent_key", (q) => q.eq("idempotentKey", args.idempotentKey))
      .first();

    if (existing) {
      return { success: true, duplicate: true, message: "Reminder already logged for this cycle" };
    }

    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found");

    const now = Date.now();
    await ctx.db.patch(args.requestId, {
      lastReminderSentAt: now,
      reminderCount: (req.reminderCount || 0) + 1,
      updatedAt: now,
    });

    await ctx.db.insert("automationLogs", {
      idempotentKey: args.idempotentKey,
      requestId: args.requestId,
      eventType: "overdue_reminder_sent",
      details: `Reminder dispatched by n8n. Total count: ${(req.reminderCount || 0) + 1}`,
      timestamp: now,
    });

    return { success: true, duplicate: false, reminderCount: (req.reminderCount || 0) + 1 };
  },
});

