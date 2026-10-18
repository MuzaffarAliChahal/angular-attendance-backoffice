import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', title: 'Today · Attendance', loadComponent: () => import('./pages/today').then((m) => m.TodayPage) },
  { path: 'attendance', title: 'Daily attendance · Attendance', loadComponent: () => import('./pages/daily').then((m) => m.DailyPage) },
  { path: 'reports', title: 'Monthly report · Attendance', loadComponent: () => import('./pages/report').then((m) => m.ReportPage) },
  { path: 'leave', title: 'Leave requests · Attendance', loadComponent: () => import('./pages/leave').then((m) => m.LeavePage) },
  { path: 'employees', title: 'Employees & shifts · Attendance', loadComponent: () => import('./pages/employees').then((m) => m.EmployeesPage) },
  { path: '**', redirectTo: '' },
];
