import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const isAuthenticated = localStorage.getItem('authToken');

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return children ? children : <Outlet />;
}
