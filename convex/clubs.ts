import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

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

// Action to scrape a single club page
export const scrapeClubPage = action({
  args: {
    clubUrl: v.string(),
    clubName: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    clubId?: any;
    data?: any;
    error?: string;
  }> => {
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

    if (!firecrawlApiKey) {
      throw new Error("FIRECRAWL_API_KEY environment variable is not set");
    }

    try {
      // Import Firecrawl dynamically
      const { Firecrawl } = await import("@mendable/firecrawl-js");
      const app = new Firecrawl({ apiKey: firecrawlApiKey });

      // Scrape the club page
      const scrapeResult = await app.scrape(args.clubUrl, {
        formats: ["markdown", "html"],
        includeTags: ["title", "meta", "h1", "h2", "h3", "p", "a", "img"],
        excludeTags: ["script", "style", "nav", "footer"],
      });

      // Extract club information from the scraped data
      const extractedData = extractClubInfo(scrapeResult);

      // Store the club data
      const clubId: any = await ctx.runMutation(api.clubs.upsertClub, {
        name: extractedData.name || args.clubName || "Unknown Club",
        description: extractedData.description || "",
        amsUrl: args.clubUrl,
        websiteUrl: extractedData.websiteUrl,
        socialMedia: extractedData.socialMedia,
        contact: extractedData.contact,
        location: extractedData.location,
        image: extractedData.image,
        categories: extractedData.categories,
        scrapedData: {
          rawHtml: scrapeResult.html,
          extractedText: scrapeResult.markdown,
        },
      });

      return { success: true, clubId, data: extractedData };
    } catch (error) {
      console.error("Error scraping club page:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Helper function to extract club information from scraped data
function extractClubInfo(scrapedData: any) {
  const markdown = scrapedData.markdown || "";
  const html = scrapedData.html || "";

  // Extract club name (usually in h1 or title)
  const nameMatch =
    markdown.match(/^#\s+(.+)$/m) || markdown.match(/title:\s*(.+)/i);
  const name = nameMatch ? nameMatch[1].trim() : "";

  // Extract description (usually the first paragraph after the title)
  const descriptionMatch = markdown.match(/^#.+\n\n(.+?)(?:\n\n|\n##|$)/s);
  const description = descriptionMatch ? descriptionMatch[1].trim() : "";

  // Extract website URL
  const websiteMatch =
    markdown.match(/\[.*?Website.*?\]\((https?:\/\/[^\)]+)\)/i) ||
    markdown.match(/Website:?\s*(https?:\/\/\S+)/i);
  const websiteUrl = websiteMatch ? websiteMatch[1] : undefined;

  // Extract social media links
  const socialMedia = {
    instagram: extractSocialLink(markdown, "instagram"),
    facebook: extractSocialLink(markdown, "facebook"),
    linkedin: extractSocialLink(markdown, "linkedin"),
    twitter: extractSocialLink(markdown, "twitter"),
  };

  // Extract contact information
  const emailMatch = markdown.match(/[\w\.-]+@[\w\.-]+\.\w+/);
  const phoneMatch = markdown.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

  const contact = {
    email: emailMatch ? emailMatch[0] : undefined,
    phone: phoneMatch ? phoneMatch[0] : undefined,
  };

  // Extract location
  const locationMatch =
    markdown.match(/Location[:\s]*\n?(.+?)(?:\n\n|##|$)/is) ||
    markdown.match(/Address[:\s]*\n?(.+?)(?:\n\n|##|$)/is);

  let location = undefined;
  if (locationMatch) {
    const locationText = locationMatch[1].trim();
    const lines = locationText
      .split("\n")
      .map((line: string) => line.trim())
      .filter(Boolean);

    if (lines.length > 0) {
      location = {
        address: lines.join(", "),
        room: extractRoom(locationText),
        building: extractBuilding(locationText),
      };
    }
  }

  // Extract image URL
  const imageMatch = markdown.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
  const image = imageMatch ? imageMatch[1] : undefined;

  // Determine categories based on club name and description
  const categories = determineCategories(name, description);

  return {
    name,
    description,
    websiteUrl,
    socialMedia,
    contact,
    location,
    image,
    categories,
  };
}

function extractSocialLink(text: string, platform: string): string | undefined {
  const patterns = {
    instagram: /(?:instagram\.com\/|@)([a-zA-Z0-9_.]+)/i,
    facebook: /facebook\.com\/([a-zA-Z0-9_.]+)/i,
    linkedin: /linkedin\.com\/(?:company\/|in\/)([a-zA-Z0-9_.-]+)/i,
    twitter: /(?:twitter\.com\/|@)([a-zA-Z0-9_]+)/i,
  };

  const match = text.match(patterns[platform as keyof typeof patterns]);
  return match ? match[0] : undefined;
}

function extractRoom(locationText: string): string | undefined {
  const roomMatch = locationText.match(/(?:room|rm\.?)\s*(\w+\d+|\d+\w*)/i);
  return roomMatch ? roomMatch[1] : undefined;
}

function extractBuilding(locationText: string): string | undefined {
  const buildingMatch = locationText.match(/([A-Z]{2,}(?:\s+[A-Z]{2,})*)/);
  return buildingMatch ? buildingMatch[1] : undefined;
}

function determineCategories(name: string, description: string): string[] {
  const text = `${name} ${description}`.toLowerCase();
  const categories: string[] = [];

  const categoryKeywords = {
    Academic: [
      "academic",
      "study",
      "research",
      "science",
      "engineering",
      "math",
      "computer",
      "business",
    ],
    Cultural: [
      "cultural",
      "culture",
      "international",
      "ethnic",
      "heritage",
      "language",
    ],
    Sports: [
      "sport",
      "athletic",
      "fitness",
      "recreation",
      "team",
      "club sport",
    ],
    Arts: ["art", "music", "dance", "theatre", "creative", "design", "film"],
    Social: ["social", "community", "networking", "friendship"],
    Professional: [
      "professional",
      "career",
      "industry",
      "business",
      "entrepreneurship",
    ],
    Service: [
      "service",
      "volunteer",
      "community service",
      "charity",
      "outreach",
    ],
    Religious: [
      "religious",
      "faith",
      "spiritual",
      "christian",
      "muslim",
      "jewish",
      "buddhist",
    ],
    "Special Interest": [
      "gaming",
      "anime",
      "technology",
      "environment",
      "political",
    ],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      categories.push(category);
    }
  }

  return categories.length > 0 ? categories : ["General"];
}
// Action to scrape all clubs from the AMS directory
export const scrapeAllClubs = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    success: boolean;
    totalClubs?: number;
    successCount?: number;
    errorCount?: number;
    results?: any[];
    error?: string;
  }> => {
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

    if (!firecrawlApiKey) {
      throw new Error("FIRECRAWL_API_KEY environment variable is not set");
    }

    try {
      const { Firecrawl } = await import("@mendable/firecrawl-js");
      const app = new Firecrawl({ apiKey: firecrawlApiKey });

      // First, scrape the main clubs directory page
      const mainPageResult = await app.scrape(
        "https://amsclubs.ca/all-clubs/",
        {
          formats: ["markdown", "html"],
          includeTags: ["a", "img", "h1", "h2", "h3", "p"],
          excludeTags: ["script", "style", "nav", "footer"],
        }
      );

      if (!mainPageResult.success) {
        throw new Error(
          `Failed to scrape main clubs page: ${mainPageResult.error}`
        );
      }

      // Extract club links from the main page
      const clubLinks = extractClubLinks(mainPageResult.data);
      console.log(`Found ${clubLinks.length} club links`);

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      // Scrape each club page (limit to avoid rate limiting)
      const batchSize = 5;
      for (let i = 0; i < clubLinks.length; i += batchSize) {
        const batch = clubLinks.slice(i, i + batchSize);

        const batchPromises: Promise<any>[] = batch.map(
          async (clubLink): Promise<any> => {
            try {
              // Add a small delay to avoid rate limiting
              await new Promise((resolve) => setTimeout(resolve, 1000));

              const result: any = await ctx.runAction(
                api.clubs.scrapeClubPage,
                {
                  clubUrl: clubLink.url,
                  clubName: clubLink.name,
                }
              );

              if (result.success) {
                successCount++;
                console.log(`Successfully scraped: ${clubLink.name}`);
              } else {
                errorCount++;
                console.error(
                  `Failed to scrape ${clubLink.name}: ${result.error}`
                );
              }

              return result;
            } catch (error) {
              errorCount++;
              console.error(`Error scraping ${clubLink.name}:`, error);
              return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
                clubName: clubLink.name,
                clubUrl: clubLink.url,
              };
            }
          }
        );

        const batchResults: any[] = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Log progress
        console.log(
          `Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(clubLinks.length / batchSize)}`
        );
      }

      return {
        success: true,
        totalClubs: clubLinks.length,
        successCount,
        errorCount,
        results,
      };
    } catch (error) {
      console.error("Error in scrapeAllClubs:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Helper function to extract club links from the main directory page
function extractClubLinks(
  scrapedData: any
): Array<{ name: string; url: string }> {
  const html = scrapedData.html || "";
  const markdown = scrapedData.markdown || "";

  const clubLinks: Array<{ name: string; url: string }> = [];

  // Look for links that match the pattern of club pages
  // AMS club pages typically follow the pattern: https://amsclubs.ca/[club-slug]/
  const linkRegex = /\[([^\]]+)\]\((https:\/\/amsclubs\.ca\/[^\/\)]+\/)\)/g;

  let match;
  while ((match = linkRegex.exec(markdown)) !== null) {
    const name = match[1].trim();
    const url = match[2];

    // Filter out non-club links (like "Discover" buttons, navigation, etc.)
    if (
      !name.toLowerCase().includes("discover") &&
      !name.toLowerCase().includes("ubc clubs") &&
      !name.toLowerCase().includes("right-arrow") &&
      !url.includes("/wp-content/") &&
      url !== "https://amsclubs.ca/all-clubs/"
    ) {
      clubLinks.push({ name, url });
    }
  }

  // Also try to extract from HTML if markdown parsing didn't work well
  if (clubLinks.length === 0) {
    const htmlLinkRegex =
      /<a[^>]+href="(https:\/\/amsclubs\.ca\/[^\/\"]+\/)"[^>]*>([^<]+)<\/a>/g;

    while ((match = htmlLinkRegex.exec(html)) !== null) {
      const url = match[1];
      const name = match[2].trim();

      if (
        !name.toLowerCase().includes("discover") &&
        !name.toLowerCase().includes("ubc clubs") &&
        !url.includes("/wp-content/") &&
        url !== "https://amsclubs.ca/all-clubs/"
      ) {
        clubLinks.push({ name, url });
      }
    }
  }

  // Remove duplicates
  const uniqueClubs = clubLinks.filter(
    (club, index, self) => index === self.findIndex((c) => c.url === club.url)
  );

  return uniqueClubs;
}

// Action to scrape a specific club by URL (for testing)
export const scrapeSpecificClub = action({
  args: { clubUrl: v.string() },
  handler: async (ctx, args): Promise<any> => {
    return await ctx.runAction(api.clubs.scrapeClubPage, {
      clubUrl: args.clubUrl,
    });
  },
});
