"use client";

import { CategorySettingsPanel } from "@/components/contacts/category-settings-panel";

export default function DashboardContactsCategoriesPage() {
  return (
    <div className="flex flex-1 flex-col p-2 md:p-4 lg:px-4 min-w-0">
      <CategorySettingsPanel />
    </div>
  );
}
