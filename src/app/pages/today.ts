import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { addDays } from '../core/attendance-api';
import { AttendanceStore } from '../core/attendance-store';
import { AttendanceStatus } from '../core/models';
import { isWeekend } from '../core/rules';

const ATTENDED: AttendanceStatus[] = ['PRESENT', 'LATE', 'HALF_DAY'];

@Component({
  selector: 'app-today',
  imports: [DatePipe, RouterLink],
  template: `
    <h1>{{ isToday() ? 'Today' : 'Last working day' }}</h1>
    <p class="subtitle">
      {{ day() | date: 'fullDate' }} · statuses come from each employee's shift and grace period.
      @if (!isToday()) { No one has checked in yet today. }
    </p>

    <div class="grid kpis">
      <div class="card"><div class="kpi-label">Checked in</div><div class="kpi-value">{{ count(['PRESENT', 'LATE', 'HALF_DAY']) }}</div><div class="kpi-note">of {{ todays().length }} employees</div></div>
      <div class="card"><div class="kpi-label">Late</div><div class="kpi-value" style="color: var(--warn)">{{ count(['LATE']) }}</div><div class="kpi-note">after the grace period</div></div>
      <div class="card"><div class="kpi-label">Absent</div><div class="kpi-value" style="color: var(--bad)">{{ count(['ABSENT']) }}</div><div class="kpi-note">no check-in</div></div>
      <div class="card"><div class="kpi-label">On leave · not started</div><div class="kpi-value">{{ count(['ON_LEAVE']) }} · {{ count(['SCHEDULED']) }}</div><div class="kpi-note">approved leave · later shifts</div></div>
    </div>

    <div class="grid two-col" style="align-items: start">
      <div class="card">
        <h2>Attendance by department</h2>
        <div class="bars">
          @for (d of byDepartment(); track d.department) {
            <div class="bar-row">
              <span>{{ d.department }}</span>
              <div class="bar-track"><div class="bar-fill ok" [style.width.%]="d.rate"></div></div>
              <span class="num">{{ d.attended }}/{{ d.expected }}</span>
            </div>
          }
        </div>
        <h2 style="margin-top: 22px">Attendance rate, last 10 working days</h2>
        <div class="trend">
          @for (d of trend(); track d.date) {
            <div class="trend-col" [title]="d.date + ': ' + d.rate + '%'">
              <span class="trend-value">{{ d.rate }}%</span>
              <div class="trend-bar" [style.height.%]="d.rate * 0.8"></div>
              <span class="hint">{{ d.date | date: 'd' }}</span>
            </div>
          }
        </div>
      </div>

      <div class="card">
        <div class="toolbar" style="justify-content: space-between">
          <h2 style="margin: 0">Needs attention</h2>
          <a routerLink="/attendance">Daily view →</a>
        </div>
        <table>
          <thead><tr><th>Employee</th><th>Shift</th><th>Check-in</th><th>Issue</th></tr></thead>
          <tbody>
            @for (r of attention(); track r.employeeId) {
              <tr>
                <td>{{ store.employee(r.employeeId)?.name }}<div class="hint">{{ store.employee(r.employeeId)?.department }}</div></td>
                <td>{{ store.shiftOf(r.employeeId)?.name }} {{ store.shiftOf(r.employeeId)?.start }}</td>
                <td>{{ r.checkIn ?? '—' }}</td>
                <td>@if (r.status === 'ABSENT') { <span class="badge bad">Absent</span> } @else { <span class="badge warn">{{ r.lateMinutes }} min late</span> }</td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="empty">Everyone is on time so far.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: `
    .trend { display: grid; grid-template-columns: repeat(10, 1fr); gap: 6px; height: 120px; align-items: end; }
    .trend-col { display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; gap: 4px; }
    .trend-value { font-size: 11px; color: var(--muted); }
    .trend-bar { width: 100%; background: var(--accent); border-radius: 4px 4px 0 0; min-height: 2px; }
  `,
})
export class TodayPage {
  protected readonly store = inject(AttendanceStore);
  protected readonly day = this.store.referenceDay;
  protected readonly isToday = computed(() => this.day() === this.store.today);
  protected readonly todays = computed(() => this.store.day(this.day()));

  protected count(statuses: AttendanceStatus[]) {
    return this.todays().filter((r) => statuses.includes(r.status)).length;
  }

  protected readonly byDepartment = computed(() =>
    this.store.departments().map((department) => {
      const ids = new Set(this.store.employees().filter((e) => e.department === department).map((e) => e.id));
      const rows = this.todays().filter((r) => ids.has(r.employeeId) && r.status !== 'ON_LEAVE' && r.status !== 'SCHEDULED' && r.status !== 'WEEKEND');
      const attended = rows.filter((r) => ATTENDED.includes(r.status)).length;
      return { department, attended, expected: rows.length, rate: rows.length ? (100 * attended) / rows.length : 0 };
    }),
  );

  protected readonly trend = computed(() => {
    const days: { date: string; rate: number }[] = [];
    for (let back = 1; days.length < 10 && back <= 30; back++) {
      const date = addDays(this.day(), -back);
      if (isWeekend(date)) continue;
      const rows = this.store.day(date).filter((r) => r.status !== 'ON_LEAVE');
      const attended = rows.filter((r) => ATTENDED.includes(r.status)).length;
      days.unshift({ date, rate: rows.length ? Math.round((100 * attended) / rows.length) : 0 });
    }
    return days;
  });

  protected readonly attention = computed(() =>
    this.todays()
      .filter((r) => r.status === 'ABSENT' || r.status === 'LATE')
      .sort((a, b) => (a.status === b.status ? b.lateMinutes - a.lateMinutes : a.status === 'ABSENT' ? -1 : 1)),
  );
}
