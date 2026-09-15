import { Suspense } from "react";
import { HomePageSkeleton } from "@/components/page-skeleton";
import AuthClient from "./AuthClient";
import AuthLoading from "./loading";

export default function AuthPage() {
  return (
<Suspense fallback={<AuthLoading />}>
      <AuthClient />
    </Suspense>
  );
}
