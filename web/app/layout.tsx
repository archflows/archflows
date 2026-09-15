import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { headers } from "next/headers";
import { SiteChrome } from "@/components/SiteChrome";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Providers } from "@/lib/providers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import "./globals.css";

const sans = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://archflows.finance"),
  title: "ArcFlows. Token locks and vesting on Arc",
  description:
    "Immutable token locks, linear vesting, streams, airdrops, escrow, and staking on Arc. Public proof pages. Gas paid in USDC.",
  icons: {
    icon: [{ url: "/arc-logo-only.png", type: "image/png" }],
    apple: [{ url: "/arc-logo-only.png", type: "image/png" }],
    shortcut: "/arc-logo-only.png",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const cookies = headersList.get("cookie");

  return (
    <html
      lang="en"
      className={cn("dark", sans.variable, mono.variable, "font-sans")}
      suppressHydrationWarning
    >
      <body className="min-h-svh text-foreground antialiased" suppressHydrationWarning>
        <Providers cookies={cookies}>
          <TooltipProvider>
            <SiteChrome>{children}</SiteChrome>
            <Toaster />
          </TooltipProvider>
        </Providers>
        <ScrollReveal />
      </body>
    </html>
  );
}
