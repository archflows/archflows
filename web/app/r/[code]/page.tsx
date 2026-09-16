"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { REFERRAL_PARAM, normalizeCode, rememberCode } from "@/lib/referral";

export default function ReferralSharePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = use(params);
  const router = useRouter();

  useEffect(() => {
    const code = rememberCode(raw) ?? normalizeCode(raw);
    router.replace(code ? `/?${REFERRAL_PARAM}=${code}` : "/");
  }, [raw, router]);

  return (
    <main className="flex min-h-[50vh] items-center justify-center">
      <p className="dim">Opening ArcFlows…</p>
    </main>
  );
}
