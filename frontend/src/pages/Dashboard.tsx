import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingBag,
  Scissors,
  CheckCircle2,
  Wallet,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'

import StatCard from '../components/dashboard/StatCard'
import RecentOrders from '../components/dashboard/RecentOrders'
import { orderService, type DashboardSummary } from '../services/orderService'

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      try {
        const result = await orderService.getDashboard()
        if (active) setDashboard(result)
      } catch (err) {
        console.error('Failed to load dashboard:', err)
        if (active) setError('Unable to load dashboard. Please try again.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadDashboard()
    return () => { active = false }
  }, [refreshCount])

  function refreshDashboard() {
    setLoading(true)
    setError('')
    setRefreshCount((current) => current + 1)
  }

  const available = !loading && !error && dashboard !== null
  const placeholder = loading ? '...' : '-'
  const statistics = [
  {
    title: 'Total Orders',
    value: available ? dashboard.totalOrders.toLocaleString('en-IN') : placeholder,
    description: 'All recorded orders',
    icon: ShoppingBag,
  },
  {
    title: 'In Progress',
    value: available ? dashboard.inProgress.toLocaleString('en-IN') : placeholder,
    description: 'Cutting, stitching and finishing',
    icon: Scissors,
  },
  {
    title: 'Ready for Delivery',
    value: available ? dashboard.readyForDelivery.toLocaleString('en-IN') : placeholder,
    description: 'Awaiting customer collection',
    icon: CheckCircle2,
  },
  {
    title: 'Pending Payments',
    value: available ? currencyFormatter.format(dashboard.pendingPayments) : placeholder,
    description: 'Outstanding customer balances',
    icon: Wallet,
  },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <section>
        <p className="text-sm font-medium text-[#B88736]">
          YOUR BOUTIQUE AT A GLANCE
        </p>

        <h2 className="mt-2 text-3xl font-semibold text-[#4B1020]">
          Welcome back!
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Here's what's happening at your boutique today.
        </p>
      </section>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statistics.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      {/* Recent orders */}
      <section className="rounded-xl border border-[#B88736]/20 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-[#4B1020]">
              Recent Orders
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Keep track of your latest stitching orders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshDashboard}
              disabled={loading}
              title="Refresh dashboard"
              aria-label="Refresh dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#B88736]/40 text-[#760D2D] hover:bg-[#FAF5EB] disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <Link
              to="/orders"
              className="inline-flex items-center gap-2 rounded-lg border border-[#B88736]/40 px-4 py-2 text-sm font-medium text-[#760D2D] hover:bg-[#FAF5EB]"
            >
              View All Orders
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <RecentOrders orders={dashboard?.recentOrders ?? []} loading={loading} error={error} />
      </section>
    </div>
  )
}