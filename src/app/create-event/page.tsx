"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, MapPin, Users, DollarSign, Tag, Image, Link as LinkIcon, Save, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CreateEventPage() {
  const { user } = useUser();
  const router = useRouter();

  // Get user profile
  const userProfile = useQuery(
    api.users.getCurrentUser,
    user ? {} : "skip"
  );

  // Create event mutation
  const createEvent = useMutation(api.events.createEvent);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    locationName: '',
    locationAddress: '',
    isVirtual: false,
    organizerName: '',
    organizerType: 'student' as 'club' | 'university' | 'external' | 'student',
    organizerContact: '',
    categories: [] as string[],
    tags: [] as string[],
    capacity: '',
    isFree: true,
    amount: '',
    currency: 'CAD',
    images: [] as string[],
    registrationUrl: '',
    websiteUrl: '',
    socialUrls: [] as string[]
  });

  const [currentTag, setCurrentTag] = useState('');
  const [currentSocialUrl, setCurrentSocialUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableCategories = [
    'tech', 'music', 'sports', 'volunteering', 'career', 'academic', 
    'social', 'cultural', 'food', 'arts', 'networking', 'workshop'
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addCategory = (category: string) => {
    if (!formData.categories.includes(category)) {
      handleInputChange('categories', [...formData.categories, category]);
    }
  };

  const removeCategory = (category: string) => {
    handleInputChange('categories', formData.categories.filter(c => c !== category));
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      handleInputChange('tags', [...formData.tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const removeTag = (tag: string) => {
    handleInputChange('tags', formData.tags.filter(t => t !== tag));
  };

  const addSocialUrl = () => {
    if (currentSocialUrl.trim() && !formData.socialUrls.includes(currentSocialUrl.trim())) {
      handleInputChange('socialUrls', [...formData.socialUrls, currentSocialUrl.trim()]);
      setCurrentSocialUrl('');
    }
  };

  const removeSocialUrl = (url: string) => {
    handleInputChange('socialUrls', formData.socialUrls.filter(u => u !== url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile?._id) {
      alert('Please complete your profile setup first');
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in the required fields (title and description)');
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime || '00:00'}`);
      const endDateTime = formData.endDate && formData.endTime 
        ? new Date(`${formData.endDate}T${formData.endTime}`)
        : new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

      // Prepare event data
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        startDate: startDateTime.getTime(),
        endDate: endDateTime.getTime(),
        location: {
          name: formData.locationName.trim() || 'TBD',
          address: formData.locationAddress.trim() || 'TBD',
          latitude: 49.2606, // Default to UBC coordinates
          longitude: -123.246,
          isVirtual: formData.isVirtual
        },
        organizer: {
          name: formData.organizerName.trim() || user?.fullName || 'Unknown',
          type: formData.organizerType,
          verified: false,
          contactInfo: formData.organizerContact.trim() || user?.primaryEmailAddress?.emailAddress || ''
        },
        categories: formData.categories.length > 0 ? formData.categories : ['social'],
        tags: formData.tags,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        price: {
          amount: formData.isFree ? 0 : (parseFloat(formData.amount) || 0),
          currency: formData.currency,
          isFree: formData.isFree
        },
        images: formData.images,
        externalLinks: {
          registration: formData.registrationUrl.trim() || undefined,
          website: formData.websiteUrl.trim() || undefined,
          social: formData.socialUrls.length > 0 ? formData.socialUrls : undefined
        },
        source: {
          platform: 'student-created',
          originalId: `user-${userProfile._id}-${Date.now()}`,
          url: formData.websiteUrl.trim() || window.location.origin
        }
      };

      const eventId = await createEvent(eventData);
      
      alert('Event created successfully!');
      router.push(`/events/${eventId}`);
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Please sign in</h2>
            <p className="text-gray-600">You need to be signed in to create an event.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (userProfile === undefined) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (userProfile === null) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Setup Required</h2>
            <p className="text-gray-600 mb-4">Please complete your profile setup to create events.</p>
            <Button onClick={() => router.push('/profile')}>
              Complete Profile Setup
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Create Event"
          description="Share your event with the UBC community"
          showBreadcrumb={false}
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter event title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your event"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={formData.isVirtual}
                    onChange={(e) => handleInputChange('isVirtual', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Virtual Event</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venue Name
                </label>
                <input
                  type="text"
                  value={formData.locationName}
                  onChange={(e) => handleInputChange('locationName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={formData.isVirtual ? "Platform (e.g., Zoom, Discord)" : "Venue name"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.locationAddress}
                  onChange={(e) => handleInputChange('locationAddress', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={formData.isVirtual ? "Meeting URL or link" : "Full address"}
                />
              </div>
            </CardContent>
          </Card>

          {/* Categories & Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Categories & Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {availableCategories.map(category => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => formData.categories.includes(category) ? removeCategory(category) : addCategory(category)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        formData.categories.includes(category)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                {formData.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formData.categories.map(category => (
                      <Badge key={category} variant="secondary" className="flex items-center gap-1">
                        {category}
                        <button
                          type="button"
                          onClick={() => removeCategory(category)}
                          className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add custom tags"
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    Add
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Capacity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Pricing & Capacity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={formData.isFree}
                    onChange={(e) => handleInputChange('isFree', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Free Event</span>
                </label>
              </div>

              {!formData.isFree && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="CAD">CAD</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity (optional)
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => handleInputChange('capacity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Maximum number of attendees"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
