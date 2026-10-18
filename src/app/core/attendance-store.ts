import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AttendanceApi, addDays, isoDate } from './attendance-api';
import { DayRecord, Employee, LeaveRequest, Punch, Shift } from './models';
import { evaluate, isWeekend } from './rules';

/**
 * Loads the last 31 days once and derives everything else (daily records, monthly
 * summaries) with computed signals, so corrections update every view at once.
 */
@Injectable({ providedIn: 'root' })
export class AttendanceStore {
  private readonly api = inject(AttendanceApi);

  readonly today = isoDate(new Date());
  readonly from = addDays(this.today, -30);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  readonly shifts = signal<Shift[]>([]);
  readonly employees = signal<Employee[]>([]);
  readonly punches = signal<Punch[]>([]);
  readonly leave = signal<LeaveRequest[]>([]);

  readonly departments = computed(() => [...new Set(this.employees().map((e) => e.department))].sort());
  readonly records = computed<DayRecord[]>(() => {
    const shifts = new Map(this.shifts().map((s) => [s.id, s]));
    const emp = new Map(this.employees().map((e) => [e.id, e]));
    const leave = this.leave();
    const d = new Date();
    const now = { date: this.today, minutes: d.getHours() * 60 + d.getMinutes() };
    return this.punches().map((p) => evaluate(p, shifts.get(emp.get(p.employeeId)!.shiftId)!, leave, now));
  });
  readonly pendingLeave = computed(() => this.leave().filter((l) => l.status === 'PENDING'));

  /**
   * The day the dashboards open on: today once anyone has checked in, otherwise the last
   * working day (so the screens aren't empty early in the morning).
   */
  readonly referenceDay = computed(() => {
    if (this.day(this.today).some((r) => r.checkIn)) return this.today;
    let date = addDays(this.today, -1);
    while (isWeekend(date) && date > this.from) date = addDays(date, -1);
    return date;
  });

  employee(id: string) {
    return this.employees().find((e) => e.id === id);
  }
  shiftOf(employeeId: string) {
    const e = this.employee(employeeId);
    return this.shifts().find((s) => s.id === e?.shiftId);
  }
  day(date: string) {
    return this.records().filter((r) => r.date === date);
  }

  load() {
    if (this.loaded()) return;
    forkJoin({
      shifts: this.api.shifts(),
      employees: this.api.employees(),
      punches: this.api.punches(this.from, this.today),
      leave: this.api.leave(),
    }).subscribe({
      next: (r) => {
        this.shifts.set(r.shifts);
        this.employees.set(r.employees);
        this.punches.set(r.punches);
        this.leave.set(r.leave);
        this.loaded.set(true);
      },
      error: (e: Error) => this.error.set(e.message),
    });
  }

  correct(punch: Punch) {
    return new Promise<void>((resolve) =>
      this.api.correct(punch).subscribe((saved) => {
        this.punches.update((list) => {
          const i = list.findIndex((p) => p.employeeId === saved.employeeId && p.date === saved.date);
          return i >= 0 ? list.map((p, j) => (j === i ? saved : p)) : [...list, saved];
        });
        resolve();
      }),
    );
  }

  decideLeave(id: number, status: 'APPROVED' | 'REJECTED') {
    this.api.decideLeave(id, status).subscribe((r) => this.leave.update((list) => list.map((l) => (l.id === r.id ? r : l))));
  }
}
