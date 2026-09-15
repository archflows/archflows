import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { SiteChrome } from "@/components/SiteChrome";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Providers } from "@/lib/providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import "./globals.css";

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "ArcFlow — Token locks and vesting on Arc",
  description:
    "Immutable token locks, linear vesting, streams, airdrops, escrow, and staking on Arc. Public proof pages. Gas paid in USDC.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn("dark", sans.variable, mono.variable, "font-sans")}
      suppressHydrationWarning
    >
      <body className="min-h-svh text-foreground antialiased" suppressHydrationWarning>
        <Providers>
          <TooltipProvider>
            <SiteChrome>{children}</SiteChrome>
          </TooltipProvider>
        </Providers>
        <ScrollReveal />
      </body>
    </html>
  );
}
