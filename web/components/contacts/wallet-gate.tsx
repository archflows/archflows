"use client";

import Link from "next/link";
import { BookUserIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export function ContactsWalletGate({
  title,
  nextPath,
}: {
  title: string;
  nextPath: string;
}) {
  return (
    <Card className="shadow-none ring-0">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <BookUserIcon className="size-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">
          Connect your wallet to save and manage recipient contacts.
        </p>
        <Link
          href={`/auth?next=${encodeURIComponent(nextPath)}`}
          className={cn(buttonVariants({ size: "sm" }), "mt-4")}
        >
          Connect wallet
        </Link>
      </CardContent>
    </Card>
  );
}
