import { Routes, Route } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import AdminLayout from "../components/AdminLayout";
import CategoryManagement from "../pages/CategoryManagement";
import ProductsPage from "../pages/ProductsPage";
import { LoginPage } from "../pages/AuthPages";
import OrdersPage from "../pages/OrdersPage";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import PublicRoute from "../components/auth/PublicRoute";
import SettingsPage from "../pages/SettingsPage";

const AppRoutes = () => {
  return (
    <Routes>
      {/* <Route element={<PublicRoute />}> */}
      <Route path="/login" element={<LoginPage />} />
      {/* <Route path="/signup" element={<RegisterPage />} /> */}
      {/* </Route> */}

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/categories" element={<CategoryManagement />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes >
  );
};

export default AppRoutes;