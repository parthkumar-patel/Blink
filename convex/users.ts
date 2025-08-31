import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get current user profile (requires Clerk authentication)
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    return user;
  },
});

// Get user profile by Clerk ID
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    return user;
  },
});

// Create or update user profile
export const createOrUpdateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    university: v.optional(v.string()),
    year: v.optional(
      v.union(
        v.literal("freshman"),
        v.literal("sophomore"),
        v.literal("junior"),
        v.literal("senior"),
        v.literal("graduate")
      )
    ),
    interests: v.optional(v.array(v.string())),
    location: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
        address: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    const userData = {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      university: args.university || "UBC",
      year: args.year || "freshman",
      interests: args.interests || [],
      location: args.location,
      preferences: {
        maxDistance: 25, // Default 25km radius
        notificationSettings: {
          email: true,
          push: true,
          sms: false,
        },
        privacySettings: {
          profileVisible: true,
          showInBuddyMatching: true,
        },
        buddyMatchingEnabled: true,
      },
      lastActiveAt: Date.now(),
    };

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        ...userData,
        preferences: existingUser.preferences, // Keep existing preferences
      });
      return existingUser._id;
    } else {
      // Create new user
      const userId = await ctx.db.insert("users", userData);
      return userId;
    }
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    clerkId: v.string(),
    university: v.optional(v.string()),
    year: v.optional(
      v.union(
        v.literal("freshman"),
        v.literal("sophomore"),
        v.literal("junior"),
        v.literal("senior"),
        v.literal("graduate")
      )
    ),
    interests: v.optional(v.array(v.string())),
    location: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
        address: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const updates: any = {
      lastActiveAt: Date.now(),
    };

    if (args.university !== undefined) updates.university = args.university;
    if (args.year !== undefined) updates.year = args.year;
    if (args.interests !== undefined) updates.interests = args.interests;
    if (args.location !== undefined) updates.location = args.location;

    await ctx.db.patch(user._id, updates);
    return user._id;
  },
});

// Update user preferences
export const updateUserPreferences = mutation({
  args: {
    clerkId: v.string(),
    preferences: v.object({
      maxDistance: v.optional(v.number()),
      notificationSettings: v.optional(
        v.object({
          email: v.boolean(),
          push: v.boolean(),
          sms: v.boolean(),
        })
      ),
      privacySettings: v.optional(
        v.object({
          profileVisible: v.boolean(),
          showInBuddyMatching: v.boolean(),
        })
      ),
      buddyMatchingEnabled: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const updatedPreferences = {
      ...user.preferences,
      ...args.preferences,
    };

    if (args.preferences.notificationSettings) {
      updatedPreferences.notificationSettings = {
        ...user.preferences.notificationSettings,
        ...args.preferences.notificationSettings,
      };
    }

    if (args.preferences.privacySettings) {
      updatedPreferences.privacySettings = {
        ...user.preferences.privacySettings,
        ...args.preferences.privacySettings,
      };
    }

    await ctx.db.patch(user._id, {
      preferences: updatedPreferences,
      lastActiveAt: Date.now(),
    });

    return user._id;
  },
});
