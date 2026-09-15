import { ClockIcon } from "lucide-react";

type Props = {
  title: string;
  description?: string;
};

export function ComingSoon({ title, description }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-muted-foreground">
        <ClockIcon className="size-6" strokeWidth={1.75} />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Coming soon
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description ?? "This module is not live yet. Locks and vesting are available now."}
        </p>
      </div>
    </div>
  );
}
