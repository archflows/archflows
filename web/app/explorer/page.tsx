import type { Metadata } from "next";
import { Suspense } from "react";
import { ExplorerPage } from "@/components/explorer/ExplorerPage";
import { ExplorerFeedSkeleton } from "@/components/skeletons";

export const metadata: Metadata = {
  title: "Explorer · ArcFlows",
  description:
    "Browse public lock activity on ArcFlows. Search by lock ID, wallet, token, or transaction.",
};

export default function Page() {
  return (
    <Suspense fallback={<ExplorerFeedSkeleton rows={5} />}>
      <ExplorerPage />
    </Suspense>
  );
}
