"use client";

import Link from "next/link";
import { Clock3Icon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ComingSoon({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:px-6">
      <Card className="max-w-lg shadow-none ring-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3Icon className="size-4 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>Coming soon</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          <Link href="/dashboard/locks" className="btn sm">
            Go to locks
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
