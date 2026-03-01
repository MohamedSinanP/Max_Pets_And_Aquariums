import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const activePage = location.pathname.split("/")[1] || "dashboard";

  return (
    <div className="flex h-screen w-full">
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => navigate(`/${page}`)}
      />

      <div className="flex-1 min-w-0 h-screen overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;