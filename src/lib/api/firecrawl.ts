import FirecrawlApp from "@mendable/firecrawl-js";
import { Event } from "@/types";

interface ScrapedEvent {
  title: string;
  description: string;
  date: string;
  time?: string;
  location: string;
  organizer: string;
  url: string;
  categories?: string[];
}

export class FirecrawlClient {
  private app: FirecrawlApp;

  constructor(apiKey: string) {
    this.app = new FirecrawlApp({ apiKey });
  }

  async scrapeUBCEvents(): Promise<ScrapedEvent[]> {
    const ubcEventSources = [
      "https://amsclubs.ca/all-events/",
      "https://amsclubs.ca/all-clubs/",
    ];

    const allEvents: ScrapedEvent[] = [];

    for (const url of ubcEventSources) {
      try {
        console.log(`Scraping events from: ${url}`);
        const events = await this.scrapeEventsFromUrl(url);
        allEvents.push(...events);
      } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        // Continue with other sources even if one fails
      }
    }

    return this.deduplicateEvents(allEvents);
  }

  async scrapeEventsFromUrl(url: string): Promise<ScrapedEvent[]> {
    try {
      const scrapeResult = await this.app.scrape(url, {
        formats: ["markdown", "html"],
        includeTags: [
          "title",
          "meta",
          "h1",
          "h2",
          "h3",
          "p",
          "div",
          "span",
          "time",
          "a",
        ],
        excludeTags: ["script", "style", "nav", "footer", "header"],
        waitFor: 2000, // Wait for dynamic content
      });

      if (!scrapeResult || !scrapeResult.markdown) {
        throw new Error(`Failed to scrape ${url}: No content returned`);
      }

      // Extract events from the scraped content
      const events = await this.extractEventsFromContent(
        scrapeResult.markdown,
        url
      );
      return events;
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return [];
    }
  }

  private async extractEventsFromContent(
    content: string,
    sourceUrl: string
  ): Promise<ScrapedEvent[]> {
    // Try AI extraction first, fall back to regex if it fails
    try {
      const aiEvents = await this.extractEventsWithAI(content);
      if (aiEvents.length > 0) {
        return aiEvents.map((event) => ({
          ...event,
          url: sourceUrl,
          categories:
            event.categories ||
            this.categorizeEvent(event.title || "", event.description || ""),
        }));
      }
    } catch (error) {
      console.error("Error extracting events with AI:", error);
    }

    // Fallback to regex-based extraction
    return this.extractEventsWithRegex(content, sourceUrl);
  }

  private async extractEventsWithAI(content: string): Promise<ScrapedEvent[]> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return [];
    }

    const prompt = `Extract event information from this content. Look for events, workshops, meetups, seminars, or student activities.

For each event found, extract:
- title: Event name
- description: Brief description  
- date: Date in YYYY-MM-DD format (if available)
- time: Time if specified
- location: Venue or location
- organizer: Who is organizing it
- categories: Array of relevant categories from: tech, music, sports, volunteering, career, academic, social, cultural, food, arts, networking, workshop

Return as JSON array. If no events found, return empty array.

Content:
${content.slice(0, 3000)}

JSON:`;

    try {
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
    } catch (error) {
      console.error("AI event extraction failed:", error);
      return [];
    }
  }

  private extractEventsWithRegex(
    content: string,
    sourceUrl: string
  ): ScrapedEvent[] {
    const events: ScrapedEvent[] = [];

    // Simple regex patterns to find event-like content
    const eventPatterns = [
      // Pattern for events with dates
      /(?:event|workshop|seminar|meetup|conference|hackathon|talk)[\s\S]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/gi,
      // Pattern for events with specific keywords
      /(workshop|seminar|meetup|conference|hackathon|talk|presentation)[\s\S]{0,200}/gi,
    ];

    const lines = content.split("\n");
    let currentEvent: Partial<ScrapedEvent> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) continue;

      // Look for event titles (headers or bold text)
      if (this.isEventTitle(line)) {
        // Save previous event if it exists
        if (currentEvent.title) {
          events.push(this.completeEvent(currentEvent, sourceUrl));
        }

        // Start new event
        currentEvent = {
          title: this.cleanText(line),
          url: sourceUrl,
        };
      }

      // Look for dates
      else if (this.containsDate(line) && currentEvent.title) {
        currentEvent.date = this.extractDate(line);
      }

      // Look for locations
      else if (this.isLocation(line) && currentEvent.title) {
        currentEvent.location = this.cleanText(line);
      }

      // Look for descriptions
      else if (
        line.length > 50 &&
        currentEvent.title &&
        !currentEvent.description
      ) {
        currentEvent.description = this.cleanText(line);
      }
    }

    // Add the last event
    if (currentEvent.title) {
      events.push(this.completeEvent(currentEvent, sourceUrl));
    }

    return events.filter((event) => event.title && event.date);
  }

  private isEventTitle(line: string): boolean {
    const eventKeywords = [
      "workshop",
      "seminar",
      "meetup",
      "conference",
      "hackathon",
      "talk",
      "presentation",
      "event",
      "session",
    ];
    const lowerLine = line.toLowerCase();

    // Check if line contains event keywords and looks like a title
    return (
      eventKeywords.some((keyword) => lowerLine.includes(keyword)) &&
      (line.startsWith("#") || line.length < 100)
    );
  }

  private containsDate(line: string): boolean {
    const datePatterns = [
      /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
      /\w+\s+\d{1,2},?\s+\d{4}/,
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(january|february|march|april|may|june|july|august|september|october|november|december)/i,
    ];

    return datePatterns.some((pattern) => pattern.test(line));
  }

  private extractDate(line: string): string {
    // Try to extract and normalize date
    const dateMatch = line.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
    if (dateMatch) {
      const parts = dateMatch[0].split(/[\/\-]/);
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
    }

    // For now, return the original line - in production, you'd want better date parsing
    return line;
  }

  private isLocation(line: string): boolean {
    const locationKeywords = [
      "room",
      "building",
      "hall",
      "center",
      "centre",
      "campus",
      "online",
      "zoom",
      "virtual",
    ];
    const lowerLine = line.toLowerCase();

    return (
      locationKeywords.some((keyword) => lowerLine.includes(keyword)) ||
      line.includes("UBC") ||
      line.includes("Vancouver")
    );
  }

  private cleanText(text: string): string {
    return text
      .replace(/^#+\s*/, "") // Remove markdown headers
      .replace(/\*\*/g, "") // Remove bold markdown
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert markdown links to text
      .trim();
  }

  private completeEvent(
    event: Partial<ScrapedEvent>,
    sourceUrl: string
  ): ScrapedEvent {
    return {
      title: event.title || "Untitled Event",
      description: event.description || "No description available",
      date: event.date || new Date().toISOString().split("T")[0],
      time: event.time,
      location: event.location || "UBC Campus",
      organizer: event.organizer || "UBC",
      url: sourceUrl,
      categories: this.categorizeEvent(
        event.title || "",
        event.description || ""
      ),
    };
  }

  private categorizeEvent(title: string, description: string): string[] {
    const categories: string[] = [];
    const text = `${title} ${description}`.toLowerCase();

    const categoryKeywords = {
      tech: [
        "tech",
        "coding",
        "programming",
        "software",
        "hackathon",
        "ai",
        "machine learning",
        "data science",
      ],
      career: [
        "career",
        "job",
        "internship",
        "professional",
        "networking",
        "interview",
      ],
      academic: [
        "lecture",
        "seminar",
        "research",
        "study",
        "academic",
        "thesis",
        "conference",
      ],
      workshop: ["workshop", "training", "tutorial", "hands-on", "learn"],
      social: ["social", "meetup", "mixer", "party", "gathering"],
      sports: ["sport", "fitness", "gym", "recreation", "athletic"],
      music: ["music", "concert", "performance", "band", "singing"],
      arts: ["art", "gallery", "exhibition", "creative", "design"],
      food: ["food", "dining", "restaurant", "cooking", "culinary"],
      volunteering: ["volunteer", "community service", "charity", "help"],
      cultural: ["cultural", "diversity", "international", "heritage"],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        categories.push(category);
      }
    }

    return categories.length > 0 ? categories : ["social"];
  }

  normalizeEvent(
    scrapedEvent: ScrapedEvent
  ): Omit<Event, "id" | "createdAt" | "updatedAt"> {
    const startDate = new Date(scrapedEvent.date);
    if (scrapedEvent.time) {
      // Simple time parsing - in production, you'd want more robust parsing
      const timeMatch = scrapedEvent.time.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        startDate.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]));
      }
    }

    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 2); // Default 2-hour duration

    return {
      title: scrapedEvent.title,
      description: scrapedEvent.description,
      startDate,
      endDate,
      location: {
        name: scrapedEvent.location,
        address: scrapedEvent.location.includes("UBC")
          ? "University of British Columbia, Vancouver, BC"
          : scrapedEvent.location,
        latitude: 49.2606, // UBC coordinates
        longitude: -123.246,
        isVirtual:
          scrapedEvent.location.toLowerCase().includes("online") ||
          scrapedEvent.location.toLowerCase().includes("virtual"),
      },
      organizer: {
        name: scrapedEvent.organizer,
        type: scrapedEvent.organizer.toLowerCase().includes("ubc")
          ? "university"
          : "club",
        verified: scrapedEvent.organizer.toLowerCase().includes("ubc"),
        contactInfo: "",
      },
      categories: scrapedEvent.categories || ["social"],
      tags: scrapedEvent.categories || [],
      price: {
        amount: 0,
        currency: "CAD",
        isFree: true, // Assume UBC events are free unless specified
      },
      images: [],
      externalLinks: {
        website: scrapedEvent.url,
      },
      source: {
        platform: "firecrawl",
        originalId: `${scrapedEvent.url}-${scrapedEvent.title.replace(/\s+/g, "-")}`,
        url: scrapedEvent.url,
      },
      rsvpCount: 0,
    };
  }

  private deduplicateEvents(events: ScrapedEvent[]): ScrapedEvent[] {
    const seen = new Set<string>();
    return events.filter((event) => {
      const key = `${event.title.toLowerCase()}-${event.date}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
