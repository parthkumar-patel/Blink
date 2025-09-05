"use client";

import { ReactNode } from "react";
import { Breadcrumb } from "./breadcrumb";

interface PageHeaderProps {
  title: string;
  description?: string | ReactNode;
  actions?: ReactNode;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
  showBreadcrumb?: boolean;
}

export function PageHeader({ 
  title, 
  description, 
  actions, 
  breadcrumbItems,
  showBreadcrumb = true 
}: PageHeaderProps) {
  return (
    <div className="mb-8">
      {showBreadcrumb && <Breadcrumb items={breadcrumbItems} />}
      
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {description && (
            typeof description === 'string' ? (
              <p className="text-gray-600 mt-2 text-lg">{description}</p>
            ) : (
              <div className="text-gray-600 mt-2 text-lg">{description}</div>
            )
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}