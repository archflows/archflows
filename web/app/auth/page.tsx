import { Suspense } from "react";
import AuthClient from "./AuthClient";
import AuthLoading from "./loading";

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthClient />
    </Suspense>
  );
}
