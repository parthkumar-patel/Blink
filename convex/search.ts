import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Add search to history
export const addSearchToHistory = mutation({
  args: {
    userId: v.id("users"),
    query: v.string(),
    resultsCount: v.number(),
  },
  handler: async (ctx, args) => {
    // Don't save empty or very short queries
    if (!args.query.trim() || args.query.trim().length < 2) {
      return;
    }

    const normalizedQuery = args.query.trim().toLowerCase();

    // Check if this exact query already exists recently (within last 24 hours)
    const yesterday = Date.now() - (24 * 60 * 60 * 1000);
    const existingSearch = await ctx.db
      .query("searchHistory")
      .withIndex("by_user_date")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("query"), normalizedQuery),
          q.gte(q.field("createdAt"), yesterday)
        )
      )
      .first();

    // If not found recently, add new search history entry
    if (!existingSearch) {
      await ctx.db.insert("searchHistory", {
        userId: args.userId,
        query: normalizedQuery,
        resultsCount: args.resultsCount,
        createdAt: Date.now(),
      });
    }

    // Keep only last 50 searches per user
    const userSearches = await ctx.db
      .query("searchHistory")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    if (userSearches.length > 50) {
      const toDelete = userSearches.slice(50);
      for (const search of toDelete) {
        await ctx.db.delete(search._id);
      }
    }
  },
});

// Get user's search history
export const getSearchHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const searches = await ctx.db
      .query("searchHistory")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 20);

    return searches;
  },
});

// Clear search history
export const clearSearchHistory = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const searches = await ctx.db
      .query("searchHistory")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const search of searches) {
      await ctx.db.delete(search._id);
    }
  },
});

// Save a search with filters
export const saveSearch = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    query: v.string(),
    filters: v.object({
      categories: v.optional(v.array(v.string())),
      dateRange: v.optional(v.object({
        start: v.optional(v.number()),
        end: v.optional(v.number()),
      })),
      priceFilter: v.optional(v.string()),
      locationFilter: v.optional(v.string()),
      distanceFilter: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    // Check if user already has a saved search with this name
    const existingSearch = await ctx.db
      .query("savedSearches")
      .withIndex("by_user_name", (q) => 
        q.eq("userId", args.userId).eq("name", args.name)
      )
      .first();

    if (existingSearch) {
      throw new Error("A saved search with this name already exists");
    }

    // Create new saved search
    const searchId = await ctx.db.insert("savedSearches", {
      userId: args.userId,
      name: args.name,
      query: args.query,
      filters: args.filters,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    });

    return searchId;
  },
});

// Get user's saved searches
export const getSavedSearches = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const savedSearches = await ctx.db
      .query("savedSearches")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return savedSearches;
  },
});

// Update last used timestamp for saved search
export const useSavedSearch = mutation({
  args: {
    searchId: v.id("savedSearches"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.searchId, {
      lastUsed: Date.now(),
    });
  },
});

// Delete a saved search
export const deleteSavedSearch = mutation({
  args: {
    searchId: v.id("savedSearches"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const search = await ctx.db.get(args.searchId);
    
    if (!search || search.userId !== args.userId) {
      throw new Error("Saved search not found or not authorized");
    }

    await ctx.db.delete(args.searchId);
  },
});

// Get search analytics/insights for user
export const getSearchInsights = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get recent search history
    const recentSearches = await ctx.db
      .query("searchHistory")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(100);

    // Analyze search patterns
    const topSearches = new Map<string, number>();
    const categoryInterests = new Map<string, number>();
    let totalSearches = recentSearches.length;

    recentSearches.forEach(search => {
      topSearches.set(search.query, (topSearches.get(search.query) || 0) + 1);
    });

    // Get top 5 searches
    const topSearchesList = Array.from(topSearches.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([query, count]) => ({ query, count }));

    return {
      totalSearches,
      topSearches: topSearchesList,
      averageResultsFound: totalSearches > 0 
        ? recentSearches.reduce((sum, s) => sum + s.resultsCount, 0) / totalSearches 
        : 0,
      searchesThisWeek: recentSearches.filter(s => 
        s.createdAt > Date.now() - (7 * 24 * 60 * 60 * 1000)
      ).length,
    };
  },
});
