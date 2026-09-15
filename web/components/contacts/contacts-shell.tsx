"use client";

import type { ReactNode } from "react";

export function ContactsShell({ children }: { children: ReactNode }) {
  return <div className="contacts-mgmt min-w-0 w-full">{children}</div>;
}
