"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Heart,
  X,
  Users,
  Calendar,
  Star,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Zap,
  Target,
  Award,
  BookOpen,
  Clock
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Id } from "../../../convex/_generated/dataModel";

interface MatchSuggestion {
  id: Id<"matchSuggestions">;
  user: {
    id: Id<"users">;
    name: string;
    university: string;
    year: string;
    interests: string[];
  };
  matchScore: number;
  reasons: string[];
  connectionDetails: {
    mutualFriends: number;
    sharedInterests: number;
    commonEvents: number;
    universityMatch: boolean;
    yearMatch: boolean;
    locationProximity?: number;
  };
  createdAt: number;
}

export default function MatchesPage() {
  const { user } = useUser();
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Queries
  const matchSuggestions = useQuery(api.matches.getMatchSuggestions, { limit: 20 });
  const matchStats = useQuery(api.matches.getMatchStats);
  const debugInfo = useQuery(api.matches.debugMatchingProcess);

  // Mutations
  const generateMatches = useMutation(api.matches.generateMatchSuggestions);
  const acceptMatch = useMutation(api.matches.acceptMatch);
  const rejectMatch = useMutation(api.matches.rejectMatch);
  const markViewed = useMutation(api.matches.markSuggestionsViewed);

  // Get current user profile for generating matches
  const currentUser = useQuery(api.users.getCurrentUser, user ? {} : "skip");

  // Handle generating new matches
  const handleGenerateMatches = async () => {
    if (!currentUser?._id) return;
    
    setIsGenerating(true);
    try {
      const newMatches = await generateMatches({
        userId: currentUser._id,
        limit: 10,
      });
      toast.success(`Found ${newMatches.length} potential matches!`);
      
      // Reset the current index to show new matches
      setCurrentMatchIndex(0);
      
      // Force a refresh of the match suggestions
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Error generating matches:", error);
      toast.error("Failed to generate matches. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle accepting a match
  const handleAccept = async (suggestion: MatchSuggestion) => {
    try {
      // Mark as viewed before accepting
      markCurrentAsViewed();
      
      const result = await acceptMatch({ suggestionId: suggestion.id });
      toast.success(result.message);
      setCurrentMatchIndex(prev => prev + 1);
    } catch (error) {
      console.error("Error accepting match:", error);
      toast.error("Failed to accept match. Please try again.");
    }
  };

  // Handle rejecting a match
  const handleReject = async (suggestion: MatchSuggestion) => {
    try {
      // Mark as viewed before rejecting
      markCurrentAsViewed();
      
      await rejectMatch({ suggestionId: suggestion.id });
      toast.success("Match dismissed");
      setCurrentMatchIndex(prev => prev + 1);
    } catch (error) {
      console.error("Error rejecting match:", error);
      toast.error("Failed to dismiss match. Please try again.");
    }
  };

  // Mark suggestions as viewed when user interacts (not automatically)
  const markCurrentAsViewed = () => {
    if (currentMatch) {
      markViewed({ suggestionIds: [currentMatch.id] });
    }
  };

  const currentMatch = matchSuggestions?.[currentMatchIndex];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-blue-600 bg-blue-50";
    if (score >= 40) return "text-yellow-600 bg-yellow-50";
    return "text-gray-600 bg-gray-50";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Great Match";
    if (score >= 40) return "Good Match";
    return "Potential Match";
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Find Your Study Buddy
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Connect with students who share your interests, attend similar events, and study at your university
          </p>
        </div>

        {/* Stats Dashboard */}
        {matchStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="text-center">
              <CardContent className="p-4">
                <Target className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{matchStats.totalSuggestions}</div>
                <div className="text-sm text-gray-600">Total Matches</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <Heart className="w-8 h-8 text-pink-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{matchStats.acceptedSuggestions}</div>
                <div className="text-sm text-gray-600">Accepted</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{matchStats.successfulConnections}</div>
                <div className="text-sm text-gray-600">Connected</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <TrendingUp className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">{Math.round(matchStats.successRate)}%</div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Match Cards Section */}
          <div className="lg:col-span-2">
            {currentMatch && currentMatch.user ? (
              <div className="space-y-6">
                {/* Match Card */}
                <Card className="overflow-hidden shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-2xl">
                            {currentMatch.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold text-white">
                            {currentMatch.user.name}
                          </CardTitle>
                          <p className="text-blue-100">
                            {currentMatch.user.university} • {currentMatch.user.year}
                          </p>
                        </div>
                      </div>
                      <div className={`px-4 py-2 rounded-full ${getScoreColor(currentMatch.matchScore)}`}>
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4" />
                          <span className="font-bold">{currentMatch.matchScore}%</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    {/* Match Score Progress */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {getScoreLabel(currentMatch.matchScore)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {currentMatch.matchScore}/100
                        </span>
                      </div>
                      <Progress value={currentMatch.matchScore} className="h-2" />
                    </div>

                    {/* Connection Details */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      {currentMatch.connectionDetails.mutualFriends > 0 && (
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                          <div className="font-semibold text-blue-900">
                            {currentMatch.connectionDetails.mutualFriends}
                          </div>
                          <div className="text-xs text-blue-600">Mutual Friends</div>
                        </div>
                      )}
                      {currentMatch.connectionDetails.sharedInterests > 0 && (
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <Heart className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                          <div className="font-semibold text-purple-900">
                            {currentMatch.connectionDetails.sharedInterests}
                          </div>
                          <div className="text-xs text-purple-600">Shared Interests</div>
                        </div>
                      )}
                      {currentMatch.connectionDetails.commonEvents > 0 && (
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <Calendar className="w-6 h-6 text-green-600 mx-auto mb-1" />
                          <div className="font-semibold text-green-900">
                            {currentMatch.connectionDetails.commonEvents}
                          </div>
                          <div className="text-xs text-green-600">Common Events</div>
                        </div>
                      )}
                    </div>

                    {/* Why You Match */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        Why you match
                      </h4>
                      <div className="space-y-2">
                        {currentMatch.reasons.map((reason, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                            <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></div>
                            {reason}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Interests */}
                    {currentMatch.user?.interests && currentMatch.user.interests.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-blue-500" />
                          Interests
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {currentMatch.user.interests.map((interest, index) => (
                            <Badge key={index} variant="secondary" className="text-sm">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          if (currentMatch && currentMatch.user) {
                            handleReject(currentMatch as MatchSuggestion);
                          }
                        }}
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                      >
                        <X className="w-5 h-5 mr-2" />
                        Pass
                      </Button>
                      <Button
                        size="lg"
                        onClick={() => {
                          if (currentMatch && currentMatch.user) {
                            handleAccept(currentMatch as MatchSuggestion);
                          }
                        }}
                        className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      >
                        <Heart className="w-5 h-5 mr-2" />
                        Connect
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Progress Indicator */}
                {matchSuggestions && (
                  <div className="text-center">
                    <p className="text-sm text-gray-500">
                      {currentMatchIndex + 1} of {matchSuggestions.length} matches
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${((currentMatchIndex + 1) / matchSuggestions.length) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* No Matches State */
              <Card className="text-center py-16">
                <CardContent>
                  <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  {!matchSuggestions || matchSuggestions.length === 0 ? (
                    <>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">
                        No matches yet
                      </h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Let&apos;s find some great connections for you! Generate personalized matches based on your profile.
                      </p>
                      {debugInfo && (
                        <div className="text-left text-xs text-gray-500 mt-4 p-4 bg-gray-50 rounded max-w-lg mx-auto">
                          <p><strong>Debug Info:</strong></p>
                          <p>Total users: {debugInfo.totalUsers}</p>
                          <p>Your friends: {debugInfo.userFriendsCount}</p>
                          <p>Recent suggestions: {debugInfo.recentSuggestionsCount}</p>
                          <p>Potential matches: {debugInfo.potentialMatchesCount}</p>
                          <p>Your interests: {debugInfo.userInterests}</p>
                          <p>University: {debugInfo.userUniversity}</p>
                          {debugInfo.sampleScores && debugInfo.sampleScores.length > 0 && (
                            <div className="mt-2">
                              <p><strong>Sample scores:</strong></p>
                              {debugInfo.sampleScores.map((sample, i) => (
                                <p key={i}>{sample.name}: {sample.score} points</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">
                        You&apos;ve seen all matches
                      </h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Great job exploring! Generate new matches to find more study buddies.
                      </p>
                    </>
                  )}
                  <Button
                    onClick={handleGenerateMatches}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Finding Matches...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Matches
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* How It Works */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  How Matching Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Smart Analysis</h4>
                    <p className="text-sm text-gray-600">We analyze your interests, university, events, and mutual friends</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Perfect Matches</h4>
                    <p className="text-sm text-gray-600">Get personalized suggestions with compatibility scores</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Connect</h4>
                    <p className="text-sm text-gray-600">Accept matches to automatically send friend requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/friends'}
                >
                  <Users className="w-4 h-4 mr-2" />
                  View My Friends
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/events'}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Browse Events
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/settings'}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Update Preferences
                </Button>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Pro Tip</h4>
                    <p className="text-sm text-blue-700">
                      Update your interests and attend more events to get better matches!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
