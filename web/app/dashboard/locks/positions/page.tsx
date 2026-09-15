import { redirect } from "next/navigation";

export default function DashboardLockPositionsPage() {
  redirect("/dashboard/locks?tab=positions");
}
