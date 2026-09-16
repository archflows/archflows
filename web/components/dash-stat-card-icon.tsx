import type { LucideIcon } from "lucide-react";

export function DashStatCardIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="dash-stat-card-icon" aria-hidden>
      <Icon strokeWidth={1.75} />
    </div>
  );
}
