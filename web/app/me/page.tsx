import { redirect } from "next/navigation";

export default function MeRedirect() {
  redirect("/dashboard/locks");
}
