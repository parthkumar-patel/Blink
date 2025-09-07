import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

// Helper to update event RSVP count
async function updateEventRsvpCount(ctx: MutationCtx, eventId: Id<"events">) {
  const allRsvps: Doc<"rsvps">[] = await ctx.db
    .query("rsvps")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();

  const activeRsvps: Doc<"rsvps">[] = allRsvps.filter(
    (rsvp: Doc<"rsvps">) => rsvp.status === "going" || rsvp.status === "interested"
  );

  await ctx.db.patch(eventId, {
    rsvpCount: activeRsvps.length,
  });
}

// RSVP to an event
export const rsvpToEvent = mutation({
  args: {
    clerkId: v.string(),
    eventId: v.id("events"),
    status: v.union(
      v.literal("going"),
      v.literal("interested"),
      v.literal("not_going")
    ),
    buddyMatchingEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if RSVP already exists
    const existingRsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    if (existingRsvp) {
      // Update existing RSVP
      await ctx.db.patch(existingRsvp._id, {
        status: args.status,
        buddyMatchingEnabled:
          args.buddyMatchingEnabled ?? existingRsvp.buddyMatchingEnabled,
        createdAt: existingRsvp.createdAt ?? Date.now(),
      });

      // Update event RSVP count
      await updateEventRsvpCount(ctx, args.eventId);

      return existingRsvp._id;
    } else {
      // Create new RSVP
      const rsvpId = await ctx.db.insert("rsvps", {
        userId: user._id,
        eventId: args.eventId,
        status: args.status,
        buddyMatchingEnabled:
          args.buddyMatchingEnabled ?? user.preferences.buddyMatchingEnabled,
        createdAt: Date.now(),
      });

      // Update event RSVP count
      await updateEventRsvpCount(ctx, args.eventId);

      return rsvpId;
    }
  },
});

// Get user's RSVPs
export const getUserRsvps = query({
  args: {
    clerkId: v.string(),
    status: v.optional(
      v.union(
        v.literal("going"),
        v.literal("interested"),
        v.literal("not_going")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      return [] as Array<Doc<"rsvps"> & { event: Doc<"events"> | null }>;
    }

    let rsvpsQuery = ctx.db
      .query("rsvps")
      .withIndex("by_user", (q) => q.eq("userId", user._id));

    if (args.status) {
      rsvpsQuery = rsvpsQuery.filter((q) =>
        q.eq(q.field("status"), args.status)
      );
    }

    const rsvps = await rsvpsQuery.collect();

    // Get the events for these RSVPs
    const eventsWithRsvps = await Promise.all(
      rsvps.map(async (rsvp) => {
        const event = await ctx.db.get(rsvp.eventId);
        return {
          ...rsvp,
          event,
        };
      })
    );

    return eventsWithRsvps.filter((item) => item.event !== null);
  },
});

// Get RSVPs for an event
export const getEventRsvps = query({
  args: {
    eventId: v.id("events"),
    status: v.optional(
      v.union(
        v.literal("going"),
        v.literal("interested"),
        v.literal("not_going")
      )
    ),
  },
  handler: async (ctx, args) => {
    let rsvpsQuery = ctx.db
      .query("rsvps")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId));

    if (args.status) {
      rsvpsQuery = rsvpsQuery.filter((q) =>
        q.eq(q.field("status"), args.status)
      );
    }

    const rsvps = await rsvpsQuery.collect();

    // Get user info for each RSVP (respecting privacy settings)
    const rsvpsWithUsers = await Promise.all(
      rsvps.map(async (rsvp) => {
        const user = await ctx.db.get(rsvp.userId);
        if (!user || !user.preferences.privacySettings.profileVisible) {
          return {
            ...rsvp,
            user: null, // Hide user info if privacy settings don't allow
          };
        }
        return {
          ...rsvp,
          user: {
            id: user._id,
            name: user.name,
            university: user.university,
            year: user.year,
          },
        };
      })
    );

    return rsvpsWithUsers;
  },
});

// Get user's RSVP status for a specific event
export const getUserEventRsvp = query({
  args: {
    clerkId: v.string(),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      return null;
    }

    const rsvp = await ctx.db
      .query("rsvps")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", user._id).eq("eventId", args.eventId)
      )
      .unique();

    return rsvp;
  },
});

// New simplified RSVP functions for the dashboard
export const createRSVP = mutation({
  args: {
    eventId: v.id("events"),
    status: v.union(v.literal("going"), v.literal("interested")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Create RSVP
    const rsvpId = await ctx.db.insert("rsvps", {
      userId: user._id,
      eventId: args.eventId,
      status: args.status,
      buddyMatchingEnabled: user.preferences?.buddyMatchingEnabled ?? false,
      createdAt: Date.now(),
    });

    // Update event RSVP count
    await updateEventRsvpCount(ctx, args.eventId);

    return rsvpId;
  },
});

export const updateRSVP = mutation({
  args: {
    rsvpId: v.id("rsvps"),
    status: v.union(
      v.literal("going"),
      v.literal("interested"),
      v.literal("not_going")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const rsvp = await ctx.db.get(args.rsvpId);
    if (!rsvp) {
      throw new Error("RSVP not found");
    }

    // Update RSVP
    await ctx.db.patch(args.rsvpId, {
      status: args.status,
      createdAt: rsvp.createdAt ?? Date.now(),
    });

    // Update event RSVP count
    await updateEventRsvpCount(ctx, rsvp.eventId);

    return args.rsvpId;
  },
});

export const getUserRSVPs = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rsvps")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.neq(q.field("status"), "not_going"))
      .collect();
  },
});

export const getEventsForUserRSVPs = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get user's RSVPs
    const rsvps = await ctx.db
      .query("rsvps")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.neq(q.field("status"), "not_going"))
      .collect();

    // Get events for those RSVPs
    const events: Doc<"events">[] = [];
    for (const rsvp of rsvps) {
      const event = await ctx.db.get(rsvp.eventId);
      if (event) {
        events.push(event);
      }
    }

    return events;
  },
});
