import { Component, computed, input } from '@angular/core';
import { AttendanceStatus } from '../core/models';

export const STATUS_META: Record<AttendanceStatus, { label: string; tone: string }> = {
  PRESENT: { label: 'Present', tone: 'ok' },
  LATE: { label: 'Late', tone: 'warn' },
  HALF_DAY: { label: 'Half day', tone: 'warn' },
  ABSENT: { label: 'Absent', tone: 'bad' },
  ON_LEAVE: { label: 'On leave', tone: 'neutral' },
  WEEKEND: { label: 'Weekend', tone: 'neutral' },
  SCHEDULED: { label: 'Not started', tone: 'neutral' },
};

@Component({
  selector: 'app-status',
  template: `<span [class]="'badge ' + meta().tone">{{ meta().label }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<AttendanceStatus>();
  protected readonly meta = computed(() => STATUS_META[this.status()]);
}
