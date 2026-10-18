import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AttendanceStore } from '../core/attendance-store';
import { MonthlySummary, formatMinutes, summarize } from '../core/rules';

type SortKey = 'name' | 'absent' | 'late' | 'overtimeMinutes' | 'workedMinutes';

@Component({
  selector: 'app-report',
  imports: [DatePipe],
  template: `
    <div class="toolbar" style="justify-content: space-between">
      <div>
        <h1>Attendance report</h1>
        <p class="subtitle" style="margin: 0">{{ store.from | date: 'mediumDate' }} – {{ store.today | date: 'mediumDate' }} · click a column to sort</p>
      </div>
      <button class="primary" (click)="exportCsv()">Export CSV for payroll</button>
    </div>
    <div class="card table-wrap" style="margin-top: 16px">
      <table>
        <thead>
          <tr>
            <th class="sortable" (click)="sort.set('name')">Employee</th>
            <th>Department</th>
            <th class="num">Days present</th>
            <th class="num sortable" (click)="sort.set('late')">Late</th>
            <th class="num">Half days</th>
            <th class="num sortable" (click)="sort.set('absent')">Absent</th>
            <th class="num">Leave</th>
            <th class="num sortable" (click)="sort.set('workedMinutes')">Hours worked</th>
            <th class="num sortable" (click)="sort.set('overtimeMinutes')">Overtime</th>
          </tr>
        </thead>
        <tbody>
          @for (r of rows(); track r.employeeId) {
            <tr>
              <td>{{ r.name }}</td>
              <td>{{ r.department }}</td>
              <td class="num">{{ r.present }}</td>
              <td class="num">@if (r.late >= 3) { <span class="badge warn">{{ r.late }}</span> } @else { {{ r.late }} }</td>
              <td class="num">{{ r.halfDays }}</td>
              <td class="num">@if (r.absent >= 2) { <span class="badge bad">{{ r.absent }}</span> } @else { {{ r.absent }} }</td>
              <td class="num">{{ r.leave }}</td>
              <td class="num">{{ fmt(r.workedMinutes) }}</td>
              <td class="num">{{ fmt(r.overtimeMinutes) }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `.sortable { cursor: pointer; text-decoration: underline dotted; }`,
})
export class ReportPage {
  protected readonly store = inject(AttendanceStore);
  protected readonly fmt = formatMinutes;
  protected readonly sort = signal<SortKey>('absent');

  protected readonly rows = computed(() => {
    const records = this.store.records();
    const key = this.sort();
    const list: (MonthlySummary & { name: string; department: string })[] = this.store.employees().map((e) => ({
      ...summarize(e.id, records),
      name: e.name,
      department: e.department,
    }));
    return list.sort((a, b) => (key === 'name' ? a.name.localeCompare(b.name) : b[key] - a[key]));
  });

  protected exportCsv() {
    const header = 'employee_id,name,department,days_present,late,half_days,absent,leave,hours_worked,overtime_hours';
    const lines = this.rows().map((r) =>
      [r.employeeId, r.name, r.department, r.present, r.late, r.halfDays, r.absent, r.leave, (r.workedMinutes / 60).toFixed(2), (r.overtimeMinutes / 60).toFixed(2)].join(','),
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[header, ...lines].join('\n')], { type: 'text/csv' }));
    a.download = `attendance-${this.store.from}-to-${this.store.today}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
