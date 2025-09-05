"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { PreferencesForm } from "@/components/settings/preferences-form";

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Settings"
          description="Manage your account settings and preferences"
        />

        <PreferencesForm />
      </div>
    </AppLayout>
  );
}