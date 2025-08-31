"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Database, Trash2, Users, Calendar, Globe, Download } from "lucide-react";

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [scrapingStatus, setScrapingStatus] = useState("");
  const [clubUrl, setClubUrl] = useState("");

  const insertSampleEvents = useMutation(api.sampleData.insertSampleEvents);
  const insertSampleUsers = useMutation(api.sampleData.insertSampleUsers);
  const clearSampleData = useMutation(api.sampleData.clearSampleData);
  const checkAndPopulateSampleData = useMutation(api.sampleData.checkAndPopulateSampleData);
  const databaseStats = useQuery(api.sampleData.getDatabaseStats);
  const allClubs = useQuery(api.clubs.getAllClubs);

  const handleInsertEvents = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      const result = await insertSampleEvents();
      setMessage(`✅ Successfully inserted ${result.insertedCount} sample events!`);
    } catch (error) {
      setMessage(`❌ Error inserting events: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsertUsers = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      const result = await insertSampleUsers();
      setMessage(`✅ Successfully inserted ${result.insertedCount} sample users!`);
    } catch (error) {
      setMessage(`❌ Error inserting users: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm("Are you sure you want to clear all sample data? This cannot be undone.")) {
      return;
    }
    
    setIsLoading(true);
    setMessage("");
    try {
      const result = await clearSampleData();
      setMessage(`✅ Successfully cleared ${result.clearedEvents} events, ${result.clearedUsers} users, and ${result.clearedRsvps} RSVPs!`);
    } catch (error) {
      setMessage(`❌ Error clearing data: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoPopulate = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      const result = await checkAndPopulateSampleData();
      setMessage(`✅ ${result.message}. Events: ${result.events}, Users: ${result.users}`);
    } catch (error) {
      setMessage(`❌ Error auto-populating: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrapeAllClubs = async () => {
    setIsLoading(true);
    setScrapingStatus("Starting to scrape all clubs from AMS directory...");
    
    try {
      const response = await fetch("/api/scrape-clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scrape-all" }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setScrapingStatus(`✅ ${result.message}`);
      } else {
        setScrapingStatus(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      setScrapingStatus(`❌ Error scraping clubs: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrapeSingleClub = async () => {
    if (!clubUrl.trim()) {
      setScrapingStatus("❌ Please enter a club URL");
      return;
    }

    setIsLoading(true);
    setScrapingStatus(`Scraping club: ${clubUrl}...`);
    
    try {
      const response = await fetch("/api/scrape-clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scrape-single", clubUrl: clubUrl.trim() }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setScrapingStatus(`✅ Successfully scraped club!`);
        setClubUrl("");
      } else {
        setScrapingStatus(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      setScrapingStatus(`❌ Error scraping club: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Admin Panel"
          description="Manage sample data and test features"
          showBreadcrumb={false}
        />

        {/* Database Stats */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Database Statistics</CardTitle>
            <CardDescription>Current data in the database</CardDescription>
          </CardHeader>
          <CardContent>
            {databaseStats ? (
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{databaseStats.events}</div>
                  <div className="text-sm text-gray-600">Events</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{databaseStats.users}</div>
                  <div className="text-sm text-gray-600">Users</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{databaseStats.rsvps}</div>
                  <div className="text-sm text-gray-600">RSVPs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{allClubs?.length || 0}</div>
                  <div className="text-sm text-gray-600">Clubs</div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">Loading stats...</div>
            )}
          </CardContent>
        </Card>

        {/* Auto-populate */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Quick Setup
            </CardTitle>
            <CardDescription>
              Automatically populate the database if it's empty
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleAutoPopulate} 
              disabled={isLoading}
              className="w-full"
            >
              <Database className="w-4 h-4 mr-2" />
              Auto-Populate Sample Data
            </Button>
            <p className="text-sm text-gray-600 mt-2">
              This will check if the database is empty and add sample data if needed.
              Safe to run multiple times.
            </p>
          </CardContent>
        </Card>

        {/* Club Scraping */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Club Data Scraping
            </CardTitle>
            <CardDescription>
              Scrape club information from the AMS clubs directory
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Button 
                  onClick={handleScrapeAllClubs} 
                  disabled={isLoading}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Scrape All Clubs
                </Button>
                <p className="text-sm text-gray-600 mt-2">
                  Scrapes all clubs from https://amsclubs.ca/all-clubs/
                </p>
              </div>
              <div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://amsclubs.ca/club-name/"
                    value={clubUrl}
                    onChange={(e) => setClubUrl(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={handleScrapeSingleClub} 
                    disabled={isLoading || !clubUrl.trim()}
                    size="sm"
                  >
                    Scrape
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Test scraping a specific club page
                </p>
              </div>
            </div>
            {scrapingStatus && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm">{scrapingStatus}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Sample Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Sample Events
              </CardTitle>
              <CardDescription>
                Insert sample events to test the application features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleInsertEvents} 
                disabled={isLoading}
                className="w-full"
              >
                <Database className="w-4 h-4 mr-2" />
                Insert Sample Events
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                Adds 10 diverse sample events including tech meetups, career fairs, 
                music concerts, volunteer opportunities, and more.
              </p>
            </CardContent>
          </Card>

          {/* Sample Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Sample Users
              </CardTitle>
              <CardDescription>
                Insert sample users to test personalization and buddy matching
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleInsertUsers} 
                disabled={isLoading}
                className="w-full"
              >
                <Database className="w-4 h-4 mr-2" />
                Insert Sample Users
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                Adds 3 sample users with different interests and preferences 
                for testing personalized recommendations.
              </p>
            </CardContent>
          </Card>

          {/* Clear Data */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                Clear Sample Data
              </CardTitle>
              <CardDescription>
                Remove all sample data from the database (destructive action)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleClearData} 
                disabled={isLoading}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Sample Data
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                This will remove all events, sample users, and RSVPs. 
                Real user accounts created through Clerk will not be affected.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Status Message */}
        {message && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* Feature Testing */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Feature Testing Guide</CardTitle>
            <CardDescription>
              Steps to test the application features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Test Event Display</h4>
              <p className="text-sm text-gray-600">
                Insert sample events, then visit the Events page to see them in both list and map view.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">2. Test Map Integration</h4>
              <p className="text-sm text-gray-600">
                Switch to map view on the Events page to see events plotted on the Mapbox map with different colors for categories.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">3. Test Personalization</h4>
              <p className="text-sm text-gray-600">
                Create a real user account, set your interests in profile settings, then visit the Dashboard to see personalized recommendations.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">4. Test RSVP System</h4>
              <p className="text-sm text-gray-600">
                Sign in and RSVP to events from the event cards. Check your Dashboard to see your upcoming events.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}