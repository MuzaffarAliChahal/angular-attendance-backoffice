# Backend API contract

The back office's `HttpAttendanceApi` expects these endpoints under `/api/attendance`. Dates are `YYYY-MM-DD` and times are `HH:mm` in the site's local time.

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/shifts` | – | `Shift[]` |
| GET | `/employees` | – | `Employee[]` |
| GET | `/punches?from=2026-09-13&to=2026-10-13` | – | `Punch[]`, one per employee per day |
| PUT | `/punches/{employeeId}/{date}` | `Punch` | the saved `Punch`, with `source: "MANUAL"` and `correctedBy` set by the server |
| GET | `/leave-requests` | – | `LeaveRequest[]` |
| POST | `/leave-requests/{id}/decision` | `{ "status": "APPROVED" }` or `"REJECTED"` | the updated `LeaveRequest` |

Types are in [`src/app/core/models.ts`](../src/app/core/models.ts).

```json
// Punch
{ "employeeId": "E006", "date": "2026-10-12", "checkIn": "21:55", "checkOut": "06:20", "source": "BIOMETRIC" }
```

Notes for the server side:

- A punch belongs to the day its shift **starts**. A night-shift check-out at 06:20 is stored on the previous day's punch.
- The server stores raw punches only. Status, lateness, worked time and overtime are derived by the rules in `rules.ts` (they can run on the server with the same logic).
- Device integrations (for example ZKTeco terminals or a mobile check-in app) write punches with `source: "BIOMETRIC"` or `"MOBILE"`.
