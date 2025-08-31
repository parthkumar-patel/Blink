# Club Data Scraping

This document explains how the club data scraping functionality works in the Student Events Finder application.

## Overview

The application uses [Firecrawl](https://firecrawl.dev/) to scrape club information from the UBC AMS clubs directory at https://amsclubs.ca/all-clubs/. The scraped data is stored in a Convex database and displayed on the `/clubs` page.

## Features

- **Automated Scraping**: Scrapes all clubs from the AMS directory
- **Individual Club Scraping**: Test scraping for specific club pages
- **Data Extraction**: Automatically extracts:
  - Club name and description
  - Contact information (email, phone)
  - Location details
  - Social media links (Instagram, Facebook, LinkedIn, Twitter)
  - Website URLs
  - Club images
  - Categories (automatically determined based on content)
- **Weekly Updates**: Automated weekly updates via cron jobs
- **Admin Interface**: Easy-to-use admin panel for manual scraping

## Database Schema

Clubs are stored with the following structure:

```typescript
{
  name: string,
  description: string,
  amsUrl: string,
  websiteUrl?: string,
  socialMedia: {
    instagram?: string,
    facebook?: string,
    linkedin?: string,
    twitter?: string,
  },
  contact: {
    email?: string,
    phone?: string,
  },
  location?: {
    address: string,
    room?: string,
    building?: string,
  },
  image?: string,
  categories: string[],
  isActive: boolean,
  lastScrapedAt: number,
  scrapedData?: {
    rawHtml?: string,
    extractedText?: string,
  },
}
```

## Usage

### Admin Panel

1. Navigate to `/admin`
2. Use the "Club Data Scraping" section to:
   - **Scrape All Clubs**: Automatically discovers and scrapes all clubs from the AMS directory
   - **Scrape Single Club**: Test scraping for a specific club URL

### API Endpoints

- `POST /api/scrape-clubs` - Trigger scraping operations
  - `{ "action": "scrape-all" }` - Scrape all clubs
  - `{ "action": "scrape-single", "clubUrl": "https://amsclubs.ca/club-name/" }` - Scrape specific club

- `GET /api/scrape-clubs` - Get all scraped clubs

### Convex Functions

- `clubs.getAllClubs()` - Query all clubs
- `clubs.getClubsByCategory(category)` - Filter clubs by category
- `clubs.searchClubs(searchTerm)` - Search clubs by name
- `clubs.scrapeAllClubs()` - Action to scrape all clubs
- `clubs.scrapeClubPage(clubUrl)` - Action to scrape a specific club

## Configuration

### Environment Variables

Make sure these are set in your `.env.local`:

```bash
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
```

### Rate Limiting

The scraper includes built-in rate limiting:

- Processes clubs in batches of 5
- 1-second delay between requests
- Graceful error handling for failed requests

## Testing

Run the test script to verify Firecrawl integration:

```bash
node test-scraping.js
```

This will test scraping the Computer Science Student Society page and display extracted information.

## Automatic Updates

The system includes a weekly cron job that runs every Saturday at 4 AM UTC to update club data automatically. This ensures the club information stays current.

## Categories

Clubs are automatically categorized based on their name and description content:

- **Academic**: Computer science, engineering, business, etc.
- **Cultural**: International, ethnic, heritage groups
- **Sports**: Athletic and recreational clubs
- **Arts**: Music, dance, theatre, creative arts
- **Social**: Community and networking groups
- **Professional**: Career and industry-focused
- **Service**: Volunteer and community service
- **Religious**: Faith-based organizations
- **Special Interest**: Gaming, technology, environment, etc.

## Error Handling

The scraper includes comprehensive error handling:

- Failed requests are logged but don't stop the entire process
- Partial data extraction continues even if some fields can't be parsed
- Duplicate prevention based on AMS URL
- Graceful fallbacks for missing information

## Viewing Scraped Data

Visit `/clubs` to see all scraped club data with:

- Category filtering
- Search functionality
- Contact information
- Social media links
- Direct links to AMS pages

## Troubleshooting

### Common Issues

1. **Firecrawl API Key Missing**: Ensure `FIRECRAWL_API_KEY` is set in environment variables
2. **Rate Limiting**: If you hit rate limits, the scraper will log errors but continue
3. **Parsing Failures**: Some clubs may have unusual page structures; these are logged as errors
4. **Network Issues**: Temporary network problems are handled gracefully with retries

### Logs

Check the Convex dashboard for detailed logs of scraping operations, including:

- Number of clubs processed
- Success/failure counts
- Specific error messages for failed clubs
- Processing time and performance metrics
