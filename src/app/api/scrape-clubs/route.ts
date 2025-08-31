import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { action, clubUrl } = await request.json();

    if (action === "scrape-all") {
      // Scrape all clubs from the AMS directory
      const result = await convex.action(api.clubs.scrapeAllClubs, {});

      return NextResponse.json({
        success: true,
        message: `Scraping completed. ${result.successCount} clubs scraped successfully, ${result.errorCount} errors.`,
        data: result,
      });
    } else if (action === "scrape-single" && clubUrl) {
      // Scrape a specific club
      const result = await convex.action(api.clubs.scrapeSpecificClub, {
        clubUrl,
      });

      return NextResponse.json({
        success: result.success,
        message: result.success
          ? "Club scraped successfully"
          : `Error: ${result.error}`,
        data: result,
      });
    } else {
      return NextResponse.json(
        { success: false, message: "Invalid action or missing parameters" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get all clubs from the database
    const clubs = await convex.query(api.clubs.getAllClubs, {});

    return NextResponse.json({
      success: true,
      count: clubs.length,
      clubs,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch clubs",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
