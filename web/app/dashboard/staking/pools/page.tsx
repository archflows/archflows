import { redirect } from "next/navigation";

export default function DashboardStakingPoolsPage() {
  redirect("/dashboard/staking?tab=stake");
}
