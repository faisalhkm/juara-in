import { Routes } from '@angular/router';
import {AdminGuard} from '../../core/guards/admin-guard';

export const adminRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login').then(m => m.Login)
  },
  {
    path: '',
    canActivate: [AdminGuard],
    loadComponent: () =>
      import('./admin-layout/admin-layout').then(m => m.AdminLayout),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./event-list/event-list').then(m => m.EventList)
      },
      {
        path: 'events/new',
        loadComponent: () =>
          import('./event-form/event-form').then(m => m.EventForm)
      },
      {
        path: 'events/:id/edit',
        loadComponent: () =>
          import('./event-form/event-form').then(m => m.EventForm)
      },
      {
        path: 'events/:id/candidates',
        loadComponent: () =>
          import('./candidate-list/candidate-list').then(m => m.CandidateList)
      },
      {
        path: 'events/:id/candidates/new',
        loadComponent: () =>
          import('./candidate-form/candidate-form').then(m => m.CandidateForm)
      },
      {
        path: 'events/:id/candidates/:candidateId/edit',
        loadComponent: () =>
          import('./candidate-form/candidate-form').then(m => m.CandidateForm)
      },
      {
        path: 'events/:id/packages',
        loadComponent: () =>
          import('./package-list/package-list').then(m => m.PackageList)
      },
      {
        path: 'events/:id/packages/new',
        loadComponent: () =>
          import('./package-form/package-form').then(m => m.PackageForm)
      },
      {
        path: 'events/:id/packages/:packageId/edit',
        loadComponent: () =>
          import('./package-form/package-form').then(m => m.PackageForm)
      },
    ]
  }
];
