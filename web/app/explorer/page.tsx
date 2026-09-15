import type { Metadata } from "next";
import { ExplorerPage } from "@/components/explorer/ExplorerPage";

export const metadata: Metadata = {
  title: "Explorer · ArcFlows",
  description:
    "Browse public lock activity on ArcFlows. Search by lock ID, wallet, token, or transaction.",
};

export default function Page() {
  return <ExplorerPage />;
}
