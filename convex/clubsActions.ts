"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

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

      // Scrape clubs by going through each letter and handling pagination
      const allClubLinks: Array<{ name: string; url: string }> = [];
      const letters = [
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j",
        "k",
        "l",
        "m",
        "n",
        "o",
        "p",
        "q",
        "r",
        "s",
        "t",
        "u",
        "v",
        "w",
        "x",
        "y",
        "z",
        "0-9",
      ];

      for (const letter of letters) {
        console.log(`Scraping clubs for letter: ${letter}`);
        let currentPage = 1;
        let hasMorePages = true;

        while (hasMorePages) {
          const pageUrl =
            currentPage === 1
              ? `https://amsclubs.ca/all-clubs/letter/${letter}/`
              : `https://amsclubs.ca/all-clubs/letter/${letter}/${currentPage}/`;

          console.log(`Scraping page: ${pageUrl}`);

          try {
            const pageResult = await app.scrape(pageUrl, {
              formats: ["markdown", "html"],
              includeTags: ["a", "img", "h1", "h2", "h3", "p", "div"],
              excludeTags: ["script", "style", "nav", "footer"],
            });

            if (!pageResult) {
              console.log(
                `No data returned for ${pageUrl}, moving to next letter`
              );
              break;
            }

            const clubLinksOnPage = extractClubLinksFromLetterPage(pageResult);
            allClubLinks.push(...clubLinksOnPage);
            console.log(
              `Found ${clubLinksOnPage.length} clubs on page ${currentPage} for letter ${letter}`
            );

            // Check if there are more pages by looking for pagination
            const hasNextPage = checkForNextPage(pageResult, currentPage);
            if (!hasNextPage) {
              hasMorePages = false;
            } else {
              currentPage++;
              // Add delay between page requests
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          } catch (error) {
            console.error(`Error scraping ${pageUrl}:`, error);
            break;
          }
        }

        // Add delay between letters to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      console.log(
        `Total clubs found across all letters: ${allClubLinks.length}`
      );

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      // Scrape each club page (limit to avoid rate limiting)
      const batchSize = 5;
      for (let i = 0; i < allClubLinks.length; i += batchSize) {
        const batch = allClubLinks.slice(i, i + batchSize);

        const batchPromises: Promise<any>[] = batch.map(
          async (clubLink): Promise<any> => {
            try {
              // Add a small delay to avoid rate limiting
              await new Promise((resolve) => setTimeout(resolve, 1000));

              const result: any = await ctx.runAction(
                api.clubsActions.scrapeClubPage,
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
          `Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allClubLinks.length / batchSize)}`
        );
      }

      return {
        success: true,
        totalClubs: allClubLinks.length,
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

// Action to scrape a specific club by URL (for testing)
export const scrapeSpecificClub = action({
  args: { clubUrl: v.string() },
  handler: async (ctx, args): Promise<any> => {
    return await ctx.runAction(api.clubsActions.scrapeClubPage, {
      clubUrl: args.clubUrl,
    });
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
  const descriptionMatch = markdown.match(
    /^#.+?\n\n([\s\S]+?)(?:\n\n|\n##|$)/m
  );
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
    markdown.match(/Location[:\s]*\n?([\s\S]+?)(?:\n\n|##|$)/i) ||
    markdown.match(/Address[:\s]*\n?([\s\S]+?)(?:\n\n|##|$)/i);

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

// Helper function to extract club links from letter-specific pages
function extractClubLinksFromLetterPage(
  scrapedData: any
): Array<{ name: string; url: string }> {
  const html = scrapedData.html || "";
  const markdown = scrapedData.markdown || "";

  const clubLinks: Array<{ name: string; url: string }> = [];

  // Look for "Discover" links which lead to individual club pages
  // Pattern: [Club Name] followed by "Discover" link

  // First try to extract from markdown
  // Look for club names followed by Discover links
  const discoverLinkRegex =
    /\[([^\]]+)\]\((https:\/\/amsclubs\.ca\/[^\/\)]+\/)\)[^]*?Discover/g;

  let match;
  while ((match = discoverLinkRegex.exec(markdown)) !== null) {
    const name = match[1].trim();
    const url = match[2];

    // Filter out non-club links
    if (
      !name.toLowerCase().includes("discover") &&
      !name.toLowerCase().includes("ubc clubs") &&
      !url.includes("/wp-content/") &&
      !url.includes("/all-clubs/") &&
      url !== "https://amsclubs.ca/"
    ) {
      clubLinks.push({ name, url });
    }
  }

  // Alternative approach: Look for club titles followed by descriptions and Discover links
  if (clubLinks.length === 0) {
    // Look for pattern: "AMS [Club Name] at UBC" followed by description and "Discover"
    const clubPattern = /(AMS .+ at UBC|[A-Z][^\\n]+Club[^\\n]*)/g;
    const clubMatches = markdown.match(clubPattern) || [];

    // Also look for discover links in HTML
    const htmlDiscoverRegex =
      /<a[^>]+href="(https:\/\/amsclubs\.ca\/[^\/\"]+\/)"[^>]*>[^<]*Discover[^<]*<\/a>/gi;
    const discoverUrls: string[] = [];

    let htmlMatch;
    while ((htmlMatch = htmlDiscoverRegex.exec(html)) !== null) {
      discoverUrls.push(htmlMatch[1]);
    }

    // Match club names with discover URLs
    clubMatches.forEach((clubName: string, index: number) => {
      if (index < discoverUrls.length) {
        const cleanName = clubName.trim();
        const url = discoverUrls[index];

        if (
          !cleanName.toLowerCase().includes("discover") &&
          !url.includes("/wp-content/") &&
          !url.includes("/all-clubs/")
        ) {
          clubLinks.push({ name: cleanName, url });
        }
      }
    });
  }

  // Fallback: Look for any AMS club links in the HTML
  if (clubLinks.length === 0) {
    const fallbackRegex =
      /<a[^>]+href="(https:\/\/amsclubs\.ca\/([^\/\"]+)\/)"[^>]*>([^<]+)<\/a>/gi;

    while ((match = fallbackRegex.exec(html)) !== null) {
      const url = match[1];
      const slug = match[2];
      const linkText = match[3].trim();

      // Skip navigation links and use slug to generate club name
      if (
        !linkText.toLowerCase().includes("discover") &&
        !linkText.toLowerCase().includes("all clubs") &&
        !linkText.toLowerCase().includes("login") &&
        !url.includes("/wp-content/") &&
        slug.length > 2
      ) {
        // Generate club name from slug if linkText is not descriptive
        const clubName =
          linkText.includes("UBC") || linkText.includes("AMS")
            ? linkText
            : `AMS ${slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} at UBC`;

        clubLinks.push({ name: clubName, url });
      }
    }
  }

  // Remove duplicates
  const uniqueClubs = clubLinks.filter(
    (club, index, self) => index === self.findIndex((c) => c.url === club.url)
  );

  return uniqueClubs;
}

// Helper function to check if there are more pages
function checkForNextPage(scrapedData: any, currentPage: number): boolean {
  const html = scrapedData.html || "";
  const markdown = scrapedData.markdown || "";

  // Look for pagination indicators
  const nextPageNumber = currentPage + 1;

  // Check for next page number in pagination
  const hasNextPageNumber =
    markdown.includes(`${nextPageNumber}`) ||
    html.includes(`>${nextPageNumber}<`) ||
    html.includes(`href=".*/${nextPageNumber}/"`);

  // Also check for "Next" or ">" pagination links
  const hasNextLink =
    markdown.toLowerCase().includes("next") ||
    html.includes("page-numbers-next") ||
    html.includes("pagination-next") ||
    html.includes("»") ||
    html.includes("&raquo;");

  // Check if current page number appears in a sequence (e.g., "1 2 3 4")
  const paginationPattern = new RegExp(
    `\\b${currentPage}\\s+${nextPageNumber}\\b`
  );
  const hasSequentialPages =
    paginationPattern.test(markdown) || paginationPattern.test(html);

  return hasNextPageNumber || hasNextLink || hasSequentialPages;
}
