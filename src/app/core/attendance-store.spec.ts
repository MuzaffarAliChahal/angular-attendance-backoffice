import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AttendanceApi, DemoAttendanceApi, addDays } from './attendance-api';
import { AttendanceStore } from './attendance-store';
import { isWeekend } from './rules';

const settle = () => new Promise((r) => setTimeout(r, 450));

describe('AttendanceStore with demo data', () => {
  let store: AttendanceStore;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [{ provide: AttendanceApi, useClass: DemoAttendanceApi }] });
    store = TestBed.inject(AttendanceStore);
    store.load();
    await settle();
  });

  it('loads 31 days for every employee', () => {
    expect(store.employees().length).toBe(16);
    expect(store.records().length).toBe(16 * 31);
  });

  it('re-evaluates a day after a manual correction', async () => {
    let date = addDays(store.today, -1);
    while (isWeekend(date)) date = addDays(date, -1);
    const emp = store.employees().find((e) => e.shiftId === 'MORNING')!;
    await store.correct({ employeeId: emp.id, date, checkIn: '10:15', checkOut: '18:00', source: 'MANUAL' });
    const record = store.day(date).find((r) => r.employeeId === emp.id)!;
    expect(record.status).toBe('LATE');
    expect(record.lateMinutes).toBe(75);
    expect(record.source).toBe('MANUAL');
    expect(record.correctedBy).toBe('hr.admin');
  });

  it('approving leave removes it from the pending list', async () => {
    const pending = store.pendingLeave()[0];
    store.decideLeave(pending.id, 'APPROVED');
    await settle();
    expect(store.pendingLeave().some((l) => l.id === pending.id)).toBe(false);
  });
});
