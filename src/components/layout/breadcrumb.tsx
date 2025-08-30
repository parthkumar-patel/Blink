"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const pathname = usePathname();

  // Auto-generate breadcrumbs from pathname if no items provided
  const breadcrumbItems = items || generateBreadcrumbsFromPath(pathname);

  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      <Link 
        href="/dashboard" 
        className="flex items-center hover:text-blue-600 transition-colors"
      >
        <Home className="w-4 h-4" />
      </Link>
      
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {item.href && index < breadcrumbItems.length - 1 ? (
            <Link 
              href={item.href}
              className="hover:text-blue-600 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Map of path segments to readable labels
  const labelMap: Record<string, string> = {
    'dashboard': 'Dashboard',
    'my-events': 'My Events',
    'events': 'Events',
    'profile': 'Profile',
    'settings': 'Settings',
    'map': 'Map View',
    'discover': 'Discover',
    'notifications': 'Notifications',
    'search': 'Search',
    'create-event': 'Create Event',
  };

  segments.forEach((segment, index) => {
    const label = labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const href = index < segments.length - 1 ? '/' + segments.slice(0, index + 1).join('/') : undefined;
    
    breadcrumbs.push({
      label,
      href
    });
  });

  return breadcrumbs;
}