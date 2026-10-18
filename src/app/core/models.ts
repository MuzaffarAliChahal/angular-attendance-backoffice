export type AttendanceStatus = 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'ON_LEAVE' | 'WEEKEND' | 'SCHEDULED';
export type Source = 'BIOMETRIC' | 'MOBILE' | 'MANUAL';

export interface Shift {
  id: string;
  name: string;
  /** "HH:mm" in local time. A shift whose end is before its start runs overnight. */
  start: string;
  end: string;
  graceMinutes: number;
}

export interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  shiftId: string;
}

/** Raw punches for one employee on one day; status and hours are derived by the rules. */
export interface Punch {
  employeeId: string;
  /** "YYYY-MM-DD", the day the shift started. */
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  source: Source;
  correctedBy?: string;
}

export interface LeaveRequest {
  id: number;
  employeeId: string;
  from: string;
  to: string;
  type: 'ANNUAL' | 'SICK' | 'UNPAID';
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

/** A punch after the rules have run. */
export interface DayRecord extends Punch {
  status: AttendanceStatus;
  workedMinutes: number;
  lateMinutes: number;
  overtimeMinutes: number;
}
