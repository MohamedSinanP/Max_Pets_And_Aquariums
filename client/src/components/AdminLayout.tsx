import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const activePage = location.pathname.split("/")[1] || "dashboard";

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => navigate(`/${page}`)}
      />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          width: "100%",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;