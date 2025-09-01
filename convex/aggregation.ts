import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
} from "./_generated/server";

// Internal mutation to insert events
export const insertEvent = internalMutation({
  args: {
    title: v.string(),
    description: v.string(),
    aiSummary: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    location: v.object({
      name: v.string(),
      address: v.string(),
      latitude: v.number(),
      longitude: v.number(),
      isVirtual: v.boolean(),
    }),
    organizer: v.object({
      name: v.string(),
      type: v.union(
        v.literal("club"),
        v.literal("university"),
        v.literal("external"),
        v.literal("student")
      ),
      verified: v.boolean(),
      contactInfo: v.string(),
    }),
    categories: v.array(v.string()),
    tags: v.array(v.string()),
    capacity: v.optional(v.number()),
    price: v.object({
      amount: v.number(),
      currency: v.string(),
      isFree: v.boolean(),
    }),
    images: v.array(v.string()),
    externalLinks: v.object({
      registration: v.optional(v.string()),
      website: v.optional(v.string()),
      social: v.optional(v.array(v.string())),
    }),
    source: v.object({
      platform: v.string(),
      originalId: v.string(),
      url: v.string(),
    }),
    rsvpCount: v.number(),
    attendanceCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("events", args);
    return eventId;
  },
});

// Internal query to check for duplicate events
export const checkEventDuplicate = internalQuery({
  args: {
    title: v.string(),
    startDate: v.number(),
    sourceId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for exact source match first
    const exactMatch = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("source.originalId"), args.sourceId))
      .first();

    if (exactMatch) {
      return true;
    }

    // Check for similar events (same title and date within 1 hour)
    const similarEvents = await ctx.db
      .query("events")
      .filter((q) =>
        q.and(
          q.eq(q.field("title"), args.title),
          q.gte(q.field("startDate"), args.startDate - 3600000), // 1 hour before
          q.lte(q.field("startDate"), args.startDate + 3600000) // 1 hour after
        )
      )
      .collect();

    return similarEvents.length > 0;
  },
});

// Clean up old events (older than 1 month)
export const cleanupOldEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const oldEvents = await ctx.db
      .query("events")
      .filter((q) => q.lt(q.field("endDate"), oneMonthAgo))
      .collect();

    console.log(`Found ${oldEvents.length} old events to clean up`);

    for (const event of oldEvents) {
      // Also clean up related RSVPs
      const rsvps = await ctx.db
        .query("rsvps")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();

      for (const rsvp of rsvps) {
        await ctx.db.delete(rsvp._id);
      }

      // Delete the event
      await ctx.db.delete(event._id);
    }

    console.log(`Cleaned up ${oldEvents.length} old events and their RSVPs`);

    return {
      success: true,
      deletedEvents: oldEvents.length,
    };
  },
});