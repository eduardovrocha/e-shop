import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import AdminLayout from '@/layouts/AdminLayout'
import { LoadingState } from '@/components/LoadingState'
import { TourProvider } from '@/components/onboarding/TourProvider'

const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Orders = lazy(() => import('@/pages/Orders'))
const OrderDetail = lazy(() => import('@/pages/OrderDetail'))
const Products = lazy(() => import('@/pages/Products'))
const ProductForm = lazy(() => import('@/pages/ProductForm'))
const Inventory = lazy(() => import('@/pages/Inventory'))
const Customers = lazy(() => import('@/pages/Customers'))
const CustomerDetail = lazy(() => import('@/pages/CustomerDetail'))
const Production = lazy(() => import('@/pages/Production'))
const Coupons = lazy(() => import('@/pages/Coupons'))
const CouponForm = lazy(() => import('@/pages/CouponForm'))
const CouponUsages = lazy(() => import('@/pages/CouponUsages'))
const Settings = lazy(() => import('@/pages/Settings'))
const StripeAdmin = lazy(() => import('@/pages/StripeAdmin'))
const Shipping = lazy(() => import('@/pages/Shipping'))
const OnboardingPlayground = lazy(() => import('@/pages/OnboardingPlayground'))

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        {import.meta.env.DEV && (
          <Route path="/playground/onboarding" element={<OnboardingPlayground />} />
        )}

        <Route
          element={
            <RequireAuth>
              <TourProvider>
                <Outlet />
              </TourProvider>
            </RequireAuth>
          }
        >
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/production" element={<Production />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/:id/edit" element={<ProductForm />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/coupons" element={<Coupons />} />
          <Route path="/coupons/new" element={<CouponForm />} />
          <Route path="/coupons/:id/edit" element={<CouponForm />} />
          <Route path="/coupons/:id/usages" element={<CouponUsages />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/stripe" element={<StripeAdmin />} />
          <Route path="/shipping" element={<Shipping />} />
        </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
