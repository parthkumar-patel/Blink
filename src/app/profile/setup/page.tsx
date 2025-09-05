"use client";

import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  MapPin,
  GraduationCap,
  Heart,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { LocationDetector } from "@/components/location/location-detector";

const STEPS = [
  { id: 1, title: "Basic Info", icon: GraduationCap },
  { id: 2, title: "Interests", icon: Heart },
  { id: 3, title: "Location", icon: MapPin },
];

const INTERESTS = [
  { id: "tech", label: "Technology", emoji: "💻" },
  { id: "career", label: "Career Development", emoji: "💼" },
  { id: "academic", label: "Academic", emoji: "📚" },
  { id: "workshop", label: "Workshops", emoji: "🛠️" },
  { id: "social", label: "Social Events", emoji: "🎉" },
  { id: "cultural", label: "Cultural", emoji: "🌍" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "arts", label: "Arts & Creative", emoji: "🎨" },
  { id: "sports", label: "Sports & Fitness", emoji: "⚽" },
  { id: "food", label: "Food & Dining", emoji: "🍕" },
  { id: "volunteering", label: "Volunteering", emoji: "🤝" },
  { id: "networking", label: "Networking", emoji: "🤝" },
  { id: "entrepreneurship", label: "Entrepreneurship", emoji: "🚀" },
  { id: "research", label: "Research", emoji: "🔬" },
  { id: "gaming", label: "Gaming", emoji: "🎮" },
  { id: "photography", label: "Photography", emoji: "📸" },
  { id: "travel", label: "Travel", emoji: "✈️" },
];

const YEARS = [
  { value: "freshman", label: "1st Year (Freshman)" },
  { value: "sophomore", label: "2nd Year (Sophomore)" },
  { value: "junior", label: "3rd Year (Junior)" },
  { value: "senior", label: "4th Year (Senior)" },
  { value: "graduate", label: "Graduate Student" },
];

export default function ProfileSetupPage() {
  const { user } = useUser();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    university: "UBC",
    year: "" as any,
    interests: [] as string[],
    location: {
      address: "",
      latitude: 0,
      longitude: 0,
    },
  });

  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleInterest = (interestId: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter((id) => id !== interestId)
        : [...prev.interests, interestId],
    }));
  };

  const handleLocationDetected = (location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  }) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        address: "Vancouver, BC (Current Location)",
        latitude: location.latitude,
        longitude: location.longitude,
      },
    }));
    setLocationAccuracy(location.accuracy || null);
  };

  const handleLocationError = (error: string) => {
    console.error("Location detection error:", error);
    // Optionally show error to user or set default location
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const result = await createOrUpdateUser({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress || "",
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User",
        university: formData.university,
        year: formData.year,
        interests: formData.interests,
        location: formData.location.address ? formData.location : undefined,
      });

      // Small delay to ensure the data is saved
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Redirect to profile page to show the completed profile
      router.push("/profile");
    } catch (error) {
      console.error("Error creating profile:", error);
      alert("There was an error saving your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.year !== "";
      case 2:
        return formData.interests.length > 0;
      case 3:
        return true; // Location is optional
      default:
        return false;
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to EventFinder! 🎉
          </h1>
          <p className="text-gray-600">
            Let's set up your profile to get personalized event recommendations
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                    ${
                      isCompleted
                        ? "bg-green-500 border-green-500 text-white"
                        : isActive
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-gray-300 text-gray-400"
                    }
                  `}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      isActive
                        ? "text-blue-600"
                        : isCompleted
                          ? "text-green-600"
                          : "text-gray-400"
                    }`}
                  >
                    {step.title}
                  </span>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`w-12 h-0.5 mx-4 ${
                        isCompleted ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(STEPS[currentStep - 1].icon, {
                className: "w-5 h-5",
              })}
              Step {currentStep}: {STEPS[currentStep - 1].title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    University
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <span className="text-gray-900 font-medium">
                      University of British Columbia (UBC)
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    What year are you in? *
                  </label>
                  <div className="grid gap-3">
                    {YEARS.map((year) => (
                      <button
                        key={year.value}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, year: year.value }))
                        }
                        className={`p-4 text-left rounded-lg border-2 transition-colors ${
                          formData.year === year.value
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div className="font-medium">{year.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Interests */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    What are you interested in? *
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Select all that apply. We'll use this to recommend events
                    you'll love!
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {INTERESTS.map((interest) => (
                    <button
                      key={interest.id}
                      onClick={() => toggleInterest(interest.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        formData.interests.includes(interest.id)
                          ? "border-blue-500 bg-blue-50 text-blue-700 scale-105"
                          : "border-gray-200 hover:border-gray-300 bg-white hover:scale-102"
                      }`}
                    >
                      <div className="text-2xl mb-1">{interest.emoji}</div>
                      <div className="font-medium text-sm">
                        {interest.label}
                      </div>
                    </button>
                  ))}
                </div>

                {formData.interests.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-green-800 font-medium mb-2">
                      Selected interests ({formData.interests.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {formData.interests.map((interestId) => {
                        const interest = INTERESTS.find(
                          (i) => i.id === interestId
                        );
                        return (
                          <Badge
                            key={interestId}
                            variant="secondary"
                            className="bg-green-100 text-green-800"
                          >
                            {interest?.emoji} {interest?.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Location */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Where are you located?
                  </h3>
                  <p className="text-gray-600 mb-4">
                    This helps us show you events near you with high precision.
                    You can skip this step if you prefer.
                  </p>
                </div>

                <LocationDetector
                  onLocationDetected={handleLocationDetected}
                  onError={handleLocationError}
                  currentLocation={
                    formData.location.latitude && formData.location.longitude
                      ? {
                          latitude: formData.location.latitude,
                          longitude: formData.location.longitude,
                        }
                      : null
                  }
                  className="mb-4"
                />

                {formData.location.address && locationAccuracy && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-800 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium">
                        Location Set Successfully
                      </span>
                    </div>
                    <div className="text-sm text-blue-700">
                      <div>Address: {formData.location.address}</div>
                      <div>
                        Accuracy: {Math.round(locationAccuracy)}m (
                        {locationAccuracy < 10
                          ? "Very High"
                          : locationAccuracy < 50
                            ? "High"
                            : locationAccuracy < 100
                              ? "Medium"
                              : "Low"}{" "}
                        precision)
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    Don't worry, you can always update this later in your
                    profile settings.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating Profile...
                </>
              ) : (
                <>
                  Complete Setup
                  <Check className="w-4 h-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
