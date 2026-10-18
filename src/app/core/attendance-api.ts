import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { Employee, LeaveRequest, Punch, Shift } from './models';
import { isWeekend } from './rules';

/** Backend contract (docs/api.md). The demo implementation keeps everything in memory. */
export abstract class AttendanceApi {
  abstract readonly mode: 'live' | 'demo';
  abstract shifts(): Observable<Shift[]>;
  abstract employees(): Observable<Employee[]>;
  abstract punches(from: string, to: string): Observable<Punch[]>;
  abstract leave(): Observable<LeaveRequest[]>;
  abstract correct(punch: Punch): Observable<Punch>;
  abstract decideLeave(id: number, status: 'APPROVED' | 'REJECTED'): Observable<LeaveRequest>;
}

@Injectable()
export class HttpAttendanceApi extends AttendanceApi {
  readonly mode = 'live' as const;
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/attendance`;

  shifts() { return this.http.get<Shift[]>(`${this.base}/shifts`); }
  employees() { return this.http.get<Employee[]>(`${this.base}/employees`); }
  punches(from: string, to: string) { return this.http.get<Punch[]>(`${this.base}/punches`, { params: new HttpParams().set('from', from).set('to', to) }); }
  leave() { return this.http.get<LeaveRequest[]>(`${this.base}/leave-requests`); }
  correct(punch: Punch) { return this.http.put<Punch>(`${this.base}/punches/${punch.employeeId}/${punch.date}`, punch); }
  decideLeave(id: number, status: 'APPROVED' | 'REJECTED') { return this.http.post<LeaveRequest>(`${this.base}/leave-requests/${id}/decision`, { status }); }
}

export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
};
const hhmm = (mins: number) => {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

const SHIFTS: Shift[] = [
  { id: 'MORNING', name: 'Morning', start: '09:00', end: '18:00', graceMinutes: 10 },
  { id: 'EVENING', name: 'Evening', start: '14:00', end: '23:00', graceMinutes: 10 },
  { id: 'NIGHT', name: 'Night', start: '22:00', end: '06:00', graceMinutes: 15 },
];

const STAFF: [string, string, string, string][] = [
  ['Ayesha Khan', 'Finance', 'Accountant', 'MORNING'], ['Bilal Ahmed', 'Finance', 'Finance Officer', 'MORNING'],
  ['Sara Malik', 'Finance', 'Payroll Specialist', 'MORNING'], ['Omar Farooq', 'Operations', 'Supervisor', 'EVENING'],
  ['Hina Shah', 'Operations', 'Coordinator', 'EVENING'], ['Usman Tariq', 'Operations', 'Technician', 'NIGHT'],
  ['Zara Iqbal', 'Operations', 'Technician', 'NIGHT'], ['Daniyal Raza', 'IT', 'Support Engineer', 'MORNING'],
  ['Mariam Aslam', 'IT', 'Developer', 'MORNING'], ['Fahad Javed', 'IT', 'Network Engineer', 'EVENING'],
  ['Nida Hussain', 'HR', 'HR Manager', 'MORNING'], ['Kamran Ali', 'HR', 'Recruiter', 'MORNING'],
  ['Rabia Noor', 'Customer Care', 'Agent', 'EVENING'], ['Hamza Qureshi', 'Customer Care', 'Agent', 'EVENING'],
  ['Saad Mirza', 'Customer Care', 'Team Lead', 'MORNING'], ['Iqra Saleem', 'Customer Care', 'Agent', 'NIGHT'],
];

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** Thirty days of punches with realistic noise: late arrivals, absences, early leavers, overtime. */
@Injectable()
export class DemoAttendanceApi extends AttendanceApi {
  readonly mode = 'demo' as const;
  private readonly staff: Employee[] = STAFF.map(([name, department, position, shiftId], i) => ({ id: `E${String(i + 1).padStart(3, '0')}`, name, department, position, shiftId }));
  private readonly store: Punch[] = [];
  private readonly requests: LeaveRequest[];

  constructor() {
    super();
    const rand = rng(7);
    const today = isoDate(new Date());
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    for (let back = 30; back >= 0; back--) {
      const date = addDays(today, -back);
      for (const e of this.staff) {
        const shift = SHIFTS.find((s) => s.id === e.shiftId)!;
        const start = Number(shift.start.slice(0, 2)) * 60;
        const len = 9 * 60 - (shift.id === 'NIGHT' ? 60 : 0);
        if (isWeekend(date) || rand() < 0.04) {
          this.store.push({ employeeId: e.id, date, checkIn: null, checkOut: null, source: 'BIOMETRIC' });
          continue;
        }
        const late = rand() < 0.12 ? 12 + rand() * 50 : -5 - rand() * 15;
        const inAt = start + late;
        const early = rand() < 0.015 ? -(len * 0.6) : rand() < 0.2 ? 20 + rand() * 90 : rand() * 15;
        const outAt = start + len + early;
        const isToday = back === 0;
        const startedYet = !isToday || nowMinutes >= inAt;
        const finishedYet = !isToday || (shift.id !== 'NIGHT' && nowMinutes >= outAt);
        this.store.push({
          employeeId: e.id,
          date,
          checkIn: startedYet ? hhmm(inAt) : null,
          checkOut: finishedYet ? hhmm(outAt) : null,
          source: rand() < 0.75 ? 'BIOMETRIC' : 'MOBILE',
        });
      }
    }
    this.requests = [
      { id: 1, employeeId: 'E005', from: addDays(today, -9), to: addDays(today, -8), type: 'SICK', reason: 'Flu', status: 'APPROVED' },
      { id: 2, employeeId: 'E009', from: addDays(today, 3), to: addDays(today, 7), type: 'ANNUAL', reason: 'Family wedding', status: 'PENDING' },
      { id: 3, employeeId: 'E013', from: addDays(today, 1), to: addDays(today, 1), type: 'ANNUAL', reason: 'Personal errand', status: 'PENDING' },
      { id: 4, employeeId: 'E002', from: addDays(today, -2), to: addDays(today, -2), type: 'UNPAID', reason: 'Travel', status: 'REJECTED' },
      { id: 5, employeeId: 'E011', from: addDays(today, 0), to: addDays(today, 1), type: 'ANNUAL', reason: 'Short break', status: 'APPROVED' },
    ];
  }

  shifts() { return this.reply(SHIFTS); }
  employees() { return this.reply(this.staff); }
  punches(from: string, to: string) { return this.reply(this.store.filter((p) => p.date >= from && p.date <= to).map((p) => ({ ...p }))); }
  leave() { return this.reply(this.requests.map((r) => ({ ...r }))); }

  correct(punch: Punch) {
    const i = this.store.findIndex((p) => p.employeeId === punch.employeeId && p.date === punch.date);
    const saved: Punch = { ...punch, source: 'MANUAL', correctedBy: 'hr.admin' };
    if (i >= 0) this.store[i] = saved;
    else this.store.push(saved);
    return this.reply({ ...saved });
  }

  decideLeave(id: number, status: 'APPROVED' | 'REJECTED') {
    const r = this.requests.find((x) => x.id === id)!;
    r.status = status;
    return this.reply({ ...r });
  }

  private reply<T>(v: T): Observable<T> {
    return of(v).pipe(delay(environment.demoLatencyMs));
  }
}
