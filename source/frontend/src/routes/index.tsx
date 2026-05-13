import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import Home from '@/pages/Home'
import Catalog from '@/pages/Catalog'
import Product from '@/pages/Product'
import Cart from '@/pages/Cart'
import Checkout from '@/pages/Checkout'
import OrderConfirmation from '@/pages/OrderConfirmation'
import TrackOrder from '@/pages/TrackOrder'

// URL do painel administrativo (dashboard separado)
const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL ?? 'http://localhost:3092'

function AdminRedirect() {
  window.location.href = DASHBOARD_URL
  return null
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pages with shared Header via MainLayout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/admin" element={<AdminRedirect />} />
        </Route>

        {/* Pages with their own Header (back button, custom layout) */}
        <Route path="/product/:id" element={<Product />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/pedido-confirmado" element={<OrderConfirmation />} />
        <Route path="/track/:token" element={<TrackOrder />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
