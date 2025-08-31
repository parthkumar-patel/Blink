// Simple test script to verify Firecrawl integration
// Run with: node test-scraping.js

const { FirecrawlApp } = require("@mendable/firecrawl-js");

async function testScraping() {
  const apiKey = process.env.FIRECRAWL_API_KEY || "fc-f02104664e2840378a239db19747248f";
  
  if (!apiKey) {
    console.error("FIRECRAWL_API_KEY not found");
    return;
  }

  const app = new FirecrawlApp({ apiKey });

  try {
    console.log("Testing Firecrawl with CSSS club page...");
    
    const result = await app.scrapeUrl("https://amsclubs.ca/csss/", {
      formats: ["markdown", "html"],
      includeTags: ["title", "meta", "h1", "h2", "h3", "p", "a", "img"],
      excludeTags: ["script", "style", "nav", "footer"],
    });

    if (result.success) {
      console.log("✅ Scraping successful!");
      console.log("Title:", result.data.metadata?.title);
      console.log("Description:", result.data.metadata?.description);
      console.log("Markdown preview:", result.data.markdown?.substring(0, 500) + "...");
      
      // Extract some basic info
      const markdown = result.data.markdown || "";
      const emailMatch = markdown.match(/[\w\.-]+@[\w\.-]+\.\w+/);
      const websiteMatch = markdown.match(/\[.*?Website.*?\]\((https?:\/\/[^\)]+)\)/i);
      
      console.log("Found email:", emailMatch ? emailMatch[0] : "None");
      console.log("Found website:", websiteMatch ? websiteMatch[1] : "None");
    } else {
      console.error("❌ Scraping failed:", result.error);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testScraping();