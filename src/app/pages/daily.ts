import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AttendanceStore } from '../core/attendance-store';
import { AttendanceStatus, DayRecord } from '../core/models';
import { formatMinutes } from '../core/rules';
import { STATUS_META, StatusBadge } from '../shared/status';

@Component({
  selector: 'app-daily',
  imports: [FormsModule, StatusBadge],
  template: `
    <h1>Daily attendance</h1>
    <p class="subtitle">Pick a day to review. Corrections are saved as MANUAL punches with who made them, and every report updates immediately.</p>

    <div class="card">
      <div class="toolbar">
        <input type="date" [min]="store.from" [max]="store.today" [ngModel]="date()" (ngModelChange)="date.set($event); editing.set(null)" aria-label="Date" />
        <select [ngModel]="department()" (ngModelChange)="department.set($event)" aria-label="Department">
          <option value="">All departments</option>
          @for (d of store.departments(); track d) { <option [value]="d">{{ d }}</option> }
        </select>
        <select [ngModel]="status()" (ngModelChange)="status.set($event)" aria-label="Status">
          <option value="">All statuses</option>
          @for (s of statuses; track s) { <option [value]="s">{{ meta[s].label }}</option> }
        </select>
        <span class="hint">{{ rows().length }} employees</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Employee</th><th>Shift</th><th>Check-in</th><th>Check-out</th><th class="num">Worked</th><th class="num">Late</th><th class="num">Overtime</th><th>Status</th><th>Source</th><th></th></tr></thead>
          <tbody>
            @for (r of rows(); track r.employeeId) {
              <tr>
                <td>{{ store.employee(r.employeeId)?.name }}<div class="hint">{{ store.employee(r.employeeId)?.department }}</div></td>
                <td>{{ store.shiftOf(r.employeeId)?.name }}<div class="hint">{{ store.shiftOf(r.employeeId)?.start }}–{{ store.shiftOf(r.employeeId)?.end }}</div></td>
                @if (editing() === r.employeeId) {
                  <td><input type="time" [(ngModel)]="editIn" aria-label="Check-in" /></td>
                  <td><input type="time" [(ngModel)]="editOut" aria-label="Check-out" /></td>
                  <td colspan="5"></td>
                  <td class="num" style="white-space: nowrap">
                    <button class="primary" (click)="save(r)">Save</button>
                    <button class="ghost" (click)="editing.set(null)">Cancel</button>
                  </td>
                } @else {
                  <td>{{ r.checkIn ?? '—' }}</td>
                  <td>{{ r.checkOut ?? '—' }}</td>
                  <td class="num">{{ r.workedMinutes ? fmt(r.workedMinutes) : '—' }}</td>
                  <td class="num">{{ r.lateMinutes ? r.lateMinutes + ' min' : '—' }}</td>
                  <td class="num">{{ r.overtimeMinutes ? fmt(r.overtimeMinutes) : '—' }}</td>
                  <td><app-status [status]="r.status" /></td>
                  <td>
                    <span class="hint">{{ r.source }}</span>
                    @if (r.correctedBy) { <div class="hint">by {{ r.correctedBy }}</div> }
                  </td>
                  <td class="num"><button class="ghost" (click)="edit(r)">Correct</button></td>
                }
              </tr>
            } @empty {
              <tr><td colspan="10" class="empty">No records for this filter.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class DailyPage {
  protected readonly store = inject(AttendanceStore);
  protected readonly statuses = Object.keys(STATUS_META) as AttendanceStatus[];
  protected readonly meta = STATUS_META;
  protected readonly fmt = formatMinutes;

  protected readonly date = signal(this.store.referenceDay());
  protected readonly department = signal('');
  protected readonly status = signal<AttendanceStatus | ''>('');
  protected readonly editing = signal<string | null>(null);
  protected editIn = '';
  protected editOut = '';

  protected readonly rows = computed(() => {
    const dep = this.department();
    const st = this.status();
    return this.store
      .day(this.date())
      .filter((r) => (!dep || this.store.employee(r.employeeId)?.department === dep) && (!st || r.status === st))
      .sort((a, b) => (this.store.employee(a.employeeId)?.name ?? '').localeCompare(this.store.employee(b.employeeId)?.name ?? ''));
  });

  protected edit(r: DayRecord) {
    this.editIn = r.checkIn ?? this.store.shiftOf(r.employeeId)?.start ?? '';
    this.editOut = r.checkOut ?? '';
    this.editing.set(r.employeeId);
  }

  protected async save(r: DayRecord) {
    await this.store.correct({ employeeId: r.employeeId, date: r.date, checkIn: this.editIn || null, checkOut: this.editOut || null, source: 'MANUAL' });
    this.editing.set(null);
  }
}
