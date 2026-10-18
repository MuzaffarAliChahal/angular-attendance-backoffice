import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AttendanceStore } from '../core/attendance-store';

@Component({
  selector: 'app-leave',
  imports: [DatePipe],
  template: `
    <h1>Leave requests</h1>
    <p class="subtitle">Approved leave days show as "On leave" in attendance instead of absences.</p>
    <div class="card table-wrap">
      <table>
        <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th class="num">Days</th><th>Reason</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (l of requests(); track l.id) {
            <tr>
              <td>{{ store.employee(l.employeeId)?.name }}<div class="hint">{{ store.employee(l.employeeId)?.department }}</div></td>
              <td>{{ l.type }}</td>
              <td>{{ l.from | date: 'mediumDate' }}</td>
              <td>{{ l.to | date: 'mediumDate' }}</td>
              <td class="num">{{ days(l.from, l.to) }}</td>
              <td>{{ l.reason }}</td>
              <td><span class="badge" [class.ok]="l.status === 'APPROVED'" [class.bad]="l.status === 'REJECTED'" [class.neutral]="l.status === 'PENDING'">{{ l.status }}</span></td>
              <td class="num" style="white-space: nowrap">
                @if (l.status === 'PENDING') {
                  <button class="primary" (click)="store.decideLeave(l.id, 'APPROVED')">Approve</button>
                  <button class="ghost" (click)="store.decideLeave(l.id, 'REJECTED')">Reject</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class LeavePage {
  protected readonly store = inject(AttendanceStore);
  protected readonly requests = computed(() =>
    [...this.store.leave()].sort((a, b) => (a.status === 'PENDING' ? -1 : 0) - (b.status === 'PENDING' ? -1 : 0) || b.from.localeCompare(a.from)),
  );

  protected days(from: string, to: string) {
    return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
  }
}
