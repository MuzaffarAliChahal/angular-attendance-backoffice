import { describe, expect, it } from 'vitest';
import { LeaveRequest, Punch, Shift } from './models';
import { evaluate, formatMinutes, shiftLength, summarize } from './rules';

const morning: Shift = { id: 'M', name: 'Morning', start: '09:00', end: '18:00', graceMinutes: 10 };
const night: Shift = { id: 'N', name: 'Night', start: '22:00', end: '06:00', graceMinutes: 15 };
const tuesday = '2026-10-13';
const punch = (checkIn: string | null, checkOut: string | null, date = tuesday): Punch => ({ employeeId: 'E1', date, checkIn, checkOut, source: 'BIOMETRIC' });

describe('evaluate', () => {
  it('is PRESENT within the grace period', () => {
    const r = evaluate(punch('09:08', '18:00'), morning);
    expect(r.status).toBe('PRESENT');
    expect(r.lateMinutes).toBe(0);
    expect(r.workedMinutes).toBe(532);
  });

  it('is LATE after the grace period, with the minutes late', () => {
    const r = evaluate(punch('09:25', '18:00'), morning);
    expect(r.status).toBe('LATE');
    expect(r.lateMinutes).toBe(25);
  });

  it('counts overtime after the shift ends', () => {
    expect(evaluate(punch('08:55', '19:30'), morning).overtimeMinutes).toBe(90);
  });

  it('is HALF_DAY when less than half the shift is worked', () => {
    expect(evaluate(punch('09:00', '12:00'), morning).status).toBe('HALF_DAY');
  });

  it('handles a night shift that ends after midnight', () => {
    const r = evaluate(punch('21:55', '06:20'), night);
    expect(r.status).toBe('PRESENT');
    expect(r.workedMinutes).toBe(505);
    expect(r.overtimeMinutes).toBe(20);
  });

  it('treats a check-in after midnight on a night shift as very late, not early', () => {
    const r = evaluate(punch('00:30', '06:00'), night);
    expect(r.status).toBe('LATE');
    expect(r.lateMinutes).toBe(150);
  });

  it('is ABSENT on a weekday without a check-in, WEEKEND on a weekend', () => {
    expect(evaluate(punch(null, null), morning).status).toBe('ABSENT');
    expect(evaluate(punch(null, null, '2026-10-11'), morning).status).toBe('WEEKEND');
  });

  it('is SCHEDULED today before the shift has started', () => {
    expect(evaluate(punch(null, null), night, [], { date: tuesday, minutes: 14 * 60 }).status).toBe('SCHEDULED');
    expect(evaluate(punch(null, null), morning, [], { date: tuesday, minutes: 14 * 60 }).status).toBe('ABSENT');
  });

  it('is ON_LEAVE for approved leave, but not for pending leave', () => {
    const leave: LeaveRequest = { id: 1, employeeId: 'E1', from: tuesday, to: tuesday, type: 'ANNUAL', reason: '', status: 'APPROVED' };
    expect(evaluate(punch(null, null), morning, [leave]).status).toBe('ON_LEAVE');
    expect(evaluate(punch(null, null), morning, [{ ...leave, status: 'PENDING' }]).status).toBe('ABSENT');
  });
});

describe('helpers', () => {
  it('measures shifts across midnight', () => {
    expect(shiftLength(night)).toBe(480);
    expect(shiftLength(morning)).toBe(540);
  });

  it('formats minutes as hours', () => {
    expect(formatMinutes(505)).toBe('8h 25m');
  });

  it('summarizes days and hours per employee', () => {
    const records = [punch('09:00', '18:00', '2026-10-12'), punch('09:30', '18:30', '2026-10-13'), punch(null, null, '2026-10-14')].map((p) => evaluate(p, morning));
    expect(summarize('E1', records)).toMatchObject({ present: 2, late: 1, absent: 1, workedMinutes: 1080, overtimeMinutes: 30 });
  });
});
