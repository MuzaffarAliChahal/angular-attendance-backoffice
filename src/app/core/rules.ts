/**
 * Attendance rules: turns check-in/check-out times into a status, worked time, lateness and
 * overtime. Handles overnight shifts (for example 22:00–06:00). Pure functions, unit-tested.
 */
import { AttendanceStatus, DayRecord, LeaveRequest, Punch, Shift } from './models';

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const formatMinutes = (mins: number) => `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;

/** Shift length in minutes, wrapping past midnight. */
export function shiftLength(shift: Shift): number {
  const len = toMinutes(shift.end) - toMinutes(shift.start);
  return len > 0 ? len : len + 24 * 60;
}

/** Minutes since the shift's start day began, so times after midnight on a night shift come after the start. */
function onShiftClock(time: string, shift: Shift): number {
  const t = toMinutes(time);
  const overnight = toMinutes(shift.end) <= toMinutes(shift.start);
  return overnight && t < toMinutes(shift.start) - 6 * 60 ? t + 24 * 60 : t;
}

export function isWeekend(date: string): boolean {
  const d = new Date(`${date}T00:00:00`).getDay();
  return d === 0 || d === 6;
}

export function onLeave(employeeId: string, date: string, leave: LeaveRequest[]): boolean {
  return leave.some((l) => l.employeeId === employeeId && l.status === 'APPROVED' && l.from <= date && date <= l.to);
}

/** `now` lets today's not-yet-started shifts show as SCHEDULED instead of ABSENT. */
export function evaluate(punch: Punch, shift: Shift, leave: LeaveRequest[] = [], now?: { date: string; minutes: number }): DayRecord {
  const base = { ...punch, workedMinutes: 0, lateMinutes: 0, overtimeMinutes: 0 };
  if (onLeave(punch.employeeId, punch.date, leave)) return { ...base, status: 'ON_LEAVE' };
  if (!punch.checkIn) {
    if (isWeekend(punch.date)) return { ...base, status: 'WEEKEND' };
    const notStarted = now && punch.date === now.date && now.minutes < toMinutes(shift.start) + shift.graceMinutes;
    return { ...base, status: notStarted ? 'SCHEDULED' : 'ABSENT' };
  }

  const start = toMinutes(shift.start);
  const end = start + shiftLength(shift);
  const inAt = onShiftClock(punch.checkIn, shift);
  const outAt = punch.checkOut ? onShiftClock(punch.checkOut, shift) : null;

  const lateMinutes = Math.max(0, inAt - start);
  const workedMinutes = outAt != null ? Math.max(0, outAt - inAt) : 0;
  const overtimeMinutes = outAt != null ? Math.max(0, outAt - end) : 0;

  let status: AttendanceStatus = 'PRESENT';
  if (outAt != null && workedMinutes < shiftLength(shift) / 2) status = 'HALF_DAY';
  else if (lateMinutes > shift.graceMinutes) status = 'LATE';

  return { ...base, status, workedMinutes, lateMinutes: lateMinutes > shift.graceMinutes ? lateMinutes : 0, overtimeMinutes };
}

export interface MonthlySummary {
  employeeId: string;
  present: number;
  late: number;
  halfDays: number;
  absent: number;
  leave: number;
  workedMinutes: number;
  overtimeMinutes: number;
}

export function summarize(employeeId: string, records: DayRecord[]): MonthlySummary {
  const mine = records.filter((r) => r.employeeId === employeeId);
  const count = (s: AttendanceStatus) => mine.filter((r) => r.status === s).length;
  return {
    employeeId,
    present: count('PRESENT') + count('LATE') + count('HALF_DAY'),
    late: count('LATE'),
    halfDays: count('HALF_DAY'),
    absent: count('ABSENT'),
    leave: count('ON_LEAVE'),
    workedMinutes: mine.reduce((s, r) => s + r.workedMinutes, 0),
    overtimeMinutes: mine.reduce((s, r) => s + r.overtimeMinutes, 0),
  };
}
