import { Bell, Plus } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

export default function Header() {
  const { pathname } = useLocation()
  const titles: Record<string, string> = {
    '/': 'Boutique Dashboard', '/customers': 'Customers', '/orders': 'Orders',
    '/orders/new': 'Create Order', '/measurements': 'Measurements', '/payments': 'Payments',
    '/reports': 'Reports', '/settings': 'Settings',
  }
  const today = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#B88736]/20 bg-white px-6 py-5">
      <div>
        <p className="text-sm text-gray-500">
          Sree Kala Designer's
        </p>

        <h1 className="mt-1 text-2xl font-semibold text-[#4B1020]">
          {titles[pathname] ?? 'Boutique'}
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          {today}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          aria-label="Notifications"
          className="rounded-lg border border-gray-200 p-3 text-[#4B1020] hover:bg-[#FAF5EB]"
        >
          <Bell size={19} />
        </button>

        <Link to="/orders/new" className="flex items-center gap-2 rounded-lg bg-[#760D2D] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#4B1020]">
          <Plus size={18} />

          <span>New Order</span>
        </Link>
      </div>
    </header>
  )
}