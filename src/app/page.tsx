"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/app-layout";
import { Search, Sparkles, Heart, Star } from "lucide-react";

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    // Trigger fade-in animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-cute-pink/30 border-t-cute-pink"></div>
      </div>
    );
  }

  if (isSignedIn) {
    return null; // Will redirect
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 relative overflow-hidden">
        {/* Subtle Floating Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 animate-bounce delay-1000 duration-3000">
            <Heart className="w-4 h-4 text-cute-pink/40" />
          </div>
          <div className="absolute top-40 right-20 animate-bounce delay-2000 duration-3000">
            <Star className="w-5 h-5 text-cute-lavender/30" />
          </div>
          <div className="absolute bottom-40 left-20 animate-bounce delay-3000 duration-3000">
            <Sparkles className="w-4 h-4 text-cute-cyan/35" />
          </div>
          <div className="absolute top-60 right-10 animate-bounce delay-500 duration-3000">
            <Heart className="w-3 h-3 text-cute-mint/45" />
          </div>
        </div>

        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className={`text-center max-w-4xl mx-auto transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            {/* Hero Section with Cute Mascot */}
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="text-6xl mb-4 filter drop-shadow-sm">🎉</div>
                <div className="absolute -top-1 -right-1">
                  <Sparkles className="w-4 h-4 text-cute-pink/60" />
                </div>
              </div>
            </div>
            
            <h1 className="text-5xl font-bold mb-6 text-foreground">
              Discover Amazing Events at{" "}
              <span className="text-cute-pink">UBC</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Never miss out on campus events again. Our AI-powered platform aggregates 
              events from across UBC and Vancouver, giving you personalized recommendations 
              for meetups, workshops, hackathons, career fairs, and more.
            </p>

            {/* Cute Search Bar */}
            <div className="mb-8 max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search for events... ✨"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-card border border-border focus:border-cute-pink/60 focus:outline-none focus:ring-2 focus:ring-cute-pink/20 transition-all duration-300 text-foreground placeholder:text-muted-foreground shadow-sm"
                />
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/sign-up">
                <Button size="lg" className="text-lg px-8 py-3 rounded-2xl bg-cute-pink hover:bg-cute-pink/90 text-white shadow-md hover:shadow-lg transition-all duration-300">
                  Get Started Free ✨
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" size="lg" className="text-lg px-8 py-3 rounded-2xl border-cute-pink/30 hover:bg-cute-pink/5 hover:border-cute-pink/50 transition-all duration-300">
                  Sign In 💫
                </Button>
              </Link>
            </div>

            {/* Features Grid */}
            <div className={`grid md:grid-cols-3 gap-8 mt-16 transition-all duration-1000 delay-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
              <div className="bg-card p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-cute-pink/10 hover:border-cute-pink/20 group">
                <div className="text-3xl mb-4 group-hover:scale-105 transition-transform duration-300">🎯</div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">Personalized Recommendations</h3>
                <p className="text-muted-foreground">
                  AI-powered suggestions based on your interests, schedule, and past attendance.
                </p>
              </div>

              <div className="bg-card p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-cute-lavender/10 hover:border-cute-lavender/20 group">
                <div className="text-3xl mb-4 group-hover:scale-105 transition-transform duration-300">📍</div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">All Events in One Place</h3>
                <p className="text-muted-foreground">
                  Aggregated from Eventbrite, Meetup, UBC clubs, Discord servers, and more.
                </p>
              </div>

              <div className="bg-card p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-cute-cyan/10 hover:border-cute-cyan/20 group">
                <div className="text-3xl mb-4 group-hover:scale-105 transition-transform duration-300">🤝</div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">Find Event Buddies</h3>
                <p className="text-muted-foreground">
                  Connect with other students attending the same events and make new friends.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className={`mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 transition-all duration-1000 delay-500 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
              <div className="text-center group">
                <div className="text-3xl font-bold text-cute-pink group-hover:scale-105 transition-all duration-300">100+</div>
                <div className="text-muted-foreground">Events per week</div>
              </div>
              <div className="text-center group">
                <div className="text-3xl font-bold text-cute-lavender group-hover:scale-105 transition-all duration-300">50+</div>
                <div className="text-muted-foreground">Student clubs</div>
              </div>
              <div className="text-center group">
                <div className="text-3xl font-bold text-cute-cyan group-hover:scale-105 transition-all duration-300">5+</div>
                <div className="text-muted-foreground">Event sources</div>
              </div>
              <div className="text-center group">
                <div className="text-3xl font-bold text-cute-mint group-hover:scale-105 transition-all duration-300">24/7</div>
                <div className="text-muted-foreground">Event discovery</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}