import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";

// Eventbrite API integration
export const syncEventbriteEvents = internalAction({
  args: {
    categories: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.EVENTBRITE_API_KEY;
    if (!apiKey) {
      throw new Error("EVENTBRITE_API_KEY not configured");
    }

    try {
      console.log("Starting Eventbrite sync...");

      // Calculate date range (next 3 months)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);

      const searchParams = new URLSearchParams({
        "location.address": "Vancouver, BC, Canada",
        "location.within": "25km",
        "start_date.range_start": startDate.toISOString(),
        "start_date.range_end": endDate.toISOString(),
        expand: "venue,organizer,category,subcategory",
        page_size: (args.limit || 50).toString(),
        sort_by: "date",
      });

      // Add categories if specified
      if (args.categories && args.categories.length > 0) {
        const eventbriteCategories = mapCategoriesToEventbrite(args.categories);
        eventbriteCategories.forEach((cat) => {
          searchParams.append("categories", cat);
        });
      }

      const response = await fetch(
        `https://www.eventbriteapi.com/v3/events/search/?${searchParams}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Eventbrite API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log(`Found ${data.events.length} Eventbrite events`);

      let processedCount = 0;
      let errorCount = 0;

      for (const eventbriteEvent of data.events) {
        try {
          const normalizedEvent = normalizeEventbriteEvent(eventbriteEvent);

          // Check for duplicates before inserting
          const isDuplicate = await ctx.runQuery(
            internal.aggregation.checkEventDuplicate,
            {
              title: normalizedEvent.title,
              startDate: normalizedEvent.startDate,
              sourceId: normalizedEvent.source.originalId,
            }
          );

          if (!isDuplicate) {
            await ctx.runMutation(
              internal.aggregation.insertEvent,
              normalizedEvent
            );
            processedCount++;
          }
        } catch (error) {
          console.error(
            `Error processing Eventbrite event ${eventbriteEvent.id}:`,
            error
          );
          errorCount++;
        }
      }

      console.log(
        `Eventbrite sync completed: ${processedCount} events processed, ${errorCount} errors`
      );

      return {
        success: true,
        processed: processedCount,
        errors: errorCount,
        total: data.events.length,
      };
    } catch (error) {
      console.error("Eventbrite sync failed:", error);
      throw error;
    }
  },
});

// Firecrawl UBC events integration
export const syncUBCEvents = internalAction({
  args: {},
  handler: async (ctx, args) => {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY not configured");
    }

    try {
      console.log("Starting UBC events sync...");

      const ubcEventSources = [
        "https://events.ubc.ca",
        "https://students.ubc.ca/campus-life",
      ];

      let totalProcessed = 0;
      let totalErrors = 0;

      for (const url of ubcEventSources) {
        try {
          console.log(`Scraping events from: ${url}`);

          const scrapeResponse = await fetch(
            "https://api.firecrawl.dev/v0/scrape",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url,
                formats: ["markdown"],
                includeTags: [
                  "title",
                  "meta",
                  "h1",
                  "h2",
                  "h3",
                  "p",
                  "div",
                  "time",
                  "a",
                ],
                excludeTags: ["script", "style", "nav", "footer", "header"],
                waitFor: 2000,
              }),
            }
          );

          if (!scrapeResponse.ok) {
            throw new Error(
              `Firecrawl API error for ${url}: ${scrapeResponse.status}`
            );
          }

          const scrapeData = await scrapeResponse.json();

          if (!scrapeData.success) {
            throw new Error(`Failed to scrape ${url}: ${scrapeData.error}`);
          }

          // Extract events from scraped content using AI
          const events = await extractEventsFromContentWithAI(
            scrapeData.markdown || "",
            url
          );
          console.log(`Extracted ${events.length} events from ${url}`);

          let processedCount = 0;
          let errorCount = 0;

          for (const scrapedEvent of events) {
            try {
              const normalizedEvent = normalizeScrapedEvent(scrapedEvent, url);

              // Check for duplicates
              const isDuplicate = await ctx.runQuery(
                internal.aggregation.checkEventDuplicate,
                {
                  title: normalizedEvent.title,
                  startDate: normalizedEvent.startDate,
                  sourceId: normalizedEvent.source.originalId,
                }
              );

              if (!isDuplicate) {
                await ctx.runMutation(
                  internal.aggregation.insertEvent,
                  normalizedEvent
                );
                processedCount++;
              }
            } catch (error) {
              console.error(`Error processing scraped event:`, error);
              errorCount++;
            }
          }

          totalProcessed += processedCount;
          totalErrors += errorCount;

          console.log(
            `Processed ${processedCount} events from ${url}, ${errorCount} errors`
          );
        } catch (error) {
          console.error(`Error scraping ${url}:`, error);
          totalErrors++;
        }
      }

      console.log(
        `UBC events sync completed: ${totalProcessed} events processed, ${totalErrors} errors`
      );

      return {
        success: true,
        processed: totalProcessed,
        errors: totalErrors,
      };
    } catch (error) {
      console.error("UBC events sync failed:", error);
      throw error;
    }
  },
});

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

// Scheduled function to run daily sync
export const dailyEventSync = internalAction({
  args: {},
  handler: async (ctx): Promise<any> => {
    console.log("Starting daily event sync...");

    try {
      // Sync Eventbrite events
      const eventbriteResult: any = await ctx.runAction(
        internal.aggregation.syncEventbriteEvents,
        {
          categories: ["tech", "career", "academic", "networking"],
          limit: 100,
        }
      );

      // Sync UBC events
      const ubcResult: any = await ctx.runAction(
        internal.aggregation.syncUBCEvents,
        {}
      );

      console.log("Daily sync completed:", {
        eventbrite: eventbriteResult,
        ubc: ubcResult,
      });

      return {
        success: true,
        eventbrite: eventbriteResult,
        ubc: ubcResult,
      };
    } catch (error) {
      console.error("Daily sync failed:", error);
      throw error;
    }
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

// Helper functions
function mapCategoriesToEventbrite(categories: string[]): string[] {
  const categoryMap: Record<string, string> = {
    tech: "102", // Science & Technology
    career: "101", // Business & Professional
    academic: "113", // Community & Culture
    music: "103", // Music
    sports: "108", // Sports & Fitness
    food: "110", // Food & Drink
    arts: "105", // Performing & Visual Arts
    networking: "101", // Business & Professional
    workshop: "102", // Science & Technology
    social: "113", // Community & Culture
    cultural: "113", // Community & Culture
    volunteering: "113", // Community & Culture
  };

  return categories
    .map((cat) => categoryMap[cat.toLowerCase()])
    .filter(Boolean);
}

function normalizeEventbriteEvent(eventbriteEvent: any) {
  const startDate = new Date(eventbriteEvent.start.utc);
  const endDate = new Date(eventbriteEvent.end.utc);

  const location = eventbriteEvent.venue
    ? {
        name: eventbriteEvent.venue.name,
        address: `${eventbriteEvent.venue.address.address_1}, ${eventbriteEvent.venue.address.city}, ${eventbriteEvent.venue.address.region}`,
        latitude: parseFloat(eventbriteEvent.venue.latitude),
        longitude: parseFloat(eventbriteEvent.venue.longitude),
        isVirtual: eventbriteEvent.online_event,
      }
    : {
        name: "Online Event",
        address: "Virtual",
        latitude: 49.2827,
        longitude: -123.1207,
        isVirtual: true,
      };

  const categories = categorizeEventbriteEvent(eventbriteEvent);
  const tags = [
    eventbriteEvent.category.name.toLowerCase(),
    ...(eventbriteEvent.subcategory
      ? [eventbriteEvent.subcategory.name.toLowerCase()]
      : []),
  ];

  return {
    title: eventbriteEvent.name.text,
    description: eventbriteEvent.description.text || "",
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
    location,
    organizer: {
      name: eventbriteEvent.organizer.name,
      type: "external" as const,
      verified: false,
      contactInfo: eventbriteEvent.organizer.description?.text || "",
    },
    categories,
    tags,
    capacity: eventbriteEvent.capacity,
    price: {
      amount: 0,
      currency: "CAD",
      isFree: eventbriteEvent.is_free,
    },
    images: eventbriteEvent.logo ? [eventbriteEvent.logo.url] : [],
    externalLinks: {
      registration: eventbriteEvent.url,
      website: eventbriteEvent.url,
    },
    source: {
      platform: "eventbrite",
      originalId: eventbriteEvent.id,
      url: eventbriteEvent.url,
    },
    rsvpCount: 0,
  };
}

function categorizeEventbriteEvent(event: any): string[] {
  const categories: string[] = [];
  const categoryName = event.category.name.toLowerCase();
  const title = event.name.text.toLowerCase();
  const description = event.description.text?.toLowerCase() || "";

  if (
    categoryName.includes("technology") ||
    categoryName.includes("science") ||
    title.includes("hackathon") ||
    title.includes("coding") ||
    title.includes("tech")
  ) {
    categories.push("tech");
  }

  if (
    categoryName.includes("business") ||
    categoryName.includes("professional") ||
    title.includes("career") ||
    title.includes("job") ||
    title.includes("networking")
  ) {
    categories.push("career", "networking");
  }

  if (
    categoryName.includes("music") ||
    title.includes("concert") ||
    title.includes("music")
  ) {
    categories.push("music");
  }

  if (categoryName.includes("sports") || categoryName.includes("fitness")) {
    categories.push("sports");
  }

  if (categoryName.includes("food") || categoryName.includes("drink")) {
    categories.push("food");
  }

  if (categoryName.includes("arts") || categoryName.includes("performing")) {
    categories.push("arts");
  }

  if (title.includes("workshop") || title.includes("seminar")) {
    categories.push("workshop", "academic");
  }

  if (title.includes("volunteer") || description.includes("volunteer")) {
    categories.push("volunteering");
  }

  if (categoryName.includes("community") || categoryName.includes("culture")) {
    categories.push("social", "cultural");
  }

  return categories.length > 0 ? [...new Set(categories)] : ["social"];
}

async function extractEventsFromContentWithAI(
  content: string,
  sourceUrl: string
) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // Try AI extraction first
  if (apiKey) {
    try {
      const aiEvents = await extractEventsWithAI(content, apiKey);
      if (aiEvents.length > 0) {
        return aiEvents.map((event: any) => ({
          ...event,
          url: sourceUrl,
        }));
      }
    } catch (error) {
      console.error("AI extraction failed, falling back to regex:", error);
    }
  }

  // Fallback to regex extraction
  return extractEventsFromContent(content, sourceUrl);
}

async function extractEventsWithAI(content: string, apiKey: string) {
  const prompt = `Extract event information from this content. Look for events, workshops, meetups, seminars, or student activities.

For each event found, extract:
- title: Event name
- description: Brief description
- date: Date in YYYY-MM-DD format (if available)
- time: Time if specified
- location: Venue or location
- organizer: Who is organizing it

Return as JSON array. If no events found, return empty array.

Content:
${content.slice(0, 3000)}

JSON:`;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ubc-events-finder.vercel.app",
        "X-Title": "UBC Events Finder",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.3,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const jsonText = data.choices?.[0]?.message?.content?.trim();

  if (!jsonText) {
    return [];
  }

  // Try to extract JSON from the response
  const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return [];
  }

  const events = JSON.parse(jsonMatch[0]);
  return Array.isArray(events) ? events : [];
}

function extractEventsFromContent(content: string, sourceUrl: string) {
  // Simple extraction logic - fallback when AI is not available
  const events: any[] = [];
  const lines = content.split("\n");

  let currentEvent: any = {};

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Look for event titles
    if (isEventTitle(trimmedLine)) {
      if (currentEvent.title) {
        events.push(completeEvent(currentEvent, sourceUrl));
      }
      currentEvent = { title: cleanText(trimmedLine) };
    }
    // Look for dates
    else if (containsDate(trimmedLine) && currentEvent.title) {
      currentEvent.date = extractDate(trimmedLine);
    }
    // Look for locations
    else if (isLocation(trimmedLine) && currentEvent.title) {
      currentEvent.location = cleanText(trimmedLine);
    }
    // Look for descriptions
    else if (
      trimmedLine.length > 50 &&
      currentEvent.title &&
      !currentEvent.description
    ) {
      currentEvent.description = cleanText(trimmedLine);
    }
  }

  if (currentEvent.title) {
    events.push(completeEvent(currentEvent, sourceUrl));
  }

  return events.filter((event) => event.title && event.date);
}

function normalizeScrapedEvent(scrapedEvent: any, sourceUrl: string) {
  const startDate = new Date(scrapedEvent.date);
  const endDate = new Date(startDate);
  endDate.setHours(startDate.getHours() + 2);

  return {
    title: scrapedEvent.title,
    description: scrapedEvent.description || "No description available",
    startDate: startDate.getTime(),
    endDate: endDate.getTime(),
    location: {
      name: scrapedEvent.location || "UBC Campus",
      address: "University of British Columbia, Vancouver, BC",
      latitude: 49.2606,
      longitude: -123.246,
      isVirtual: (scrapedEvent.location || "").toLowerCase().includes("online"),
    },
    organizer: {
      name: scrapedEvent.organizer || "UBC",
      type: "university" as const,
      verified: true,
      contactInfo: "",
    },
    categories: scrapedEvent.categories || ["social"],
    tags: scrapedEvent.categories || [],
    price: {
      amount: 0,
      currency: "CAD",
      isFree: true,
    },
    images: [],
    externalLinks: {
      website: sourceUrl,
    },
    source: {
      platform: "firecrawl",
      originalId: `${sourceUrl}-${scrapedEvent.title.replace(/\s+/g, "-")}`,
      url: sourceUrl,
    },
    rsvpCount: 0,
  };
}

// Helper functions for content extraction
function isEventTitle(line: string): boolean {
  const eventKeywords = [
    "workshop",
    "seminar",
    "meetup",
    "conference",
    "hackathon",
    "talk",
    "presentation",
    "event",
  ];
  const lowerLine = line.toLowerCase();
  return (
    eventKeywords.some((keyword) => lowerLine.includes(keyword)) &&
    line.length < 100
  );
}

function containsDate(line: string): boolean {
  const datePatterns = [
    /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
    /\w+\s+\d{1,2},?\s+\d{4}/,
    /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
  ];
  return datePatterns.some((pattern) => pattern.test(line));
}

function extractDate(line: string): string {
  const dateMatch = line.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
  if (dateMatch) {
    const parts = dateMatch[0].split(/[\/\-]/);
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${year}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
  }
  return new Date().toISOString().split("T")[0];
}

function isLocation(line: string): boolean {
  const locationKeywords = [
    "room",
    "building",
    "hall",
    "center",
    "campus",
    "online",
    "virtual",
  ];
  const lowerLine = line.toLowerCase();
  return (
    locationKeywords.some((keyword) => lowerLine.includes(keyword)) ||
    line.includes("UBC")
  );
}

function cleanText(text: string): string {
  return text
    .replace(/^#+\s*/, "")
    .replace(/\*\*/g, "")
    .trim();
}

function completeEvent(event: any, sourceUrl: string) {
  return {
    title: event.title || "Untitled Event",
    description: event.description || "No description available",
    date: event.date || new Date().toISOString().split("T")[0],
    location: event.location || "UBC Campus",
    organizer: event.organizer || "UBC",
    categories: ["social"],
  };
}
