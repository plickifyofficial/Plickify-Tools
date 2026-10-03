import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SessionProvider } from './hooks/useSession'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { DashboardLayout } from './components/DashboardLayout'
import { RequireAdmin, RequireAuth } from './components/guards'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Tools } from './pages/Tools'
import { DashboardOverview } from './pages/dashboard/Overview'
import { MyLicense } from './pages/dashboard/MyLicense'
import { Purchases } from './pages/dashboard/Purchases'
import { Orders } from './pages/dashboard/Orders'
import { AdminOverview } from './pages/admin/Overview'
import { AdminOrders } from './pages/admin/Orders'
import { AdminProducts } from './pages/admin/Products'
import { AdminLicenses } from './pages/admin/Licenses'
import { AdminUsers } from './pages/admin/Users'
import { AdminSettings } from './pages/admin/Settings'

export default function App(): JSX.Element {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          {/* Public marketing pages */}
          <Route
            path="/"
            element={
              <div className="flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1">
                  <Home />
                </main>
                <Footer />
              </div>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route
            path="/tools"
            element={
              <div className="flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1">
                  <Tools />
                </main>
                <Footer />
              </div>
            }
          />

          {/* User dashboard */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardLayout variant="user" />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardOverview />} />
            <Route path="license" element={<MyLicense />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="orders" element={<Orders />} />
          </Route>

          {/* Admin panel */}
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <DashboardLayout variant="admin" />
              </RequireAdmin>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="licenses" element={<AdminLicenses />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  )
}
