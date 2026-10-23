import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Orders from './pages/Orders'
import CreateOrder from './pages/CreateOrder'
import Measurements from './pages/Measurements'
import Payments from './pages/Payments'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[#FAF5EB]">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Header />

        <main className="p-4 sm:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/new" element={<CreateOrder />} />
            <Route path="/measurements" element={<Measurements />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}