"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Target, 
  Zap, 
  Heart, 
  Calendar,
  MapPin,
  Star,
  Shield
} from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  const features = [
    {
      icon: Target,
      title: "AI-Powered Recommendations",
      description: "Get personalized event suggestions based on your interests, past attendance, and preferences."
    },
    {
      icon: MapPin,
      title: "Comprehensive Event Discovery",
      description: "Find events from Eventbrite, UBC clubs, Meetup, and other sources all in one place."
    },
    {
      icon: Users,
      title: "Buddy Matching",
      description: "Connect with other students attending the same events and make new friends."
    },
    {
      icon: Calendar,
      title: "Smart Calendar Integration",
      description: "Sync events to your calendar and get reminders so you never miss out."
    },
    {
      icon: Star,
      title: "Event Reviews & Ratings",
      description: "Read reviews from other students and share your own event experiences."
    },
    {
      icon: Shield,
      title: "Safe & Verified",
      description: "All events are verified and we prioritize student safety and privacy."
    }
  ];

  const stats = [
    { number: "1000+", label: "Events Discovered", color: "text-blue-600" },
    { number: "500+", label: "Active Students", color: "text-green-600" },
    { number: "50+", label: "Partner Organizations", color: "text-purple-600" },
    { number: "95%", label: "User Satisfaction", color: "text-orange-600" }
  ];

  const team = [
    {
      name: "Alex Chen",
      role: "Founder & CEO",
      bio: "UBC Computer Science student passionate about connecting students through events."
    },
    {
      name: "Sarah Kim",
      role: "CTO",
      bio: "AI/ML enthusiast building the recommendation engine that powers our platform."
    },
    {
      name: "Marcus Johnson",
      role: "Head of Community",
      bio: "Former UBC student government member focused on student engagement."
    }
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="About EventFinder"
          description="Connecting UBC students through amazing events and experiences"
          showBreadcrumb={false}
        />

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white mb-12">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-xl text-blue-100 leading-relaxed">
              We believe that university life should be rich with opportunities to learn, grow, and connect. 
              EventFinder makes it easy for UBC students to discover events that match their interests, 
              meet like-minded peers, and make the most of their university experience.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`text-4xl font-bold ${stat.color} mb-2`}>
                {stat.number}
              </div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose EventFinder?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="text-center">
                  <CardHeader>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Your Profile</h3>
              <p className="text-gray-600">
                Tell us about your interests, year, and what kind of events you're looking for.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Recommendations</h3>
              <p className="text-gray-600">
                Our AI analyzes thousands of events to find the perfect matches for you.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Attend & Connect</h3>
              <p className="text-gray-600">
                RSVP to events, find event buddies, and make lasting connections.
              </p>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Meet the Team</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <CardTitle>{member.name}</CardTitle>
                  <Badge variant="secondary">{member.role}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Join hundreds of UBC students who are already discovering amazing events and making new connections.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg">
                Sign Up Free
              </Button>
            </Link>
            <Link href="/events">
              <Button variant="outline" size="lg">
                Browse Events
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}