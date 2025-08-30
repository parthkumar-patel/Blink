"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  
  const syncEventbrite = useAction(api.aggregation.syncEventbriteEvents);
  const syncUBC = useAction(api.aggregation.syncUBCEvents);
  const dailySync = useAction(api.aggregation.dailyEventSync);
  const insertSampleEvents = useMutation(api.sampleData.insertSampleEvents);

  const handleEventbriteSync = async () => {
    setIsLoading(true);
    try {
      const result = await syncEventbrite({
        categories: ['tech', 'career', 'academic', 'networking'],
        limit: 50,
      });
      setResults({ type: 'Eventbrite', ...result });
    } catch (error) {
      console.error('Eventbrite sync failed:', error);
      setResults({ type: 'Eventbrite', error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUBCSync = async () => {
    setIsLoading(true);
    try {
      const result = await syncUBC({});
      setResults({ type: 'UBC Events', ...result });
    } catch (error) {
      console.error('UBC sync failed:', error);
      setResults({ type: 'UBC Events', error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDailySync = async () => {
    setIsLoading(true);
    try {
      const result = await dailySync({});
      setResults({ type: 'Daily Sync', ...result });
    } catch (error) {
      console.error('Daily sync failed:', error);
      setResults({ type: 'Daily Sync', error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsertSampleEvents = async () => {
    setIsLoading(true);
    try {
      const result = await insertSampleEvents({});
      setResults({ type: 'Sample Events', ...result });
    } catch (error) {
      console.error('Sample events insertion failed:', error);
      setResults({ type: 'Sample Events', error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Event Aggregation Admin</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Eventbrite Sync</h2>
          <p className="text-gray-600 mb-4">
            Sync events from Eventbrite API for Vancouver area
          </p>
          <Button 
            onClick={handleEventbriteSync} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Syncing...' : 'Sync Eventbrite Events'}
          </Button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">UBC Events Sync</h2>
          <p className="text-gray-600 mb-4">
            Scrape events from UBC official websites using Firecrawl
          </p>
          <Button 
            onClick={handleUBCSync} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Syncing...' : 'Sync UBC Events'}
          </Button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Full Daily Sync</h2>
          <p className="text-gray-600 mb-4">
            Run the complete daily sync process for all sources
          </p>
          <Button 
            onClick={handleDailySync} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Syncing...' : 'Run Daily Sync'}
          </Button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Sample Events</h2>
          <p className="text-gray-600 mb-4">
            Insert sample events for testing the application
          </p>
          <Button 
            onClick={handleInsertSampleEvents} 
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? 'Inserting...' : 'Insert Sample Events'}
          </Button>
        </div>
      </div>

      {results && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Sync Results - {results.type}</h3>
          {results.error ? (
            <div className="text-red-600">
              <p className="font-medium">Error:</p>
              <p>{results.error}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p><span className="font-medium">Success:</span> {results.success ? 'Yes' : 'No'}</p>
              {results.processed !== undefined && (
                <p><span className="font-medium">Events Processed:</span> {results.processed}</p>
              )}
              {results.errors !== undefined && (
                <p><span className="font-medium">Errors:</span> {results.errors}</p>
              )}
              {results.total !== undefined && (
                <p><span className="font-medium">Total Found:</span> {results.total}</p>
              )}
              {results.eventbrite && (
                <div className="mt-4">
                  <p className="font-medium">Eventbrite Results:</p>
                  <p>Processed: {results.eventbrite.processed}, Errors: {results.eventbrite.errors}</p>
                </div>
              )}
              {results.ubc && (
                <div className="mt-4">
                  <p className="font-medium">UBC Results:</p>
                  <p>Processed: {results.ubc.processed}, Errors: {results.ubc.errors}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Setup Required</h3>
        <p className="text-yellow-700">
          Make sure to add your API keys to the environment variables:
        </p>
        <ul className="list-disc list-inside text-yellow-700 mt-2">
          <li>EVENTBRITE_API_KEY - Get from Eventbrite Developer Portal</li>
          <li>FIRECRAWL_API_KEY - Get from Firecrawl.dev</li>
        </ul>
      </div>
    </div>
  );
}