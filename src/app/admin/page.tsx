"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Shield,
  Users,
  Database,
  Trash2,
  Plus,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  const { user } = useUser();
  const [isCreatingUsers, setIsCreatingUsers] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // Mutations
  const createTestUsers = useMutation(api.testData.createTestUsers);
  const cleanupTestUsers = useMutation(api.testData.cleanupTestUsers);

  // Handle creating test users
  const handleCreateTestUsers = async () => {
    setIsCreatingUsers(true);
    try {
      const result = await createTestUsers({});
      toast.success(result.message);
      console.log("Created users:", result.users);
    } catch (error) {
      console.error("Error creating test users:", error);
      toast.error("Failed to create test users. Please try again.");
    } finally {
      setIsCreatingUsers(false);
    }
  };

  // Handle cleaning up test users
  const handleCleanupTestUsers = async () => {
    setIsCleaningUp(true);
    try {
      const result = await cleanupTestUsers({});
      toast.success(result.message);
    } catch (error) {
      console.error("Error cleaning up test users:", error);
      toast.error("Failed to cleanup test users. Please try again.");
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-600 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Development tools and utilities for testing and managing the application
          </p>
        </div>

        {/* Warning Banner */}
        <div className="mb-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Development Tools</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  These tools are for development and testing purposes only. Use carefully in production environments.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Test Data Management */}
          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Database className="w-6 h-6 text-blue-600" />
                  Test Data Management
                </CardTitle>
                <p className="text-gray-600">
                  Create and manage test users for development and testing
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Create Test Users */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-900 mb-2">Create Test Users</h4>
                      <p className="text-sm text-green-700 mb-4">
                        Creates 5 sample users with different universities, interests, and locations 
                        to test the matching system.
                      </p>
                      <div className="space-y-1 text-xs text-green-600">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3" />
                          <span>Alice Johnson - UBC, Sophomore (programming, hiking, photography)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3" />
                          <span>Bob Chen - UBC, Sophomore (gaming, programming, music)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3" />
                          <span>Carol Davis - UBC, Junior (photography, travel, books)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3" />
                          <span>David Wilson - SFU, Sophomore (programming, gaming, movies)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3" />
                          <span>Emma Thompson - UBC, Freshman (hiking, photography, social)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleCreateTestUsers}
                    disabled={isCreatingUsers}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700"
                  >
                    {isCreatingUsers ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Creating Test Users...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Test Users
                      </>
                    )}
                  </Button>
                </div>

                {/* Cleanup Test Users */}
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-900 mb-2">Cleanup Test Users</h4>
                      <p className="text-sm text-red-700 mb-4">
                        Removes all test users created by the &quot;Create Test Users&quot; function. 
                        This will not affect real users.
                      </p>
                      <Badge variant="outline" className="text-red-600 border-red-300">
                        Safe Operation - Only removes test data
                      </Badge>
                    </div>
                  </div>
                  <Button
                    onClick={handleCleanupTestUsers}
                    disabled={isCleaningUp}
                    variant="outline"
                    className="w-full mt-4 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    {isCleaningUp ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Cleaning Up...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Cleanup Test Users
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* How to Use */}
          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Settings className="w-6 h-6 text-purple-600" />
                  How to Test Matching
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-semibold text-sm">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Create Test Users</h4>
                      <p className="text-sm text-gray-600">
                        Click &quot;Create Test Users&quot; to add sample users with varied profiles
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-600 font-semibold text-sm">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Test Matching</h4>
                      <p className="text-sm text-gray-600">
                        Go to /matches and click &quot;Generate Matches&quot; to see the algorithm in action
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-semibold text-sm">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Explore Features</h4>
                      <p className="text-sm text-gray-600">
                        Accept/reject matches, view compatibility scores, and test friend requests
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-red-600 font-semibold text-sm">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Clean Up</h4>
                      <p className="text-sm text-gray-600">
                        When done testing, click &quot;Cleanup Test Users&quot; to remove test data
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RefreshCw className="w-5 h-5 text-green-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/admin/moderation'}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Open Moderation Queue
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/matches'}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Go to Matches Page
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/friends'}
                >
                  <Users className="w-4 h-4 mr-2" />
                  View Friends Page
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/settings'}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Update Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Current User Info */}
        <div className="mt-8">
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>Logged in as: <strong>{user?.fullName || user?.firstName}</strong></span>
                <span>•</span>
                <span>Email: <strong>{user?.primaryEmailAddress?.emailAddress}</strong></span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}