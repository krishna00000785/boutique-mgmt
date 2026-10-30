import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  RefreshCw,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Ruler,
  Wallet,
} from 'lucide-react'

import { orderService } from '../services/orderService'
import type { Order, OrderStatus } from '../types/order'

const statusLabels: Record<OrderStatus, string> = {
  RECEIVED: 'Received',
  CUTTING: 'Cutting',
  STITCHING: 'Stitching',
  FINISHING: 'Finishing',
  READY: 'Ready',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const statusStyles: Record<OrderStatus, string> = {
  RECEIVED: 'bg-blue-50 text-blue-700',
  CUTTING: 'bg-purple-50 text-purple-700',
  STITCHING: 'bg-amber-50 text-amber-800',
  FINISHING: 'bg-orange-50 text-orange-700',
  READY: 'bg-green-50 text-green-700',
  DELIVERED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-50 text-red-700',
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function formatDate(value: string | null) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const [statusUpdateError, setStatusUpdateError] = useState('')
  const [updatingOrderIds, setUpdatingOrderIds] = useState<Set<string>>(
    new Set(),
  )


  async function loadOrders() {
    try {
      setLoading(true)
      setError('')

      const result = await orderService.getAll()
      setOrders(result)
    } catch (err) {
      console.error('Failed to load orders:', err)
      setError('Unable to load orders. Please check your backend connection.')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(
    orderId: string, 
    newStatus: OrderStatus,
  ) {
    const currentOrder = orders.find((order) => order.id === orderId)

    if (!currentOrder || currentOrder.status === newStatus) {
        return
    }

    setStatusUpdateError('')

    setUpdatingOrderIds((current) => {
        const updated = new Set(current)
        updated.add(orderId)
        return updated
    })

    try {
        const updatedOrder = await orderService.updateStatus(
        orderId,
        newStatus,
        )

        setOrders((current) =>
        current.map((order) =>
            order.id === orderId
            ? { ...order, ...updatedOrder }
            : order,
        ),
        )
    } catch (err) {
        console.error('Failed to update order status:', err)

        setStatusUpdateError(
        `Unable to update the status for ${currentOrder.orderNumber}. Please try again.`,
        )
    } finally {
        setUpdatingOrderIds((current) => {
        const updated = new Set(current)
        updated.delete(orderId)
        return updated
        })
    }
  }

  useEffect(() => {
    void loadOrders()
  }, [])

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        order.orderNumber.toLowerCase().includes(query) ||
        order.customer.name.toLowerCase().includes(query) ||
        order.customer.phone.includes(query)

      const matchesStatus =
        !statusFilter || order.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [orders, search, statusFilter])

  const inProgressCount = orders.filter((order) =>
    ['CUTTING', 'STITCHING', 'FINISHING'].includes(order.status),
  ).length

  const readyCount = orders.filter(
    (order) => order.status === 'READY',
  ).length

  const pendingBalance = orders.reduce(
    (total, order) => total + order.balanceAmount,
    0,
  )

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* Page heading */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium tracking-wide text-[#B88736]">
            ORDER MANAGEMENT
          </p>

          <h1 className="mt-1 text-2xl font-semibold text-[#4B1020] sm:text-3xl">
            Orders
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Manage stitching orders and track delivery progress.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/orders/new')}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#760D2D] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#4B1020] sm:w-auto"
        >
          <Plus size={18} />
          New Order
        </button>
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <SummaryCard
          title="Total Orders"
          value={orders.length.toString()}
          icon={ShoppingBag}
        />

        <SummaryCard
          title="In Progress"
          value={inProgressCount.toString()}
          icon={Clock}
        />

        <SummaryCard
          title="Ready for Delivery"
          value={readyCount.toString()}
          icon={CheckCircle2}
        />

        <SummaryCard
          title="Outstanding Balance"
          value={currencyFormatter.format(pendingBalance)}
          icon={AlertCircle}
        />
      </section>

      {/* Filters */}
      <section className="rounded-xl border border-[#B88736]/20 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order number, customer or phone..."
              className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#B88736] focus:ring-2 focus:ring-[#B88736]/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as OrderStatus | '')
            }
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#B88736] sm:w-auto"
          >
            <option value="">All statuses</option>

            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void loadOrders()}
            disabled={loading}
            title="Refresh orders"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-200 px-4 py-3 text-gray-600 hover:bg-gray-50 disabled:opacity-50 sm:min-w-12"
          >
            <RefreshCw
              size={18}
              className={loading ? 'animate-spin' : ''}
            />
          </button>
        </div>
      </section>

      {/* Orders table */}
      <section className="overflow-hidden rounded-xl border border-[#B88736]/20 bg-white shadow-sm">
        {statusUpdateError && (
            <div
                role="alert"
                className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700"
            >
                {statusUpdateError}
            </div>
        )}
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-[#4B1020]">
            All Orders
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {filteredOrders.length} order(s) found
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading orders...
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-600">{error}</p>

            <button
              type="button"
              onClick={() => void loadOrders()}
              className="mt-4 rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Try again
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag
              size={36}
              className="mx-auto text-gray-300"
            />

            <h3 className="mt-4 font-medium text-gray-700">
              No orders found
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Try changing your search or status filter.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile layout: compact order cards */}
            <div className="divide-y divide-gray-100 md:hidden">
              {filteredOrders.map((order) => (
                <article key={order.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-[#760D2D]">
                        {order.orderNumber}
                      </p>
                      <p className="mt-1 break-words text-sm font-medium text-gray-800">
                        {order.customer.name}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {order.customer.phone}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[order.status]}`}
                    >
                      {statusLabels[order.status]}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-[#FAF5EB]/60 p-3">
                    <div>
                      <p className="text-xs text-gray-500">Order date</p>
                      <p className="mt-1 text-sm text-gray-700">{formatDate(order.orderDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Delivery date</p>
                      <p className="mt-1 text-sm text-gray-700">{formatDate(order.deliveryDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Amount</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {currencyFormatter.format(order.totalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Balance</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {currencyFormatter.format(order.balanceAmount)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor={`order-status-${order.id}`}
                      className="mb-1.5 block text-xs font-medium text-gray-600"
                    >
                      Update status
                    </label>
                    <select
                      id={`order-status-${order.id}`}
                      value={order.status}
                      disabled={updatingOrderIds.has(order.id)}
                      onChange={(event) =>
                        void handleStatusChange(order.id, event.target.value as OrderStatus)
                      }
                      className={`w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium outline-none transition focus:border-[#B88736] focus:ring-2 focus:ring-[#B88736]/20 disabled:cursor-wait disabled:opacity-60 ${statusStyles[order.status]}`}
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {updatingOrderIds.has(order.id) && (
                      <p className="mt-1 text-xs text-gray-500">Updating status...</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/measurements?customerId=${encodeURIComponent(order.customerId)}&orderId=${encodeURIComponent(order.id)}`}
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#760D2D]/20 px-3 py-2 text-sm font-medium text-[#760D2D] hover:bg-[#FAF5EB]"
                    >
                      <Ruler size={16} />
                      Measurements
                    </Link>
                    <Link
                      to={`/payments?orderId=${encodeURIComponent(order.id)}`}
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#760D2D]/20 px-3 py-2 text-sm font-medium text-[#760D2D] hover:bg-[#FAF5EB]"
                    >
                      <Wallet size={16} />
                      Payments
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop/tablet layout: retain the full data table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#FAF5EB]/70 text-gray-500">
                  <tr>
                    <th className="px-5 py-4 font-medium">Order</th>
                    <th className="px-5 py-4 font-medium">Customer</th>
                    <th className="px-5 py-4 font-medium">Order Date</th>
                    <th className="px-5 py-4 font-medium">Delivery Date</th>
                    <th className="px-5 py-4 font-medium">Amount</th>
                    <th className="px-5 py-4 font-medium">Balance</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-t border-gray-100 transition hover:bg-[#FAF5EB]/40"
                    >
                      <td className="px-5 py-4 font-medium text-[#760D2D]">
                        {order.orderNumber}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-800">{order.customer.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{order.customer.phone}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{formatDate(order.orderDate)}</td>
                      <td className="px-5 py-4 text-gray-600">{formatDate(order.deliveryDate)}</td>
                      <td className="px-5 py-4 font-medium text-gray-800">
                        {currencyFormatter.format(order.totalAmount)}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {currencyFormatter.format(order.balanceAmount)}
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={order.status}
                          disabled={updatingOrderIds.has(order.id)}
                          onChange={(event) =>
                            void handleStatusChange(order.id, event.target.value as OrderStatus)
                          }
                          aria-label={`Update status for ${order.orderNumber}`}
                          className={`rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium outline-none transition focus:border-[#B88736] focus:ring-2 focus:ring-[#B88736]/20 disabled:cursor-wait disabled:opacity-60 ${statusStyles[order.status]}`}
                        >
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                        {updatingOrderIds.has(order.id) && (
                          <span className="ml-2 text-xs text-gray-500">Updating...</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <Link
                            to={`/measurements?customerId=${encodeURIComponent(order.customerId)}&orderId=${encodeURIComponent(order.id)}`}
                            title="Order measurements"
                            aria-label={`Measurements for ${order.orderNumber}`}
                            className="rounded-lg p-2 text-[#760D2D] hover:bg-[#FAF5EB]"
                          >
                            <Ruler size={17} />
                          </Link>
                          <Link
                            to={`/payments?orderId=${encodeURIComponent(order.id)}`}
                            title="Order payments"
                            aria-label={`Payments for ${order.orderNumber}`}
                            className="rounded-lg p-2 text-[#760D2D] hover:bg-[#FAF5EB]"
                          >
                            <Wallet size={17} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: string
  icon: typeof ShoppingBag
}) {
  return (
    <div className="rounded-xl border border-[#B88736]/20 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>

        <div className="rounded-lg bg-[#FAF5EB] p-2 text-[#760D2D]">
          <Icon size={20} />
        </div>
      </div>

      <p className="mt-4 text-2xl font-semibold text-[#4B1020]">
        {value}
      </p>
    </div>
  )
}