import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Ruler,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navigationItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Orders', path: '/orders', icon: ShoppingBag },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Measurements', path: '/measurements', icon: Ruler },
  { label: 'Payments', path: '/payments', icon: Wallet },
  { label: 'Reports', path: '/reports', icon: ChartNoAxesCombined },
  { label: 'Settings', path: '/settings', icon: Settings },
]

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        aria-label="Main navigation"
        className={[
          'fixed inset-y-0 left-0 z-50 flex h-dvh w-72 flex-col',
          'bg-[#4B1020] text-white shadow-xl',
          'transition-transform duration-300 ease-in-out',
          'md:sticky md:top-0 md:z-auto md:h-screen md:w-60 md:shrink-0 md:translate-x-0 md:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Branding */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-5">
          <div className="min-w-0 flex-1">
            <img
              src="/boutique-logo.png"
              alt="Sree Kala Designer's"
              className="h-20 w-full object-contain"
            />

            <p className="mt-3 text-center text-[10px] tracking-[0.2em] text-[#D9B66F]">
              BOUTIQUE MANAGEMENT
            </p>
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="ml-3 rounded-lg p-2 text-white hover:bg-white/10 md:hidden"
          >
            <X size={22} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {navigationItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'flex min-h-12 items-center gap-3 rounded-lg px-4 py-3',
                  'transition-colors',
                  isActive
                    ? 'bg-[#760D2D] text-white ring-1 ring-[#B88736]/60'
                    : 'text-white/75 hover:bg-white/10 hover:text-white',
                ].join(' ')
              }
            >
              <Icon size={20} strokeWidth={1.8} />

              <span className="text-sm font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 px-4 py-4">
          <p className="text-center text-xs text-white/50">
            Threading Your Dreams
          </p>
        </div>
      </aside>
    </>
  )
}