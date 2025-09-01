import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Query to get all clubs
export const getAllClubs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("clubs").collect();
  },
});

// Query to get clubs by category
export const getClubsByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    const clubs = await ctx.db.query("clubs").collect();
    return clubs.filter((club) => club.categories.includes(args.category));
  },
});

// Query to search clubs
export const searchClubs = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clubs")
      .withSearchIndex("search_clubs", (q) => q.search("name", args.searchTerm))
      .collect();
  },
});

// Mutation to create or update a club
export const upsertClub = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    amsUrl: v.string(),
    websiteUrl: v.optional(v.string()),
    socialMedia: v.object({
      instagram: v.optional(v.string()),
      facebook: v.optional(v.string()),
      linkedin: v.optional(v.string()),
      twitter: v.optional(v.string()),
    }),
    contact: v.object({
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
    }),
    location: v.optional(
      v.object({
        address: v.string(),
        room: v.optional(v.string()),
        building: v.optional(v.string()),
      })
    ),
    image: v.optional(v.string()),
    categories: v.array(v.string()),
    scrapedData: v.optional(
      v.object({
        rawHtml: v.optional(v.string()),
        extractedText: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Check if club already exists by AMS URL
    const existingClub = await ctx.db
      .query("clubs")
      .withIndex("by_ams_url", (q) => q.eq("amsUrl", args.amsUrl))
      .first();

    const clubData = {
      ...args,
      isActive: true,
      lastScrapedAt: Date.now(),
    };

    if (existingClub) {
      // Update existing club
      await ctx.db.patch(existingClub._id, clubData);
      return existingClub._id;
    } else {
      // Create new club
      return await ctx.db.insert("clubs", clubData);
    }
  },
});