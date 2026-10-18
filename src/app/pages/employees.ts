import { Component, computed, inject } from '@angular/core';
import { AttendanceStore } from '../core/attendance-store';
import { formatMinutes, shiftLength } from '../core/rules';

@Component({
  selector: 'app-employees',
  template: `
    <h1>Employees & shifts</h1>
    <p class="subtitle">Each employee belongs to one shift. Night shifts run past midnight and count toward the day they start.</p>

    <div class="grid kpis">
      @for (s of store.shifts(); track s.id) {
        <div class="card">
          <div class="kpi-label">{{ s.name }} shift</div>
          <div class="kpi-value" style="font-size: 22px">{{ s.start }} – {{ s.end }}</div>
          <div class="kpi-note">{{ fmt(len(s)) }} · {{ s.graceMinutes }} min grace · {{ headcount()[s.id] ?? 0 }} employees</div>
        </div>
      }
    </div>

    <div class="card table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Name</th><th>Department</th><th>Position</th><th>Shift</th></tr></thead>
        <tbody>
          @for (e of store.employees(); track e.id) {
            <tr><td><code>{{ e.id }}</code></td><td>{{ e.name }}</td><td>{{ e.department }}</td><td>{{ e.position }}</td><td>{{ store.shiftOf(e.id)?.name }}</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class EmployeesPage {
  protected readonly store = inject(AttendanceStore);
  protected readonly fmt = formatMinutes;
  protected readonly len = shiftLength;
  protected readonly headcount = computed(() => {
    const counts: Partial<Record<string, number>> = {};
    for (const e of this.store.employees()) counts[e.shiftId] = (counts[e.shiftId] ?? 0) + 1;
    return counts;
  });
}
