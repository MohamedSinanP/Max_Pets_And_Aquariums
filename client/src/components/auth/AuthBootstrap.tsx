import { useEffect, useState, type ReactNode } from "react";
import { useAppDispatch } from "../../store/hooks";
import { clearUser, setHydrated, setUser } from "../../store/authSlice";
import { getMe } from "../../apis/auth";
import { useLocation } from "react-router-dom";

interface Props {
  children: ReactNode;
}

export default function AuthBootstrap({ children }: Props) {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const publicRoutes = ["/login", "/register"];
    const isPublicRoute = publicRoutes.includes(location.pathname);

    const initAuth = async () => {
      if (isPublicRoute) {
        dispatch(setHydrated(true));
        setLoading(false);
        return;
      }

      try {
        const user = await getMe();
        if (!mounted) return;
        dispatch(setUser(user));
      } catch {
        if (!mounted) return;
        dispatch(clearUser());
      } finally {
        if (!mounted) return;
        dispatch(setHydrated(true));
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, [dispatch, location.pathname]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}