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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchNotificationBadge } from "@/components/matches/match-notification-badge";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { user, isSignedIn } = useUser();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const publicNavigation = [
    { name: "Events", href: "/events" },
    { name: "Clubs", href: "/clubs" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ];

  const authenticatedNavigation = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Events", href: "/events" },
    { name: "Calendar", href: "/calendar" },
    { name: "Clubs", href: "/clubs" },
    { name: "Matches", href: "/matches" },
    { name: "Friends", href: "/friends" },
    { name: "My Events", href: "/my-events" },
    { name: "Discover", href: "/discover" },
  ];

  const userMenuItems = [
    { name: "Profile", href: "/profile" },
    { name: "Settings", href: "/settings" },
    { name: "My RSVPs", href: "/my-events" },
    { name: "Manage Events", href: "/my-events/manage" },
    { name: "Notifications", href: "/notifications" },
    { name: "Admin Tools", href: "/admin" },
  ];

  const navigation = isSignedIn ? authenticatedNavigation : publicNavigation;

  const isActivePath = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link
              href={isSignedIn ? "/dashboard" : "/"}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">
                EventFinder
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActivePath(item.href)
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center">
                  {item.name}
                  {item.name === "Matches" && isSignedIn && <MatchNotificationBadge />}
                </span>
              </Link>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            {/* Search - only for authenticated users */}
            {isSignedIn && (
              <Link href="/search">
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  <Search className="w-4 h-4" />
                </Button>
              </Link>
            )}

            {/* Create Event - only for authenticated users */}
            {isSignedIn && (
              <Link href="/create-event">
                <Button size="sm" className="hidden sm:flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Event
                </Button>
              </Link>
            )}

            {/* Notifications - only for authenticated users */}
            {isSignedIn && (
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-4 h-4" />
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-xs"
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
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-50 transition-colors"
                >
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8",
                      },
                    }}
                  />
                  <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
                </button>

                {/* User dropdown menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                    {userMenuItems.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
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
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm">Sign Up</Button>
                </SignUpButton>
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
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
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActivePath(item.href)
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="flex items-center">
                    {item.name}
                    {item.name === "Matches" && isSignedIn && <MatchNotificationBadge />}
                  </span>
                </Link>
              ))}

              {/* Mobile-only actions */}
              {isSignedIn && (
                <>
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <Link
                      href="/search"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Search className="w-4 h-4 inline mr-2" />
                      Search Events
                    </Link>
                    <Link
                      href="/create-event"
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Create Event
                    </Link>
                  </div>

                  <div className="border-t border-gray-200 pt-4 mt-4">
                    {userMenuItems.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
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
