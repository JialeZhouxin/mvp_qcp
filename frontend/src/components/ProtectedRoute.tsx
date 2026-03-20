import { Navigate, Outlet } from "react-router-dom";

import { useAuthSession } from "../auth/session";

function ProtectedRoute() {
  const { isAuthenticated } = useAuthSession();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export default ProtectedRoute;
