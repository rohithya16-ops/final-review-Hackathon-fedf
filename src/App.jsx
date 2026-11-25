import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./components/Auth";
import Landing from "./components/Landing";
import Customer from "./components/Customer";
import Manager from "./components/Manager";
import Delivery from "./components/Delivery";
import Admin from "./components/Admin";
import { RestaurantPage, FoodDetailPage } from "./components/Pages";
import "./style.css";
import "./auth.css";
import "./unified-theme.css";

function RequireRole({ role, children }) {
  const session = window.DB?.getSession?.();
  return session?.role === role ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth initialMode="login" />} />
        <Route path="/signup" element={<Auth initialMode="signup" />} />
        <Route path="/customer" element={<Customer />} />
        <Route path="/restaurant/:restaurantName" element={<RestaurantPage />} />
        <Route path="/food/:itemId" element={<FoodDetailPage />} />
        <Route path="/manager" element={<RequireRole role="manager"><Manager /></RequireRole>} />
        <Route path="/delivery" element={<RequireRole role="delivery"><Delivery /></RequireRole>} />
        <Route path="/admin" element={<RequireRole role="admin"><Admin /></RequireRole>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
