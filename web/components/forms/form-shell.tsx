"use client";

import type { ReactNode } from "react";

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
      <aside className="space-y-4">{aside}</aside>
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
      </div>
      {note ? <p className="field-hint" style={{ lineHeight: 1.65 }}>{note}</p> : null}
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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: "0.4rem",
      }}
    >
      {(
        [
          ["Days", days, onDays],
          ["Hours", hours, onHours],
          ["Minutes", minutes, onMinutes],
        ] as const
      ).map(([label, value, onChange]) => (
        <label className="field" style={{ margin: 0 }} key={label}>
          <span className="field-hint" style={{ marginBottom: "0.25rem", display: "block" }}>
            {label}
          </span>
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
