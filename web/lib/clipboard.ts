import { toast } from "sonner";

export async function copyToClipboard(text: string, ok = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(ok);
    return true;
  } catch {
    toast.error("Could not copy");
    return false;
  }
}
