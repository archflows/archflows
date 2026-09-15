import { redirect } from "next/navigation";

export default function DashboardVestingPositionsPage() {
  redirect("/dashboard/vesting?tab=positions");
}
