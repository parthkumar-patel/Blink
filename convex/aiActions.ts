"use node";

import { v } from "convex/values";
import {
  action,
} from "./_generated/server";
import { internal } from "./_generated/api";

// Generate AI summary for an event
export const generateEventSummary = action({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn("OPENROUTER_API_KEY not configured, skipping AI summary");
      return null;
    }

    try {
      // Get the event
      const event: any = await ctx.runQuery(internal.ai.getEventForSummary, {
        eventId: args.eventId,
      });

      if (!event) {
        throw new Error("Event not found");
      }

      // Skip if already has AI summary
      if (event.aiSummary) {
        return event.aiSummary;
      }

      console.log(`Generating AI summary for event: ${event.title}`);

      // Generate summary using OpenRouter
      const summary = await generateSummaryWithOpenRouter(
        apiKey,
        event.title,
        event.description
      );

      if (summary) {
        // Update the event with the AI summary
        await ctx.runMutation(internal.ai.updateEventSummary, {
          eventId: args.eventId,
          aiSummary: summary,
        });

        console.log(`AI summary generated for event: ${event.title}`);
        return summary;
      }

      return null;
    } catch (error) {
      console.error(
        `Error generating AI summary for event ${args.eventId}:`,
        error
      );
      return null;
    }
  },
});

// Define the return type interface
interface BatchSummaryResult {
  processed: number;
  errors: number;
  total: number;
}

// Batch generate summaries for multiple events
export const batchGenerateSummaries = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<BatchSummaryResult> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn(
        "OPENROUTER_API_KEY not configured, skipping batch AI summaries"
      );
      return { processed: 0, errors: 0, total: 0 };
    }

    try {
      // Get events without AI summaries
      const events = (await ctx.runQuery(
        internal.ai.getEventsWithoutSummaries,
        {
          limit: args.limit || 10,
        }
      )) as any[];

      console.log(`Processing ${events.length} events for AI summaries`);

      let processed = 0;
      let errors = 0;

      for (const event of events) {
        try {
          const summary = await generateSummaryWithOpenRouter(
            apiKey,
            event.title,
            event.description
          );

          if (summary) {
            await ctx.runMutation(internal.ai.updateEventSummary, {
              eventId: event._id,
              aiSummary: summary,
            });
            processed++;
          }

          // Add small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error processing event ${event._id}:`, error);
          errors++;
        }
      }

      console.log(
        `Batch AI summary completed: ${processed} processed, ${errors} errors`
      );

      const result: BatchSummaryResult = {
        processed,
        errors,
        total: events.length,
      };
      return result;
    } catch (error) {
      console.error("Batch AI summary failed:", error);
      const errorResult: BatchSummaryResult = {
        processed: 0,
        errors: 1,
        total: 0,
      };
      return errorResult;
    }
  },
});

// Get AI service health status
export const getAIServiceHealth = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    isHealthy: boolean;
    error?: string;
    lastChecked: number;
    status?: number;
    usage?: any;
  }> => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return {
        isHealthy: false,
        error: "API key not configured",
        lastChecked: Date.now(),
      };
    }

    try {
      // Test API with a simple request
      const testResponse = await fetch(
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
            messages: [{ role: "user", content: "Hello" }],
            max_tokens: 10,
          }),
        }
      );

      const isHealthy = testResponse.ok;
      const responseData = isHealthy ? await testResponse.json() : null;

      return {
        isHealthy,
        lastChecked: Date.now(),
        status: testResponse.status,
        usage: responseData?.usage || null,
      };
    } catch (error) {
      return {
        isHealthy: false,
        error: error instanceof Error ? error.message : "Unknown error",
        lastChecked: Date.now(),
      };
    }
  },
});

// Helper functions
async function generateSummaryWithOpenRouter(
  apiKey: string,
  title: string,
  description: string
): Promise<string | null> {
  try {
    const prompt = `Summarize this event in 1-2 sentences, focusing on what students would find most interesting and valuable. Be concise and engaging.

Event: ${title}
Description: ${description}

Summary:`;

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
          max_tokens: 150,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();

    if (!summary || summary.length < 10) {
      return getFallbackSummary(description);
    }

    return summary;
  } catch (error) {
    console.error("OpenRouter API error:", error);
    return getFallbackSummary(description);
  }
}

function getFallbackSummary(description: string): string {
  if (!description || description.length < 20) {
    return "Join this exciting event and connect with fellow students!";
  }

  const maxLength = 150;
  if (description.length <= maxLength) {
    return description;
  }

  const truncated = description.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  const lastPeriod = truncated.lastIndexOf(".");

  if (lastPeriod > maxLength - 50) {
    return truncated.slice(0, lastPeriod + 1);
  } else if (lastSpace > maxLength - 30) {
    return truncated.slice(0, lastSpace) + "...";
  } else {
    return truncated + "...";
  }
}
