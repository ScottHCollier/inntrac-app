import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { ProtectedRoute } from '@/lib/auth';

import { AppRoot } from './routes/app/root';

export const createAppRouter = (queryClient: QueryClient) =>
  createBrowserRouter([
    {
      path: '/',
      lazy: async () => {
        const { LandingRoute } = await import('./routes/landing');
        return { Component: LandingRoute };
      },
    },
    {
      path: '/auth/register',
      lazy: async () => {
        const { RegisterRoute } = await import('./routes/auth/register');
        return { Component: RegisterRoute };
      },
    },
    {
      path: '/auth/login',
      lazy: async () => {
        const { LoginRoute } = await import('./routes/auth/login');
        return { Component: LoginRoute };
      },
    },
    {
      path: '/app',
      element: (
        <ProtectedRoute>
          <AppRoot />
        </ProtectedRoute>
      ),
      children: [
        {
          path: 'schedule',
          lazy: async () => {
            const { ScheduleRoute } = await import('./routes/app/schedule');
            return { Component: ScheduleRoute };
          },
          loader: async () => {
            const { schedulesLoader } = await import('./routes/app/schedule');
            return schedulesLoader(queryClient)();
          },
        },
        {
          path: 'assistant',
          lazy: async () => {
            const { AssistantRoute } = await import('./routes/app/assistant');
            return { Component: AssistantRoute };
          },
        },
        {
          path: 'admin',
          lazy: async () => {
            const { AdminRoute } = await import('./routes/app/admin');
            return { Component: AdminRoute };
          },
        },
        {
          path: '',
          lazy: async () => {
            const { DashboardRoute } = await import('./routes/app/dashboard');
            return { Component: DashboardRoute };
          },
        },
      ],
    },
    {
      path: '*',
      lazy: async () => {
        const { NotFoundRoute } = await import('./routes/not-found');
        return { Component: NotFoundRoute };
      },
    },
  ]);

export const AppRouter = () => {
  const queryClient = useQueryClient();

  const router = useMemo(() => createAppRouter(queryClient), [queryClient]);

  return <RouterProvider router={router} />;
};