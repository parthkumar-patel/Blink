import { Event } from "@/types";

interface EventbriteEvent {
  id: string;
  name: {
    text: string;
  };
  description: {
    text: string;
  };
  start: {
    utc: string;
    local: string;
    timezone: string;
  };
  end: {
    utc: string;
    local: string;
    timezone: string;
  };
  venue?: {
    name: string;
    address: {
      address_1: string;
      city: string;
      region: string;
      postal_code: string;
      country: string;
    };
    latitude: string;
    longitude: string;
  };
  online_event: boolean;
  organizer: {
    name: string;
    description: {
      text: string;
    };
  };
  category: {
    name: string;
  };
  subcategory?: {
    name: string;
  };
  capacity?: number;
  ticket_availability: {
    has_available_tickets: boolean;
  };
  is_free: boolean;
  logo?: {
    url: string;
  };
  url: string;
}

interface EventbriteResponse {
  events: EventbriteEvent[];
  pagination: {
    page_number: number;
    page_size: number;
    page_count: number;
    object_count: number;
    has_more_items: boolean;
  };
}

export class EventbriteClient {
  private apiKey: string;
  private baseUrl = 'https://www.eventbriteapi.com/v3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchEvents(params: {
    location?: string;
    categories?: string[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<EventbriteEvent[]> {
    const searchParams = new URLSearchParams();
    
    // Default to Vancouver area for UBC students
    searchParams.append('location.address', params.location || 'Vancouver, BC, Canada');
    searchParams.append('location.within', '25km'); // 25km radius
    
    if (params.startDate) {
      searchParams.append('start_date.range_start', params.startDate.toISOString());
    }
    
    if (params.endDate) {
      searchParams.append('start_date.range_end', params.endDate.toISOString());
    }
    
    // Filter for student-relevant categories
    if (params.categories && params.categories.length > 0) {
      const eventbriteCategories = this.mapCategoriesToEventbrite(params.categories);
      eventbriteCategories.forEach(cat => {
        searchParams.append('categories', cat);
      });
    }
    
    searchParams.append('expand', 'venue,organizer,category,subcategory');
    searchParams.append('page_size', (params.limit || 50).toString());
    searchParams.append('sort_by', 'date');

    try {
      const response = await fetch(`${this.baseUrl}/events/search/?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Eventbrite API error: ${response.status} ${response.statusText}`);
      }

      const data: EventbriteResponse = await response.json();
      return data.events;
    } catch (error) {
      console.error('Error fetching Eventbrite events:', error);
      throw error;
    }
  }

  normalizeEvent(eventbriteEvent: EventbriteEvent): Omit<Event, 'id' | 'createdAt' | 'updatedAt'> {
    const startDate = new Date(eventbriteEvent.start.utc);
    const endDate = new Date(eventbriteEvent.end.utc);

    // Extract location information
    const location = eventbriteEvent.venue ? {
      name: eventbriteEvent.venue.name,
      address: `${eventbriteEvent.venue.address.address_1}, ${eventbriteEvent.venue.address.city}, ${eventbriteEvent.venue.address.region}`,
      latitude: parseFloat(eventbriteEvent.venue.latitude),
      longitude: parseFloat(eventbriteEvent.venue.longitude),
      isVirtual: eventbriteEvent.online_event,
    } : {
      name: 'Online Event',
      address: 'Virtual',
      latitude: 49.2827, // Vancouver coordinates as default
      longitude: -123.1207,
      isVirtual: true,
    };

    // Categorize the event
    const categories = this.categorizeEvent(eventbriteEvent);
    
    // Extract tags from category and subcategory
    const tags = [
      eventbriteEvent.category.name.toLowerCase(),
      ...(eventbriteEvent.subcategory ? [eventbriteEvent.subcategory.name.toLowerCase()] : [])
    ];

    return {
      title: eventbriteEvent.name.text,
      description: eventbriteEvent.description.text || '',
      startDate,
      endDate,
      location,
      organizer: {
        name: eventbriteEvent.organizer.name,
        type: 'external' as const,
        verified: false,
        contactInfo: eventbriteEvent.organizer.description?.text || '',
      },
      categories,
      tags,
      capacity: eventbriteEvent.capacity,
      price: {
        amount: 0, // Eventbrite doesn't provide price in search results
        currency: 'CAD',
        isFree: eventbriteEvent.is_free,
      },
      images: eventbriteEvent.logo ? [eventbriteEvent.logo.url] : [],
      externalLinks: {
        registration: eventbriteEvent.url,
        website: eventbriteEvent.url,
      },
      source: {
        platform: 'eventbrite',
        originalId: eventbriteEvent.id,
        url: eventbriteEvent.url,
      },
      rsvpCount: 0,
    };
  }

  private mapCategoriesToEventbrite(categories: string[]): string[] {
    const categoryMap: Record<string, string> = {
      'tech': '102', // Science & Technology
      'career': '101', // Business & Professional
      'academic': '113', // Community & Culture
      'music': '103', // Music
      'sports': '108', // Sports & Fitness
      'food': '110', // Food & Drink
      'arts': '105', // Performing & Visual Arts
      'networking': '101', // Business & Professional
      'workshop': '102', // Science & Technology
      'social': '113', // Community & Culture
      'cultural': '113', // Community & Culture
      'volunteering': '113', // Community & Culture
    };

    return categories
      .map(cat => categoryMap[cat.toLowerCase()])
      .filter(Boolean);
  }

  private categorizeEvent(event: EventbriteEvent): string[] {
    const categories: string[] = [];
    const categoryName = event.category.name.toLowerCase();
    const subcategoryName = event.subcategory?.name.toLowerCase() || '';
    const title = event.name.text.toLowerCase();
    const description = event.description.text?.toLowerCase() || '';

    // Map Eventbrite categories to our categories
    if (categoryName.includes('technology') || categoryName.includes('science') || 
        title.includes('hackathon') || title.includes('coding') || title.includes('tech')) {
      categories.push('tech');
    }

    if (categoryName.includes('business') || categoryName.includes('professional') ||
        title.includes('career') || title.includes('job') || title.includes('networking')) {
      categories.push('career', 'networking');
    }

    if (categoryName.includes('music') || title.includes('concert') || title.includes('music')) {
      categories.push('music');
    }

    if (categoryName.includes('sports') || categoryName.includes('fitness') ||
        title.includes('sport') || title.includes('fitness')) {
      categories.push('sports');
    }

    if (categoryName.includes('food') || categoryName.includes('drink') ||
        title.includes('food') || title.includes('restaurant')) {
      categories.push('food');
    }

    if (categoryName.includes('arts') || categoryName.includes('performing') ||
        title.includes('art') || title.includes('gallery')) {
      categories.push('arts');
    }

    if (title.includes('workshop') || title.includes('seminar') || title.includes('training')) {
      categories.push('workshop', 'academic');
    }

    if (title.includes('volunteer') || description.includes('volunteer')) {
      categories.push('volunteering');
    }

    if (categoryName.includes('community') || categoryName.includes('culture') ||
        title.includes('meetup') || title.includes('social')) {
      categories.push('social', 'cultural');
    }

    // Default to social if no categories matched
    if (categories.length === 0) {
      categories.push('social');
    }

    return [...new Set(categories)]; // Remove duplicates
  }
}