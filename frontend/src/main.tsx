import 'bootstrap/dist/css/bootstrap.min.css';
import './i18n';

import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { Container, Spinner } from 'react-bootstrap';
import { Outlet, RouterProvider, createBrowserRouter } from 'react-router';

import App from './app';
import { routesSection } from './routes/sections';
import { ErrorBoundary } from './routes/components';

// ----------------------------------------------------------------------

const router = createBrowserRouter([
  {
    Component: () => (
      <App>
        <Outlet />
      </App>
    ),
    errorElement: <ErrorBoundary />,
    children: routesSection,
  },
]);

const root = createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    <Suspense
      fallback={
        <Container
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: '100vh' }}
        >
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
        </Container>
      }
    >
      <RouterProvider router={router} />
    </Suspense>
  </StrictMode>
);
