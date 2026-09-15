import { redirect } from "next/navigation";

export default function DashboardAirdropClaimPage() {
  redirect("/dashboard/airdrops?tab=claim");
}
