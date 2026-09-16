"use client";

import type { ReactNode } from "react";
import { UnlockDatePicker } from "@/components/forms/unlock-date-picker";

export function FormShell({
  title,
  badge,
  children,
  aside,
}: {
  title: string;
  badge?: string;
  children: ReactNode;
  aside: ReactNode;
}) {
  return (
    <div className="create-grid">
      <div className="panel">
        <div className="panel-head">
          <span>{title}</span>
          {badge ? <span className="live live-accent">{badge}</span> : null}
        </div>
        <div className="panel-body">{children}</div>
      </div>
      <aside>{aside}</aside>
    </div>
  );
}

export function PreviewPanel({
  title = "Preview",
  rows,
  note,
}: {
  title?: string;
  rows: { label: string; value: ReactNode }[];
  note?: ReactNode;
}) {
  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <span>{title}</span>
        </div>
        <dl style={{ margin: 0 }}>
          {rows.map((row) => (
            <div className="kv" key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        {note ? (
          <p className="field-hint" style={{ lineHeight: 1.65, padding: "0.75rem 1rem 1rem", margin: 0 }}>
            {note}
          </p>
        ) : null}
      </div>
    </>
  );
}

export function DurationTriple({
  days,
  hours,
  minutes,
  onDays,
  onHours,
  onMinutes,
}: {
  days: string;
  hours: string;
  minutes: string;
  onDays: (v: string) => void;
  onHours: (v: string) => void;
  onMinutes: (v: string) => void;
}) {
  return (
    <div className="unlock-after-parts">
      {(
        [
          ["Days", days, onDays],
          ["Hours", hours, onHours],
          ["Minutes", minutes, onMinutes],
        ] as const
      ).map(([label, value, onChange]) => (
        <label className="unlock-part" key={label}>
          <span>{label}</span>
          <input
            className="af-input"
            inputMode="numeric"
            autoComplete="off"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

export function UnlockAfterField({
  days,
  hours,
  minutes,
  onDays,
  onHours,
  onMinutes,
  datetimeValue,
  datetimeMin,
  onDatetimeChange,
  error,
}: {
  days: string;
  hours: string;
  minutes: string;
  onDays: (v: string) => void;
  onHours: (v: string) => void;
  onMinutes: (v: string) => void;
  datetimeValue: string;
  datetimeMin?: string;
  onDatetimeChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="field">
      <span className="field-label">Unlock after</span>
      <div className="unlock-after-row">
        {(
          [
            ["Days", days, onDays],
            ["Hours", hours, onHours],
            ["Minutes", minutes, onMinutes],
          ] as const
        ).map(([label, value, onChange]) => (
          <label className="unlock-part" key={label}>
            <span>{label}</span>
            <input
              className="af-input"
              inputMode="numeric"
              autoComplete="off"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          </label>
        ))}
        <div className="unlock-part unlock-part-date">
          <span>Or pick date</span>
          <UnlockDatePicker min={datetimeMin} value={datetimeValue} onApply={onDatetimeChange} />
        </div>
      </div>
      <p className="field-hint">
        The entire amount unlocks on this date — nothing is claimable before it.
      </p>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

