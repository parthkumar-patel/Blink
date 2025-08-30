import { mutation } from "./_generated/server";

// Insert sample events for testing
export const insertSampleEvents = mutation({
  args: {},
  handler: async (ctx) => {
    const sampleEvents = [
      {
        title: "UBC Hackathon 2024",
        description:
          "Join us for a 48-hour hackathon where students build innovative solutions to real-world problems. Open to all skill levels!",
        startDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week from now
        endDate: Date.now() + 9 * 24 * 60 * 60 * 1000, // 1 week + 2 days from now
        location: {
          name: "UBC Life Building",
          address: "6138 Student Union Blvd, Vancouver, BC V6T 1Z1",
          latitude: 49.2606,
          longitude: -123.246,
          isVirtual: false,
        },
        organizer: {
          name: "UBC Computer Science Student Society",
          type: "club" as const,
          verified: true,
          contactInfo: "hackathon@ubccsss.org",
        },
        categories: ["tech", "workshop", "networking"],
        tags: ["hackathon", "coding", "innovation", "prizes"],
        capacity: 200,
        price: {
          amount: 0,
          currency: "CAD",
          isFree: true,
        },
        images: [],
        externalLinks: {
          registration: "https://ubccsss.org/hackathon2024",
          website: "https://ubccsss.org",
        },
        source: {
          platform: "manual",
          originalId: "ubc-hackathon-2024",
          url: "https://ubccsss.org/hackathon2024",
        },
        rsvpCount: 0,
      },
      {
        title: "Career Fair - Tech Companies",
        description:
          "Meet with top tech companies hiring UBC students for internships and full-time positions. Bring your resume!",
        startDate: Date.now() + 14 * 24 * 60 * 60 * 1000, // 2 weeks from now
        endDate: Date.now() + 14 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000, // 2 weeks + 6 hours
        location: {
          name: "UBC Student Union Building",
          address: "6138 Student Union Blvd, Vancouver, BC V6T 1Z1",
          latitude: 49.2606,
          longitude: -123.246,
          isVirtual: false,
        },
        organizer: {
          name: "UBC Career Services",
          type: "university" as const,
          verified: true,
          contactInfo: "careers@ubc.ca",
        },
        categories: ["career", "networking", "tech"],
        tags: ["career fair", "jobs", "internships", "tech"],
        capacity: 500,
        price: {
          amount: 0,
          currency: "CAD",
          isFree: true,
        },
        images: [],
        externalLinks: {
          registration: "https://students.ubc.ca/career-fair",
          website: "https://students.ubc.ca",
        },
        source: {
          platform: "manual",
          originalId: "ubc-career-fair-tech-2024",
          url: "https://students.ubc.ca/career-fair",
        },
        rsvpCount: 0,
      },
      {
        title: "Vancouver Tech Meetup",
        description:
          "Monthly meetup for Vancouver's tech community. This month: AI and Machine Learning trends. Networking and pizza included!",
        startDate: Date.now() + 10 * 24 * 60 * 60 * 1000, // 10 days from now
        endDate: Date.now() + 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000, // 10 days + 3 hours
        location: {
          name: "WeWork Vancouver",
          address: "900 W Hastings St, Vancouver, BC V6C 1E5",
          latitude: 49.2827,
          longitude: -123.1207,
          isVirtual: false,
        },
        organizer: {
          name: "Vancouver Tech Community",
          type: "external" as const,
          verified: false,
          contactInfo: "hello@vantechcommunity.com",
        },
        categories: ["tech", "networking", "social"],
        tags: ["meetup", "ai", "machine learning", "networking"],
        capacity: 100,
        price: {
          amount: 15,
          currency: "CAD",
          isFree: false,
        },
        images: [],
        externalLinks: {
          registration: "https://meetup.com/vancouver-tech",
          website: "https://vantechcommunity.com",
        },
        source: {
          platform: "manual",
          originalId: "vancouver-tech-meetup-ai-2024",
          url: "https://meetup.com/vancouver-tech",
        },
        rsvpCount: 0,
      },
      {
        title: "UBC Music Concert - Student Showcase",
        description:
          "Enjoy an evening of music performed by talented UBC students from the School of Music. Free admission for all students!",
        startDate: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days from now
        endDate: Date.now() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000, // 5 days + 2 hours
        location: {
          name: "Chan Centre for the Performing Arts",
          address: "6265 Crescent Rd, Vancouver, BC V6T 1Z1",
          latitude: 49.2606,
          longitude: -123.246,
          isVirtual: false,
        },
        organizer: {
          name: "UBC School of Music",
          type: "university" as const,
          verified: true,
          contactInfo: "music@ubc.ca",
        },
        categories: ["music", "arts", "cultural"],
        tags: ["concert", "classical", "student performance"],
        capacity: 300,
        price: {
          amount: 0,
          currency: "CAD",
          isFree: true,
        },
        images: [],
        externalLinks: {
          website: "https://music.ubc.ca",
        },
        source: {
          platform: "manual",
          originalId: "ubc-music-showcase-2024",
          url: "https://music.ubc.ca/events",
        },
        rsvpCount: 0,
      },
      {
        title: "Volunteer at Food Bank",
        description:
          "Help pack and distribute food to families in need. Great way to give back to the community and meet like-minded students.",
        startDate: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days from now
        endDate: Date.now() + 3 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000, // 3 days + 4 hours
        location: {
          name: "Greater Vancouver Food Bank",
          address: "8169 Main St, Vancouver, BC V5X 3L4",
          latitude: 49.2139,
          longitude: -123.1,
          isVirtual: false,
        },
        organizer: {
          name: "UBC Volunteer Connect",
          type: "university" as const,
          verified: true,
          contactInfo: "volunteer@ubc.ca",
        },
        categories: ["volunteering", "social"],
        tags: ["volunteer", "food bank", "community service"],
        capacity: 20,
        price: {
          amount: 0,
          currency: "CAD",
          isFree: true,
        },
        images: [],
        externalLinks: {
          registration: "https://students.ubc.ca/volunteer",
          website: "https://students.ubc.ca",
        },
        source: {
          platform: "manual",
          originalId: "food-bank-volunteer-2024",
          url: "https://students.ubc.ca/volunteer",
        },
        rsvpCount: 0,
      },
    ];

    const insertedIds = [];

    for (const event of sampleEvents) {
      const eventId = await ctx.db.insert("events", event);
      insertedIds.push(eventId);
    }

    console.log(`Inserted ${insertedIds.length} sample events`);

    return {
      success: true,
      insertedCount: insertedIds.length,
      eventIds: insertedIds,
    };
  },
});
