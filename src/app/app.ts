import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AttendanceApi } from './core/attendance-api';
import { AttendanceStore } from './core/attendance-store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark">A</span> Attendance</div>
        @for (item of nav; track item.path) {
          <a class="nav-link" [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.path === '/' }">
            {{ item.label }}
            @if (item.path === '/leave' && store.pendingLeave().length) { <span class="count">{{ store.pendingLeave().length }}</span> }
          </a>
        }
        <div class="sidebar-foot">HR back office<br />Angular 21 · signals</div>
      </aside>
      <main class="main">
        @if (demo) {
          <div class="demo-banner">Demo mode: 30 days of generated check-ins for 16 employees on morning, evening and night shifts. Corrections and leave decisions are kept in your browser.</div>
        }
        @if (store.error()) {
          <div class="card empty">Could not load data: {{ store.error() }}</div>
        } @else if (store.loaded()) {
          <router-outlet />
        } @else {
          <div class="card empty">Loading attendance…</div>
        }
      </main>
    </div>
  `,
  styles: `.count { float: right; background: var(--accent); color: #fff; border-radius: 999px; font-size: 11px; padding: 1px 7px; font-weight: 700; }`,
})
export class App {
  protected readonly store = inject(AttendanceStore);
  protected readonly demo = inject(AttendanceApi).mode === 'demo';
  protected readonly nav = [
    { path: '/', label: 'Today' },
    { path: '/attendance', label: 'Daily attendance' },
    { path: '/reports', label: 'Monthly report' },
    { path: '/leave', label: 'Leave requests' },
    { path: '/employees', label: 'Employees & shifts' },
  ];

  constructor() {
    this.store.load();
  }
}
