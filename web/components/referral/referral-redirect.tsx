"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { REFERRAL_PARAM, rememberCode } from "@/lib/referral";

export function ReferralRedirect({ code }: { code: string }) {
  const router = useRouter();

  useEffect(() => {
    rememberCode(code);
    const timer = window.setTimeout(() => {
      router.replace(`/?${REFERRAL_PARAM}=${code}`);
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [code, router]);

  return null;
}
