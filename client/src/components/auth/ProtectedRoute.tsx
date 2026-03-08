import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";

export default function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isHydrated } = useAppSelector((state) => state.auth);

  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}