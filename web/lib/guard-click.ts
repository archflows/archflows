import { toast } from "sonner";

/** Run an action, or explain why the control cannot proceed. */
export function clickOrExplain(reason: string | null | undefined, run: () => void) {
  if (reason) {
    toast.error(reason);
    return;
  }
  run();
}
