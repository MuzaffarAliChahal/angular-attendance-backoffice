import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { AttendanceApi, DemoAttendanceApi, HttpAttendanceApi } from './core/attendance-api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    { provide: AttendanceApi, useClass: environment.demo ? DemoAttendanceApi : HttpAttendanceApi },
  ],
};
