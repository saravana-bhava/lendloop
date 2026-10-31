import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Sync user profile from Clerk token upon login.
 */
export const syncUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: valid Clerk session required");
    }

    const clerkId = identity.subject;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
      });
      return existing._id;
    }

    // Default to 'user' role; assign 'admin' if explicit admin email
    const role = args.email.endsWith("@fluence.internal") || args.email.includes("admin")
      ? "admin"
      : "user";

    return await ctx.db.insert("users", {
      clerkId,
      email: args.email,
      name: args.name,
      role,
      isTrustedLender: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get current user role and trusted lender status.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
  },
});

/**
 * RBAC: Mark a lender as 'Trusted Lender'.
 * STRICTLY ADMIN-ONLY.
 */
export const setTrustedLender = mutation({
  args: {
    targetClerkId: v.string(),
    isTrusted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!caller || caller.role !== "admin") {
      throw new Error("Forbidden: Only an admin can grant or revoke Trusted Lender status");
    }

    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.targetClerkId))
      .first();

    if (!targetUser) {
      throw new Error("User not found");
    }

    await ctx.db.patch(targetUser._id, {
      isTrustedLender: args.isTrusted,
    });

    return { success: true };
  },
});
