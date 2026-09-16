"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const POPOVER_GAP = 6;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseLocalInput(value: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatDisplay(d: Date) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function clampToMin(d: Date, min?: Date | null) {
  if (!min) return d;
  return d.getTime() < min.getTime() ? new Date(min) : d;
}

type PopoverCoords = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
};

export function UnlockDatePicker({
  value,
  min,
  onApply,
}: {
  value: string;
  min?: string;
  onApply: (value: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minuteColRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);
  const [draft, setDraft] = useState<Date>(() => parseLocalInput(value) ?? new Date());

  const minDate = useMemo(() => parseLocalInput(min ?? ""), [min]);
  const applied = useMemo(() => parseLocalInput(value), [value]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const parsed = parseLocalInput(value);
    if (parsed) setDraft(parsed);
  }, [value]);

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      const popover = popoverRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const width = rect.width;
      const popHeight = popover?.offsetHeight ?? 300;
      const spaceBelow = window.innerHeight - rect.bottom - POPOVER_GAP;
      const spaceAbove = rect.top - POPOVER_GAP;
      const openUp = spaceBelow < popHeight && spaceAbove > spaceBelow;

      let left = rect.left;
      if (left + width > window.innerWidth - POPOVER_GAP) {
        left = window.innerWidth - width - POPOVER_GAP;
      }
      if (left < POPOVER_GAP) left = POPOVER_GAP;

      if (openUp) {
        setCoords({
          left,
          width,
          bottom: window.innerHeight - rect.top + POPOVER_GAP,
        });
      } else {
        setCoords({
          left,
          width,
          top: rect.bottom + POPOVER_GAP,
        });
      }
    }

    updatePosition();
    requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, draft.getMonth(), draft.getFullYear()]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function centerSelected(viewport: HTMLDivElement | null) {
      if (!viewport) return;
      const selected = viewport.querySelector<HTMLElement>(".unlock-date-time-item.is-selected");
      if (!selected) return;
      const offset = selected.offsetTop - (viewport.clientHeight - selected.offsetHeight) / 2;
      viewport.scrollTop = Math.max(0, offset);
    }
    requestAnimationFrame(() => {
      centerSelected(hourColRef.current);
      centerSelected(minuteColRef.current);
    });
  }, [open, draft.getHours(), draft.getMinutes()]);

  const monthLabel = `${MONTHS[draft.getMonth()]} ${draft.getFullYear()}`;
  const monthCells = useMemo(() => {
    const year = draft.getFullYear();
    const month = draft.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { day: number | null; date?: Date }[] = [];
    for (let i = 0; i < startPad; i++) cells.push({ day: null });
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ day, date: new Date(year, month, day) });
    }
    return cells;
  }, [draft]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  function openPicker() {
    const base = applied ?? parseLocalInput(value) ?? new Date();
    setDraft(clampToMin(base, minDate));
    setOpen(true);
  }

  function setDay(date: Date) {
    const next = new Date(draft);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setDraft(clampToMin(next, minDate));
  }

  function setHour(hour: number) {
    const next = new Date(draft);
    next.setHours(hour);
    setDraft(clampToMin(next, minDate));
  }

  function setMinute(minute: number) {
    const next = new Date(draft);
    next.setMinutes(minute);
    setDraft(clampToMin(next, minDate));
  }

  function shiftMonth(delta: number) {
    const next = new Date(draft);
    next.setMonth(next.getMonth() + delta, 1);
    setDraft(next);
  }

  function apply() {
    const next = clampToMin(draft, minDate);
    onApply(toLocalInput(next));
    setOpen(false);
  }

  function isDayDisabled(date: Date) {
    if (!minDate) return false;
    return startOfDay(date).getTime() < startOfDay(minDate).getTime();
  }

  const display = applied ? formatDisplay(applied) : "Pick date & time";

  const popover =
    open && coords
      ? (
          <div
            ref={popoverRef}
            className="unlock-date-popover unlock-date-popover-portal"
            role="dialog"
            aria-label="Pick unlock date"
            style={{
              position: "fixed",
              left: coords.left,
              width: coords.width,
              top: coords.top,
              bottom: coords.bottom,
              zIndex: 9999,
            }}
          >
            <div className="unlock-date-popover-body">
              <div className="unlock-date-calendar">
                <div className="unlock-date-cal-head">
                  <button
                    type="button"
                    className="unlock-date-nav"
                    onClick={() => shiftMonth(-1)}
                    aria-label="Previous month"
                  >
                    <ChevronLeftIcon className="size-4" />
                  </button>
                  <span className="unlock-date-month">{monthLabel}</span>
                  <button
                    type="button"
                    className="unlock-date-nav"
                    onClick={() => shiftMonth(1)}
                    aria-label="Next month"
                  >
                    <ChevronRightIcon className="size-4" />
                  </button>
                </div>

                <div className="unlock-date-weekdays">
                  {WEEKDAYS.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>

                <div className="unlock-date-grid">
                  {monthCells.map((cell, i) => {
                    if (!cell.day || !cell.date) {
                      return <span key={`empty-${i}`} className="unlock-date-day is-empty" />;
                    }
                    const selected =
                      cell.date.getDate() === draft.getDate() &&
                      cell.date.getMonth() === draft.getMonth() &&
                      cell.date.getFullYear() === draft.getFullYear();
                    const disabled = isDayDisabled(cell.date);
                    return (
                      <button
                        key={cell.date.toISOString()}
                        type="button"
                        className={`unlock-date-day${selected ? " is-selected" : ""}`}
                        disabled={disabled}
                        onClick={() => setDay(cell.date!)}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="unlock-date-time">
                <div className="unlock-date-time-col">
                  <span className="unlock-date-time-label">Hour</span>
                  <div className="unlock-date-time-viewport unlock-date-scroll" ref={hourColRef}>
                    <div className="unlock-date-time-list">
                      {hours.map((hour) => (
                        <button
                          key={hour}
                          type="button"
                          className={`unlock-date-time-item${draft.getHours() === hour ? " is-selected" : ""}`}
                          onClick={() => setHour(hour)}
                        >
                          {pad2(hour)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="unlock-date-time-col">
                  <span className="unlock-date-time-label">Min</span>
                  <div className="unlock-date-time-viewport unlock-date-scroll" ref={minuteColRef}>
                    <div className="unlock-date-time-list">
                      {minutes.map((minute) => (
                        <button
                          key={minute}
                          type="button"
                          className={`unlock-date-time-item${draft.getMinutes() === minute ? " is-selected" : ""}`}
                          onClick={() => setMinute(minute)}
                        >
                          {pad2(minute)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="unlock-date-popover-foot">
              <button type="button" className="btn sm unlock-date-set-inner" onClick={apply}>
                Set
              </button>
            </div>
          </div>
        )
      : null;

  return (
    <div className="unlock-date-picker" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="unlock-date-trigger af-input"
        onClick={openPicker}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="unlock-date-trigger-text">{display}</span>
        <CalendarIcon className="size-4 shrink-0 text-[var(--ion)]" strokeWidth={1.75} aria-hidden />
      </button>

      {mounted && popover ? createPortal(popover, document.body) : null}
    </div>
  );
}
