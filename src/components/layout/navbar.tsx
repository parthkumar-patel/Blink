"use client";

import { useState } from "react";
import { useUser, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";
import { 
  Calendar, 
  Menu, 
  X, 
  Bell,
  Search,
  Plus,
  ChevronDown,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { user, isSignedIn } = useUser();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const publicNavigation = [
    { name: 'Events', href: '/events' },
    { name: 'Clubs', href: '/clubs' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  const authenticatedNavigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Events', href: '/events' },
    { name: 'Clubs', href: '/clubs' },
    { name: 'My Events', href: '/my-events' },
    { name: 'Discover', href: '/discover' },
  ];

  const userMenuItems = [
    { name: 'Profile', href: '/profile' },
    { name: 'Settings', href: '/settings' },
    { name: 'My RSVPs', href: '/my-events' },
    { name: 'Notifications', href: '/notifications' },
  ];

  const navigation = isSignedIn ? authenticatedNavigation : publicNavigation;

  const isActivePath = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <nav className="bg-background/80 backdrop-blur-md cute-soft-shadow border-b border-border sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href={isSignedIn ? "/dashboard" : "/"} className="flex items-center gap-2 group">
              <div className="w-8 h-8 cute-gradient-pink cute-rounded flex items-center justify-center cute-glow group-hover:cute-glow-strong transition-all duration-300">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-foreground cute-text-glow">CutieEvents</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-4 py-2 cute-rounded text-sm font-medium transition-all duration-300 hover:scale-105 ${
                  isActivePath(item.href)
                    ? 'text-cute-pink bg-accent cute-glow cute-text-glow'
                    : 'text-foreground hover:text-cute-pink hover:bg-accent/50 hover:cute-glow'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Search - only for authenticated users */}
            {isSignedIn && (
              <Link href="/search">
                <Button variant="ghost" size="sm" className="hidden sm:flex cute-glow hover:cute-glow-strong">
                  <Search className="w-4 h-4" />
                </Button>
              </Link>
            )}

            {/* Create Event - only for authenticated users */}
            {isSignedIn && (
              <Link href="/create-event">
                <Button variant="cute-gradient" size="sm" className="hidden sm:flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Event
                </Button>
              </Link>
            )}

            {/* Notifications - only for authenticated users */}
            {isSignedIn && (
              <Button variant="ghost" size="sm" className="relative cute-glow hover:cute-glow-strong">
                <Bell className="w-4 h-4" />
                <Badge 
                  className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-xs cute-gradient-pink border-0 cute-glow"
                >
                  2
                </Badge>
              </Button>
            )}

            {/* User menu or auth buttons */}
            {isSignedIn ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 cute-rounded hover:bg-accent cute-glow hover:cute-glow-strong transition-all duration-300 hover:scale-105"
                >
                  <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8 cute-rounded cute-border-glow"
                      }
                    }}
                  />
                  <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                </button>

                {/* User dropdown menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-card cute-rounded-lg cute-soft-shadow cute-border-glow border border-border py-1 z-50 backdrop-blur-md">
                    <div className="px-4 py-2 border-b border-border">
                      <p className="text-sm font-medium text-foreground cute-text-glow">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                    {userMenuItems.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="block px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-cute-pink cute-rounded mx-1 my-0.5 transition-all duration-300 hover:cute-glow"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <SignInButton mode="modal">
                  <Button variant="ghost" size="sm" className="cute-glow hover:cute-glow-strong">
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button variant="cute-gradient" size="sm">
                    Sign Up
                  </Button>
                </SignUpButton>
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden cute-glow hover:cute-glow-strong"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4 bg-card/50 backdrop-blur-md cute-soft-shadow">
            <div className="space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 cute-rounded text-base font-medium transition-all duration-300 mx-2 ${
                    isActivePath(item.href)
                      ? 'text-cute-pink bg-accent cute-glow cute-text-glow'
                      : 'text-foreground hover:text-cute-pink hover:bg-accent/50 hover:cute-glow'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile-only actions */}
              {isSignedIn && (
                <>
                  <div className="border-t border-border pt-4 mt-4">
                    <Link
                      href="/search"
                      className="block px-3 py-2 cute-rounded text-base font-medium text-foreground hover:text-cute-pink hover:bg-accent/50 hover:cute-glow transition-all duration-300 mx-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Search className="w-4 h-4 inline mr-2" />
                      Search Events
                    </Link>
                    <Link
                      href="/create-event"
                      className="block px-3 py-2 cute-rounded text-base font-medium text-foreground hover:text-cute-pink hover:bg-accent/50 hover:cute-glow transition-all duration-300 mx-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Create Event
                    </Link>
                  </div>
                  
                  <div className="border-t border-border pt-4 mt-4">
                    {userMenuItems.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="block px-3 py-2 cute-rounded text-base font-medium text-foreground hover:text-cute-pink hover:bg-accent/50 hover:cute-glow transition-all duration-300 mx-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </nav>
  );
}