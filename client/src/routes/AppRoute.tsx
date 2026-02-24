import { Routes, Route } from "react-router-dom";
// import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import AdminLayout from "../components/AdminLayout";
import CategoryManagement from "../pages/CategoryManagement";
import ProductsPage from "../pages/ProductsPage";
import { LoginPage, RegisterPage } from "../pages/AuthPages";
import OrdersPage from "../pages/OrdersPage";
// import NotFound from "../pages/NotFound";

const AppRoutes = () => {
  return (
    <Routes>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<RegisterPage />} />
      <Route element={<AdminLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/categories" element={<CategoryManagement />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
      </Route>

      {/* 404 Page */}
      {/* <Route path="*" element={<NotFound />} /> */}
    </Routes>
  );
};

export default AppRoutes;