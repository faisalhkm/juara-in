import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/voter/event-list/event-list').then(m => m.EventList)
  },
  {
    path: 'vote/:slug',
    loadComponent: () =>
      import('./features/voter/event-detail/event-detail').then(m => m.EventDetail)
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.adminRoutes)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
