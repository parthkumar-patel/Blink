interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AIServiceHealth {
  isHealthy: boolean;
  lastChecked: number;
  errorCount: number;
  quotaRemaining?: number;
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";
  private model = "meta-llama/llama-3.1-8b-instruct:free";
  private health: AIServiceHealth = {
    isHealthy: true,
    lastChecked: Date.now(),
    errorCount: 0,
  };

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateEventSummary(
    eventTitle: string,
    eventDescription: string
  ): Promise<string> {
    if (!this.isHealthy()) {
      return this.getFallbackSummary(eventDescription);
    }

    try {
      const prompt = `Summarize this event in 1-2 sentences, focusing on what students would find most interesting and valuable. Be concise and engaging.

Event: ${eventTitle}
Description: ${eventDescription}

Summary:`;

      const response = await this.makeRequest(prompt, {
        max_tokens: 150,
        temperature: 0.7,
      });

      const summary = response.choices[0]?.message?.content?.trim();

      if (!summary || summary.length < 10) {
        return this.getFallbackSummary(eventDescription);
      }

      this.updateHealth(true);
      return summary;
    } catch (error) {
      console.error("Error generating event summary:", error);
      this.updateHealth(false);
      return this.getFallbackSummary(eventDescription);
    }
  }

  async categorizeEvent(
    eventTitle: string,
    eventDescription: string
  ): Promise<string[]> {
    if (!this.isHealthy()) {
      return this.getFallbackCategories(eventTitle, eventDescription);
    }

    try {
      const availableCategories = [
        "tech",
        "music",
        "sports",
        "volunteering",
        "career",
        "academic",
        "social",
        "cultural",
        "food",
        "arts",
        "networking",
        "workshop",
      ];

      const prompt = `Categorize this event by selecting the most relevant categories from this list: ${availableCategories.join(", ")}

Event: ${eventTitle}
Description: ${eventDescription}

Return only the category names separated by commas, maximum 3 categories:`;

      const response = await this.makeRequest(prompt, {
        max_tokens: 50,
        temperature: 0.3,
      });

      const categoriesText = response.choices[0]?.message?.content?.trim();

      if (!categoriesText) {
        return this.getFallbackCategories(eventTitle, eventDescription);
      }

      const categories = categoriesText
        .split(",")
        .map((cat) => cat.trim().toLowerCase())
        .filter((cat) => availableCategories.includes(cat))
        .slice(0, 3);

      if (categories.length === 0) {
        return this.getFallbackCategories(eventTitle, eventDescription);
      }

      this.updateHealth(true);
      return categories;
    } catch (error) {
      console.error("Error categorizing event:", error);
      this.updateHealth(false);
      return this.getFallbackCategories(eventTitle, eventDescription);
    }
  }

  async generateRecommendationExplanation(
    eventTitle: string,
    userInterests: string[],
    matchScore: number
  ): Promise<string> {
    if (!this.isHealthy()) {
      return this.getFallbackRecommendationExplanation(
        userInterests,
        matchScore
      );
    }

    try {
      const prompt = `Explain in one sentence why this event matches the user's interests. Be specific and encouraging.

Event: ${eventTitle}
User interests: ${userInterests.join(", ")}
Match score: ${Math.round(matchScore * 100)}%

Explanation:`;

      const response = await this.makeRequest(prompt, {
        max_tokens: 100,
        temperature: 0.8,
      });

      const explanation = response.choices[0]?.message?.content?.trim();

      if (!explanation || explanation.length < 10) {
        return this.getFallbackRecommendationExplanation(
          userInterests,
          matchScore
        );
      }

      this.updateHealth(true);
      return explanation;
    } catch (error) {
      console.error("Error generating recommendation explanation:", error);
      this.updateHealth(false);
      return this.getFallbackRecommendationExplanation(
        userInterests,
        matchScore
      );
    }
  }

  async extractEventsFromText(text: string): Promise<any[]> {
    if (!this.isHealthy()) {
      return [];
    }

    try {
      const prompt = `Extract event information from this text. Return a JSON array of events with these fields: title, description, date (YYYY-MM-DD format), time, location, organizer.

Text: ${text.slice(0, 2000)}

JSON:`;

      const response = await this.makeRequest(prompt, {
        max_tokens: 800,
        temperature: 0.3,
      });

      const jsonText = response.choices[0]?.message?.content?.trim();

      if (!jsonText) {
        return [];
      }

      try {
        const events = JSON.parse(jsonText);
        return Array.isArray(events) ? events : [];
      } catch (parseError) {
        console.error("Error parsing AI-extracted events:", parseError);
        return [];
      }
    } catch (error) {
      console.error("Error extracting events with AI:", error);
      this.updateHealth(false);
      return [];
    }
  }

  private async makeRequest(
    prompt: string,
    options: any = {}
  ): Promise<OpenRouterResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ubc-events-finder.vercel.app",
        "X-Title": "UBC Events Finder",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: options.max_tokens || 200,
        temperature: options.temperature || 0.7,
        top_p: options.top_p || 1,
        frequency_penalty: options.frequency_penalty || 0,
        presence_penalty: options.presence_penalty || 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data: OpenRouterResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from OpenRouter API");
    }

    return data;
  }

  private isHealthy(): boolean {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // Reset health check if it's been more than 5 minutes
    if (now - this.health.lastChecked > fiveMinutes) {
      this.health.isHealthy = true;
      this.health.errorCount = 0;
      this.health.lastChecked = now;
    }

    // Consider unhealthy if more than 3 errors in the last 5 minutes
    return this.health.isHealthy && this.health.errorCount < 3;
  }

  private updateHealth(success: boolean): void {
    this.health.lastChecked = Date.now();

    if (success) {
      this.health.isHealthy = true;
      this.health.errorCount = Math.max(0, this.health.errorCount - 1);
    } else {
      this.health.errorCount += 1;
      if (this.health.errorCount >= 3) {
        this.health.isHealthy = false;
      }
    }
  }

  getHealthStatus(): AIServiceHealth {
    return { ...this.health };
  }

  // Fallback methods when AI is unavailable
  private getFallbackSummary(description: string): string {
    if (!description || description.length < 20) {
      return "Join this exciting event and connect with fellow students!";
    }

    // Simple truncation with smart ending
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

  private getFallbackCategories(title: string, description: string): string[] {
    const text = `${title} ${description}`.toLowerCase();
    const categories: string[] = [];

    const categoryKeywords = {
      tech: [
        "tech",
        "coding",
        "programming",
        "software",
        "hackathon",
        "ai",
        "data",
        "computer",
      ],
      career: [
        "career",
        "job",
        "internship",
        "professional",
        "interview",
        "resume",
      ],
      academic: [
        "lecture",
        "seminar",
        "research",
        "study",
        "academic",
        "conference",
        "thesis",
      ],
      workshop: [
        "workshop",
        "training",
        "tutorial",
        "hands-on",
        "learn",
        "skill",
      ],
      social: ["social", "meetup", "mixer", "party", "gathering", "community"],
      sports: ["sport", "fitness", "gym", "recreation", "athletic", "exercise"],
      music: [
        "music",
        "concert",
        "performance",
        "band",
        "singing",
        "instrument",
      ],
      arts: ["art", "gallery", "exhibition", "creative", "design", "visual"],
      food: ["food", "dining", "restaurant", "cooking", "culinary", "meal"],
      volunteering: ["volunteer", "service", "charity", "help", "community"],
      cultural: [
        "cultural",
        "diversity",
        "international",
        "heritage",
        "tradition",
      ],
      networking: [
        "networking",
        "connect",
        "professional",
        "business",
        "industry",
      ],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        categories.push(category);
      }
    }

    return categories.length > 0 ? categories.slice(0, 3) : ["social"];
  }

  private getFallbackRecommendationExplanation(
    interests: string[],
    matchScore: number
  ): string {
    if (interests.length === 0) {
      return "This event might be interesting to you!";
    }

    const matchedInterests = interests.slice(0, 2);
    const interestText = matchedInterests.join(" and ");

    if (matchScore > 0.8) {
      return `Perfect match for your interest in ${interestText}!`;
    } else if (matchScore > 0.6) {
      return `Great fit for your ${interestText} interests.`;
    } else {
      return `This could expand your interests beyond ${interestText}.`;
    }
  }
}
