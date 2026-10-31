import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Public Endpoint (Data Minimization requirement):
 * Exposes ONLY tool name and category for unauthenticated visitors.
 * NO owner details, timestamps, or descriptions are leaked publicly.
 */
export const listPublicTools = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let tools = await ctx.db
      .query("tools")
      .withIndex("by_availability", (q) => q.eq("isAvailable", true))
      .collect();

    if (args.category && args.category !== "all") {
      tools = tools.filter((t) => t.category === args.category);
    }

    // Strict projection: name and category ONLY
    return tools.map((t) => ({
      _id: t._id,
      name: t.name,
      category: t.category,
      isAvailable: t.isAvailable,
    }));
  },
});

/**
 * Authenticated Tool Explorer:
 * Returns full tool details for registered users.
 */
export const listAllTools = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: Must sign in to view tool details");
    }

    let tools = await ctx.db.query("tools").order("desc").collect();

    if (args.category && args.category !== "all") {
      tools = tools.filter((t) => t.category === args.category);
    }

    return tools;
  },
});

/**
 * My Listings:
 * Returns tools listed by the calling user.
 */
export const getMyTools = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .order("desc")
      .collect();
  },
});

/**
 * Create a new tool listing.
 */
export const createTool = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated: Sign in required to list tools");
    }

    return await ctx.db.insert("tools", {
      name: args.name,
      category: args.category,
      condition: args.condition,
      description: args.description,
      ownerId: identity.subject,
      isAvailable: true,
      createdAt: Date.now(),
    });
  },
});

/**
 * Delete Tool Listing with RBAC:
 * - Admin: Can delete ANY listing.
 * - User: Can delete ONLY their own listing.
 * Enforced at database mutation level.
 */
export const deleteTool = mutation({
  args: {
    toolId: v.id("tools"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new Error("Tool not found");
    }

    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    const isAdmin = caller?.role === "admin";
    const isOwner = tool.ownerId === identity.subject;

    if (!isAdmin && !isOwner) {
      throw new Error("Forbidden: You do not have permission to delete this tool");
    }

    await ctx.db.delete(args.toolId);
    return { success: true };
  },
});
