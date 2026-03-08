import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";

export default function PublicRoute() {
  const { isAuthenticated, isHydrated } = useAppSelector((state) => state.auth);

  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}