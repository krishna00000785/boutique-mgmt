
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Ruler,
  Wallet,
  ChartNoAxesCombined,
  Settings,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navigationItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Orders', path: '/orders', icon: ShoppingBag },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Measurements', path: '/measurements', icon: Ruler },
  { label: 'Payments', path: '/payments', icon: Wallet },
  { label: 'Reports', path: '/reports', icon: ChartNoAxesCombined },
  { label: 'Settings', path: '/settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="flex min-h-screen w-16 shrink-0 flex-col bg-[#4B1020] text-white md:w-60">
      {/* Logo and branding */}
      <div className="border-b border-white/10 px-2 py-5 md:px-4">
        <img
          src="/boutique-logo.png"
          alt="Sree Kala Designer's"
          className="mx-auto h-12 w-full object-contain md:h-28"
        />

        <p className="mt-3 hidden text-center text-[10px] tracking-[0.2em] text-[#D9B66F] md:block">
          BOUTIQUE MANAGEMENT
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-2 md:p-4">
        {navigationItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            title={label}
            aria-label={label}
            end={path === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-3 transition-colors',
                isActive
                  ? 'bg-[#760D2D] text-white ring-1 ring-[#B88736]/60'
                  : 'text-white/75 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
          >
            <Icon size={19} strokeWidth={1.8} />
            <span className="hidden text-sm font-medium md:inline">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="hidden border-t border-white/10 px-4 py-4 md:block">
        <p className="text-center text-xs text-white/50">
          Threading Your Dreams
        </p>
      </div>
    </aside>
  )
}