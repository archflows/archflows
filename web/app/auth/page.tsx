import { Suspense } from "react";
import { HomePageSkeleton } from "@/components/page-skeleton";
import AuthClient from "./AuthClient";

export default function AuthPage() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <AuthClient />
    </Suspense>
  );
}
