import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { router } from '@/app/router/router';

export function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
