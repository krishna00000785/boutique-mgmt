import { Bell, Menu, Plus } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { pathname } = useLocation()

  const titles: Record<string, string> = {
    '/': 'Boutique Dashboard',
    '/customers': 'Customers',
    '/orders': 'Orders',
    '/orders/new': 'Create Order',
    '/measurements': 'Measurements',
    '/payments': 'Payments',
    '/reports': 'Reports',
    '/settings': 'Settings',
  }

  const today = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <header className="flex min-w-0 items-center justify-between gap-3 border-b border-[#B88736]/20 bg-white px-4 py-3 sm:px-6 sm:py-4 lg:py-5">
      <div className="flex min-w-0 items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          aria-controls="app-sidebar"
          className="shrink-0 rounded-lg border border-gray-200 p-2.5 text-[#4B1020] transition hover:bg-[#FAF5EB] md:hidden"
        >
          <Menu size={22} />
        </button>

        {/* Page heading */}
        <div className="min-w-0">
          <p className="truncate text-xs text-gray-500 sm:text-sm">
            Sree Kala Designer's
          </p>

          <h1 className="mt-1 truncate text-lg font-semibold text-[#4B1020] sm:text-2xl">
            {titles[pathname] ?? 'Boutique'}
          </h1>

          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            {today}
          </p>
        </div>
      </div>

      {/* Header actions */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="rounded-lg border border-gray-200 p-2.5 text-[#4B1020] transition hover:bg-[#FAF5EB] sm:p-3"
        >
          <Bell size={19} />
        </button>

        <Link
          to="/orders/new"
          className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#760D2D] px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#4B1020] sm:px-4"
        >
          <Plus size={18} />

          <span className="hidden sm:inline">New Order</span>
          <span className="sm:hidden">Order</span>
        </Link>
      </div>
    </header>
  )
}