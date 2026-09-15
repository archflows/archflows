"use client";

import { CategorySettingsPanel } from "@/components/contacts/category-settings-panel";

export default function DashboardContactsCategoriesPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:px-6 min-w-0">
      <CategorySettingsPanel />
    </div>
  );
}
