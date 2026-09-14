import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { SiteChrome } from "@/components/SiteChrome";
import { SpaceBackdrop } from "@/components/SpaceBackdrop";
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
  title: "ArcFlow — Token Lock & Vesting in Orbit on Arc",
  description:
    "Immutable token locks and linear vesting on Arc. Put the dev bag in orbit, share a public proof page. Gas paid in USDC.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark", sans.variable, mono.variable, "font-sans")}>
      <body className="min-h-svh text-foreground antialiased">
        <SpaceBackdrop />
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
