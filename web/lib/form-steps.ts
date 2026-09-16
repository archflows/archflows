import { notify } from "@/lib/notify";

export type FormStep = {
  id: string;
  label: string;
  ok: boolean;
  message: string;
  focusId?: string;
};

export function guardUntilStep(steps: FormStep[], targetId: string): boolean {
  const targetIdx = steps.findIndex((step) => step.id === targetId);
  if (targetIdx <= 0) return true;

  for (let i = 0; i < targetIdx; i++) {
    const step = steps[i];
    if (!step.ok) {
      notify.warning(step.message, `Complete "${step.label}" first.`);
      focusStep(step);
      return false;
    }
  }

  return true;
}

export function firstBlockingStep(steps: FormStep[]): FormStep | null {
  for (const step of steps) {
    if (!step.ok) return step;
  }
  return null;
}

export function explainFirstMissing(steps: FormStep[]): string | null {
  return firstBlockingStep(steps)?.message ?? null;
}

function focusStep(step: FormStep) {
  if (!step.focusId) return;
  const el = document.getElementById(step.focusId);
  if (!el) return;
  el.focus();
  el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
