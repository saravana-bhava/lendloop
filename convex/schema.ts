import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    isTrustedLender: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_role", ["role"]),

  tools: defineTable({
    name: v.string(),
    category: v.union(
      v.literal("power tools"),
      v.literal("garden"),
      v.literal("kitchen"),
      v.literal("camping"),
      v.literal("other")
    ),
    condition: v.union(
      v.literal("new"),
      v.literal("like new"),
      v.literal("good"),
      v.literal("fair")
    ),
    description: v.string(),
    ownerId: v.string(), // Clerk user ID
    isAvailable: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_category", ["category"])
    .index("by_availability", ["isAvailable"]),

  borrowRequests: defineTable({
    toolId: v.id("tools"),
    toolName: v.string(),
    ownerId: v.string(),
    borrowerId: v.string(),
    borrowerName: v.string(),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(),   // YYYY-MM-DD
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("returned")
    ),
    returnedAt: v.optional(v.number()),
    lastReminderSentAt: v.optional(v.number()),
    reminderCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tool", ["toolId"])
    .index("by_owner", ["ownerId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_status", ["status"]),

  automationLogs: defineTable({
    idempotentKey: v.string(),
    requestId: v.id("borrowRequests"),
    eventType: v.string(),
    details: v.string(),
    timestamp: v.number(),
  })
    .index("by_idempotent_key", ["idempotentKey"])
    .index("by_request", ["requestId"]),
});
