import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Add an event to favorites
export const addToFavorites = mutation({
  args: {
    userId: v.id("users"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Check if already favorited
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_event", (q) => 
        q.eq("userId", args.userId).eq("eventId", args.eventId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Add to favorites
    const favoriteId = await ctx.db.insert("favorites", {
      userId: args.userId,
      eventId: args.eventId,
      createdAt: Date.now(),
    });

    return favoriteId;
  },
});

// Remove an event from favorites
export const removeFromFavorites = mutation({
  args: {
    userId: v.id("users"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_event", (q) => 
        q.eq("userId", args.userId).eq("eventId", args.eventId)
      )
      .first();

    if (favorite) {
      await ctx.db.delete(favorite._id);
    }

    return true;
  },
});

// Toggle favorite status
export const toggleFavorite = mutation({
  args: {
    userId: v.id("users"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_event", (q) => 
        q.eq("userId", args.userId).eq("eventId", args.eventId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { isFavorited: false };
    } else {
      await ctx.db.insert("favorites", {
        userId: args.userId,
        eventId: args.eventId,
        createdAt: Date.now(),
      });
      return { isFavorited: true };
    }
  },
});

// Get user's favorites
export const getUserFavorites = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 50);

    return favorites;
  },
});

// Get favorited events for a user
export const getFavoritedEvents = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 50);

    const events = await Promise.all(
      favorites.map(async (favorite) => {
        const event = await ctx.db.get(favorite.eventId);
        return event;
      })
    );

    return events.filter(Boolean);
  },
});

// Check if an event is favorited by user
export const isEventFavorited = query({
  args: {
    userId: v.id("users"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_event", (q) => 
        q.eq("userId", args.userId).eq("eventId", args.eventId)
      )
      .first();

    return !!favorite;
  },
});

// Get favorite status for multiple events
export const getFavoriteStatuses = query({
  args: {
    userId: v.id("users"),
    eventIds: v.array(v.id("events")),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const favoriteEventIds = new Set(favorites.map(f => f.eventId));
    
    const statuses: Record<string, boolean> = {};
    args.eventIds.forEach(eventId => {
      statuses[eventId] = favoriteEventIds.has(eventId);
    });

    return statuses;
  },
});

