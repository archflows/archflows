import { redirect } from "next/navigation";

export default function MeRedirect() {
  redirect("/app/locks");
}
